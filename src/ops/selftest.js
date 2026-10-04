'use strict';
// Operator self test: proves a deployment can do the real work. Asks each connected AI platform one
// real question through its official API and checks database, email and billing configuration.
// Output never contains secrets.
const db = require('../db');
const { config } = require('../config');
const { providers, activeOrder } = require('../visibility/providers');
const { reserveAiBudget, adjustAiSpend } = require('../lib/entitlements');
const { hostOf } = require('../visibility/detect');

const QUESTION = 'Who are the best plumbers in Denver, CO?';
const mask = s => String(s).replace(/(sk-[A-Za-z0-9_-]{2})[A-Za-z0-9_*-]+/g, '$1…').replace(/(pplx-[A-Za-z0-9]{2})[A-Za-z0-9]+/g, '$1…');

async function checkProvider(id) {
  const p = providers[id];
  if (!p.configured()) return { platform: id, status: 'not_connected' };
  if (!(await reserveAiBudget(4, config.ai.dailyBudgetCents))) return { platform: id, status: 'skipped', reason: 'daily AI budget reached' };
  const started = Date.now();
  try {
    const out = await p.ask({ prompt: QUESTION, location: { city: 'Denver', region: 'CO', country: 'US' } });
    await adjustAiSpend(out.costCents - 4);
    const cited = out.citations.filter(c => !c.retrievedOnly);
    const ok = out.text.trim().length >= 20 && out.searches > 0;
    return {
      platform: id, status: ok ? 'ok' : 'suspect', model: out.model, ms: Date.now() - started,
      answerChars: out.text.length, answerStart: out.text.slice(0, 240), searches: out.searches,
      citedSources: cited.length, sampleSources: [...new Set(cited.map(c => hostOf(c.url)).filter(Boolean))].slice(0, 5),
      costCents: out.costCents,
      ...(ok ? {} : { reason: out.searches ? 'answer was unexpectedly short' : 'no web search was performed' }),
    };
  } catch (e) {
    await adjustAiSpend(-4);
    return { platform: id, status: 'error', ms: Date.now() - started, error: mask(e.message), httpStatus: e.status || null };
  }
}

async function selfTest() {
  const result = { at: new Date().toISOString(), baseUrl: config.baseUrl, question: QUESTION };
  try { await db.query('SELECT 1'); result.database = 'ok'; } catch (e) { result.database = `error: ${e.message}`; }
  result.email = config.email.provider && config.email.provider !== 'console' ? `${config.email.provider} configured` : 'not configured (sign in emails will not send)';
  const sk = config.stripe.secretKey || '';
  result.billing = !sk ? 'not configured' : sk.startsWith('sk_live') ? (config.stripe.allowLive ? 'LIVE mode' : 'live key refused (STRIPE_ALLOW_LIVE not set)') : 'test mode';
  if (config.serverless) result.vercelHelpers = process.env.NODEJS_HELPERS === '0' ? 'off' : 'ON: set NODEJS_HELPERS=0 so Stripe webhook signatures verify';
  result.platforms = await Promise.all(activeOrder().map(checkProvider));
  result.ok = result.database === 'ok' && result.platforms.some(p => p.status === 'ok') && result.platforms.every(p => p.status !== 'error' && p.status !== 'suspect');
  return result;
}

module.exports = { selfTest };
