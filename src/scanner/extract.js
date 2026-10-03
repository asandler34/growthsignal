'use strict';
// Extracts facts from crawled HTML. All page content is untrusted: we only read it as data,
// never execute it, and cap every string we keep.
const cheerio = require('cheerio');

const cap = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const PHONE_RE = /(?:\+?1[\s.-]?)?\(?([2-9]\d{2})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/g;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/gi;
const ADDRESS_RE = /\d{1,6}\s+[A-Za-z0-9.'\- ]{2,40}\s(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place|Pkwy|Parkway|Hwy|Highway|Cir|Circle|Ter|Terrace)\.?(?:,?\s+(?:Suite|Ste|Unit|#)\s*[\w-]+)?,?\s+[A-Za-z .'-]{2,30},?\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?/g;
const HOURS_RE = /\b(?:mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b[^.\n]{0,40}?\b\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)/i;

const PROFILE_HOSTS = {
  'google.com/maps': 'Google Maps', 'maps.google.': 'Google Maps', 'g.page': 'Google Business Profile', 'goo.gl/maps': 'Google Maps', 'maps.app.goo.gl': 'Google Maps',
  'facebook.com': 'Facebook', 'instagram.com': 'Instagram', 'linkedin.com': 'LinkedIn', 'yelp.com': 'Yelp', 'bbb.org': 'BBB',
  'angi.com': 'Angi', 'homeadvisor.com': 'HomeAdvisor', 'houzz.com': 'Houzz', 'thumbtack.com': 'Thumbtack', 'nextdoor.com': 'Nextdoor',
  'youtube.com': 'YouTube', 'tiktok.com': 'TikTok', 'x.com': 'X', 'twitter.com': 'X', 'tripadvisor.com': 'Tripadvisor', 'healthgrades.com': 'Healthgrades',
  'avvo.com': 'Avvo', 'zocdoc.com': 'Zocdoc', 'trustpilot.com': 'Trustpilot', 'porch.com': 'Porch',
};

function normalizePhone(m) {
  const digits = String(m).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : null;
}

function flattenJsonLd(node, out = []) {
  if (Array.isArray(node)) { node.forEach(n => flattenJsonLd(n, out)); return out; }
  if (node && typeof node === 'object') {
    if (node['@graph']) flattenJsonLd(node['@graph'], out);
    if (node['@type']) out.push(node);
  }
  return out;
}

function typesOf(node) {
  const t = node['@type'];
  return (Array.isArray(t) ? t : [t]).filter(Boolean).map(String);
}

function extractPage(html, pageUrl) {
  const $ = cheerio.load(html || '', { scriptingEnabled: false });
  const jsonld = [];
  const jsonldErrors = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (raw.length > 200000) { jsonldErrors.push('JSON-LD block larger than 200 KB skipped'); return; }
    try { flattenJsonLd(JSON.parse(raw), jsonld); } catch (e) { jsonldErrors.push(cap(e.message, 120)); }
  });
  const scriptCount = $('script').length;
  $('script, style, noscript, template, svg').remove();
  const bodyText = cap($('body').text(), 200000) || '';
  const words = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;

  const links = [];
  const profiles = new Map();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    let abs;
    try { abs = new URL(href, pageUrl); } catch { return; }
    if (abs.protocol === 'tel:' || abs.protocol === 'mailto:') return;
    if (!['http:', 'https:'].includes(abs.protocol)) return;
    abs.hash = '';
    links.push({ href: abs.href, text: cap($(el).text(), 80) });
    const hostPath = (abs.hostname.replace(/^www\./, '') + abs.pathname).toLowerCase();
    for (const [needle, label] of Object.entries(PROFILE_HOSTS)) {
      if (hostPath.startsWith(needle) || hostPath.includes(needle)) { if (!profiles.has(label)) profiles.set(label, abs.href); break; }
    }
  });

  const telLinks = $('a[href^="tel:"]').map((_, el) => normalizePhone($(el).attr('href'))).get().filter(Boolean);
  const mailLinks = $('a[href^="mailto:"]').map((_, el) => cap(String($(el).attr('href')).replace(/^mailto:/i, '').split('?')[0], 120)).get();
  const phones = new Set(telLinks);
  for (const m of bodyText.matchAll(PHONE_RE)) { const p = normalizePhone(m[0]); if (p) phones.add(p); if (phones.size > 10) break; }
  const emails = new Set(mailLinks.map(e => e.toLowerCase()));
  for (const m of bodyText.matchAll(EMAIL_RE)) { if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(m[0])) emails.add(m[0].toLowerCase()); if (emails.size > 10) break; }
  const addresses = new Set();
  for (const m of bodyText.matchAll(ADDRESS_RE)) { addresses.add(cap(m[0], 160)); if (addresses.size > 5) break; }
  const hoursMatch = HOURS_RE.exec(bodyText);

  const metaRobots = [$('meta[name="robots"]').attr('content'), $('meta[name="googlebot"]').attr('content')].filter(Boolean).join(', ');
  return {
    title: cap($('title').first().text(), 200),
    metaDescription: cap($('meta[name="description"]').attr('content'), 400),
    canonical: cap($('link[rel="canonical"]').attr('href'), 400),
    lang: cap($('html').attr('lang'), 20),
    metaRobots: cap(metaRobots, 200),
    ogSiteName: cap($('meta[property="og:site_name"]').attr('content'), 120),
    ogTitle: cap($('meta[property="og:title"]').attr('content'), 200),
    h1: $('h1').map((_, el) => cap($(el).text(), 160)).get().filter(Boolean).slice(0, 5),
    h2: $('h2').map((_, el) => cap($(el).text(), 160)).get().filter(Boolean).slice(0, 20),
    words,
    textSample: cap(bodyText, 600),
    scriptCount,
    jsonld: jsonld.slice(0, 30).map(n => JSON.parse(JSON.stringify(n, (k, v) => (typeof v === 'string' ? v.slice(0, 500) : v)))),
    jsonldErrors,
    links: links.slice(0, 400),
    profiles: Object.fromEntries(profiles),
    phones: [...phones].slice(0, 10),
    emails: [...emails].slice(0, 10),
    addresses: [...addresses],
    hoursSnippet: hoursMatch ? cap(bodyText.slice(Math.max(0, hoursMatch.index - 20), hoursMatch.index + 80), 120) : null,
    hasFaqContent: /frequently asked|\bfaqs?\b/i.test(bodyText) || $('details summary').length >= 3,
    hasReviewsContent: /\breviews?\b|testimonials?|what (our )?(customers|clients) say/i.test(bodyText),
  };
}

module.exports = { extractPage, typesOf, normalizePhone, cap };
