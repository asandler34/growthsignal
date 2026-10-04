'use strict';
// Fix kit: reviewable, copy and paste changes generated deterministically from facts the owner has
// confirmed. GrowthSignal never edits a customer's website; the owner (or their web person) applies these.
const CRAWLERS = require('../scanner/crawlers');

const DAY = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const SCHEMA_TYPES = ['LocalBusiness', 'HomeAndConstructionBusiness', 'Plumber', 'Electrician', 'HVACBusiness', 'RoofingContractor', 'GeneralContractor', 'HousePainter', 'Locksmith', 'MovingCompany', 'CleaningService', 'PestControl', 'LandscapingBusiness', 'AutoRepair', 'ProfessionalService', 'LegalService', 'AccountingService', 'Dentist', 'MedicalClinic', 'HealthAndBeautyBusiness', 'BeautySalon', 'DaySpa', 'ExerciseGym', 'Restaurant', 'Store', 'RealEstateAgent', 'VeterinaryCare', 'ChildCare'];

function clean(v, max = 200) { return v == null ? '' : String(v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }

// Validates and normalizes owner submitted facts. Returns { facts, errors }.
function normalizeFacts(input = {}) {
  const errors = [];
  const f = {
    name: clean(input.name, 100),
    type: SCHEMA_TYPES.includes(input.type) ? input.type : 'LocalBusiness',
    description: clean(input.description, 400),
    phone: clean(input.phone, 30),
    email: clean(input.email, 120).toLowerCase(),
    street: clean(input.street, 120),
    city: clean(input.city, 60),
    region: clean(input.region, 40),
    postalCode: clean(input.postalCode, 12),
    country: clean(input.country || 'US', 2).toUpperCase(),
    showAddress: input.showAddress !== false,
    areaServed: (Array.isArray(input.areaServed) ? input.areaServed : String(input.areaServed || '').split(',')).map(x => clean(x, 60)).filter(Boolean).slice(0, 25),
    services: (Array.isArray(input.services) ? input.services : String(input.services || '').split(',')).map(x => clean(x, 60)).filter(Boolean).slice(0, 15),
    hours: (Array.isArray(input.hours) ? input.hours : []).map(h => ({ days: (h.days || []).filter(d => DAY[d]), opens: /^\d{2}:\d{2}$/.test(h.opens) ? h.opens : null, closes: /^\d{2}:\d{2}$/.test(h.closes) ? h.closes : null })).filter(h => h.days.length && h.opens && h.closes).slice(0, 7),
    sameAs: (Array.isArray(input.sameAs) ? input.sameAs : String(input.sameAs || '').split(/[\s,]+/)).map(x => clean(x, 300)).filter(x => /^https:\/\/[^\s]+$/.test(x)).slice(0, 10),
    priceRange: clean(input.priceRange, 10),
  };
  if (!f.name) errors.push('Business name is required.');
  if (f.phone && f.phone.replace(/\D/g, '').length < 10) errors.push('Phone number looks incomplete.');
  if (f.email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(f.email)) errors.push('Email address looks invalid.');
  if (!f.city && !f.areaServed.length) errors.push('Add a city or at least one service area.');
  return { facts: f, errors };
}

function jsonLd(facts, siteUrl) {
  const node = { '@context': 'https://schema.org', '@type': facts.type, name: facts.name, url: siteUrl };
  if (facts.description) node.description = facts.description;
  if (facts.phone) node.telephone = facts.phone;
  if (facts.email) node.email = facts.email;
  if (facts.showAddress && facts.street) node.address = { '@type': 'PostalAddress', streetAddress: facts.street, addressLocality: facts.city, addressRegion: facts.region, postalCode: facts.postalCode, addressCountry: facts.country };
  else if (facts.city) node.address = { '@type': 'PostalAddress', addressLocality: facts.city, addressRegion: facts.region, addressCountry: facts.country };
  if (facts.areaServed.length) node.areaServed = facts.areaServed.map(a => ({ '@type': 'Place', name: a }));
  if (facts.hours.length) node.openingHoursSpecification = facts.hours.map(h => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.days.map(d => DAY[d]), opens: h.opens, closes: h.closes }));
  if (facts.services.length) node.hasOfferCatalog = { '@type': 'OfferCatalog', name: 'Services', itemListElement: facts.services.map(s => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s } })) };
  if (facts.sameAs.length) node.sameAs = facts.sameAs;
  if (facts.priceRange) node.priceRange = facts.priceRange;
  // Escape "<" so the block cannot terminate the surrounding <script> tag.
  return `<script type="application/ld+json">\n${JSON.stringify(node, null, 2).replace(/</g, '\\u003c')}\n</script>`;
}

function hoursText(facts) {
  return facts.hours.map(h => `${h.days.map(d => DAY[d]).join(', ')}: ${fmt(h.opens)} to ${fmt(h.closes)}`).join('\n');
}
function fmt(t) { const [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; const h12 = h % 12 || 12; return m ? `${h12}:${String(m).padStart(2, '0')}${ap}` : `${h12}${ap}`; }

function factsBlock(facts) {
  const lines = [`${facts.name}${facts.description ? `: ${facts.description}` : ''}`];
  if (facts.services.length) lines.push(`Services: ${facts.services.join(', ')}.`);
  if (facts.areaServed.length) lines.push(`Areas we serve: ${facts.areaServed.join(', ')}.`);
  if (facts.showAddress && facts.street) lines.push(`Address: ${facts.street}, ${facts.city}, ${facts.region} ${facts.postalCode}`.trim());
  if (facts.phone) lines.push(`Phone: ${facts.phone}`);
  if (facts.email) lines.push(`Email: ${facts.email}`);
  if (facts.hours.length) lines.push(`Hours:\n${hoursText(facts)}`);
  return lines.join('\n');
}

function faqDraft(facts) {
  const area = facts.areaServed.length ? facts.areaServed.slice(0, 4).join(', ') : facts.city;
  const s0 = facts.services[0] || 'your main service';
  return [
    { q: `What areas does ${facts.name} serve?`, a: area ? `We serve ${area}. [Confirm and add any limits, such as travel fees.]` : '[List the towns or neighborhoods you serve.]' },
    { q: `How much does ${s0.toLowerCase()} cost?`, a: '[Explain how you price this service, typical ranges if you publish them, and what affects the price.]' },
    { q: 'How quickly can you schedule a visit?', a: '[Describe typical lead time and whether you offer same day or emergency service.]' },
    { q: 'Are you licensed and insured?', a: '[State license numbers or certifications you hold. Only include what you can verify.]' },
    { q: `How do I book with ${facts.name}?`, a: `${facts.phone ? `Call ${facts.phone}` : '[Explain how to call or book online]'}${facts.hours.length ? ` during our hours (${hoursText(facts).split('\n')[0]}).` : '.'}` },
  ];
}

// robots.txt advice based on the latest scan's crawler table. Only search and user crawlers are
// recommended for unblocking; training crawlers are left to the owner's choice.
function robotsAdvice(crawlerTable) {
  const blocked = (crawlerTable || []).filter(c => !c.allowed && c.purpose !== 'training');
  if (!blocked.length) return { needed: false, snippet: null, blocked: [] };
  const snippet = blocked.map(c => `User-agent: ${c.token}\nAllow: /`).join('\n\n');
  return { needed: true, blocked: blocked.map(c => ({ token: c.token, operator: c.operator, rule: c.rule })), snippet, note: 'Add these groups to robots.txt, and remove any matching Disallow: / lines for these crawlers. Keep your other rules. Changes can take days to weeks to be picked up.' };
}

function buildFixKit(site, latestReport) {
  const { facts, errors } = normalizeFacts(site.facts || {});
  const confirmed = !!site.facts_confirmed_at && !errors.length;
  const items = [];
  if (confirmed) {
    items.push({ id: 'jsonld', title: 'Business structured data (JSON-LD)', where: 'Paste into the <head> of your homepage, or your builder\'s "custom code / header code" setting.', content: jsonLd(facts, site.url) });
    items.push({ id: 'facts', title: 'Business facts block', where: 'Add to your footer or contact page as visible text, so readers and crawlers see the same facts as your structured data.', content: factsBlock(facts) });
    items.push({ id: 'faq', title: 'FAQ draft', where: 'Edit the bracketed parts, then publish on an FAQ page or your services page.', content: faqDraft(facts).map(x => `Q: ${x.q}\nA: ${x.a}`).join('\n\n') });
  }
  const robots = robotsAdvice(latestReport && latestReport.crawlers);
  if (robots.needed) items.push({ id: 'robots', title: 'robots.txt change for search crawlers', where: robots.note, content: robots.snippet });
  return { confirmed, errors, items, notes: ['Review every item before publishing. Only publish facts that are true for your business.', 'After you publish, run a new scan to verify the change. Structured data and crawler access support accurate answers but do not guarantee them.'] };
}

module.exports = { normalizeFacts, jsonLd, factsBlock, faqDraft, robotsAdvice, buildFixKit, SCHEMA_TYPES };
