# Stage 6: Go-to-market plan

Built for one founder with limited time and a small budget. Every target number is a hypothesis to test, not a forecast.

## Segment, trigger, message, offer

- **Initial customer:** owner of a US single location home or local service business (plumbing, HVAC, electrical, roofing, cleaning, landscaping, pest control, moving), 1 to 20 staff, with a website built on WordPress, Wix, Squarespace or GoDaddy.
- **Buying trigger:** the owner (or a customer) notices ChatGPT or Google's AI answer naming competitors; a web redesign; a slow month; hearing about "AI search" from a peer or vendor.
- **Core message:** "Customers are asking AI for a local pro. See whether it names you, and exactly what to fix. Free, in a minute."
- **Offer:** free instant scan, free account with one real AI answer sample, then Check $9, Improve $29, Grow $59 a month (2 months free yearly).

## Channels ranked by expected efficiency

| Rank | Channel | Why | Cost | First action |
|---|---|---|---|---|
| 1 | The free scan as the product's own acquisition loop | Fast, specific value; every report invites saving and sampling | API cost only for accounts | Live at launch |
| 2 | Web designers and freelancers who build local business sites | One partner reaches dozens of owners; Grow covers 3 client sites, verified share links | Time | Recruit 20 via Upwork, Facebook groups, Wix/Squarespace expert directories |
| 3 | Trade and city specific content | Search demand like "how to get my plumbing business on ChatGPT" is new and uncrowded locally | Writing time | 10 trade pages, then trade by top 25 metro templates only where data supports it |
| 4 | Trade communities | Owners trust peers: r/Plumbing, r/HVAC, r/smallbusiness, trade Facebook groups, local BNI chapters | Time | Share aggregate findings ("we scanned 200 plumber sites; 31% block a search crawler") |
| 5 | Industry associations and trade newsletters | Credible distribution | Low; possibly member discount | Pitch a member benefit after the first 30 customers |
| 6 | Directory and "tools" listings | Product Hunt, G2, Capterra, AI tool directories | Free | Launch week |
| 7 | Paid search and social | Entry price cannot support it at launch | High | Test only after LTV is measured; cap $300 a month |

Founder led demos are not a channel. Inquiries get an email answer.

## First 25 customers

1. Run the scanner on 200 public home services sites across 10 metros (public pages only, our crawler identifies itself) to produce an aggregate, anonymized findings post. No individual business is named.
2. Publish the post and a trade specific landing page. Share in 5 communities where self promotion rules allow it.
3. Personally email 20 web designers with an offer: free Grow for 3 months for their own client sites in exchange for feedback.
4. Offer the first 50 paying customers a founding price locked for 12 months (same plan, 30% off) via a Stripe coupon.
5. Ask every early paying customer one question by email: "What made you pay?". Use their words on the site, only with permission, and never invent testimonials.

## Search and content

- One page per trade (plumbers, HVAC, electricians, roofers, cleaners, landscapers): what AI answers cite for that trade, the five most common gaps, a free scan.
- "Free tools" pages: robots.txt AI crawler checker, LocalBusiness schema generator. Both reuse existing code and capture search demand.
- Quarterly data post from anonymized aggregate scans.
- City pages only when we have enough real aggregate data for that city; no thin doorway pages.

## Partnerships and referral

- **Web designer program:** Grow at a partner discount, verified share links to hand reports to clients, and a 20% recurring referral commission through Stripe coupon codes or a simple referral link (implement after 10 partners ask for it).
- **Referral for owners:** give one month free to both sides. Deferred until monthly churn is known.

## Assessed ideas

| Idea | Customer value | Economics | Decision |
|---|---|---|---|
| Free scan | High: instant, specific | Readiness scan costs fractions of a cent; no AI spend without an account | **Ship (done)** |
| Shareable report | Useful for owners to hand to a web person | Free virality; abuse risk handled by ownership verification | **Ship (done, paid plans, verified owners)** |
| Website badge | Low for customers; "AI ready" badge would imply a guarantee | Small backlink value | **Do not ship** |
| Agency distribution | High leverage | Good; Grow covers 3 sites | **Pursue now**, add an agency plan once 5 partners need more than 3 sites |
| Industry landing pages | High when backed by real data | Cheap | **Ship progressively** |

## Lifecycle email

Implemented now: sign in link, AI sample complete, weekly change digest (only when something changed), subscription started, cancellation confirmation, inquiry notification to the operator. Payment receipts and failed payment dunning are sent by Stripe (enable in Stripe settings).

To add in the first 60 days (via the same email module):
1. Day 0 after free account: "Your three fixes, in order" (only if fixes exist).
2. Day 3: "What AI said about you" summary with the free sample; invite to Check.
3. Day 10 for free accounts with a score under 65: "Fixing one thing" with the top fix.
4. Day 25 paid: monthly summary; ask for the one question survey.
5. Before annual renewal: summary of what changed over the year.

## Activation and retention experiments

1. Require business name and town on the free scan versus optional (activation and sample quality).
2. Show the top fix with a copyable snippet in the free preview versus account only.
3. Default annual billing toggle versus monthly.
4. Weekly digest always versus only on change.
5. Competitor suggestion from answer samples ("these 3 businesses appeared in your answers; track them?").

## Metrics and decision thresholds

| Metric | Definition | 90 day target [H] | Decision rule |
|---|---|---|---|
| Activation | Free scan that completes and is viewed | 85% of started scans | Under 70%: fix scanner errors and speed |
| Account conversion | Free accounts / completed anonymous scans | 8% | Under 4%: change gate and preview |
| Paid conversion | New paid / new free accounts within 60 days | 5% | Under 2% after 300 accounts: revisit offer and price |
| Repeat usage | Paid customers opening a report or email in a month | 60% | Under 40%: rework digest and monitoring value |
| Monthly churn | Paid cancellations / paid at start of month | 7% or less after month 3 | Over 10%: push annual, add value, or narrow segment |
| Support burden | Tickets per 100 paying customers per month | 10 or fewer | Over 20: fix the top 3 causes in product |
| Contribution margin | (Revenue minus AI, payments, email, support time at $40/hr) / revenue | 75% or more | Under 60%: reduce sampling limits |

## 30/60/90 days

- **Days 0 to 30:** connect production credentials, launch with Stripe test mode then live after authorization, publish the methodology and first trade page, recruit 10 web designer partners, run the 200 site study, launch on Product Hunt and directories. Goal: 300 free scans, 30 accounts, first 5 paid.
- **Days 31 to 60:** lifecycle emails 1 to 3, two free tool pages, three more trade pages, founding price for first 50, interview 10 paying customers by email. Goal: 1,000 cumulative scans, 25 paid.
- **Days 61 to 90:** evaluate thresholds above; decide on agency plan, referral program and any paid test. Goal: 50 paid, churn measured.

## Budget assumptions (monthly, first 90 days)

Hosting and database about $25 to $45, email $0 to $20, AI sampling under $100 at 50 customers plus free samples (hard capped by `AI_DAILY_BUDGET_CENTS`), domain and misc $10, optional paid test up to $300 in month 3 only. Founder time 8 to 10 hours a week, mostly content and partner outreach.
