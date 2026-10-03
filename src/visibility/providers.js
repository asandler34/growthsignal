'use strict';
// Official API integrations for sampling AI answers with web search enabled.
// We never automate or scrape consumer apps (ChatGPT, Claude.ai, Gemini app, Perplexity.ai).
// API answers can differ from what a person sees in a consumer app: different system prompts,
// personalization, location, model versions and retrieval settings.
const { config } = require('../config');
const PRICES = require('./pricing');

function base(defaultBase, name) {
  return config.ai.baseUrlOverride ? `${config.ai.baseUrlOverride.replace(/\/$/, '')}/${name}` : defaultBase;
}

async function postJson(url, headers, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), config.ai.timeoutMs);
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: ctrl.signal });
  } catch (e) {
    const err = new Error(e.name === 'AbortError' ? 'Provider request timed out' : `Provider request failed: ${e.message}`);
    err.retryable = true;
    throw err;
  } finally { clearTimeout(timer); }
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || text.slice(0, 200);
    const err = new Error(`Provider returned HTTP ${res.status}: ${String(msg).slice(0, 200)}`);
    err.status = res.status;
    err.retryable = res.status === 429 || res.status >= 500;
    throw err;
  }
  return json;
}

const cents = (usd) => Math.round(usd * 100 * 10000) / 10000;

const providers = {
  openai: {
    id: 'openai',
    label: 'OpenAI API with web search',
    surface: 'OpenAI Responses API, web_search tool',
    configured: () => !!config.ai.openaiKey,
    model: () => config.ai.openaiModel,
    async ask({ prompt, location }) {
      const model = config.ai.openaiModel;
      const tool = { type: 'web_search' };
      if (location && (location.city || location.region)) tool.user_location = { type: 'approximate', country: location.country || 'US', city: location.city || undefined, region: location.region || undefined };
      const json = await postJson(`${base('https://api.openai.com/v1', 'openai')}/responses`, { authorization: `Bearer ${config.ai.openaiKey}` }, { model, input: prompt, tools: [tool], tool_choice: 'auto', store: false });
      let text = '';
      const citations = [];
      let searches = 0;
      for (const item of json.output || []) {
        if (item.type === 'web_search_call') searches++;
        if (item.type === 'message') {
          for (const c of item.content || []) {
            if (c.type === 'output_text') {
              text += c.text;
              for (const a of c.annotations || []) if (a.type === 'url_citation' && a.url) citations.push({ url: a.url, title: a.title || null });
            }
          }
        }
      }
      const p = PRICES.openai;
      const u = json.usage || {};
      const usd = (u.input_tokens || 0) * p.inputPerMTok / 1e6 + (u.output_tokens || 0) * p.outputPerMTok / 1e6 + searches * p.perSearch;
      return { model: json.model || model, text, citations, searches, costCents: cents(usd) };
    },
  },

  anthropic: {
    id: 'anthropic',
    label: 'Anthropic API with web search',
    surface: 'Anthropic Messages API, web_search tool',
    configured: () => !!config.ai.anthropicKey,
    model: () => config.ai.anthropicModel,
    async ask({ prompt, location }) {
      const model = config.ai.anthropicModel;
      const tool = { type: PRICES.anthropic.toolType, name: 'web_search', max_uses: 3 };
      if (location && (location.city || location.region)) tool.user_location = { type: 'approximate', country: location.country || 'US', city: location.city || undefined, region: location.region || undefined };
      const json = await postJson(`${base('https://api.anthropic.com/v1', 'anthropic')}/messages`, { 'x-api-key': config.ai.anthropicKey, 'anthropic-version': '2023-06-01' }, { model, max_tokens: 1200, messages: [{ role: 'user', content: prompt }], tools: [tool] });
      let text = '';
      const citations = [];
      const seen = new Set();
      for (const b of json.content || []) {
        if (b.type === 'text') {
          text += b.text;
          for (const c of b.citations || []) if (c.url && !seen.has(c.url)) { seen.add(c.url); citations.push({ url: c.url, title: c.title || null }); }
        }
        if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
          for (const r of b.content) if (r.url && !seen.has(r.url)) { seen.add(r.url); citations.push({ url: r.url, title: r.title || null, retrievedOnly: true }); }
        }
      }
      const u = json.usage || {};
      const searches = u.server_tool_use?.web_search_requests || 0;
      const p = PRICES.anthropic;
      const usd = (u.input_tokens || 0) * p.inputPerMTok / 1e6 + (u.output_tokens || 0) * p.outputPerMTok / 1e6 + searches * p.perSearch;
      return { model: json.model || model, text, citations, searches, costCents: cents(usd) };
    },
  },

  gemini: {
    id: 'gemini',
    label: 'Google Gemini API with Google Search grounding',
    surface: 'Gemini API generateContent, google_search tool',
    configured: () => !!config.ai.geminiKey,
    model: () => config.ai.geminiModel,
    async ask({ prompt }) {
      const model = config.ai.geminiModel;
      const json = await postJson(`${base('https://generativelanguage.googleapis.com/v1beta', 'gemini')}/models/${encodeURIComponent(model)}:generateContent`, { 'x-goog-api-key': config.ai.geminiKey }, { contents: [{ role: 'user', parts: [{ text: prompt }] }], tools: [{ google_search: {} }] });
      const cand = (json.candidates || [])[0] || {};
      const text = (cand.content?.parts || []).map(p => p.text || '').join('');
      const gm = cand.groundingMetadata || {};
      // Grounding chunk URIs are redirect links; the title carries the source domain.
      const citations = (gm.groundingChunks || []).filter(c => c.web).map(c => ({ url: c.web.uri, title: c.web.title || null, domain: c.web.title || null }));
      const searches = (gm.webSearchQueries || []).length ? 1 : 0;
      const u = json.usageMetadata || {};
      const p = PRICES.gemini;
      const usd = (u.promptTokenCount || 0) * p.inputPerMTok / 1e6 + ((u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0)) * p.outputPerMTok / 1e6 + searches * p.perSearch;
      return { model: json.modelVersion || model, text, citations, searches, costCents: cents(usd) };
    },
  },

  perplexity: {
    id: 'perplexity',
    label: 'Perplexity Sonar API',
    surface: 'Perplexity Sonar chat completions API',
    configured: () => !!config.ai.perplexityKey,
    model: () => config.ai.perplexityModel,
    async ask({ prompt, location }) {
      const model = config.ai.perplexityModel;
      const web_search_options = { search_context_size: 'low' };
      if (location && (location.city || location.region)) web_search_options.user_location = { country: location.country || 'US', city: location.city || undefined, region: location.region || undefined };
      const json = await postJson(`${base('https://api.perplexity.ai', 'perplexity')}/chat/completions`, { authorization: `Bearer ${config.ai.perplexityKey}` }, { model, messages: [{ role: 'user', content: prompt }], web_search_options });
      const text = json.choices?.[0]?.message?.content || '';
      const results = Array.isArray(json.search_results) && json.search_results.length ? json.search_results.map(r => ({ url: r.url, title: r.title || null })) : (json.citations || []).map(url => ({ url, title: null }));
      const u = json.usage || {};
      const p = PRICES.perplexity;
      const usd = typeof u.cost?.total_cost === 'number' ? u.cost.total_cost : (u.prompt_tokens || 0) * p.inputPerMTok / 1e6 + (u.completion_tokens || 0) * p.outputPerMTok / 1e6 + p.perRequestLow;
      return { model: json.model || model, text, citations: results, searches: 1, costCents: cents(usd) };
    },
  },
};

const ORDER = ['openai', 'perplexity', 'gemini', 'anthropic'];

function listProviders() {
  return ORDER.map(id => ({ id, label: providers[id].label, surface: providers[id].surface, configured: providers[id].configured(), model: providers[id].model() }));
}

module.exports = { providers, listProviders, ORDER };
