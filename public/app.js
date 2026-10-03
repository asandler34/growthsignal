// Homepage interactions: free scan form, sample reports, pricing toggle, product FAQ and inquiry form.
(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // ---------- Free scan ----------
  const form = $('#scan-form');
  const status = $('#scan-status');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.url.trim()) { status.innerHTML = ''; status.append(msg('Enter your website address, like yourbusiness.com.', 'err')); $('#scan-url').focus(); return; }
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    status.textContent = 'Starting your scan…';
    try {
      const res = await fetch('/api/scans', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Could not start the scan.');
      location.href = j.siteId ? `/app/site/${j.siteId}` : `/scan/${j.id}`;
    } catch (err) {
      status.innerHTML = '';
      status.append(msg(err.message, 'err'));
      btn.disabled = false;
    }
  });
  function msg(text, cls) { const s = document.createElement('span'); s.className = cls; s.textContent = text; return s; }

  fetch('/api/me').then(r => r.json()).then(j => { if (j.user) { $('#nav-signin').textContent = 'Dashboard'; } }).catch(() => {});

  // ---------- Sample reports (fictional) ----------
  const samples={studio:{name:'Creative studio',score:72,mentions:2,issues:[['Services are too broad','Explain the specific design and development work you offer, with examples.','/services'],['Project process is missing','Describe how projects begin, what clients provide, and what delivery includes.','/services'],['Contact information differs','Confirm consistent contact details on the homepage and contact page.','/contact']]},home:{name:'Home services',score:64,mentions:1,issues:[['Service area is unclear','List the towns you actually serve in a visible section of your service page.','/service-area'],['Scope needs clarification','Explain which maintenance tasks are included and which are coordinated separately.','/services'],['Hours are inconsistent','Confirm one accurate set of hours across your website.','/contact']]},shop:{name:'Online shop',score:81,mentions:3,issues:[['Delivery information is difficult to find','Make delivery timeframes and shipping restrictions easy to access.','/shipping'],['Product specifications are incomplete','Add factual materials, dimensions, and usage information.','/products'],['Returns questions are unanswered','Explain the return window and process clearly.','/returns']]}};

Object.assign(samples, {
 restaurant:{name:'Restaurant & café',score:68,mentions:2,issues:[['Menu is an image only','Publish menu items and prices as readable text, alongside any menu photos.','/menu'],['Dietary information is missing','State factual dietary options and direct guests to your team for allergen questions.','/menu'],['Booking details are unclear','Explain reservations, opening hours, and how guests can contact you.','/visit']]},
 realestate:{name:'Real estate',score:74,mentions:2,issues:[['Local coverage is vague','Describe the markets and neighborhoods you actually serve.','/areas'],['Service expertise needs detail','Explain your buyer, seller, or rental services without unsupported performance claims.','/services'],['Agent details are incomplete','Keep team profiles and verified professional information up to date.','/team']]},
 fitness:{name:'Fitness & wellness',score:70,mentions:2,issues:[['Class formats are unclear','Explain class types, experience levels, and what a first visit includes.','/classes'],['Schedule is difficult to read','Provide current class times in accessible text.','/schedule'],['Membership questions are unanswered','Explain membership options, booking, and cancellation terms clearly.','/membership']]},
 hospitality:{name:'Hotel & hospitality',score:79,mentions:3,issues:[['Amenities need detail','Describe available amenities and any associated conditions.','/amenities'],['Accessibility information is missing','Publish verified accessibility details and a contact for specific questions.','/stay'],['Location context is thin','Explain nearby destinations and practical transport information.','/location']]},
 legal:{name:'Legal services',score:66,mentions:1,issues:[['Practice areas are too broad','Explain the matters the firm handles and its service geography.','/practice-areas'],['Attorney profiles lack detail','Include verified qualifications and relevant experience.','/attorneys'],['Consultation process is unclear','Explain how to request a consultation and what happens next.','/contact']]},
 healthcare:{name:'Healthcare practice',score:73,mentions:2,issues:[['Services need clearer descriptions','Describe the services offered without making unsupported treatment claims.','/services'],['Provider information is incomplete','Maintain accurate provider profiles and verified credentials.','/providers'],['Appointment instructions are missing','Explain booking, location, and whom to contact with coverage questions.','/appointments']]},
 financial:{name:'Financial services',score:69,mentions:1,issues:[['Audience is unclear','Describe the clients you serve and the specific services offered.','/services'],['Fee information is hard to find','Explain your fee approach and direct visitors to applicable disclosures.','/fees'],['Professional information needs review','Keep verified credentials and required firm information current.','/about']]},
 software:{name:'Software & SaaS',score:83,mentions:3,issues:[['Use cases need context','Explain concrete workflows and who each feature helps.','/solutions'],['Plan limits are unclear','Make pricing, included usage, and plan differences readable.','/pricing'],['Integration details are missing','Describe supported integrations and any setup requirements.','/integrations']]},
 events:{name:'Events & experiences',score:71,mentions:2,issues:[['Production scope is vague','Explain the event services you deliver and the markets you cover.','/services'],['Case studies need context','Describe the project brief, your role, and documented outcomes.','/work'],['Inquiry process is unclear','Explain what information helps you assess a new project.','/contact']]},
 photography:{name:'Photography',score:76,mentions:2,issues:[['Portfolio lacks descriptive text','Add accurate project descriptions alongside your photographs.','/portfolio'],['Booking scope is unclear','Describe session types, coverage areas, and what packages include.','/sessions'],['Delivery questions are unanswered','Explain the process for timelines, image delivery, and usage rights.','/faq']]}
});

  function renderDemo() {
    const s = samples[$('#business-demo').value];
    const box = $('#demo-content');
    box.replaceChildren();
    const head = document.createElement('div'); head.className = 'demo-score';
    const left = document.createElement('span'); left.textContent = s.name;
    const small = document.createElement('small'); small.textContent = 'Illustrative readiness score'; left.append(small);
    const right = document.createElement('strong'); right.textContent = String(s.score);
    const of = document.createElement('small'); of.textContent = '/ 100'; right.append(of);
    head.append(left, right);
    const note = document.createElement('p'); note.className = 'compare-note'; note.textContent = `Mentioned in ${s.mentions} of 6 illustrative answer samples. These results are fictional.`;
    box.append(head, note);
    s.issues.forEach((x, i) => {
      const a = document.createElement('article'); a.className = 'demo-issue';
      const h = document.createElement('h3'); const n = document.createElement('span'); n.className = 'lime'; n.textContent = `0${i + 1} `; h.append(n, x[0]);
      const p = document.createElement('p'); p.textContent = x[1];
      const c = document.createElement('code'); c.textContent = `Example page: ${x[2]}`;
      a.append(h, p, c); box.append(a);
    });
  }
  const demo = $('#demo-dialog');
  $$('.open-demo').forEach(b => b.addEventListener('click', () => { renderDemo(); demo.showModal(); }));
  $('#business-demo').addEventListener('change', renderDemo);
  $('#demo-scan').addEventListener('click', () => demo.close());
  $$('.close-dialog').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  $$('dialog').forEach(d => d.addEventListener('click', e => { const r = d.getBoundingClientRect(); if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close(); }));
  $('#download-sample').addEventListener('click', () => {
    const s = samples[$('#business-demo').value];
    const report = `GrowthSignal SAMPLE REPORT\nFictional business. Illustrative data only. This is not a scan of any real website.\n\nBusiness type: ${s.name}\nIllustrative readiness: ${s.score}/100\nIllustrative mentions: ${s.mentions} of 6 answers\n\n${s.issues.map((x, i) => `${i + 1}. ${x[0]}\n${x[1]}\nExample page: ${x[2]}`).join('\n\n')}\n\nNo tool can guarantee placement in AI answers.\n`;
    const url = URL.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'GrowthSignal_Sample_Report.txt'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  // ---------- Pricing ----------
  let billing = 'monthly';
  let plans = null;
  $$('[data-billing]').forEach(b => b.addEventListener('click', () => {
    billing = b.dataset.billing;
    $$('[data-billing]').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    $$('.price-card').forEach(card => {
      const price = card.querySelector('.price strong');
      if (!price.dataset.month) return;
      const value = billing === 'monthly' ? price.dataset.month : price.dataset.year;
      price.textContent = `$${value}`;
      card.querySelector('.price span').textContent = billing === 'monthly' ? '/month' : '/year';
      card.querySelector('.bill-note').textContent = billing === 'monthly' ? 'Billed monthly' : `Billed yearly, about $${(Number(value) / 12).toFixed(2)} a month`;
    });
  }));
  // Keep displayed prices in sync with the server's plan definitions.
  fetch('/api/config').then(r => r.json()).then(cfg => {
    plans = Object.fromEntries(cfg.plans.map(p => [p.id, p]));
    $$('.price-card [data-plan]').forEach(btn => {
      const p = plans[btn.dataset.plan];
      const strong = btn.closest('.price-card').querySelector('.price strong');
      if (p && strong) { strong.dataset.month = String(p.priceMonthly / 100); strong.dataset.year = String(p.priceAnnual / 100); if (billing === 'monthly') strong.textContent = `$${p.priceMonthly / 100}`; }
    });
    if (!cfg.billing.enabled) $('#pricing-footnote').textContent += ' Paid plans open soon; the free scan works today.';
  }).catch(() => {});

  // ---------- Navigation ----------
  const menu = $('.menu-toggle');
  menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); $('nav').classList.toggle('open', open); });
  $$('nav a').forEach(a => a.addEventListener('click', () => { $('nav').classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open navigation'); }));
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }), { threshold: 0.08 });
    $$('.benefits article,.process-grid article,.price-card,.split-title,.closing,.example-card').forEach(el => { el.classList.add('reveal'); obs.observe(el); });
  }

  // ---------- Product FAQ (prewritten answers, not a live AI) ----------
  const chatDialog = $('#chat-dialog');
  const chatLog = $('#chat-log');
  const price = id => (plans && plans[id] ? `$${plans[id].priceMonthly / 100}` : { check: '$9', improve: '$29', grow: '$59' }[id]);
  function addChat(text, who) { const el = document.createElement('div'); el.className = `chat-message ${who}`; el.textContent = text; chatLog.append(el); chatLog.scrollTop = chatLog.scrollHeight; }
  function answer(q) {
    const x = q.toLowerCase();
    if (/guarantee|rank|first place|number one|promise/.test(x)) return 'No. No tool can guarantee that ChatGPT or any AI assistant will recommend you. We check what is in your control on your website, sample real AI answers, and show what changed over time.';
    if (/sample|answers?|api|how.*(measure|track)|platform|chatgpt|claude|gemini|perplexity/.test(x)) return 'We send customer style questions, like "best plumber in Denver", to AI platforms through their official APIs with web search on, repeat them, and record whether you are mentioned, whether your site is cited, and every source. API answers can differ from the consumer apps, so we treat results as a sample, not a ranking. The methodology page has the details.';
    if (/which plan|choose|best plan|find my plan|recommend.*plan/.test(x)) return `Start with the free scan. If you want it watched, Check (${price('check')}/month) runs weekly scans and monthly AI answer samples. If you want ready to paste fixes and competitor comparisons, Improve (${price('improve')}/month). If you manage several sites, Grow (${price('grow')}/month).`;
    if (/price|cost|pricing|how much|annual|year|month/.test(x)) return `Free scan: $0. Check: ${price('check')}/month. Improve: ${price('improve')}/month. Grow: ${price('grow')}/month. Yearly billing gives two months free. All limits are listed in the pricing section.`;
    if (/cancel|refund/.test(x)) return 'You can cancel any time from Plan and billing in your dashboard. Paid features continue until the end of the period you paid for. See the Terms for refund details.';
    if (/free|trial|card/.test(x)) return 'The free scan needs no card and no account. A free account adds the evidence behind every finding, all recommendations, and one AI answer sample of 3 questions on 1 platform.';
    if (/fix|schema|structured|json|install|change my (site|website)|edit/.test(x)) return 'We never edit your website. Improve and Grow generate structured data, a business facts block, an FAQ draft and robots.txt lines from facts you confirm. You or your web person paste them in, then we rescan to verify.';
    if (/competitor/.test(x)) return 'Improve compares you with up to 2 competitors and Grow with up to 5 per site: how often each is mentioned in the same sampled answers.';
    if (/wordpress|wix|squarespace|shopify|godaddy|webflow|platform.*site|builder/.test(x)) return 'The scan works with any public website. The fix kit gives copy and paste code that works with most builders that allow custom header code. Ask us through the message form if you are unsure about yours.';
    if (/privacy|data|store|security|delete/.test(x)) return 'We read public pages on your site. Free reports without an account are deleted after 30 days. You can delete your account and all reports from your dashboard. This FAQ box does not send or store anything you type.';
    if (/seo/.test(x)) return 'There is a lot of overlap with SEO. GrowthSignal adds the AI specific parts: AI crawler access, whether AI answers mention you, and which sources they cite.';
    if (/agency|designer|client|freelanc/.test(x)) return 'Grow covers up to 3 websites, and verified site owners can share a read only report link. Send us a message if you manage more sites.';
    if (/contact|person|human|help|support|talk/.test(x)) return 'Use "Need a person?" below to send a message. A person replies by email. No sales call needed.';
    return 'I only have prewritten answers about plans, scans, AI answer samples, fixes and privacy, and I do not have one for that. Use "Need a person?" below and we will reply by email.';
  }
  function ask(q) { addChat(q, 'visitor'); addChat(answer(q), 'assistant'); }
  $('#chat-launcher').addEventListener('click', () => { if (!chatLog.children.length) addChat('Hi. I answer common questions from our written FAQ. I am not a live AI. What would you like to know?', 'assistant'); chatDialog.showModal(); $('#chat-input').focus(); });
  $$('[data-question]').forEach(b => b.addEventListener('click', () => ask(b.dataset.question)));
  $('#chat-form').addEventListener('submit', e => { e.preventDefault(); const input = $('#chat-input'); const q = input.value.trim(); if (!q) return; ask(q); input.value = ''; input.focus(); });
  $$('.contact-jump').forEach(b => b.addEventListener('click', () => { $$('dialog[open]').forEach(d => d.close()); $('#contact').scrollIntoView({ behavior: 'smooth' }); $('#iq-email').focus({ preventScroll: true }); }));

  // ---------- Inquiry form ----------
  const iq = $('#inquiry-form');
  const iqStatus = $('#inquiry-status');
  iq.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(iq).entries());
    iqStatus.replaceChildren(msg('Sending…', ''));
    try {
      const res = await fetch('/api/inquiries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Could not send your message.');
      iq.replaceChildren(msg('Thanks. Your message was sent and a person will reply by email.', 'notice-ok'));
    } catch (err) { iqStatus.replaceChildren(msg(err.message, 'notice-err')); }
  });
})();
