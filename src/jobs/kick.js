'use strict';
// Serverless hosts (Vercel) have no always-on worker. Instead, queueing a job starts a drain that keeps
// running after the HTTP response is sent (waitUntil), and a cron route picks up retries and schedules.
const { waitUntil } = require('@vercel/functions');
const { Worker } = require('./queue');
const log = require('../lib/log');

const DRAIN_MS = 700 * 1000; // inside the function's maxDuration (800s in vercel.json)
let draining = null;
let again = false;

function drainNow() {
  const handlers = require('./handlers');
  return new Worker(handlers).drain({ timeoutMs: DRAIN_MS }).catch(e => log.warn('kick.drain_stopped', { error: e.message }));
}

// Starts (or extends) a background drain in this instance. Never throws; never blocks the request.
function kick() {
  if (draining) { again = true; return draining; }
  draining = (async () => {
    do { again = false; await drainNow(); } while (again);
  })().finally(() => { draining = null; });
  waitUntil(draining);
  return draining;
}

module.exports = { kick, drainNow };
