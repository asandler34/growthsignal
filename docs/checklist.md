# Implementation checklist

Status as of 2026-10-03. ✓ done and tested in sandbox, ◐ done and awaiting credentials, ○ not started.

## Strategy
- ✓ Stage 1 business pressure test (`docs/strategy/01`)
- ✓ Stage 2 competitive research and positioning (`02`, `docs/research/`)
- ✓ Stage 3 product definition and methodology (`03`, `/methodology`)
- ✓ Stage 4 pricing and unit economics (`04`)
- ✓ Stage 6 go to market plan (`06`)
- ✓ Stage 7 readiness assessment (`docs/readiness.md`)

## Product
- ✓ Homepage rewritten: scan form, A/B/C explanation, labeled samples, honest pricing, founder note, native inquiry form, labeled FAQ assistant
- ✓ SSRF safe crawler, robots.txt, sitemap, page selection
- ✓ 19 check readiness rubric with evidence; preview vs full report
- ✓ Magic link accounts, sessions, CSRF defense, rate limits
- ✓ Sites, saved scans, history, comparison, change digest
- ✓ AI sampling pipeline with repeats, intervals, competitors, accuracy flag, budget guard
- ◐ OpenAI, Perplexity Agent API, Anthropic adapters (keys needed)
- ○ Gemini (disabled; legal review)
- ◐ Stripe Checkout, Customer Portal (keys and prices needed); ✓ webhook verification, idempotency, ordering
- ✓ Server side plan enforcement
- ✓ Fix kit (JSON-LD, facts block, FAQ draft, robots advice)
- ✓ Ownership verification and share links
- ◐ Transactional email (Resend key and domain needed)
- ✓ Account deletion
- ✓ Terms and Privacy drafts (◐ entity details and legal review needed)

## Operations
- ✓ Dockerfile, render.yaml, .env.example, CI workflow
- ✓ Migrations at startup, scheduler, cleanup
- ✓ Operator guide (`docs/operations.md`)
- ○ Deploy (needs hosting account)
- ○ Stripe live mode, DNS (need Adam's authorization)

## After launch
- ○ Lifecycle emails day 0/3/10/25
- ○ Trade landing pages and aggregate study
- ○ Web designer partner program
- ○ GA4 AI referral attribution
