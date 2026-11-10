import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, importLog } from './helpers.mjs';
import { seedLog, SEED_BEAN } from './seed.ts';

// Audit 10 nov 2026, ronde 2: P2-03, P2-04, P2-06, P3-02, P3-03.
let app, json;
before(async () => { app = await startApp(); json = (await seedLog(4)).json; });
after(async () => { await app.close(); });

test('P2-03: zakdetail zonder foto toont naam, brander en proces één keer (op het etiket)', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zakken');
  await page.click(`.item:has-text("${SEED_BEAN}")`);
  await page.waitForSelector('.hero-photo .l-name');
  assert.equal(await page.locator('.detail .eyebrow').count(), 0);
  const h1 = page.locator('.detail h1');
  assert.equal(await h1.textContent(), SEED_BEAN, 'de kop blijft er voor schermlezers');
  assert.ok((await h1.boundingBox()).height <= 1, 'maar niet zichtbaar naast het etiket');
  await page.close();
});

test('P2-04 en P2-06: uitklapkaarten hebben een pijltje, Opslaan is breed, dubbele naam geeft een melding', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 } });
  await importLog(page, app.base, json);
  await page.goto(app.base + '#/zakken/nieuw');
  const arrow = await page.locator('details.fold > summary').first().evaluate(e => getComputedStyle(e, '::before').borderRightWidth);
  assert.equal(arrow, '2px');
  const save = await page.locator('.editor-actions .btn.primary').boundingBox();
  assert.ok(save.width > 300, `Opslaan ${save.width}px breed`);
  assert.equal(await page.locator('.banner:has-text("Er is al een zak")').count(), 0);
  await page.fill('input[name=name]', SEED_BEAN.toUpperCase());
  await page.waitForSelector('.banner:has-text("Er is al een zak")');
  await page.close();
});

test('P3-02 en P3-03: etiket heeft in donker een rand; de zoektekst past op een telefoon', async () => {
  const page = await app.browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  await importLog(page, app.base, json);
  for (let i = 0; i < 4; i++) {
    await page.goto(app.base + '#/zakken/nieuw'); await page.fill('input[name=name]', `Extra ${i}`); await page.click('.editor-actions .btn.primary'); await page.waitForURL(u => !u.toString().includes('nieuw'));
  }
  await page.goto(app.base + '#/zakken');
  await page.waitForSelector('.thumb .bagart.label');
  assert.notEqual(await page.locator('.thumb .bagart.label').first().evaluate(e => getComputedStyle(e).boxShadow), 'none');
  const fits = await page.locator('input[name=zoek]').evaluate(el => {
    const c = document.createElement('canvas').getContext('2d'); const cs = getComputedStyle(el); c.font = `${cs.fontSize} ${cs.fontFamily}`;
    return c.measureText(el.placeholder).width <= el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  });
  assert.equal(fits, true);
  await page.close();
});
