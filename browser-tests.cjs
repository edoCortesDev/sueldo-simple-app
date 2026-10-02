'use strict';

// Optional development verification. The application and domain tests need no packages.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const output = path.join(__dirname, 'artifacts');
const appURL = pathToFileURL(path.join(__dirname, 'index.html')).href;
const testsURL = pathToFileURL(path.join(__dirname, 'tests.html')).href;

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
  const evidence = [];
  const errors = [];
  const check = (name) => { evidence.push(name); console.log(`PASS ${name}`); };
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto(appURL);
    await page.locator('#month').fill('2026-09');
    await page.locator('#month').dispatchEvent('change');
    assert.equal(await page.locator('#base').inputValue(), '400000');
    assert.equal(await page.locator('#daily-rate').textContent(), '$18.182');
    assert.equal(await page.locator('[data-day]').count(), 30);
    check('AC01/AC02: file:// startup, default base, September calendar');

    for (const day of [1, 5, 6]) await page.locator(`[data-day="${day}"]`).click();
    await page.locator('#advance').fill('10000');
    assert.equal(await page.locator('#total').textContent(), '$63.182');
    assert.equal(await page.locator('#balance').textContent(), '$53.182');
    assert.equal(await page.locator('#mobile-balance').textContent(), '$53.182');
    await page.locator('[data-day="1"]').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.locator('[data-day="1"]').getAttribute('aria-pressed'), 'false');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-day="1"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#total').textContent(), '$63.182');
    check('AC03/AC04: pointer and keyboard selection, extra rates, advance');

    await page.locator('#advance').fill('63182');
    assert.equal(await page.locator('#balance-label').textContent(), 'Saldo al día');
    await page.locator('#advance').fill('68182');
    assert.equal(await page.locator('#balance').textContent(), '$-5.000');
    assert.equal(await page.locator('#balance-label').textContent(), 'Abono en exceso');
    check('AC05: settled and negative balances retain the correct meaning');

    await page.locator('#base').fill('1.5');
    assert.equal(await page.locator('#base').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.locator('#print').isDisabled(), true);
    assert.equal(await page.locator('#mobile-print').isDisabled(), true);
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('#payslip').isVisible(), false);
    assert.equal(await page.locator('.print-invalid-message').isVisible(), true);
    await page.emulateMedia({ media: 'screen' });
    await page.locator('#base').fill('400000');
    await page.locator('#advance').fill('10000');
    check('AC01/AC08: invalid money blocks button and browser printing');

    await page.locator('#next').click();
    assert.equal(await page.locator('#month').inputValue(), '2026-10');
    assert.equal(await page.locator('#total').textContent(), '$0');
    await page.locator('#base').fill('500000');
    await page.locator('#previous').click();
    assert.equal(await page.locator('#base').inputValue(), '400000');
    assert.equal(await page.locator('#total').textContent(), '$63.182');
    await page.reload();
    await page.locator('#month').fill('2026-09');
    await page.locator('#month').dispatchEvent('change');
    assert.equal(await page.locator('#total').textContent(), '$63.182');
    check('AC06: independent monthly values and selections survive reload');

    await page.locator('#select-weekdays').click();
    assert.equal(await page.locator('#total').textContent(), '$445.004');
    await page.locator('#clear').click();
    assert.equal(await page.locator('#total').textContent(), '$0');
    assert.equal(await page.locator('#clear').isDisabled(), true);
    check('AC03: bulk weekday selection preserves extras; clear is confirmed');

    await page.locator('#base').fill('1000000000000');
    await page.locator('#select-weekdays').click();
    await page.locator('#name').fill('<script>alert(1)</script> & Ana');
    const overflow = async () => page.evaluate(() => ({
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      outside: [...document.querySelectorAll('#salary-app *:not(.sr-only)')].filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width && (rect.left < -1 || rect.right > window.innerWidth + 1);
      }).map((node) => node.id || node.className)
    }));
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const result = await overflow();
      assert.ok(result.scrollWidth <= result.width, JSON.stringify(result));
      assert.deepEqual(result.outside, []);
      const overlaps = await page.locator('#calendar').evaluate((calendar) => {
        const rects = [...calendar.querySelectorAll('button')].map((button) => button.getBoundingClientRect());
        return rects.some((a, i) => rects.some((b, j) => j > i && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1));
      });
      assert.equal(overlaps, false, `Calendar cells overlap at ${width}px`);
    }
    check('AC09: 320/390/768/1440 widths have no viewport overflow, including maximum amounts');

    await page.locator('#base').fill('400000');
    await page.locator('#advance').fill('130000');
    await page.locator('#name').fill('Ana Cortés');
    await page.locator('#clear').click();
    for (const day of [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 13, 14]) await page.locator(`[data-day="${day}"]`).click();
    for (const [width, name] of [[1440, 'desktop'], [390, 'mobile'], [320, 'small-mobile']]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(output, `sueldo-${name}.png`), fullPage: true, animations: 'disabled' });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.summary-section').evaluate((node) => getComputedStyle(node).animationName), 'none');
    check('AC09: desktop/mobile screenshots captured and reduced motion respected');

    await page.evaluate(() => {
      window.printCalls = 0;
      window.print = () => { window.printCalls += 1; window.dispatchEvent(new Event('beforeprint')); };
    });
    await page.locator('#print').click();
    assert.equal(await page.evaluate(() => window.printCalls), 1);
    await page.locator('#mobile-print').click();
    assert.equal(await page.evaluate(() => window.printCalls), 2);
    assert.equal(await page.title(), 'Sueldo Simple');
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('#salary-app').isVisible(), false);
    assert.equal(await page.locator('#payslip').isVisible(), true);
    const printText = await page.locator('#payslip').textContent();
    for (const label of ['Ana Cortés', 'septiembre de 2026', '$18.182', '$20.000', '$25.000', '$130.000', 'Días normales: 1, 2, 3, 4, 7, 8, 9, 10, 11, 14', 'Sábados: 5', 'Domingos: 13']) assert.ok(printText.includes(label), label);
    await page.pdf({ path: path.join(output, 'liquidacion-ejemplo.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
    await page.screenshot({ path: path.join(output, 'liquidacion-print.png'), fullPage: true });
    check('AC08: print command and statement metadata, selected dates, amounts and A4 PDF');

    await page.goto(testsURL);
    assert.equal(await page.locator('#test-summary').textContent(), '22/22 pruebas correctas');
    check('AC10: all domain tests also pass directly in tests.html');

    const corrupted = await browser.newContext();
    await corrupted.addInitScript(() => localStorage.setItem('sueldo-simple:v1:2026-09', '{broken'));
    const corruptPage = await corrupted.newPage();
    await corruptPage.goto(appURL);
    await corruptPage.locator('#month').fill('2026-09');
    await corruptPage.locator('#month').dispatchEvent('change');
    assert.equal(await corruptPage.locator('#storage-warning').isVisible(), true);
    await corruptPage.locator('[data-day="1"]').click();
    assert.equal(await corruptPage.evaluate(() => localStorage.getItem('sueldo-simple:v1:2026-09')), '{broken');
    assert.equal(await corruptPage.locator('#total').textContent(), '$18.182');
    check('AC07: corrupt saved month is preserved while calculations remain usable');

    const denied = await browser.newContext();
    await denied.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new Error('Read denied'); };
      Storage.prototype.setItem = () => { throw new Error('Write denied'); };
    });
    const deniedPage = await denied.newPage();
    await deniedPage.goto(appURL);
    assert.equal(await deniedPage.locator('#storage-warning').isVisible(), true);
    await deniedPage.locator('#base').fill('450000');
    assert.equal(await deniedPage.locator('#print').isEnabled(), true);
    check('AC07: unavailable localStorage shows feedback without blocking calculation or print');
    assert.deepEqual(errors, []);
    check('No browser runtime errors');
    fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify({ date: new Date().toISOString(), browser: await browser.version(), evidence, errors }, null, 2));
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
