'use strict';
// One free, ready to paste starter fix for the anonymous preview. Built deterministically from what
// the scan found and what the visitor typed, with [bracketed] placeholders for anything unknown.
// Labeled as a draft to check: the full fix kit uses owner confirmed facts instead (D-011, D-029).
const { robotsAdvice } = require('./fixkit');

const TYPE_BY_CATEGORY = [
  [/plumb/i, 'Plumber'], [/electric/i, 'Electrician'], [/hvac|heating|air condition|furnace/i, 'HVACBusiness'],
  [/roof/i, 'RoofingContractor'], [/clean|maid|janitor/i, 'CleaningService'], [/landscap|lawn|garden/i, 'LandscapingBusiness'],
  [/pest|extermin/i, 'PestControl'], [/locksmith/i, 'Locksmith'], [/mov(er|ing)/i, 'MovingCompany'], [/paint/i, 'HousePainter'],
  [/contractor|remodel|construct|handyman/i, 'GeneralContractor'],
];

const html = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function values(report, ctx) {
  const f = report.facts || {};
  return {
    name: ctx.businessName || (f.names || [])[0] || '[Your business name]',
    category: ctx.category || '[type of business]',
    city: ctx.city || '[City]',
    region: ctx.region || '[State]',
    phone: (f.phones || [])[0] || '[Your phone number]',
    url: report.site?.finalUrl || report.site?.origin || '[Your website address]',
    type: (TYPE_BY_CATEGORY.find(([re]) => re.test(ctx.category || '')) || [null, 'LocalBusiness'])[1],
  };
}

function jsonLdDraft(v) {
  const node = {
    '@context': 'https://schema.org', '@type': v.type, name: v.name, url: v.url, telephone: v.phone,
    address: { '@type': 'PostalAddress', addressLocality: v.city, addressRegion: v.region, addressCountry: 'US' },
    areaServed: [{ '@type': 'Place', name: v.city }],
    openingHours: '[Mo-Fr 08:00-17:00]',
  };
  return `<script type="application/ld+json">\n${JSON.stringify(node, null, 2).replace(/</g, '\\u003c')}\n</script>`;
}

const BUILDERS = {
  ai_search_crawlers: (report) => {
    const r = robotsAdvice(report.crawlers);
    return r.needed ? { where: `Add to your robots.txt file. ${r.note}`, content: r.snippet } : null;
  },
  jsonld_business: (report, v) => ({ where: 'Paste into the <head> of your homepage, or your website builder\'s "header code" setting.', content: jsonLdDraft(v) }),
  jsonld_properties: (report, v) => ({ where: 'Replace your current business markup, or paste into the <head> of your homepage.', content: jsonLdDraft(v) }),
  jsonld_valid: (report, v) => ({ where: 'Replace the broken markup in your page <head> with this.', content: jsonLdDraft(v) }),
  sameas: (report, v) => ({ where: 'Add a "sameAs" list to your business markup with your official profile links.', content: `"sameAs": [\n  "[https://www.google.com/maps/... your Google Business Profile link]",\n  "[https://www.yelp.com/biz/... your Yelp page]",\n  "[https://www.facebook.com/... your Facebook page]"\n]` }),
  phone: (report, v) => ({ where: 'Add to your site header or footer as visible text, on every page.', content: `Call ${v.name}: ${v.phone}` }),
  location: (report, v) => ({ where: 'Add to your homepage and footer as visible text.', content: `${v.name} serves ${v.city}, ${v.region} and nearby: [list the towns or neighborhoods you cover].` }),
  hours: (report, v) => ({ where: 'Add to your contact page and footer as visible text.', content: `Hours\nMonday to Friday: [8am to 5pm]\nSaturday: [9am to 1pm, or Closed]\nSunday: [Closed]${/\[/.test(v.phone) ? '' : `\nEmergencies: call ${v.phone}`}` }),
  business_name: (report, v) => ({ where: 'Use as your homepage main heading, and keep the same name everywhere.', content: `<h1>${html(v.name)}: ${html(v.category)} in ${html(v.city)}, ${html(v.region)}</h1>` }),
  h1: (report, v) => ({ where: 'Use as the one main heading at the top of your homepage.', content: `<h1>${html(v.name)}: ${html(v.category)} in ${html(v.city)}, ${html(v.region)}</h1>` }),
  title_meta: (report, v) => ({ where: 'Set as your homepage title and description (in the <head>, or your builder\'s SEO settings).', content: `<title>${html(v.name)} | ${html(v.category)} in ${html(v.city)}, ${html(v.region)}</title>\n<meta name="description" content="${html(v.name)} provides [your main services] in ${html(v.city)} and nearby. Call ${html(v.phone)} [or book online].">` }),
  faq: (report, v) => ({ where: 'Edit the bracketed parts, then publish on an FAQ page or your services page.', content: `Q: What areas does ${v.name} serve?\nA: [List the towns you serve.]\n\nQ: How quickly can you schedule a visit?\nA: [Typical lead time; same day or emergency service if you offer it.]\n\nQ: Are you licensed and insured?\nA: [License numbers or certifications you can verify.]\n\nQ: How do I book?\nA: Call ${v.phone} [or book online at your booking page].` }),
};

// Returns a starter fix for the highest ranked of the given priorities that has one, or null.
function starterFix(report, context = {}, priorities = report.priorities.slice(0, 3)) {
  const v = values(report, context);
  for (const p of priorities) {
    const build = BUILDERS[p.checkId];
    const out = build && build(report, v);
    if (out) return { checkId: p.checkId, title: p.title, rank: p.rank, ...out, note: 'A draft built from what we found on your site and what you entered. Replace anything in [brackets] and check every value before publishing.' };
  }
  return null;
}

module.exports = { starterFix };
