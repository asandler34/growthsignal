'use strict';
// Browser walk through of the core customer journey with Playwright and Chromium.
// Runs the real server and worker against local fixture sites and the AI API test stub.
// Usage: npm run e2e   (screenshots are written to E2E_OUT, default ./e2e-output)
const path = require('path');
const fs = require('fs');
const h = require('../helpers');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(process.env.NODE_PATH || '/opt/node-tools/node_modules', 'playwright'))); }

const OUT = process.env.E2E_OUT || path.join(__dirname, '..', '..', 'e2e-output');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const results = [];
  const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`); };
  const ai = await h.startAiStub();
  await h.resetDb();
  const { goodSite } = require('../fixtures/sites');
  const site = await goodSite();
  const app = await h.startApp();
  const { startWorker } = require('../../src/jobs/worker');
  const { config } = require('../../src/config');
  config.worker.pollMs = 200;
  config.baseUrl = app.base;
  const worker = startWorker();
  const { outbox } = require('../../src/lib/email');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

  try {
    // Desktop homepage
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push(e.message));
    await page.goto(app.base + '/');
    await page.screenshot({ path: path.join(OUT, '01-home-desktop.png'), fullPage: false });
    check('homepage has no borrowed testimonials', !(await page.content()).match(/Lily Ray|Heather Hornor|WIRED|TechCrunch/));
    check('pricing shows four plans', (await page.locator('#price-grid .price-card').count()) === 4);

    // Keyboard: skip link is the first tab stop and leads to the scan input
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement && document.activeElement.textContent.trim());
    check('first tab stop is the skip link', /Skip to the free scan/.test(first), first);

    // Validation message on empty submit
    await page.click('#scan-form button[type=submit]');
    check('empty scan shows an error', /Enter your website/.test(await page.textContent('#scan-status')));

    // Real scan of the fixture site
    await page.fill('#scan-url', site.origin + '/');
    await page.click('.scan-more summary');
    await page.fill('#scan-name', 'Summit Plumbing');
    await page.fill('#scan-category', 'plumber');
    await page.fill('#scan-city', 'Denver');
    await page.fill('#scan-region', 'CO');
    await page.click('#scan-form button[type=submit]');
    await page.waitForURL(/\/scan\//);
    await page.waitForSelector('.score-dial', { timeout: 30000 });
    await page.screenshot({ path: path.join(OUT, '02-preview-report.png'), fullPage: true });
    const scoreText = await page.textContent('.score-dial strong');
    check('preview report shows a real score', /^\d+$/.test(scoreText.trim()), scoreText);
    check('preview hides evidence until sign up', (await page.locator('.evidence').count()) === 0);

    // Save report with email, open the magic link
    const before = outbox.length;
    await page.fill('#claim-email', 'owner@summit.example');
    await page.click('.cta-card button[type=submit]');
    await page.waitForSelector('text=Check your email');
    const mail = outbox.slice(before).find(m => m.to === 'owner@summit.example');
    const link = /(http\S+token=[A-Za-z0-9_-]+)/.exec(mail.text)[1];
    await page.goto(link);
    await page.click('button[type=submit]');
    await page.waitForURL(/\/app\/site\//);
    await page.waitForSelector('.score-dial', { timeout: 30000 });
    await page.screenshot({ path: path.join(OUT, '03-dashboard-report.png'), fullPage: true });
    check('saved report shows evidence', (await page.locator('.evidence').count()) > 0);

    // Free AI answer sample
    await page.click('#tab-visibility');
    await page.click('text=Run my free AI answer sample');
    await page.waitForSelector('text=discovery answers', { timeout: 60000 });
    await page.screenshot({ path: path.join(OUT, '04-ai-answers.png'), fullPage: true });
    check('AI sample shows unconnected platform honestly', /not connected/i.test(await page.textContent('#tab-panel')));

    // Fix kit locked on free plan
    await page.click('#tab-fixes');
    await page.waitForSelector('text=Compare plans');
    check('fix kit is gated on free plan', true);

    // Billing page
    await page.goto(app.base + '/app/billing');
    await page.waitForSelector('.plan-cards');
    await page.screenshot({ path: path.join(OUT, '05-billing.png'), fullPage: true });
    check('billing shows test mode notice', /test mode/i.test(await page.textContent('main')));

    check('no browser console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

    // Mobile layouts
    const m = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true });
    for (const [p, file] of [['/', '06-home-mobile.png'], ['/methodology', '07-methodology-mobile.png'], ['/login', '08-login-mobile.png']]) {
      await m.goto(app.base + p);
      await m.screenshot({ path: path.join(OUT, file), fullPage: p !== '/' });
      const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`no horizontal scroll at 375px on ${p}`, overflow <= 1, `overflow ${overflow}px`);
    }
    const mctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true });
    const mp = await mctx.newPage();
    const cookie = (await page.context().cookies()).find(c => c.name === 'gs_session');
    await mctx.addCookies([cookie]);
    await mp.goto(page.url().replace('/app/billing', '/app'));
    await mp.waitForSelector('h1');
    await mp.screenshot({ path: path.join(OUT, '09-dashboard-mobile.png'), fullPage: true });
    const ov = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('no horizontal scroll at 375px on dashboard', ov <= 1, `overflow ${ov}px`);
  } catch (e) {
    check('journey completed without exceptions', false, e.message);
  } finally {
    await browser.close();
    await worker.stop();
    await app.close(); await site.close(); ai.close();
    await require('../../src/db').pool.end();
  }
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots in ${OUT}`);
  process.exit(failed.length ? 1 : 0);
})();
