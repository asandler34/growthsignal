# Stage 2: Competitive research and positioning

Date checked: 2026-10-03 for every source. Full profiles with all source URLs: `docs/research/competitors-direct.md` and `.csv` (direct AI visibility tools), `docs/research/seo-platforms-and-substitutes.md` (SEO suites, website builders, free tools), `docs/research/platform-apis-and-costs.md` (provider APIs, terms, crawlers, costs). "Unknown" means the vendor does not publish it or the page could not be read. Vendor claims are labeled as claims.

## 1. Comparison

| Tool | Target | Entry price a month | Free or trial | AI platforms | Collection method disclosed | Site audit | Fixes | Local | Evidence of traction | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| Profound | Enterprise marketing teams | Enterprise only for brands (self serve $99 and $399 plans removed Sept 2026) | 7 day trial | Up to 9 | Claims user facing capture; repeats and location unknown | Bot analytics via CDN | Implements (AI Marketer stages pages in CMS) | No | $180M Series D at $1.8B (2026-09-15); claims 1,000+ brands | tryprofound.com/pricing; newsroom |
| Peec AI | Marketing teams, agencies | About $80 to $95 (third party; vendor page showed no prices) | Trial | 3 of 6 below enterprise | Daily per model; UI vs API unknown | No | Monitor only | No | $4M ARR in 10 months, 1,300+ customers at Series A (press) | peec.ai; everything-pr.com |
| Otterly.AI | Marketers, SEOs, agencies | $29 (15 prompts) | 7 days, no card | 4, plus 3 add ons; 50+ countries | Daily with country; UI vs API unknown | GEO URL audit | Recommends | No | Claims 40,000+ users; G2 4.7 (54) | otterly.ai/pricing |
| Scrunch | Mid market, enterprise | $250 annual, $300 monthly | 7 days | 7 | Unknown | 5 page audits | Partly implements (AXP) | No | Claims 500+ brands | scrunch.com |
| AthenaHQ | Startups, mid market | $295 | $25 of credits | 11 | Credit based; unknown | Unknown | Drafts content | Via Uberall partnership | Claims 300+ brands | athenahq.ai |
| HubSpot AEO | Marketers, HubSpot users | $45 annual, $50 monthly (25 prompts) | Trial; free AI Search Grader, no account | 3 | Unknown | No | Recommends | No | HubSpot distribution; beta | hubspot.com/products/aeo |
| Semrush AI Visibility | Semrush users | $99 per domain (third party) | 7 days | 4 | Unknown | AI readiness audit | Recommends | No | Unknown for this toolkit | get-ryze.ai (vendor page blocked) |
| BrightLocal Local AI Visibility | Local SMBs, agencies | $31 annual, $41 monthly per location (Track) | 14 days, no card | 3 (ChatGPT, AI Mode, AI Overviews) | Per location, 20 prompts; frequency unknown | Local SEO and GBP audit | Recommends; managed SEO $1,299 | **Yes** | G2 4.6 (230), mostly small business | brightlocal.com/pricing |
| Local Falcon | Local SEO agencies | $24.99 credit pack | 100 credits | 8 plus maps | Geo grid across many points | Agent content audits | Recommends | **Yes** | Logo claims only | localfalcon.com |
| Lighthouse Local | Local businesses, agencies | $79 | 14 days; free 60 second audit | 5 | Weekly plus 3 daily priority prompts | 45+ signal audit | Plain English plan plus paid done for you | **Yes** | None found | lighthouselocal.ai |
| LLMrefs | SEOs, agencies | $79 | 7 days; free account | About 10; 50+ countries | Keyword fan out prompts, weekly | Free crawlability checker | Content optimizer | No | Claims 10,000+ marketers | llmrefs.com |
| Trakkr | Brands, agencies | $100 | 14 days; free tools | 8 | Daily | Site grader | Writes content | No | Logo claims | trakkr.ai |
| Built in substitutes | Wix, Squarespace sites; Bing Webmaster AI Performance; Google Search Console AI reports | $0 extra | Free | Varies | Platform data | Varies | Some | Partly | Distribution | see seo-platforms file |

**GrowthSignal for comparison:** local service owners and their web designers; free scan with no account, free account with one real answer sample, then $9 / $29 / $59; OpenAI, Anthropic and Perplexity APIs with web search (Gemini off pending legal review); method fully published (API only, location passed, 2 repeats, Wilson intervals, every answer shown); 19 check published rubric; deterministic fix kit from owner confirmed facts; never edits the site.

## 2. What the market tells us

1. **Price floor for paid tracking is about $25 to $50 a month.** BrightLocal ($31 to $41 per location) is the most direct incumbent threat because it already sells to the same owners. HubSpot's free grader plus $50 plan sets the anchor most marketers will compare against.
2. **Capital is flowing to enterprise.** Profound left self serve; Scrunch and AthenaHQ start near $300. The owner run local segment is underserved by design, not by accident: low ARPU and high churn. Our cost structure must stay tiny.
3. **Almost nobody discloses method.** Vendors rarely say whether they capture the consumer app or call the API, how often they repeat, or from what location. This is a trust gap we can own.
4. **API answers differ from app answers.** Surfer's August 2026 study (1,000 prompts, 13,779 answers) found API and chat interface answers share at most about 30% of brand mentions and 4.8% to 26.7% of cited domains (surferseo.com/blog/llm-scraped-ai-answers-vs-api-results). Scraping the apps would close this gap but breaks all four providers' terms (quotes in the API research file). We choose API sampling and say plainly what it is. This is the largest product credibility risk; see section 5.
5. **No proof exists for local outcomes.** Every named result in the category is enterprise or SaaS and vendor published. We should not imply outcomes either; our proof is the evidence itself.

## 3. Practices worth adopting (and status)

| Practice | Status |
|---|---|
| Free no signup audit as the top of funnel | Done: free scan, results in about a minute |
| Website, then suggested questions, then first result within minutes | Done: questions generated from business type, services and town; editable |
| Small curated question set instead of hundreds of generated prompts | Done: 3 to 15 per plan |
| Pricing by questions and sites, annual discount, no credits | Done: 2 months free yearly, no credit system |
| Weekly reports and alerts | Done: weekly scan with change digest only when something changed |
| Agency partner and white label audits | Partly: Grow covers 3 sites, verified share links; partner program in GTM plan |
| Original research as content | Planned: anonymized aggregate trade study (GTM day 0 to 30) |
| Proof cards with named customer and number | Not until real customers consent; never invented |
| GA4 attribution of AI referral traffic | Deferred; candidate for Improve after launch |

## 4. Gaps GrowthSignal targets

1. An owner friendly local product under $50 that turns findings into ready to paste fixes (cheap tools only recommend; done for you starts at $1,299).
2. Complete method disclosure: what was asked, where from, which API, how many repeats, uncertainty, and every answer and source.
3. Separate, honest results for what the owner controls (readiness) and what is sampled (visibility), never blended.
4. Accuracy checks: flag answers that state a wrong phone number for the business.

## 5. Risks from the competitive picture

- **BrightLocal adds fixes or lowers price.** Mitigation: be the simplest and most transparent option; win web designers as a channel.
- **Website builders bundle "good enough" checks.** Mitigation: the free scan must beat them on evidence; monitoring and competitor context sell the subscription.
- **API versus app gap undermines trust in samples.** Mitigation now: say it on every result, call them "API sampled answers", pass location, repeat. Mitigation later: if a provider offers an authorized way to observe consumer answers, adopt it. Do not scrape.

## 6. Positioning statement

**For** owners of local service businesses and the web designers who look after their sites,
**GrowthSignal delivers** a clear answer to "does AI recommend us, and what is stopping it?" plus the exact fixes,
**through** a free instant website readiness scan, repeated AI answer samples from official APIs, and copy and paste fixes built from facts the owner confirms,
**supported by** a published scoring rubric and sampling method, every answer and source shown with uncertainty ranges, and no promises of placement.

Short form for the homepage: "See whether AI recommends your business, and exactly what to fix. Free, in about a minute."
