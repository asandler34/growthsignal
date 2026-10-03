(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('error') === 'expired') document.getElementById('login-error').hidden = false;
  const form = document.getElementById('login-form');
  const status = document.getElementById('login-status');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    status.textContent = 'Sending…';
    try {
      await GS.api('/api/auth/request', { method: 'POST', body: { email, next: params.get('next') || '/app' } });
      form.replaceChildren(GS.el('div', { class: 'notice ok' }, GS.el('strong', {}, 'Check your email. '), `We sent a sign in link to ${email}. It expires in 30 minutes.`));
    } catch (err) { status.replaceChildren(GS.el('div', { class: 'notice error' }, err.message)); }
  });
})();
