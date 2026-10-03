'use strict';
const db = require('../db');
const { config } = require('../config');
const log = require('../lib/log');
const { buildReadinessReport, compareReports } = require('../scanner/report');
const { runVisibility } = require('../visibility/run');
const { initialSnapshot, runSnapshot } = require('../visibility/snapshot');
const { sendEmail } = require('../lib/email');
const { planFor } = require('../lib/entitlements');
const { getPlan, ACTIVE_STATUSES } = require('../lib/plans');
const { enqueue } = require('./queue');

async function setProgress(scanId, progress) {
  await db.query('UPDATE scans SET progress = $2 WHERE id = $1', [scanId, progress]);
}

const scan = async ({ scanId }) => {
  const s = await db.one('SELECT * FROM scans WHERE id = $1', [scanId]);
  if (!s || s.status === 'complete') return;
  await db.query(`UPDATE scans SET status = 'running', started_at = now(), error = NULL WHERE id = $1`, [scanId]);
  let maxPages = getPlan('free').pagesPerScan;
  if (s.user_id) maxPages = (await planFor(s.user_id)).plan.pagesPerScan;
  let report;
  try {
    report = await buildReadinessReport(s.url, s.context || {}, { maxPages, onProgress: p => setProgress(scanId, p).catch(() => {}) });
  } catch (e) {
    if (e.userFacing && !e.retryable) {
      await db.query(`UPDATE scans SET status = 'failed', error = $2, completed_at = now(), progress = $3 WHERE id = $1`, [scanId, e.message, { step: 'failed', message: e.message }]);
      return;
    }
    await setProgress(scanId, { step: 'retrying', message: 'The site did not respond. Retrying shortly.' });
    throw e;
  }
  let comparison = null;
  if (s.site_id) {
    const prev = await db.one(`SELECT report FROM scans WHERE site_id = $1 AND status = 'complete' AND id <> $2 ORDER BY completed_at DESC LIMIT 1`, [s.site_id, scanId]);
    comparison = prev ? compareReports(prev.report, report) : null;
  }
  report.comparison = comparison;
  // Anonymous previews also get one free AI answer, fetched after the report is shown.
  const snapshot = s.kind === 'preview' ? initialSnapshot(s.context || {}) : null;
  await db.query(`UPDATE scans SET status = 'complete', report = $2, score = $3, completed_at = now(), progress = $4, snapshot = $5 WHERE id = $1`, [scanId, report, report.score.total, { step: 'complete', message: 'Report ready' }, snapshot]);
  if (snapshot && snapshot.status === 'pending') await enqueue('snapshot', { scanId }, { maxAttempts: 1, dedupeKey: `snapshot:${scanId}` });
  if (s.kind === 'scheduled' && s.user_id && comparison) {
    const user = await db.one('SELECT email, email_opt_out FROM users WHERE id = $1', [s.user_id]);
    if (user && !user.email_opt_out && (comparison.scoreChange || comparison.regressed.length)) {
      await sendEmail(user.email, 'monitor_digest', { link: `${config.baseUrl}/app/site/${s.site_id}`, domain: s.domain, score: report.score.total, change: comparison.scoreChange || 0, improved: comparison.improved.map(x => x.title), regressed: comparison.regressed.map(x => x.title) }).catch(() => {});
    }
  }
};
scan.onFinalFailure = async ({ scanId }, err) => {
  await db.query(`UPDATE scans SET status = 'failed', error = $2, completed_at = now(), progress = $3 WHERE id = $1 AND status <> 'complete'`, [scanId, String(err.message).slice(0, 300), { step: 'failed', message: String(err.message).slice(0, 300) }]);
};

const visibility = async ({ runId }) => {
  const summary = await runVisibility(runId);
  const run = await db.one('SELECT r.*, s.domain, u.email, u.email_opt_out FROM visibility_runs r JOIN sites s ON s.id = r.site_id JOIN users u ON u.id = r.user_id WHERE r.id = $1', [runId]);
  if (summary && run && !run.email_opt_out) {
    await sendEmail(run.email, 'visibility_complete', { link: `${config.baseUrl}/app/site/${run.site_id}#visibility`, domain: run.domain, mentioned: summary.discoveryMentions.count, of: summary.discoveryMentions.of, unavailable: summary.totals.unavailable + summary.totals.error }).catch(() => {});
  }
};
visibility.onFinalFailure = async ({ runId }, err) => {
  await db.query(`UPDATE visibility_runs SET status = 'failed', error = $2, completed_at = now() WHERE id = $1`, [runId, String(err.message).slice(0, 300)]);
};

const INTERVAL = { weekly: '7 days', biweekly: '14 days', monthly: '30 days' };

// Enqueues scheduled scans and visibility runs that are due for paying customers.
async function scheduleDue() {
  const rows = await db.many(
    `SELECT DISTINCT ON (s.id) s.*, sub.plan FROM sites s
     JOIN subscriptions sub ON sub.user_id = s.user_id AND sub.status = ANY($1)
     WHERE s.archived_at IS NULL ORDER BY s.id, sub.updated_at DESC`, [ACTIVE_STATUSES]);
  let queued = 0;
  for (const site of rows) {
    const plan = getPlan(site.plan);
    if (plan.scheduledScan) {
      const last = await db.one(`SELECT max(created_at) AS t FROM scans WHERE site_id = $1 AND kind IN ('scheduled','account')`, [site.id]);
      if (!last.t || Date.now() - new Date(last.t).getTime() > ms(INTERVAL[plan.scheduledScan])) {
        const { createScan } = require('../services');
        const dedupe = `sched-scan:${site.id}:${new Date().toISOString().slice(0, 10)}`;
        const exists = await db.one('SELECT 1 FROM jobs WHERE dedupe_key = $1', [dedupe]);
        if (!exists) {
          await enqueue('noop', {}, { dedupeKey: dedupe });
          await createScan({ url: site.url, domain: site.domain, kind: 'scheduled', userId: site.user_id, siteId: site.id, context: { businessName: site.business_name, category: site.category, city: site.city, region: site.region, services: site.services } });
          queued++;
        }
      }
    }
    if (plan.scheduledVisibility && site.business_name) {
      const last = await db.one(`SELECT max(created_at) AS t FROM visibility_runs WHERE site_id = $1 AND trigger IN ('scheduled','free','manual')`, [site.id]);
      if (!last.t || Date.now() - new Date(last.t).getTime() > ms(INTERVAL[plan.scheduledVisibility])) {
        const { startVisibilityRun, anyProviderConfigured } = require('../services');
        if (anyProviderConfigured()) {
          const user = await db.one('SELECT * FROM users WHERE id = $1', [site.user_id]);
          await startVisibilityRun(user, site, { trigger: 'scheduled' }).then(() => queued++).catch(e => log.warn('schedule.visibility_failed', { site: site.id, error: e.message }));
        }
      }
    }
  }
  return queued;
}

function ms(interval) { return parseInt(interval, 10) * 86400000; }

async function startPaidMonitoring(userId) {
  // Runs the first scheduled cycle immediately after purchase.
  await scheduleDue();
  return userId;
}

// Housekeeping: expired tokens, old anonymous scans, history beyond plan retention.
async function cleanup() {
  await db.query(`DELETE FROM login_tokens WHERE expires_at < now() - interval '1 day'`);
  await db.query(`DELETE FROM sessions WHERE expires_at < now()`);
  await db.query(`DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'`);
  await db.query(`DELETE FROM scans WHERE user_id IS NULL AND created_at < now() - interval '30 days'`);
  await db.query(`DELETE FROM jobs WHERE status IN ('done','failed') AND updated_at < now() - interval '14 days'`);
  const users = await db.many('SELECT id FROM users');
  for (const u of users) {
    const { plan } = await planFor(u.id);
    await db.query(`DELETE FROM scans WHERE user_id = $1 AND created_at < now() - ($2 || ' months')::interval`, [u.id, String(plan.historyMonths)]);
    await db.query(`DELETE FROM visibility_runs WHERE user_id = $1 AND created_at < now() - ($2 || ' months')::interval`, [u.id, String(plan.historyMonths)]);
  }
}

const snapshot = async ({ scanId }) => runSnapshot(scanId);
snapshot.onFinalFailure = async ({ scanId }) => {
  await db.query(`UPDATE scans SET snapshot = $2 WHERE id = $1 AND snapshot->>'status' = 'pending'`, [scanId, { status: 'error', reason: 'The AI platform did not answer this time. A free account includes a 3 question answer sample you can run later.' }]);
};

const handlers = { scan, visibility, snapshot, noop: async () => {}, schedule: scheduleDue, cleanup };

module.exports = handlers;
module.exports.startPaidMonitoring = startPaidMonitoring;
module.exports.scheduleDue = scheduleDue;
