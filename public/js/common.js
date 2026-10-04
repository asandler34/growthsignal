// Shared browser helpers. All dynamic text is inserted with textContent: crawled page content and
// AI answers are untrusted and must never be rendered as HTML.
(function () {
  const GS = (window.GS = {});

  GS.api = async function (path, opts = {}) {
    const init = { method: opts.method || 'GET', headers: {}, credentials: 'same-origin' };
    if (opts.body !== undefined) { init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
    const res = await fetch(path, init);
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status; err.code = data && data.code;
      throw err;
    }
    return data;
  };

  // el('div', {class:'x', onclick:fn}, 'text', childNode, [more])
  GS.el = function (tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'class') node.className = v;
      else if (k === 'style' && typeof v === 'object') for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) node.style.setProperty(sk, sv); else node.style[sk] = sv; }
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v === true ? '' : v);
    }
    const add = c => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) return c.forEach(add);
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    };
    children.forEach(add);
    return node;
  };
  const el = GS.el;

  GS.fmtDate = d => (d ? new Date(d).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
  GS.fmtDay = d => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '');
  GS.money = cents => (cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`);
  GS.pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  GS.statusLabel = { pass: 'Pass', partial: 'Partial', fail: 'Needs work', not_checked: 'Not checked', not_applicable: 'Not applicable' };
  GS.platformName = { openai: 'OpenAI (ChatGPT models)', anthropic: 'Anthropic (Claude models)', gemini: 'Google Gemini', perplexity: 'Perplexity' };

  GS.safeLink = function (url, label) {
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('bad');
      return el('a', { href: u.href, target: '_blank', rel: 'noopener noreferrer nofollow ugc' }, label || u.href);
    } catch (e) { return el('span', {}, label || String(url)); }
  };

  GS.scoreHero = function (score) {
    const dial = el('div', { class: 'score-dial', style: { '--pct': score.total || 0 }, role: 'img', 'aria-label': `Website readiness ${score.total} out of 100` },
      el('div', {}, el('div', {}, el('strong', {}, String(score.total ?? '–')), el('small', {}, 'out of 100'))));
    const bars = el('div', { class: 'cat-bars' }, Object.values(score.categories).map(c =>
      el('div', { class: 'cat-bar' }, el('span', {}, c.label), el('span', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: { width: `${c.pct ?? 0}%` } })), el('span', { class: 'muted' }, `${c.earned}/${c.possible}`))));
    return el('div', { class: 'score-hero' }, dial, el('div', { style: { flex: '1 1 300px' } }, el('h2', {}, score.band), el('p', { class: 'muted' }, 'Website readiness: can AI and search systems reach and understand your site? This is separate from whether they currently mention you.'), bars));
  };

  GS.priorityList = function (priorities) {
    if (!priorities.length) return el('p', { class: 'muted' }, 'No readiness gaps found in the pages we checked.');
    return el('div', {}, priorities.map(p => el('div', { class: 'priority' },
      el('h3', {}, el('span', { class: 'rank' }, String(p.rank).padStart(2, '0')), p.title, el('span', { class: `pill ${p.severity}` }, `${p.severity} impact`)),
      el('dl', {}, el('dt', {}, 'What we found'), el('dd', {}, p.what), el('dt', {}, 'Why it matters'), el('dd', {}, p.why), el('dt', {}, 'What to do'), el('dd', {}, p.how)))));
  };

  GS.checkList = function (checks, { evidence = true } = {}) {
    const cats = {};
    checks.forEach(c => (cats[c.category] ||= []).push(c));
    const names = { access: 'Access', business: 'Business information', structured: 'Structured data', content: 'Content clarity' };
    return el('div', {}, Object.entries(cats).map(([cat, list]) => el('div', { class: 'card' },
      el('h3', {}, names[cat] || cat),
      el('ul', { class: 'check-list' }, list.map(c => el('li', {},
        evidence ? el('details', {},
          el('summary', {}, el('span', {}, c.title), el('span', {}, el('span', { class: `pill ${c.status}` }, GS.statusLabel[c.status] || c.status), ' ', el('span', { class: 'muted' }, `${c.points}/${c.maxPoints}`))),
          el('p', {}, c.found),
          c.status !== 'pass' ? el('p', { class: 'muted' }, el('strong', {}, 'Fix: '), c.fix) : null,
          el('p', { class: 'muted' }, el('strong', {}, 'Why: '), c.why),
          c.evidence && c.evidence.length ? el('div', { class: 'evidence' }, el('strong', {}, 'Evidence'), c.evidence.map(e => el('div', {}, GS.safeLink(e.url), ' · ', e.detail))) : null)
          : el('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '12px' } }, el('span', {}, c.title), el('span', {}, el('span', { class: `pill ${c.status}` }, GS.statusLabel[c.status] || c.status), ' ', el('span', { class: 'muted' }, `${c.points}/${c.maxPoints}`)))))))));
  };

  GS.crawlerTable = function (crawlers) {
    const purpose = { search: 'Search and answers', user: 'User requested visits', training: 'Model training' };
    return el('div', { class: 'table-scroll' }, el('table', { class: 'data' },
      el('thead', {}, el('tr', {}, ['Crawler', 'Operator', 'Used for', 'Your robots.txt'].map(h => el('th', {}, h)))),
      el('tbody', {}, crawlers.map(c => el('tr', {}, el('td', {}, c.token), el('td', {}, c.operator), el('td', {}, purpose[c.purpose], el('br'), el('small', { class: 'muted' }, c.note)),
        el('td', {}, c.allowed ? el('span', { class: 'pill pass' }, 'Allowed') : el('span', { class: `pill ${c.purpose === 'training' ? 'partial' : 'fail'}` }, 'Blocked'), c.rule ? el('div', { class: 'muted', style: { fontSize: '12px' } }, c.rule) : null))))));
  };

  GS.renderReport = function (report, { full = false } = {}) {
    const frag = el('div', {});
    frag.append(el('div', { class: 'card' }, GS.scoreHero(report.score), el('div', { class: 'summary-lines', style: { marginTop: '18px' } }, report.summary.map(s => el('p', {}, s)))));
    if (report.comparison) {
      const cmp = report.comparison;
      frag.append(el('div', { class: 'card' }, el('h2', {}, 'Since your last scan'),
        el('p', {}, cmp.scoreChange == null ? 'Score change unavailable.' : cmp.scoreChange === 0 ? 'Your score did not change.' : `Your score ${cmp.scoreChange > 0 ? 'rose' : 'fell'} by ${Math.abs(cmp.scoreChange)} points since ${GS.fmtDay(cmp.previousAt)}.`),
        cmp.rubricChanged ? el('p', { class: 'muted' }, 'Our scoring rubric was updated between these scans, so part of the change may come from the rubric.') : null,
        cmp.improved.length ? el('p', {}, el('strong', { class: 'lime' }, 'Improved: '), cmp.improved.map(x => x.title).join('; ')) : null,
        cmp.regressed.length ? el('p', {}, el('strong', { style: { color: 'var(--bad)' } }, 'Needs attention: '), cmp.regressed.map(x => x.title).join('; ')) : null));
    }
    frag.append(el('div', { class: 'card' }, el('h2', {}, 'What to do next'), GS.priorityList(report.priorities),
      report.hiddenPriorities ? el('p', { class: 'muted' }, `${report.hiddenPriorities} more recommendation(s) in your full report.`) : null));
    frag.append(el('h2', { style: { margin: '28px 0 12px' } }, 'All checks'));
    frag.append(GS.checkList(report.checks, { evidence: full }));
    if (full && report.crawlers) frag.append(el('div', { class: 'card' }, el('h2', {}, 'AI and search crawler access'), el('p', { class: 'muted' }, 'Blocking a training crawler is your choice and does not lower your score. Blocking a search crawler can reduce the chance your pages are used as a source.'), GS.crawlerTable(report.crawlers), el('p', { class: 'muted', style: { marginTop: '10px' } }, `llms.txt: ${report.llmsTxt.found ? 'found' : 'not found'}. ${report.llmsTxt.note}`)));
    if (full && report.facts) {
      const f = report.facts;
      frag.append(el('div', { class: 'card' }, el('h2', {}, 'Business facts we detected'), el('p', { class: 'muted' }, 'Detected automatically from your pages. Confirm the correct facts in your dashboard before using them.'),
        el('dl', { class: 'priority' }, ['names', 'phones', 'emails', 'addresses', 'hours'].map(k => [el('dt', { class: 'muted' }, k), el('dd', {}, (f[k] || []).join(' · ') || 'None found')]).flat()),
        Object.keys(f.profiles || {}).length ? el('p', {}, 'Profiles linked from your site: ', Object.entries(f.profiles).map(([k, v], i) => [i ? ', ' : '', GS.safeLink(v, k)]).flat()) : el('p', { class: 'muted' }, 'No links to review sites or business profiles were found.')));
    }
    if (full && report.coverage) {
      const cv = report.coverage;
      frag.append(el('div', { class: 'card' }, el('h2', {}, 'Coverage'), el('p', { class: 'muted' }, `Scanned ${GS.fmtDate(cv.startedAt)}. Rubric ${report.rubricVersion}.`),
        el('div', { class: 'table-scroll' }, el('table', { class: 'data' }, el('thead', {}, el('tr', {}, ['Page', 'Type', 'Status', 'Words'].map(h => el('th', {}, h)))),
          el('tbody', {}, cv.pagesRead.map(p => el('tr', {}, el('td', {}, GS.safeLink(p.url)), el('td', {}, p.kind), el('td', {}, String(p.status)), el('td', {}, p.words == null ? '–' : String(p.words))))))),
        cv.skipped.length ? el('div', { class: 'evidence' }, el('strong', {}, 'Skipped'), cv.skipped.map(s => el('div', {}, s.url, ' · ', s.reason))) : null));
    }
    frag.append(el('div', { class: 'card' }, el('h2', {}, 'Limits of this report'), el('ul', {}, report.limitations.map(l => el('li', {}, l)))));
    return frag;
  };

  GS.progressSteps = function (progress) {
    const steps = [['queued', 'Waiting to start'], ['homepage', 'Loading your homepage'], ['robots', 'Checking robots.txt and sitemaps'], ['pages', 'Reading key pages'], ['complete', 'Building your report']];
    const idx = Math.max(0, steps.findIndex(s => s[0] === (progress && progress.step)));
    return el('ol', { class: 'progress-steps', 'aria-live': 'polite' }, steps.map((s, i) => el('li', { class: i < idx ? 'done' : i === idx ? 'active' : '' }, i < idx ? '✓ ' : i === idx ? el('span', { class: 'spinner', 'aria-hidden': 'true' }) : '○ ', i === idx && progress && progress.message ? progress.message : s[1])));
  };
  // Ready to paste starter fix (free). Content is plain text shown in <pre>, never parsed as HTML.
  GS.freeFixCard = function (fix, { footer } = {}) {
    if (!fix) return null;
    const copy = el('button', { class: 'button small ghost', type: 'button', onclick: async e => { try { await navigator.clipboard.writeText(fix.content); e.target.textContent = 'Copied'; } catch (err) { e.target.textContent = 'Select the text to copy'; } } }, 'Copy');
    return el('div', { class: 'card' },
      el('h2', {}, 'Your first fix, ready to paste'),
      el('p', {}, el('strong', {}, `Fix #${fix.rank}: ${fix.title}. `), fix.where),
      el('pre', { class: 'code' }, fix.content),
      el('div', { class: 'row-actions' }, copy),
      el('p', { class: 'muted' }, fix.note),
      footer || null);
  };

  // One free AI answer for the preview. The answer is model output: rendered as text only.
  GS.snapshotCard = function (snap, { offer } = {}) {
    if (!snap) return null;
    const card = el('div', { class: 'card snapshot-card', id: 'ai-answer', 'aria-live': 'polite' });
    const h = el('h2', {}, 'What an AI assistant answered');
    if (snap.status === 'pending') { card.append(h, el('p', {}, el('span', { class: 'spinner', 'aria-hidden': 'true' }), 'Asking an AI assistant one question your customers ask. This takes a few seconds.')); return card; }
    if (snap.status === 'needs_context') { card.append(h, el('p', {}, snap.reason, ' ', el('a', { href: '/#scan' }, 'Scan again with these details'), '.')); return card; }
    if (snap.status !== 'complete') { card.append(h, el('div', { class: 'notice warn' }, snap.question ? `We tried: "${snap.question}". ` : '', snap.reason || 'No answer this time.')); return card; }
    const platform = GS.platformName[snap.provider] || snap.provider;
    const verdict = snap.mentioned
      ? el('p', { class: 'snapshot-verdict good' }, el('strong', {}, `It mentioned ${snap.businessName}.`), snap.cited ? ' It also cited your website as a source.' : ' It did not cite your website as a source.')
      : el('p', { class: 'snapshot-verdict bad' }, el('strong', {}, `It did not mention ${snap.businessName}.`), ' Read who it named instead.');
    card.append(h,
      el('p', { class: 'muted' }, `We asked ${platform} through its official API, with web search on and the location set to ${[snap.location?.city, snap.location?.region].filter(Boolean).join(', ')}:`),
      el('p', { class: 'snapshot-question' }, `"${snap.question}"`),
      verdict,
      el('div', { class: 'answer' }, snap.answer + (snap.truncated ? ' …' : '')),
      snap.sources && snap.sources.length ? el('p', { class: 'snapshot-sources' }, el('strong', {}, 'Sources it cited: '), snap.sources.map((x, i) => [i ? ' · ' : '', GS.safeLink(x.url, x.domain)]).flat()) : el('p', { class: 'muted' }, 'It cited no sources.'),
      el('p', { class: 'muted' }, 'One answer is a snapshot, not a ranking. Answers change between runs and can differ from what people see in the ChatGPT, Claude or Perplexity apps.'),
      offer || null);
    return card;
  };
})();
