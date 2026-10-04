'use strict';
// Mention and citation detection.
// Definitions (also documented in docs/methodology.md):
//  - mention: the answer text contains the business name (normalized, whole phrase) or its domain.
//  - citation: a source URL returned by the platform for that answer is on the business's domain
//    (or a subdomain of it).
//  - Third party profile citations (e.g. a Yelp page about the business) are reported as sources,
//    not as citations of the business website.

const SUFFIXES = /\b(llc|l\.l\.c|inc|incorporated|co|company|corp|corporation|ltd|pllc|pc|the)\b\.?/g;

function normalize(s) {
  return ` ${String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;
}
function normalizeName(name) {
  return normalize(String(name || '').toLowerCase().replace(SUFFIXES, ' ')).trim();
}
function bareDomain(d) {
  return String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
}
function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; }
}
function onDomain(host, domain) {
  if (!host || !domain) return false;
  return host === domain || host.endsWith(`.${domain}`);
}

function detectMention(text, { name, domain }) {
  const t = normalize(text);
  const n = normalizeName(name);
  if (n && n.length >= 3 && t.includes(` ${n} `)) return { mentioned: true, matchType: 'name' };
  const d = bareDomain(domain);
  if (d && String(text || '').toLowerCase().includes(d)) return { mentioned: true, matchType: 'domain' };
  return { mentioned: false, matchType: null };
}

function detectCitation(citations, domain) {
  const d = bareDomain(domain);
  // Sources the model only retrieved, without citing them in the answer, do not count as citations.
  const hits = (citations || []).filter(c => !c.retrievedOnly && onDomain(hostOf(c.url) || bareDomain(c.title), d));
  return { cited: hits.length > 0, urls: hits.map(h => h.url) };
}

// Phone numbers in an answer, normalized to 10 digits, to flag possible inaccurate facts.
function phonesIn(text) {
  const out = new Set();
  for (const m of String(text || '').matchAll(/(?:\+?1[\s.-]?)?\(?([2-9]\d{2})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/g)) out.add(m[1] + m[2] + m[3]);
  return [...out];
}

// Wilson score interval for a proportion, used to show uncertainty on small samples.
function wilson(successes, n, z = 1.96) {
  if (!n) return null;
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return { low: Math.max(0, center - half), high: Math.min(1, center + half) };
}

module.exports = { detectMention, detectCitation, normalizeName, bareDomain, hostOf, onDomain, phonesIn, wilson };
