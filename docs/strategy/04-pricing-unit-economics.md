# Stage 4: Pricing and unit economics

Prices checked 2026-10-03 on provider pages. Full source notes, including readings that disagreed, are in `/mnt/project-files/growthsignal/research/platform-apis-and-costs.md`. Where two readings disagreed we use the higher one.

## 1. Provider unit prices used

| Item | Price | Source |
|---|---|---|
| OpenAI `gpt-6-luna` | $0.10 in, $0.50 out per 1M tokens (one reading showed $0.05 / $0.25) | https://developers.openai.com/api/docs/models/gpt-6-luna |
| OpenAI `web_search` tool | $10 per 1,000 calls | https://developers.openai.com/api/docs/pricing |
| Anthropic `claude-haiku-4-5` | $1 in, $5 out per 1M tokens | https://platform.claude.com/docs/en/about-claude/pricing |
| Anthropic web search | $10 per 1,000 searches; failed searches not billed | https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool |
| Perplexity `perplexity/sonar` (Agent API) | $0.25 in, $2.50 out per 1M tokens | https://docs.perplexity.ai/docs/agent-api/models |
| Perplexity `web_search` tool | $2.50 per 1,000 calls | https://docs.perplexity.ai/docs/agent-api/tools/web-search |
| Gemini grounding (not used, see D-023) | $14 per 1,000 queries after 5,000 free a month (Gemini 3.x) | https://ai.google.dev/gemini-api/docs/pricing |
| Stripe card payments | 2.9% + 30¢; +1.5% international cards | https://stripe.com/pricing |
| Stripe Billing | 0.7% of billing volume | https://stripe.com/billing/pricing |
| Resend email | Free to 3,000 a month (100 a day); Pro $20 for 50,000 | https://resend.com/pricing |
| Render | Web service Starter $7 a month; Postgres Basic $6 a month | https://render.com/pricing |

These are encoded in `src/visibility/pricing.js` and drive the daily AI budget guard.

## 2. Cost per sampled answer

One sample = one question, one platform, one repeat, with web search on.

| Scenario | Assumption | OpenAI | Anthropic | Perplexity | Blend of 3 | Blend of OpenAI + Perplexity (Check) |
|---|---|---|---|---|---|---|
| Low | 3k in, 300 out, 1 search | 1.05¢ | 1.45¢ | 0.40¢ | 0.97¢ | 0.72¢ |
| Expected | 5k in, 500 out, 1 search | 1.08¢ | 1.75¢ | 0.50¢ | 1.11¢ | 0.79¢ |
| High | 15 to 20k in, 1k out, 2 searches | 2.2¢ | 4.5¢ | 1.2¢ | 2.63¢ | 1.70¢ |

Search fees, not tokens, dominate. Search content tokens may or may not be billed by OpenAI (its two pricing pages disagree); the high scenario assumes they are.

## 3. Plans and limits (source of truth: `src/lib/plans.js`)

| | Free | Check $9 | Improve $29 | Grow $59 |
|---|---|---|---|---|
| Sites | 1 | 1 | 1 | 3 |
| Pages per scan | 6 | 15 | 30 | 50 |
| On demand scans a month | 3 | 5 | 20 | 60 |
| Scheduled scan | none | weekly | weekly | weekly |
| Questions | 3 | 5 | 10 | 15 |
| Platforms | 1 | 2 | 3 | 3 |
| Repeats | 1 | 2 | 2 | 2 |
| Scheduled answer samples | one lifetime first look | monthly | monthly | every two weeks, per site |
| On demand sample runs a month | 0 | 1 | 2 | 2 |
| Competitors per site | 0 | 0 | 2 | 5 |
| Fix kit | no | no | yes | yes |
| History | 1 month | 12 months | 24 months | 24 months |

Yearly = 10 months' price. Grow on demand runs were cut from 4 to 2 and platforms from 4 to 3 on 2026-10-03 to keep the worst case above a 60% margin (see below).

## 4. Variable cost per paying customer per month

Samples a month: scheduled plus on demand. Readiness scans cost only compute (a few hundred kilobytes fetched per scan), which is inside the fixed hosting cost at this scale.

| | Samples (low / expected / max) | AI cost low | AI cost expected | AI cost high (max usage, high tokens) |
|---|---|---|---|---|
| Check | 20 / 30 / 40 | $0.14 | $0.24 | $0.68 |
| Improve | 60 / 90 / 180 | $0.58 | $1.00 | $4.73 |
| Grow | 195 / 480 / 766 | $1.89 | $5.33 | $20.15 |

Grow max: 3 sites × 90 samples × 2.17 runs a month, plus 2 on demand runs of 90.

Other variable costs:

| | Check $9 | Improve $29 | Grow $59 |
|---|---|---|---|
| Stripe (2.9% + 30¢ + 0.7%) | $0.62 | $1.34 | $2.42 |
| Email | under $0.01 | under $0.01 | under $0.01 |
| Support (0.1 tickets a month × 10 min × $40/hr = $0.67; low half, high double) | $0.33 / $0.67 / $1.33 | same | same |

## 5. Contribution margin by plan

| | Low | Expected | High |
|---|---|---|---|
| Check $9 | $1.09 cost, **88%** | $1.53, **83%** | $2.63, **71%** |
| Improve $29 | $2.25, **92%** | $3.01, **90%** | $7.40, **74%** |
| Grow $59 | $4.64, **92%** | $8.42, **86%** | $23.90, **60%** |

Annual plans: one Stripe fee a year, so Check annual saves about $0.32 a month in fees.

## 6. Fixed monthly costs

| Item | Launch | At 500 customers |
|---|---|---|
| Hosting: Render web $7 + Postgres $6 | $13 | $25 web + $20 to $50 database |
| Email: Resend free, then Pro | $0 | $20 |
| Domain, error monitoring, misc | $5 to $10 | $30 |
| Total | **about $20 to $25** | **about $100 to $125** |

Founder time is excluded and is the real constraint.

## 7. Portfolio scenarios (monthly)

Mix assumption [H]: 50% Check, 35% Improve, 15% Grow. Free accounts cost about 3¢ each once (one first look sample), plus anonymous scans at compute cost.

| | 20 customers | 100 customers | 500 customers |
|---|---|---|---|
| MRR | $470 | $2,350 | $11,750 |
| Variable cost (expected) | $62 | $308 | $1,540 |
| Free accounts (10 per paid, 3¢) | $6 | $30 | $150 |
| Fixed | $25 | $45 | $125 |
| Contribution after fixed | $377 (80%) | $1,967 (84%) | $9,935 (85%) |
| Same with high variable costs (everyone at max usage) | $289 (61%) | $1,526 (65%) | $7,730 (66%) |

Abuse and runaway cost are bounded by `AI_DAILY_BUDGET_CENTS` (default $20 a day, $600 a month): when reached, samples are recorded as unavailable instead of spending. Raise it as customers grow: roughly 5% of daily MRR is a safe setting.

## 8. Upgrade triggers built into the product

- Free to Check: the first look shows real answers; monitoring, weekly regression alerts and a second platform need Check. The free sample button turns into "Compare plans" once used.
- Check to Improve: the owner wants to fix things (fix kit with JSON-LD, facts block, FAQ draft), see two competitors, or sample on three platforms.
- Improve to Grow: a second or third site (web designers, multi brand owners), five competitors, samples every two weeks.
- Each limit message in the app names the plan that lifts it.

## 9. The $7.99 question

**Recommendation: no $7.99 entry subscription. Free scan plus free account first, then $9 Check.**

- A $7.99 subscription that mainly delivers a one time audit churns after the first report. The audit is better as the free acquisition step, where it competes with HubSpot's free AEO Grader.
- At $7.99, Stripe takes 7.4% versus 6.9% at $9, and revenue is 11% lower for no meaningful conversion gain. Both prices sit far under the paid floor of the category (Otterly $29, BrightLocal $31 to $41, HubSpot AEO $45 to $50).
- A one time paid audit ($29 to $49) was considered. It conflicts with the free scan and adds support (owners expect a human). Deferred; revisit if owners ask for a "report I can hand my web designer" more than for monitoring.
- Improve moved from the $24.99 hypothesis to $29 and Check from $7.99 to $9. Round numbers read as more confident; the fix kit is the clearest paid value and stays well under the $45 to $79 competitor band.

## 10. What would change these numbers

- Search tool price changes (largest cost driver). The budget guard and `pricing.js` must be updated together.
- Usage far above expected on Grow: reduce on demand runs further or sample biweekly on one site only.
- Churn above 10% a month: the economics still work per customer, but CAC payback lengthens beyond what organic channels can fund.
