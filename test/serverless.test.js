'use strict';
// Serverless mode: no always-on worker. Queued jobs must run on their own after the response,
// and cron and operator routes must require the shared secret.
const h = require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const { config } = require('../src/config');
const { setOnEnqueue } = require('../src/jobs/queue');
const { kick } = require('../src/jobs/kick');
const { goodSite } = require('./fixtures/sites');

let app; let site; let aiStub;
test.before(async () => {
  aiStub = await h.startAiStub();
  await h.resetDb();
  app = await h.startApp();
  site = await goodSite();
  setOnEnqueue(kick);
  config.cronSecret = 'test-cron-secret-0123456789';
});
test.after(async () => { setOnEnqueue(null); config.cronSecret = ''; await app.close(); await site.close(); aiStub.close(); await db.pool.end(); });

async function waitFor(fn, ms = 20000) {
  const end = Date.now() + ms;
  for (;;) { const v = await fn(); if (v) return v; if (Date.now() > end) throw new Error('timed out'); await new Promise(r => setTimeout(r, 200)); }
}

test('a free scan and its AI answer complete without a worker process', async () => {
  const c = h.client(app.base);
  const r = await c.post('/api/scans', { url: `${site.origin}/`, businessName: 'Summit Plumbing', city: 'Denver', region: 'CO', category: 'plumber' });
  assert.equal(r.status, 201);
  const v = await waitFor(async () => { const x = (await c.get(`/api/scans/${r.json.id}`)).json; return x.status === 'complete' && x.snapshot && x.snapshot.status !== 'pending' ? x : null; });
  assert.equal(v.snapshot.status, 'complete');
  assert.equal(v.snapshot.mentioned, true);
});

test('cron and self test routes require the secret', async () => {
  for (const path of ['/api/cron/tick', '/api/cron/cleanup', '/api/ops/selftest']) {
    const none = await fetch(app.base + path);
    assert.equal(none.status, 401, path);
    const wrong = await fetch(app.base + path, { headers: { authorization: 'Bearer test-cron-secret-0123456780' } });
    assert.equal(wrong.status, 401, path);
  }
  const ok = await fetch(app.base + '/api/cron/tick', { headers: { authorization: `Bearer ${config.cronSecret}` } });
  assert.equal(ok.status, 200);
});

test('self test asks each connected platform a real question and reports without secrets', async () => {
  const r = await fetch(app.base + '/api/ops/selftest', { headers: { authorization: `Bearer ${config.cronSecret}` } });
  const j = await r.json();
  assert.equal(j.database, 'ok');
  const byId = Object.fromEntries(j.platforms.map(p => [p.platform, p]));
  assert.equal(byId.openai.status, 'ok');
  assert.equal(byId.perplexity.status, 'ok');
  assert.equal(byId.anthropic.status, 'not_connected');
  assert.ok(byId.openai.searches > 0 && byId.openai.answerChars >= 20);
  assert.ok(!JSON.stringify(j).includes('test-openai'), 'no API key in output');
  h.stub().fail.openai = 401;
  const bad = await (await fetch(app.base + '/api/ops/selftest', { headers: { authorization: `Bearer ${config.cronSecret}` } })).json();
  h.stub().fail = {};
  assert.equal(bad.platforms.find(p => p.platform === 'openai').status, 'error');
  assert.equal(bad.ok, false);
});
