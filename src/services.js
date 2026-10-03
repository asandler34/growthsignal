'use strict';
// Domain operations shared by HTTP routes, job handlers and the scheduler.
const db = require('./db');
const { enqueue } = require('./jobs/queue');
const { validateUrl } = require('./lib/safe-fetch');
const { planFor, consume } = require('./lib/entitlements');
const { defaultPrompts } = require('./visibility/prompts');
const { providers, ORDER } = require('./visibility/providers');

class UserError extends Error {
  constructor(message, status = 400, code) { super(message); this.status = status; this.code = code; this.expose = true; }
}

function normalizeSiteUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) throw new UserError('Enter your website address.');
  if (s.length > 300) throw new UserError('That address is too long.');
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u;
  try { u = validateUrl(s); } catch (e) { throw new UserError(e.message); }
  if (!/\.[a-z]{2,}$/i.test(u.hostname) && !require('./config').config.scanner.allowPrivateNetworks) throw new UserError('Enter a public website address, like example.com.');
  u.hash = '';
  return { url: u.origin + (u.pathname === '/' ? '/' : u.pathname) + u.search, domain: u.hostname.toLowerCase().replace(/^www\./, '') };
}

function cleanText(v, max = 120) {
  if (v == null) return null;
  const s = String(v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
}
function cleanContext(body = {}) {
  const services = (Array.isArray(body.services) ? body.services : String(body.services || '').split(','))
    .map(s => cleanText(s, 60)).filter(Boolean).slice(0, 6);
  return {
    businessName: cleanText(body.businessName, 100),
    category: cleanText(body.category, 60),
    city: cleanText(body.city, 60),
    region: cleanText(body.region, 40),
    services,
  };
}

async function createScan({ url, domain, kind, userId = null, siteId = null, context = {}, ipHash = null }) {
  const scan = await db.one(
    `INSERT INTO scans (site_id, user_id, kind, url, domain, context, requester_ip_hash, progress) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [siteId, userId, kind, url, domain, context, ipHash, { step: 'queued', message: 'Waiting to start' }]);
  await enqueue('scan', { scanId: scan.id }, { maxAttempts: 2 });
  return scan;
}

async function siteForUser(userId, siteId) {
  const site = await db.one('SELECT * FROM sites WHERE id = $1 AND user_id = $2 AND archived_at IS NULL', [siteId, userId]);
  if (!site) throw new UserError('Site not found.', 404);
  return site;
}

async function addSite(user, { url, context }) {
  const { plan } = await planFor(user.id);
  const norm = normalizeSiteUrl(url);
  const existing = await db.one('SELECT * FROM sites WHERE user_id = $1 AND domain = $2', [user.id, norm.domain]);
  if (existing) {
    if (existing.archived_at) await db.query('UPDATE sites SET archived_at = NULL WHERE id = $1', [existing.id]);
    return existing;
  }
  const count = await db.one('SELECT count(*)::int AS n FROM sites WHERE user_id = $1 AND archived_at IS NULL', [user.id]);
  if (count.n >= plan.sites) throw new UserError(`Your ${plan.name} plan includes ${plan.sites} website${plan.sites > 1 ? 's' : ''}. Upgrade to add more.`, 402, 'limit_sites');
  const c = context || {};
  const site = await db.one(
    `INSERT INTO sites (user_id, url, domain, business_name, category, city, region, services) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [user.id, norm.url, norm.domain, c.businessName, c.category, c.city, c.region, c.services || []]);
  await seedPrompts(site, plan.prompts);
  return site;
}

async function seedPrompts(site, max) {
  const have = await db.one('SELECT count(*)::int AS n FROM prompts WHERE site_id = $1', [site.id]);
  if (have.n > 0) return;
  for (const p of defaultPrompts(site, Math.max(max, 3))) {
    await db.query('INSERT INTO prompts (site_id, text, intent, source) VALUES ($1,$2,$3,$4)', [site.id, p.text, p.intent, 'generated']);
  }
}

// Attach an anonymous preview scan to a newly signed in user, creating the site from its context.
async function claimScan(user, scanId) {
  const scan = await db.one('SELECT * FROM scans WHERE id = $1', [scanId]);
  if (!scan || (scan.user_id && scan.user_id !== user.id)) return null;
  let site;
  try { site = await addSite(user, { url: scan.url, context: scan.context }); } catch (e) { if (e.code === 'limit_sites') return null; throw e; }
  await db.query(`UPDATE scans SET user_id = $2, site_id = $3, kind = CASE WHEN kind = 'preview' THEN 'account' ELSE kind END WHERE id = $1 AND user_id IS NULL`, [scan.id, user.id, site.id]);
  return site;
}

async function startAccountScan(user, site, { kind = 'account' } = {}) {
  const { plan } = await planFor(user.id);
  if (kind === 'account') {
    const u = await consume(user.id, 'manual_scans', plan.manualScansPerMonth);
    if (!u.ok) throw new UserError(`You have used all ${plan.manualScansPerMonth} on demand scans included in ${plan.name} this month.`, 402, 'limit_scans');
  }
  const running = await db.one(`SELECT id FROM scans WHERE site_id = $1 AND status IN ('queued','running') LIMIT 1`, [site.id]);
  if (running) return db.one('SELECT * FROM scans WHERE id = $1', [running.id]);
  return createScan({ url: site.url, domain: site.domain, kind, userId: user.id, siteId: site.id, context: { businessName: site.business_name, category: site.category, city: site.city, region: site.region, services: site.services }, });
}

function anyProviderConfigured() { return ORDER.some(id => providers[id].configured()); }

async function startVisibilityRun(user, site, { trigger = 'manual' } = {}) {
  const { plan } = await planFor(user.id);
  if (!anyProviderConfigured()) throw new UserError('AI answer sampling is not connected yet. Your website readiness report is still available.', 503, 'no_providers');
  if (!site.business_name) throw new UserError('Add your business name first so we can recognize it in answers.', 400, 'needs_context');
  const running = await db.one(`SELECT id FROM visibility_runs WHERE site_id = $1 AND status IN ('queued','running') LIMIT 1`, [site.id]);
  if (running) return db.one('SELECT * FROM visibility_runs WHERE id = $1', [running.id]);
  let effectiveTrigger = trigger;
  let limits = plan;
  if (trigger === 'manual') {
    if (plan.id === 'free') {
      const claimed = await db.one(`UPDATE users SET free_visibility_used_at = now() WHERE id = $1 AND free_visibility_used_at IS NULL RETURNING id`, [user.id]);
      if (!claimed) throw new UserError('Your free AI answer sample has been used. Check includes monthly sampling.', 402, 'limit_visibility');
      effectiveTrigger = 'free';
    } else {
      const u = await consume(user.id, 'visibility_runs', plan.visibilityRunsPerMonth);
      if (!u.ok) throw new UserError(`You have used the ${plan.visibilityRunsPerMonth} on demand answer sample run(s) included in ${plan.name} this month. Scheduled runs continue.`, 402, 'limit_visibility');
    }
  }
  await seedPrompts(site, limits.prompts);
  const prompts = await db.many('SELECT text, intent FROM prompts WHERE site_id = $1 AND active ORDER BY source DESC, created_at LIMIT $2', [site.id, limits.prompts]);
  const configured = ORDER.filter(id => providers[id].configured());
  const platforms = configured.slice(0, limits.platforms);
  const notConnected = ORDER.filter(id => !providers[id].configured()).slice(0, Math.max(0, limits.platforms - platforms.length));
  const competitors = limits.competitors ? await db.many('SELECT name, domain FROM competitors WHERE site_id = $1 ORDER BY created_at LIMIT $2', [site.id, limits.competitors]) : [];
  const run = await db.one(
    `INSERT INTO visibility_runs (site_id, user_id, trigger, config) VALUES ($1,$2,$3,$4) RETURNING *`,
    [site.id, user.id, effectiveTrigger, { prompts, platforms, notConnected, repeats: limits.repeats, competitors, plan: plan.id }]);
  await enqueue('visibility', { runId: run.id }, { maxAttempts: 2 });
  return run;
}

module.exports = { UserError, normalizeSiteUrl, cleanContext, cleanText, createScan, siteForUser, addSite, seedPrompts, claimScan, startAccountScan, startVisibilityRun, anyProviderConfigured };
