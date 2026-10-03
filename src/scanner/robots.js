'use strict';
// robots.txt parsing and matching per RFC 9309 (longest match wins; Allow wins a tie).

function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  let current = null;
  let lastWasAgent = false;
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (key === 'allow' || key === 'disallow') {
      lastWasAgent = false;
      if (!current) continue;
      current.rules.push({ allow: key === 'allow', path: value });
    } else if (key === 'sitemap') {
      sitemaps.push(value);
    } else {
      lastWasAgent = false;
    }
  }
  return { groups, sitemaps };
}

function ruleMatches(pattern, path) {
  if (pattern === '') return false;
  let re = '^';
  for (const ch of pattern) {
    if (ch === '*') re += '.*';
    else if (ch === '$') re += '$';
    else re += ch.replace(/[.+?^{}()|[\]\\]/g, '\\$&');
  }
  try { return new RegExp(re).test(path); } catch { return false; }
}

// Returns the group that applies to the product token, or null if none (everything allowed).
function groupFor(parsed, token) {
  const t = token.toLowerCase();
  const specific = parsed.groups.filter(g => g.agents.some(a => a !== '*' && t.startsWith(a)));
  if (specific.length) return { rules: specific.flatMap(g => g.rules), matchedAgent: token };
  const star = parsed.groups.filter(g => g.agents.includes('*'));
  if (star.length) return { rules: star.flatMap(g => g.rules), matchedAgent: '*' };
  return null;
}

function isAllowed(parsed, token, path = '/') {
  const g = groupFor(parsed, token);
  if (!g) return { allowed: true, matchedAgent: null, rule: null };
  let best = null;
  for (const r of g.rules) {
    if (!ruleMatches(r.path, path)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow && !best.allow)) best = r;
  }
  return { allowed: !best || best.allow, matchedAgent: g.matchedAgent, rule: best ? `${best.allow ? 'Allow' : 'Disallow'}: ${best.path}` : null };
}

module.exports = { parseRobots, isAllowed };
