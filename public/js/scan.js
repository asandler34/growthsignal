// Public scan progress and preview report page (/scan/:id) and shared reports (/r/:token).
(function () {
  const { api, el } = GS;
  const main = document.getElementById('main');
  const parts = location.pathname.split('/').filter(Boolean);
  const shared = parts[0] === 'r';
  const id = parts[1];
  let me = null;

  function render(nodes) { main.replaceChildren(...[].concat(nodes)); }

  function claimCard(scan) {
    const status = el('div', { 'aria-live': 'polite' });
    const input = el('input', { type: 'email', id: 'claim-email', name: 'email', required: true, autocomplete: 'email', placeholder: 'you@yourbusiness.com' });
    const form = el('form', { onsubmit: async e => {
      e.preventDefault();
      status.replaceChildren(el('span', { class: 'spinner', 'aria-hidden': 'true' }), 'Sending your link…');
      try {
        await api('/api/auth/request', { method: 'POST', body: { email: input.value, claimScanId: scan.id } });
        form.replaceChildren(el('div', { class: 'notice ok' }, el('strong', {}, 'Check your email. '), 'We sent a sign in link to ', input.value, '. Open it on this device to save this report.'));
      } catch (err) { status.replaceChildren(el('div', { class: 'notice error' }, err.message)); }
    } }, el('div', { class: 'field' }, el('label', { for: 'claim-email' }, 'Email address'), input), el('button', { class: 'button', type: 'submit' }, 'Save my report, free'), status);
    return el('div', { class: 'card cta-card' },
      el('h2', {}, 'Save this report and see the evidence'),
      el('p', {}, 'A free account adds:'),
      el('ul', { class: 'lock-list' }, ['The evidence behind every check', 'All recommendations, not just the top three', 'Which AI and search crawlers you block', 'Business facts we detected on your pages', 'A free AI answer sample: does an AI assistant mention you for 3 local questions?', 'Report history when you rescan'].map(t => el('li', {}, t))),
      el('p', { class: 'muted' }, 'No password and no card. We email you a sign in link.'), form);
  }

  function snapshotCard(snap) {
    const offer = snap.status === 'complete' ? el('div', { class: 'snapshot-offer' },
      el('span', {}, el('strong', {}, 'Answers change. '), 'Check re-asks your questions every month on two AI platforms, rescans your site weekly, and emails you when something changes. $9 a month, cancel anytime.'),
      me ? el('a', { class: 'button small', href: '/app/billing' }, 'Track it with Check') : el('a', { class: 'button small', href: '#save' }, 'Save free, then track it')) : null;
    return GS.snapshotCard(snap, { offer });
  }

  function pollSnapshot(tries = 0) {
    if (tries > 40) return;
    setTimeout(async () => {
      try {
        const scan = await api(`/api/scans/${encodeURIComponent(id)}`);
        const current = document.getElementById('ai-answer');
        if (current && scan.snapshot) current.replaceWith(snapshotCard(scan.snapshot));
        if (!scan.snapshot || scan.snapshot.status === 'pending') pollSnapshot(tries + 1);
      } catch (e) { pollSnapshot(tries + 1); }
    }, 2500);
  }

  function failed(scan) {
    return [el('h1', {}, scan.domain), el('div', { class: 'notice error' }, el('strong', {}, 'We could not scan this site. '), scan.error || 'Unknown error.'),
      el('p', {}, 'Common causes: the address has a typo, the site is down, or it blocks automated visitors. Check the address and ', el('a', { href: '/#scan' }, 'try again'), '.')];
  }

  async function poll() {
    let scan;
    try {
      scan = shared ? await api(`/api/shared/${encodeURIComponent(id)}`) : await api(`/api/scans/${encodeURIComponent(id)}`);
    } catch (e) {
      return render([el('h1', {}, 'Report not found'), el('p', {}, 'This report does not exist, has expired, or belongs to an account. ', el('a', { href: '/app' }, 'Sign in'), ' to see saved reports.')]);
    }
    if (scan.status === 'failed') return render(failed(scan));
    if (scan.status !== 'complete') {
      render([el('h1', {}, `Scanning ${scan.domain}`), el('p', { class: 'muted' }, 'This usually takes under a minute. You can keep this page open.'), GS.progressSteps(scan.progress)]);
      return setTimeout(poll, 2000);
    }
    const owned = !scan.preview;
    document.title = `${scan.domain} readiness report · GrowthSignal`;
    const header = [el('h1', {}, shared && scan.businessName ? `${scan.businessName}` : scan.domain),
      el('p', { class: 'muted' }, `Real scan of ${scan.report.site.finalUrl} on ${GS.fmtDate(scan.completedAt)}. `, shared ? 'Shared by the site owner.' : '')];
    const nodes = [...header];
    if (owned && scan.siteId) nodes.push(el('div', { class: 'notice ok' }, 'This report is saved to your account. ', el('a', { href: `/app/site/${scan.siteId}` }, 'Open your dashboard')));
    if (!owned && !shared && !me) nodes.push(el('p', {}, el('a', { href: '#save' }, 'Save this report free'), ' to see the evidence behind each finding and run a free AI answer sample.'));
    if (!owned && !shared && me) nodes.push(el('div', { class: 'notice' }, 'You are signed in. ', el('a', { href: '/app' }, 'Add this site in your dashboard'), ' to save it and see evidence.'));
    const report = GS.renderReport(scan.report, { full: owned });
    // Free value before sign up: one real AI answer right after the score, one ready to paste fix after the priorities.
    if (!shared && scan.snapshot) report.insertBefore(snapshotCard(scan.snapshot), report.children[1] || null);
    if (!shared && scan.freeFix) {
      const next = [...report.children].find(n => n.querySelector && n.querySelector('h2') && n.querySelector('h2').textContent === 'What to do next');
      report.insertBefore(GS.freeFixCard(scan.freeFix, { footer: el('p', {}, 'Improve builds every fix from facts you confirm, then checks it worked. ', el('a', { href: '/#pricing' }, 'See plans')) }), next ? next.nextSibling : null);
    }
    if (!shared && scan.snapshot && scan.snapshot.status === 'pending') pollSnapshot();
    // Put the save offer right after the score and top fixes, before the full check list.
    if (!owned && !shared && !me) { const card = claimCard(scan); card.id = 'save'; const allChecks = [...report.children].find(n => n.tagName === 'H2'); report.insertBefore(card, allChecks || null); }
    nodes.push(report);
    render(nodes);
  }

  api('/api/me').then(r => { me = r.user; if (me) document.getElementById('nav-account').textContent = 'Dashboard'; }).catch(() => {}).finally(poll);
})();
