import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, importLog } from './helpers.mjs';
import { seedLog, SEED_BEAN } from './seed.ts';

let app;
before(async () => { app = await startApp(); });
after(async () => { await app.close(); });

test('opnieuw kopen: bijna op toont de knop met het ingevulde adres; zonder adres een hint; formulier bewaart het adres', async () => {
  const page = await app.browser.newPage();
  await importLog(page, app.base, (await seedLog(8, { bagSizeG: '100', shopUrl: 'https://brander.nl/zak' })).json);
  await page.goto(app.base + '#/zakken');
  await page.click(`.item:has-text("${SEED_BEAN}")`);
  await page.waitForSelector('.stock .tag.warn:has-text("Bijna op")');
  const link = page.locator('a:has-text("Opnieuw kopen")');
  assert.equal(await link.getAttribute('href'), 'https://brander.nl/zak');
  assert.equal(await link.getAttribute('target'), '_blank');
  assert.match(await link.getAttribute('rel'), /noopener/);
  await page.click('a:has-text("Bewerken")');
  assert.equal(await page.inputValue('input[name=shopUrl]'), 'https://brander.nl/zak');
  await page.fill('input[name=shopUrl]', 'javascript:alert(1)');
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector('[role=alert]:has-text("webadres")');
  await page.fill('input[name=shopUrl]', '');
  await page.click('button:has-text("Opslaan")');
  await page.waitForSelector(`.item:has-text("${SEED_BEAN}")`);
  await page.click(`.item:has-text("${SEED_BEAN}")`);
  await page.waitForSelector('text=Voeg bij Bewerken een webadres toe');
  assert.equal(await page.locator('a:has-text("Opnieuw kopen")').count(), 0);
  await page.close();
});
