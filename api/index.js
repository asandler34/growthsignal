'use strict';
// Vercel entry point. Every non-static request is routed here (vercel.json). Static files in public/
// are served by Vercel's CDN directly. Background jobs run after the response via src/jobs/kick.js.
const { createApp } = require('../src/server');
const { validateForProduction } = require('../src/config');
const { migrate } = require('../src/db/migrate');
const { setOnEnqueue } = require('../src/jobs/queue');
const { kick } = require('../src/jobs/kick');
const log = require('../src/lib/log');

setOnEnqueue(kick);
const app = createApp();
let ready = null;

function init() {
  if (!ready) {
    ready = (async () => {
      const problems = validateForProduction();
      if (problems.length) { problems.forEach(p => log.error('config.invalid', { problem: p })); throw new Error('Server configuration is incomplete'); }
      await migrate({ log: m => log.info('db.migrate', { m }) });
    })().catch(e => { ready = null; throw e; });
  }
  return ready;
}

module.exports = async (req, res) => {
  try { await init(); } catch (e) {
    log.error('startup.failed', { error: e.message });
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify({ error: 'GrowthSignal is starting up or misconfigured. Please try again shortly.' }));
  }
  return app(req, res);
};
