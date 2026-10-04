'use strict';
// Usage: node --env-file=.env scripts/selftest.js   (or with `vercel env pull` output)
// Asks each connected AI platform one real question and prints what came back. Costs about 5 cents.
const { selfTest } = require('../src/ops/selftest');
const db = require('../src/db');

selfTest().then(r => {
  console.log(JSON.stringify(r, null, 2));
  return db.pool.end().then(() => process.exit(r.ok ? 0 : 1));
}).catch(e => { console.error(e.message); process.exit(1); });
