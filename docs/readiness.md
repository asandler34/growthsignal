# Launch readiness assessment

Date: 2026-10-03. Branch `claude/growthsignal-launch-w4g88i`, PR #1.

**Where things were tested.** Everything below marked "tested" ran in a sandbox: 34 automated integration, security and adapter tests (`npm test`, Postgres 16) and a 17 check Playwright browser journey (`npm run e2e`). The sandbox had no outbound internet. So real websites were not crawled (local fixture sites stand in for them), and AI providers, Stripe and email were not called. AI providers are exercised against a test stub that returns their documented response shapes. Stripe webhooks are exercised with real signature verification against locally signed events. Nothing has been deployed.

## Implemented and tested

| Area | What was verified |
|---|---|
| Free scan | Real crawl of fixture sites: robots.txt, sitemap, priority pages, 19 check rubric, evidence per check, preview limited to score, categories and top 3 fixes; one free AI answer (when name, type and town are given) and a ready to paste starter fix |
| Scanner safety | Private, loopback, link local, metadata, CGNAT and mapped IPv6 blocked at connect time; redirect to metadata blocked; size, decompression bomb and slow server limits; hostile page content rendered as text |
| Errors | Unreachable sites give a plain error; failed scan jobs retry with backoff, then report |
| Accounts | Magic link sign in, single use tokens, mail scanner safe confirm step, CSRF origin check, rate limits on scans and sign in |
| Isolation | A second user cannot read or change another user's sites, scans or runs (404) |
| Saved reports | Claim preview into an account, history, comparison with previous scan, change digest email on regression |
| AI sampling pipeline | Prompts × platforms × repeats, mention and citation detection, retrieved but uncited sources excluded, competitor mentions, phone accuracy flag, Wilson intervals, provider errors and unconnected platforms shown and excluded from rates, daily budget guard |
| Provider adapters | OpenAI Responses, Anthropic Messages and Perplexity Agent API parsing against documented shapes; Gemini disabled by default |
| Plan enforcement | Server side limits for sites, scans, prompts, runs, competitors, fix kit; free first look used once |
| Billing logic | Webhook signature required, duplicate events ignored, out of order events ignored, cancellation downgrades; checkout requires sign in and a known plan; live keys refused without explicit flag |
| Fix kit | Generated only after owner confirms facts; JSON-LD escapes script breaking input |
| Share links | Require verified ownership |
| Inquiry form | Stored, operator notified, honeypot drops spam |
| Account deletion | Typed confirmation, data removed |
| Front end | Full journey in Chromium; no console errors; no horizontal scroll at 375px on four pages; skip link first; samples labeled; no borrowed testimonials |

## Implemented, awaiting credentials or access

| Item | Needs | Notes |
|---|---|---|
| Live website crawling | A deployed instance with internet | Same code path as fixtures; first real scans should be watched |
| OpenAI, Perplexity, Anthropic sampling | API keys | Request shapes follow docs read 2026-10-03; Perplexity Agent API nesting of `user_location` under `filters` should be confirmed on the first live call |
| Stripe Checkout, Customer Portal, plan changes | Stripe test keys, 6 price ids, webhook secret | Steps in `docs/operations.md` §4 |
| Transactional email | Resend key and a verified sending domain | Domain verification needs DNS records |
| Hosting | Render account (or any Docker host) and Postgres | `render.yaml`, `Dockerfile` ready |
| CI | GitHub Actions on PR #1 | Workflow committed; first run result to be confirmed on GitHub |

## Deferred (deliberately not in v1)

- Gemini sampling (legal review of grounding terms, D-023).
- Consumer app observation (provider terms prohibit automation, D-028).
- Live AI chat assistant (D-012); the FAQ assistant is labeled as prewritten.
- Lifecycle emails beyond the transactional set (day 0, 3, 10, 25 sequence in the GTM plan).
- GA4 AI referral attribution, agency plan, referral program, white label reports.
- Verification of third party listings (Google Business Profile, Yelp).
- Data export (removed from the privacy page until built).

## Blocking launch

1. **Credentials:** Stripe test keys and prices, at least one AI key (OpenAI recommended first), Resend key. Without AI keys the product still works as a readiness scanner and says sampling is not connected.
2. **Email domain DNS** (SPF/DKIM) **[needs Adam's authorization]**. Sign in depends on email.
3. **Legal pages:** `terms.html` and `privacy.html` are drafts written for this product. They need the operating legal entity name, address and governing law, and a lawyer's review.
4. **Going live on billing** **[needs Adam's authorization]**: Stripe account activation and live keys.
5. **Domain** **[needs Adam's authorization]**: point `growthsignal.ai` at the host, or launch on the host's default domain first.

## Exact launch steps

1. Merge PR #1 into `main`.
2. Create the Render Blueprint from `render.yaml`; fill secrets (`docs/operations.md` §3).
3. Create Stripe test products and prices, webhook and portal (§4). Run the five test purchases.
4. Create the Resend domain; after authorization add DNS records (§5).
5. Add OpenAI, Perplexity and Anthropic keys; set provider side monthly usage limits (§7).
6. Smoke test on the live host: scan three real local business sites you own or have permission to test, sign in, run the free sample, buy Check in test mode, cancel in the portal.
7. Fill entity details in Terms and Privacy; legal review.
8. After authorization: Stripe live mode, live webhook, `STRIPE_ALLOW_LIVE=true`, redeploy.
9. After authorization: point the domain, update `BASE_URL` and the webhook URL.
10. Start the GTM day 0 to 30 plan.

## Biggest remaining business risk

**Will owners pay monthly for something they cannot see working?** The readiness score plateaus once fixes are made, and the AI samples are API answers that can differ from what a customer sees in the app (Surfer measured at most about 30% overlap in brand mentions). If owners do not trust or value the samples, retention depends only on regression alerts, which may not justify $9 to $29 a month. The first 50 paying customers must answer this: watch month 2 to 3 churn and the "what made you pay" replies, and be ready to repackage as a lower priced annual monitor plus one time fix help if monthly churn exceeds 10%.
