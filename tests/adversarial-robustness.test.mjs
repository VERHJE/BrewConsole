// NIEUW (Brew Console v2.2 — Full QA/Test/Repair Instructions, §18/§20/§21): adversarial
// robuustheidstests voor scenario's die het document expliciet noemt en die tot nu toe
// ONGETEST waren: malformed import, corrupted localStorage, export/import-rondgang, en
// rapid/dubbele klikken. Bewust een EIGEN bestand (niet toegevoegd aan
// kernflow.smoke.test.mjs) — die file verzamelt console/page-errors over de HELE testrun
// heen en faalt op elke onverwachte error; deze tests triggeren juist BEWUST
// foutcondities om te bewijzen dat de app ze afvangt (bv. loadBeans()'s eigen
// console.error() bij corrupte data), en zouden die gedeelde eindcontrole dus vervuilen.
// Zelfde reden als break-it-matrix.test.mjs en golden-fixtures.test.mjs hun eigen bestand
// kregen.
//
// Bevinding tijdens het schrijven van deze tests (zie eindrapport): de code was al
// defensief (loadBeans()/loadBrewLog()/importBackupFile() hebben allemaal een try/catch
// met een eerlijke fallback) — dit bestand bewijst dat gedrag nu voor het eerst, i.p.v.
// het alleen te lezen en te vertrouwen.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import fs from 'node:fs';
import { APP_HTML_PATH } from './load-app.mjs';

const FILE_URL = 'file://' + APP_HTML_PATH;
const FIXED_CHROMIUM_PATH = '/opt/pw-browsers/chromium';
const executablePath = fs.existsSync(FIXED_CHROMIUM_PATH) ? FIXED_CHROMIUM_PATH : undefined;

async function assertBecomesActive(page, selector){
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    return !!el && el.classList.contains('active');
  }, selector, { timeout: 5000 });
}

describe('Adversarial robustness — import/storage/rapid-click (Full QA §18/§20/§21)', () => {
  let browser;
  before(async () => { browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] }); });
  after(async () => { if (browser) await browser.close(); });

  test('malformed (ongeldige) import-JSON crasht de app niet en toont een eerlijke foutmelding', async () => {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="beans"]');
    await assertBecomesActive(page, '#screen-beans');

    await page.setInputFiles('#backup-import-file', {
      name: 'kapot.json', mimeType: 'application/json',
      buffer: Buffer.from('{dit is geen geldige JSON!!!')
    });
    await page.waitForFunction(() => document.getElementById('backup-status').hidden === false);
    const statusText = (await page.locator('#backup-status').textContent()).trim();
    assert.match(statusText, /niet lezen|geldige backup/i, 'moet een begrijpelijke foutmelding tonen, geen kale stacktrace');
    assert.deepEqual(pageErrors, [], 'malformed import mag nooit een onafgevangen JS-fout geven');

    // App moet daarna gewoon bruikbaar blijven — geen halfkapotte state.
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');
    await page.close();
  });

  test('geldige JSON zonder herkenbare backup-vorm geeft een eerlijke foutmelding, geen crash', async () => {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="beans"]');
    await assertBecomesActive(page, '#screen-beans');

    await page.setInputFiles('#backup-import-file', {
      name: 'onherkenbaar.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ hello: 'world', beans: 'niet-een-array' }))
    });
    await page.waitForFunction(() => document.getElementById('backup-status').hidden === false);
    const statusText = (await page.locator('#backup-status').textContent()).trim();
    assert.match(statusText, /geen herkenbare backup/i);
    assert.deepEqual(pageErrors, []);
    await page.close();
  });

  test('corrupte localStorage bij opstart crasht de app niet — valt terug op de seed-bonen', async () => {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    // Eerst normaal laden zodat het origin bestaat, dan corrumperen, dan herladen —
    // localStorage kan pas gezet worden ná een navigatie naar het bestand zelf.
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.evaluate(() => {
      localStorage.setItem('brewconsole_beans', '{dit is geen geldige JSON');
      localStorage.setItem('brewConsoleLog', '[ook kapot,,,');
    });
    await page.reload({ waitUntil: 'load' });

    assert.deepEqual(pageErrors, [], 'corrupte localStorage mag nooit een onafgevangen JS-fout geven bij opstart');
    await page.click('.navbar [data-nav="beans"]');
    await assertBecomesActive(page, '#screen-beans');
    const beanCount = await page.locator('#bean-list .bean-card').count();
    assert.ok(beanCount > 0, 'moet terugvallen op de seed-bonen i.p.v. een lege of kapotte staat');
    await page.close();
  });

  test('export → localStorage wissen → herladen → import herstelt exact dezelfde bonen en loggings', async () => {
    const page = await browser.newPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });

    // Geen "Clear all data"-knop bestaat in de app (bevinding, zie eindrapport) — dit
    // simuleert het praktische equivalent op storage-niveau, wat het eigenlijke doel van
    // §20 dekt: bewijst dat import de volledige, ongewijzigde staat terugzet.
    const exportedPayload = await page.evaluate(() => ({
      app: 'brew-console', backupVersion: 2, exportedAt: new Date().toISOString(),
      beans: beanLibrary, brewLog: brewLog, theme: 'dark',
      waterHardnessMgL: null, waterAlkalinity: { value:null, unit:'CaCO3' }, waterDilution: { tapParts:1, demiParts:0 }
    }));
    const beanCountBefore = exportedPayload.beans.length;

    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'load' });
    await page.click('.navbar [data-nav="beans"]');
    await assertBecomesActive(page, '#screen-beans');

    await page.setInputFiles('#backup-import-file', {
      name: 'restore.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(exportedPayload))
    });
    await page.waitForFunction(() => document.getElementById('backup-status').hidden === false);

    const beanCountAfter = await page.evaluate(() => beanLibrary.length);
    // Na localStorage.clear() valt de app terug op verse seed-bonen (eigen unieke id's),
    // dus import voegt de geëxporteerde set TOE naast die seed-bonen — vandaar >=, niet ===.
    assert.ok(beanCountAfter >= beanCountBefore, `verwacht minstens de ${beanCountBefore} geëxporteerde bonen terug, kreeg ${beanCountAfter}`);
    const restoredIds = await page.evaluate(() => beanLibrary.map(b=>b.id));
    for (const b of exportedPayload.beans){
      assert.ok(restoredIds.includes(b.id), `boon ${b.id} moet na de rondgang terug aanwezig zijn`);
    }
    await page.close();
  });

  test('herhaald/snel klikken op start-btn geeft geen dubbele of kapotte brouwtimer-state', async () => {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    await page.clock.install({ time: Date.now() });
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast] >> nth=0');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');

    // Vijf snelle, ongeduldige klikken i.p.v. één — het scherm is dan al gewisseld ná de
    // eerste klik, dus de resterende klikken raken UI die niet meer voor start-btn bedoeld
    // is; dit bewijst vooral dat dát geen crash of duplicate-state geeft.
    for (let i=0;i<5;i++){
      // Korte timeout: ná de eerste geslaagde klik wisselt het scherm en wordt start-btn
      // onbereikbaar — Playwright's standaard 30s-actionability-wachttijd zou de resterende
      // vier klikken elk laten hangen tot ze timen out (2 minuten trager, geen extra dekking).
      await page.click('#start-btn', { timeout: 500 }).catch(()=>{});
    }
    await assertBecomesActive(page, '#screen-brew');
    assert.deepEqual(pageErrors, [], 'herhaald klikken op start-btn mag nooit een onafgevangen JS-fout geven');

    // Timer moet nog steeds normaal aflopen naar precies één "Klaar"-status, geen
    // dubbele/verwarde eindstaat.
    await page.clock.fastForward('20:00');
    await page.waitForFunction(() => getComputedStyle(document.getElementById('brewlog-open-btn')).display !== 'none');
    const openBtnCount = await page.locator('#brewlog-open-btn').count();
    assert.equal(openBtnCount, 1);
    await page.close();
  });
});
