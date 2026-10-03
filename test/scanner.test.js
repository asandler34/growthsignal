'use strict';
require('./helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const { safeFetch, validateUrl, isPublicAddress } = require('../src/lib/safe-fetch');
const { parseRobots, isAllowed } = require('../src/scanner/robots');
const { buildReadinessReport } = require('../src/scanner/report');
const { goodSite, poorSite, hostileSite } = require('./fixtures/sites');

test('address classification blocks private, loopback, link local, metadata and mapped ranges', () => {
  for (const a of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fe80::1', 'fc00::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '224.0.0.1']) {
    assert.equal(isPublicAddress(a), false, a);
  }
  for (const a of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) assert.equal(isPublicAddress(a), true, a);
});

test('URL validation in production mode rejects schemes, credentials, ports and internal hosts', () => {
  const strict = { allowPrivateNetworks: false };
  const bad = ['ftp://example.com', 'file:///etc/passwd', 'http://user:pw@example.com', 'http://example.com:8080', 'http://localhost/', 'http://127.0.0.1/', 'http://2130706433/', 'http://[::1]/', 'http://169.254.169.254/latest/meta-data', 'http://printer.local/', 'http://intranet/', 'http://0x7f000001/'];
  for (const u of bad) assert.throws(() => validateUrl(u, strict), undefined, u);
  assert.ok(validateUrl('https://example.com/path', strict));
});

test('redirect to cloud metadata address is blocked after following a hop', async () => {
  const s = await hostileSite();
  try {
    // Loopback mode lets us reach the fixture but every redirect hop is re-validated: the second hop
    // to the cloud metadata address must be refused.
    await assert.rejects(safeFetch(`${s.origin}/`, { allowPrivateNetworks: 'loopback' }), /not a public website/);
    await assert.rejects(safeFetch(`${s.origin}/loop`, { allowPrivateNetworks: 'loopback' }), /Too many redirects/);
  } finally { await s.close(); }
});

test('oversized responses, decompression bombs and slow servers are bounded', async () => {
  const s = await hostileSite();
  try {
    const big = await safeFetch(`${s.origin}/huge`, { allowPrivateNetworks: true, maxBytes: 100000 });
    assert.equal(big.truncated, true);
    assert.ok(big.bytes <= 100000);
    const bomb = await safeFetch(`${s.origin}/bomb`, { allowPrivateNetworks: true, maxBytes: 200000 });
    assert.equal(bomb.truncated, true);
    assert.ok(bomb.bytes <= 200000);
    await assert.rejects(safeFetch(`${s.origin}/slow`, { allowPrivateNetworks: true, timeoutMs: 500 }), /Timed out/);
  } finally { await s.close(); }
});

test('robots.txt matching follows longest match and specific groups', () => {
  const r = parseRobots('User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow: /private\nAllow: /private/ok\n');
  assert.equal(isAllowed(r, 'GPTBot', '/').allowed, false);
  assert.equal(isAllowed(r, 'OAI-SearchBot', '/').allowed, true);
  assert.equal(isAllowed(r, 'OAI-SearchBot', '/private/x').allowed, false);
  assert.equal(isAllowed(r, 'OAI-SearchBot', '/private/ok').allowed, true);
  const w = parseRobots('User-agent: *\nDisallow: /*.pdf$\n');
  assert.equal(isAllowed(w, 'Bingbot', '/a.pdf').allowed, false);
  assert.equal(isAllowed(w, 'Bingbot', '/a.pdf?x').allowed, true);
});

test('real scan of a well built fixture site produces evidence backed passes', async () => {
  const s = await goodSite();
  try {
    const r = await buildReadinessReport(`${s.origin}/`, { businessName: 'Summit Plumbing' });
    assert.ok(r.score.total >= 85, `score ${r.score.total}`);
    const byId = Object.fromEntries(r.checks.map(c => [c.id, c]));
    assert.equal(byId.ai_search_crawlers.status, 'pass'); // GPTBot is blocked but is a training crawler
    assert.equal(r.crawlers.find(c => c.token === 'GPTBot').allowed, false);
    assert.equal(byId.phone.status, 'pass');
    assert.ok(byId.phone.evidence.some(e => e.detail.includes('(303) 555-0142')));
    assert.equal(byId.jsonld_business.status, 'pass');
    assert.ok(r.coverage.pagesRead.length >= 4);
    for (const c of r.checks) { assert.ok(c.why && c.fix, c.id); assert.ok(c.points <= c.maxPoints); }
    assert.ok(r.limitations.some(l => /does not show whether AI assistants/.test(l)));
  } finally { await s.close(); }
});

test('real scan of a poor fixture site finds blocking issues with specific evidence', async () => {
  const s = await poorSite();
  try {
    const r = await buildReadinessReport(`${s.origin}/`, {});
    const byId = Object.fromEntries(r.checks.map(c => [c.id, c]));
    assert.ok(r.score.total < 40);
    assert.equal(byId.noindex.status, 'fail');
    assert.match(byId.ai_search_crawlers.found, /OAI-SearchBot/);
    assert.match(byId.ai_search_crawlers.found, /PerplexityBot/);
    assert.equal(byId.readable_without_js.status, 'fail');
    assert.equal(byId.jsonld_valid.status, 'fail');
    assert.equal(r.priorities[0].severity, 'high');
  } finally { await s.close(); }
});

test('malicious page content is treated as data', async () => {
  const s = await hostileSite();
  try {
    const r = await buildReadinessReport(`${s.origin}/injection`, {});
    const titleCheck = r.checks.find(c => c.id === 'title_meta');
    assert.match(titleCheck.evidence[0].detail, /Ignore all previous instructions/); // reported verbatim as evidence text
    const h1 = r.checks.find(c => c.id === 'h1');
    assert.doesNotMatch(h1.found, /<script>/); // script elements are stripped before text extraction
  } finally { await s.close(); }
});

test('unreachable site produces a clear user facing error', async () => {
  await assert.rejects(buildReadinessReport('http://127.0.0.1:1/', {}), err => err.userFacing && /refused|Could not load/.test(err.message));
});
