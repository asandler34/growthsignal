'use strict';
// Website readiness rubric. 100 points across four categories. Every check reports what we found,
// why it matters, how to fix it, and the evidence (URL plus detail). Checks we could not perform are
// marked "not_checked" and removed from the denominator rather than counted as failures.
const { isAllowed } = require('./robots');
const CRAWLERS = require('./crawlers');
const { typesOf } = require('./extract');

const CATEGORIES = {
  access: { label: 'Access', max: 35, question: 'Can search and AI systems reach and read your pages?' },
  business: { label: 'Business information', max: 25, question: 'Can a reader find who you are, where you work, and how to reach you?' },
  structured: { label: 'Structured data', max: 20, question: 'Do your pages describe your business in machine readable form?' },
  content: { label: 'Content clarity', max: 20, question: 'Do your pages clearly explain what you do and answer common questions?' },
};

const LOCAL_TYPES = /^(LocalBusiness|Organization|Corporation|ProfessionalService|HomeAndConstructionBusiness|Plumber|Electrician|HVACBusiness|RoofingContractor|GeneralContractor|HousePainter|Locksmith|MovingCompany|LegalService|Attorney|Dentist|Physician|MedicalBusiness|MedicalClinic|HealthAndBeautyBusiness|DaySpa|BeautySalon|HairSalon|AutoRepair|AutomotiveBusiness|Restaurant|FoodEstablishment|CafeOrCoffeeShop|Bakery|Store|ClothingStore|HomeGoodsStore|AccountingService|FinancialService|InsuranceAgency|RealEstateAgent|ExerciseGym|SportsActivityLocation|LodgingBusiness|Hotel|ChildCare|EducationalOrganization|CleaningService|PestControl|LandscapingBusiness|VeterinaryCare|Optician|Pharmacy|EmergencyService|EntertainmentBusiness|TravelAgency|NGO|SelfStorage|ShoppingCenter|[A-Za-z]+(Business|Service|Store|Contractor))$/;

function check(id, category, title, maxPoints, severity) {
  return { id, category, title, maxPoints, severity, status: 'not_checked', points: 0, found: '', why: '', fix: '', evidence: [] };
}
function score(c, status, points, found, evidence = []) {
  c.status = status; c.points = Math.max(0, Math.min(c.maxPoints, Math.round(points * 10) / 10)); c.found = found; c.evidence = evidence; return c;
}

function htmlPages(crawl) { return crawl.pages.filter(p => p.html && p.status < 400); }

function runChecks(crawl, context = {}) {
  const checks = [];
  const home = crawl.pages[0];
  const pages = htmlPages(crawl);
  const homeHtml = home.html;
  const allJsonLd = pages.flatMap(p => p.html.jsonld.map(n => ({ node: n, url: p.url })));
  const why = {};

  // ---------- Access ----------
  {
    const c = check('https_home', 'access', 'Homepage loads securely', 7, 'high');
    c.why = 'Search systems and visitors expect a working, secure homepage. Errors or insecure pages are less likely to be used as a source.';
    c.fix = 'Make sure your homepage returns a normal page (HTTP 200) at an https:// address and that http:// redirects to it. Your web host or website builder usually has a one click setting for this.';
    const https = home.url.startsWith('https://');
    const ok = home.status >= 200 && home.status < 300;
    const ev = [{ url: home.url, detail: `HTTP ${home.status}${home.redirects.length ? ` after ${home.redirects.length} redirect(s)` : ''}, ${home.ms} ms` }];
    if (ok && https) score(c, 'pass', 7, 'Your homepage loaded over HTTPS.', ev);
    else if (ok) score(c, 'partial', 3, 'Your homepage loaded, but not over a secure https:// connection.', ev);
    else score(c, 'fail', 0, `Your homepage returned HTTP ${home.status}.`, ev);
    checks.push(c);
  }
  {
    const c = check('ai_search_crawlers', 'access', 'Search and AI answer crawlers are allowed', 12, 'high');
    c.why = 'AI assistants that search the web, such as ChatGPT search, Perplexity, Copilot and Google AI features, rely on crawlers. If robots.txt blocks them, your pages are less likely to be found or cited. Being allowed does not guarantee inclusion.';
    c.fix = 'Edit robots.txt so the blocked search crawlers listed in the evidence are not disallowed. Blocking training crawlers (such as GPTBot or CCBot) is a separate choice and does not affect this check.';
    if (!crawl.robots.found && crawl.robots.error) {
      score(c, 'partial', 6, `We could not read robots.txt (${crawl.robots.error}). Some crawlers treat an erroring robots.txt as "do not crawl".`, [{ url: crawl.robots.url, detail: crawl.robots.error }]);
    } else {
      const search = CRAWLERS.filter(x => x.purpose === 'search');
      const results = search.map(x => ({ ...x, ...isAllowed(crawl.robots.parsed, x.token, '/') }));
      const blocked = results.filter(r => !r.allowed);
      const ev = results.map(r => ({ url: crawl.robots.url, detail: `${r.token} (${r.operator}): ${r.allowed ? 'allowed' : 'BLOCKED'}${r.rule ? ` by "${r.rule}"` : ''}${r.matchedAgent ? ` in the ${r.matchedAgent === '*' ? 'catch-all (*)' : r.matchedAgent} group` : ''}` }));
      const pts = 12 * (search.length - blocked.length) / search.length;
      if (!crawl.robots.found) score(c, 'pass', 12, 'No robots.txt file was found, so crawlers are allowed by default.', [{ url: crawl.robots.url, detail: `HTTP ${crawl.robots.status ?? 'error'}` }]);
      else if (!blocked.length) score(c, 'pass', 12, 'Your robots.txt allows the major search and AI answer crawlers we check.', ev);
      else score(c, blocked.length === search.length ? 'fail' : 'partial', pts, `Your robots.txt blocks ${blocked.map(b => b.token).join(', ')} from your homepage.`, ev);
    }
    checks.push(c);
  }
  {
    const c = check('noindex', 'access', 'Key pages are not marked "noindex"', 8, 'high');
    c.why = 'A "noindex" instruction tells search engines to leave a page out of their index, which removes it as a source for search based AI answers.';
    c.fix = 'Remove "noindex" from the meta robots tag or X-Robots-Tag header on the pages listed. In most website builders this is a "hide from search engines" setting on the page or site.';
    const flagged = crawl.pages.filter(p => /noindex/i.test(p.html?.metaRobots || '') || /noindex/i.test(p.headers['x-robots-tag'] || ''));
    const homeFlag = flagged.some(p => p === home);
    const ev = flagged.map(p => ({ url: p.url, detail: `meta robots: "${p.html?.metaRobots || ''}" X-Robots-Tag: "${p.headers['x-robots-tag'] || ''}"` }));
    if (!flagged.length) score(c, 'pass', 8, `None of the ${crawl.pages.length} pages we read are marked noindex.`, crawl.pages.slice(0, 3).map(p => ({ url: p.url, detail: 'no noindex directive' })));
    else score(c, homeFlag ? 'fail' : 'partial', homeFlag ? 0 : 4, `${flagged.length} page(s) are marked noindex${homeFlag ? ', including your homepage' : ''}.`, ev);
    checks.push(c);
  }
  {
    const c = check('readable_without_js', 'access', 'Main content is readable without running JavaScript', 5, 'medium');
    c.why = 'Many crawlers read the HTML your server sends and do not run JavaScript. If your text only appears after scripts run, they may see an almost empty page.';
    c.fix = 'Ask your developer or website builder support whether the site uses server side rendering or prerendering. Most builders such as WordPress, Squarespace and Wix already send readable HTML.';
    if (!homeHtml) score(c, 'fail', 0, 'Your homepage did not return readable HTML.', [{ url: home.url, detail: `content type ${home.contentType}` }]);
    else if (homeHtml.words >= 150) score(c, 'pass', 5, `Your homepage HTML contains about ${homeHtml.words} words of readable text.`, [{ url: home.url, detail: `${homeHtml.words} words, ${homeHtml.scriptCount} script tags` }]);
    else if (homeHtml.words >= 50) score(c, 'partial', 2.5, `Your homepage HTML contains only about ${homeHtml.words} words of readable text.`, [{ url: home.url, detail: `${homeHtml.words} words, ${homeHtml.scriptCount} script tags` }]);
    else score(c, 'fail', 0, `Your homepage HTML contains almost no readable text (${homeHtml.words} words)${homeHtml.scriptCount > 3 ? ', which usually means content is loaded by JavaScript' : ''}.`, [{ url: home.url, detail: `${homeHtml.words} words, ${homeHtml.scriptCount} script tags` }]);
    checks.push(c);
  }
  {
    const c = check('sitemap', 'access', 'XML sitemap is available', 3, 'low');
    c.why = 'A sitemap lists your important pages so crawlers can find them, including pages that are not linked from your homepage.';
    c.fix = 'Turn on the sitemap feature in your website builder or SEO plugin, then add a "Sitemap: https://yourdomain/sitemap.xml" line to robots.txt.';
    if (crawl.sitemap.found) score(c, 'pass', 3, `We found a sitemap listing ${crawl.sitemap.urlCount} URL(s).`, [{ url: crawl.sitemap.url, detail: `${crawl.sitemap.urlCount} URLs${crawl.sitemap.isIndex ? ' (sitemap index)' : ''}` }]);
    else score(c, 'fail', 0, 'We did not find an XML sitemap at /sitemap.xml or in robots.txt.', [{ url: `${crawl.origin}/sitemap.xml`, detail: 'not found' }]);
    checks.push(c);
  }

  // ---------- Business information ----------
  const names = new Set();
  allJsonLd.forEach(({ node }) => { if (typesOf(node).some(t => LOCAL_TYPES.test(t)) && node.name) names.add(String(node.name)); });
  const ogName = homeHtml?.ogSiteName;
  const titleName = (homeHtml?.title || '').split(/\s[|\-–—:]\s/)[0];
  {
    const c = check('business_name', 'business', 'Business name is clearly stated', 4, 'medium');
    c.why = 'AI answers name businesses. A consistent, clearly stated name helps systems connect your website to mentions of you elsewhere.';
    c.fix = 'Use your exact business name in your homepage title, your site name setting, and your structured data.';
    const ctxName = context.businessName;
    const candidates = [...names, ogName, titleName].filter(Boolean);
    const ev = [{ url: home.url, detail: `title: "${homeHtml?.title || ''}"${ogName ? `, og:site_name: "${ogName}"` : ''}${names.size ? `, structured data name: "${[...names][0]}"` : ''}` }];
    if (!homeHtml) score(c, 'not_checked', 0, 'Homepage HTML unavailable.');
    else if (ctxName && candidates.some(n => n.toLowerCase().includes(ctxName.toLowerCase()))) score(c, 'pass', 4, `Your business name "${ctxName}" appears in your homepage title or site metadata.`, ev);
    else if (ctxName && homeHtml.textSample.toLowerCase().includes(ctxName.toLowerCase())) score(c, 'partial', 2, `"${ctxName}" appears on your homepage but not in the page title or site metadata.`, ev);
    else if (!ctxName && (names.size || ogName)) score(c, 'pass', 4, `Your site declares a business name: "${[...names][0] || ogName}".`, ev);
    else if (!ctxName && titleName) score(c, 'partial', 2, `We could only infer a name from your page title ("${titleName}").`, ev);
    else score(c, 'fail', 0, ctxName ? `We could not find "${ctxName}" in your homepage title, metadata, or opening text.` : 'We could not find a clearly declared business name.', ev);
    checks.push(c);
  }
  const phonesByPage = pages.map(p => ({ url: p.url, phones: p.html.phones }));
  const allPhones = [...new Set(phonesByPage.flatMap(p => p.phones))];
  {
    const c = check('phone', 'business', 'Phone number is listed and consistent', 6, 'high');
    c.why = 'Phone numbers are one of the facts AI answers repeat for local businesses. Conflicting numbers make your information less trustworthy.';
    c.fix = allPhones.length > 2 ? 'Use one main phone number across your website, and make sure it matches your Google Business Profile and directory listings.' : 'Add your main phone number as text (not just an image) in your header or footer and on your contact page.';
    const ev = phonesByPage.filter(p => p.phones.length).slice(0, 6).map(p => ({ url: p.url, detail: p.phones.join(', ') }));
    if (!allPhones.length) score(c, 'fail', 0, 'We did not find a phone number in the text of the pages we read.', pages.slice(0, 3).map(p => ({ url: p.url, detail: 'no phone number found' })));
    else if (allPhones.length <= 2) score(c, 'pass', 6, `We found ${allPhones.length === 1 ? 'one consistent phone number' : 'two phone numbers'}: ${allPhones.join(', ')}.`, ev);
    else score(c, 'partial', 3, `We found ${allPhones.length} different phone numbers across your pages, which can confuse readers and AI systems.`, ev);
    checks.push(c);
  }
  const addrs = [...new Set(pages.flatMap(p => p.html.addresses))];
  const ldAddress = allJsonLd.find(({ node }) => node.address);
  const ldArea = allJsonLd.find(({ node }) => node.areaServed);
  const areaText = pages.find(p => /\b(serv(?:ing|e|ice area)|proudly serving|areas we serve)\b[^.]{0,80}\b[A-Z][a-z]+/.test(p.html.textSample + ' ' + p.html.h2.join(' ')));
  {
    const c = check('location', 'business', 'Location or service area is stated', 6, 'high');
    c.why = 'Local questions ("near me", "in Austin") are answered with businesses that clearly state where they are or where they work.';
    c.fix = 'State your street address (if customers visit you) or the towns you serve, in text, on your homepage or contact page and in your structured data (address or areaServed).';
    const ev = [];
    if (addrs.length) ev.push({ url: pages.find(p => p.html.addresses.length).url, detail: addrs[0] });
    if (ldAddress) ev.push({ url: ldAddress.url, detail: 'structured data address present' });
    if (ldArea) ev.push({ url: ldArea.url, detail: 'structured data areaServed present' });
    if (areaText) ev.push({ url: areaText.url, detail: 'service area wording found in page text' });
    if (addrs.length || ldAddress) score(c, 'pass', 6, addrs.length ? `We found an address: ${addrs[0]}.` : 'Your structured data includes an address.', ev);
    else if (ldArea || areaText) score(c, 'pass', 6, 'We found service area information.', ev);
    else score(c, 'fail', 0, 'We did not find a street address or service area in the pages we read.', pages.slice(0, 3).map(p => ({ url: p.url, detail: 'no address or service area found' })));
    checks.push(c);
  }
  {
    const c = check('hours', 'business', 'Opening hours are stated', 4, 'medium');
    c.why = 'Hours are a common question ("open now", "open Sunday"). Stating them clearly reduces wrong answers.';
    c.fix = 'List your hours as text on your contact page or footer, and add openingHoursSpecification to your structured data.';
    const ldHours = allJsonLd.find(({ node }) => node.openingHours || node.openingHoursSpecification);
    const textHours = pages.find(p => p.html.hoursSnippet);
    if (ldHours || textHours) score(c, 'pass', 4, 'We found opening hours.', [ldHours && { url: ldHours.url, detail: 'structured data opening hours present' }, textHours && { url: textHours.url, detail: textHours.html.hoursSnippet }].filter(Boolean));
    else score(c, context.appointmentOnly ? 'not_applicable' : 'fail', 0, 'We did not find opening hours in text or structured data.', []);
    checks.push(c);
  }
  {
    const c = check('contact', 'business', 'Contact page or contact details are easy to find', 5, 'medium');
    c.why = 'A clear contact page gives readers and AI systems a single trustworthy source for how to reach you.';
    c.fix = 'Add a "Contact" page linked from your main menu with your phone, email or form, address or service area, and hours.';
    const contactPage = crawl.pages.find(p => p.kind === 'contact' && p.status < 400);
    const contactLink = homeHtml?.links.find(l => /contact/i.test(l.href + ' ' + l.text));
    const anyEmail = pages.some(p => p.html.emails.length);
    if (contactPage) score(c, 'pass', 5, 'We found a contact page.', [{ url: contactPage.url, detail: `HTTP ${contactPage.status}` }]);
    else if (contactLink) score(c, 'partial', 3, 'Your homepage links to a contact page, but we could not read it.', [{ url: contactLink.href, detail: 'linked from homepage' }]);
    else if (anyEmail || allPhones.length) score(c, 'partial', 2, 'We found contact details but no dedicated contact page.', []);
    else score(c, 'fail', 0, 'We did not find a contact page or contact details.', []);
    checks.push(c);
  }

  // ---------- Structured data ----------
  const ldErrors = pages.flatMap(p => p.html.jsonldErrors.map(e => ({ url: p.url, detail: e })));
  const bizNodes = allJsonLd.filter(({ node }) => typesOf(node).some(t => LOCAL_TYPES.test(t)));
  {
    const c = check('jsonld_valid', 'structured', 'Structured data is present and valid JSON', 5, 'medium');
    c.why = 'Structured data (JSON-LD) states facts in a format software reads reliably. Broken JSON is ignored.';
    c.fix = ldErrors.length ? 'Fix the JSON syntax errors listed in the evidence. Validate with the Schema.org validator (validator.schema.org).' : 'Add a JSON-LD block describing your business. GrowthSignal can generate one from facts you confirm.';
    if (ldErrors.length) score(c, allJsonLd.length ? 'partial' : 'fail', allJsonLd.length ? 2 : 0, `${ldErrors.length} structured data block(s) could not be parsed.`, ldErrors.slice(0, 5));
    else if (allJsonLd.length) score(c, 'pass', 5, `We found ${allJsonLd.length} valid structured data item(s): ${[...new Set(allJsonLd.flatMap(x => typesOf(x.node)))].slice(0, 6).join(', ')}.`, [...new Set(allJsonLd.map(x => x.url))].slice(0, 4).map(u => ({ url: u, detail: 'JSON-LD present' })));
    else score(c, 'fail', 0, 'We did not find any JSON-LD structured data.', [{ url: home.url, detail: 'no application/ld+json blocks' }]);
    checks.push(c);
  }
  {
    const c = check('jsonld_business', 'structured', 'Business described with LocalBusiness or Organization markup', 7, 'medium');
    c.why = 'LocalBusiness or Organization markup is the standard way to tell software your name, address, phone, hours and website. It supports, but does not guarantee, accurate answers.';
    c.fix = 'Add LocalBusiness markup (or a more specific type such as Plumber or Dentist) to your homepage. Use the generated markup in your GrowthSignal fix kit after confirming your facts.';
    if (bizNodes.length) score(c, 'pass', 7, `Found ${typesOf(bizNodes[0].node).join('/')} markup.`, [{ url: bizNodes[0].url, detail: `@type ${typesOf(bizNodes[0].node).join(', ')}` }]);
    else score(c, 'fail', 0, 'No LocalBusiness or Organization markup was found.', [{ url: home.url, detail: allJsonLd.length ? `types found: ${[...new Set(allJsonLd.flatMap(x => typesOf(x.node)))].join(', ')}` : 'no JSON-LD' }]);
    checks.push(c);
  }
  {
    const c = check('jsonld_properties', 'structured', 'Business markup includes key facts', 6, 'medium');
    c.why = 'Markup is most useful when it includes the facts customers ask about.';
    c.fix = 'Add the missing properties listed in the evidence to your business markup.';
    if (!bizNodes.length) score(c, 'fail', 0, 'No business markup to evaluate.', []);
    else {
      const n = bizNodes[0].node;
      const want = { name: !!n.name, url: !!n.url, telephone: !!n.telephone, 'address or areaServed': !!(n.address || n.areaServed), 'opening hours': !!(n.openingHours || n.openingHoursSpecification) };
      const have = Object.entries(want).filter(([, v]) => v).map(([k]) => k);
      const missing = Object.entries(want).filter(([, v]) => !v).map(([k]) => k);
      score(c, missing.length ? 'partial' : 'pass', 6 * have.length / 5, missing.length ? `Your business markup is missing: ${missing.join(', ')}.` : 'Your business markup includes name, URL, phone, location and hours.', [{ url: bizNodes[0].url, detail: `present: ${have.join(', ') || 'none'}; missing: ${missing.join(', ') || 'none'}` }]);
    }
    checks.push(c);
  }
  {
    const c = check('sameas', 'structured', 'Markup links to your official profiles', 2, 'low');
    c.why = 'The sameAs property connects your website to your profiles elsewhere (for example Google Business Profile, Yelp, Facebook), which helps systems confirm they describe the same business.';
    c.fix = 'Add a sameAs list with the URLs of your official profiles to your business markup.';
    const n = bizNodes[0]?.node;
    const same = n ? [].concat(n.sameAs || []) : [];
    if (same.length) score(c, 'pass', 2, `Your markup links to ${same.length} profile(s).`, [{ url: bizNodes[0].url, detail: same.slice(0, 5).join(', ') }]);
    else score(c, 'fail', 0, 'Your markup does not link to any official profiles.', []);
    checks.push(c);
  }

  // ---------- Content clarity ----------
  {
    const c = check('title_meta', 'content', 'Homepage title and description explain the business', 4, 'medium');
    c.why = 'Titles and descriptions are often the first summary a system reads about a page.';
    c.fix = 'Write a homepage title like "Business Name | Service in City" and a one or two sentence description of what you do and where.';
    if (!homeHtml) score(c, 'not_checked', 0, 'Homepage HTML unavailable.');
    else {
      const t = homeHtml.title || '';
      const d = homeHtml.metaDescription || '';
      const ev = [{ url: home.url, detail: `title (${t.length} chars): "${t}"; description (${d.length} chars): "${d.slice(0, 160)}"` }];
      const tOk = t.length >= 15 && !/^(home|homepage|welcome)$/i.test(t.trim());
      const dOk = d.length >= 50;
      score(c, tOk && dOk ? 'pass' : tOk || dOk ? 'partial' : 'fail', (tOk ? 2 : 0) + (dOk ? 2 : 0), tOk && dOk ? 'Your homepage has a descriptive title and meta description.' : !tOk && !dOk ? 'Your homepage title is missing or generic and there is no useful meta description.' : !tOk ? 'Your homepage title is missing or too generic.' : 'Your homepage has no useful meta description.', ev);
    }
    checks.push(c);
  }
  {
    const c = check('h1', 'content', 'Homepage has one clear main heading', 3, 'low');
    c.why = 'A single main heading signals the page topic to readers and software.';
    c.fix = 'Give your homepage one H1 heading that says what you do, for example "Emergency Plumbing in Denver".';
    if (!homeHtml) score(c, 'not_checked', 0, 'Homepage HTML unavailable.');
    else if (homeHtml.h1.length === 1) score(c, 'pass', 3, `Your homepage has one main heading: "${homeHtml.h1[0]}".`, [{ url: home.url, detail: `H1: ${homeHtml.h1[0]}` }]);
    else if (homeHtml.h1.length > 1) score(c, 'partial', 2, `Your homepage has ${homeHtml.h1.length} H1 headings.`, [{ url: home.url, detail: homeHtml.h1.join(' | ') }]);
    else score(c, 'fail', 0, 'Your homepage has no H1 heading.', [{ url: home.url, detail: 'no <h1>' }]);
    checks.push(c);
  }
  {
    const c = check('services', 'content', 'Services are explained in detail', 5, 'high');
    c.why = 'AI answers match businesses to specific needs. Pages that explain each service, who it is for and where you offer it give those systems something concrete to use.';
    c.fix = 'Create a page (or section) for each main service: what it includes, who it is for, the areas you serve, and typical questions. Aim for a few hundred useful words each.';
    const svc = pages.filter(p => p.kind === 'services');
    const best = svc.sort((a, b) => b.html.words - a.html.words)[0];
    const serviceHeadings = homeHtml ? homeHtml.h2.filter(h => /service|repair|install|clean|design|treat|consult|plan|care|maint/i.test(h)) : [];
    if (best && best.html.words >= 300) score(c, 'pass', 5, `Your services page has about ${best.html.words} words.`, [{ url: best.url, detail: `${best.html.words} words` }]);
    else if (best) score(c, 'partial', 2.5, `Your services page is short (about ${best.html.words} words).`, [{ url: best.url, detail: `${best.html.words} words` }]);
    else if (serviceHeadings.length >= 2) score(c, 'partial', 2.5, 'Your homepage lists services but we did not find a dedicated services page.', [{ url: home.url, detail: serviceHeadings.slice(0, 5).join(' | ') }]);
    else score(c, 'fail', 0, 'We did not find a page or section that explains your services.', []);
    checks.push(c);
  }
  {
    const c = check('faq', 'content', 'Common customer questions are answered', 4, 'medium');
    c.why = 'People ask assistants full questions. Clear answers on your site ("How much does X cost?", "Do you serve Y?") give those systems direct material.';
    c.fix = 'Add an FAQ section answering the questions customers actually ask: pricing approach, service area, timing, guarantees, and how to book.';
    const faqPage = pages.find(p => p.kind === 'faq' || p.html.hasFaqContent);
    const faqLd = allJsonLd.find(({ node }) => typesOf(node).includes('FAQPage'));
    if (faqPage || faqLd) score(c, 'pass', 4, 'We found question and answer content.', [faqPage && { url: faqPage.url, detail: 'FAQ content found' }, faqLd && { url: faqLd.url, detail: 'FAQPage markup' }].filter(Boolean));
    else score(c, 'fail', 0, 'We did not find FAQ or question and answer content.', []);
    checks.push(c);
  }
  {
    const c = check('trust', 'content', 'About and reputation information is present', 4, 'medium');
    c.why = 'Recommendations favor businesses with clear evidence of who they are and what customers say. Reviews on independent sites usually matter more than your own page, but your site should point to them.';
    c.fix = 'Add an About page (who you are, experience, licenses) and link to your real review profiles. Never post invented reviews.';
    const about = crawl.pages.find(p => p.kind === 'about' && p.status < 400);
    const reviews = pages.find(p => p.html.hasReviewsContent);
    const profileCount = Object.keys(Object.assign({}, ...pages.map(p => p.html.profiles))).length;
    const pts = (about ? 2 : 0) + (reviews || profileCount ? 2 : 0);
    score(c, pts === 4 ? 'pass' : pts ? 'partial' : 'fail', pts, [about ? 'We found an About page.' : 'We did not find an About page.', reviews || profileCount ? 'We found reviews content or links to review profiles.' : 'We did not find reviews content or links to review profiles.'].join(' '), [about && { url: about.url, detail: 'about page' }, reviews && { url: reviews.url, detail: 'reviews or testimonials wording' }].filter(Boolean));
    checks.push(c);
  }

  return checks;
}

function summarizeScore(checks) {
  const cats = {};
  for (const [key, meta] of Object.entries(CATEGORIES)) {
    const cs = checks.filter(c => c.category === key);
    const counted = cs.filter(c => !['not_checked', 'not_applicable'].includes(c.status));
    const max = counted.reduce((s, c) => s + c.maxPoints, 0);
    const earned = counted.reduce((s, c) => s + c.points, 0);
    cats[key] = { ...meta, earned: Math.round(earned * 10) / 10, possible: max, pct: max ? Math.round((earned / max) * 100) : null, notChecked: cs.filter(c => c.status === 'not_checked').length };
  }
  const possible = Object.values(cats).reduce((s, c) => s + c.possible, 0);
  const earned = Object.values(cats).reduce((s, c) => s + c.earned, 0);
  const total = possible ? Math.round((earned / possible) * 100) : null;
  const band = total == null ? 'Not scored' : total >= 85 ? 'Strong foundation' : total >= 65 ? 'Good foundation with clear gaps' : total >= 40 ? 'Significant gaps' : 'Major barriers';
  return { total, band, earned: Math.round(earned * 10) / 10, possible, categories: cats };
}

const SEVERITY_WEIGHT = { high: 3, medium: 2, low: 1 };
function prioritize(checks) {
  return checks
    .filter(c => c.status === 'fail' || c.status === 'partial')
    .map(c => ({ ...c, impact: (c.maxPoints - c.points) * SEVERITY_WEIGHT[c.severity] }))
    .sort((a, b) => b.impact - a.impact)
    .map((c, i) => ({ rank: i + 1, checkId: c.id, title: c.title, category: c.category, severity: c.severity, pointsAvailable: Math.round((c.maxPoints - c.points) * 10) / 10, what: c.found, why: c.why, how: c.fix }));
}

module.exports = { runChecks, summarizeScore, prioritize, CATEGORIES };
