'use strict';
// Executes a visibility run: prompts x platforms x repeats, through official APIs only.
// Unconfigured platforms are recorded as "unavailable", failed calls as "error"; both are excluded
// from mention rates and shown to the customer, never silently dropped or filled with mock data.
const db = require('../db');
const { config } = require('../config');
const log = require('../lib/log');
const { providers } = require('./providers');
const { detectMention, detectCitation, bareDomain, hostOf, phonesIn, wilson } = require('./detect');
const { reserveAiBudget, adjustAiSpend } = require('../lib/entitlements');

const EST_CENTS_PER_SAMPLE = 4; // conservative reservation; adjusted to actual after each call
const EXCERPT_CHARS = 4000;

async function runVisibility(runId) {
  const run = await db.one('SELECT * FROM visibility_runs WHERE id = $1', [runId]);
  if (!run) throw Object.assign(new Error('run not found'), { retryable: false });
  if (run.status === 'complete') return;
  const site = await db.one('SELECT * FROM sites WHERE id = $1', [run.site_id]);
  await db.query(`UPDATE visibility_runs SET status = 'running' WHERE id = $1`, [runId]);
  // Idempotent on retry: drop partial samples from an earlier attempt.
  await db.query('DELETE FROM visibility_samples WHERE run_id = $1', [runId]);

  const cfg = run.config;
  const competitors = cfg.competitors || [];
  const location = { city: site.city, region: site.region, country: site.country || 'US' };
  const confirmedPhone = (site.facts?.phone || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  const tasks = [];
  for (const prompt of cfg.prompts) for (const pid of cfg.platforms) for (let r = 0; r < cfg.repeats; r++) tasks.push({ prompt, pid, r });

  let budgetExhausted = false;
  const worker = async (t) => {
    const p = providers[t.pid];
    const base = { run_id: runId, provider: t.pid, model: p ? p.model() : null, prompt: t.prompt.text, intent: t.prompt.intent || 'discovery', repeat_index: t.r, location };
    if (!p || !p.configured()) return insertSample({ ...base, status: 'unavailable', error: 'This platform is not connected yet.' });
    if (budgetExhausted || !(await reserveAiBudget(EST_CENTS_PER_SAMPLE, config.ai.dailyBudgetCents))) {
      if (!budgetExhausted) log.warn('ai.budget_reached', { runId: run.id, dailyBudgetCents: config.ai.dailyBudgetCents });
      budgetExhausted = true;
      return insertSample({ ...base, status: 'unavailable', error: 'Daily sampling capacity reached. This sample will be retried in the next scheduled run.' });
    }
    try {
      const out = await withRetry(() => p.ask({ prompt: t.prompt.text, location }));
      await adjustAiSpend(out.costCents - EST_CENTS_PER_SAMPLE);
      const m = detectMention(out.text, { name: site.business_name, domain: site.domain });
      const c = detectCitation(out.citations, site.domain);
      const compHits = competitors.map(comp => ({ name: comp.name, domain: comp.domain, mentioned: detectMention(out.text, comp).mentioned, cited: comp.domain ? detectCitation(out.citations, comp.domain).cited : false }));
      const answerPhones = phonesIn(out.text);
      const phoneMismatch = t.prompt.intent === 'brand' && m.mentioned && confirmedPhone && answerPhones.length > 0 && !answerPhones.includes(confirmedPhone);
      return insertSample({
        ...base, model: out.model, status: 'ok',
        answer_excerpt: out.text.slice(0, EXCERPT_CHARS),
        citations: out.citations.slice(0, 30).map(x => ({ url: String(x.url).slice(0, 500), title: x.title ? String(x.title).slice(0, 200) : null, domain: x.domain ? bareDomain(x.domain) : hostOf(x.url), retrievedOnly: !!x.retrievedOnly })),
        mentioned: m.mentioned, cited: c.cited,
        competitor_mentions: [...compHits, ...(phoneMismatch ? [{ flag: 'phone_mismatch', answerPhones }] : [])],
        cost_cents: out.costCents,
      });
    } catch (e) {
      await adjustAiSpend(-EST_CENTS_PER_SAMPLE);
      log.warn('visibility.sample_failed', { run: runId, provider: t.pid, error: e.message });
      return insertSample({ ...base, status: 'error', error: String(e.message).slice(0, 300) });
    }
  };
  await pool(tasks, 3, worker);
  const summary = await summarize(runId, site, competitors);
  await db.query(`UPDATE visibility_runs SET status = 'complete', summary = $2, completed_at = now() WHERE id = $1`, [runId, summary]);
  return summary;
}

async function withRetry(fn, attempts = 2) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (e) { last = e; if (!e.retryable) break; await new Promise(r => setTimeout(r, 1500 * (i + 1))); }
  }
  throw last;
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const it = items[i++]; await fn(it); } }));
}

async function insertSample(s) {
  await db.query(
    `INSERT INTO visibility_samples (run_id, provider, model, prompt, intent, repeat_index, location, status, answer_excerpt, citations, mentioned, cited, competitor_mentions, error, cost_cents)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [s.run_id, s.provider, s.model, s.prompt, s.intent, s.repeat_index, s.location || null, s.status, s.answer_excerpt || null, JSON.stringify(s.citations || []), s.mentioned ?? null, s.cited ?? null, JSON.stringify(s.competitor_mentions || []), s.error || null, s.cost_cents || 0]);
}

async function summarize(runId, site, competitors) {
  const samples = await db.many('SELECT * FROM visibility_samples WHERE run_id = $1', [runId]);
  const ok = samples.filter(s => s.status === 'ok');
  const discovery = ok.filter(s => s.intent !== 'brand');
  const rate = (arr, key) => ({ count: arr.filter(s => s[key]).length, of: arr.length, interval: wilson(arr.filter(s => s[key]).length, arr.length) });
  const byPlatform = {};
  for (const s of samples) {
    const b = byPlatform[s.provider] ||= { provider: s.provider, model: s.model, ok: 0, unavailable: 0, error: 0, discovery: 0, mentioned: 0, cited: 0 };
    b[s.status === 'ok' ? 'ok' : s.status]++;
    // Mention and citation counts are over discovery questions only, matching the headline rate.
    if (s.status === 'ok') { if (s.model) b.model = s.model; if (s.intent !== 'brand') { b.discovery++; if (s.mentioned) b.mentioned++; if (s.cited) b.cited++; } }
  }
  const byPrompt = {};
  for (const s of ok) {
    const b = byPrompt[s.prompt] ||= { prompt: s.prompt, intent: s.intent, ok: 0, mentioned: 0, cited: 0, platforms: new Set() };
    b.ok++; if (s.mentioned) b.mentioned++; if (s.cited) b.cited++; b.platforms.add(s.provider);
  }
  // Sources most often cited for these questions: where the platforms are getting their answers.
  const domainCounts = {};
  for (const s of ok) {
    const seen = new Set();
    for (const c of s.citations || []) { if (c.retrievedOnly) continue; const d = c.domain; if (d && !seen.has(d)) { seen.add(d); domainCounts[d] = (domainCounts[d] || 0) + 1; } }
  }
  const ownDomain = bareDomain(site.domain);
  const topSources = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([domain, answers]) => ({ domain, answers, isYou: domain === ownDomain || domain.endsWith(`.${ownDomain}`) }));
  const comp = competitors.map(cp => {
    const hits = discovery.filter(s => (s.competitor_mentions || []).some(h => h.name === cp.name && h.mentioned)).length;
    return { name: cp.name, domain: cp.domain, mentioned: hits, of: discovery.length };
  });
  // Variability: for prompts asked more than once on the same platform, how often did repeats disagree?
  const groups = {};
  for (const s of ok) (groups[`${s.provider}|${s.prompt}`] ||= []).push(!!s.mentioned);
  const repeated = Object.values(groups).filter(g => g.length > 1);
  const inconsistent = repeated.filter(g => g.some(x => x) && g.some(x => !x)).length;
  const phoneFlags = ok.filter(s => (s.competitor_mentions || []).some(h => h.flag === 'phone_mismatch')).map(s => ({ provider: s.provider, phones: s.competitor_mentions.find(h => h.flag === 'phone_mismatch').answerPhones }));
  return {
    totals: { samples: samples.length, ok: ok.length, unavailable: samples.filter(s => s.status === 'unavailable').length, error: samples.filter(s => s.status === 'error').length },
    discoveryMentions: rate(discovery, 'mentioned'),
    discoveryCitations: rate(discovery, 'cited'),
    byPlatform: Object.values(byPlatform),
    byPrompt: Object.values(byPrompt).map(b => ({ ...b, platforms: [...b.platforms] })),
    topSources,
    competitors: comp,
    variability: { repeatedGroups: repeated.length, inconsistentGroups: inconsistent },
    accuracyFlags: phoneFlags,
    costCents: samples.reduce((s, x) => s + Number(x.cost_cents || 0), 0),
    conclusiveness: ok.length < 10 ? 'small_sample' : 'sample',
  };
}

module.exports = { withRetry, runVisibility, summarize };
