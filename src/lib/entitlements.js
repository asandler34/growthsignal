'use strict';
// Server side plan enforcement. A user's plan comes only from subscription rows written by verified
// Stripe webhooks; nothing the browser sends can change it.
const db = require('../db');
const { getPlan, ACTIVE_STATUSES } = require('./plans');

function period(d = new Date()) { return d.toISOString().slice(0, 7); }

async function planFor(userId) {
  const sub = await db.one(
    `SELECT * FROM subscriptions WHERE user_id = $1 AND status = ANY($2) ORDER BY updated_at DESC LIMIT 1`,
    [userId, ACTIVE_STATUSES]);
  if (!sub) return { plan: getPlan('free'), subscription: null };
  return { plan: getPlan(sub.plan), subscription: sub };
}

// Atomically consumes one unit of a metric if under the limit. Returns { ok, used, limit }.
async function consume(userId, metric, limit, amount = 1) {
  if (limit == null) return { ok: true, used: null, limit: null };
  const p = period();
  const r = await db.one(
    `INSERT INTO usage_counters (user_id, period, metric, count) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, period, metric) DO UPDATE SET count = usage_counters.count + $4
       WHERE usage_counters.count + $4 <= $5
     RETURNING count`, [userId, p, metric, amount, limit]);
  if (r && r.count <= limit) return { ok: true, used: r.count, limit };
  if (r) { // first insert above limit (limit 0)
    await db.query(`UPDATE usage_counters SET count = count - $4 WHERE user_id = $1 AND period = $2 AND metric = $3`, [userId, p, metric, amount]);
  }
  const cur = await db.one(`SELECT count FROM usage_counters WHERE user_id = $1 AND period = $2 AND metric = $3`, [userId, p, metric]);
  return { ok: false, used: cur ? cur.count : 0, limit };
}

async function usage(userId) {
  const rows = await db.many(`SELECT metric, count FROM usage_counters WHERE user_id = $1 AND period = $2`, [userId, period()]);
  return Object.fromEntries(rows.map(r => [r.metric, r.count]));
}

// Global AI spend guard across all customers. Returns false when today's budget is exhausted.
async function reserveAiBudget(cents, dailyBudgetCents) {
  const r = await db.one(
    `INSERT INTO ai_spend (day, cents) VALUES (current_date, $1)
     ON CONFLICT (day) DO UPDATE SET cents = ai_spend.cents + $1 WHERE ai_spend.cents + $1 <= $2
     RETURNING cents`, [cents, dailyBudgetCents]);
  return !!r && Number(r.cents) <= dailyBudgetCents;
}
async function adjustAiSpend(deltaCents) {
  await db.query(`INSERT INTO ai_spend (day, cents) VALUES (current_date, $1) ON CONFLICT (day) DO UPDATE SET cents = ai_spend.cents + $1`, [deltaCents]);
}

module.exports = { planFor, consume, usage, period, reserveAiBudget, adjustAiSpend };
