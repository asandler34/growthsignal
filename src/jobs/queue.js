'use strict';
// Postgres backed job queue. Workers claim jobs with FOR UPDATE SKIP LOCKED and a lease, so a crashed
// worker's job becomes claimable again when the lease expires. Failures retry with exponential backoff.
const db = require('../db');
const log = require('../lib/log');

async function enqueue(type, payload = {}, { runAt = new Date(), maxAttempts = 3, dedupeKey = null } = {}) {
  const r = await db.one(
    `INSERT INTO jobs (type, payload, run_at, max_attempts, dedupe_key) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (dedupe_key) DO NOTHING RETURNING id`,
    [type, payload, runAt, maxAttempts, dedupeKey]);
  return r ? r.id : null;
}

async function claim(leaseSeconds = 300) {
  return db.one(
    `UPDATE jobs SET status = 'running', attempts = attempts + 1, locked_until = now() + ($1 || ' seconds')::interval, updated_at = now()
     WHERE id = (
       SELECT id FROM jobs
       WHERE (status = 'queued' AND run_at <= now()) OR (status = 'running' AND locked_until < now())
       ORDER BY run_at
       FOR UPDATE SKIP LOCKED LIMIT 1)
     RETURNING *`, [String(leaseSeconds)]);
}

async function complete(id) {
  await db.query(`UPDATE jobs SET status = 'done', locked_until = NULL, updated_at = now() WHERE id = $1`, [id]);
}

// Returns true if the job will be retried.
async function fail(job, err) {
  const retryable = err && err.retryable !== false;
  const willRetry = retryable && job.attempts < job.max_attempts;
  const delaySec = Math.min(3600, 15 * 2 ** (job.attempts - 1));
  await db.query(
    `UPDATE jobs SET status = $2, last_error = $3, locked_until = NULL, run_at = now() + ($4 || ' seconds')::interval, updated_at = now() WHERE id = $1`,
    [job.id, willRetry ? 'queued' : 'failed', String(err && err.message || err).slice(0, 1000), String(delaySec)]);
  return willRetry;
}

class Worker {
  constructor(handlers, { concurrency = 2, pollMs = 1000 } = {}) {
    this.handlers = handlers;
    this.concurrency = concurrency;
    this.pollMs = pollMs;
    this.active = 0;
    this.stopped = false;
    this.timer = null;
  }
  start() { this.stopped = false; this.tick(); return this; }
  async stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    while (this.active > 0) await new Promise(r => setTimeout(r, 50));
  }
  async tick() {
    if (this.stopped) return;
    try {
      while (this.active < this.concurrency) {
        const job = await claim();
        if (!job) break;
        this.active++;
        this.run(job).finally(() => { this.active--; });
      }
    } catch (e) { log.error('worker.claim_failed', { error: e.message }); }
    if (!this.stopped) this.timer = setTimeout(() => this.tick(), this.pollMs);
  }
  async run(job) {
    const handler = this.handlers[job.type];
    const started = Date.now();
    try {
      if (!handler) throw Object.assign(new Error(`No handler for job type ${job.type}`), { retryable: false });
      await handler(job.payload, job);
      await complete(job.id);
      log.info('job.done', { id: job.id, type: job.type, ms: Date.now() - started });
    } catch (e) {
      const willRetry = await fail(job, e);
      log.warn('job.failed', { id: job.id, type: job.type, attempt: job.attempts, willRetry, error: e.message });
      if (!willRetry && handler && handler.onFinalFailure) await handler.onFinalFailure(job.payload, e).catch(() => {});
    }
  }
  // Process everything currently runnable, then return. Used by tests and the one-shot CLI.
  async drain({ timeoutMs = 30000 } = {}) {
    const end = Date.now() + timeoutMs;
    for (;;) {
      const job = await claim();
      if (!job) {
        const pending = await db.one(`SELECT count(*)::int AS n FROM jobs WHERE status = 'queued' AND run_at <= now()`);
        if (!pending.n) return;
      } else await this.run(job);
      if (Date.now() > end) throw new Error('drain timed out');
    }
  }
}

module.exports = { enqueue, claim, complete, fail, Worker };
