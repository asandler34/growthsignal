# Direct competitors: AI search visibility / GEO / AEO tools

Prepared for GrowthSignal.ai. Date checked for every source: **2026-10-03**. All facts come from pages fetched or search results seen on that date; anything not found is marked "unknown". Vendor claims are labeled as claims. Where the vendor page could not be read (bot wall, JS-only pricing), the third-party source is named.

## 1. Selection criteria

Around 35 tools were screened (vendor pages, plus roundups such as stealwhatworks.com's 34-tool pricing survey and lighthouselocal.ai's SMB list). Twelve made the core set. Each was scored on:

1. **SMB/local relevance.** Does it target, or plausibly serve, a single-location service business or the small agency behind it? Location-level tracking counts heavily.
2. **Price accessibility.** Is there a self-serve paid entry under about $100/month?
3. **Traction evidence.** Funding, claimed users, disclosed paying customers or ARR, and verified outcomes are kept apart.
4. **Benchmark value.** A few enterprise leaders (Profound, Scrunch, AthenaHQ) are included because they set buyer expectations and the category narrative, even though they do not serve GrowthSignal's segment.

**Core set (12):**

| Group | Competitors |
|---|---|
| Category leaders / benchmarks | Profound, Peec AI, Scrunch, AthenaHQ |
| Self-serve low price | Otterly.AI, LLMrefs, Trakkr, HubSpot AEO, Semrush AI Visibility Toolkit |
| Local-first | BrightLocal (Local AI Visibility), Local Falcon, Lighthouse Local |

**Screened but not profiled in depth:**
- Rankscale: $99/mo Pro, 7-day trial, white label from $385 Growth ([pricing](https://rankscale.ai/pricing)).
- Ahrefs Brand Radar: Custom Prompts from $50/mo; AI Visibility Index $199/mo; prompts drawn from Ahrefs keyword data; free AI Visibility Checker ([page](https://www.ahrefs.com/brand-radar)). Whether a base Ahrefs subscription is also required is unknown.
- Am I On AI: Pro $100/mo, 150 prompts, ChatGPT and Google AI Overview only, 7-day trial ([pricing](https://www.amionai.com/pricing)).
- Birdeye Search AI, Yext Scout and Uberall GEO Studio (powered by AthenaHQ): multi-location enterprise, demo-led, no public price ([birdeye](https://birdeye.com/ai-search/), [yext](https://www.yext.com/platform/scout), [uberall PR](https://www.businesswire.com/news/home/20251216235777/en)).
- Free or near-free trackers: Promptwatch, GetCito, GEOfast ([stealwhatworks](https://stealwhatworks.com/blogs/news/ai-search-visibility-pricing)).

**What "successful" means here.** Each profile labels evidence as one of the following:
- **Funding:** capital raised.
- **Claimed reach:** "X brands / users" (vendor claim, rarely broken out as paying).
- **Paid customers / ARR:** disclosed in press.
- **Verified outcomes:** a named customer plus a number. Even these are vendor-published; no independent audit was found for any vendor.

---

## 2. Per-competitor profiles

### 2.1 Profound (tryprofound.com)
- **Target / positioning:** An AI marketing platform for enterprise marketing teams (AEO, content, PR, agencies). It now presents itself as an "agentic" marketing suite rather than only a tracker.
- **Entry price / billing:**
  - Brands: a free 7-day **Trial**, then **Enterprise (custom)** only.
  - Agencies, per a third party: $99/mo base + $399/mo per client workspace.
  - The $99 Starter and $399 Growth brand plans were removed in mid-September 2026 ([geotoolbox, 2026-09-28](https://geotoolbox.ai/blog/profound-pricing)).
- **Trial:** 7 days. Includes 50 prompts tracked daily, 3 engines (ChatGPT, Gemini, AI Overviews), 1 language and 1 region, unlimited seats, no history/export/API.
- **Platforms / markets:** Up to 9 engines on Enterprise (ChatGPT, Perplexity, AI Mode, Gemini, Copilot, DeepSeek, Claude, AI Overviews, Exa). Custom languages and regions.
- **Methodology:** Describes itself as "front-end" focused, i.e. it analyzes what users see. Runs prompts daily. Repeat-run and location details: unknown.
- **Mentions / citations / sentiment / competitors:** Yes, via Answer Engine Insights. Also Prompt Volumes (consumer query demand).
- **Site audit:** Agent Analytics tracks AI-bot crawling via CDN integrations (Cloudflare, Akamai, Fastly, Vercel, etc.). A classic schema/content audit is not listed.
- **Actions:** **Implements.** Its "AI Marketer" creates and rewrites pages and stages them in the CMS.
- **Integrations:** GA4, WordPress, CDNs. API and exports on Enterprise only. Slack support channel on Enterprise.
- **Onboarding:** Primary CTA is "Get a demo"; self-serve trial is secondary.
- **Adoption evidence:**
  - Funding: $96M Series C at $1B valuation, Feb 2026 (total $155M) ([Fortune](https://fortune.com/2026/02/24/exclusive-as-ai-threatens-search-profound-raises-96-million-to-help-brands-stay-visible)). Then $180M Series D at $1.8B, 2026-09-15 ([newsroom](https://www.tryprofound.com/newsroom/profound-raises-usd180m-series-d-at-usd1-8b-valuation-to-build-the-ai-platform-for-marketing-teams)).
  - Claimed reach: 1,000+ enterprise brands, 1/3 of the Fortune 100. ARR not disclosed.
  - Vendor-published outcomes: Plaid +50% visibility, Ramp 7x visibility, Gr0 "100x monthly revenue" ([home](https://www.tryprofound.com/)).
  - G2: 4.5/5, 1,130 reviews. About 25% from small businesses. Price is the top complaint ([G2](https://www.g2.com/products/profound/reviews)).
- **Channels:** Large funding announcements and press, an agency plan, demo-led sales, research/data content.
- **Weaknesses / opportunity:**
  - Profound has left self-serve SMB. There is no paid brand plan below enterprise.
  - G2 reviewers flag a learning curve and US/Canada geo mixing.
  - This confirms the bottom of the market is open. GrowthSignal should not compete on breadth.
- **Sources:** [pricing](https://www.tryprofound.com/pricing), [home](https://www.tryprofound.com/), plus the Fortune, newsroom, geotoolbox and G2 links above.

### 2.2 Peec AI (peec.ai)
- **Target / positioning:** AI search analytics for marketing teams and agencies; simple tracking of visibility, position and sentiment.
- **Entry price / billing:**
  - **Starter, 50 prompts.** The Peec pricing page did not render numeric prices when fetched. Third-party figures disagree:
    - $89/mo (Series A coverage, [everything-pr](https://everything-pr.com/berlins-peec-ai-rockets-to-4m-arr-in-ten-months-raises-21m-series-a-to-open-new-york-office))
    - $95 ([G2](https://www.g2.com/products/peec-ai/pricing))
    - $80 ([PricingSaaS, Q1 2026](https://pricingsaas.com/companies/peec))
    - €89 ([subscribed.fyi](https://subscribed.fyi/?p=185164))
  - Treat the entry as **about $80–95/month**.
  - Monthly billing, with 15% off annual. Starter includes 3 chosen models, unlimited seats, daily runs and 1 project.
- **Trial:** Free trial ("Start Free Trial"). Length unknown on Peec's page; 7 days per subscribed.fyi.
- **Platforms / markets:** On the Starter plan you pick 3 of ChatGPT, AI Mode, AI Overviews, Copilot, Gemini and Naver. Up to 13 models on Enterprise, and more models are sold as add-ons. Country filter available. A third party (Ahrefs blog) says countries and languages are unlimited at no extra cost.
- **Methodology:** "Executes each prompt once every 24 hours on every AI model" ([home](https://peec.ai/)). UI vs API: unknown.
- **Mentions / citations / sentiment / competitors:** Mentions, position and source citations (domain and URL) on all plans. Sentiment only on Pro and above. Competitor analysis on all plans.
- **Site audit:** None found. Third-party reviewers note there are no audit or content tools.
- **Actions:** **Monitor only.**
- **Integrations:** GA4 on all plans. Looker Studio from Advanced. API on Enterprise (the homepage also cites a REST API and MCP).
- **Onboarding:** Self-serve: workspace + domain → AI-suggested prompts → first scores "within minutes".
- **Adoption evidence:**
  - Funding: €5.2M seed (Jul 2025) and $21M Series A (Nov 2025), about $29M in total.
  - ARR: $4M ARR ten months after launch; 1,300+ brand/agency customers at the Series A ([everything-pr](https://everything-pr.com/berlins-peec-ai-rockets-to-4m-arr-in-ten-months-raises-21m-series-a-to-open-new-york-office)). This is the best paid-customer disclosure in the category.
  - Homepage claims 3,000+ brands and agencies.
  - Only 2 reviews on G2.
- **Channels:** Agency pricing page (credit pool, pitch workspaces, white-label reports) ([agencies](https://peec.ai/pricing-agencies)), content, a New York expansion.
- **Weaknesses / opportunity:**
  - Only 3 models below Enterprise.
  - No audit or fixes.
  - No local or location concept.
  - Prices are not clearly visible on the page.
- **Sources:** [pricing](https://peec.ai/pricing), [home](https://peec.ai/), plus the sources above.

### 2.3 Otterly.AI (otterly.ai)
- **Target / positioning:** A self-serve AI search monitoring tool for marketers, SEOs and agencies. Its headline is "#1 rated".
- **Entry price / billing:**
  - **Lite: $29/mo monthly, or $25/mo billed annually.** Includes 15 prompts; 4 engines (ChatGPT, AI Overviews, Perplexity, Copilot); unlimited users; 1 workspace; daily tracking; 1,000 GEO URL audits/mo; 3 recommendations/week.
  - Standard is $189 (100 prompts, API, Looker Studio, Agent Analytics). Premium is $489.
  - Extra 100 prompts cost $99/mo. Claude is a $29–439 add-on; Gemini/AI Mode a $9–149 add-on.
- **Trial:** 7-day free trial, no card.
- **Platforms / markets:** ChatGPT, AIO, Perplexity, Copilot, plus add-ons Claude, AI Mode and Gemini. 50+ countries.
- **Methodology:** "Automatically sends queries to AI search engines" daily, with country-specific tracking. UI vs API and repeat runs: unknown.
- **Mentions / citations / sentiment / competitors:** Yes to all: brand mentions, link citations, domain ranking, sentiment, competitors.
- **Site audit:** **Yes.** A GEO URL audit (1,000 URLs/mo on Lite), plus free crawler-simulation and content-check tools.
- **Actions:** Recommends only: 3 recommendations/week on Lite, unlimited on Standard.
- **Integrations:** Looker Studio connector, API and MCP from Standard. A Semrush listing exists, per prior reports (not verified today).
- **Onboarding:** Self-serve trial with group onboarding; Premium gets personal onboarding.
- **Adoption evidence:**
  - Claims 40,000+ marketing professionals (users, not paying customers).
  - Logos include Roche, Publicis Sapient and Visma.
  - Gartner Cool Vendor 2025 (claim).
  - Funding: unknown (none found).
  - G2: 4.7/5, 54 reviews, mostly small and mid-market. Complaints: the jump from Lite to €189, slow refresh, sentiment misclassification ([G2](https://www.g2.com/products/otterly-ai/reviews)).
- **Channels:** Free GEO tools, education (guide, email course, studies), an agency partner program with directory listing and co-marketing (about 16 listed agencies) ([agencies](https://otterly.ai/agencies)), G2 badges.
- **Weaknesses / opportunity:**
  - 15 prompts is a token amount, and there is a 6.5x price cliff to the next tier.
  - No location-level or local-pack concept.
  - It recommends but does not do the work.
  - This is the closest price comparator to GrowthSignal.
- **Sources:** [pricing](https://otterly.ai/pricing), [home](https://otterly.ai/), [agencies](https://otterly.ai/agencies), G2.

### 2.4 Scrunch (scrunch.com)
- **Target / positioning:** An "AI customer experience platform" for mid-market and enterprise brands and agencies. Monitoring plus an agent-optimized site layer (AXP).
- **Entry price / billing:** **Starter: $300/mo monthly, or $250/mo annual** (17% off). Includes 3 seats, 350 custom prompts, 1,000 industry prompts, 3 personas and 5 page audits. Growth is $500/$417. Extra seats cost $25.
- **Trial:** 7-day Starter trial, no card. Demo for Growth and Enterprise.
- **Platforms / markets:** ChatGPT, Claude, Gemini, Perplexity, AI Mode, AI Overviews, Meta. Countries: unknown.
- **Methodology:** Prompt-level, persona-based tracking. Collection method and frequency: unknown.
- **Mentions / citations / sentiment / competitors:** Citations, share of voice, competitor benchmarking. G2 users ask for better sentiment.
- **Site audit:** Page audits (5 on Starter), bot/crawl observability, plus AXP, which serves AI-optimized page versions to agents.
- **Actions:** Partly implements, via AXP serving agent-ready pages.
- **Integrations:** "Integrations" listed (GA4 per G2 reviews). Data API on Enterprise only.
- **Onboarding:** Self-serve trial. G2 reviewers complain about too many auto-generated prompts to clean up.
- **Adoption evidence:**
  - Funding: $15M Series A (Jul 2025), $19M total.
  - Claims: 500+ brands at the time; 50%+ MoM paying-customer growth over 3 months; "average 40% referral traffic increase" ([VCA](https://www.vcaonline.com/news/2025072206/scrunch-ai-raises-15-million-series-a-to-rebuild-the-internet-for-ai-consumption/)).
  - Vendor-published outcome: Runpod "4x growth".
  - G2: 4.6/5, 73 reviews.
- **Channels:** Agency program, free prompt generator, trial.
- **Weaknesses / opportunity:** $250+ entry and agency/enterprise focus. Set-up noise from auto-generated prompts. No local features.
- **Sources:** [pricing](https://scrunch.com/pricing), [home](https://scrunch.com/), [G2](https://www.g2.com/products/scrunch-ai/reviews).

### 2.5 AthenaHQ (athenahq.ai)
- **Target / positioning:** "Agents to win on AI search", for funded startups and mid-market brands.
- **Entry price / billing:**
  - Free "Essential": 300 one-time credits, worth $25.
  - **Starter $295/mo**, 17% off annual. 3,600 credits/mo (1 credit = 1 AI response), single region, unlimited seats.
  - API costs extra. A third party also lists a Pro tier at $499.
- **Trial:** Free credit grant rather than a time-boxed trial.
- **Platforms / markets:** 11 models on Starter (ChatGPT, Perplexity, Claude, Grok, DeepSeek, Mistral and others). Multi-region only on Enterprise.
- **Methodology:** Credit-based, priced per response. Further detail: unknown.
- **Mentions / citations / sentiment / competitors:** Yes to all (citation intelligence, sentiment, competitors).
- **Site audit:** Not explicit. A content optimization agent is included.
- **Actions:** Recommends and drafts: a content optimization agent (basic on Starter) and an outreach generator. G2 calls the outreach output generic.
- **Integrations:** GA4 and GSC, Shopify and Webflow. Slack and white label via Enterprise or sales.
- **Onboarding:** Free self-serve signup with credits. Enterprise gets white-glove setup.
- **Adoption evidence:**
  - Funding: about $2.2–2.7M seed (YC) ([signalbase](https://www.trysignalbase.com/news/funding/athenahq-secures-22m-seed-round-to-pioneer-the-future-of-ai-search-and-generative-marketing-revolution), [everything-pr](https://everything-pr.com/athenahq-y-combinator-geo-platform-ex-google-search-engineers-profile)).
  - Claims 300+ brands; named customers Coinbase and SoFi.
  - Powers Uberall's GEO Studio for multi-location brands (Dec 2025).
  - G2: 4.9/5, 48 reviews ([G2](https://www.g2.com/products/athenahq/reviews)).
- **Channels:** YC network, a channel partnership (Uberall), the free credit tier.
- **Weaknesses / opportunity:** $295 entry. Credits are abstract for an SMB. Single region. Its local play goes through an enterprise reseller, not direct to SMBs.
- **Sources:** [pricing](https://www.athenahq.ai/pricing), plus the sources above.

### 2.6 HubSpot AEO + free AI Search Grader (hubspot.com)
- **Target / positioning:** AI visibility for marketers who are not AEO experts. Built on XFunnel, which HubSpot agreed to acquire on 2025-10-31 ([ppc.land](https://ppc.land/hubspot-acquires-xfunnel-to-strengthen-answer-engine-optimization/)). Labeled "BETA".
- **Entry price / billing:** **$50/mo, or $45/mo billed annually**, per brand. Includes 25 prompts on ChatGPT, Gemini and Perplexity. More prompts can be bought.
- **Trial / free:**
  - Free trial, no card; data carries over on conversion.
  - The free **AI Search Grader** takes company name, location, industry and product, and returns in under 2 minutes with no account needed.
  - The Grader scores sentiment (40 pts), presence (20), recognition (20), share of voice (10) and market competition (10) ([grader](https://www.hubspot.com/aeo-grader)).
- **Platforms / markets:** ChatGPT, Gemini, Perplexity. Markets: unknown.
- **Methodology:** "Monitors actual AI responses from live queries". Frequency and UI vs API: unknown.
- **Mentions / citations / sentiment / competitors:** Yes to all (visibility score, sentiment, competitor share of voice, citation analysis).
- **Site audit:** Not found.
- **Actions:** Prioritized recommendations (create a page, update content, social post, outreach). Content creation requires Marketing Hub Pro or Enterprise.
- **Integrations:** Works standalone; uses CRM data when paired with Marketing Hub.
- **Onboarding:** Self-serve.
- **Adoption evidence:** HubSpot's distribution. AEO-specific users and revenue: unknown.
- **Channels:** A free grader as lead magnet, the HubSpot install base and blog/SEO.
- **Weaknesses / opportunity:**
  - Only 25 prompts and 3 engines.
  - No Google AI Overviews or AI Mode.
  - No location grid.
  - Best used inside HubSpot.
  - Most important: it **sets a $50 reference price** that small businesses and agencies will anchor on, so GrowthSignal must justify anything above it.
- **Sources:** [product](https://www.hubspot.com/products/aeo), [grader](https://www.hubspot.com/aeo-grader).

### 2.7 Semrush AI Visibility Toolkit (semrush.com)
- **Note:** semrush.com returned a bot challenge, so the figures below are from a third party ([get-ryze, Aug 2026](https://www.get-ryze.ai/blog/semrush-ai-visibility-pricing-2026)).
- **Target / positioning:** An AI visibility add-on for Semrush's SEO and agency base.
- **Entry price / billing:** **$99/mo per domain**, with no annual discount. Includes 25 custom prompts tracked daily; ChatGPT, Google AI, Gemini and Perplexity; prompt research and competitor analysis; an AI-readiness site audit.
- **Trial:** 7 days.
- **Platforms / markets:** As above. Markets: unknown.
- **Methodology:** Unknown.
- **Mentions / citations / sentiment / competitors:** Mentions and competitors yes. Sentiment: unknown.
- **Site audit:** Yes (AI-readiness).
- **Actions:** Recommends.
- **Integrations / onboarding:** Semrush ecosystem; self-serve.
- **Adoption evidence:** Semrush scale; toolkit-specific data unknown.
- **Channels:** Semrush cross-sell.
- **Weaknesses / opportunity:** Per-domain pricing gets expensive for agencies (about $297 for 3 brands). SEO-tool complexity. Not local.
- **Sources:** the get-ryze article above.

### 2.8 BrightLocal: Local AI Visibility (brightlocal.com)
- **Target / positioning:** Local SEO suite for SMBs and agencies, now with location-level AI visibility tracking.
- **Entry price / billing:** Included in **Track at $41/mo monthly for 1 location**, or $369/yr (about $31/mo). Track also includes 100 keywords, citation monitoring, a GBP audit and an SEO audit. Pricing scales by location count (up to 200, then custom).
- **Trial:** 14 days, no card.
- **Platforms / markets:** ChatGPT, Google AI Mode, Google AI Overviews. More "coming in V2".
- **Methodology:** Per-location tracking with up to 20 prompts per location, suggested by business category. Frequency: unknown.
- **Mentions / citations / sentiment / competitors:**
  - A 0–100 visibility score by platform and prompt.
  - Competitor mention rate, share of voice, average position.
  - Shows the citations that influence AI answers.
  - Sentiment: unknown.
- **Site audit:** SEO audit plus GBP audit (classic local). An AI-specific crawler/schema audit: unknown.
- **Actions:**
  - Recommends.
  - Separately sells listings sync (Manage plan), reviews (Grow plan), pay-per-citation building, and **Managed SEO at $1,299/mo** (done-for-you).
- **Integrations:** White label on all plans. API by custom quote.
- **Onboarding:** Self-serve.
- **Adoption evidence:** G2: 4.6/5, 230 reviews, mostly small businesses ([G2](https://www.g2.com/products/brightlocal/reviews)). Customer counts for the AI feature: unknown.
- **Channels:** Local SEO content and research, agency white label, free tools (historically).
- **Weaknesses / opportunity:**
  - Only 3 AI platforms and 20 prompts per location.
  - The AI feature is a module in a complex suite (G2: "clunky", "difficult navigation").
  - Still, it is **the most direct incumbent threat**: an SMB-trusted brand at about $31–41 that already bundles AI visibility with GBP, citations and reviews.
- **Sources:** [AI visibility page](https://www.brightlocal.com/local-seo-tools/local-ai-visibility/), [pricing](https://www.brightlocal.com/pricing/).

### 2.9 Local Falcon (localfalcon.com)
- **Target / positioning:** Geo-grid rank tracking for maps and AI answers. Serves agencies, SMBs and multi-location brands.
- **Entry price / billing:**
  - Credit packs: **Starter $24.99/mo** (7,500 credits), Basic $49.99, Pro $99.99, Premium $199.99.
  - Annual packs from $299.88/yr.
  - Falcon AI analysis costs 25 credits/report. Credits per AI grid scan: unknown.
- **Trial:** 100 free credits on signup.
- **Platforms / markets:** ChatGPT, Gemini, Perplexity, Grok, AI Mode, Copilot, AI Overviews, Apple Intelligence; also Google and Apple Maps ([features](https://www.localfalcon.com/features)).
- **Methodology:** **Geo-grid scans** across many points per location, with movable center points. Claims "daily-refreshed AI search data". This is the only tool found that explicitly simulates the searcher's location.
- **Mentions / citations / sentiment / competitors:** Mentions with source attribution, competitor gap analysis. Sentiment: unknown.
- **Site audit:** Falcon Agent can automate content audits. A formal crawler/schema audit: unknown.
- **Actions:** AI recommendations (Falcon AI); Falcon Agent schedules workflows.
- **Integrations:** Looker Studio (above the Starter monthly plan), API (from Basic), Zapier, n8n, white-label reports.
- **Onboarding:** Self-serve: locations + keywords + scan settings.
- **Adoption evidence:** Logos include Walmart and Olive Garden (claim). Counts and funding: unknown.
- **Channels:** Agency community, free local keyword tool, practitioner endorsements.
- **Weaknesses / opportunity:**
  - Credit math is hard for owners.
  - Practitioner and agency UX rather than owner UX.
  - The geo-grid methodology is a credibility bar GrowthSignal should match at least at city/ZIP level.
- **Sources:** [home](https://www.localfalcon.com/), [pricing](https://www.localfalcon.com/pricing), [ChatGPT page](https://www.localfalcon.com/features/chatgpt).

### 2.10 Lighthouse Local (lighthouselocal.ai)
- **Target / positioning:** AI visibility for local businesses, from solo owners to multi-location, plus agencies. Plain-English fix plan. Owned by Rhetor (To The Moon Labs Inc.).
- **Entry price / billing:**
  - **Starter $79/mo monthly.** Includes 50 tracked prompts, 5 engines, weekly checks plus 3 daily priority prompts, 1 site.
  - Growth is $249 (150 prompts, 3 sites).
  - Agency tiers: $349 (8 sites) and $999 (25 sites).
  - **Beacon**, a white-label audit lead tool, is $199/mo for 500 audits.
- **Trial / free:** 14-day trial. A free AI visibility audit covering 45+ on-site signals, "60 seconds, no signup".
- **Platforms / markets:** ChatGPT, Gemini, Claude, Perplexity, Google AI. Markets: unknown (US-oriented copy).
- **Methodology:** Live checks. Starter claims "1,400+ live AI answer checks a month", about 22 checks per prompt per month. Local and service-area prompt focus.
- **Mentions / citations / sentiment / competitors:** Mentions yes. Others: unknown.
- **Site audit:** Yes (45+ on-site signals).
- **Actions:** **Recommends, plus optional done-for-you services.** These cover on-page SEO, GBP, citations, service-area pages, backlinks and PR.
- **Integrations:** White label for agencies. Others: unknown.
- **Onboarding:** "10 minutes" setup; results the next day.
- **Adoption evidence:** None found (no counts, no funding, no quantified testimonials).
- **Channels:** SEO content (it publishes "best AI visibility tools for small businesses" roundups that rank it), free audit, white-label lead-gen tool for agencies.
- **Weaknesses / opportunity:**
  - This is **the closest positioning match to GrowthSignal.**
  - Weak proof, weekly cadence on most prompts, and a $79 entry that sits above HubSpot and BrightLocal.
  - Differentiate on proof, owner-grade UX and stronger local methodology.
- **Sources:** [home](https://www.lighthouselocal.ai/), [pricing](https://www.lighthouselocal.ai/pricing), [SMB roundup](https://www.lighthouselocal.ai/blog/ai-search-visibility-tools-for-small-businesses).

### 2.11 LLMrefs (llmrefs.com)
- **Target / positioning:** Keyword-based LLM visibility tracker for SEOs, agencies and growth teams.
- **Entry price / billing:** **One plan at $79/mo, monthly.** Includes up to 500 prompts, unlimited seats and projects, CSV and API.
- **Trial / free:** 7-day trial, no card, plus a basic free account.
- **Platforms / markets:** About 10 engines (ChatGPT, AIO, AI Mode, Gemini, Perplexity, Claude, Copilot, Meta, Grok, DeepSeek). 50+ countries, 20+ languages.
- **Methodology:** Imports SEO keywords and generates "fan-out" prompts. Results are "aggregated & weighted". Weekly reports. The only vendor seen addressing statistical sampling.
- **Mentions / citations / sentiment / competitors:** Mentions, citations and share of voice yes. Sentiment: unknown.
- **Site audit:** Free AI crawlability checker and llms.txt generator.
- **Actions:** AI content optimizer (recommend/draft).
- **Integrations:** API, CSV.
- **Onboarding:** Five-minute self-serve: brand + domain + keywords.
- **Adoption evidence:** Claims 10,000+ marketers (users). Funding: unknown.
- **Channels:** A large free-tools suite (Reddit finder, prompt DB, fan-out generator) as SEO lead magnets.
- **Weaknesses / opportunity:** Keyword-centric and SEO-practitioner UX. Weekly cadence. No local.
- **Sources:** [pricing](https://llmrefs.com/pricing), [home](https://llmrefs.com/).

### 2.12 Trakkr (trakkr.ai)
- **Target / positioning:** "Don't just track AI visibility, change it": tracking plus content for brands and agencies.
- **Entry price / billing:** **Growth $100/mo, or $1,000/yr.** Includes 1 brand, 50 prompts, 8 models daily, **25 articles/mo**, 3 seats. Scale is $500 (10 brands, white-label portals, API).
- **Trial / free:** 14-day trial. Free tools: AI query scanner, site grader, llms.txt generator.
- **Platforms / markets:** ChatGPT, Claude, Gemini, Perplexity, AIO, Grok, DeepSeek, Meta AI. Markets: unknown.
- **Methodology:** Daily runs across 8 models. Separates visibility, referral visits (GA4) and crawler requests.
- **Mentions / citations / sentiment / competitors:** Citations and "perception" (sentiment) yes. Competitors per reviews.
- **Site audit:** "Site optimization" and a free site grader.
- **Actions:** **Writes content** (25 articles/mo). Publishing method: unknown.
- **Integrations:** GA4 (2-minute setup), MCP, API on Scale, white label on Scale.
- **Onboarding:** Self-serve trial.
- **Adoption evidence:** Logos include Nike, Spotify and Walmart (claim). Quote: "AI citation traffic more than tripled in 60 days" (unnamed). Funding: unknown.
- **Channels:**
  - Public data indexes (Citation Index of 48.4M citations; AI Search Traffic Index across 4,928 GA4 properties) used as PR and SEO.
  - Free tools.
  - Comparison and review pages about competitors (e.g. trakkr.ai/reviews/...).
- **Weaknesses / opportunity:** Generic AI articles are not what a plumber needs. No local.
- **Sources:** [pricing](https://trakkr.ai/pricing), [home](https://trakkr.ai/).

---

## 3. Comparison table

| Tool | Entry $/mo | Billing | Free / trial | Engines at entry | Local / location-level | Audit | Actions | White label | Self-serve | Strongest traction evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| Profound | Enterprise only (brands) | custom | 7-day trial | 3 (trial) | No | Bot analytics | Writes and stages pages | Agency plan | Demo-led | ~$335M raised ($155M through C per Fortune + $180M D); 1,000+ enterprise brands (claim) |
| Peec AI | about $80–95 (3rd party) | mo / annual -15% | Trial | 3 of 6 | No | No | Monitor | Agency plan | Yes | $4M ARR, 1,300+ customers (press) |
| Otterly.AI | 29 | mo / annual -15% | 7-day | 4 | Country only | GEO URL audit | Recommend | Agency program | Yes | 40k users (claim); G2 4.7 (54) |
| Scrunch | 300 (250 annual) | mo / annual -17% | 7-day | 7 | No | 5 page audits + AXP | AXP agent pages | Agency program | Trial; demo higher tiers | $19M raised; 500+ brands (2025) |
| AthenaHQ | 295 (free credits) | mo / annual -17% | 300 credits | 11 | Via Uberall | Content agent | Drafts | Sales | Yes | ~$2.7M seed; 300+ brands (claim) |
| HubSpot AEO | 50 (45 annual) | mo / annual | Trial + free grader | 3 | No | No | Recommend | No | Yes | HubSpot distribution |
| Semrush AI Vis. | 99 (3rd party) | mo | 7-day | 4 | No | AI-readiness | Recommend | Semrush | Yes | Semrush base |
| BrightLocal | 41 (31 annual) | mo / annual | 14-day | 3 | **Yes, per location** | SEO + GBP | Recommend; managed SEO $1,299 | Yes | Yes | G2 4.6 (230), SMB-heavy |
| Local Falcon | 24.99 credit pack | mo / annual | 100 credits | 8 | **Yes, geo-grid** | Agent audits | Recommend | Yes | Yes | Enterprise logos (claim) |
| Lighthouse Local | 79 | mo | 14-day + free audit | 5 | **Yes, local prompts** | 45-signal audit | Recommend + DFY services | Yes ($199 Beacon) | Yes | None found |
| LLMrefs | 79 | mo | 7-day + free tier | ~10 | No (50+ countries) | Free crawl check | Optimizer | No | Yes | 10k marketers (claim) |
| Trakkr | 100 | mo / annual | 14-day | 8 | No | Site grader | Writes 25 articles | Scale $500 | Yes | Logos + unnamed quote |

## 4. Best practices worth adapting

**Homepage structure**
- The repeated pattern is:
  1. One-line promise ("track and improve").
  2. Engine logos (ChatGPT, Gemini, Perplexity, AIO).
  3. Customer logos.
  4. A three-step "how it works".
  5. Dual CTA: trial + demo.
- Lighthouse Local's three steps ("tell us your business → we check 5 AIs → plain-English fix list ranked by impact") are the closest model for owners.
- Trakkr's "don't just track it, change it" captures the market's shift from monitoring to action.

**Free tools as lead magnets (the dominant acquisition channel)**
- HubSpot AI Search Grader asks for name, location, industry and product; no account; under 2 minutes; scored rubric; upsells $50 AEO.
- Lighthouse Local's free audit is "60 seconds, no signup". Its white-label version (Beacon, $199/mo) turns the grader into an *agency* lead-gen product. **GrowthSignal should copy this**, because agencies buy tools that win them clients.
- Yext Scout and Ahrefs offer free AI checkers.
- LLMrefs, Otterly and Trakkr offer suites of small free tools (llms.txt generator, crawlability checker, fan-out generator, Reddit finder) that rank in search.

**Onboarding (URL to first value)**
- The best flows: domain → auto-suggested prompts by category → first scores in minutes (Peec, LLMrefs "5 minutes", Lighthouse "10 minutes, results next day").
- BrightLocal suggests prompts by business category per location.
- Pitfall: Scrunch reviewers complain about too many auto-generated prompts to delete. Seed a *small, curated* set (for example 10 local intents such as "best [service] near [city]", "emergency [service] [city]").

**Pricing presentation and limits**
- Prompt count is the universal upgrade lever (about 65% of tools, per [stealwhatworks](https://stealwhatworks.com/blogs/news/ai-search-visibility-pricing)).
- Annual discounts run 15–17%. Unlimited seats is now standard.
- Engines beyond 3–4 are add-ons (Peec, Otterly).
- Credit systems (AthenaHQ, Local Falcon, Peec agency) confuse owners. Use "questions × AIs × locations" language instead.
- Avoid an Otterly-style cliff ($29 → $189).

**Proof**
- Leaders use named logo + metric cards (Profound: Plaid +50%, Ramp 7x).
- Category-level original research acts as PR: Trakkr's indexes, Birdeye's "1 in 5 locations invisible in AI search", Yext's "86% of citations from brand-managed sources".
- GrowthSignal could publish a "home services AI visibility index" by city and trade.

**Activation and retention hooks**
- Daily or weekly change alerts, weekly reports (LLMrefs, Peec), and a capped "recommendations per week" on cheap tiers (Otterly).
- GA4 AI-referral attribution (Trakkr, Peec, AthenaHQ) to show traffic, not just mentions.
- Looker Studio connectors and white-label for agency stickiness.

**Acquisition**
- Agency programs: partner directories, pitch workspaces, co-marketing (Otterly, Peec, Scrunch, Rankscale with affiliate commissions).
- SEO "best tools" roundups written by vendors (Lighthouse Local, LLM Pulse, Trakkr review pages).
- G2 badge campaigns (Profound has 1,130 reviews).
- Platform cross-sell (HubSpot, Semrush, BrightLocal).
- AppSumo: no major GEO vendor was found running a lifetime deal; only small tools (e.g. Beeseen) via deal sites.

## 5. Gaps nobody fills well (opportunities for GrowthSignal)

1. **Owner-grade local AI visibility under $50 that also fixes things.**
   - BrightLocal ($31–41) and HubSpot ($45–50) are cheap but recommend only.
   - Done-for-you work costs $1,299/mo (BrightLocal managed SEO) or is an unpriced service (Lighthouse).
2. **Credible location-aware methodology for SMBs.**
   - Only Local Falcon (geo-grid) and BrightLocal (per-location) treat location seriously.
   - Most vendors do not disclose UI vs API collection, even though Surfer's study (1,000 prompts, Aug 2026) found API and UI answers overlap by at most about 30% on brands and 4.8–26.7% on cited domains ([Surfer](https://surferseo.com/blog/llm-scraped-ai-answers-vs-api-results)).
   - Transparent "what a customer in your ZIP actually sees" is a differentiator.
3. **Variance and repeated sampling.** Almost no one discloses repeat runs or confidence. LLMrefs' "aggregated & weighted" is the exception.
4. **Verified outcomes for small businesses.** All outcome claims are enterprise or SaaS and vendor-published; none name a local service business with calls or leads attributed.
5. **Linking AI visibility to the local fundamentals that drive it** (GBP, reviews, citations, service-area pages) in one simple plan. Suites have the parts; AI trackers lack them.
