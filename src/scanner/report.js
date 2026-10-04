'use strict';
const { crawlSite } = require('./crawl');
const { runChecks, summarizeScore, prioritize } = require('./checks');
const { isAllowed } = require('./robots');
const CRAWLERS = require('./crawlers');

const RUBRIC_VERSION = '2026-10-a';

function detectedFacts(crawl) {
  const pages = crawl.pages.filter(p => p.html);
  const uniq = arr => [...new Set(arr.filter(Boolean))];
  const ld = pages.flatMap(p => p.html.jsonld);
  const home = pages[0]?.html;
  return {
    names: uniq([...ld.map(n => n.name).filter(x => typeof x === 'string'), home?.ogSiteName, (home?.title || '').split(/\s[|\-–—:]\s/)[0]]).slice(0, 4),
    phones: uniq(pages.flatMap(p => p.html.phones)).slice(0, 5),
    emails: uniq(pages.flatMap(p => p.html.emails)).slice(0, 5),
    addresses: uniq(pages.flatMap(p => p.html.addresses)).slice(0, 3),
    hours: uniq(pages.map(p => p.html.hoursSnippet)).slice(0, 2),
    profiles: Object.assign({}, ...pages.map(p => p.html.profiles)),
  };
}

function plainSummary(score, priorities, crawl) {
  const top = priorities.slice(0, 3);
  const lines = [];
  if (score.total == null) lines.push('We could not score this website.');
  else lines.push(`Your website scored ${score.total} out of 100 for AI search readiness (${score.band.toLowerCase()}). This measures whether your site is accessible and clear. It does not measure whether AI assistants currently recommend you.`);
  if (top.length) lines.push(`The most valuable next ${top.length === 1 ? 'step is' : `${top.length} steps are`}: ${top.map(t => t.title.charAt(0).toLowerCase() + t.title.slice(1)).join('; ')}.`);
  else lines.push('We did not find readiness gaps in the pages we checked. Keep your facts current and watch observed visibility over time.');
  lines.push(`We read ${crawl.pages.length} page(s)${crawl.skipped.length ? ` and skipped ${crawl.skipped.length}` : ''}.`);
  return lines;
}

async function buildReadinessReport(url, context = {}, opts = {}) {
  const crawl = await crawlSite(url, opts);
  const checks = runChecks(crawl, context);
  const score = summarizeScore(checks);
  const priorities = prioritize(checks);
  const crawlerTable = CRAWLERS.map(c => {
    const r = crawl.robots.found ? isAllowed(crawl.robots.parsed, c.token, '/') : { allowed: true, rule: null, matchedAgent: null };
    return { token: c.token, operator: c.operator, purpose: c.purpose, note: c.note, allowed: r.allowed, rule: r.rule, matchedAgent: r.matchedAgent };
  });
  return {
    rubricVersion: RUBRIC_VERSION,
    generatedAt: new Date().toISOString(),
    site: { requestedUrl: url, origin: crawl.origin, finalUrl: crawl.pages[0].url },
    summary: plainSummary(score, priorities, crawl),
    score,
    priorities,
    checks,
    crawlers: crawlerTable,
    llmsTxt: { found: crawl.llmsTxt.found, note: 'llms.txt is a proposed convention. It is reported for information only and is not scored, because no major AI provider has confirmed it affects answers.' },
    facts: detectedFacts(crawl),
    coverage: {
      pagesRead: crawl.pages.map(p => ({ url: p.url, kind: p.kind, status: p.status, words: p.html?.words ?? null, truncated: p.truncated })),
      skipped: crawl.skipped,
      robotsTxt: { url: crawl.robots.url, found: crawl.robots.found, status: crawl.robots.status, error: crawl.robots.error },
      sitemap: crawl.sitemap,
      startedAt: crawl.startedAt,
      finishedAt: crawl.finishedAt,
    },
    limitations: [
      'This is a website readiness check. It does not show whether AI assistants currently mention or recommend your business. Observed visibility is measured separately, with sampled answers.',
      `We read a limited number of pages (${crawl.pages.length}). Issues on pages we did not read are not reflected.`,
      'We read the HTML your server sends. We do not run JavaScript, so content added by scripts is not counted.',
      'Allowing crawlers and adding structured data make your site easier to use as a source. They do not guarantee indexing, citation or recommendation by any platform.',
      'We did not verify listings on third party sites such as Google Business Profile, Yelp or directories. Links we found are listed as signals only.',
    ],
  };
}

// Compares two readiness reports: score change and which checks improved or regressed.
function compareReports(prev, curr) {
  if (!prev || !curr) return null;
  const prevById = Object.fromEntries(prev.checks.map(c => [c.id, c]));
  const improved = [];
  const regressed = [];
  for (const c of curr.checks) {
    const p = prevById[c.id];
    if (!p) continue;
    if (c.points > p.points) improved.push({ id: c.id, title: c.title, from: p.status, to: c.status });
    else if (c.points < p.points) regressed.push({ id: c.id, title: c.title, from: p.status, to: c.status });
  }
  return {
    previousAt: prev.generatedAt,
    scoreChange: curr.score.total != null && prev.score.total != null ? curr.score.total - prev.score.total : null,
    rubricChanged: prev.rubricVersion !== curr.rubricVersion,
    improved,
    regressed,
  };
}

module.exports = { buildReadinessReport, compareReports, RUBRIC_VERSION };
