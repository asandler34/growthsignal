'use strict';
// Provider unit prices in USD used for cost accounting and the daily budget guard.
// Source pages and check dates are recorded in docs/unit-economics.md. Update both together.
module.exports = {
  openai: { inputPerMTok: 0.25, outputPerMTok: 2.0, perSearch: 0.01 },
  anthropic: { inputPerMTok: 1.0, outputPerMTok: 5.0, perSearch: 0.01, toolType: 'web_search_20250305' },
  gemini: { inputPerMTok: 0.3, outputPerMTok: 2.5, perSearch: 0.035 },
  perplexity: { inputPerMTok: 1.0, outputPerMTok: 1.0, perRequestLow: 0.005 },
};
