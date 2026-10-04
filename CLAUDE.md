# GrowthSignal.ai

## Goal
Build a lean, affordable self-service AI visibility product for small businesses. Owner: Adam Sandler. Domain: growthsignal.ai.

## Current state
Working product on branch claude/growthsignal-launch-w4g88i (PR #1): free readiness scan, magic link accounts, AI answer sampling through official APIs (OpenAI, Perplexity Agent API, Anthropic; Gemini disabled pending legal review), Stripe billing, monitoring, fix kit. See README.md and docs/readiness.md. The original static site's sample reports remain, clearly labeled as fictional examples.

## Pricing
Free scan and free account, then Check $9, Improve $29, Grow $59 a month (yearly = 10 months). Limits live in src/lib/plans.js. Reasoning in docs/strategy/04-pricing-unit-economics.md.

## Build priorities
Research current competitors and official API capabilities. Select an initial customer segment. Distinguish website readiness from sampled AI visibility. Build a real scan and evidence-backed report, then accounts, billing, monitoring and action workflows. Minimal onboarding and no mandatory sales calls.

## Evidence and claims
Never guarantee AI placement or indexing. API results may differ from consumer apps. Scores need transparent rubrics. Never present sample data as real scans. Do not invent testimonials or endorsements. YC/Harvard credentials refer to the founder's previous Bensen venture; WIRED/TechCrunch press cards and borrowed industry quotes were removed (D-013). No X.Wave branding.

## Engineering
Inspect before editing. Start lean, protect scanning against SSRF and malicious crawled content, keep secrets server-side, enforce plan limits, verify payment webhooks, and isolate customer data. Test meaningful customer flows. Document unavailable integrations honestly.

## Launch
Prepare deployable implementation and precise setup steps. Obtain explicit authorization before real charges or DNS changes. Do not change the current hosted site's audience automatically.
