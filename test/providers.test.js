'use strict';
const h = require('./helpers');
const test = require('node:test');
const assert = require('node:assert');
const { config } = require('../src/config');
const { providers, listProviders, activeOrder } = require('../src/visibility/providers');

let stub;
test.before(async () => { stub = await h.startAiStub(); });
test.after(() => stub.close());

test('Gemini is excluded unless explicitly enabled', () => {
  assert.equal(config.ai.geminiEnabled, false);
  assert.deepEqual(activeOrder(), ['openai', 'perplexity', 'anthropic']);
  assert.ok(!listProviders().some(p => p.id === 'gemini'));
  config.ai.geminiEnabled = true;
  try { assert.deepEqual(activeOrder(), ['openai', 'perplexity', 'anthropic', 'gemini']); } finally { config.ai.geminiEnabled = false; }
});

test('Perplexity Agent API response is parsed into text, sources and cost', async () => {
  const r = await providers.perplexity.ask({ prompt: 'best plumber in Denver', location: { city: 'Denver', region: 'CO' } });
  assert.match(r.text, /Mile High Drains/);
  assert.deepEqual(r.citations.map(c => [c.url, !!c.retrievedOnly]), [['https://www.angi.com/x', false], ['https://summit.example/', true]]);
  assert.equal(require('../src/visibility/detect').detectCitation(r.citations, 'summit.example').cited, false, 'retrieved but uncited sources are not citations');
  assert.equal(r.searches, 1);
  assert.ok(r.costCents > 0);
});

test('Anthropic web search response is parsed, with search count from usage', async () => {
  const saved = config.ai.anthropicKey;
  config.ai.anthropicKey = 'test-anthropic';
  try {
    const r = await providers.anthropic.ask({ prompt: 'best plumber in Denver', location: { city: 'Denver' } });
    assert.match(r.text, /Summit Plumbing/);
    assert.ok(r.citations.some(c => c.url === 'https://summit.example/' && !c.retrievedOnly));
    assert.ok(r.citations.some(c => c.url === 'https://www.bbb.org/x' && c.retrievedOnly));
    assert.equal(r.searches, 1);
    assert.ok(r.costCents > 0);
  } finally { config.ai.anthropicKey = saved; }
});
