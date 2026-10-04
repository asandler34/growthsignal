'use strict';
// Free AI answer snapshot for the anonymous scan preview: one customer style question, one platform,
// one answer, through an official API. It shows the owner the problem in their own market before any
// sign up. Bounded by a daily count and the global AI budget. Never presented as a ranking.
const db = require('../db');
const { config } = require('../config');
const log = require('../lib/log');
const rate = require('../lib/rate-limit');
const { providers, activeOrder } = require('./providers');
const { defaultPrompts } = require('./prompts');
const { detectMention, detectCitation, hostOf } = require('./detect');
const { reserveAiBudget, adjustAiSpend } = require('../lib/entitlements');
const { withRetry } = require('./run');

const EST_CENTS = 4;
const ANSWER_CHARS = 1500;

// Decides whether a finished preview scan gets a snapshot, and its initial state.
function initialSnapshot(context = {}) {
  if (!context.businessName || !context.category || !context.city) {
    return { status: 'needs_context', reason: 'Add your business name, type of business and town to see a real AI answer for your market.' };
  }
  return { status: 'pending' };
}

function questionFor(context) {
  return defaultPrompts({ category: context.category, city: context.city, region: context.region, services: [] }, 1)[0].text;
}

async function save(scanId, snapshot) {
  await db.query('UPDATE scans SET snapshot = $2 WHERE id = $1', [scanId, { ...snapshot, at: new Date().toISOString() }]);
}

async function runSnapshot(scanId) {
  const s = await db.one('SELECT id, domain, context, snapshot FROM scans WHERE id = $1', [scanId]);
  if (!s || s.snapshot?.status !== 'pending') return;
  const ctx = s.context || {};
  const question = questionFor(ctx);
  const pid = activeOrder().find(id => providers[id].configured());
  if (!pid) return save(scanId, { status: 'unavailable', question, reason: 'AI answer sampling is not connected yet. Your website readiness report above is complete.' });
  const day = await rate.hit('snapshot:global', config.limits.anonSnapshotsPerDay, 86400);
  if (!day.ok) return save(scanId, { status: 'unavailable', question, reason: 'Free AI answers are at capacity today. A free account includes a 3 question answer sample.' });
  if (!(await reserveAiBudget(EST_CENTS, config.ai.dailyBudgetCents))) {
    log.warn('ai.budget_reached', { snapshot: scanId, dailyBudgetCents: config.ai.dailyBudgetCents });
    return save(scanId, { status: 'unavailable', question, reason: 'Free AI answers are at capacity today. A free account includes a 3 question answer sample.' });
  }
  const location = { city: ctx.city, region: ctx.region, country: 'US' };
  try {
    const out = await withRetry(() => providers[pid].ask({ prompt: question, location }));
    await adjustAiSpend(out.costCents - EST_CENTS);
    const mention = detectMention(out.text, { name: ctx.businessName, domain: s.domain });
    const citation = detectCitation(out.citations, s.domain);
    const seen = new Set();
    const sources = [];
    for (const c of out.citations) {
      if (c.retrievedOnly) continue;
      const domain = hostOf(c.url) || null;
      if (!domain || seen.has(domain)) continue;
      seen.add(domain);
      sources.push({ url: String(c.url).slice(0, 500), domain });
      if (sources.length >= 8) break;
    }
    await save(scanId, {
      status: 'complete', question, provider: pid, model: out.model, location,
      businessName: ctx.businessName, answer: out.text.slice(0, ANSWER_CHARS), truncated: out.text.length > ANSWER_CHARS,
      mentioned: mention.mentioned, cited: citation.cited, sources,
    });
  } catch (e) {
    await adjustAiSpend(-EST_CENTS);
    log.warn('snapshot.failed', { scan: scanId, provider: pid, error: e.message });
    await save(scanId, { status: 'error', question, provider: pid, reason: 'The AI platform did not answer this time. A free account includes a 3 question answer sample you can run later.' });
  }
}

module.exports = { initialSnapshot, questionFor, runSnapshot };
