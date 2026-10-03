# Decision log

Newest last. Each entry: decision, reason, how to revisit.

- **D-001 (2026-10-03) Seed repo from the uploaded source archive.** The GitHub repo was empty. `main` holds the original static site as the first commit; all work is on `claude/growthsignal-launch-w4g88i` via PR #1. `.openai/hosting.json` excluded so the old hosting identity is not reused.
- **D-002 Verdict: revise, then go.** See `docs/strategy/01-business-pressure-test.md`. Narrow segment, free entry, evidence plus fixes as the promise.
- **D-003 Initial segment: US single location local service businesses, home services first; web designers as channel.** Highest pain to reach ratio and the facts a website scan can check matter most for them.
- **D-004 Entry offer: free instant scan plus free account sample, then $9 Check.** $7.99 subscription for a one time audit would churn after the first report; free beats it for acquisition. $9 keeps a low monthly entry under BrightLocal's $31 to $41 local AI tracker while funding monitoring.
- **D-005 Prices: Check $9, Improve $29, Grow $59 per month; yearly = 10 months.** Unit economics in `docs/strategy/04-pricing-unit-economics.md`. Revisit after 50 paying customers.
- **D-006 Keep readiness and observed visibility as separate results; never one blended score.** Readiness is controllable and verifiable; visibility is sampled and noisy.
- **D-007 Official APIs only for answer sampling.** Consumer app scraping is restricted by provider terms and fragile. UI always states API versus app differences.
- **D-008 Architecture: one Node 22 Express service plus Postgres; Postgres backed job queue; vanilla JS front end reusing the existing design.** Fewest moving parts for a solo operator; no Redis, no build step. Revisit if job volume exceeds one instance (run `ROLE=worker` separately).
- **D-009 Passwordless email sign in.** No password resets or storage; the email is the account. GET on the link shows a confirm button so mail scanners cannot consume tokens.
- **D-010 Stripe Checkout and Customer Portal; webhooks are the only writer of plan state.** Minimal billing code, PCI scope stays with Stripe, cancellation self serve. Live keys refused unless `STRIPE_ALLOW_LIVE=true`.
- **D-011 Fix kit is deterministic, generated only from owner confirmed facts.** No model invents facts; nothing is applied automatically to customer sites.
- **D-012 No live AI chatbot.** Cost and claim risk exceed value now. FAQ assistant relabeled "prewritten answers, not a live AI" and reads prices from the server.
- **D-013 Removed borrowed industry quotes (Lily Ray, Heather Hornor) and WIRED/TechCrunch press cards.** They were about competitors or the category and read as social proof GrowthSignal does not have. Replaced with a published methodology and an honest founder note. Bensen YC W19 and Launch Lab X kept, labeled as Bensen's.
- **D-014 Crawler classification.** Search: Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot, PerplexityBot. User triggered: ChatGPT-User, Claude-User, Perplexity-User. Training: GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot. Based on operator documentation as known at build time; the API research pass is verifying each against current docs. Google-Extended is documented as controlling use for Gemini training and grounding but not Google Search; it is treated as training and not scored. Revisit if verification shows otherwise.
- **D-015 llms.txt reported, not scored.**
- **D-016 Self hosted fonts.** Removes Google Fonts requests (privacy, CSP, speed).
- **D-017 Native inquiry form replaces the Jotform embed.** Stored in our database, emailed to `OPERATOR_EMAIL`, rate limited, honeypot; no third party frame. The Jotform form still exists and can be retired.
- **D-018 Grow sampling every two weeks with 2 repeats (not weekly with 3).** Keeps worst case AI cost per Grow account with 3 sites within margin target.
- **D-019 Daily global AI budget guard (`AI_DAILY_BUDGET_CENTS`, default $20).** Bounds abuse and runaway cost; affected samples are marked unavailable, not silently dropped.
- **D-020 Public share links require ownership verification.** Prevents publishing reports about sites one does not own.
- **D-021 Anonymous preview shows score, categories and top 3 fixes; evidence needs a free account.** Fast first value plus an email for lifecycle; account gate protects AI spend.
- **D-022 Default model choices are the cheapest web search capable models per provider, configurable by env.** Pending price verification from the API research pass.
