# GrowthSignal

See whether AI recommends your business, and exactly what to fix.

GrowthSignal is a self service product for local service businesses and the web designers who look after their sites. It does three separate things and never blends them into one score:

1. **Website readiness** (free, no account): a bounded crawl of the site scored on a published 19 check rubric, with evidence for every finding.
2. **Observed AI visibility** (account): realistic customer questions sent to AI platforms through their official APIs with web search on, repeated, with every answer, source and uncertainty range shown.
3. **Improvement and monitoring** (paid): weekly rescans with change alerts, scheduled answer samples, competitor comparison and a copy and paste fix kit built from facts the owner confirms.

No placement is ever guaranteed. API answers can differ from what people see in consumer apps, and the product says so wherever results appear.

## Stack

Node 22, Express 5, Postgres 16, vanilla JS front end (`public/`), Postgres backed job queue, Stripe Checkout and Customer Portal, Resend or Postmark email. One process runs web, worker and scheduler.

## Run locally

```
npm install
cp .env.example .env
createdb growthsignal
npm run dev                 # http://localhost:3000, sign in links print to the log
TEST_DATABASE_URL=postgres://postgres@localhost:5432/growthsignal_test npm test
```

## Documentation

| Doc | Contents |
|---|---|
| `docs/project-brief.md` | What we are building, for whom, and the rules |
| `docs/readiness.md` | Launch readiness: tested, awaiting credentials, deferred, blocking; exact launch steps |
| `docs/operations.md` | Deploy, environment variables, Stripe, email, domain, scheduled jobs, operator guide |
| `docs/checklist.md` | Implementation checklist |
| `docs/decision-log.md` | Decisions with reasons |
| `docs/progress.md` | Progress notes |
| `docs/strategy/01` to `06` | Business pressure test, competitive research and positioning, product definition, pricing and unit economics, architecture, go to market |
| `docs/research/` | Source research with URLs and check dates |
| `/methodology` (public page) | Customer facing rubric and sampling method |
