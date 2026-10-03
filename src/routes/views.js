'use strict';
const { starterFix } = require('../improve/starter');
// Shapes data for the browser. Untrusted strings (crawled text, model answers) are returned as plain
// JSON and rendered with textContent on the client, never as HTML.

// Anonymous preview: full score, category breakdown and the top 3 priorities. Evidence for every check,
// the crawler table, facts and history require a free account.
function previewView(scan) {
  const base = { id: scan.id, url: scan.url, domain: scan.domain, status: scan.status, progress: scan.progress, error: scan.error, createdAt: scan.created_at, completedAt: scan.completed_at };
  if (scan.status !== 'complete' || !scan.report) return base;
  const r = scan.report;
  return {
    ...base,
    preview: true,
    report: {
      rubricVersion: r.rubricVersion,
      generatedAt: r.generatedAt,
      site: r.site,
      summary: r.summary,
      score: r.score,
      priorities: r.priorities.slice(0, 3),
      hiddenPriorities: Math.max(0, r.priorities.length - 3),
      checks: r.checks.map(c => ({ id: c.id, category: c.category, title: c.title, status: c.status, points: c.points, maxPoints: c.maxPoints })),
      coverage: { pagesRead: r.coverage.pagesRead.length, skipped: r.coverage.skipped.length },
      limitations: r.limitations,
    },
    freeFix: starterFix(r, scan.context || {}),
    snapshot: snapshotView(scan.snapshot),
  };
}

// The free AI answer. The answer is model output: plain text, rendered with textContent.
function snapshotView(s) {
  if (!s) return null;
  const { status, reason, question, provider, model, location, businessName, answer, truncated, mentioned, cited, sources, at } = s;
  return { status, reason, question, provider, model, location, businessName, answer, truncated, mentioned, cited, sources, at };
}

function fullView(scan) {
  return { id: scan.id, url: scan.url, domain: scan.domain, kind: scan.kind, status: scan.status, progress: scan.progress, error: scan.error, createdAt: scan.created_at, completedAt: scan.completed_at, score: scan.score, report: scan.report, snapshot: snapshotView(scan.snapshot),
    freeFix: scan.report ? starterFix(scan.report, scan.context || {}, scan.report.priorities) : null };
}

function siteView(site) {
  return {
    id: site.id, url: site.url, domain: site.domain, businessName: site.business_name, category: site.category, city: site.city, region: site.region,
    services: site.services, facts: site.facts, factsConfirmedAt: site.facts_confirmed_at, verifiedAt: site.verified_at, verificationToken: site.verification_token,
    shareToken: site.share_token, createdAt: site.created_at,
  };
}

function runView(run, samples) {
  return {
    id: run.id, trigger: run.trigger, status: run.status, createdAt: run.created_at, completedAt: run.completed_at, error: run.error,
    config: { prompts: run.config.prompts, platforms: run.config.platforms, notConnected: run.config.notConnected || [], repeats: run.config.repeats, competitors: run.config.competitors },
    summary: run.summary,
    samples: samples ? samples.map(s => ({ provider: s.provider, model: s.model, prompt: s.prompt, intent: s.intent, repeat: s.repeat_index, location: s.location, status: s.status, answer: s.answer_excerpt, citations: s.citations, mentioned: s.mentioned, cited: s.cited, competitors: (s.competitor_mentions || []).filter(c => c.name), error: s.error, at: s.created_at })) : undefined,
  };
}

module.exports = { snapshotView, previewView, fullView, siteView, runView };
