'use strict';
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { config, validateForProduction } = require('./config');
const db = require('./db');
const log = require('./lib/log');
const auth = require('./lib/auth');
const rate = require('./lib/rate-limit');
const billing = require('./lib/billing');
const { sendEmail } = require('./lib/email');
const { planFor, usage } = require('./lib/entitlements');
const { publicPlans, PAID } = require('./lib/plans');
const { listProviders } = require('./visibility/providers');
const { safeFetch } = require('./lib/safe-fetch');
const svc = require('./services');
const { normalizeFacts, buildFixKit, SCHEMA_TYPES } = require('./improve/fixkit');
const { previewView, fullView, siteView, runView } = require('./routes/views');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const { UserError } = svc;

function ipHash(req) { return crypto.createHmac('sha256', config.sessionSecret || 'x').update(req.ip || '').digest('hex').slice(0, 32); }
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy ? 1 : false);

  app.use((req, res, next) => {
    res.set({
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    });
    if (config.isProd) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Stripe needs the exact raw body to verify the signature, so this route comes before JSON parsing.
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), wrap(async (req, res) => {
    let event;
    try { event = billing.verifyEvent(req.body, req.headers['stripe-signature']); } catch (e) {
      log.warn('stripe.webhook_rejected', { error: e.message });
      return res.status(e.status || 400).json({ error: 'invalid signature' });
    }
    const out = await billing.handleEvent(event);
    log.info('stripe.webhook', { id: event.id, type: event.type, duplicate: !!out.duplicate });
    res.json({ received: true });
  }));

  app.use(express.json({ limit: '50kb' }));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));

  // CSRF defense for cookie authenticated requests: unsafe methods must come from our own origin.
  app.use((req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
    const ours = new URL(config.baseUrl).origin;
    if (origin && origin !== ours && origin !== `${req.protocol}://${req.get('host')}`) return res.status(403).json({ error: 'Cross-site request blocked.' });
    next();
  });

  app.use(wrap(async (req, res, next) => { req.user = await auth.userFromRequest(req); next(); }));
  const requireUser = (req, res, next) => (req.user ? next() : res.status(401).json({ error: 'Please sign in.' }));

  app.get('/healthz', wrap(async (req, res) => { await db.query('SELECT 1'); res.json({ ok: true }); }));

  // ---------- Public API ----------
  app.get('/api/config', (req, res) => {
    res.json({ plans: publicPlans(), billing: billing.billingStatus(), platforms: listProviders().map(p => ({ id: p.id, label: p.label, connected: p.configured })), schemaTypes: SCHEMA_TYPES });
  });

  app.post('/api/scans', wrap(async (req, res) => {
    const { url, domain } = svc.normalizeSiteUrl(req.body.url);
    const context = svc.cleanContext(req.body);
    if (req.user) {
      const site = await svc.addSite(req.user, { url, context });
      const scan = await svc.startAccountScan(req.user, site);
      return res.status(201).json({ id: scan.id, siteId: site.id });
    }
    const h = ipHash(req);
    const perIp = await rate.hit(`scan:ip:${h}`, config.limits.anonScansPerIpPerHour, 3600);
    if (!perIp.ok) throw new UserError('You have run several free scans in the last hour. Create a free account to keep going, or try again later.', 429);
    const global = await rate.hit('scan:global', config.limits.anonScansPerDay, 86400);
    if (!global.ok) throw new UserError('Free scans are at capacity today. Please try again tomorrow.', 429);
    const scan = await svc.createScan({ url, domain, kind: 'preview', context, ipHash: h });
    res.status(201).json({ id: scan.id });
  }));

  app.get('/api/scans/:id', wrap(async (req, res) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const scan = await db.one('SELECT * FROM scans WHERE id = $1', [req.params.id]);
    if (!scan) return res.status(404).json({ error: 'Not found' });
    if (scan.user_id && (!req.user || req.user.id !== scan.user_id)) return res.status(404).json({ error: 'Not found' });
    res.json(req.user && scan.user_id === req.user.id ? { ...fullView(scan), siteId: scan.site_id } : previewView(scan));
  }));

  app.get('/api/shared/:token', wrap(async (req, res) => {
    const site = await db.one('SELECT * FROM sites WHERE share_token = $1 AND verified_at IS NOT NULL AND archived_at IS NULL', [String(req.params.token).slice(0, 64)]);
    if (!site) return res.status(404).json({ error: 'Not found' });
    const scan = await db.one(`SELECT * FROM scans WHERE site_id = $1 AND status = 'complete' ORDER BY completed_at DESC LIMIT 1`, [site.id]);
    if (!scan) return res.status(404).json({ error: 'No report yet' });
    res.json({ businessName: site.business_name, ...previewView(scan) });
  }));

  app.post('/api/inquiries', wrap(async (req, res) => {
    if (req.body.company_website) return res.status(201).json({ ok: true }); // honeypot
    const email = auth.normalizeEmail(req.body.email);
    const message = svc.cleanText(req.body.message, 4000);
    if (!email) throw new UserError('Enter a valid email address so we can reply.');
    if (!message || message.length < 5) throw new UserError('Add a short message.');
    const lim = await rate.hit(`inquiry:${ipHash(req)}`, 5, 3600);
    if (!lim.ok) throw new UserError('Too many messages. Please try again later.', 429);
    const row = { name: svc.cleanText(req.body.name, 100), email, website: svc.cleanText(req.body.website, 200), topic: svc.cleanText(req.body.topic, 60), message: String(req.body.message).slice(0, 4000) };
    await db.query('INSERT INTO inquiries (name, email, website, topic, message) VALUES ($1,$2,$3,$4,$5)', [row.name, row.email, row.website, row.topic, row.message]);
    if (config.operatorEmail) await sendEmail(config.operatorEmail, 'inquiry_operator', row).catch(() => {});
    res.status(201).json({ ok: true });
  }));

  // ---------- Auth ----------
  app.post('/api/auth/request', wrap(async (req, res) => {
    const email = auth.normalizeEmail(req.body.email);
    if (!email) throw new UserError('Enter a valid email address.');
    const byEmail = await rate.hit(`login:${email}`, config.limits.loginEmailsPerHour, 3600);
    const byIp = await rate.hit(`login:ip:${ipHash(req)}`, 20, 3600);
    if (!byEmail.ok || !byIp.ok) throw new UserError('Too many sign in emails requested. Please wait a few minutes.', 429);
    const claimScanId = /^[0-9a-f-]{36}$/i.test(req.body.claimScanId || '') ? req.body.claimScanId : null;
    const token = await auth.createLoginToken(email, { next: req.body.next, claimScanId });
    await sendEmail(email, 'login', { link: `${config.baseUrl}/auth/verify?token=${encodeURIComponent(token)}` });
    res.json({ ok: true });
  }));

  // GET shows a confirmation button so link scanners in email clients cannot consume the one time token.
  app.get('/auth/verify', (req, res) => {
    const token = String(req.query.token || '').slice(0, 100).replace(/[^A-Za-z0-9_-]/g, '');
    res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in · GrowthSignal</title><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/app.css"></head><body class="auth-body"><main class="auth-card"><a href="/" class="brand"><img src="/assets/growthsignal-logo.svg" alt="GrowthSignal.ai" width="200" height="34"></a><h1>Finish signing in</h1><form method="post" action="/auth/verify"><input type="hidden" name="token" value="${token}"><button class="button" type="submit">Continue to GrowthSignal</button></form></main></body></html>`);
  });
  app.post('/auth/verify', wrap(async (req, res) => {
    const result = await auth.consumeLoginToken(String(req.body.token || ''));
    if (!result) return res.redirect(303, '/login?error=expired');
    const sid = await auth.createSession(result.user.id);
    res.cookie(auth.SESSION_COOKIE, sid, auth.cookieOptions());
    let next = auth.safeNext(result.nextPath);
    if (result.claimScanId) {
      const site = await svc.claimScan(result.user, result.claimScanId).catch(e => { log.warn('auth.claim_failed', { error: e.message }); return null; });
      if (site) next = `/app/site/${site.id}`;
    }
    res.redirect(303, next);
  }));
  app.post('/api/auth/logout', wrap(async (req, res) => {
    await auth.destroySession(req);
    res.clearCookie(auth.SESSION_COOKIE, { path: '/' });
    res.json({ ok: true });
  }));

  // ---------- Account ----------
  app.get('/api/me', wrap(async (req, res) => {
    if (!req.user) return res.json({ user: null });
    const { plan, subscription } = await planFor(req.user.id);
    res.json({
      user: { id: req.user.id, email: req.user.email, freeVisibilityUsed: !!req.user.free_visibility_used_at, emailOptOut: req.user.email_opt_out },
      plan, usage: await usage(req.user.id),
      subscription: subscription && { plan: subscription.plan, status: subscription.status, interval: subscription.interval, currentPeriodEnd: subscription.current_period_end, cancelAtPeriodEnd: subscription.cancel_at_period_end },
      billing: billing.billingStatus(),
    });
  }));
  app.patch('/api/me', requireUser, wrap(async (req, res) => {
    if (typeof req.body.emailOptOut === 'boolean') await db.query('UPDATE users SET email_opt_out = $2 WHERE id = $1', [req.user.id, req.body.emailOptOut]);
    res.json({ ok: true });
  }));
  app.post('/api/account/delete', requireUser, wrap(async (req, res) => {
    if (req.body.confirm !== req.user.email) throw new UserError('Type your email address to confirm.');
    const active = await db.one(`SELECT 1 FROM subscriptions WHERE user_id = $1 AND status IN ('active','trialing','past_due') AND NOT cancel_at_period_end`, [req.user.id]);
    if (active) throw new UserError('Cancel your subscription in Billing first, then delete your account.', 409);
    await db.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.clearCookie(auth.SESSION_COOKIE, { path: '/' });
    res.json({ ok: true });
  }));

  app.post('/api/billing/checkout', requireUser, wrap(async (req, res) => {
    const plan = String(req.body.plan || '');
    if (!PAID.includes(plan)) throw new UserError('Choose a plan.');
    const out = await billing.createCheckout(req.user, plan, req.body.interval === 'annual' ? 'annual' : 'monthly');
    res.json(out);
  }));
  app.post('/api/billing/portal', requireUser, wrap(async (req, res) => {
    res.json({ url: await billing.createPortal(req.user) });
  }));

  // ---------- Sites ----------
  app.get('/api/sites', requireUser, wrap(async (req, res) => {
    const sites = await db.many(
      `SELECT s.*, (SELECT row_to_json(x) FROM (SELECT id, score, status, completed_at FROM scans WHERE site_id = s.id ORDER BY created_at DESC LIMIT 1) x) AS latest
       FROM sites s WHERE s.user_id = $1 AND s.archived_at IS NULL ORDER BY s.created_at`, [req.user.id]);
    res.json({ sites: sites.map(s => ({ ...siteView(s), latest: s.latest })) });
  }));
  app.post('/api/sites', requireUser, wrap(async (req, res) => {
    const site = await svc.addSite(req.user, { url: req.body.url, context: svc.cleanContext(req.body) });
    const scan = await svc.startAccountScan(req.user, site).catch(e => { if (e.code === 'limit_scans') return null; throw e; });
    res.status(201).json({ site: siteView(site), scanId: scan && scan.id });
  }));

  const loadSite = wrap(async (req, res, next) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.siteId)) return res.status(404).json({ error: 'Site not found.' });
    req.site = await svc.siteForUser(req.user.id, req.params.siteId);
    next();
  });

  app.get('/api/sites/:siteId', requireUser, loadSite, wrap(async (req, res) => {
    const s = req.site;
    const { plan } = await planFor(req.user.id);
    const latest = await db.one(`SELECT * FROM scans WHERE site_id = $1 ORDER BY created_at DESC LIMIT 1`, [s.id]);
    const lastComplete = latest && latest.status === 'complete' ? latest : await db.one(`SELECT * FROM scans WHERE site_id = $1 AND status = 'complete' ORDER BY completed_at DESC LIMIT 1`, [s.id]);
    const history = await db.many(`SELECT id, kind, score, status, created_at, completed_at FROM scans WHERE site_id = $1 ORDER BY created_at DESC LIMIT 50`, [s.id]);
    const runs = await db.many(`SELECT * FROM visibility_runs WHERE site_id = $1 ORDER BY created_at DESC LIMIT 12`, [s.id]);
    const prompts = await db.many('SELECT id, text, intent, source, active FROM prompts WHERE site_id = $1 ORDER BY created_at', [s.id]);
    const competitors = await db.many('SELECT id, name, domain FROM competitors WHERE site_id = $1 ORDER BY created_at', [s.id]);
    res.json({
      site: siteView(s), plan,
      latestScan: latest ? fullView(latest) : null,
      lastCompleteScan: lastComplete && lastComplete.id !== (latest && latest.id) ? fullView(lastComplete) : null,
      history, runs: runs.map(r => runView(r)), prompts, competitors,
      platforms: listProviders().map(p => ({ id: p.id, label: p.label, connected: p.configured })),
    });
  }));
  app.patch('/api/sites/:siteId', requireUser, loadSite, wrap(async (req, res) => {
    const c = svc.cleanContext(req.body);
    const s = await db.one(
      `UPDATE sites SET business_name = COALESCE($2, business_name), category = COALESCE($3, category), city = COALESCE($4, city), region = COALESCE($5, region), services = CASE WHEN $6::text[] IS NULL OR cardinality($6::text[]) = 0 THEN services ELSE $6 END WHERE id = $1 RETURNING *`,
      [req.site.id, c.businessName, c.category, c.city, c.region, req.body.services !== undefined ? c.services : null]);
    res.json({ site: siteView(s) });
  }));
  app.delete('/api/sites/:siteId', requireUser, loadSite, wrap(async (req, res) => {
    await db.query('UPDATE sites SET archived_at = now(), share_token = NULL WHERE id = $1', [req.site.id]);
    res.json({ ok: true });
  }));
  app.post('/api/sites/:siteId/scans', requireUser, loadSite, wrap(async (req, res) => {
    const scan = await svc.startAccountScan(req.user, req.site);
    res.status(201).json({ id: scan.id });
  }));
  app.get('/api/sites/:siteId/scans/:scanId', requireUser, loadSite, wrap(async (req, res) => {
    const scan = await db.one('SELECT * FROM scans WHERE id = $1 AND site_id = $2', [req.params.scanId, req.site.id]);
    if (!scan) return res.status(404).json({ error: 'Not found' });
    res.json(fullView(scan));
  }));
  app.post('/api/sites/:siteId/visibility', requireUser, loadSite, wrap(async (req, res) => {
    const run = await svc.startVisibilityRun(req.user, req.site);
    res.status(201).json({ id: run.id });
  }));
  app.get('/api/sites/:siteId/visibility/:runId', requireUser, loadSite, wrap(async (req, res) => {
    const run = await db.one('SELECT * FROM visibility_runs WHERE id = $1 AND site_id = $2', [req.params.runId, req.site.id]);
    if (!run) return res.status(404).json({ error: 'Not found' });
    const samples = await db.many('SELECT * FROM visibility_samples WHERE run_id = $1 ORDER BY prompt, provider, repeat_index', [run.id]);
    res.json(runView(run, samples));
  }));
  app.put('/api/sites/:siteId/prompts', requireUser, loadSite, wrap(async (req, res) => {
    const { plan } = await planFor(req.user.id);
    const list = (Array.isArray(req.body.prompts) ? req.body.prompts : []).map(p => ({ text: svc.cleanText(p.text, 200), active: p.active !== false, intent: p.intent === 'brand' ? 'brand' : 'discovery' })).filter(p => p.text && p.text.length >= 8);
    if (list.filter(p => p.active).length > plan.prompts) throw new UserError(`${plan.name} includes up to ${plan.prompts} active questions.`, 402, 'limit_prompts');
    if (list.length > 40) throw new UserError('Keep the list to 40 questions or fewer.');
    await db.tx(async c => {
      await c.query('DELETE FROM prompts WHERE site_id = $1', [req.site.id]);
      for (const p of list) await c.query('INSERT INTO prompts (site_id, text, intent, source, active) VALUES ($1,$2,$3,$4,$5)', [req.site.id, p.text, p.intent, 'owner', p.active]);
    });
    res.json({ ok: true });
  }));
  app.post('/api/sites/:siteId/competitors', requireUser, loadSite, wrap(async (req, res) => {
    const { plan } = await planFor(req.user.id);
    const n = await db.one('SELECT count(*)::int AS n FROM competitors WHERE site_id = $1', [req.site.id]);
    if (n.n >= plan.competitors) throw new UserError(plan.competitors ? `${plan.name} includes up to ${plan.competitors} competitors.` : 'Competitor comparisons are included in Improve and Grow.', 402, 'limit_competitors');
    const name = svc.cleanText(req.body.name, 100);
    if (!name) throw new UserError('Enter the competitor name.');
    let domain = null;
    if (req.body.domain) { try { domain = svc.normalizeSiteUrl(req.body.domain).domain; } catch { throw new UserError('Enter a valid competitor website or leave it blank.'); } }
    const row = await db.one('INSERT INTO competitors (site_id, name, domain) VALUES ($1,$2,$3) RETURNING id, name, domain', [req.site.id, name, domain]);
    res.status(201).json(row);
  }));
  app.delete('/api/sites/:siteId/competitors/:cid', requireUser, loadSite, wrap(async (req, res) => {
    await db.query('DELETE FROM competitors WHERE id = $1 AND site_id = $2', [req.params.cid, req.site.id]);
    res.json({ ok: true });
  }));
  app.put('/api/sites/:siteId/facts', requireUser, loadSite, wrap(async (req, res) => {
    const { facts, errors } = normalizeFacts(req.body.facts || {});
    if (req.body.confirm && errors.length) throw new UserError(errors.join(' '));
    await db.query(`UPDATE sites SET facts = $2, facts_confirmed_at = CASE WHEN $3 THEN now() ELSE NULL END, business_name = COALESCE(NULLIF($4,''), business_name) WHERE id = $1`, [req.site.id, facts, !!req.body.confirm, facts.name]);
    res.json({ facts, errors, confirmed: !!req.body.confirm });
  }));
  app.get('/api/sites/:siteId/fixkit', requireUser, loadSite, wrap(async (req, res) => {
    const { plan } = await planFor(req.user.id);
    if (!plan.fixKit) return res.status(402).json({ error: 'The fix kit is included in Improve and Grow.', code: 'upgrade_fixkit' });
    const last = await db.one(`SELECT report FROM scans WHERE site_id = $1 AND status = 'complete' ORDER BY completed_at DESC LIMIT 1`, [req.site.id]);
    res.json(buildFixKit(req.site, last && last.report));
  }));
  app.post('/api/sites/:siteId/verify', requireUser, loadSite, wrap(async (req, res) => {
    const token = req.site.verification_token;
    const origin = new URL(req.site.url).origin;
    let ok = false;
    let detail = '';
    try {
      const home = await safeFetch(req.site.url);
      if (new RegExp(`<meta[^>]+name=["']growthsignal-verification["'][^>]+content=["']${token}["']`, 'i').test(home.text) || new RegExp(`content=["']${token}["'][^>]+name=["']growthsignal-verification["']`, 'i').test(home.text)) ok = true;
      if (!ok) {
        const f = await safeFetch(`${origin}/growthsignal-${token}.txt`).catch(() => null);
        if (f && f.status === 200 && f.text.trim() === token) ok = true;
      }
      detail = ok ? 'Verified.' : 'We could not find the verification tag or file yet.';
    } catch (e) { detail = `We could not load your site: ${e.message}`; }
    if (ok) await db.query('UPDATE sites SET verified_at = now() WHERE id = $1', [req.site.id]);
    res.json({ verified: ok, detail });
  }));
  app.post('/api/sites/:siteId/share', requireUser, loadSite, wrap(async (req, res) => {
    const { plan } = await planFor(req.user.id);
    if (req.body.enabled) {
      if (!plan.shareLink) throw new UserError('Share links are included in paid plans.', 402, 'upgrade_share');
      if (!req.site.verified_at) throw new UserError('Verify that you own this website before sharing a public report.', 403, 'needs_verification');
      const t = req.site.share_token || crypto.randomBytes(16).toString('base64url');
      await db.query('UPDATE sites SET share_token = $2 WHERE id = $1', [req.site.id, t]);
      return res.json({ shareUrl: `${config.baseUrl}/r/${t}` });
    }
    await db.query('UPDATE sites SET share_token = NULL WHERE id = $1', [req.site.id]);
    res.json({ shareUrl: null });
  }));

  // ---------- Pages ----------
  app.use(express.static(PUBLIC_DIR, { extensions: ['html'], index: 'index.html', maxAge: config.isProd ? '1h' : 0 }));
  const page = file => (req, res) => res.sendFile(path.join(PUBLIC_DIR, file));
  app.get('/scan/:id', page('scan.html'));
  app.get('/r/:token', page('scan.html'));
  app.get(['/app', '/app/*rest'], page('app.html'));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large.' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request body.' });
    if (err.expose || err instanceof UserError) return res.status(err.status || 400).json({ error: err.message, code: err.code });
    if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
    if (err.status === 503) return res.status(503).json({ error: err.message });
    log.error('http.error', { path: req.path, error: err.message, stack: config.isProd ? undefined : err.stack });
    res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
  });
  return app;
}

async function main() {
  const problems = validateForProduction();
  if (problems.length) { problems.forEach(p => log.error('config.invalid', { problem: p })); process.exit(1); }
  await require('./db/migrate').migrate({ log: m => log.info('db.migrate', { m }) });
  if (config.role === 'web' || config.role === 'all') {
    const app = createApp();
    app.listen(config.port, () => log.info('http.listening', { port: config.port, baseUrl: config.baseUrl }));
  }
  if (config.role === 'worker' || config.role === 'all') require('./jobs/worker').startWorker();
}

module.exports = { createApp };
if (require.main === module) main().catch(e => { log.error('startup.failed', { error: e.message }); process.exit(1); });
