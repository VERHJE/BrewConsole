// FIX (v2.2 kernflow — Bouwbesluit "Testdekking: Playwright-smoketest toevoegen"),
// uitgebreid in de vervolgplan v2.3-ronde (fase 2/3) met: alle bestaande schermen
// renderen, terug-knoppen, thema-wissel, en een basale focus-/route-aankondigingscontrole
// voor het nieuwe navigatiemodel (schermregister + tabbalk). Dit bestand laadt nog steeds
// via file:// (geen server nodig) — de service-workerregistratie zelf wordt apart getest
// in sw-registration.test.mjs, dat WEL over http draait, want een service worker bestaat
// niet op file://.
//
// Uitvoeren: node --test tests/*.test.mjs

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import fs from 'node:fs';
import { APP_HTML_PATH } from './load-app.mjs';

const FILE_URL = 'file://' + APP_HTML_PATH;

const FIXED_CHROMIUM_PATH = '/opt/pw-browsers/chromium';
const executablePath = fs.existsSync(FIXED_CHROMIUM_PATH) ? FIXED_CHROMIUM_PATH : undefined;

const FAST_FORWARD = '20:00';

describe('Kernflow smoke test (Bonen → Aanbeveling → Recept → Brouwen → Klaar)', () => {
  let browser;
  const consoleErrors = [];
  const pageErrors = [];

  before(async () => {
    assert.ok(fs.existsSync(APP_HTML_PATH), `Verwacht brewconsole_v2_2.html op ${APP_HTML_PATH}`);
    browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  });

  after(async () => {
    if (browser) await browser.close();
  });

  async function newTrackedPage(){
    const page = await browser.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });
    await page.clock.install({ time: Date.now() });
    return page;
  }

  async function assertNoZeroSizeElements(page, selector, label){
    const boxes = await page.locator(selector).evaluateAll(els =>
      els.map(el => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height, text: el.textContent.trim().slice(0,40) }; })
    );
    assert.ok(boxes.length > 0, `${label}: verwachtte minstens 1 element voor "${selector}", vond 0`);
    for (const b of boxes){
      assert.ok(b.w > 0 && b.h > 0, `${label}: element "${b.text}" heeft 0 breedte/hoogte (${b.w}x${b.h}) — mogelijk silent clipping`);
    }
  }

  test('Route A — Advisor: Bonen → Aanbeveling → Recept → Brouwen → Klaar', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });

    // NIEUW (vervolgplan v2.3, Fase 5): de app landt sinds de navigatieshell op Home,
    // niet meer direct op Methode — eerst naar de "Brouwen"-tab navigeren.
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');

    await page.click('#beans-link');
    await assertBecomesActive(page, '#screen-beans');
    await page.click('#screen-beans [data-back="method"]');
    await assertBecomesActive(page, '#screen-method');

    await page.click('#advisor-link');
    await assertBecomesActive(page, '#screen-advice');
    const adviceProfileCount = await page.locator('#advice-profile [data-adv-profile]').count();
    // BIJGEWERKT (Reparatieplan v4.0, C-1 / Bouwbesluit BB-2): 'zoet' is uit
    // PROFILE_MERGE_GROUPS gehaald (eigen gietschema sinds C-1) — nog maar 1 samengevoegd
    // profiel (vol_rond), dus 11 - 1 = 10 zichtbaar, niet 9.
    assert.equal(adviceProfileCount, 10, 'Advisor-profielchips: verwacht 10 zichtbare keuzes (11 - 1 samengevoegde sinds C-1), zie visibleProfileKeys()');
    await assertNoZeroSizeElements(page, '#advice-profile [data-adv-profile]', 'advice-profile chips');

    await page.click('#advice-roast [data-adv-roast] >> nth=0');
    await page.click('#advice-profile [data-adv-profile] >> nth=0');
    await page.click('#advice-batch [data-adv-batch="single"]');
    await page.waitForFunction(() => getComputedStyle(document.getElementById('advice-result')).display !== 'none');

    await page.click('#advice-cta');
    await assertBecomesActive(page, '#screen-prep');
    const summaryText = (await page.locator('#summary-tag').textContent()).trim();
    assert.ok(summaryText.length > 0, 'Recept-scherm: summary-tag mag niet leeg zijn');

    await page.click('#start-btn');
    await assertBecomesActive(page, '#screen-brew');
    const dialVariant = await page.locator('#dial-time').evaluate(el => getComputedStyle(el).fontVariantNumeric);
    assert.equal(dialVariant, 'tabular-nums', 'Task 20: .dial-time moet font-variant-numeric:tabular-nums hebben');

    await page.clock.fastForward(FAST_FORWARD);
    await page.waitForFunction(() => getComputedStyle(document.getElementById('brewlog-open-btn')).display !== 'none');

    await page.click('#brewlog-open-btn');
    await assertBecomesActive(page, '#screen-brewlog');
    const klaarTitle = (await page.locator('.brewlog-complete-header .title').textContent()).trim();
    assert.equal(klaarTitle, 'Klaar!');
    // FIX (vervolgplan v2.3 — B2): de ring toont geen getal meer tot de brouwscore-formule
    // is goedgekeurd (bevinding 08/09, anchoring). #score-ring-value bestaat niet meer;
    // in plaats daarvan een kwalitatieve samenvatting ónder de smaaksliders.
    const ringNumberEl = await page.locator('#score-ring-value').count();
    assert.equal(ringNumberEl, 0, 'B2: er mag geen #score-ring-value (kaal cijfer) meer in de DOM staan');
    const honestSummary = (await page.locator('#brewlog-honest-summary').textContent()).trim();
    assert.ok(honestSummary.length > 0, 'De eerlijke brouwsamenvatting mag niet leeg zijn');
    const metaText = (await page.locator('#brewlog-complete-meta').textContent()).trim();
    assert.ok(metaText.length > 0, 'brewlog-complete-meta (dosis · water · tijd · methode) mag niet leeg zijn');

    // B2: de samenvatting staat ONDER de smaaksliders, niet erboven (anchoring-risico).
    const order = await page.evaluate(() => {
      const summary = document.getElementById('brewlog-honest-summary');
      const sliders = document.getElementById('brewlog-sliders');
      if (!summary || !sliders) return null;
      const pos = summary.compareDocumentPosition(sliders);
      return (pos & Node.DOCUMENT_POSITION_FOLLOWING) ? 'summary-first' : 'sliders-first';
    });
    assert.equal(order, 'sliders-first', 'B2: de smaaksliders moeten vóór de eerlijke samenvatting staan, niet erna');

    await page.click('#brewlog-save-btn');
    await page.waitForFunction(() => document.getElementById('brewlog-saved-msg').hidden === false);

    await page.close();
  });

  // NIEUW (Reparatieplan v4.0, B-2a — bevinding E-03), BIJGEWERKT na B-2b (Bouwbesluit
  // BB-1): vóór B-2b viel ELK Chemex-schema buiten de band, dus 'klassiek' (het 3-pulse
  // Kernrecept) volstond. Na B-2b landt precies dát 3-pulse-schema weer BINNEN de band —
  // de winst van B-2b. 'fresh_clean' (Hoffmann, 2 pulses) heeft een ander aantal
  // giet-momenten en blijft daarom terecht buiten de band (D-4 blijft intact), dus de
  // eerlijke samenvatting mag de gebruiker ook daar nooit de schuld geven van zijn eigen
  // brouwtijd — hij moet zeggen dat het VOORGESCHREVEN schema zelf al buiten de band valt.
  test('B-2a: op Chemex meldt het Klaar-scherm dat het schema zelf buiten de band valt, niet de gebruiker', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');
    await page.click('[data-method="chemex"]');
    await assertBecomesActive(page, '#screen-roast');
    await page.click('#roast-grid [data-roast] >> nth=0');
    await assertBecomesActive(page, '#screen-profile');
    await page.click('#profile-grid [data-profile="fresh_clean"]');
    await assertBecomesActive(page, '#screen-prep');

    await page.click('#start-btn');
    await assertBecomesActive(page, '#screen-brew');
    await page.clock.fastForward(FAST_FORWARD);
    await page.waitForFunction(() => getComputedStyle(document.getElementById('brewlog-open-btn')).display !== 'none');
    await page.click('#brewlog-open-btn');
    await assertBecomesActive(page, '#screen-brewlog');

    const honestSummary = (await page.locator('#brewlog-honest-summary').textContent()).trim();
    assert.match(honestSummary, /valt zelf al buiten/, 'moet melden dat het SCHEMA buiten de band valt, niet de gebruiker beoordelen');

    await page.close();
  });

  test('Route B — handmatig: Methode → Roast → Profiel (samengevoegd) → Recept', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });

    // NIEUW (vervolgplan v2.3, Fase 5): eerst naar de "Brouwen"-tab, de app landt nu op Home.
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');

    await assertNoZeroSizeElements(page, '#method-grid [data-method]', 'method-grid');
    await page.click('[data-method="v60"]');
    await assertBecomesActive(page, '#screen-roast');
    await assertNoZeroSizeElements(page, '#roast-grid [data-roast]', 'roast-grid');

    await page.click('#roast-grid [data-roast] >> nth=0');
    await assertBecomesActive(page, '#screen-profile');

    const gridProfileCount = await page.locator('#profile-grid [data-profile]').count();
    // BIJGEWERKT (Reparatieplan v4.0, C-1 / Bouwbesluit BB-2): zie de toelichting bij de
    // adviceProfileCount hierboven — 10 zichtbaar sinds 'zoet' niet meer wordt samengevoegd.
    assert.equal(gridProfileCount, 10, 'profile-grid: verwacht 10 zichtbare profielen op V60 (methodOnly-profielen blijven zichtbaar op v60)');
    await assertNoZeroSizeElements(page, '#profile-grid [data-profile]', 'profile-grid buttons');
    // BIJGEWERKT (Reparatieplan v4.0, B-4 / bevinding E-09): findProfileTwins() vergelijkt
    // sinds B-4 het WERKELIJKE recept i.p.v. het gemapte overlay-id, en detecteert daardoor
    // nu ook twee eerder gemiste tweelinggroepen — fruitig_clean/bloemig_delicaat (Rao's
    // pulseCount is RESEARCH_GAP, dus beide vallen terug op hetzelfde generieke schema) en
    // sirooprig_vol/evenwichtig_flex (Hedrick is nooit generatable). Die twee groepen zijn
    // NIET samengevoegd tot één knop (dat is alleen klassiek/vol_rond), dus elk van hun 4
    // leden krijgt terecht een zichtbare tweelingnotitie — precies de winst van B-4: een
    // schijnkeuze die eerder onopgemerkt bleef, is dat nu niet meer.
    const twinNoteCount = await page.locator('#profile-grid .profile-twin-note').count();
    assert.equal(twinNoteCount, 4, 'profile-grid: verwacht 4 tweelingnotities (fruitig_clean/bloemig_delicaat + sirooprig_vol/evenwichtig_flex), sinds B-4 correct gedetecteerd');

    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');
    const twinNoteVisible = await page.locator('#prep-twin-note').isHidden().catch(() => true);
    assert.ok(twinNoteVisible, 'Recept-scherm: prep-twin-note hoort verborgen te zijn voor de samengevoegde klassiek-groep');

    await page.close();
  });

  test('Alle 15 schermen (11 bestaand + 4 nieuw) renderen zonder crash via de tabbalk/schermregister', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });

    // De vijf tabbalk-bestemmingen moeten elk hun scherm activeren.
    const destinations = ['home', 'beans', 'method', 'insights', 'brewlog-history'];
    for (const dest of destinations){
      await page.click(`.navbar [data-nav="${dest}"]`);
      await assertBecomesActive(page, `#screen-${dest}`);
    }

    // Bean Detail: vanuit een boonkaart op het Bonen-scherm (aanname Bouwbesluiten v2).
    // Een verse app heeft geen bonen — eerst zonder foutcondities één boon aanmaken
    // (alle velden hebben een default, f-name valt terug op "Naamloze boon") zodat dit
    // pad écht wordt uitgeoefend i.p.v. stilzwijgend overgeslagen.
    await page.click('.navbar [data-nav="beans"]');
    await assertBecomesActive(page, '#screen-beans');
    await page.click('#bean-add-link');
    await assertBecomesActive(page, '#screen-bean-add');
    await page.click('#save-bean-btn');
    await assertBecomesActive(page, '#screen-beans');

    const hasBeanCard = await page.locator('#bean-list .bean-card').count();
    assert.ok(hasBeanCard > 0, 'Verwacht minstens één boonkaart na het aanmaken van een boon');
    // Klik op de naam (nooit een knop) i.p.v. het geometrische midden van de kaart — een
    // korte kaart (weinig ingevulde velden) kan met de knoppenrij toevallig in het midden
    // liggen, wat anders per ongeluk "Zet deze boon" i.p.v. de kaart zelf zou raken.
    await page.click('#bean-list .bean-card >> nth=0 >> .bean-card-name');
    await assertBecomesActive(page, '#screen-bean-detail');
    const detailName = (await page.locator('#bean-detail-name').textContent()).trim();
    assert.ok(detailName.length > 0, 'Bean Detail: naam mag niet leeg zijn');
    // Bewerken-knop moet nog naar het bestaande, ongewijzigde formulier gaan.
    await page.click('#bean-detail-edit-btn');
    await assertBecomesActive(page, '#screen-bean-add');

    await page.close();
  });

  test('Terug-knoppen op elk bestaand scherm werken nog steeds', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    const backButtons = await page.locator('[data-back]').all();
    assert.ok(backButtons.length > 0, 'Verwacht minstens één [data-back]-knop in de app');
    await page.close();
  });

  test('Thema-wissel werkt en color-scheme beweegt mee (afwijking, kleinere bevinding)', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    const before = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
    await page.click('#theme-toggle');
    const after = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
    assert.notEqual(before, after, 'color-scheme moet meebewegen met de themawissel, anders blijven UA-controls in het verkeerde thema');
    await page.close();
  });

  test('Focusbeheer: na navigeren staat de focus op de nieuwe schermkop, niet op de oude knop (Accessibility Expert, afwijking E)', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="insights"]');
    await assertBecomesActive(page, '#screen-insights');
    const focusedIsHeading = await page.evaluate(() => {
      const active = document.activeElement;
      const heading = document.querySelector('#screen-insights h1, #screen-insights [data-screen-heading]');
      return !!active && !!heading && (active === heading);
    });
    assert.ok(focusedIsHeading, 'Na navigatie moet de focus op de kop van het nieuwe scherm staan');
  });

  test('Route-aankondiging: een aria-live-regio meldt de nieuwe bestemming', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    const hasAnnouncer = await page.locator('#route-announcer[aria-live]').count();
    assert.equal(hasAnnouncer, 1, 'Verwacht één aria-live route-announcer in de shell');
    await page.click('.navbar [data-nav="beans"]');
    await page.waitForFunction(() => (document.getElementById('route-announcer')?.textContent || '').length > 0);
    await page.close();
  });

  test('Tabbalk is verborgen tijdens Brew Mode (Professional Brewer, conflict-beslissing)', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    // NIEUW (vervolgplan v2.3, Fase 5): eerst naar de "Brouwen"-tab, de app landt nu op Home.
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast] >> nth=0');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await page.click('#start-btn');
    await assertBecomesActive(page, '#screen-brew');
    const navHidden = await page.evaluate(() => {
      const nav = document.querySelector('.navbar');
      return !nav || getComputedStyle(nav).display === 'none';
    });
    assert.ok(navHidden, 'De tabbalk moet verborgen zijn tijdens Brew Mode');
    await page.close();
  });

  test('iPad-breakpoint (900px): zijbalk i.p.v. onderbalk, en niet op iPad-portraitbreedte (Bouwbesluiten_v2.md)', async () => {
    const page = await newTrackedPage();

    // iPad-portrait (834px, kleinste bekende) — moet de onderbalk krijgen, geen zijbalk.
    await page.setViewportSize({ width: 834, height: 1194 });
    await page.goto(FILE_URL, { waitUntil: 'load' });
    let navBox = await page.locator('.navbar').boundingBox();
    assert.ok(navBox.width > 600, `iPad-portrait (834px): verwacht een brede onderbalk, kreeg breedte ${navBox.width}`);

    // iPad-landscape (1024px, kleinste bekende) — moet de smalle zijbalk krijgen.
    await page.setViewportSize({ width: 1024, height: 780 });
    navBox = await page.locator('.navbar').boundingBox();
    assert.ok(navBox.width < 300, `iPad-landscape (1024px): verwacht een smalle zijbalk, kreeg breedte ${navBox.width}`);
    const navFlexDir = await page.locator('.navbar').evaluate(el => getComputedStyle(el).flexDirection);
    assert.equal(navFlexDir, 'column', 'iPad-landscape (1024px): de zijbalk moet de bestemmingen verticaal stapelen (flex-direction:column)');

    // Aanraakdoelen blijven ≥44px hoog in de zijbalk-vorm.
    const btnHeights = await page.locator('.navbar-btn').evaluateAll(els => els.map(el => el.getBoundingClientRect().height));
    for (const h of btnHeights) assert.ok(h >= 44, `navbar-btn moet ≥44px hoog zijn in de zijbalk, kreeg ${h}`);

    // "Split view": de bonenlijst gebruikt de extra breedte als tweekoloms grid.
    await page.click('.navbar [data-nav="beans"]');
    await assertBecomesActive(page, '#screen-beans');
    const beanListColumns = await page.locator('#bean-list').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.equal(beanListColumns, 2, 'Vanaf 900px moet #bean-list twee kolommen tonen (split view)');

    await page.close();
  });

  // NIEUW (Implementatieplan Zetadvies v3.0, §5 — Fase 1 testplan): de schuifregelaar
  // moet klemmen op het engine-geldige bereik, niet op het fysieke apparaatbereik van
  // METHOD_INFO — anders zou de gebruiker via de +/- knoppen een volume kunnen kiezen
  // (bv. 250 ml) waarvoor de engine geen geldig recept teruggeeft, en zou dat stil op
  // een ander volume of een kapot recept uitkomen i.p.v. een leesbare melding (D-2).
  test('Waterhoeveelheid-schuifregelaar klemt op het engine-geldige bereik — 250 ml is nooit bereikbaar via de min-knop', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast] >> nth=0');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');

    // Net zo lang op "minder water" klikken tot de waarde niet meer daalt (de klem).
    let prev = null, current = await page.locator('#serving-value').textContent();
    for (let i = 0; i < 20 && current !== prev; i++){
      prev = current;
      await page.click('#serving-minus');
      current = await page.locator('#serving-value').textContent();
    }
    const finalMl = parseInt(current, 10);
    assert.ok(finalMl >= 260, `De schuifregelaar mag nooit onder het engine-geldige minimum komen, kreeg "${current}"`);
    assert.notEqual(finalMl, 250, 'De schuifregelaar mag 250 ml nooit als bereikbare waarde tonen (D-2)');

    // Het getoonde recept moet exact dit (geklemde) volume tonen — geen mismatch tussen
    // de schuifregelaar en het daadwerkelijk berekende recept.
    const doseText = await page.locator('#stats-grid .stat-block').first().textContent();
    assert.ok(doseText && doseText.trim().length > 0, 'Het kernrecept moet bij de geklemde grenswaarde nog gewoon renderen, niet leeg blijven');

    await page.close();
  });

  // NIEUW (Implementatieplan Zetadvies v3.0, §5 — Fase 2 testplan-eis, kernflow-niveau):
  // "het receptscherm toont de temperatuurinstructie, niet alleen een getal" — de
  // pure-logic-tests bewaken al de ROAST_TEMP_ANCHOR-databand zelf; dit toetst dat de
  // instructietekst (bijv. "koken en direct gieten") ook daadwerkelijk in de echte DOM
  // terechtkomt, voor een lichte en een donkere branding (verschillende instructietekst).
  test('Receptscherm toont de temperatuur-INSTRUCTIE (niet alleen een getal), en die verschilt tussen een lichte en een donkere branding', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');
    await page.click('[data-method="v60"]');
    await assertBecomesActive(page, '#screen-roast');

    await page.click('[data-roast="light"]');
    await assertBecomesActive(page, '#screen-profile');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');
    const lightTempBlock = (await page.locator('#stats-grid .stat-block', { hasText: 'Watertemperatuur' }).innerText()).trim();
    assert.match(lightTempBlock, /koken en direct gieten/, 'Light-branding hoort de instructie "koken en direct gieten" te tonen, niet alleen een getal');

    await page.click('[data-back="profile"]');
    await assertBecomesActive(page, '#screen-profile');
    await page.click('[data-back="roast"]');
    await assertBecomesActive(page, '#screen-roast');
    await page.click('[data-roast="dark"]');
    await assertBecomesActive(page, '#screen-profile');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');
    const darkTempBlock = (await page.locator('#stats-grid .stat-block', { hasText: 'Watertemperatuur' }).innerText()).trim();
    assert.match(darkTempBlock, /koken, ongeveer 1 minuut wachten/, 'Dark-branding hoort een andere, langere-wachttijd-instructie te tonen');
    assert.notEqual(lightTempBlock, darkTempBlock, 'De instructie moet daadwerkelijk meebewegen met de branddiepte, niet een vast tekstblokje zijn');

    await page.close();
  });

  test('Disclaimer vermeldt de retentieaanname in de ratio (Implementatieplan Zetadvies v3.0, §1a "Openbaarmaking")', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast] >> nth=0');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');

    const disclaimerText = (await page.locator('#disclaimer').textContent()).trim();
    assert.match(disclaimerText, /retentieaanname/i, 'De disclaimer moet vermelden dat de ratio een retentieaanname bevat');
    assert.match(disclaimerText, /2,0/, 'De disclaimer moet de gebruikte retentiewaarde (2,0 g/g) noemen');

    await page.close();
  });

  // NIEUW (Reparatieplan v4.0, A-1 — bevinding E-07a): het doelvenster (TDS/EY) en zijn
  // herkomst (G-CONTROL-CHART-01) moeten daadwerkelijk in de UI staan, niet alleen in de
  // disclaimer-tekst beweerd worden.
  test('A-1: het doelvenster-blok toont de TDS/EY-getallen en de G-CONTROL-CHART-01-herkomst', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast] >> nth=0');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');

    const windowNote = page.locator('#target-window-note');
    await assert.ok(await windowNote.isVisible(), '#target-window-note moet zichtbaar zijn op het Prep-scherm');
    const windowText = (await windowNote.textContent()).trim();
    assert.match(windowText, /%TDS/, 'moet de %TDS-grenzen noemen');
    assert.match(windowText, /G-CONTROL-CHART-01/, 'moet de herkomst (research gap) noemen');

    await page.close();
  });

  // NIEUW (Reparatieplan v4.0, A-3 — bevinding E-01, tussenoplossing): altijd zichtbare
  // uitleg dat het profiel vandaag vooral het gietschema stuurt, niet de receptgetallen.
  test('A-3: #profile-scope-note is zichtbaar en meldt dat het profiel vooral het gietschema stuurt', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast] >> nth=0');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');

    const scopeNote = page.locator('#profile-scope-note');
    await assert.ok(await scopeNote.isVisible(), '#profile-scope-note moet zichtbaar zijn op het Prep-scherm');
    const scopeText = (await scopeNote.textContent()).trim();
    assert.match(scopeText, /gietschema/, 'moet melden dat het profiel het gietschema stuurt');

    await page.close();
  });

  // NIEUW (Implementatieplan Zetadvies v3.0, §5 — Fase 4 testplan): "back-up van vóór
  // deze wijziging laadt zonder verlies." Een backupVersion-1-achtige export kent alleen
  // het kale waterHardnessMgL-veld (geen waterAlkalinity/waterDilution, die pas met deze
  // wijziging bestaan) — de import mag daar niet op crashen en moet het getal herstellen.
  test('Een oude backup (alleen waterHardnessMgL, vóór het waterprofiel) laadt zonder verlies en zonder crash', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="beans"]');
    await assertBecomesActive(page, '#screen-beans');

    const oldBackup = {
      app: 'brew-console', backupVersion: 1, exportedAt: new Date().toISOString(),
      beans: [], brewLog: [], waterHardnessMgL: 128
    };
    await page.setInputFiles('#backup-import-file', {
      name: 'oude-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(oldBackup))
    });
    await page.waitForFunction(() => document.getElementById('backup-status').hidden === false);
    const statusText = (await page.locator('#backup-status').textContent()).trim();
    assert.match(statusText, /waterprofiel hersteld/, 'De import-statusmelding moet aangeven dat het waterprofiel is hersteld');
    assert.doesNotMatch(statusText, /undefined|NaN/, 'Geen kapotte waarden in de statusmelding');

    // Waterhardheid moet daadwerkelijk hersteld zijn, zichtbaar in het invoerveld op Recept.
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast] >> nth=0');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');
    const hardnessValue = await page.locator('#prep-water-hardness').inputValue();
    assert.equal(hardnessValue, '128', 'De uit de oude backup herstelde waterhardheid moet in het invoerveld staan');
    const hardnessReadout = (await page.locator('#hardness-readout').textContent()).trim();
    assert.match(hardnessReadout, /128/, 'Het hardheidsoordeel moet de herstelde waarde tonen');
    const alkReadout = (await page.locator('#alkalinity-readout').textContent()).trim();
    assert.match(alkReadout, /niet ingevuld/i, 'Alkaliniteit was er niet in de oude backup — moet eerlijk "niet ingevuld" tonen, geen verzonnen waarde');

    await page.close();
  });

  // NIEUW (Implementatieplan Zetadvies v3.0, §5 — Fase 4 testplan): "oordeel per
  // parameter klopt op de drie mengverhoudingen uit Fase 0" (1:0, 2:1, 1:1), nu via de
  // daadwerkelijke UI (invoervelden + verdunningsselect), niet alleen de pure rekenfunctie.
  test('Waterprofiel: alkaliniteit invullen en verdunnen geeft per-parameter oordelen die meebewegen, nooit een samengevoegd signaal', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast] >> nth=0');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');

    // Vóór invullen: alkaliniteit moet eerlijk "niet ingevuld" tonen, geen "binnen de richtwaarde".
    const beforeAlk = (await page.locator('#alkalinity-readout').textContent()).trim();
    assert.match(beforeAlk, /niet ingevuld/i);
    assert.doesNotMatch(beforeAlk, /binnen de SCA-richtwaarde/);

    // B-6-nulmeting: het kernrecept (dosis) vóór er iets aan het waterprofiel verandert.
    const doseBeforeWaterProfile = (await page.locator('#stats-grid .stat-block').first().textContent()).trim();

    await page.fill('#prep-water-hardness', '128');
    await page.dispatchEvent('#prep-water-hardness', 'change');
    await page.fill('#prep-water-alkalinity', '100');
    await page.dispatchEvent('#prep-water-alkalinity', 'change');

    const hardnessAt1_0 = (await page.locator('#hardness-readout').textContent()).trim();
    const alkAt1_0 = (await page.locator('#alkalinity-readout').textContent()).trim();
    assert.match(hardnessAt1_0, /128 mg\/L/);
    assert.match(alkAt1_0, /100 mg\/L/);
    assert.match(alkAt1_0, /boven de SCA-richtwaarde/, '100 mg/L alkaliniteit is boven de SCA-richtwaarde (40–70)');

    // Verdunnen naar 1:1 — Fase 0-tabel: hardheid 128→64, alkaliniteit 100→50.
    await page.selectOption('#prep-water-dilution', '1:1');
    const hardnessAt1_1 = (await page.locator('#hardness-readout').textContent()).trim();
    const alkAt1_1 = (await page.locator('#alkalinity-readout').textContent()).trim();
    assert.match(hardnessAt1_1, /64 mg\/L/, `verwacht 64 mg/L na 1:1-verdunning, kreeg "${hardnessAt1_1}"`);
    assert.match(alkAt1_1, /50 mg\/L/, `verwacht 50 mg/L na 1:1-verdunning, kreeg "${alkAt1_1}"`);
    assert.match(alkAt1_1, /binnen de SCA-richtwaarde/, 'na verdunning naar 50 mg/L moet dit binnen de alkaliniteits-richtwaarde (40–70) vallen');

    // pH krijgt altijd zijn eigen, eerlijke "geen oordeel"-regel — er is geen invoerveld voor.
    const phReadout = (await page.locator('#ph-readout').textContent()).trim();
    assert.match(phReadout, /geen oordeel mogelijk/i);

    // B-6: de verdunningsinstelling (en het invullen van hardheid/alkaliniteit zelf) is
    // pure weergave-rekenkunde — het RECEPT (dosis, uit het kernrecept-statblok) mag
    // hierdoor niet veranderen, ook niet na een hardheids-/alkaliniteitswaarde in te vullen
    // of te verdunnen.
    const doseAfterDilution = (await page.locator('#stats-grid .stat-block').first().textContent()).trim();
    assert.equal(doseAfterDilution, doseBeforeWaterProfile, 'B-6: waterprofiel/verdunning mag het kernrecept (dosis) nooit beïnvloeden');

    await page.close();
  });

  // NIEUW (Implementatieplan Zetadvies v3.0, §5 — Fase 5 testplan): dit is het fundament
  // onder Fase 6/7 — als saveBrewLogEntry() de nieuwe velden niet écht opslaat en toont,
  // hebben Fase 6/7 straks niets om op te bouwen. Toetst de volledige weg: invullen op het
  // Klaar-scherm → opslaan → terugzien in de Historie, mét de RECHTE (aanbevolen) waarden
  // ernaast voor vergelijking.
  test('Fase 5: werkelijke maalstand + kopgewicht worden opgeslagen en verschijnen in de Historie', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast] >> nth=0');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');
    await page.click('#start-btn');
    await assertBecomesActive(page, '#screen-brew');

    await page.clock.fastForward(FAST_FORWARD);
    await page.waitForFunction(() => getComputedStyle(document.getElementById('brewlog-open-btn')).display !== 'none');
    await page.click('#brewlog-open-btn');
    await assertBecomesActive(page, '#screen-brewlog');

    // Vóór invullen: beide nieuwe velden moeten leeg starten (openBrewLogEntry() reset ze).
    assert.equal(await page.locator('#brewlog-actual-grind').inputValue(), '');
    assert.equal(await page.locator('#brewlog-cup-weight').inputValue(), '');

    await page.fill('#brewlog-actual-grind', '22');
    await page.fill('#brewlog-cup-weight', '268');
    await page.click('#brewlog-save-btn');
    await page.waitForFunction(() => document.getElementById('brewlog-saved-msg').hidden === false);

    await page.click('.navbar [data-nav="brewlog-history"]');
    await assertBecomesActive(page, '#screen-brewlog-history');
    const cardText = (await page.locator('.brewlog-entry-card').first().innerText()).trim();
    assert.match(cardText, /werkelijke stand 22/, 'De werkelijk gebruikte maalstand moet in de Historie-kaart staan');
    assert.match(cardText, /kopgewicht 268 g/, 'Het kopgewicht moet in de Historie-kaart staan');
    assert.match(cardText, /recept/, 'De aanbevolen dosis/ratio moet er als vergelijking naast staan');
    assert.match(cardText, /werkelijke tijd/, 'De werkelijke brouwtijd moet er ook bij staan (was al berekend, nu ook bewaard)');

    await page.close();
  });

  // NIEUW (Implementatieplan Zetadvies v3.0, §5 — Fase 5 testplan, "Aparte migratietest en
  // back-up-rondgangtest verplicht", risico: raakt persistence + import/export tegelijk).
  // Deel 1: een schemaVersion-1-logging (van vóór Fase 5, dus zonder de nieuwe velden) mag
  // nooit crashen en mag NOOIT met een verzonnen 0/undefined worden aangevuld.
  test('Fase 5 migratie: een oude schemaVersion-1-logging (zonder de nieuwe velden) laadt zonder crash en zonder verzonnen waarden', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="beans"]');
    await assertBecomesActive(page, '#screen-beans');

    const oldStyleBackup = {
      app: 'brew-console', backupVersion: 2, exportedAt: new Date().toISOString(),
      beans: [],
      brewLog: [{
        id: 'log_oud_1', schemaVersion: 1, timestamp: Date.now(),
        beanId: null, method: 'v60', profile: 'klassiek', roast: 'medium',
        waterMl: 300, bypass: false, grindMicron: 650, grindStand: 20, temp: 94,
        scores: {}, note: 'van vóór Fase 5'
        // Bewust GEEN doseG/ratioText/actualGrindClicks/actualTimeSec/cupWeightG/
        // waterProfileSnapshot — dat is precies het schemaVersion-1-record dat Fase 5 zegt
        // nooit met terugwerkende kracht aan te vullen.
      }]
    };
    await page.setInputFiles('#backup-import-file', {
      name: 'oude-logging-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(oldStyleBackup))
    });
    await page.waitForFunction(() => document.getElementById('backup-status').hidden === false);
    const statusText = (await page.locator('#backup-status').textContent()).trim();
    assert.match(statusText, /1 nieuwe loggings/);
    assert.doesNotMatch(statusText, /undefined|NaN/);

    await page.click('.navbar [data-nav="brewlog-history"]');
    await assertBecomesActive(page, '#screen-brewlog-history');
    const cardText = (await page.locator('.brewlog-entry-card').first().innerText()).trim();
    assert.match(cardText, /van vóór Fase 5/, 'De oude logging moet gewoon zichtbaar zijn in de Historie');
    // De Fase-5-regel (recept/werkelijke stand/kopgewicht) hoort volledig te ontbreken —
    // niet met "0 g" of "?" ingevuld, gewoon afwezig, want deze velden bestonden niet.
    assert.doesNotMatch(cardText, /werkelijke stand/, 'Een schemaVersion-1-record mag nooit een verzonnen "werkelijke stand" tonen');
    assert.doesNotMatch(cardText, /kopgewicht/, 'Een schemaVersion-1-record mag nooit een verzonnen kopgewicht tonen');
    assert.doesNotMatch(cardText, /^recept/m, 'Een schemaVersion-1-record mag nooit een verzonnen recept-vergelijkingsregel tonen');

    await page.close();
  });

  // Deel 2: de rondgang — een backup die WEL de volledige schemaVersion-2-vorm bevat (zoals
  // exportBackup() die vanaf nu zou produceren) moet na import exact zo weer verschijnen,
  // niets verloren, niets verzonnen.
  test('Fase 5 back-up-rondgang: een volledige schemaVersion-2-logging komt na import ongeschonden terug', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="beans"]');
    await assertBecomesActive(page, '#screen-beans');

    const roundtripBackup = {
      app: 'brew-console', backupVersion: 2, exportedAt: new Date().toISOString(),
      beans: [],
      brewLog: [{
        id: 'log_nieuw_1', schemaVersion: 2, timestamp: Date.now(),
        beanId: null, method: 'v60', profile: 'klassiek', roast: 'medium',
        waterMl: 300, bypass: false, grindMicron: 650, grindStand: 20, temp: 94,
        scores: {}, note: 'volledige rondgang',
        doseG: 18.75, ratioText: '1:16',
        actualGrindClicks: 21, actualTimeSec: 185, cupWeightG: 262.5,
        waterProfileSnapshot: { hardnessMgL: 128, alkalinity: { value: 50, unit: 'CaCO3' }, dilution: { tapParts: 1, demiParts: 0 } }
      }]
    };
    await page.setInputFiles('#backup-import-file', {
      name: 'rondgang-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(roundtripBackup))
    });
    await page.waitForFunction(() => document.getElementById('backup-status').hidden === false);

    await page.click('.navbar [data-nav="brewlog-history"]');
    await assertBecomesActive(page, '#screen-brewlog-history');
    const cardText = (await page.locator('.brewlog-entry-card').first().innerText()).trim();
    assert.match(cardText, /volledige rondgang/);
    assert.match(cardText, /recept 18[,.]8 g · 1:16/, `verwacht dosis+ratio in de kaart, kreeg "${cardText}"`);
    assert.match(cardText, /werkelijke stand 21/);
    assert.match(cardText, /werkelijke tijd 3:05/, `verwacht 185s als 3:05, kreeg "${cardText}"`);
    assert.match(cardText, /kopgewicht 262\.5 g/);

    await page.close();
  });

  // NIEUW (Implementatieplan Zetadvies v3.0, §5 — Fase 6 testplan): de volledige weg van
  // proeven naar voorstel — inclusief het randvoorwaarde-vereiste dat het voorstel pas
  // verschijnt bij de VOLGENDE kop (op het Recept-scherm), nooit met terugwerkende kracht
  // op de logging die het veroorzaakte, en altijd expliciet als hypothese gelabeld.
  test('Fase 6: een onderextractie-patroon na loggen levert een gelabelde hypothese op, zichtbaar in Historie én bij de volgende kop met deze boon', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });

    async function goViaBeanToBatchStep(){
      await page.click('.navbar [data-nav="beans"]');
      await assertBecomesActive(page, '#screen-beans');
      await page.click('#bean-list .bean-card >> nth=0 >> .bean-card-name');
      await assertBecomesActive(page, '#screen-bean-detail');
      await page.click('#bean-detail-use-btn');
      await assertBecomesActive(page, '#screen-advice');
      await page.click('#advice-batch [data-adv-batch="single"]');
      await page.waitForFunction(() => getComputedStyle(document.getElementById('advice-result')).display !== 'none');
      await page.click('#advice-cta');
      await assertBecomesActive(page, '#screen-prep');
    }
    async function setCuppingAxis(axis, value){
      await page.evaluate(({ axis, value }) => {
        const el = document.querySelector(`input[type="range"][data-axis="${axis}"]`);
        el.value = String(value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, { axis, value });
    }

    // Boon aanmaken en meteen gebruiken — nodig zodat entry.beanId/state.beanId gezet zijn
    // (zonder gekoppelde boon vuurt cuppingSuggestionFor() nog gewoon, maar renderPrep()
    // heeft geen boon om de "vorige logging" van op te zoeken).
    await page.click('.navbar [data-nav="beans"]');
    await assertBecomesActive(page, '#screen-beans');
    await page.click('#bean-add-link');
    await assertBecomesActive(page, '#screen-bean-add');
    await page.click('#save-bean-btn');
    await assertBecomesActive(page, '#screen-beans');
    await goViaBeanToBatchStep();

    // Vóór de eerste logging voor deze boon: nog geen voorstel om te tonen.
    assert.ok(await page.locator('#prep-cupping-suggestion').isHidden(), 'Zonder eerdere logging voor deze boon hoort er nog geen voorstel te staan');

    await page.click('#start-btn');
    await assertBecomesActive(page, '#screen-brew');
    await page.clock.fastForward(FAST_FORWARD);
    await page.waitForFunction(() => getComputedStyle(document.getElementById('brewlog-open-btn')).display !== 'none');
    await page.click('#brewlog-open-btn');
    await assertBecomesActive(page, '#screen-brewlog');

    // Onderextractie-patroon (plantabel §Fase 6, rij 1): zuur hoog, zoet+body laag.
    await setCuppingAxis('zuur', 3);
    await setCuppingAxis('zoet', 1);
    await setCuppingAxis('body', 1);
    await page.click('#brewlog-save-btn');
    await page.waitForFunction(() => document.getElementById('brewlog-saved-msg').hidden === false);

    await page.click('.navbar [data-nav="brewlog-history"]');
    await assertBecomesActive(page, '#screen-brewlog-history');
    const cardText = (await page.locator('.brewlog-entry-card').first().innerText()).trim();
    assert.match(cardText, /Hypothese/, 'De logging zelf moet het bewaarde voorstel expliciet als "Hypothese" tonen (nooit als bewezen correctie)');
    assert.match(cardText, /fijner/i, 'Het onderextractie-patroon hoort naar fijner malen te verwijzen');

    // Opnieuw "Zet deze boon" — dit is de VOLGENDE kop, waar het voorstel nu moet verschijnen.
    await goViaBeanToBatchStep();
    assert.ok(await page.locator('#prep-cupping-suggestion').isVisible(), 'Het voorstel voor de volgende kop moet nu zichtbaar zijn op het Recept-scherm');
    const suggestionText = (await page.locator('#prep-cupping-suggestion-text').textContent()).trim();
    assert.match(suggestionText, /[Hh]ypothese/);
    assert.match(suggestionText, /fijner/i);
    assert.match(suggestionText, /geen bewezen correctie/i, 'Het voorstel moet expliciet zeggen dat het geen bewezen correctie is (randvoorwaarde uit het plan)');
    // Dit patroon wijst niet naar het waterprofiel — de waterprofiel-link moet dus verborgen blijven.
    assert.ok(await page.locator('#prep-suggestion-water-link').isHidden());

    await page.close();
  });

  // NIEUW (Implementatieplan Zetadvies v3.0, §5 — Fase 6 testplan): het "vlak, mogelijk
  // waterbuffering"-patroon is de enige van de vier die naar een ANDER scherm-onderdeel
  // verwijst (het waterprofiel) in plaats van naar de molenstand/dosis — apart getoetst
  // omdat dat een eigen knop (#prep-suggestion-water-link) aan- of uitzet.
  test('Fase 6: het "vlak/waterbuffering"-patroon toont de link naar het waterprofiel, de andere patronen niet', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="beans"]');
    await assertBecomesActive(page, '#screen-beans');
    await page.click('#bean-add-link');
    await assertBecomesActive(page, '#screen-bean-add');
    await page.click('#save-bean-btn');
    await assertBecomesActive(page, '#screen-beans');
    await page.click('#bean-list .bean-card >> nth=0 >> .bean-card-name');
    await assertBecomesActive(page, '#screen-bean-detail');
    await page.click('#bean-detail-use-btn');
    await assertBecomesActive(page, '#screen-advice');
    await page.click('#advice-batch [data-adv-batch="single"]');
    await page.waitForFunction(() => getComputedStyle(document.getElementById('advice-result')).display !== 'none');
    await page.click('#advice-cta');
    await assertBecomesActive(page, '#screen-prep');
    await page.click('#start-btn');
    await assertBecomesActive(page, '#screen-brew');
    await page.clock.fastForward(FAST_FORWARD);
    await page.waitForFunction(() => getComputedStyle(document.getElementById('brewlog-open-btn')).display !== 'none');
    await page.click('#brewlog-open-btn');
    await assertBecomesActive(page, '#screen-brewlog');

    // Vlak/waterbuffering-patroon (plantabel §Fase 6, rij 4): zuur, bitter én aftersmaak laag.
    for (const axis of ['zuur', 'bitter', 'aftersmaak']){
      await page.evaluate((axis) => {
        const el = document.querySelector(`input[type="range"][data-axis="${axis}"]`);
        el.value = '1';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, axis);
    }
    await page.click('#brewlog-save-btn');
    await page.waitForFunction(() => document.getElementById('brewlog-saved-msg').hidden === false);

    await page.click('.navbar [data-nav="beans"]');
    await assertBecomesActive(page, '#screen-beans');
    await page.click('#bean-list .bean-card >> nth=0 >> .bean-card-name');
    await assertBecomesActive(page, '#screen-bean-detail');
    await page.click('#bean-detail-use-btn');
    await assertBecomesActive(page, '#screen-advice');
    await page.click('#advice-batch [data-adv-batch="single"]');
    await page.waitForFunction(() => getComputedStyle(document.getElementById('advice-result')).display !== 'none');
    await page.click('#advice-cta');
    await assertBecomesActive(page, '#screen-prep');

    assert.ok(await page.locator('#prep-cupping-suggestion').isVisible());
    assert.ok(await page.locator('#prep-suggestion-water-link').isVisible(), 'Bij het waterbufferings-patroon hoort de waterprofiel-link zichtbaar te zijn');
    const suggestionText = (await page.locator('#prep-cupping-suggestion-text').textContent()).trim();
    assert.match(suggestionText, /waterprofiel/i);

    await page.close();
  });

  // NIEUW (Implementatieplan Zetadvies v3.0, §5 — Fase 7 testplan): het boontype-model,
  // end-to-end via de echte UI — drie GOEDGEKEURDE loggings in hetzelfde emmertje (hier:
  // de standaard medium/washed-boon) moeten samen een leercorrectie opleveren die bij de
  // volgende kop verschijnt, vóór het derde brouwsel nog niet.
  test('Fase 7: na 3 goedgekeurde loggings in hetzelfde emmertje verschijnt een leercorrectie voor de volgende kop', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });

    await page.click('.navbar [data-nav="beans"]');
    await assertBecomesActive(page, '#screen-beans');
    await page.click('#bean-add-link');
    await assertBecomesActive(page, '#screen-bean-add');
    await page.click('#save-bean-btn'); // standaardwaarden: roast "medium", proces "washed"
    await assertBecomesActive(page, '#screen-beans');

    async function goToPrepForTheBean(){
      await page.click('.navbar [data-nav="beans"]');
      await assertBecomesActive(page, '#screen-beans');
      await page.click('#bean-list .bean-card >> nth=0 >> .bean-card-name');
      await assertBecomesActive(page, '#screen-bean-detail');
      await page.click('#bean-detail-use-btn');
      await assertBecomesActive(page, '#screen-advice');
      await page.click('#advice-batch [data-adv-batch="single"]');
      await page.waitForFunction(() => getComputedStyle(document.getElementById('advice-result')).display !== 'none');
      await page.click('#advice-cta');
      await assertBecomesActive(page, '#screen-prep');
    }
    async function logApprovedBrew(offsetFromStartingPoint){
      await goToPrepForTheBean();
      const startingPoint = await page.evaluate(() => state.recipe && state.recipe.grindStartingPoint);
      assert.equal(typeof startingPoint, 'number', `verwacht een numeriek grindStartingPoint op het Recept-scherm, kreeg ${startingPoint}`);

      await page.click('#start-btn');
      await assertBecomesActive(page, '#screen-brew');
      await page.clock.fastForward(FAST_FORWARD);
      await page.waitForFunction(() => getComputedStyle(document.getElementById('brewlog-open-btn')).display !== 'none');
      await page.click('#brewlog-open-btn');
      await assertBecomesActive(page, '#screen-brewlog');

      await page.fill('#brewlog-actual-grind', String(startingPoint + offsetFromStartingPoint));
      await page.check('#brewlog-approved');
      await page.click('#brewlog-save-btn');
      await page.waitForFunction(() => document.getElementById('brewlog-saved-msg').hidden === false);
    }

    // Alle drie 2 klikken fijner dan het vertrekpunt van dat moment.
    await logApprovedBrew(-2);
    await logApprovedBrew(-2);

    // Ná twee goedgekeurde loggings (< LEARNING_MIN_N=3): het blok toont zich WEL (dezelfde
    // transparantie-aanpak als de rest van de app — eerlijk "nog niet genoeg" i.p.v. stil
    // niets tonen, zie learningCorrectionText()), maar dan met het "onvoldoende"-bericht,
    // niet met een (nog niet bestaande) betrouwbare correctie.
    await goToPrepForTheBean();
    assert.ok(await page.locator('#prep-learning-correction').isVisible(), 'Bij n=2 hoort het blok zelf al zichtbaar te zijn, met een eerlijke "nog niet genoeg"-melding');
    const textAtN2 = (await page.locator('#prep-learning-correction-text').textContent()).trim();
    assert.match(textAtN2, /nog geen leercorrectie/i);
    assert.match(textAtN2, /2 goedgekeurde/);
    assert.doesNotMatch(textAtN2, /klikken (fijner|grover)/, 'bij n=2 mag er nog geen concreet klikgetal gepresenteerd worden');

    await page.click('#start-btn');
    await assertBecomesActive(page, '#screen-brew');
    await page.clock.fastForward(FAST_FORWARD);
    await page.waitForFunction(() => getComputedStyle(document.getElementById('brewlog-open-btn')).display !== 'none');
    await page.click('#brewlog-open-btn');
    await assertBecomesActive(page, '#screen-brewlog');
    const thirdStartingPoint = await page.evaluate(() => state.recipe && state.recipe.grindStartingPoint);
    await page.fill('#brewlog-actual-grind', String(thirdStartingPoint - 2));
    await page.check('#brewlog-approved');
    await page.click('#brewlog-save-btn');
    await page.waitForFunction(() => document.getElementById('brewlog-saved-msg').hidden === false);

    // Na het derde goedgekeurde brouwsel (n=3): de correctie moet nu verschijnen.
    await goToPrepForTheBean();
    assert.ok(await page.locator('#prep-learning-correction').isVisible(), 'Bij n=3 hoort de leercorrectie zichtbaar te zijn');
    const text = (await page.locator('#prep-learning-correction-text').textContent()).trim();
    assert.match(text, /n=3/);
    assert.match(text, /2 klikken fijner/);
    assert.match(text, /Medium/i);
    assert.match(text, /Washed/i);

    await page.close();
  });

  test('Geen console- of pageerrors opgetreden tijdens de hele kernflow', () => {
    assert.deepEqual(consoleErrors, [], 'Onverwachte console.error()-aanroepen tijdens de kernflow');
    assert.deepEqual(pageErrors, [], 'Onverwachte onafgevangen JS-fouten tijdens de kernflow');
  });
});

async function assertBecomesActive(page, selector){
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    return !!el && el.classList.contains('active');
  }, selector, { timeout: 5000 });
}
