'use strict';
// Starts the job worker and the scheduler loop. Run with ROLE=worker (or ROLE=all with the web server).
const { config } = require('../config');
const { Worker } = require('./queue');
const handlers = require('./handlers');
const log = require('../lib/log');

function startWorker() {
  const worker = new Worker(handlers, { concurrency: config.worker.concurrency, pollMs: config.worker.pollMs }).start();
  const tick = async () => {
    try {
      const n = await handlers.scheduleDue();
      if (n) log.info('scheduler.queued', { n });
    } catch (e) { log.error('scheduler.failed', { error: e.message }); }
  };
  const daily = async () => { try { await handlers.cleanup(); } catch (e) { log.error('cleanup.failed', { error: e.message }); } };
  const t1 = setInterval(tick, config.worker.schedulerIntervalMs);
  const t2 = setInterval(daily, 24 * 3600 * 1000);
  setTimeout(tick, 5000);
  log.info('worker.started', { concurrency: config.worker.concurrency });
  return { worker, stop: async () => { clearInterval(t1); clearInterval(t2); await worker.stop(); } };
}

module.exports = { startWorker };
