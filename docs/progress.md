# Progress notes

## 2026-10-03
- Seeded the empty repo with the original static site on `main`; all work on `claude/growthsignal-launch-w4g88i` (PR #1).
- Stage 1 verdict: revise, then go. Local service businesses first, free scan entry, $9 Check.
- Built the full product: scanner, rubric, accounts, AI sampling, billing, monitoring, fix kit, share links, inquiry form, deletion.
- Research (competitors, SEO suites, provider APIs, terms, crawlers, costs) saved to `docs/research/`.
- Research changed the build: Perplexity moved to the Agent API (Sonar chat completions ended 2026-09-27); Gemini disabled because Google's grounding terms restrict analyzing results; uncited retrieved sources no longer count as citations; Grow cut to 3 platforms and 2 on demand runs; Applebot added as a search crawler.
- Verification: 30/30 automated tests, 15/15 browser journey checks, in a sandbox without internet. No deploy yet.
- Next: credentials, deploy to Render in Stripe test mode, smoke test on real sites, then authorization for live billing and DNS.
