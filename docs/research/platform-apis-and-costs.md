# GrowthSignal.ai: AI Platform APIs, Crawlers, ToS and Operating Costs

Date checked: **2026-10-03** (all URLs below were fetched on this date). Anything not confirmed by an official page fetched today is marked **unknown**.

Method note: pages were read with a fetch tool that summarizes page content, so a few readings came back inconsistent. Where two readings of the same page disagreed, both are shown and flagged **CONFLICT**. Check those numbers by hand in a browser before using them in pricing.

---

## 1. OpenAI: Responses API web search

Sources: https://developers.openai.com/api/docs/guides/tools-web-search (redirected from platform.openai.com/docs/guides/tools-web-search), https://developers.openai.com/api/docs/pricing, https://openai.com/api/pricing/, https://developers.openai.com/api/docs/models, https://developers.openai.com/api/docs/models/gpt-6-luna

**Tool type names**
- `web_search`: the recommended type for new integrations
- `web_search_preview`: legacy, kept for backward compatibility
- `gpt-5-search-api`: a search model for **Chat Completions** (not a tool)
- Domain filtering works only on the Responses API `web_search` tool.

**Models.** The guide names `gpt-6-astra`, `gpt-5.5` (with reasoning for agentic search) and `gpt-5-search-api`. The model page for `gpt-6-luna` lists "Web search: Supported" on the Responses API. The models index lists the current flagship trio as `gpt-6-astra`, `gpt-6.1-sol` and `gpt-6-luna`. Deep research models do not support `user_location`.

**Parameters (Responses API)**
```json
{
  "model": "gpt-6-luna",
  "tools": [{
    "type": "web_search",
    "user_location": {
      "type": "approximate",
      "country": "US",
      "city": "Minneapolis",
      "region": "Minnesota",
      "timezone": "America/Chicago"
    },
    "search_context_size": "medium",
    "filters": { "allowed_domains": ["example.com"] }
  }],
  "input": "best plumber in Minneapolis"
}
```
- `user_location.type` = `"approximate"`. `country` is a 2-letter ISO code. `city` and `region` are free text. `timezone` is an IANA name.
- `search_context_size`: `low` | `medium` (default) | `high`.
- `filters.allowed_domains` / `blocked_domains` allow up to 100 entries each, written without the scheme (`openai.com`, not `https://openai.com`).
- `sources` lists every URL the model consulted. That list is longer than the set of URLs it cites. This matters for us because a business can be consulted without being cited.

**Citation shape** (in `output_text` annotations):
```json
{ "type": "url_citation", "start_index": 2606, "end_index": 2758, "url": "https://...", "title": "Title..." }
```
OpenAI requires citations to be "clearly visible and clickable" in any user interface.

**API vs the ChatGPT consumer product.** OpenAI's launch post (March 2025) says "Web search in the API is powered by the same model used for ChatGPT search" (https://openai.com/index/new-tools-for-building-agents/). No official doc says API results match what a ChatGPT user sees. ChatGPT also adds memory, personalization, model routing and its own UI. Several developer-forum threads report that results differ (community posts only, not official: https://community.openai.com/t/chatgpts-api-returns-worse-web-search-results-than-its-web-ui-and-it-cant-explain-to-me-why/1234542). **Product implication:** present results as "API-sampled answers," not "what ChatGPT shows."

**Pricing**
| Item | Price | Source |
|---|---|---|
| Web search, all models (`web_search`) | $10.00 / 1k calls + search content tokens billed at model rates | developers.openai.com/api/docs/pricing |
| Web search preview, reasoning models | $10.00 / 1k calls + content tokens at model rates | same |
| Web search preview, non-reasoning | $25.00 / 1k calls; content tokens free | same |
| openai.com/api/pricing headline | "$10.00 / 1k calls", with search content tokens "at no charge" | **CONFLICT** with the developer pricing page on content-token billing |
| `gpt-6-luna` (cheapest suitable), Standard | $0.10 in / $0.01 cached / $0.50 out per 1M | model page; one read of the pricing page agreed. **CONFLICT:** another read of the pricing page returned $0.05 / $0.005 / $0.25 |
| `gpt-6-luna`, long context | $0.20 / $0.02 / $0.75 (one read) or $0.10 / $0.01 / $0.375 (another read) | **CONFLICT** |
| `gpt-6.1-sol` | $2.00 / $0.10 / $10.00 | pricing page |
| `gpt-6-astra` | $10.00 / $1.00 / $50.00 | pricing page |
| openai.com/api/pricing marketing page | names "GPT-5.6 Luna" at $0.20 / $0.02 / $1.20 and "GPT-5.6 Sol" at $5 / $0.50 / $30 | appears stale or inconsistent with the developer docs |

Context window for `gpt-6-luna`: 1,050,000 tokens, with 128,000 max output (model page). The long-context threshold is **unknown**.

---

## 2. Anthropic: Messages API web search

Sources: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool, https://platform.claude.com/docs/en/about-claude/pricing, https://platform.claude.com/docs/en/about-claude/models/overview

**Tool version strings**
- `web_search_20250305`: basic web search
- `web_search_20260209`: adds dynamic filtering
- `web_search_20260318`: adds response-inclusion control

Dynamic filtering needs Claude 4.6+ models. Haiku 4.5 should therefore use `web_search_20250305`. Google Cloud and Azure Foundry offer only `web_search_20250305`.

```json
{
  "type": "web_search_20250305",
  "name": "web_search",
  "max_uses": 5,
  "allowed_domains": ["example.com"],
  "user_location": {
    "type": "approximate", "city": "San Francisco", "region": "California",
    "country": "US", "timezone": "America/Los_Angeles"
  }
}
```
- Use `allowed_domains` **or** `blocked_domains`, not both.
- `country` is ISO 3166-1 alpha-2. `timezone` is an IANA name.

**Response blocks**
```json
{ "type": "server_tool_use", "id": "srvtoolu_...", "name": "web_search", "input": { "query": "..." } }
{ "type": "web_search_tool_result", "tool_use_id": "srvtoolu_...",
  "content": [{ "type": "web_search_result", "url": "...", "title": "...", "encrypted_content": "...", "page_age": "April 30, 2025" }] }
```
**Citation** (on text blocks):
```json
{ "type": "web_search_result_location", "url": "...", "title": "...", "encrypted_index": "...", "cited_text": "...(≤150 chars)" }
```
Usage reporting: `usage.server_tool_use.web_search_requests`.

**Pricing**
| Item | Price | Source |
|---|---|---|
| Web search | $10 per 1,000 searches, plus tokens for search content. Errors are not billed. | pricing + tool page |
| Web fetch tool | No extra fee; tokens only | pricing page |
| Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) | $1 in / $5 out per MTok; cache hit $0.10; 5-minute cache write $1.25 | pricing page |
| Claude Haiku 3.5 | $0.80 / $4 (still on the pricing page, absent from the models overview, so likely legacy) | pricing page |
| Claude Sonnet 5.5 (`claude-sonnet-5-5`) | $2 / $10 | pricing page |

---

## 3. Google Gemini API: Grounding with Google Search

Sources: https://ai.google.dev/gemini-api/docs/google-search (Interactions API format), https://ai.google.dev/gemini-api/docs/generate-content/google-search (generateContent format), https://ai.google.dev/gemini-api/docs/pricing, https://ai.google.dev/gemini-api/terms

**Tool name.** `google_search` is current: `"tools": [{"google_search": {}}]`. `google_search_retrieval` is legacy and works only on older models.

**Supported models.** Gemini 3.8 Flash, 3.7 Flash, 3.6 Flash, 3.5 Flash-Lite, 3.5 Flash, 3.1 Pro Preview, 3 Flash Preview, 2.5 Pro, 2.5 Flash, 2.5 Flash-Lite and 2.0 Flash, among others.

**generateContent response, `groundingMetadata`**
- `webSearchQueries`: the queries the model ran
- `searchEntryPoint.renderedContent`: HTML and CSS for the **required** Search Suggestions
- `groundingChunks[].web.uri` and `.title`: each `uri` is a **`https://vertexaisearch.cloud.google.com/...` redirect**, not the destination URL. The title is usually the domain.
- `groundingSupports[]`: `segment.startIndex`, `segment.endIndex`, `segment.text`, `groundingChunkIndices`

**Interactions API format.** Steps of type `google_search_call` (`queries`), `google_search_result` (`search_suggestions` HTML) and `model_output`, with annotations of the form `{"type":"url_citation","url":...,"title":"aljazeera.com","start_index":..,"end_index":..}`.

**Billing unit.** Gemini 3.x models bill **per search query executed**. Several queries in one call each count, and empty queries do not. Gemini 2.5 and older bill **per prompt**.

**Pricing (paid tier)**
| Model | Input / Output per 1M | Grounding | Free tier grounding |
|---|---|---|---|
| Gemini 3.1 Flash-Lite | $0.25 / $1.50 | 5,000 free search requests/month (shared across Gemini 3.x), then **$14 / 1,000** | Not available |
| Gemini 3.5 Flash-Lite | $0.30 / $2.50 | same | Not available |
| Gemini 3.8 Flash | $0.75 / $3.75 through 2026-12-31, then $1.50 / $7.50 from 2027-01-01 | same | per page |
| Gemini 3.5 Flash | $1.50 / $9.00 | same | Not available |
| Gemini 2.5 Flash / Flash-Lite | **unknown**: not on today's pricing page | per-prompt billing | unknown |

Content sent on the free tier is used to improve Google's products.

**Terms restricting display and storage** (Gemini API Additional Terms, "Grounding with Google Search": https://ai.google.dev/gemini-api/terms#grounding-with-google-search):
- "You will only display the Grounded Results with the associated Search Suggestion(s) to the end user who submitted the prompt."
- You may not "cache, frame, syndicate, resell, **analyze**, train on, or otherwise learn from Grounded Results or Search Suggestions."
- You may not "modify, or intersperse any other content with" them.
- You may not use "programmatic or automated means to collect Links, using Links to build an index…"
- Storage is allowed for up to 2 years only in limited cases: evaluating display, chat history, or temporary resubmission.

**RISK FOR GROWTHSIGNAL.** Running mention and citation analysis on grounded results across many businesses, and showing the output to someone other than the prompting end user, appears to conflict with these terms. Get legal review before including Gemini grounding, or leave it out of v1.

---

## 4. Perplexity: Sonar and the Agent API

Sources: https://docs.perplexity.ai/docs/agent-api/migrate-from-sonar/overview, https://docs.perplexity.ai/docs/getting-started/pricing, https://docs.perplexity.ai/getting-started/pricing, https://docs.perplexity.ai/docs/agent-api/tools/web-search, https://docs.perplexity.ai/docs/agent-api/models, https://docs.perplexity.ai/docs/agent-api/presets, https://docs.perplexity.ai/docs/resources/changelog

**Major change.** "Sonar Chat Completions support ended on September 27, 2026. Synchronous and streaming requests keep working: they are being reformulated as Agent API requests, rolling out gradually by model." **New builds should use the Agent API** at `POST https://api.perplexity.ai/v1/agent`.

**Agent API web search tool**
```json
{
  "model": "perplexity/sonar",
  "input": "best plumber near me",
  "tools": [{
    "type": "web_search",
    "search_type": "web",
    "search_context_size": "medium",
    "max_results": 10,
    "filters": {
      "search_domain_filter": ["example.com"],
      "search_recency_filter": "month",
      "user_location": { "country": "US", "region": "MN", "city": "Minneapolis", "latitude": 44.98, "longitude": -93.27 }
    }
  }]
}
```
- `search_type`: `web` | `fast`
- `search_context_size`: `low` | `medium` | `high`
- `max_results`: 1–50
- `max_tokens` / `max_tokens_per_page` set explicit context budgets
- `search_domain_filter` accepts up to 20 entries, as an allowlist or denylist
- Recency filters: `search_after_date_filter` / `search_before_date_filter` and the `last_updated_*` variants (MM/DD/YYYY)
- `user_location`: country (ISO 3166-1), region, city, latitude, longitude

The fetched docs list `user_location` under the `filters` object; the exact nesting should be confirmed against the live page.

**Response.** `output[]` holds typed items: `{"type":"search_results","results":[{"id":1,"url":"...","title":"...","snippet":"...","date":"YYYY-MM-DD","last_updated":"YYYY-MM-DD","source":"web"}]}` and `{"type":"message","content":[{"type":"output_text","text":"... [1][2]"}]}`. Inline `[n]` markers refer to result `id`s. The legacy Sonar format had a flat `citations` array of URLs plus a `search_results` array.

**Presets** (fast / low / medium / high / xhigh):
- fast: `openai/gpt-6-luna`, 1 web_search, 1 step
- low and medium: `openai/gpt-6-luna` with web_search and fetch_url
- high: `openai/gpt-6-sol`
- xhigh: `anthropic/claude-opus-5-5`

Per-request preset cost is **unknown**; the docs give only median token and tool counts.

**Pricing**
| Item | Price | Source |
|---|---|---|
| Agent API `web_search`, standard | $2.50 / 1,000 calls ($0.0025 each) | web-search tool page; pricing page |
| Agent API `web_search`, fast | $1.00 / 1,000 | same; changelog Sept 2026 |
| `fetch_url` | $0.0005 / call | pricing page |
| `perplexity/sonar` model on the Agent API | $0.25 in / $2.50 out per 1M; cache $0.0625 | agent-api/models |
| Legacy Sonar (chat completions) | $1 / $1 per 1M + request fee $5 / $8 / $12 per 1k (low / medium / high context) | getting-started/pricing |
| Legacy Sonar Pro | $3 / $15 + $6 / $10 / $14 per 1k | same |
| Legacy Sonar Reasoning Pro | $2 / $8 + $6 / $10 / $14 per 1k | same |
| Search API | $5 / 1k standard; $1 / 1k fast | same |

Changelog: older OpenAI models on Perplexity (GPT-5.4, 5.2, 5.1, 5 and their mini variants) retire on **2026-10-24**.

---

## 5. Terms of service: automated use of consumer interfaces

| Provider | Clause (verbatim) | Source |
|---|---|---|
| OpenAI | Under "Using our Services" > "What you cannot do": "Automatically or programmatically extract data or Output." (effective Jan 1, 2026) | https://openai.com/policies/row-terms-of-use/ |
| Anthropic | Consumer Terms §3 "Use of our Services": you may not, "Except when you are accessing our Services via an Anthropic API Key or where we otherwise explicitly permit it, … access the Services through automated or non-human means, whether through a bot, script, or otherwise." (effective Oct 8, 2025) | https://www.anthropic.com/legal/consumer-terms |
| Perplexity | §5.2(i) "Restrictions On Your Use of the Services": no "robot, spider, crawlers, scraper, or other automatic device, process, software or queries that intercepts, 'mines,' scrapes, extracts, or otherwise accesses the Services to monitor, extract, copy or collect information or data from or through the Services, or engage in any manual process to do the same" (effective Jan 23, 2026). **Note:** this clause also bars *manual* processes used to monitor or collect data. | https://www.perplexity.ai/hub/legal/terms-of-service |
| Google (covers Gemini app) | Under "Don't abuse our services": "using automated means to access content from any of our services in violation of the machine-readable instructions on our web pages (for example, robots.txt files that disallow crawling, training, or other activities)" (effective Jul 30, 2026). The Generative AI Prohibited Use Policy (Dec 17, 2024) has no explicit scraping clause; it covers "Circumvention of abuse protections." | https://policies.google.com/terms; https://policies.google.com/terms/generative-ai/use-policy |

**Conclusion.** All four sets of terms prohibit, or effectively prohibit, automated scraping of the consumer apps. The official-API-only approach is required.

---

## 6. AI crawler user agents

| Agent | Operator | Purpose | Respects robots.txt? | Effect of blocking | Doc URL |
|---|---|---|---|---|---|
| **OAI-SearchBot** | OpenAI | Surfaces sites in ChatGPT search results | Yes | Site will not appear in ChatGPT search answers, though it may still show as a navigational link. **Affects search visibility.** | https://developers.openai.com/api/docs/bots |
| **GPTBot** | OpenAI | Crawls content that may be used to train foundation models | Yes | Training only | same |
| **ChatGPT-User** | OpenAI | User-initiated actions in ChatGPT and Custom GPTs | **No**; user-triggered fetches may not follow robots.txt | Not used for automatic crawling or search ranking | same |
| OAI-AdsBot | OpenAI | Checks the safety of ad landing pages | N/A | Ads only | same |
| **ClaudeBot** | Anthropic | Collects web content for model training | Yes, including `Crawl-delay` | Training only | https://support.claude.com/en/articles/8896518-does-anthropic-crawl-the-web-and-how-can-site-owners-block-the-crawler |
| **Claude-SearchBot** | Anthropic | Indexes content to improve search quality | Yes, including `Crawl-delay` | "may reduce your site's visibility." **Affects search.** | same |
| **Claude-User** | Anthropic | Fetches pages for a user's question | **Yes** (Anthropic says it honors robots.txt) | Blocks retrieval for user queries and "may reduce your site's visibility for user-directed web search." **Affects answers.** | same |
| **PerplexityBot** | Perplexity | Surfaces and links sites in Perplexity search; not used for training | Yes | **Affects search visibility** | https://docs.perplexity.ai/guides/bots |
| **Perplexity-User** | Perplexity | User-initiated fetches | **Generally ignores** robots.txt | Not used for crawling or training | same |
| **Googlebot** | Google | Google Search, including all Search features | Yes | Blocking removes the site from Search. AI Overviews and AI Mode draw on the Search index, but no fetched doc confirmed that link explicitly. | https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers |
| **Google-Extended** | Google | A robots.txt token, not a separate crawler. Controls use of content for Gemini **training** and for **grounding** (Search-index content given to the model at prompt time). | Yes (token) | "does not impact a site's inclusion in Google Search nor is it used as a ranking signal in Google Search." Note that it does cover Gemini grounding. | same |
| **Applebot** | Apple | Spotlight, Siri and Safari search; data may also train Apple foundation models | Yes | Affects Apple search features | https://support.apple.com/en-us/119829 |
| **Applebot-Extended** | Apple | Opt-out token for training Apple foundation models; "does not crawl webpages" | Yes (token) | Training only: "Webpages that disallow Applebot-Extended can still be included in search results." | same |
| **CCBot** (`CCBot/2.0 (https://commoncrawl.org/faq/)`) | Common Crawl | Open web crawl dataset, widely used for AI training | Yes | Training and dataset use only. Spoofed CCBot agents exist; verify with https://index.commoncrawl.org/ccbot.json | https://commoncrawl.org/ccbot |
| **Bingbot** | Microsoft | Bing index, which Copilot answers draw on | Yes (per Bing Webmaster Guidelines) | Blocking Bingbot removes the site from Bing and therefore from Copilot grounding. Bing has **no separate AI training crawler**. Controls are page-level meta tags: `NOCACHE` lets the page appear in Bing Chat/Copilot answers but shows only URL, title and snippet. `NOARCHIVE` keeps the page out of Bing Chat answers and out of generative-AI training. | https://blogs.bing.com/webmaster/september-2023/Announcing-new-options-for-webmasters-to-control-usage-of-their-content-in-Bing-Chat (the Bing crawler help page is JS-rendered and could not be read: https://www.bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0) |

**Owner guidance**
- Blocking **GPTBot, ClaudeBot, Google-Extended, Applebot-Extended or CCBot** mainly affects training. Google-Extended also affects Gemini grounding.
- Blocking **OAI-SearchBot, Claude-SearchBot, Claude-User, PerplexityBot, Googlebot, Bingbot or Applebot** reduces visibility in AI search and answers.

IP verification lists:
- https://openai.com/searchbot.json
- https://openai.com/gptbot.json
- https://openai.com/chatgpt-user.json
- https://www.perplexity.com/perplexitybot.json
- https://www.perplexity.com/perplexity-user.json

---

## 7. llms.txt

- **Origin.** Proposed by Jeremy Howard (Answer.AI) on 2024-09-03, with the spec at llmstxt.org. This comes from a secondary source (https://www.greengeeks.com/blog/what-is-llms-txt-does-it-work-and-how-to-add-one-to-your-site/). llmstxt.org and answer.ai could not be fetched today because of tool permissions.
- **Provider use.** No major AI provider has officially stated that its crawler or answer engine uses llms.txt.
  - Google Search staff (John Mueller) compared it to the keywords meta tag. Google's AI search optimization guidance reportedly says to skip llms.txt (Search Engine Journal: https://www.searchenginejournal.com/googles-llms-txt-guidance-depends-on-which-product-you-ask/575431/).
  - Chrome Lighthouse 13.3 (May 2026) added an *experimental* llms.txt audit aimed at browser AI agents (same source).
  - Anthropic publishes llms.txt files for its own docs but has not said Claude or ClaudeBot reads them (GreenGeeks, secondary).
- **Recommendation.** Treat llms.txt as a low-cost, optional check. Do **not** score it as a ranking or visibility factor.

---

## 8. Operating costs

| Service | Unit | Price | Source | Checked |
|---|---|---|---|---|
| Stripe US cards | per successful domestic charge | 2.9% + 30¢ | https://stripe.com/pricing | 2026-10-03 |
| Stripe international cards | surcharge | +1.5% | same | 2026-10-03 |
| Stripe currency conversion | surcharge | +1% | same | 2026-10-03 |
| Stripe Billing, pay-as-you-go | % of Billing volume | 0.7% (0.4% for one-time invoices, per the support article) | https://stripe.com/billing/pricing; https://support.stripe.com/questions/billing-customer-portal | 2026-10-03 |
| Stripe Billing annual plan | per month | from $620 (up to $100k volume) | https://stripe.com/billing/pricing | 2026-10-03 |
| Stripe Customer Portal | | Included; custom domain $10/mo | same | 2026-10-03 |
| Stripe Tax Basic | per transaction | 0.5% (no-code) or $0.50 (API) | https://stripe.com/pricing | 2026-10-03 |
| Resend Free | per month | 3,000 emails, 100/day, 3 domains | https://resend.com/pricing.md | 2026-10-03 |
| Resend Pro | per month | $20 for 50k emails / $35 for 100k; overage $0.90 per 1k | same | 2026-10-03 |
| Postmark Free | per month | 100 emails | https://postmarkapp.com/pricing | 2026-10-03 |
| Postmark Basic / Pro / Platform | per month at 10k emails | $15 / $16.50 / $18; overage $1.80 / $1.30 / $1.20 per 1k (as read; Pro and Platform look unusually low, verify) | same | 2026-10-03 |
| Render workspace | per month | Hobby free; Pro $25 | https://render.com/pricing | 2026-10-03 |
| Render web service | per month | Free (512 MB); $7 (512 MB, <1 CPU); $25 (1 CPU, 2 GB) | same | 2026-10-03 |
| Render Postgres | per month | Free (256 MB); $6 (0.1 CPU, 256 MB); $40 (1 CPU, 2 GB); storage $0.30/GB | same | 2026-10-03 |
| Railway | per month | Hobby $5 (includes $5 usage); Pro $20 (includes $20) | https://docs.railway.com/pricing/plans | 2026-10-03 |
| Railway resources | | RAM $10/GB-mo; CPU $20/vCPU-mo; volume $0.15/GB-mo; egress $0.05/GB | same | 2026-10-03 |
| Fly.io Machine | shared-cpu-1x, 256 MB | $2.19/mo; extra RAM $6/GB-mo | https://fly.io/pricing/ | 2026-10-03 |
| Fly.io Managed Postgres | per month | Basic $38 (shared-2x, 1 GB); Starter $72 (2 GB); storage $0.28/GB | https://docs.fly.io/postgres.md | 2026-10-03 |
| Neon Free | | 100 CU-hours/project/mo; 1 GB per project; 5 GB egress; scale to zero | https://neon.com/docs/introduction/plans | 2026-10-03 |
| Neon Launch | usage-based | $0.106/CU-hour; $0.35/GB-month; no minimum | same | 2026-10-03 |

Rough small-stack monthly cost (estimate, not quoted):
- Render $7 web + $6 Postgres ≈ **$13/mo**
- Railway Hobby $5 + usage
- Render $7 web + Neon Free = **$7/mo**
- Fly.io MPG is comparatively expensive ($38+) for this stage.

---

## Consolidated AI cost table (per sampled answer, unit prices)

| Platform | Search unit price | Cheapest suitable model (in / out per 1M) | Source |
|---|---|---|---|
| OpenAI `web_search` | $0.010 / call, plus content tokens (billing **CONFLICT**) | `gpt-6-luna` $0.10 / $0.50 (**CONFLICT**: $0.05 / $0.25) | developers.openai.com/api/docs/pricing; /models/gpt-6-luna |
| Anthropic `web_search_20250305` | $0.010 / search | Haiku 4.5 $1 / $5 | platform.claude.com/docs/en/about-claude/pricing |
| Gemini `google_search` | $0.014 / query after 5k free per month (3.x) | 3.1 Flash-Lite $0.25 / $1.50 | ai.google.dev/gemini-api/docs/pricing |
| Perplexity Agent API `web_search` | $0.0025 (standard) / $0.001 (fast) | `perplexity/sonar` $0.25 / $2.50 | docs.perplexity.ai/docs/agent-api/tools/web-search; /models |

Illustrative cost per sampled prompt, assuming 1 search, about 5k input tokens (including search content) and 500 output tokens. These are estimates.
- OpenAI `gpt-6-luna`: ≈ $0.0108
- Anthropic Haiku 4.5: ≈ $0.0175
- Gemini 3.1 Flash-Lite: ≈ $0.0160 (but see the ToS risk in section 3)
- Perplexity `perplexity/sonar`: ≈ $0.0050

Search results often run well past 5k tokens on Anthropic, which raises the Haiku figure.
