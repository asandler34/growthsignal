'use strict';
const { Pool } = require('pg');
const { config } = require('../config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  // Serverless instances are many and short lived; keep each one's share of connections small.
  max: config.serverless ? 3 : 10,
});

async function query(text, params) {
  return pool.query(text, params);
}
async function one(text, params) {
  const r = await pool.query(text, params);
  return r.rows[0] || null;
}
async function many(text, params) {
  const r = await pool.query(text, params);
  return r.rows;
}
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, one, many, tx };
