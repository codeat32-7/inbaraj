const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const out = process.argv[2] || require('os').tmpdir();
const JD = fs.readFileSync(path.join(__dirname, 'sample-jd.txt'), 'utf-8');
const ok = (name, cond, extra = '') => console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('admin_pwd', 'pw'); } catch {} });
  const errs = [];
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  p.on('dialog', (d) => d.accept());
  const scoreNow = async () => Number(await p.locator('.wb-gauge-num').textContent());
  const toast = async () => (await p.locator('.wb-msg').first().innerText().catch(() => '')).trim();

  await p.goto('http://localhost:3111/admin/workbench', { waitUntil: 'networkidle' });
  await p.fill('#wb-jd', JD);
  await p.click('text=Score and open');
  await p.waitForSelector('.wb-gauge', { timeout: 60000 });
  const s0 = await scoreNow();
  ok('scores via Jev on open', (await p.locator('.wb-chip-ok').first().innerText()).includes('Jev'), `score ${s0}`);
  const nGaps = await p.locator('.wb-gap:not(.wb-gap-kw)').count();
  ok('lists the gaps', nGaps > 0, `${nGaps} gaps`);
  await p.screenshot({ path: `${out}/wb-1-dashboard.png` });

  // triage
  await p.click('text=/Triage \\d+ gaps with Claude/');
  await p.waitForSelector('.wb-tag-rephrase', { timeout: 60000 });
  ok('triage tags appear', (await p.locator('.wb-tag-rephrase').count()) > 0 && (await p.locator('.wb-tag-true-gap').count()) > 0);
  ok('honest ceiling shown', (await p.locator('.wb-ceil').count()) === 2, (await p.locator('.wb-ceil strong').allInnerTexts()).join(' / '));
  await p.screenshot({ path: `${out}/wb-2-triaged.png` });

  // reword -> accept -> Jev re-score
  await p.locator('.wb-gap', { has: p.locator('.wb-tag-rephrase') }).first().click();
  await p.click('text=Ask Claude to close this gap');
  await p.waitForSelector('.wb-after', { timeout: 60000 });
  ok('proposal fact-check passed', (await p.locator('.wb-fact.is-pass').count()) === 1);
  await p.screenshot({ path: `${out}/wb-3-proposal.png` });
  const before = await scoreNow();
  await p.click('text=/Accept and re-validate with Jev/');
  await p.waitForFunction(() => document.querySelector('.wb-msg')?.textContent?.includes('re-scored'), null, { timeout: 60000 });
  const after = await scoreNow();
  ok('Jev re-scored after accepting', after >= before, `${before} -> ${after}`);
  ok('history grew', (await p.locator('.wb-spark-dot').count()) === 2);
  await p.screenshot({ path: `${out}/wb-4-accepted.png` });

  // needs-fact -> answer -> draft -> accept (new bullet from a user fact)
  const nf = p.locator('.wb-gap', { has: p.locator('.wb-tag-needs-fact') }).first();
  if (await nf.count()) {
    await nf.click();
    await p.click('text=/Ask Claude how to approach it/');
    await p.waitForSelector('.wb-question', { timeout: 60000 });
    ok('asks the user a question', true, (await p.locator('.wb-question').innerText()));
    await p.fill('textarea[placeholder^="Answer with"]', 'Worked at Facilio, a SaaS startup, leading enterprise implementations.');
    await p.click('text=Draft from my answer');
    await p.waitForSelector('.wb-after', { timeout: 60000 });
    ok('draft from user fact passes the check', (await p.locator('.wb-fact.is-pass').count()) === 1);
    await p.click('text=/Accept and re-validate with Jev/');
    await p.waitForSelector('.wb-facts li', { timeout: 60000 });
    ok('user fact recorded', (await p.locator('.wb-facts li').count()) === 1);
    await p.screenshot({ path: `${out}/wb-5-fact.png` });
  } else { ok('needs-fact gap present', false); }

  // true gap -> accepted
  const tg = p.locator('.wb-gap', { has: p.locator('.wb-tag-true-gap') }).first();
  await tg.click();
  await p.click('text=Ask Claude to close this gap').catch(async () => { await p.click('text=/Ask Claude how to approach it/'); });
  await p.waitForSelector('text=Accept this gap', { timeout: 60000 });
  await p.click('text=Accept this gap');
  ok('real gap can be accepted (not faked)', (await p.locator('.wb-gap.is-decided').count()) >= 1);

  // undo
  await p.click('button:has-text("Undo")');
  ok('undo works', (await toast()).includes('undone'));

  // survive a refresh
  const dots = await p.locator('.wb-spark-dot').count();
  await p.reload({ waitUntil: 'networkidle' });
  await p.fill('#wb-jd', JD);
  await p.click('text=Score and open');
  await p.waitForSelector('.wb-gauge', { timeout: 60000 });
  ok('session restored after reload', (await p.locator('.wb-spark-dot').count()) === dots - 0 || (await p.locator('.wb-spark-dot').count()) >= 2, `${dots} -> ${await p.locator('.wb-spark-dot').count()} dots`);

  // draft handoff + send back
  const listener = await ctx.newPage();
  await listener.goto('http://localhost:3111/admin/workbench');
  await listener.evaluate(() => { window.__got = null; const c = new BroadcastChannel('resume-studio'); c.onmessage = (e) => { window.__got = e.data; }; });
  await p.evaluate((jd) => localStorage.setItem('workbench-handoff', JSON.stringify({ company: 'TestCo', slug: 'testco', jobDescription: jd, overrides: {}, at: Date.now() })), JD);
  await p.goto('http://localhost:3111/admin/workbench', { waitUntil: 'networkidle' });
  ok('handoff card shown', (await p.locator('.wb-handoff').count()) === 1);
  await p.click('text=Open this draft');
  await p.waitForSelector('.wb-gauge', { timeout: 60000 });
  ok('draft flagged unpublished', (await p.locator('text=Unpublished draft').count()) === 1);
  await p.click('text=Send back to Studio');
  await p.waitForTimeout(400);
  const got = await listener.evaluate(() => window.__got);
  ok('Studio tab receives overrides', got && got.type === 'workbench-overrides' && got.slug === 'testco');

  console.log('console errors:', JSON.stringify(errs.slice(0, 4)));
  await b.close();
})().catch((e) => { console.log('SCRIPT ERROR', e.message); process.exit(1); });
