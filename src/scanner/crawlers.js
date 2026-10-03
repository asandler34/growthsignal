'use strict';
// Crawler product tokens we evaluate in robots.txt, and what each one controls.
// "search": used to find and cite pages in AI answers or search results. Blocking it can reduce visibility.
// "training": controls use of content for model training. Blocking it is a business choice and is
//             not counted against the readiness score.
// "user": fetches made when a person asks an assistant to open a page.
// Purposes per each operator's crawler documentation, checked 2026-10-03 (links in docs/strategy/04-pricing-unit-economics.md).
// User triggered agents may not follow robots.txt (OpenAI and Perplexity say so); we report them but do not score them.
module.exports = [
  { token: 'Googlebot', operator: 'Google', purpose: 'search', note: 'Google Search, including AI Overviews and AI Mode' },
  { token: 'Bingbot', operator: 'Microsoft', purpose: 'search', note: 'Bing search, which also grounds Microsoft Copilot answers' },
  { token: 'OAI-SearchBot', operator: 'OpenAI', purpose: 'search', note: 'Surfaces sites in ChatGPT search results' },
  { token: 'Claude-SearchBot', operator: 'Anthropic', purpose: 'search', note: 'Improves search result quality for Claude' },
  { token: 'PerplexityBot', operator: 'Perplexity', purpose: 'search', note: 'Surfaces and links sites in Perplexity answers' },
  { token: 'Applebot', operator: 'Apple', purpose: 'search', note: 'Siri, Spotlight and Safari suggestions' },
  { token: 'ChatGPT-User', operator: 'OpenAI', purpose: 'user', note: 'Visits pages when a ChatGPT user asks for them' },
  { token: 'Claude-User', operator: 'Anthropic', purpose: 'user', note: 'Visits pages when a Claude user asks for them' },
  { token: 'Perplexity-User', operator: 'Perplexity', purpose: 'user', note: 'Visits pages when a Perplexity user asks for them' },
  { token: 'GPTBot', operator: 'OpenAI', purpose: 'training', note: 'Collects content that may be used to train OpenAI models' },
  { token: 'ClaudeBot', operator: 'Anthropic', purpose: 'training', note: 'Collects content that may be used to train Anthropic models' },
  { token: 'Google-Extended', operator: 'Google', purpose: 'training', note: 'Controls use of content for Gemini training and grounding; does not affect Google Search' },
  { token: 'Applebot-Extended', operator: 'Apple', purpose: 'training', note: 'Controls use of content for Apple model training' },
  { token: 'CCBot', operator: 'Common Crawl', purpose: 'training', note: 'Open web archive widely used in AI training datasets' },
];
