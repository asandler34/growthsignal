'use strict';
// Provider unit prices in USD used for cost accounting and the daily budget guard.
// Checked 2026-10-03 against provider pricing pages; sources in docs/strategy/04-pricing-unit-economics.md.
// Where provider pages disagreed we use the higher reading, so the budget guard errs on the safe side.
module.exports = {
  // gpt-6-luna; web_search $10 per 1k calls.
  openai: { inputPerMTok: 0.10, outputPerMTok: 0.50, perSearch: 0.01 },
  // claude-haiku-4-5; web search $10 per 1k searches, failed searches not billed.
  anthropic: { inputPerMTok: 1.0, outputPerMTok: 5.0, perSearch: 0.01, toolType: 'web_search_20250305' },
  // Disabled by default (D-023). Gemini 3.x grounding: $14 per 1k search queries after the free allowance.
  gemini: { inputPerMTok: 0.30, outputPerMTok: 2.50, perSearch: 0.014 },
  // perplexity/sonar on the Agent API; web_search $2.50 per 1k calls.
  perplexity: { inputPerMTok: 0.25, outputPerMTok: 2.50, perSearch: 0.0025 },
};
