# Stage 1: Business pressure test

Date: 2026-10-03. Labels: **[F]** fact with source, **[A]** assumption, **[H]** hypothesis to validate with customers. Sources are in `docs/strategy/02-competitive-research.md` and `/mnt/project-files/growthsignal/research/`.

## Verdict: REVISE, then go

The original concept (a broad, $7.99 "AI visibility" subscription for any small business) is weak. It sells an abstract category to owners who do not understand it, at a price that cannot fund acquisition, against incumbents that already bundle the same feature. A narrower version is viable as a lean, low touch business:

1. **Segment:** owner run, single location local service businesses in the US (home services first), plus the freelancers who build their websites.
2. **Entry offer:** a free, instant, evidence backed website scan (no signup), then a free account that saves it and runs one real AI answer sample. Paid starts at $9/month, not $7.99.
3. **Wedge:** "tell me exactly what is wrong and what to fix, and prove it with evidence", not a tracking dashboard. Readiness (controllable) and observed visibility (sampled) are kept separate and both are explained in plain language.
4. **Recurring value:** weekly change detection on the website, scheduled answer sampling with repeats, competitor comparison, accuracy alerts, and fix verification.

This is a "go" for launching and learning cheaply. It is not yet evidence of a large business. The most likely outcome without strong distribution is a small, profitable product; the upside case depends on partner distribution and conversion from the free scan.

## 1. Problem, urgency, willingness to pay

- **[F]** Consumer use of AI for local recommendations is rising fast: BrightLocal's Feb 2026 survey (1,002 US adults) reports 45% used AI for local recommendations, up from 6% a year earlier. Its July 2026 study found 23% used AI in their most recent local search, but only 8% started there and only 18% would contact an AI recommended business without checking further. Vendor research, directionally credible.
- **[F]** Local AI answers lean heavily on third party sources: in BrightLocal's 1.9M citation analysis, Google Business Profile is 28.5% of local AI citations and Yelp 8.5%, and roughly 93% of cited sites are business websites when counted by site. SOCi data (via Search Engine Land) shows AI assistants recommend a small share of locations compared with Google's local pack.
- **[F]** Bluehost (350 small businesses, May 2026): 87% are not acting on AI search, 31% do not know how, 78% want to see how competitors appear.
- **[A]** The problem is real but **not urgent** for most owners today. AI is a minority of discovery and owners still prioritize Google, reviews and referrals. Urgency appears when an owner personally sees ChatGPT recommend a competitor, or a customer says "I found you on ChatGPT".
- **[F]** Micro business marketing budgets are small: 90.5% of UENI's 7,413 micro businesses plan to spend under $200 a month on marketing, 26% plan $0.
- **[H]** Owners will pay $9 to $29 a month for a clear, trustworthy answer plus a short fix list. Must be validated with the first 50 paying customers.

## 2. Do owners understand "AI visibility" enough to self serve?

No, not as a category. They understand concrete questions: "When someone asks ChatGPT for a plumber in Denver, do I come up?" and "Is something on my website stopping it?". The product and site therefore lead with the customer question and a free, instant result, never with "GEO" or "AEO" jargon. The free scan does the education. **[A]**

## 3. Segment choice

| Segment | Pain | Reachable demand | Willingness to pay | Support burden | Verdict |
|---|---|---|---|---|---|
| Local service (home services) | High value jobs; competitors visible in AI | Trade groups, Facebook groups, web designers, local SEO content | Moderate; used to paying for leads | Low if self serve; sites on Wix, Squarespace, WordPress | **Choose** |
| Multi location | Higher, but enterprise | Sales led | High | High; Yext, Birdeye, BrightLocal serve them | Later, via Grow and agencies |
| Ecommerce | Product answers driven by marketplaces and reviews | Large | Moderate | Product catalog complexity | No: different problem |
| Agencies | Need client reporting | Concentrated, reachable | High | Medium | **Channel**, not first customer |
| B2B companies | Real interest | Reachable | Higher | Low | No: crowded by Peec, Otterly, Profound, HubSpot |

Why home services first: a single job is worth hundreds to thousands of dollars, so one customer pays for a year; questions are naturally local ("best roofer in Tulsa"); facts that matter (phone, service area, hours, licenses) are exactly what a website scan can check; and owners already pay for marketing and lead generation. The other 12 sample categories stay on the site as labeled examples; the product works for any local business.

## 4. Recurring value after the first audit

The first audit is the hook, not the product. Recurring value has to come from things that change:

- Websites regress (a redesign adds noindex, a plugin blocks crawlers, the phone changes). Weekly scans with alerts catch this. **[A]** frequency of regressions is unknown; we will measure it.
- AI answers change constantly. Scheduled samples with repeats show the trend, the competitors named, and the sources cited.
- Fix, verify, repeat: Improve generates fixes and the next scan verifies them.
- Accuracy: answers that repeat a wrong phone number are flagged.

**Risk:** once fixes are done, the readiness score plateaus and the owner may cancel. Retention must rest on monitoring and competitor context, and annual plans should be pushed at the moment of first value.

## 5. What owners can do for free

- **[F]** Free one time graders exist (HubSpot AEO Grader, Insites). Bing Webmaster Tools shows Copilot citation data (preview). Google Search Console added AI Overview and AI Mode impression reports (rolling out). Wix and Squarespace bundle basic AI visibility checks.
- **[A]** A motivated owner can reproduce most of a one time diagnosis in one or two hours. Repeated multi platform sampling, change detection and a prioritized fix plan are much harder to do by hand.
- Implication: the free scan must be better than free graders on evidence and specificity, and the paid plan must sell monitoring, verification and fixes.

## 6. Defensible wedge

Not technology. The defensible parts are: (1) trust through radical transparency (published rubric, every answer and source shown, uncertainty ranges, clear limits), (2) an owner first experience that turns findings into ready to paste fixes, (3) the lowest friction path from "curious" to "useful result" (no signup, under a minute), and (4) distribution through web designers and local trade communities. Over time, aggregate data on which sources AI cites per trade and city becomes a content and partnership asset. **[H]**

## 7. Acquisition, retention, support, margins

- **CAC [A]:** paid search for "AI visibility" will not pay back at $9 to $29. Acquisition must be organic: the free scan itself, trade and city specific content, web designer partners, and community posts. Target blended CAC under $40.
- **Retention [A]:** SMB SaaS churn commonly runs around 6 to 7% of users a month (Baremetrics via Vitally) **[F, second hand]**. Plan for 6 to 8% monthly churn on monthly plans; annual plans reduce it.
- **Support [A]:** design for under 1 ticket per 10 customers a month: plain language reports, FAQ, no setup, email only.
- **Gross margin:** modeled in Stage 4. Variable cost per paying customer is dominated by AI API calls and payment fees, and stays under roughly 15% of revenue at the chosen limits.

## 8. What must be true

1. At least 3% of free scans become free accounts and at least 5% of free accounts become paid within 60 days. **[H]**
2. Monthly churn at or below 7% on monthly plans after month three. **[H]**
3. Organic and partner channels deliver at least 300 free scans a month by day 90 at near zero paid spend. **[H]**
4. AI providers keep official APIs with web search available at roughly current prices. **[A]**
5. Owners act on fixes often enough to see change, or value the monitoring alone. **[H]**

## Smallest commercially useful revision

Keep GrowthSignal's concept and brand. Change three things: focus on local service businesses, replace the $7.99 entry subscription with a free scan plus $9 Check, and make "evidence plus fixes" (not tracking) the core promise. All three are implemented in this repository.
