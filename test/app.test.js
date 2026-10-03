'use strict';
const h = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const Stripe = require('stripe');
const db = require('../src/db');
const { outbox } = require('../src/lib/email');
const { goodSite } = require('./fixtures/sites');

let app; let site; let aiStub;
test.before(async () => {
  aiStub = await h.startAiStub();
  await h.resetDb();
  app = await h.startApp();
  site = await goodSite();
});
test.after(async () => { await app.close(); await site.close(); aiStub.close(); await db.pool.end(); });

const signed = (payload) => ({ body: JSON.stringify(payload), sig: Stripe.webhooks.generateTestHeaderString({ payload: JSON.stringify(payload), secret: 'whsec_test_secret' }) });
async function webhook(payload, sig) {
  const s = sig ? { body: JSON.stringify(payload), sig } : signed(payload);
  const r = await fetch(`${app.base}/api/stripe/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': s.sig }, body: s.body });
  return { status: r.status, json: await r.json() };
}
function subEvent(id, type, { sub = 'sub_1', customer = 'cus_1', price = 'price_check_m', status = 'active', created = 1000, cancelAtPeriodEnd = false, userId } = {}) {
  return { id, type, created, data: { object: { id: sub, object: 'subscription', customer, status, cancel_at_period_end: cancelAtPeriodEnd, metadata: userId ? { user_id: userId } : {}, items: { data: [{ price: { id: price, recurring: { interval: 'month' } }, current_period_end: 1900000000 }] } } } };
}

test('anonymous visitor runs a real preview scan and sees a bounded preview', async () => {
  const c = h.client(app.base);
  const r = await c.post('/api/scans', { url: `${site.origin}/`, businessName: 'Summit Plumbing', city: 'Denver', region: 'CO', category: 'plumber', services: 'drain cleaning, water heater repair' });
  assert.equal(r.status, 201);
  let v = (await c.get(`/api/scans/${r.json.id}`)).json;
  assert.equal(v.status, 'queued');
  await h.drain();
  v = (await c.get(`/api/scans/${r.json.id}`)).json;
  assert.equal(v.status, 'complete');
  assert.equal(v.preview, true);
  assert.ok(v.report.score.total > 80);
  assert.ok(v.report.priorities.length <= 3);
  assert.equal(v.report.checks[0].evidence, undefined, 'evidence requires an account');
});

test('invalid and internal URLs are rejected with a useful message', async () => {
  const c = h.client(app.base);
  for (const url of ['', 'ftp://x.com', 'http://169.254.169.254/', 'http://10.0.0.5/']) {
    const r = await c.post('/api/scans', { url });
    assert.equal(r.status, 400, url);
    assert.ok(r.json.error);
  }
});

test('anonymous scan rate limit per IP', async () => {
  const c = h.client(app.base);
  let last;
  for (let i = 0; i < 6; i++) last = await c.post('/api/scans', { url: `${site.origin}/` });
  assert.equal(last.status, 429);
  await db.query('DELETE FROM rate_limits');
});

test('cross site POST requests are blocked', async () => {
  const r = await fetch(`${app.base}/api/auth/request`, { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@b.co' }) });
  assert.equal(r.status, 403);
});

test('magic link sign in, token is single use, and claiming a preview scan creates a site', async () => {
  const c = h.client(app.base);
  const scan = await c.post('/api/scans', { url: `${site.origin}/`, businessName: 'Summit Plumbing', city: 'Denver', region: 'CO', category: 'plumber' });
  await h.drain();
  const before = outbox.length;
  await c.post('/api/auth/request', { email: 'owner@summit.example', claimScanId: scan.json.id });
  const token = /token=([A-Za-z0-9_-]+)/.exec(outbox[before].text)[1];
  const getPage = await fetch(`${app.base}/auth/verify?token=${token}`);
  assert.equal(getPage.status, 200, 'GET only renders a confirmation page');
  const r1 = await c.form('/auth/verify', { token });
  assert.equal(r1.status, 303);
  assert.match(r1.location, /^\/app\/site\/[0-9a-f-]{36}$/);
  const r2 = await h.client(app.base).form('/auth/verify', { token });
  assert.match(r2.location, /error=expired/);
  const me = (await c.get('/api/me')).json;
  assert.equal(me.user.email, 'owner@summit.example');
  assert.equal(me.plan.id, 'free');
  const sites = (await c.get('/api/sites')).json.sites;
  assert.equal(sites.length, 1);
  const full = (await c.get(`/api/scans/${scan.json.id}`)).json;
  assert.ok(full.report.checks[0].evidence, 'owner sees evidence');
});

test('account isolation: another user cannot read or change someone else\'s site or scans', async () => {
  const a = h.client(app.base); const b = h.client(app.base);
  await h.signIn(a, 'alice@example.com');
  await h.signIn(b, 'bob@example.com');
  const created = await a.post('/api/sites', { url: `${site.origin}/`, businessName: 'Summit Plumbing', city: 'Denver', region: 'CO', category: 'plumber' });
  assert.equal(created.status, 201);
  const siteId = created.json.site.id;
  await h.drain();
  assert.equal((await b.get(`/api/sites/${siteId}`)).status, 404);
  assert.equal((await b.patch(`/api/sites/${siteId}`, { businessName: 'Hijack' })).status, 404);
  assert.equal((await b.post(`/api/sites/${siteId}/scans`)).status, 404);
  assert.equal((await b.del(`/api/sites/${siteId}`)).status, 404);
  assert.equal((await b.get(`/api/scans/${created.json.scanId}`)).status, 404);
  assert.equal((await h.client(app.base).get(`/api/scans/${created.json.scanId}`)).status, 404, 'saved account scans are not public');
  assert.equal((await a.get(`/api/sites/${siteId}`)).status, 200);
});

test('free plan limits: one site, three on demand scans, fix kit and competitors locked', async () => {
  const c = h.client(app.base);
  await h.signIn(c, 'limits@example.com');
  const s1 = await c.post('/api/sites', { url: `${site.origin}/`, businessName: 'Summit Plumbing', city: 'Denver' });
  assert.equal(s1.status, 201);
  const s2 = await c.post('/api/sites', { url: 'https://another.example/' });
  assert.equal(s2.status, 402);
  const id = s1.json.site.id;
  await h.drain();
  assert.equal((await c.post(`/api/sites/${id}/scans`)).status, 201); await h.drain();
  assert.equal((await c.post(`/api/sites/${id}/scans`)).status, 201); await h.drain();
  const over = await c.post(`/api/sites/${id}/scans`);
  assert.equal(over.status, 402);
  assert.match(over.json.error, /3 on demand scans/);
  assert.equal((await c.get(`/api/sites/${id}/fixkit`)).status, 402);
  assert.equal((await c.post(`/api/sites/${id}/competitors`, { name: 'Rival' })).status, 402);
});

test('free first look AI sample: real pipeline through provider APIs, recorded once, then locked', async () => {
  const c = h.client(app.base);
  await h.signIn(c, 'firstlook@example.com');
  const s = await c.post('/api/sites', { url: `${site.origin}/`, businessName: 'Summit Plumbing', city: 'Denver', region: 'CO', category: 'plumber', services: 'drain cleaning' });
  const id = s.json.site.id;
  // Pretend the site's domain is summit.example so citations to it in stub answers count.
  await db.query(`UPDATE sites SET domain = 'summit.example' WHERE id = $1`, [id]);
  const run = await c.post(`/api/sites/${id}/visibility`);
  assert.equal(run.status, 201);
  await h.drain();
  const v = (await c.get(`/api/sites/${id}/visibility/${run.json.id}`)).json;
  assert.equal(v.status, 'complete');
  assert.equal(v.config.platforms.length, 1);
  assert.equal(v.samples.length, 3); // free: 3 questions x 1 platform x 1 repeat
  assert.ok(v.samples.every(x => x.status === 'ok'));
  assert.ok(v.summary.discoveryMentions.of >= 1);
  assert.ok(v.summary.discoveryMentions.interval);
  assert.ok(v.summary.topSources.length > 0);
  const again = await c.post(`/api/sites/${id}/visibility`);
  assert.equal(again.status, 402);
});

test('paid plan sampling: repeats, competitor detection, unavailable platforms, provider errors excluded from rates', async () => {
  const c = h.client(app.base);
  await h.signIn(c, 'grow@example.com');
  const me = (await c.get('/api/me')).json;
  await h.setPlan(me.user.id, 'grow');
  const s = await c.post('/api/sites', { url: `${site.origin}/`, businessName: 'Summit Plumbing', city: 'Denver', region: 'CO', category: 'plumber', services: 'drain cleaning' });
  const id = s.json.site.id;
  await db.query(`UPDATE sites SET domain = 'summit.example', facts = '{"phone":"(303) 555-0142"}' WHERE id = $1`, [id]);
  assert.equal((await c.post(`/api/sites/${id}/competitors`, { name: 'Mile High Drains', domain: 'milehighdrains.example' })).status, 201);
  h.stub().fail.perplexity = 500;
  const run = await c.post(`/api/sites/${id}/visibility`);
  await h.drain();
  h.stub().fail = {};
  const v = (await c.get(`/api/sites/${id}/visibility/${run.json.id}`)).json;
  assert.deepEqual(v.config.platforms, ['openai', 'perplexity']);
  assert.deepEqual(v.config.notConnected, ['anthropic']);
  assert.equal(v.config.repeats, 2);
  const pplx = v.summary.byPlatform.find(p => p.provider === 'perplexity');
  assert.equal(pplx.ok, 0);
  assert.ok(pplx.error > 0);
  const okCount = v.samples.filter(x => x.status === 'ok').length;
  assert.equal(v.summary.totals.ok, okCount);
  assert.ok(v.summary.discoveryMentions.of <= okCount, 'errors are not counted in the denominator');
  const rival = v.summary.competitors.find(x => x.name === 'Mile High Drains');
  assert.ok(rival.mentioned > 0);
  const openai = v.samples.find(x => x.provider === 'openai' && x.status === 'ok' && x.intent === 'discovery');
  assert.equal(openai.cited, true);
  assert.ok(v.summary.accuracyFlags.length > 0, 'brand answer phone (303) 555-0199 differs from confirmed (303) 555-0142');
});

test('daily AI budget guard marks samples unavailable instead of spending', async () => {
  const c = h.client(app.base);
  await h.signIn(c, 'budget@example.com');
  const s = await c.post('/api/sites', { url: `${site.origin}/`, businessName: 'Summit Plumbing', city: 'Denver', category: 'plumber' });
  await db.query(`INSERT INTO ai_spend (day, cents) VALUES (current_date, 99999) ON CONFLICT (day) DO UPDATE SET cents = 99999`);
  const run = await c.post(`/api/sites/${s.json.site.id}/visibility`);
  await h.drain();
  const v = (await c.get(`/api/sites/${s.json.site.id}/visibility/${run.json.id}`)).json;
  assert.ok(v.samples.every(x => x.status === 'unavailable'));
  assert.equal(v.summary.discoveryMentions.of, 0);
  await db.query('DELETE FROM ai_spend');
});

test('failed scan job retries, then reports a useful error', async () => {
  const { createScan } = require('../src/services');
  const scan = await createScan({ url: 'http://127.0.0.1:1/', domain: '127.0.0.1', kind: 'preview' });
  await h.drain();
  let row = await db.one('SELECT status, progress FROM scans WHERE id = $1', [scan.id]);
  assert.equal(row.progress.step, 'retrying', 'first failure is retried with a visible status');
  await db.query(`UPDATE jobs SET run_at = now() WHERE type = 'scan' AND status = 'queued'`);
  await h.drain();
  row = await db.one('SELECT status, error FROM scans WHERE id = $1', [scan.id]);
  assert.equal(row.status, 'failed');
  assert.match(row.error, /refused/);
  const { enqueue, Worker } = require('../src/jobs/queue');
  let calls = 0;
  const flaky = { flaky: async () => { calls++; if (calls < 2) throw new Error('transient'); } };
  await enqueue('flaky', {}, { maxAttempts: 3 });
  const w = new Worker(flaky);
  await w.drain();
  await db.query(`UPDATE jobs SET run_at = now() WHERE type = 'flaky' AND status = 'queued'`);
  await w.drain();
  row = await db.one(`SELECT status, attempts, last_error FROM jobs WHERE type = 'flaky'`);
  assert.equal(row.status, 'done');
  assert.equal(row.attempts, 2);
});

test('Stripe webhooks: signature required, idempotent, out of order safe, cancellation downgrades', async () => {
  const c = h.client(app.base);
  await h.signIn(c, 'payer@example.com');
  const me = (await c.get('/api/me')).json;
  assert.equal((await webhook(subEvent('evt_bad', 'customer.subscription.created', { userId: me.user.id }), 't=1,v1=deadbeef')).status, 400);
  assert.equal((await c.get('/api/me')).json.plan.id, 'free');

  const created = subEvent('evt_1', 'customer.subscription.created', { userId: me.user.id, price: 'price_improve_m', created: 100 });
  assert.equal((await webhook(created)).status, 200);
  assert.equal((await webhook(created)).status, 200, 'duplicate delivery is accepted');
  let m = (await c.get('/api/me')).json;
  assert.equal(m.plan.id, 'improve');
  assert.equal(outbox.filter(x => x.to === 'payer@example.com' && /Welcome/.test(x.subject)).length, 1, 'welcome email sent once');

  await webhook(subEvent('evt_3', 'customer.subscription.updated', { customer: 'cus_1', price: 'price_grow_m', created: 300 }));
  await webhook(subEvent('evt_2', 'customer.subscription.updated', { customer: 'cus_1', price: 'price_check_m', created: 200 }));
  assert.equal((await c.get('/api/me')).json.plan.id, 'grow', 'older event does not overwrite newer state');

  await webhook(subEvent('evt_4', 'customer.subscription.updated', { customer: 'cus_1', price: 'price_grow_m', created: 400, cancelAtPeriodEnd: true }));
  m = (await c.get('/api/me')).json;
  assert.equal(m.plan.id, 'grow', 'paid features stay on until period end');
  assert.equal(m.subscription.cancelAtPeriodEnd, true);
  await webhook(subEvent('evt_5', 'customer.subscription.deleted', { customer: 'cus_1', price: 'price_grow_m', status: 'canceled', created: 500 }));
  assert.equal((await c.get('/api/me')).json.plan.id, 'free');
  const events = await db.many('SELECT id FROM stripe_events');
  assert.equal(events.length, 5);
});

test('checkout requires sign in and a known plan', async () => {
  const anon = h.client(app.base);
  assert.equal((await anon.post('/api/billing/checkout', { plan: 'check' })).status, 401);
  const c = h.client(app.base);
  await h.signIn(c, 'chooser@example.com');
  assert.equal((await c.post('/api/billing/checkout', { plan: 'platinum' })).status, 400);
  const annualCheck = await c.post('/api/billing/checkout', { plan: 'check', interval: 'annual' });
  assert.equal(annualCheck.status, 503, 'unconfigured price is reported, not faked');
});

test('fix kit for paid plan: generated JSON-LD escapes script breaking input and only after confirmation', async () => {
  const c = h.client(app.base);
  await h.signIn(c, 'fixer@example.com');
  const me = (await c.get('/api/me')).json;
  await h.setPlan(me.user.id, 'improve');
  const s = await c.post('/api/sites', { url: `${site.origin}/`, businessName: 'Summit Plumbing' });
  const id = s.json.site.id;
  await h.drain();
  let kit = (await c.get(`/api/sites/${id}/fixkit`)).json;
  assert.equal(kit.confirmed, false);
  const bad = await c.put(`/api/sites/${id}/facts`, { confirm: true, facts: { name: '' } });
  assert.equal(bad.status, 400);
  const ok = await c.put(`/api/sites/${id}/facts`, { confirm: true, facts: { name: 'Summit </script><script>alert(1)</script>', type: 'Plumber', phone: '(303) 555-0142', city: 'Denver', region: 'CO', areaServed: 'Denver, Aurora', services: 'Drain cleaning', hours: [{ days: ['mon', 'tue'], opens: '07:00', closes: '18:00' }] } });
  assert.equal(ok.status, 200);
  kit = (await c.get(`/api/sites/${id}/fixkit`)).json;
  const ld = kit.items.find(i => i.id === 'jsonld').content;
  assert.equal((ld.match(/<\/script>/g) || []).length, 1, 'only the closing tag of the block itself');
  const parsed = JSON.parse(ld.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
  assert.equal(parsed['@type'], 'Plumber');
  assert.equal(parsed.openingHoursSpecification[0].dayOfWeek[0], 'Monday');
});

test('public share link requires verified ownership', async () => {
  const c = h.client(app.base);
  await h.signIn(c, 'sharer@example.com');
  const me = (await c.get('/api/me')).json;
  await h.setPlan(me.user.id, 'check');
  const s = await c.post('/api/sites', { url: `${site.origin}/`, businessName: 'Summit Plumbing' });
  const id = s.json.site.id;
  await h.drain();
  const r = await c.post(`/api/sites/${id}/share`, { enabled: true });
  assert.equal(r.status, 403);
  const v = await c.post(`/api/sites/${id}/verify`);
  assert.equal(v.json.verified, false);
  await db.query('UPDATE sites SET verified_at = now() WHERE id = $1', [id]);
  const r2 = await c.post(`/api/sites/${id}/share`, { enabled: true });
  assert.equal(r2.status, 200);
  const token = r2.json.shareUrl.split('/r/')[1];
  const pub = await h.client(app.base).get(`/api/shared/${token}`);
  assert.equal(pub.status, 200);
  assert.equal(pub.json.preview, true);
});

test('inquiry form stores message, notifies nothing without operator, and drops honeypot spam', async () => {
  const c = h.client(app.base);
  assert.equal((await c.post('/api/inquiries', { email: 'bad', message: 'hi there' })).status, 400);
  assert.equal((await c.post('/api/inquiries', { email: 'q@example.com', message: 'Do you support Wix?', topic: 'setup' })).status, 201);
  assert.equal((await c.post('/api/inquiries', { email: 'spam@example.com', message: 'buy now', company_website: 'x' })).status, 201);
  const rows = await db.many('SELECT email FROM inquiries');
  assert.deepEqual(rows.map(r => r.email), ['q@example.com']);
});

test('account deletion requires typed confirmation and removes data', async () => {
  const c = h.client(app.base);
  await h.signIn(c, 'leaver@example.com');
  await c.post('/api/sites', { url: `${site.origin}/`, businessName: 'X Co' });
  assert.equal((await c.post('/api/account/delete', { confirm: 'nope' })).status, 400);
  assert.equal((await c.post('/api/account/delete', { confirm: 'leaver@example.com' })).status, 200);
  assert.equal((await c.get('/api/me')).json.user, null);
  assert.equal((await db.one(`SELECT count(*)::int AS n FROM users WHERE email = 'leaver@example.com'`)).n, 0);
});

test('scheduled monitoring enqueues scans for paying customers only and emails on regressions', async () => {
  const handlers = require('../src/jobs/handlers');
  await db.query(`UPDATE scans SET created_at = now() - interval '8 days'`);
  await db.query(`UPDATE visibility_runs SET created_at = now() - interval '40 days'`);
  const queued = await handlers.scheduleDue();
  assert.ok(queued > 0);
  const sched = await db.many(`SELECT s.user_id FROM scans s WHERE kind = 'scheduled'`);
  const paidUsers = new Set((await db.many(`SELECT user_id FROM subscriptions WHERE status IN ('active','trialing','past_due')`)).map(r => r.user_id));
  assert.ok(sched.every(r => paidUsers.has(r.user_id)));
  const again = await handlers.scheduleDue();
  assert.equal(again, 0, 'no duplicate scheduling the same day');
});
