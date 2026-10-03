# Operations guide

Everything needed to deploy, configure and run GrowthSignal. Steps marked **[needs Adam's authorization]** must not be done without it.

## 1. What runs

- One Node 22 process (`npm start`) serving the website, the JSON API, the Stripe webhook, a Postgres backed job worker and a scheduler. `ROLE=all` by default; set `ROLE=web` and `ROLE=worker` on two services to split them later.
- One Postgres 16 database. Migrations in `src/db/migrations/` apply automatically at startup under an advisory lock (safe with several instances). Manual run: `npm run migrate`.
- Health check: `GET /healthz` (checks the database).

### Scheduled work (inside the worker, no external cron needed)

| Job | When | What |
|---|---|---|
| `schedule` | every 10 minutes (`SCHEDULER_INTERVAL_MS`) and on purchase | Queues weekly readiness scans and monthly or biweekly answer samples for active paid subscriptions |
| `scan` | on demand and scheduled | Crawl and score, compare with the previous scan, email a digest only when something changed |
| `visibility` | on demand and scheduled | Ask the configured platforms; retries with backoff; failed samples are recorded, never hidden |
| `cleanup` | one minute after start, then daily | Expired tokens and sessions, anonymous scans older than 30 days, history beyond each plan's retention, old job rows |

Jobs retry with exponential backoff (up to the job's attempt limit) and are deduplicated so a site never has two scheduled runs queued.

## 2. Environment variables

See `.env.example` for the full list with comments. Production refuses to start without: `SESSION_SECRET` (32+ characters), an `https` `BASE_URL`, a real `EMAIL_PROVIDER` (`resend` or `postmark`) and its key. It also refuses `sk_live_` Stripe keys unless `STRIPE_ALLOW_LIVE=true`.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Render injects it from the database |
| `DATABASE_SSL` | managed DBs that need TLS | `true` |
| `BASE_URL` | yes | e.g. `https://growthsignal.onrender.com` until DNS is approved |
| `SESSION_SECRET` | yes | Render generates it |
| `OPERATOR_EMAIL` | yes | Receives inquiry notifications |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY` or `POSTMARK_SERVER_TOKEN` | yes | Sender domain must be verified with the provider |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, six `STRIPE_PRICE_*` ids | for paid plans | Without them the site works and shows "billing not connected" |
| `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `ANTHROPIC_API_KEY` | any subset | Unconnected platforms are shown as "not connected", never faked |
| `OPENAI_MODEL`, `PERPLEXITY_MODEL`, `ANTHROPIC_MODEL` | optional | Defaults `gpt-6-luna`, `perplexity/sonar`, `claude-haiku-4-5`. Update `src/visibility/pricing.js` if you change models |
| `GEMINI_ENABLED`, `GEMINI_API_KEY` | no | Off until legal review (D-023) |
| `AI_DAILY_BUDGET_CENTS` | recommended | Default 2000 ($20 a day) across all customers |
| `TRUST_PROXY` | behind a proxy | `true` on Render so rate limits see real client IPs |

## 3. Deploy to Render (recommended)

Cost at launch: about $13 a month (Starter web $7, Basic Postgres $6).

1. Render dashboard, New, Blueprint, connect `asandler34/growthsignal`, branch `main` after PR #1 merges. `render.yaml` creates the web service and database.
2. Enter the `sync: false` values: `BASE_URL`, `OPERATOR_EMAIL`, `RESEND_API_KEY`, Stripe test keys and price ids, AI keys.
3. Deploy. Check `https://<service>.onrender.com/healthz` returns `{"ok":true}`.
4. `autoDeploy` is off; deploy deliberately from the dashboard or enable it once stable.

Any Docker host works the same way (`Dockerfile` included): one container plus Postgres 16.

## 4. Stripe setup (test mode first)

1. In Stripe test mode create three products: Check, Improve, Grow. For each, a monthly price ($9, $29, $59) and a yearly price ($90, $290, $590). Copy the six price ids into the `STRIPE_PRICE_*` variables.
2. Developers, Webhooks, add endpoint `https://<BASE_URL>/api/stripe/webhook` with events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.
3. Settings, Billing, Customer portal: enable cancel at period end, plan switching between the six prices, payment method updates, invoice history.
4. Settings, emails: turn on receipts and failed payment emails (Stripe sends these; we do not).
5. Test: buy each plan with card `4242 4242 4242 4242`, switch plans in the portal, cancel, and confirm the dashboard plan changes each time. Replay a webhook from the Stripe dashboard and confirm it is ignored as a duplicate (log `duplicate: true`).
6. **[needs Adam's authorization]** Go live: activate the Stripe account (business details, bank), recreate products and prices in live mode, add the live webhook, set live keys and `STRIPE_ALLOW_LIVE=true`, redeploy.

## 5. Email setup

1. Create a Resend account, add the sending domain (e.g. `growthsignal.ai` or a subdomain like `mail.growthsignal.ai`).
2. **[needs Adam's authorization]** Add the SPF, DKIM and (recommended) DMARC records Resend shows to the domain's DNS.
3. Set `EMAIL_FROM` to an address on that domain and `RESEND_API_KEY`. Sign in to the site to confirm the magic link arrives.

Until DNS is approved, email cannot be sent from `growthsignal.ai`, so sign in will not work in production. This is the main launch dependency after keys.

## 6. Domain

**[needs Adam's authorization]** Point `growthsignal.ai` (or `app.`) at Render: add the custom domain in Render, create the CNAME or A records it shows, wait for the certificate, then set `BASE_URL` to the new origin and update the Stripe webhook URL. The existing static preview host is not reused.

## 7. AI platform keys

| Platform | Where | Notes |
|---|---|---|
| OpenAI | platform.openai.com, API keys | Enable billing; set a monthly usage limit in the dashboard as a second guard |
| Perplexity | perplexity.ai settings, API | Agent API; Sonar chat completions ended 2026-09-27 |
| Anthropic | platform.claude.com, API keys | Web search must be allowed for the organization in the console |

After adding keys, run one free account sample on a test site and check the run shows the platform as connected with real answers.

## 8. Day to day

- **Logs:** JSON lines. Useful events: `job.failed`, `visibility.sample_failed`, `ai.budget_reached`, `stripe.webhook_rejected`, `billing.payment_failed`, `billing.unknown_price`, `email.failed`, `http.error`.
- **AI budget reached:** samples show "unavailable: daily budget reached" to customers. Raise `AI_DAILY_BUDGET_CENTS` if growth explains it; investigate if one account explains it.
- **Inquiries:** arrive by email at `OPERATOR_EMAIL` and are stored in the `inquiries` table.
- **Refunds and cancellations:** in the Stripe dashboard; webhooks update the plan automatically.
- **Account deletion:** customers delete themselves in Account; data cascades. For a request by email, run `DELETE FROM users WHERE email = '<address>';` and cancel their Stripe subscription.
- **Backups:** Render Postgres Basic includes daily backups; confirm retention in the dashboard.
- **Price change:** edit `src/lib/plans.js`, create new Stripe prices, update the `STRIPE_PRICE_*` ids. Existing subscribers stay on their price until moved in Stripe.

## 9. Local development

```
npm install
cp .env.example .env            # EMAIL_PROVIDER=console prints sign in links to the log
createdb growthsignal
npm run dev                     # http://localhost:3000
TEST_DATABASE_URL=postgres://postgres@localhost:5432/growthsignal_test npm test
npm run e2e                     # browser journey; needs Playwright and Chromium
```
