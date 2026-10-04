'use strict';
// Transactional email through Resend or Postmark HTTP APIs. In development and tests the "console"
// provider records messages instead of sending them; production refuses to start without a real provider.
const db = require('../db');
const { config } = require('../config');
const log = require('./log');

const outbox = []; // console provider, inspected by tests

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function layout(title, bodyHtml, footer = '') {
  return `<!doctype html><html><body style="margin:0;background:#f4f5f0;font-family:Helvetica,Arial,sans-serif;color:#151716">
<div style="max-width:560px;margin:0 auto;padding:32px 20px"><div style="font-weight:700;font-size:18px;margin-bottom:24px">growthsignal<span style="color:#7c847c;font-weight:400">.ai</span></div>
<div style="background:#fff;border-radius:12px;padding:28px"><h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>${bodyHtml}</div>
<p style="font-size:12px;color:#7c847c;margin-top:20px">GrowthSignal is independent of OpenAI, Anthropic, Google and Perplexity. No tool can guarantee placement in AI answers.${footer}</p></div></body></html>`;
}
const button = (href, label) => `<p style="margin:24px 0"><a href="${esc(href)}" style="background:#d4fa77;color:#101111;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">${esc(label)}</a></p>`;
const p = t => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px">${t}</p>`;

const templates = {
  login: ({ link }) => ({
    subject: 'Your GrowthSignal sign in link',
    html: layout('Sign in to GrowthSignal', p('Use this link to sign in. It expires in 30 minutes and works once.') + button(link, 'Sign in') + p(`If you did not request this, you can ignore this email.`)),
    text: `Sign in to GrowthSignal: ${link}\nThe link expires in 30 minutes and works once. If you did not request it, ignore this email.`,
  }),
  scan_complete: ({ link, domain, score, band, top }) => ({
    subject: `Your GrowthSignal report for ${domain} is ready`,
    html: layout(`Report ready: ${domain}`, p(`Website readiness: <strong>${esc(score)}/100</strong> (${esc(band)}).`) + (top ? p(`Top next step: ${esc(top)}.`) : '') + button(link, 'Open your report')),
    text: `Website readiness for ${domain}: ${score}/100 (${band}).${top ? ` Top next step: ${top}.` : ''}\nOpen your report: ${link}`,
  }),
  visibility_complete: ({ link, domain, mentioned, of, unavailable }) => ({
    subject: `AI answer sample results for ${domain}`,
    html: layout(`AI answer samples: ${domain}`, p(`Your business was mentioned in <strong>${esc(mentioned)} of ${esc(of)}</strong> sampled discovery answers.`) + (unavailable ? p(`${esc(unavailable)} sample(s) were unavailable and are not counted.`) : '') + p('These are samples of API answers under documented conditions, not a ranking of what every person sees.') + button(link, 'See answers and sources')),
    text: `Mentioned in ${mentioned} of ${of} sampled discovery answers for ${domain}. ${unavailable ? `${unavailable} unavailable samples not counted. ` : ''}See answers and sources: ${link}`,
  }),
  monitor_digest: ({ link, domain, score, change, improved, regressed }) => ({
    subject: `GrowthSignal update for ${domain}: ${change > 0 ? `up ${change}` : change < 0 ? `down ${Math.abs(change)}` : 'no score change'}`,
    html: layout(`Weekly check: ${domain}`, p(`Website readiness is <strong>${esc(score)}/100</strong>${change ? ` (${change > 0 ? '+' : ''}${esc(change)} since last check)` : ''}.`) + (regressed.length ? p(`<strong>Needs attention:</strong> ${regressed.map(esc).join('; ')}.`) : '') + (improved.length ? p(`<strong>Improved:</strong> ${improved.map(esc).join('; ')}.`) : '') + button(link, 'Open report')),
    text: `Website readiness for ${domain}: ${score}/100. Needs attention: ${regressed.join('; ') || 'none'}. Improved: ${improved.join('; ') || 'none'}. ${link}`,
  }),
  subscription_started: ({ plan, link }) => ({
    subject: `Welcome to GrowthSignal ${plan}`,
    html: layout(`You are on ${plan}`, p('Your subscription is active. Your first scheduled checks start now, and you can run a scan any time from your dashboard.') + button(link, 'Open dashboard') + p('Manage or cancel your plan any time from Billing in your dashboard.')),
    text: `Your GrowthSignal ${plan} subscription is active. Dashboard: ${link}. Manage or cancel from Billing.`,
  }),
  subscription_canceled: ({ link, endsAt }) => ({
    subject: 'Your GrowthSignal subscription has been canceled',
    html: layout('Subscription canceled', p(endsAt ? `Your paid features stay on until ${esc(endsAt)}. After that your account returns to the free plan and your report history is kept.` : 'Your account is now on the free plan. Your report history is kept.') + button(link, 'Open dashboard')),
    text: `Your GrowthSignal subscription is canceled.${endsAt ? ` Paid features stay on until ${endsAt}.` : ''} ${link}`,
  }),
  inquiry_operator: ({ name, email, website, topic, message }) => ({
    subject: `New GrowthSignal inquiry: ${topic || 'general'}`,
    html: layout('New inquiry', p(`From: ${esc(name || '(no name)')} &lt;${esc(email)}&gt;`) + p(`Website: ${esc(website || '-')}`) + p(`Topic: ${esc(topic || '-')}`) + `<pre style="white-space:pre-wrap;font-family:inherit">${esc(message)}</pre>`),
    text: `From: ${name || '(no name)'} <${email}>\nWebsite: ${website || '-'}\nTopic: ${topic || '-'}\n\n${message}`,
  }),
};

async function deliver({ to, subject, html, text }) {
  const prov = config.email.provider;
  if (prov === 'resend') {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${config.email.resendKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: config.email.from, to: [to], subject, html, text }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Resend HTTP ${r.status}: ${j.message || ''}`);
    return j.id;
  }
  if (prov === 'postmark') {
    const r = await fetch('https://api.postmarkapp.com/email', { method: 'POST', headers: { 'x-postmark-server-token': config.email.postmarkToken, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ From: config.email.from, To: to, Subject: subject, HtmlBody: html, TextBody: text, MessageStream: 'outbound' }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Postmark HTTP ${r.status}: ${j.Message || ''}`);
    return j.MessageID;
  }
  if (prov === 'console' && !config.isProd) {
    outbox.push({ to, subject, text, html });
    if (!config.isTest) log.info('email.console', { to: log.maskEmail(to), subject, text });
    return `console-${outbox.length}`;
  }
  throw new Error('Email provider is not configured');
}

async function sendEmail(to, template, data) {
  const msg = templates[template](data);
  try {
    const id = await deliver({ to, ...msg });
    await db.query('INSERT INTO email_log (to_email, template, status, provider_id) VALUES ($1,$2,$3,$4)', [to, template, 'sent', id]);
    return true;
  } catch (e) {
    await db.query('INSERT INTO email_log (to_email, template, status, error) VALUES ($1,$2,$3,$4)', [to, template, 'failed', e.message.slice(0, 300)]).catch(() => {});
    log.error('email.failed', { template, to: log.maskEmail(to), error: e.message });
    throw Object.assign(e, { retryable: true });
  }
}

module.exports = { sendEmail, outbox, templates, esc };
