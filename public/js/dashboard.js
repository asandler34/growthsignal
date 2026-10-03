// Customer dashboard: sites, reports, history, AI answer samples, fix kit, billing and account.
(function () {
  const { api, el } = GS;
  const main = document.getElementById('main');
  let state = { me: null, config: null };
  let pollTimer = null;

  const show = (...nodes) => { main.replaceChildren(...nodes.flat()); };
  const errorBox = msg => el('div', { class: 'notice error', role: 'alert' }, msg);
  const upgradeLink = text => el('a', { href: '/app/billing' }, text || 'See plans');

  function setNav() {
    document.querySelectorAll('#app-nav a').forEach(a => {
      const cur = a.getAttribute('href') === '/app' ? /^\/app(\/site\/.*)?\/?$/.test(location.pathname) : location.pathname.startsWith(a.getAttribute('href'));
      if (cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function go(path) { history.pushState({}, '', path); route(); }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="/app"]');
    if (a && !a.target && !e.metaKey && !e.ctrlKey) { e.preventDefault(); go(a.getAttribute('href')); }
  });
  window.addEventListener('popstate', route);

  async function route() {
    clearTimeout(pollTimer);
    setNav();
    const p = location.pathname.replace(/\/$/, '');
    try {
      if (!state.me) {
        const [me, config] = await Promise.all([api('/api/me'), api('/api/config')]);
        state.me = me; state.config = config;
      }
      if (!state.me.user) { location.href = `/login?next=${encodeURIComponent(location.pathname)}`; return; }
      if (p === '/app' || p === '') return sitesPage();
      if (p === '/app/billing') return billingPage();
      if (p === '/app/account') return accountPage();
      const m = /^\/app\/site\/([0-9a-f-]{36})$/.exec(p);
      if (m) return sitePage(m[1]);
      show(el('h1', {}, 'Page not found'), el('a', { href: '/app' }, 'Back to your sites'));
    } catch (e) { show(errorBox(e.message)); }
    main.focus({ preventScroll: true });
  }

  async function refreshMe() { state.me = await api('/api/me'); }

  // ---------- Sites ----------
  async function sitesPage() {
    const { sites } = await api('/api/sites');
    const plan = state.me.plan;
    const params = new URLSearchParams(location.search);
    const banner = params.get('checkout') === 'success' ? el('div', { class: 'notice ok' }, 'Thank you. Your subscription will show here as soon as Stripe confirms the payment, usually within a few seconds. ', el('a', { href: '/app/billing' }, 'Check plan status')) : null;
    if (banner) setTimeout(async () => { await refreshMe(); }, 4000);
    const form = siteForm(async body => {
      const r = await api('/api/sites', { method: 'POST', body });
      go(`/app/site/${r.site.id}`);
    });
    show(
      el('h1', {}, 'Your sites'), banner,
      el('p', { class: 'muted' }, `${plan.name} plan · ${sites.length} of ${plan.sites} site${plan.sites > 1 ? 's' : ''} used. `, plan.id === 'free' ? upgradeLink('Compare plans') : null),
      sites.length ? el('div', { class: 'card' }, el('ul', { class: 'list-plain' }, sites.map(s => el('li', {},
        el('div', {}, el('a', { href: `/app/site/${s.id}` }, el('strong', {}, s.businessName || s.domain)), el('div', { class: 'muted' }, s.domain)),
        el('div', {}, s.latest ? (s.latest.status === 'complete' ? el('span', {}, el('strong', { class: 'lime' }, String(s.latest.score)), '/100 readiness · ', GS.fmtDay(s.latest.completed_at)) : el('span', { class: 'muted' }, `Scan ${s.latest.status}`)) : el('span', { class: 'muted' }, 'No scan yet')))))) : null,
      sites.length < plan.sites ? el('div', { class: 'card' }, el('h2', {}, sites.length ? 'Add another site' : 'Add your website'), form) : null);
  }

  function siteForm(onSubmit, initial = {}, { submitLabel = 'Scan my website', includeUrl = true } = {}) {
    const status = el('div', { 'aria-live': 'polite' });
    const f = (id, label, attrs = {}, hint) => el('div', { class: 'field' }, el('label', { for: id }, label), el('input', { id, name: id, value: initial[id] || '', ...attrs }), hint ? el('small', {}, hint) : null);
    const form = el('form', { onsubmit: async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      status.replaceChildren(el('span', { class: 'spinner', 'aria-hidden': 'true' }), 'Working…');
      try { await onSubmit(data); status.replaceChildren(); } catch (err) { status.replaceChildren(errorBox(err.message), err.status === 402 ? upgradeLink() : null); }
    } },
      includeUrl ? f('url', 'Website address', { required: true, placeholder: 'yourbusiness.com', inputmode: 'url', autocomplete: 'url' }) : null,
      el('div', { class: 'row' }, f('businessName', 'Business name', { placeholder: 'Summit Plumbing' }, 'Used to recognize you in AI answers.'), f('category', 'What kind of business', { placeholder: 'plumber' })),
      el('div', { class: 'row' }, f('city', 'City', { placeholder: 'Denver' }), f('region', 'State', { placeholder: 'CO', maxlength: 40 })),
      f('services', 'Main services (comma separated)', { placeholder: 'drain cleaning, water heater repair' }),
      el('button', { class: 'button', type: 'submit' }, submitLabel), status);
    if (initial.services && Array.isArray(initial.services)) form.querySelector('#services').value = initial.services.join(', ');
    return form;
  }

  // ---------- Site detail ----------
  async function sitePage(siteId, tab) {
    const data = await api(`/api/sites/${siteId}`);
    const { site, plan } = data;
    tab = tab || (location.hash || '#report').slice(1);
    const tabs = [['report', 'Readiness report'], ['visibility', 'AI answers'], ['fixes', 'Fix kit'], ['setup', 'Questions and competitors'], ['settings', 'Business details']];
    const panel = el('div', { id: 'tab-panel', role: 'tabpanel' });
    const tabBar = el('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Site sections' }, tabs.map(([k, label]) => el('button', { role: 'tab', 'aria-selected': String(k === tab), id: `tab-${k}`, onclick: () => { history.replaceState({}, '', `#${k}`); sitePage(siteId, k); } }, label)));
    const scanBtn = el('button', { class: 'button small', onclick: async () => {
      scanBtn.disabled = true;
      try { await api(`/api/sites/${siteId}/scans`, { method: 'POST' }); sitePage(siteId, 'report'); } catch (e) { scanBtn.after(errorBox(e.message)); scanBtn.disabled = false; }
    } }, 'Run a new scan');
    const used = state.me.usage || {};
    show(
      el('p', {}, el('a', { href: '/app' }, '← All sites')),
      el('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' } },
        el('div', {}, el('h1', {}, site.businessName || site.domain), el('p', { class: 'muted' }, GS.safeLink(site.url, site.domain), site.city ? ` · ${[site.city, site.region].filter(Boolean).join(', ')}` : '', ` · ${plan.name} plan`)),
        el('div', {}, scanBtn, el('div', { class: 'muted', style: { fontSize: '12px', marginTop: '4px' } }, `${used.manual_scans || 0} of ${plan.manualScansPerMonth} on demand scans used this month`))),
      tabBar, panel);
    const render = { report: reportTab, visibility: visibilityTab, fixes: fixesTab, setup: setupTab, settings: settingsTab }[tab] || reportTab;
    await render(panel, data);
  }

  function reportTab(panel, data) {
    const { latestScan, lastCompleteScan, history, site } = data;
    const nodes = [];
    if (latestScan && ['queued', 'running'].includes(latestScan.status)) {
      nodes.push(el('div', { class: 'card' }, el('h2', {}, 'Scan in progress'), GS.progressSteps(latestScan.progress)));
      pollTimer = setTimeout(() => { if (location.pathname.endsWith(site.id)) sitePage(site.id, 'report'); }, 2500);
    }
    if (latestScan && latestScan.status === 'failed') nodes.push(errorBox(`Latest scan failed: ${latestScan.error}`));
    const shown = latestScan && latestScan.status === 'complete' ? latestScan : lastCompleteScan;
    const done = history.filter(h => h.status === 'complete' && h.score != null).slice(0, 24).reverse();
    if (done.length > 1) {
      nodes.push(el('div', { class: 'card' }, el('h2', {}, 'Readiness over time'),
        el('div', { class: 'history-chart', role: 'img', 'aria-label': `Scores: ${done.map(d => d.score).join(', ')}` }, done.map(d => el('span', { style: { height: `${Math.max(4, d.score)}%` }, title: `${d.score} on ${GS.fmtDay(d.completed_at)}` }))),
        el('p', { class: 'muted' }, `${done.length} completed scans. Latest ${done[done.length - 1].score}, first ${done[0].score}.`)));
    }
    if (shown) nodes.push(el('p', { class: 'muted' }, `Showing the scan from ${GS.fmtDate(shown.completedAt)} (${shown.kind}).`), GS.renderReport(shown.report, { full: true }));
    else if (!latestScan) nodes.push(el('div', { class: 'empty' }, 'No scans yet. Run your first scan above.'));
    panel.replaceChildren(...nodes);
  }

  async function visibilityTab(panel, data) {
    const { site, plan, runs, platforms } = data;
    const connected = platforms.filter(p => p.connected);
    const nodes = [];
    nodes.push(el('div', { class: 'card' },
      el('h2', {}, 'Does AI mention your business?'),
      el('p', {}, 'We ask AI platforms the kinds of questions your customers ask, through their official APIs with web search turned on, and record whether your business is mentioned or your website is cited.'),
      el('p', { class: 'muted' }, 'These are samples under documented conditions, not a ranking. API answers can differ from what a person sees in the ChatGPT, Claude, Gemini or Perplexity apps, and answers change from one run to the next. No tool can guarantee inclusion.'),
      el('p', {}, 'Platforms: ', platforms.map((p, i) => [i ? ', ' : '', `${GS.platformName[p.id] || p.label}${p.connected ? '' : ' (not connected yet)'}`]).flat())));
    const freeUsed = plan.id === 'free' && state.me.user.freeVisibilityUsed;
    const runBtn = el('button', { class: 'button', disabled: !connected.length || !site.businessName || freeUsed, onclick: async () => {
      runBtn.disabled = true;
      try { await api(`/api/sites/${site.id}/visibility`, { method: 'POST' }); await refreshMe(); sitePage(site.id, 'visibility'); } catch (e) { runBtn.after(errorBox(e.message), e.status === 402 ? upgradeLink() : ''); runBtn.disabled = false; }
    } }, plan.id === 'free' ? (freeUsed ? 'Free sample used' : 'Run my free AI answer sample') : 'Run an answer sample now');
    const usageNote = plan.id === 'free'
      ? (freeUsed ? ['Your free sample has been used. Paid plans sample automatically every month or more often. ', upgradeLink('Compare plans')] : `Free sample: ${plan.prompts} questions on ${plan.platforms} platform, asked once.`)
      : `${plan.name}: ${plan.prompts} questions × ${plan.platforms} platforms × ${plan.repeats} repeats, ${plan.scheduledVisibility === 'biweekly' ? 'every two weeks' : plan.scheduledVisibility}, plus ${plan.visibilityRunsPerMonth} on demand run(s) a month.`;
    nodes.push(el('div', { class: 'card' }, !connected.length ? el('div', { class: 'notice warn' }, 'AI answer sampling is not connected yet on this GrowthSignal installation. Your readiness report is unaffected.') : null,
      !site.businessName ? el('div', { class: 'notice warn' }, 'Add your business name under Business details first.') : null, runBtn, el('p', { class: 'muted' }, usageNote)));
    if (!runs.length) { panel.replaceChildren(...nodes); return; }
    const latest = runs[0];
    if (['queued', 'running'].includes(latest.status)) {
      nodes.push(el('div', { class: 'card' }, el('span', { class: 'spinner', 'aria-hidden': 'true' }), 'Asking AI platforms your questions. This takes a minute or two.'));
      pollTimer = setTimeout(() => sitePage(site.id, 'visibility'), 4000);
    }
    const complete = runs.find(r => r.status === 'complete');
    if (latest.status === 'failed') nodes.push(errorBox(`The latest run failed: ${latest.error}. It does not count against your plan limits for scheduled runs.`));
    if (complete) {
      const full = await api(`/api/sites/${site.id}/visibility/${complete.id}`);
      nodes.push(runResult(full));
    }
    if (runs.filter(r => r.status === 'complete').length > 1) {
      nodes.push(el('div', { class: 'card' }, el('h2', {}, 'Earlier runs'), el('table', { class: 'data' }, el('thead', {}, el('tr', {}, ['Date', 'Mentioned', 'Website cited', 'Unavailable'].map(h => el('th', {}, h)))),
        el('tbody', {}, runs.filter(r => r.status === 'complete').map(r => el('tr', {}, el('td', {}, GS.fmtDay(r.completedAt)), el('td', {}, `${r.summary.discoveryMentions.count} of ${r.summary.discoveryMentions.of}`), el('td', {}, `${r.summary.discoveryCitations.count} of ${r.summary.discoveryCitations.of}`), el('td', {}, String(r.summary.totals.unavailable + r.summary.totals.error))))))));
    }
    panel.replaceChildren(...nodes);
  }

  function runResult(run) {
    const s = run.summary;
    const m = s.discoveryMentions;
    const ci = m.interval ? ` (plausible range ${Math.round(m.interval.low * 100)}% to ${Math.round(m.interval.high * 100)}%)` : '';
    const nodes = [];
    nodes.push(el('div', { class: 'card' },
      el('h2', {}, `Mentioned in ${m.count} of ${m.of} discovery answers`),
      el('p', {}, m.of ? `That is ${GS.pct(m.count, m.of)}%${ci}. Your website was cited as a source in ${s.discoveryCitations.count} of ${s.discoveryCitations.of}.` : 'No answers were available to measure.'),
      s.conclusiveness === 'small_sample' ? el('p', { class: 'muted' }, 'This is a small sample. Treat it as a starting signal, not a measurement of your overall visibility.') : null,
      s.variability.repeatedGroups ? el('p', { class: 'muted' }, `Repeat consistency: in ${s.variability.inconsistentGroups} of ${s.variability.repeatedGroups} question and platform pairs asked more than once, the answer changed between mentioning and not mentioning you.`) : null,
      s.totals.unavailable + s.totals.error ? el('p', { class: 'muted' }, `${s.totals.unavailable} sample(s) unavailable and ${s.totals.error} failed. They are shown below and not counted in these numbers.`) : null,
      run.config.notConnected.length ? el('p', { class: 'muted' }, `Not connected: ${run.config.notConnected.map(id => GS.platformName[id] || id).join(', ')}.`) : null,
      el('p', { class: 'muted' }, `Run on ${GS.fmtDate(run.completedAt)} · ${run.config.prompts.length} questions × ${run.config.platforms.length} platform(s) × ${run.config.repeats} repeat(s).`)));
    if (s.accuracyFlags.length) nodes.push(el('div', { class: 'notice warn' }, el('strong', {}, 'Possible inaccurate facts: '), `When asked about your business, ${s.accuracyFlags.map(f => `${GS.platformName[f.provider] || f.provider} gave a phone number (${f.phones.join(', ')})`).join('; ')} that does not match the phone number you confirmed. Check your listings on other sites.`));
    nodes.push(el('div', { class: 'card' }, el('h2', {}, 'By platform'), el('div', { class: 'table-scroll' }, el('table', { class: 'data' },
      el('thead', {}, el('tr', {}, ['Platform', 'Model', 'Discovery answers', 'Mentioned', 'Website cited', 'Unavailable or failed'].map(h => el('th', {}, h)))),
      el('tbody', {}, s.byPlatform.map(p => el('tr', {}, el('td', {}, GS.platformName[p.provider] || p.provider), el('td', {}, p.model || '–'), el('td', {}, String(p.discovery ?? p.ok)), el('td', {}, String(p.mentioned)), el('td', {}, String(p.cited)), el('td', {}, String(p.unavailable + p.error)))))))));
    if (s.topSources.length) nodes.push(el('div', { class: 'card' }, el('h2', {}, 'Where these answers get their information'),
      el('p', { class: 'muted' }, 'Sites most often cited in these answers. If directories or review sites appear here, make sure your listing on them is complete and accurate. We did not check your listings on those sites.'),
      el('table', { class: 'data' }, el('thead', {}, el('tr', {}, el('th', {}, 'Source'), el('th', {}, 'Answers citing it'))), el('tbody', {}, s.topSources.map(t => el('tr', {}, el('td', {}, t.domain, t.isYou ? el('span', { class: 'pill pass', style: { marginLeft: '8px' } }, 'You') : null), el('td', {}, String(t.answers))))))));
    if (s.competitors.length) nodes.push(el('div', { class: 'card' }, el('h2', {}, 'Competitors in the same answers'), el('table', { class: 'data' }, el('thead', {}, el('tr', {}, el('th', {}, 'Business'), el('th', {}, 'Mentioned'))),
      el('tbody', {}, [el('tr', {}, el('td', {}, el('strong', {}, 'You')), el('td', {}, `${m.count} of ${m.of}`)), ...s.competitors.map(c => el('tr', {}, el('td', {}, c.name), el('td', {}, `${c.mentioned} of ${c.of}`)))]))));
    const byPrompt = {};
    run.samples.forEach(x => (byPrompt[x.prompt] ||= []).push(x));
    nodes.push(el('div', { class: 'card' }, el('h2', {}, 'Every answer'), el('p', { class: 'muted' }, 'Answers are shown as returned, trimmed to 4,000 characters. They are AI generated and may contain errors.'),
      Object.entries(byPrompt).map(([prompt, samples]) => el('details', { class: 'priority' },
        el('summary', {}, el('strong', {}, prompt), ' ', el('span', { class: 'muted' }, `${samples.filter(x => x.mentioned).length} of ${samples.filter(x => x.status === 'ok').length} mention you`), samples[0].intent === 'brand' ? el('span', { class: 'pill', style: { marginLeft: '8px' } }, 'About you') : null),
        samples.map(x => el('div', { style: { margin: '14px 0' } },
          el('div', {}, el('strong', {}, GS.platformName[x.provider] || x.provider), ` · ${x.model || ''} · repeat ${x.repeat + 1} · `, x.status === 'ok' ? [x.mentioned ? el('span', { class: 'pill pass' }, 'Mentioned') : el('span', { class: 'pill' }, 'Not mentioned'), ' ', x.cited ? el('span', { class: 'pill pass' }, 'Site cited') : null] : el('span', { class: 'pill partial' }, x.status)),
          x.status === 'ok' ? el('div', { class: 'answer' }, x.answer) : el('p', { class: 'muted' }, x.error),
          x.citations && x.citations.length ? el('div', { class: 'evidence' }, el('strong', {}, 'Sources: '), x.citations.filter(c => !c.retrievedOnly).slice(0, 10).map((c, i) => [i ? ' · ' : '', GS.safeLink(c.url, c.domain || c.title || c.url)]).flat()) : null))))));
    return el('div', {}, nodes);
  }

  async function fixesTab(panel, data) {
    const { site, plan } = data;
    if (!plan.fixKit) {
      panel.replaceChildren(el('div', { class: 'card' }, el('h2', {}, 'Fix kit'), el('p', {}, 'Improve and Grow turn your report into ready to paste changes, generated from facts you confirm:'),
        el('ul', {}, ['Business structured data (JSON-LD) matching your confirmed facts', 'A visible business facts block for your footer or contact page', 'An FAQ draft with the questions customers ask', 'Exact robots.txt lines if you block search crawlers', 'A follow up scan to verify each change'].map(t => el('li', {}, t))),
        el('p', { class: 'muted' }, 'We never edit your website. You or your web person apply changes after reviewing them.'), el('a', { class: 'button', href: '/app/billing' }, 'Compare plans')));
      return;
    }
    const kit = await api(`/api/sites/${site.id}/fixkit`);
    const nodes = [];
    if (!kit.confirmed) nodes.push(el('div', { class: 'notice warn' }, 'Confirm your business facts under Business details to generate structured data, the facts block and the FAQ draft.', kit.errors.length ? ` Missing: ${kit.errors.join(' ')}` : ''));
    kit.items.forEach(it => {
      const pre = el('pre', { class: 'code' }, it.content);
      nodes.push(el('div', { class: 'card' }, el('h2', {}, it.title), el('p', { class: 'muted' }, it.where), pre,
        el('button', { class: 'button small ghost', onclick: async e => { await navigator.clipboard.writeText(it.content); e.target.textContent = 'Copied'; } }, 'Copy')));
    });
    if (!kit.items.length && kit.confirmed) nodes.push(el('p', { class: 'muted' }, 'Nothing to generate yet.'));
    nodes.push(el('div', { class: 'card' }, kit.notes.map(n => el('p', { class: 'muted' }, n))));
    panel.replaceChildren(...nodes);
  }

  function setupTab(panel, data) {
    const { site, plan, prompts, competitors } = data;
    const list = prompts.map(p => ({ ...p }));
    const rows = el('div', {});
    const status = el('div', { 'aria-live': 'polite' });
    const draw = () => rows.replaceChildren(...list.map((p, i) => el('div', { class: 'row', style: { alignItems: 'center', marginBottom: '8px' } },
      el('input', { value: p.text, 'aria-label': `Question ${i + 1}`, oninput: e => { p.text = e.target.value; } }),
      el('label', { style: { flex: '0 0 auto', display: 'flex', gap: '6px', alignItems: 'center', margin: 0 } }, el('input', { type: 'checkbox', checked: p.active, style: { width: 'auto' }, onchange: e => { p.active = e.target.checked; } }), 'Active'),
      el('button', { class: 'button small ghost', style: { flex: '0 0 auto' }, type: 'button', onclick: () => { list.splice(i, 1); draw(); } }, 'Remove'))));
    draw();
    const compStatus = el('div', { 'aria-live': 'polite' });
    const compForm = el('form', { onsubmit: async e => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(compForm).entries());
      try { await api(`/api/sites/${site.id}/competitors`, { method: 'POST', body: fd }); sitePage(site.id, 'setup'); } catch (err) { compStatus.replaceChildren(errorBox(err.message), err.status === 402 ? upgradeLink() : ''); }
    } }, el('div', { class: 'row' }, el('div', { class: 'field' }, el('label', { for: 'c-name' }, 'Competitor name'), el('input', { id: 'c-name', name: 'name', required: true })), el('div', { class: 'field' }, el('label', { for: 'c-domain' }, 'Website (optional)'), el('input', { id: 'c-domain', name: 'domain' }))), el('button', { class: 'button small', type: 'submit' }, 'Add competitor'), compStatus);
    panel.replaceChildren(
      el('div', { class: 'card' }, el('h2', {}, 'Questions we ask AI platforms'),
        el('p', { class: 'muted' }, `Write them the way a customer would ask. Include your town. ${plan.name} includes up to ${plan.prompts} active questions.`), rows,
        el('button', { class: 'button small ghost', type: 'button', onclick: () => { list.push({ text: '', active: true, intent: 'discovery' }); draw(); } }, 'Add a question'), ' ',
        el('button', { class: 'button small', type: 'button', onclick: async () => {
          try { await api(`/api/sites/${site.id}/prompts`, { method: 'PUT', body: { prompts: list } }); status.replaceChildren(el('div', { class: 'notice ok' }, 'Saved. New questions apply to the next run.')); } catch (err) { status.replaceChildren(errorBox(err.message), err.status === 402 ? upgradeLink() : ''); }
        } }, 'Save questions'), status),
      el('div', { class: 'card' }, el('h2', {}, 'Competitors'), el('p', { class: 'muted' }, plan.competitors ? `Track how often up to ${plan.competitors} competitors appear in the same answers.` : 'Competitor comparisons are included in Improve and Grow.'),
        competitors.length ? el('ul', { class: 'list-plain' }, competitors.map(c => el('li', {}, el('span', {}, c.name, c.domain ? el('span', { class: 'muted' }, ` · ${c.domain}`) : ''), el('button', { class: 'button small ghost', onclick: async () => { await api(`/api/sites/${site.id}/competitors/${c.id}`, { method: 'DELETE' }); sitePage(site.id, 'setup'); } }, 'Remove')))) : null,
        compForm));
  }

  function settingsTab(panel, data) {
    const { site, plan } = data;
    const ctx = siteForm(async body => { await api(`/api/sites/${site.id}`, { method: 'PATCH', body }); sitePage(site.id, 'settings'); }, { businessName: site.businessName, category: site.category, city: site.city, region: site.region, services: site.services }, { submitLabel: 'Save details', includeUrl: false });
    const f = site.facts || {};
    const factStatus = el('div', { 'aria-live': 'polite' });
    const input = (name, label, value, attrs = {}) => el('div', { class: 'field' }, el('label', { for: `f-${name}` }, label), el('input', { id: `f-${name}`, name, value: value || '', ...attrs }));
    const typeSel = el('select', { id: 'f-type', name: 'type' }, state.config.schemaTypes.map(t => el('option', { value: t, selected: t === (f.type || 'LocalBusiness') }, t)));
    const hours = (f.hours && f.hours[0]) || {};
    const factsForm = el('form', { onsubmit: async e => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(factsForm).entries());
      const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].filter(d => fd[`day_${d}`]);
      const facts = { ...fd, showAddress: !!fd.showAddress, hours: fd.opens && fd.closes && days.length ? [{ days, opens: fd.opens, closes: fd.closes }] : [] };
      try { await api(`/api/sites/${site.id}/facts`, { method: 'PUT', body: { facts, confirm: true } }); factStatus.replaceChildren(el('div', { class: 'notice ok' }, 'Facts confirmed. Your fix kit is updated.')); } catch (err) { factStatus.replaceChildren(errorBox(err.message)); }
    } },
      el('p', { class: 'muted' }, 'These are the facts you want AI answers to get right. We use them to generate your fix kit and to flag answers that contradict them. Only enter what is true.'),
      el('div', { class: 'row' }, input('name', 'Business name', f.name || site.businessName, { required: true }), el('div', { class: 'field' }, el('label', { for: 'f-type' }, 'Business type (schema.org)'), typeSel)),
      input('description', 'One sentence description', f.description),
      el('div', { class: 'row' }, input('phone', 'Main phone', f.phone), input('email', 'Public email', f.email)),
      input('street', 'Street address (leave blank if customers do not visit you)', f.street),
      el('div', { class: 'row' }, input('city', 'City', f.city || site.city), input('region', 'State', f.region || site.region), input('postalCode', 'ZIP', f.postalCode)),
      el('label', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, el('input', { type: 'checkbox', name: 'showAddress', checked: f.showAddress !== false, style: { width: 'auto' } }), 'Show street address publicly'),
      input('areaServed', 'Service areas (comma separated)', (f.areaServed || []).join(', ')),
      input('services', 'Services (comma separated)', (f.services || site.services || []).join(', ')),
      el('fieldset', { style: { border: '1px solid var(--border)', borderRadius: '8px', margin: '0 0 14px' } }, el('legend', {}, 'Regular hours'),
        el('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' } }, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => el('label', { style: { display: 'flex', gap: '4px', alignItems: 'center', margin: 0 } }, el('input', { type: 'checkbox', name: `day_${d}`, checked: (hours.days || []).includes(d), style: { width: 'auto' } }), d))),
        el('div', { class: 'row' }, input('opens', 'Opens', hours.opens, { type: 'time' }), input('closes', 'Closes', hours.closes, { type: 'time' }))),
      input('sameAs', 'Official profile links (Google Business Profile, Yelp, Facebook), separated by spaces', (f.sameAs || []).join(' ')),
      el('button', { class: 'button', type: 'submit' }, 'Confirm these facts'), factStatus);

    const verifyStatus = el('div', { 'aria-live': 'polite' });
    const shareStatus = el('div', { 'aria-live': 'polite' });
    panel.replaceChildren(
      el('div', { class: 'card' }, el('h2', {}, 'Scan context'), el('p', { class: 'muted' }, 'Used to write default questions and to recognize your business in answers.'), ctx),
      el('div', { class: 'card' }, el('h2', {}, 'Confirmed business facts'), site.factsConfirmedAt ? el('p', { class: 'muted' }, `Last confirmed ${GS.fmtDay(site.factsConfirmedAt)}.`) : null, factsForm),
      el('div', { class: 'card' }, el('h2', {}, 'Verify ownership'), site.verifiedAt ? el('p', {}, el('span', { class: 'pill pass' }, 'Verified'), ` on ${GS.fmtDay(site.verifiedAt)}.`) : [
        el('p', {}, 'Needed before you can share a public link to your report. Add this tag to your homepage <head>, then press Verify:'),
        el('pre', { class: 'code' }, `<meta name="growthsignal-verification" content="${site.verificationToken}">`),
        el('p', { class: 'muted' }, `Or upload a file named growthsignal-${site.verificationToken}.txt containing ${site.verificationToken} to your site root.`),
        el('button', { class: 'button small', onclick: async () => { const r = await api(`/api/sites/${site.id}/verify`, { method: 'POST' }); verifyStatus.replaceChildren(el('div', { class: `notice ${r.verified ? 'ok' : 'warn'}` }, r.detail)); if (r.verified) setTimeout(() => sitePage(site.id, 'settings'), 800); } }, 'Verify'), verifyStatus]),
      el('div', { class: 'card' }, el('h2', {}, 'Share your report'), el('p', { class: 'muted' }, 'A read only link to your latest readiness summary. Useful for your web designer or marketing help.'),
        site.shareToken ? el('p', {}, GS.safeLink(`${location.origin}/r/${site.shareToken}`)) : null,
        el('button', { class: 'button small ghost', onclick: async () => { try { await api(`/api/sites/${site.id}/share`, { method: 'POST', body: { enabled: !site.shareToken } }); sitePage(site.id, 'settings'); } catch (e) { shareStatus.replaceChildren(errorBox(e.message), e.status === 402 ? upgradeLink() : ''); } } }, site.shareToken ? 'Turn off share link' : 'Create share link'), shareStatus,
        plan.shareLink ? null : el('p', { class: 'muted' }, 'Included in paid plans.')),
      el('div', { class: 'card' }, el('h2', {}, 'Remove this site'), el('p', { class: 'muted' }, 'Stops monitoring and hides the site. Scan again later to restore it.'),
        el('button', { class: 'button small danger', onclick: async () => { if (!confirm(`Remove ${site.domain} from your account?`)) return; await api(`/api/sites/${site.id}`, { method: 'DELETE' }); go('/app'); } }, 'Remove site')));
  }

  // ---------- Billing ----------
  async function billingPage() {
    await refreshMe();
    const { plan, subscription, billing } = state.me;
    const plans = state.config.plans.filter(p => p.id !== 'free');
    let interval = 'monthly';
    const status = el('div', { 'aria-live': 'polite' });
    const params = new URLSearchParams(location.search);
    const cards = el('div', { class: 'plan-cards' });
    const drawCards = () => cards.replaceChildren(...plans.map(p => el('div', { class: `card ${plan.id === p.id ? 'current' : ''}` },
      el('h2', {}, p.name), el('p', { class: 'muted' }, p.tagline),
      el('div', { class: 'price' }, interval === 'annual' ? GS.money(p.priceAnnual) : GS.money(p.priceMonthly), el('span', { class: 'muted', style: { fontSize: '14px' } }, interval === 'annual' ? '/year' : '/month')),
      el('ul', {}, planBullets(p).map(b => el('li', {}, b))),
      plan.id === p.id ? el('p', { class: 'lime' }, 'Your current plan') : el('button', { class: 'button', disabled: !billing.enabled, onclick: async () => {
        status.replaceChildren(el('span', { class: 'spinner' }), 'Opening secure checkout…');
        try { const r = await api('/api/billing/checkout', { method: 'POST', body: { plan: p.id, interval } }); location.href = r.url; } catch (e) { status.replaceChildren(errorBox(e.message)); }
      } }, subscription ? `Switch to ${p.name}` : `Choose ${p.name}`))));
    drawCards();
    const toggle = el('div', { role: 'group', 'aria-label': 'Billing period', style: { display: 'flex', gap: '8px', margin: '12px 0' } }, ['monthly', 'annual'].map(k => el('button', { class: `button small ${k === interval ? '' : 'ghost'}`, 'aria-pressed': String(k === interval), onclick: e => { interval = k; toggle.querySelectorAll('button').forEach(b => { const on = b === e.target; b.className = `button small ${on ? '' : 'ghost'}`; b.setAttribute('aria-pressed', String(on)); }); drawCards(); } }, k === 'monthly' ? 'Monthly' : 'Yearly (2 months free)')));
    show(
      el('h1', {}, 'Plan and billing'),
      params.get('checkout') === 'canceled' ? el('div', { class: 'notice' }, 'Checkout was canceled. You were not charged.') : null,
      !billing.enabled ? el('div', { class: 'notice warn' }, `Paid plans are not open yet: ${billing.reason} You can keep using the free scan.`) : billing.mode === 'test' ? el('div', { class: 'notice warn' }, 'Billing is in Stripe test mode. No real charges are made.') : null,
      el('div', { class: 'card' }, el('h2', {}, `Current plan: ${plan.name}`),
        subscription ? el('p', {}, `Status: ${subscription.status}. `, subscription.cancelAtPeriodEnd ? `Cancels on ${GS.fmtDay(subscription.currentPeriodEnd)}; paid features stay on until then.` : subscription.currentPeriodEnd ? `Renews ${GS.fmtDay(subscription.currentPeriodEnd)}.` : '') : el('p', { class: 'muted' }, 'Free scan plan.'),
        subscription && subscription.status === 'past_due' ? el('div', { class: 'notice warn' }, 'Your last payment failed. Update your card in billing management to keep your plan.') : null,
        subscription || state.me.user ? el('button', { class: 'button ghost', disabled: !billing.enabled, onclick: async () => {
          try { const r = await api('/api/billing/portal', { method: 'POST' }); location.href = r.url; } catch (e) { status.replaceChildren(errorBox(e.message)); }
        } }, 'Manage billing, invoices or cancel') : null),
      toggle, cards, status,
      el('p', { class: 'muted' }, 'Prices in US dollars. Cancel any time from billing management; paid features continue until the end of the period you paid for. Checkout and billing are handled by Stripe.'));
  }

  function planBullets(p) {
    const cadence = { weekly: 'weekly', biweekly: 'every two weeks', monthly: 'monthly' };
    return [
      `${p.sites} website${p.sites > 1 ? 's' : ''}, up to ${p.pagesPerScan} pages per scan`,
      `Automatic readiness scan ${cadence[p.scheduledScan]} with change alerts`,
      `${p.prompts} customer questions × ${p.platforms} AI platform${p.platforms > 1 ? 's' : ''}, asked ${p.repeats}×, ${cadence[p.scheduledVisibility]}`,
      p.competitors ? `Compare against ${p.competitors} competitors` : 'Sources AI cites for your questions',
      p.fixKit ? 'Fix kit: structured data, facts block, FAQ draft, robots.txt lines' : 'Prioritized fixes with evidence',
      `${p.historyMonths} months of history`,
    ];
  }

  // ---------- Account ----------
  function accountPage() {
    const u = state.me.user;
    const status = el('div', { 'aria-live': 'polite' });
    const optOut = el('input', { type: 'checkbox', checked: u.emailOptOut, style: { width: 'auto' }, onchange: async e => { await api('/api/me', { method: 'PATCH', body: { emailOptOut: e.target.checked } }); status.replaceChildren(el('div', { class: 'notice ok' }, 'Saved.')); } });
    const confirmInput = el('input', { id: 'del-confirm', autocomplete: 'off' });
    show(
      el('h1', {}, 'Account'),
      el('div', { class: 'card' }, el('p', {}, 'Signed in as ', el('strong', {}, u.email)),
        el('label', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, optOut, 'Do not email me monitoring updates (sign in links and billing emails still send)'), status,
        el('button', { class: 'button ghost', onclick: async () => { await api('/api/auth/logout', { method: 'POST' }); location.href = '/'; } }, 'Sign out')),
      el('div', { class: 'card' }, el('h2', {}, 'Delete account'), el('p', { class: 'muted' }, 'Permanently deletes your sites, reports and answer samples. Cancel any subscription first.'),
        el('div', { class: 'field' }, el('label', { for: 'del-confirm' }, 'Type your email to confirm'), confirmInput),
        el('button', { class: 'button danger', onclick: async () => {
          try { await api('/api/account/delete', { method: 'POST', body: { confirm: confirmInput.value } }); location.href = '/'; } catch (e) { status.replaceChildren(errorBox(e.message)); }
        } }, 'Delete my account')));
  }

  route();
})();
