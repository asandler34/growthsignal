'use strict';
// Builds the default prompt set from owner-provided business context. Owners can edit, disable or add
// prompts. Prompts state the location explicitly because API requests do not carry a person's
// real location the way a consumer app might.

function place(site) {
  return [site.city, site.region].filter(Boolean).join(', ');
}

function defaultPrompts(site, max = 10) {
  const loc = place(site);
  const cat = (site.category || 'local business').trim();
  const services = (site.services || []).map(s => String(s).trim()).filter(Boolean);
  const near = loc ? ` in ${loc}` : '';
  const list = [];
  const add = (text, intent) => { if (!list.some(p => p.text.toLowerCase() === text.toLowerCase())) list.push({ text, intent }); };

  add(`Who are the best ${plural(cat)}${near}?`, 'discovery');
  add(`Can you recommend a reliable ${cat}${near}?`, 'discovery');
  for (const s of services.slice(0, 4)) add(`I need ${s.toLowerCase()}${near}. Which companies should I contact?`, 'discovery');
  add(`Which ${plural(cat)}${near} have the best reviews?`, 'discovery');
  if (services[0]) add(`How much does ${services[0].toLowerCase()} cost${near}, and who offers it?`, 'discovery');
  add(`Top rated ${cat}${loc ? ` near ${loc}` : ''} that is open on weekends`, 'discovery');
  if (site.business_name) add(`What do you know about ${site.business_name}${loc ? ` in ${loc}` : ''}? Include contact details.`, 'brand');
  // Keep one brand prompt in the set even when the limit is small.
  const brand = list.filter(p => p.intent === 'brand');
  const discovery = list.filter(p => p.intent === 'discovery');
  return [...discovery.slice(0, Math.max(1, max - brand.length)), ...brand].slice(0, max);
}

function plural(word) {
  const w = word.trim();
  if (/(s|x|z|ch|sh)$/i.test(w)) return `${w}es`;
  if (/[^aeiou]y$/i.test(w)) return `${w.slice(0, -1)}ies`;
  if (/\b(services|business|law firm|practice)$/i.test(w)) return w;
  return `${w}s`;
}

module.exports = { defaultPrompts, plural };
