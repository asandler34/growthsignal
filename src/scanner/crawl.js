'use strict';
// Bounded crawl of one website: homepage, robots.txt, sitemap, llms.txt, and up to maxPages
// same-origin pages chosen for business relevance. Respects robots.txt for our own crawler on
// every page except the owner-requested homepage.
const { safeFetch, FetchBlockedError } = require('../lib/safe-fetch');
const { parseRobots, isAllowed } = require('./robots');
const { extractPage } = require('./extract');

const PRIORITY = [
  [/contact|get-in-touch|reach-us/, 'contact'],
  [/about|our-story|team|who-we-are/, 'about'],
  [/services?|what-we-do|solutions|offerings|treatments|practice-areas/, 'services'],
  [/service-area|areas?-we-serve|locations?|cities|near/, 'locations'],
  [/faq|questions/, 'faq'],
  [/pricing|prices|rates|cost|estimate|quote/, 'pricing'],
  [/reviews?|testimonials/, 'reviews'],
  [/menu|book|schedule|appointments?/, 'booking'],
];
const SKIP = /\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|mov|mp3|docx?|xlsx?|pptx?|css|js|xml|json|ico)(\?|$)|\/(wp-admin|wp-login|cart|checkout|account|login|signin|feed|tag|category|author)\b|\?(replytocom|add-to-cart)=/i;

function pageKind(u) {
  const p = u.pathname.toLowerCase();
  if (p === '/' || p === '') return 'home';
  for (const [re, kind] of PRIORITY) if (re.test(p)) return kind;
  return 'other';
}

function parseSitemap(xml) {
  const locs = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) && locs.length < 2000) locs.push(m[1].replace(/&amp;/g, '&'));
  return { isIndex: /<sitemapindex/i.test(xml), locs };
}

async function tryFetch(url, opts) {
  try { return { res: await safeFetch(url, opts) }; } catch (e) { return { error: e }; }
}

function describeError(e) {
  if (e instanceof FetchBlockedError) return e.message;
  const code = e && (e.code || e.cause?.code);
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'The domain name could not be found (DNS lookup failed).';
  if (code === 'ECONNREFUSED') return 'The server refused the connection.';
  if (code === 'ECONNRESET') return 'The connection was reset by the server.';
  if (/certificate|SSL|TLS/i.test(String(e && e.message))) return `Secure connection failed: ${String(e.message).slice(0, 120)}`;
  return `Could not load the page: ${String((e && e.message) || e).slice(0, 160)}`;
}

/**
 * @param {string} startUrl
 * @param {{maxPages?:number, onProgress?:Function, fetchOpts?:object}} options
 */
async function crawlSite(startUrl, { maxPages = 6, onProgress = () => {}, fetchOpts = {} } = {}) {
  const startedAt = new Date().toISOString();
  const fetchLog = [];
  const log = (url, outcome) => fetchLog.push({ url, ...outcome, at: new Date().toISOString() });

  onProgress({ step: 'homepage', message: 'Loading your homepage' });
  const home = await tryFetch(startUrl, fetchOpts);
  if (home.error) {
    log(startUrl, { ok: false, error: describeError(home.error) });
    const err = new Error(describeError(home.error));
    err.userFacing = true;
    err.retryable = !(home.error instanceof FetchBlockedError);
    throw err;
  }
  const homeRes = home.res;
  log(startUrl, { ok: true, status: homeRes.status, finalUrl: homeRes.finalUrl, ms: homeRes.ms, bytes: homeRes.bytes });
  const origin = new URL(homeRes.finalUrl).origin;

  onProgress({ step: 'robots', message: 'Checking robots.txt and sitemaps' });
  const robotsUrl = `${origin}/robots.txt`;
  const robotsFetch = await tryFetch(robotsUrl, { ...fetchOpts, accept: 'text/plain,*/*;q=0.5', maxBytes: 512 * 1024 });
  let robots = { url: robotsUrl, status: null, found: false, text: '', parsed: { groups: [], sitemaps: [] }, error: null };
  if (robotsFetch.res) {
    const r = robotsFetch.res;
    log(robotsUrl, { ok: true, status: r.status });
    robots.status = r.status;
    if (r.status >= 200 && r.status < 300 && !/text\/html/i.test(r.contentType)) {
      robots.found = true;
      robots.text = r.text.slice(0, 20000);
      robots.parsed = parseRobots(r.text);
    } else if (r.status >= 500) {
      robots.error = `robots.txt returned HTTP ${r.status}`;
    }
  } else {
    robots.error = describeError(robotsFetch.error);
    log(robotsUrl, { ok: false, error: robots.error });
  }

  const sitemapCandidates = [...new Set([...robots.parsed.sitemaps, `${origin}/sitemap.xml`])].slice(0, 3);
  let sitemap = { found: false, url: null, urlCount: 0 };
  let sitemapUrls = [];
  for (const sm of sitemapCandidates) {
    let smUrl;
    try { smUrl = new URL(sm); } catch { continue; }
    if (smUrl.origin !== origin) continue;
    const f = await tryFetch(smUrl.href, { ...fetchOpts, accept: 'application/xml,text/xml,*/*;q=0.5', maxBytes: 3 * 1024 * 1024 });
    if (!f.res || f.res.status !== 200 || !/<(urlset|sitemapindex)/i.test(f.res.text)) { log(smUrl.href, { ok: !!f.res, status: f.res?.status }); continue; }
    log(smUrl.href, { ok: true, status: 200 });
    let parsed = parseSitemap(f.res.text);
    if (parsed.isIndex && parsed.locs[0]) {
      const child = await tryFetch(parsed.locs[0], { ...fetchOpts, accept: 'application/xml,text/xml', maxBytes: 3 * 1024 * 1024 });
      if (child.res && child.res.status === 200) parsed = { isIndex: true, locs: parseSitemap(child.res.text).locs };
    }
    sitemap = { found: true, url: smUrl.href, urlCount: parsed.locs.length, isIndex: parsed.isIndex };
    sitemapUrls = parsed.locs;
    break;
  }

  const llms = await tryFetch(`${origin}/llms.txt`, { ...fetchOpts, accept: 'text/plain,text/markdown', maxBytes: 256 * 1024 });
  const llmsTxt = { found: !!(llms.res && llms.res.status === 200 && !/text\/html/i.test(llms.res.contentType) && llms.res.text.trim().length > 0) };

  // Choose additional pages.
  const homeData = extractPage(homeRes.text, homeRes.finalUrl);
  const candidates = new Map();
  const consider = (href, source) => {
    let u;
    try { u = new URL(href); } catch { return; }
    if (u.origin !== origin || SKIP.test(u.href)) return;
    u.hash = '';
    if (u.search.length > 60) return;
    const key = u.href.replace(/\/$/, '');
    if (key === homeRes.finalUrl.replace(/\/$/, '') || candidates.has(key)) return;
    const kind = pageKind(u);
    const rank = kind === 'other' ? 100 : PRIORITY.findIndex(p => p[1] === kind);
    candidates.set(key, { url: u.href, kind, rank: rank + (source === 'sitemap' ? 0.5 : 0) });
  };
  homeData.links.forEach(l => consider(l.href, 'nav'));
  sitemapUrls.slice(0, 500).forEach(l => consider(l, 'sitemap'));
  const usedKinds = new Set();
  const chosen = [...candidates.values()]
    .sort((a, b) => a.rank - b.rank)
    .filter(c => { if (c.kind === 'other') return true; if (usedKinds.has(c.kind)) return false; usedKinds.add(c.kind); return true; })
    .slice(0, Math.max(0, maxPages - 1));

  const pages = [{ url: homeRes.finalUrl, requestedUrl: startUrl, kind: 'home', status: homeRes.status, headers: pickHeaders(homeRes.headers), redirects: homeRes.redirects, ms: homeRes.ms, bytes: homeRes.bytes, truncated: homeRes.truncated, html: isHtml(homeRes) ? homeData : null, contentType: homeRes.contentType }];
  const skipped = [];
  let i = 0;
  for (const c of chosen) {
    i++;
    const path = new URL(c.url).pathname;
    const ours = isAllowed(robots.parsed, 'GrowthSignalBot', path);
    if (!ours.allowed) { skipped.push({ url: c.url, reason: `robots.txt disallows our crawler (${ours.rule})` }); continue; }
    onProgress({ step: 'pages', message: `Reading page ${i} of ${chosen.length}`, current: i, total: chosen.length });
    const f = await tryFetch(c.url, fetchOpts);
    if (f.error) { skipped.push({ url: c.url, reason: describeError(f.error) }); log(c.url, { ok: false, error: describeError(f.error) }); continue; }
    log(c.url, { ok: true, status: f.res.status, ms: f.res.ms });
    pages.push({ url: f.res.finalUrl, requestedUrl: c.url, kind: c.kind, status: f.res.status, headers: pickHeaders(f.res.headers), redirects: f.res.redirects, ms: f.res.ms, bytes: f.res.bytes, truncated: f.res.truncated, html: isHtml(f.res) && f.res.status < 400 ? extractPage(f.res.text, f.res.finalUrl) : null, contentType: f.res.contentType });
    await new Promise(r => setTimeout(r, 150));
  }

  return { startUrl, origin, startedAt, finishedAt: new Date().toISOString(), pages, skipped, robots, sitemap, llmsTxt, fetchLog };
}

function isHtml(res) { return /html|xhtml/i.test(res.contentType) || /^\s*<(!doctype|html)/i.test(res.text.slice(0, 200)); }
function pickHeaders(h) {
  const keep = ['content-type', 'x-robots-tag', 'server', 'cache-control', 'last-modified', 'strict-transport-security'];
  return Object.fromEntries(keep.filter(k => h[k]).map(k => [k, String(h[k]).slice(0, 200)]));
}

module.exports = { crawlSite, parseSitemap, pageKind, describeError };
