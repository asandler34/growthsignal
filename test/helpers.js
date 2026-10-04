'use strict';
// Test environment. Must be required before any src module so config picks up these values.
const http = require('http');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres@localhost:5432/growthsignal_test';
process.env.SCANNER_ALLOW_PRIVATE = 'loopback';
process.env.SCANNER_TIMEOUT_MS = '1500';
process.env.SCANNER_MAX_BYTES = String(512 * 1024);
process.env.EMAIL_PROVIDER = 'console';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_for_tests';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
process.env.STRIPE_PRICE_CHECK_MONTHLY = 'price_check_m';
process.env.STRIPE_PRICE_IMPROVE_MONTHLY = 'price_improve_m';
process.env.STRIPE_PRICE_GROW_MONTHLY = 'price_grow_m';
process.env.STRIPE_PRICE_GROW_ANNUAL = 'price_grow_y';
process.env.OPENAI_API_KEY = 'test-openai';
process.env.PERPLEXITY_API_KEY = 'test-pplx';
process.env.GEMINI_API_KEY = 'test-gemini';
delete process.env.ANTHROPIC_API_KEY; // deliberately unconnected, to test "unavailable" handling
process.env.ANTHROPIC_API_KEY = '';
process.env.AI_TIMEOUT_MS = '3000';

let stubState = { fail: {} };

// Test stub that mimics the documented response shapes of each provider API. Used only in tests.
function startAiStub() {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      const j = JSON.parse(body || '{}');
      const send = (status, obj) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
      const provider = req.url.split('/')[1];
      if (stubState.fail[provider]) return send(stubState.fail[provider], { error: { message: 'stub failure' } });
      const prompt = j.input || (j.messages && j.messages[0].content) || (j.contents && j.contents[0].parts[0].text) || '';
      const mention = /plumb/i.test(prompt) ? 'Summit Plumbing (summit.example) and Mile High Drains are well reviewed. Call (303) 555-0199.' : 'Several companies serve this area.';
      if (provider === 'openai') return send(200, { model: 'gpt-stub', output: [{ type: 'web_search_call', status: 'completed' }, { type: 'message', content: [{ type: 'output_text', text: mention, annotations: [{ type: 'url_citation', url: 'https://www.yelp.com/biz/summit', title: 'Yelp' }, { type: 'url_citation', url: 'https://summit.example/services', title: 'Summit' }] }] }], usage: { input_tokens: 1000, output_tokens: 300 } });
      if (provider === 'perplexity') return send(200, { model: 'perplexity/sonar', output: [{ type: 'search_results', results: [{ id: 1, url: 'https://www.angi.com/x', title: 'Angi' }, { id: 2, url: 'https://summit.example/', title: 'Summit' }] }, { type: 'message', content: [{ type: 'output_text', text: 'Mile High Drains is a popular choice [1].' }] }], usage: { input_tokens: 50, output_tokens: 80 } });
      if (provider === 'anthropic') return send(200, { model: 'claude-stub', content: [{ type: 'server_tool_use', name: 'web_search' }, { type: 'web_search_tool_result', content: [{ type: 'web_search_result', url: 'https://www.bbb.org/x', title: 'BBB' }] }, { type: 'text', text: mention, citations: [{ type: 'web_search_result_location', url: 'https://summit.example/', title: 'Summit' }] }], usage: { input_tokens: 900, output_tokens: 200, server_tool_use: { web_search_requests: 1 } } });
      if (provider === 'gemini') return send(200, { modelVersion: 'gemini-stub', candidates: [{ content: { parts: [{ text: mention }] }, groundingMetadata: { webSearchQueries: ['q'], groundingChunks: [{ web: { uri: 'https://vertexaisearch.cloud.google.com/redirect/abc', title: 'summit.example' } }] } }], usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 50 } });
      send(404, { error: { message: 'unknown' } });
    });
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => { process.env.AI_BASE_URL_OVERRIDE = `http://127.0.0.1:${server.address().port}`; require('../src/config').config.ai.baseUrlOverride = process.env.AI_BASE_URL_OVERRIDE; r(server); }));
}

async function resetDb() {
  const db = require('../src/db');
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await require('../src/db/migrate').migrate({ log: () => {} });
}

async function startApp() {
  const { createApp } = require('../src/server');
  const app = createApp();
  const server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base, close: () => new Promise(r => server.close(r)) };
}

// Minimal cookie aware client.
function client(base) {
  let cookie = '';
  async function call(method, path, body, extraHeaders = {}) {
    const headers = { origin: base, ...extraHeaders };
    if (cookie) headers.cookie = cookie;
    let payload;
    if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(base + path, { method, headers, body: payload, redirect: 'manual' });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text, headers: res.headers };
  }
  return {
    get: p => call('GET', p), post: (p, b, h) => call('POST', p, b ?? {}, h), put: (p, b) => call('PUT', p, b), patch: (p, b) => call('PATCH', p, b), del: p => call('DELETE', p),
    form: async (p, fields) => {
      const res = await fetch(base + p, { method: 'POST', headers: { origin: base, 'content-type': 'application/x-www-form-urlencoded', ...(cookie ? { cookie } : {}) }, body: new URLSearchParams(fields).toString(), redirect: 'manual' });
      const set = res.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0];
      return { status: res.status, location: res.headers.get('location') };
    },
    get cookie() { return cookie; },
  };
}

// Signs in through the real magic link flow using the console email outbox.
async function signIn(c, email, extra = {}) {
  const { outbox } = require('../src/lib/email');
  const before = outbox.length;
  const r = await c.post('/api/auth/request', { email, ...extra });
  if (r.status !== 200) throw new Error(`login request failed ${r.status} ${r.text}`);
  const msg = outbox.slice(before).find(m => m.to === email);
  const token = /token=([A-Za-z0-9_-]+)/.exec(msg.text)[1];
  return c.form('/auth/verify', { token });
}

async function drain() {
  const { Worker } = require('../src/jobs/queue');
  const handlers = require('../src/jobs/handlers');
  await new Worker(handlers).drain({ timeoutMs: 60000 });
}

async function setPlan(userId, plan, status = 'active') {
  const db = require('../src/db');
  await db.query(`INSERT INTO subscriptions (stripe_subscription_id, user_id, plan, status) VALUES ($1,$2,$3,$4) ON CONFLICT (stripe_subscription_id) DO UPDATE SET plan = $3, status = $4`, [`sub_test_${userId}`, userId, plan, status]);
}

module.exports = { startAiStub, resetDb, startApp, client, signIn, drain, setPlan, stub: () => stubState };
