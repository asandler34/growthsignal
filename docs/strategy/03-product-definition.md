# Stage 3: Product definition

The customer facing version of this document is `public/methodology.html` (served at `/methodology`). This file records the internal reasoning and the exact rules.

## Three separate capabilities

| | A. Website readiness | B. Observed AI visibility | C. Improvement and monitoring |
|---|---|---|---|
| Question | Can AI and search systems reach and understand the site? | Do sampled AI answers mention or cite the business? | What should change, did it change, what moved? |
| Control | Owner controls it | Owner influences it indirectly | Owner acts, we verify |
| Measured by | Crawl of homepage, robots.txt, sitemap, up to N relevant pages | Official APIs with web search, defined prompts, repeats | Rescans, comparisons, scheduled samples |
| Output | 0 to 100 score with published rubric, evidence per check | Mention and citation counts with Wilson 95% interval, every answer and source | Ranked fixes, fix kit, change alerts, history |
| Never claimed | That passing guarantees indexing or recommendation | That samples equal what any person sees | That fixes cause visibility changes |

The score never blends A and B.

## A. Readiness: what we verify

Implemented in `src/scanner/`. 19 checks, 100 points: Access 35, Business information 25, Structured data 20, Content clarity 20. Each check returns status, points, what we found, why it matters, how to fix, evidence (URL plus detail). Unperformed checks are `not_checked` and excluded from the denominator. Full table in `/methodology`.

Deliberate choices:
- **Search versus training crawlers.** Blocking GPTBot, ClaudeBot, CCBot, Applebot-Extended or Google-Extended does not lose points; blocking Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot or PerplexityBot does. Owners who block training are making a legitimate choice. Crawler purposes come from each operator's documentation; see the verification note in `docs/decision-log.md` (D-014).
- **llms.txt** is reported, not scored.
- **JavaScript** is not executed. This mirrors many AI crawlers and keeps the scanner cheap and safe.
- **Third party listings** (Google Business Profile, Yelp, BBB, Angi) are not verified. We list links found on the site and, in answer samples, the sources AI actually cited, which tells the owner where to look.
- Our crawler respects robots.txt for every page except the requested homepage (owner initiated).

## B. Observed visibility: sampling protocol

Implemented in `src/visibility/`.

- **Access method:** official APIs only. OpenAI Responses API with `web_search`; Anthropic Messages API with the web search server tool; Perplexity Agent API (`/v1/agent`) with `web_search`. Gemini grounding is implemented but disabled because Google's grounding terms restrict analyzing grounded results (D-023). No scraping or automation of consumer apps (ChatGPT, Claude.ai, Gemini app, Perplexity.ai), which provider terms restrict and which would make the business fragile.
- **API versus consumer apps:** consumer apps add system prompts, memory, personalization, device location and different model or retrieval settings. API samples are evidence of how each platform's models and retrieval treat the business under stated conditions. The UI and emails say this every time.
- **Prompt selection:** generated from business type, services, city and state (`src/visibility/prompts.js`): best X in city, reliable X, specific service, best reviewed, cost, weekend availability, and one brand prompt ("What do you know about NAME in CITY? Include contact details."). Owners can edit, disable and add prompts up to their plan limit.
- **Context:** the city and state are written into every question. Where an API supports approximate user location (OpenAI, Anthropic, Perplexity), we pass city, region and country. Language English, no history.
- **Recorded per sample:** provider, model id returned, prompt, intent, repeat index, location passed, timestamp, status, answer excerpt (4,000 characters), citations with domain, mention and citation flags, competitor mentions, cost.
- **Repeats:** Check and Improve ask each question twice per platform, Grow twice per platform every two weeks. The report shows how many prompt and platform pairs disagreed between repeats.
- **Definitions:** mention = normalized business name phrase or domain appears in the answer; citation = a source the answer cites is on the business domain (sources only retrieved, not cited, do not count); competitor mention uses the same rule. Brand prompt answers are excluded from discovery mention rates.
- **Unavailable and inconclusive:** not connected, budget reached, or provider error after one retry. These are stored as samples with status and reason, displayed, and excluded from rates. A run with no successful samples reports "no answers available to measure".
- **Small samples:** every rate carries a 95% Wilson interval. Under 10 answers is labeled small. Single run changes are not called trends.
- **Accuracy flag:** a brand answer containing a phone number that differs from the owner confirmed phone is flagged.
- **Safety:** prompts never include crawled page content, so page text cannot inject instructions into a model. Model output is stored and rendered as plain text only.

## C. Improvement and monitoring

- Prioritized fixes: failing and partial checks ranked by points available times severity.
- Fix kit (Improve, Grow): JSON-LD for a schema.org business type, a visible facts block, an FAQ draft with bracketed placeholders, and robots.txt groups for blocked search crawlers. Generated deterministically from owner confirmed facts (`src/improve/fixkit.js`), never from a model, so nothing is invented. `<` is escaped in JSON-LD so it cannot break out of the script tag.
- We never change a customer's website. Ownership verification (meta tag or file) is required before a public share link, because a public report about someone else's site could be misused.
- Monitoring: weekly scans on paid plans with email when the score drops or a check regresses; scheduled answer samples monthly (Check, Improve) or every two weeks (Grow).
- Completed fixes and visibility changes are shown separately.

## Public preview versus account

| | Anonymous preview | Free account | Paid |
|---|---|---|---|
| Score and category breakdown | Yes | Yes | Yes |
| Top 3 fixes | Yes | All | All |
| Evidence, crawler table, facts, coverage | No | Yes | Yes |
| AI answer sample | No | One lifetime: 3 prompts, 1 platform, 1 repeat | Scheduled plus on demand |
| History | Deleted after 30 days | 1 month | 12 to 24 months |

Rationale: the preview delivers value in under a minute; the account gate protects AI spend (answer samples cost money) and gives us an email for lifecycle messages.

## Why no live AI chatbot (yet)

A live assistant would cost money per visitor, needs guardrails against promising placement, and adds little over a good FAQ when the product itself answers the real question in a minute. The existing assistant was rewritten as a labeled "Product FAQ, prewritten answers, not a live AI" whose prices come from the server plan definitions. Revisit when inquiry volume shows repeated questions the FAQ cannot answer.
