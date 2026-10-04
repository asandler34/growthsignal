'use strict';
// Fixed window rate limiter stored in Postgres so limits survive restarts and work across processes.
const db = require('../db');

async function hit(key, limit, windowSeconds) {
  const r = await db.one(
    `INSERT INTO rate_limits (key, window_start, count)
     VALUES ($1, to_timestamp(floor(extract(epoch from now()) / $2) * $2), 1)
     ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
     RETURNING count`, [key, windowSeconds]);
  return { ok: r.count <= limit, count: r.count, limit };
}

async function cleanup() {
  await db.query(`DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'`);
}

module.exports = { hit, cleanup };
