# Architecture

```
Browser (public/: vanilla JS, existing dark/lime design)
   │  JSON over HTTPS, session cookie (HttpOnly, SameSite=Lax)
   ▼
Express app (src/server.js) ── Stripe webhook (raw body, signature verified)
   │                ▲
   ▼                │ enqueue
Postgres ◄──── Job worker + scheduler (src/jobs/) ──► crawler (src/scanner/, SSRF safe)
                                                  └─► AI APIs (src/visibility/providers.js)
                                                  └─► email API (src/lib/email.js)
```

One process by default (`ROLE=all`). Split into `ROLE=web` and `ROLE=worker` services when needed; both share Postgres.

## Modules

| Path | Responsibility |
|---|---|
| `src/config.js` | Environment parsing, production validation (refuses to start with unsafe settings) |
| `src/db/` | pg pool, transactional SQL migrations (`migrations/*.sql`, applied at startup under an advisory lock) |
| `src/lib/safe-fetch.js` | SSRF resistant fetcher: scheme and port allowlist, connect time DNS validation (blocks private, loopback, link local, CGNAT, metadata, mapped IPv6), manual redirects re-validated, decompressed size cap, timeout |
| `src/scanner/` | Crawl (`crawl.js`), extraction (`extract.js`), robots.txt (`robots.js`), rubric (`checks.js`), report and comparison (`report.js`) |
| `src/visibility/` | Prompt generation, provider adapters, mention and citation detection, run orchestration and summary |
| `src/improve/fixkit.js` | Owner fact validation and deterministic fix generation |
| `src/lib/plans.js` | Plans and limits, the single source for enforcement, pricing UI and FAQ |
| `src/lib/entitlements.js` | Plan lookup from subscriptions, atomic usage counters, global AI budget |
| `src/lib/billing.js` | Checkout, portal, webhook verification, idempotent event processing |
| `src/lib/auth.js` | Magic link tokens, sessions (only SHA-256 hashes stored) |
| `src/jobs/` | Queue with leases and retries, handlers, scheduler, cleanup |
| `src/services.js` | Shared domain operations used by routes and jobs |

## Security controls

- Secrets only in environment variables, never sent to the browser. `/api/config` exposes plan data and whether integrations are connected, not keys.
- CSP `default-src 'self'`, no third party scripts, frames denied, HSTS in production.
- CSRF: SameSite=Lax cookies plus an Origin check on every non-GET request (webhook excluded; it is signature verified).
- Account isolation: every site query is scoped by `user_id`; scans owned by an account return 404 to everyone else. Tested.
- Rate limits in Postgres: anonymous scans per IP hash per hour and globally per day, login emails per address and IP, inquiries per IP.
- Crawled content is untrusted: scripts and styles stripped before text extraction, every stored string capped, rendered with `textContent` only, never sent to a model.
- Model output is untrusted: stored as text, rendered with `textContent`, links rendered only for http(s) with `rel="noopener noreferrer nofollow ugc"`.
- Webhooks: signature and timestamp verified by the Stripe library; event ids stored for idempotency; out of order events ignored using `event.created`.
- Logs are JSON, with masked emails and no tokens or crawled content.
- Account deletion cascades all customer data.
