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

  async function newTrackedPage(opts){
    const page = await browser.newPage(opts);
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });
    await page.clock.install({ time: Date.now() });
    return page;
  }

  // Sprint 4 (UX-review): de proefkaart toont één vraag per stap. Beantwoorden gaat via de
  // stap-stippen (zo maakt het niet uit waar de stepper na een automatische "door" staat).
  async function answerTasting(page, a){
    for (const q of ['strength', 'acidity', 'finish', 'liking', 'goalHit', 'vsLast']){
      if (a[q] == null) continue;
      await page.click(`[data-t-step="${q}"]`);
      for (const v of [].concat(a[q])) await page.click(`[data-t-q="${q}"][data-t-v="${v}"]`);
    }
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
    // NIEUW (Visual Design 2.0 fase 2): #brewlog-complete-meta toont sinds de celebratory-
    // restyling drie losse statchips (tijd/water/temperatuur) i.p.v. één platte mono-regel
    // met dosis+methode — dosis staat nog steeds elders op dit scherm (in
    // #brewlog-honest-summary). Alleen de tekst hieronder aangepast, de assertie zelf
    // (niet-leeg) ongewijzigd.
    assert.ok(metaText.length > 0, 'brewlog-complete-meta (tijd · water · temperatuur, als statchips) mag niet leeg zijn');

    // B2: de samenvatting staat ONDER de proefvragen, niet erboven (anchoring-risico).
    // BIJGEWERKT (Fase 3): de zes schuifregelaars zijn de proefkaart (#tasting-card) geworden.
    const order = await page.evaluate(() => {
      const summary = document.getElementById('brewlog-honest-summary');
      const card = document.getElementById('tasting-card');
      if (!summary || !card) return null;
      const pos = summary.compareDocumentPosition(card);
      return (pos & Node.DOCUMENT_POSITION_FOLLOWING) ? 'summary-first' : 'card-first';
    });
    assert.equal(order, 'card-first', 'B2: de proefkaart moet vóór de eerlijke samenvatting staan, niet erna');

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
    const destinations = ['home', 'beans', 'method', 'settings', 'brewlog-history'];
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
    // NIEUW (Visual Design 2.0 fase 2): Inzichten is vervangen door het Instellingen-
    // scherm in de navbar (Inzichten leeft nu voort als "Statistieken"-tab op Geschiedenis) —
    // dezelfde focusbeheer-assertie, alleen retarget naar het nieuwe scherm.
    await page.click('.navbar [data-nav="settings"]');
    await assertBecomesActive(page, '#screen-settings');
    const focusedIsHeading = await page.evaluate(() => {
      const active = document.activeElement;
      const heading = document.querySelector('#screen-settings h1, #screen-settings [data-screen-heading]');
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

  // NIEUW (Implementatieplan v3.0 / Timemore C3S Pro — Technische Deep-Dive, §22): de
  // C3S Pro-grinderblok moet de nieuwe 15-17 starting range en 13-18 practical range apart
  // tonen, de mechanische 83,3 µm/click-specificatie expliciet als "géén particle-size"
  // labelen, en de oude "onopgeloste tegenstrijdigheid"-tekst (83 vs. 50 µm) mag niet meer
  // verschijnen — dat is nu een gearchiveerde, niet-gelijkwaardige historische claim.
  test('C3S Pro-grinderblok: 15-17 startgebied, 13-18 practical range, mechanische resolutie zonder fake particle-size', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast] >> nth=0');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');

    // FIX (visuele afstemming referentiebeeld): de langere kalibratie-/range-toelichtingen
    // staan sinds de Maalgraad-compactheidsslag achter een lokale "Meer over deze
    // maalstand"-toggle (innerText() sluit verborgen tekst uit, anders dan textContent()).
    await page.click('#grind-more-toggle');

    const grindBlockText = (await page.locator('#stats-grid .stat-block', { hasText: 'Maalgraad' }).innerText()).trim();
    assert.match(grindBlockText, /klik 15–17/, 'moet het nieuwe 15-17 startgebied tonen');
    assert.match(grindBlockText, /Practical V60 range: klik 13–18/, 'moet de aparte, bredere practical range tonen');
    assert.match(grindBlockText, /83,3 µm mechanische verstelling per click/, 'moet de gesourcete mechanische specificatie tonen');
    assert.match(grindBlockText, /géén particle-size-\/deeltjesgrootte-meting/, 'moet expliciet ontkennen dat dit een particle-size-meting is');
    assert.doesNotMatch(grindBlockText, /onopgeloste tegenstrijdigheid/, 'de oude 83-vs-50-µm-tegenspraaktekst mag niet meer verschijnen — 83,3 µm is nu SOURCED, niet CONTESTED');

    await page.close();
  });

  // FIX (Implementatieplan Bypass v1.0, Fase A, BP-9, besloten): op een methode waarvoor de
  // concentraat-methode geen gevalideerde basis heeft (Chemex) werd de knop eerder
  // uitgeschakeld getoond; nu wordt het hele blok verborgen (minder uitleg nodig voor iets
  // dat toch niet kan) — de eigenlijke garantie tegen stille toepassing blijft de
  // bypassMethodSupported-guard in computeRecipe(). Op V60 is bypass sinds Fase C een
  // percentagekeuze (Uit/20%/30%/40%) i.p.v. één aan/uit-knop.
  test('Bypass method guard: op Chemex is het concentraat-blok verborgen, op V60 werkt de percentagekeuze', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');
    await page.click('[data-method="chemex"]');
    await page.click('#roast-grid [data-roast] >> nth=0');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');

    const chemexHidden = await page.evaluate(() => document.getElementById('bypass-advice-block').hidden);
    assert.equal(chemexHidden, true, 'op Chemex moet het hele concentraat/bypass-blok verborgen zijn (BP-9)');

    await page.click('[data-back="profile"]');
    await assertBecomesActive(page, '#screen-profile');
    await page.click('[data-back="roast"]');
    await assertBecomesActive(page, '#screen-roast');
    await page.click('#screen-roast [data-back="method"]');
    await assertBecomesActive(page, '#screen-method');
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast] >> nth=0');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');

    const v60Hidden = await page.evaluate(() => document.getElementById('bypass-advice-block').hidden);
    assert.equal(v60Hidden, false, 'op V60 moet het concentraat/bypass-blok zichtbaar zijn');

    // Zit in de collapsed "Verfijn dit recept"-accordion — expliciet openen vóór klikken,
    // zelfde patroon als elders in dit bestand (native <details> vereist actionability).
    await page.evaluate(() => { document.getElementById('refine-details').open = true; });
    await page.click('[data-bypass-pct="30"]');
    const selected = await page.evaluate(() => document.querySelector('[data-bypass-pct="30"]').getAttribute('data-selected'));
    assert.equal(selected, 'true', 'na klikken op 30% moet die chip geselecteerd zijn');
    const bypassMlText = (await page.locator('#stats-grid').textContent());
    assert.match(bypassMlText, /Toevoegen na het zetten/, 'stats-grid moet de bypass-kaart tonen zodra bypass actief is');

    await page.close();
  });

  // NIEUW (Implementatieplan Bypass v1.0, Fase B/C — testplan §"Smoke: chipkeuze → stat-
  // blok en Brew Mode-stap lopen mee; logging bewaart het gekozen percentage"): volledige
  // rondgang met 40% bypass — percentagekeuze, proef-en-vul-instructie in Brew Mode, de
  // brouwratio-regel op het Klaar-scherm, en de nieuwe logvelden na opslaan.
  test('Bypass volledige rondgang (40%): stat-blok, Brew Mode "proef-en-vul", Klaar-scherm brouwratio, en de nieuwe logvelden worden bewaard', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast] >> nth=0');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');

    await page.evaluate(() => { document.getElementById('refine-details').open = true; });
    await page.click('[data-bypass-pct="40"]');
    const recAfterPick = await page.evaluate(() => ({ pourWaterMl: state.recipe.pourWaterMl, bypassMl: state.recipe.bypassMl, dose: state.recipe.dose }));
    assert.equal(recAfterPick.pourWaterMl, 180, '40% bypass op 300 ml: 60% door het bed');
    assert.equal(recAfterPick.bypassMl, 120);

    // Standaard staat het moment op "achteraf" — Brew Mode moet de proef-en-vul-instructie
    // tonen, niet de oude dubbelzinnige "aanvullen tot X g totaal".
    await page.click('#start-btn');
    await assertBecomesActive(page, '#screen-brew');
    // Zit in de collapsed "Volledig schema"-accordion (focus-herontwerp) — expliciet
    // openen vóór lezen, zelfde patroon als refine-details hierboven.
    await page.evaluate(() => { document.getElementById('brew-steps-details').open = true; });
    const bypassStepText = (await page.locator('.brew-step-bypass').innerText()).trim();
    assert.match(bypassStepText, /Proef-en-vul/, 'moet de proef-en-vul-instructie tonen');
    assert.match(bypassStepText, /tarreer/, 'moet expliciet instrueren te tarreren (BP-6: dubbelzinnigheid weg)');
    assert.doesNotMatch(bypassStepText, /aanvullen tot \d+ g totaal/, 'de oude dubbelzinnige formulering mag niet meer voorkomen');

    await page.clock.fastForward(FAST_FORWARD);
    await page.waitForFunction(() => getComputedStyle(document.getElementById('brewlog-open-btn')).display !== 'none');
    await page.click('#brewlog-open-btn');
    await assertBecomesActive(page, '#screen-brewlog');

    // Klaar-scherm: de honest-summary moet de brouwratio (los van de kernrecept-ratio) tonen.
    const summaryText = (await page.locator('#brewlog-honest-summary').textContent() /* Sprint 4: staat onder "Meer meten" (dicht) */).trim();
    assert.match(summaryText, /Door het bed: 180 g \(brouwratio 1:/, 'moet de werkelijke brewer-ratio bij bypass tonen (BP-5 punt 5)');

    // Het bypass-actual-veld moet zichtbaar en voorgevuld zijn met het geplande bedrag.
    const actualVisible = await page.evaluate(() => !document.getElementById('brewlog-bypass-actual-block').hidden);
    assert.equal(actualVisible, true);
    assert.equal(await page.locator('#brewlog-bypass-actual').inputValue(), '120');
    await page.fill('#brewlog-bypass-actual', '115'); // simuleert "iets minder toegevoegd dan gepland"

    await page.click('#brewlog-save-btn');
    await page.waitForFunction(() => document.getElementById('brewlog-saved-msg').hidden === false);

    const savedEntry = await page.evaluate(() => brewLog[brewLog.length - 1]);
    assert.equal(savedEntry.bypass, true);
    assert.equal(savedEntry.bypassPct, 40);
    assert.equal(savedEntry.pourWaterG, 180);
    assert.equal(savedEntry.bypassPlannedG, 120);
    assert.equal(savedEntry.bypassActualG, 115, 'het aangepaste, werkelijk ingevulde bedrag moet bewaard worden, niet het geplande');
    assert.equal(savedEntry.bypassMoment, 'achteraf');
    // BIJGEWERKT (Fase 1): nieuwe loggings zijn v6-records (brewLog is er de platte weergave van).
    assert.equal(savedEntry.schemaVersion, 6);

    await page.close();
  });

  // NIEUW (Implementatieplan Zetadvies v3.0, §5 — Fase 1 testplan): de schuifregelaar
  // moet klemmen op het engine-geldige bereik, niet op het fysieke apparaatbereik van
  // METHOD_INFO — anders zou de gebruiker via de +/- knoppen een volume kunnen kiezen
  // (bv. 250 ml) waarvoor de engine geen geldig recept teruggeeft, en zou dat stil op
  // een ander volume of een kapot recept uitkomen i.p.v. een leesbare melding (D-2).
  // BIJGEWERKT (D2-1): het engine-geldige V60-minimum is nu 240 ml (15 g × ratiorand van het
  // doelvenster); 250 ml is sindsdien een geldig recept. De klem-eis zelf blijft: nooit onder
  // wat de engine accepteert, en het recept op de grens rendert gewoon.
  test('Waterhoeveelheid-schuifregelaar klemt op het engine-geldige bereik (240 ml voor V60/klassiek)', async () => {
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
    const engineMin = await page.evaluate(() => engineValidVolumeRange('v60', 'klassiek').min);
    assert.equal(engineMin, 240);
    assert.equal(finalMl, engineMin, `De schuifregelaar moet precies op het engine-geldige minimum stoppen, kreeg "${current}"`);
    assert.match(await page.locator('#stats-grid .stat-block').first().innerText(), /15,0 g[\s\S]*ondergrens van dit toestel/);

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
  // herkomst (openstaande onderzoeksvraag) moeten daadwerkelijk in de UI staan, niet alleen in de
  // disclaimer-tekst beweerd worden. Audit BC-12: in gewone woorden, zonder de interne gap-code.
  test('A-1: het doelvenster-blok toont de TDS/EY-getallen en de herkomst (openstaande onderzoeksvraag)', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="method"]');
    await assertBecomesActive(page, '#screen-method');
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast] >> nth=0');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');

    // Audit BC-12: de onderbouwing staat achter "Waarom deze getallen?" — zichtbaar na één tik.
    await page.click('#why-details summary');
    const windowNote = page.locator('#target-window-note');
    await assert.ok(await windowNote.isVisible(), '#target-window-note moet zichtbaar zijn op het Prep-scherm');
    const windowText = (await windowNote.textContent()).trim();
    assert.match(windowText, /%TDS/, 'moet de %TDS-grenzen noemen');
    assert.match(windowText, /openstaande onderzoeksvraag/, 'moet de herkomst (research gap) noemen');
    assert.match(windowText, /productaanname/, 'moet zeggen dat het een productaanname is');
    assert.doesNotMatch(windowText, /G-CONTROL-CHART|APP_ASSUMED/, 'geen interne codes in de UI');

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

    await page.click('#why-details summary'); // Audit BC-12: op verzoek, één tik
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

    // Waterhardheid moet daadwerkelijk hersteld zijn, zichtbaar in het invoerveld (audit
    // BC-24: het waterprofiel staat in Instellingen).
    await page.click('.navbar [data-nav="settings"]');
    await assertBecomesActive(page, '#screen-settings');
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

    // Audit BC-24: het waterprofiel staat in Instellingen; het receptscherm toont alleen een samenvatting.
    assert.match(await page.locator('#prep-water-summary').textContent(), /Niet ingesteld/);

    // Vóór invullen: alkaliniteit moet eerlijk "niet ingevuld" tonen, geen "binnen de richtwaarde".
    const beforeAlk = (await page.locator('#alkalinity-readout').textContent()).trim();
    assert.match(beforeAlk, /niet ingevuld/i);
    assert.doesNotMatch(beforeAlk, /binnen de SCA-richtwaarde/);

    // B-6-nulmeting: het kernrecept (dosis) vóór er iets aan het waterprofiel verandert.
    const doseBeforeWaterProfile = (await page.locator('#stats-grid .stat-block').first().textContent()).trim();

    await page.click('.navbar [data-nav="settings"]');
    await assertBecomesActive(page, '#screen-settings');
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
    assert.match(await page.locator('#prep-water-summary').textContent(), /hardheid 64 · alkaliniteit 50 mg\/L CaCO3 \(effectief na verdunning 1:1\)/);

    // Preset: SCA-richtwaarde vult beide velden in; Wissen maakt ze weer leeg.
    await page.click('[data-water-preset="sca"]');
    assert.equal(await page.locator('#prep-water-hardness').inputValue(), '68');
    assert.equal(await page.locator('#prep-water-alkalinity').inputValue(), '40');
    assert.match((await page.locator('#alkalinity-readout').textContent()), /binnen de SCA-richtwaarde/);
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('brewconsole_water_hardness'))).hardnessMgL, 68, 'preset wordt onthouden');
    await page.click('[data-water-preset="clear"]');
    assert.equal(await page.locator('#prep-water-hardness').inputValue(), '');
    assert.equal(await page.evaluate(() => localStorage.getItem('brewconsole_water_hardness')), null);

    // De link op het receptscherm brengt je naar het waterprofiel in Instellingen.
    await page.evaluate(() => showScreen('prep'));
    await page.evaluate(() => { document.getElementById('refine-details').open = true; });
    await page.click('#prep-water-settings-link');
    await assertBecomesActive(page, '#screen-settings');

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

    // BIJGEWERKT (Fase 3): de werkelijke maalstand staat nu achter de actuals-chip
    // ("Gezet zoals gepland?" → "Anders…"), voorgevuld met het plan. Kopgewicht start leeg.
    assert.equal(await page.locator('#actuals-edit').isVisible(), false, 'zonder "Anders…" geen invoervelden');
    assert.equal(await page.locator('#brewlog-cup-weight').inputValue(), '');
    await page.click('#actuals-edit-btn');
    const planned = await page.evaluate(() => String(state.recipe.grindStartingPoint));
    assert.equal(await page.locator('#brewlog-actual-grind').inputValue(), planned, 'voorgevuld met het plan: alleen aanpassen wat anders was');

    await page.fill('#brewlog-actual-grind', '22');
    await page.click('#brewlog-more > summary'); // Sprint 4: kopgewicht staat onder "Meer meten"
    await page.fill('#brewlog-cup-weight', '268');
    await page.click('#brewlog-save-btn');
    await page.waitForFunction(() => document.getElementById('brewlog-saved-msg').hidden === false);

    await page.click('.navbar [data-nav="brewlog-history"]');
    await assertBecomesActive(page, '#screen-brewlog-history');
    const cardText = (await page.locator('.brewlog-entry-card').first().innerText()).trim();
    assert.match(cardText, /werkelijke stand 22/, 'De werkelijk gebruikte maalstand moet in de Historie-kaart staan');
    assert.match(cardText, /kopgewicht 268 g/, 'Het kopgewicht moet in de Historie-kaart staan');
    assert.match(cardText, /recept/, 'De aanbevolen dosis/ratio moet er als vergelijking naast staan');
    // BIJGEWERKT (Fase 1): de timer stopt op het schema-einde, dus dit was nooit een gemeten
    // brouwtijd. De kaart toont hem nu eerlijk als schema-tijd; een echte meting komt in Fase 2.
    assert.match(cardText, /schema-tijd \d+:\d{2} \(niet gemeten\)/, 'De schema-tijd moet er eerlijk gelabeld bij staan');
    assert.doesNotMatch(cardText, /werkelijke tijd/, 'De schema-tijd mag nooit als werkelijke tijd getoond worden');

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
    // BIJGEWERKT (Fase 1): de oude actualTimeSec (185 s) blijft bewaard, maar heet nu schema-tijd.
    assert.match(cardText, /schema-tijd 3:05 \(niet gemeten\)/, `verwacht 185s als schema-tijd 3:05, kreeg "${cardText}"`);
    assert.match(cardText, /kopgewicht 262\.5 g/);

    await page.close();
  });

  // NIEUW (Reparatieplan v4.0, C-2 / bevinding E-11 — verplicht, N-3/N-4): een back-up van
  // schemaVersion 1, 2 ÉN 3 (allemaal van vóór beanSnapshot bestond) moet zonder verlies
  // laden — additief, geen migratie, geen verzonnen velden.
  test('C-2 migratie: schemaVersion 1, 2 én 3 laden allemaal zonder verlies en zonder beanSnapshot te verzinnen', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="beans"]');
    await assertBecomesActive(page, '#screen-beans');

    const mixedBackup = {
      app: 'brew-console', backupVersion: 2, exportedAt: new Date().toISOString(),
      beans: [],
      brewLog: [
        { id: 'log_v1', schemaVersion: 1, timestamp: Date.now(),
          beanId: null, method: 'v60', profile: 'klassiek', roast: 'medium',
          waterMl: 300, bypass: false, grindMicron: 650, grindStand: 20, temp: 94,
          scores: {}, note: 'schemaVersion 1' },
        { id: 'log_v2', schemaVersion: 2, timestamp: Date.now(),
          beanId: null, method: 'v60', profile: 'klassiek', roast: 'medium',
          waterMl: 300, bypass: false, grindMicron: 650, grindStand: 20, temp: 94,
          scores: {}, note: 'schemaVersion 2', doseG: 17, ratioText: '1:17,6',
          actualGrindClicks: 18, actualTimeSec: 190, cupWeightG: 260,
          waterProfileSnapshot: { hardnessMgL: 100, alkalinity: { value: 40, unit: 'CaCO3' }, dilution: { tapParts: 1, demiParts: 0 } } },
        { id: 'log_v3', schemaVersion: 3, timestamp: Date.now(),
          beanId: null, method: 'v60', profile: 'klassiek', roast: 'medium',
          waterMl: 300, bypass: false, grindMicron: 650, grindStand: 20, temp: 94,
          scores: {}, note: 'schemaVersion 3', doseG: 17, ratioText: '1:17,6',
          actualGrindClicks: 18, actualTimeSec: 190, cupWeightG: 260, approved: true, grindStartingPoint: 14,
          waterProfileSnapshot: { hardnessMgL: 100, alkalinity: { value: 40, unit: 'CaCO3' }, dilution: { tapParts: 1, demiParts: 0 } } }
        // Bewust GEEN beanSnapshot op geen van de drie — dat veld bestaat pas sinds C-2
        // (schemaVersion 4) en mag hier niet met terugwerkende kracht verzonnen worden.
      ]
    };
    await page.setInputFiles('#backup-import-file', {
      name: 'c2-migratie-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(mixedBackup))
    });
    await page.waitForFunction(() => document.getElementById('backup-status').hidden === false);
    const statusText = (await page.locator('#backup-status').textContent()).trim();
    assert.match(statusText, /3 nieuwe loggings/);
    assert.doesNotMatch(statusText, /undefined|NaN/);

    await page.click('.navbar [data-nav="brewlog-history"]');
    await assertBecomesActive(page, '#screen-brewlog-history');
    const historyText = (await page.locator('#brewlog-history-list').innerText()).trim();
    assert.match(historyText, /schemaVersion 1/);
    assert.match(historyText, /schemaVersion 2/);
    assert.match(historyText, /schemaVersion 3/);
    assert.doesNotMatch(historyText, /undefined|NaN/);

    await page.close();
  });

  // NIEUW (Reparatieplan v4.0, C-2 — verplicht): een schemaVersion-3-record zonder
  // beanSnapshot (van vóór C-2) moet nog steeds precies dezelfde leercorrectie opleveren
  // als vóór deze wijziging — de live-boonopzoeking-terugval moet het gedrag op bestaande
  // data volledig onveranderd laten.
  test('C-2: een schemaVersion-3-record zonder beanSnapshot levert nog steeds dezelfde leercorrectie op (live terugval)', async () => {
    const page = await newTrackedPage();
    // Leren telt alleen binnen hetzelfde bekende waterprofiel (B-7) — zonder waterprofiel kan
    // deze test niets bewijzen. Tot de BC-12-herindeling slaagde hij alleen doordat "exacte"
    // toevallig in de Kasuya-uitleg stond; hij controleert nu de leercorrectie zelf.
    const WATER = { hardnessMgL: 120, alkalinity: { value: 40, unit: 'CaCO3' }, dilution: { tapParts: 1, demiParts: 0 } };
    await page.addInitScript((w) => { if (!sessionStorage.getItem('c2w')){ sessionStorage.setItem('c2w', '1'); localStorage.setItem('brewconsole_water_hardness', JSON.stringify(w)); } }, WATER);
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="beans"]');
    await assertBecomesActive(page, '#screen-beans');

    const bean = { id: 'bean_c2', name: 'C-2 testboon', roastLevel: 'light', process: 'washed', intendedUse: 'filter', profileKey: 'klassiek' };
    const makeEntry = (id, clicks) => ({
      id, schemaVersion: 3, timestamp: Date.now(),
      beanId: bean.id, method: 'v60', profile: 'klassiek', roast: 'light',
      waterMl: 300, bypass: false, grindMicron: 650, grindStand: null, temp: 95,
      scores: {}, note: '', approved: true, grindStartingPoint: 14, actualGrindClicks: clicks,
      waterProfileSnapshot: WATER
      // Bewust GEEN beanSnapshot — dit is precies het schemaVersion-3-record dat C-2 zegt
      // via entryBeanFor()/de live boon te blijven bedienen.
    });
    const backup = {
      app: 'brew-console', backupVersion: 2, exportedAt: new Date().toISOString(),
      beans: [bean],
      brewLog: [makeEntry('log_a', 12), makeEntry('log_b', 12), makeEntry('log_c', 12)]
    };
    await page.setInputFiles('#backup-import-file', {
      name: 'c2-leercorrectie-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup))
    });
    await page.waitForFunction(() => document.getElementById('backup-status').hidden === false);

    await page.click('#bean-list .bean-card >> nth=0 >> .bean-card-name');
    await assertBecomesActive(page, '#screen-bean-detail');
    await page.click('#bean-detail-use-btn');
    await assertBecomesActive(page, '#screen-advice');
    await page.click('#advice-batch [data-adv-batch="single"]');
    await page.waitForFunction(() => getComputedStyle(document.getElementById('advice-result')).display !== 'none');
    await page.click('#advice-cta');
    await assertBecomesActive(page, '#screen-prep');

    assert.equal(await page.locator('#prep-learning-correction').isVisible(), true,
      'drie goedgekeurde schemaVersion-3-loggings (zonder beanSnapshot) horen nog steeds een leercorrectie te tonen, via de live boon-terugval');
    assert.match(await page.locator('#prep-learning-correction-text').innerText(), /fijner/, 'gemiddeld 2 klikken fijner dan het recept');

    await page.close();
  });

  // NIEUW (Reparatieplan v4.0, C-2 — verplicht, N-4): export → import → export van een
  // schemaVersion-4-record (mét beanSnapshot) is rondgang-identiek.
  test('C-2 back-up-rondgang: een schemaVersion-4-record met beanSnapshot komt na import ongeschonden terug', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="beans"]');
    await assertBecomesActive(page, '#screen-beans');

    const entry = {
      id: 'log_v4', schemaVersion: 4, timestamp: Date.now(),
      beanId: 'bean_v4', method: 'v60', profile: 'klassiek', roast: 'light',
      waterMl: 300, bypass: false, grindMicron: 650, grindStand: 20, temp: 95,
      scores: {}, note: 'v4 rondgang', doseG: 17, ratioText: '1:17,6',
      actualGrindClicks: 18, actualTimeSec: 190, cupWeightG: 260, approved: true, grindStartingPoint: 14,
      beanSnapshot: { process: 'natural', intendedUse: 'filter', roastLevel: 'light' },
      waterProfileSnapshot: { hardnessMgL: 100, alkalinity: { value: 40, unit: 'CaCO3' }, dilution: { tapParts: 1, demiParts: 0 } }
    };
    const backup = {
      app: 'brew-console', backupVersion: 2, exportedAt: new Date().toISOString(),
      beans: [{ id: 'bean_v4', name: 'V4-boon', roastLevel: 'light', process: 'natural', intendedUse: 'filter' }],
      brewLog: [entry]
    };
    await page.setInputFiles('#backup-import-file', {
      name: 'c2-rondgang-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup))
    });
    await page.waitForFunction(() => document.getElementById('backup-status').hidden === false);

    // De rondgang: lees de live brewLog-state (exact wat exportBackup() ook zou serialiseren)
    // terug uit de pagina en vergelijk met wat er is geïmporteerd.
    const storedEntry = await page.evaluate(() => brewLog.find(e => e.id === 'log_v4'));
    assert.deepEqual(storedEntry.beanSnapshot, entry.beanSnapshot, 'beanSnapshot moet ongeschonden terugkomen');
    assert.equal(storedEntry.schemaVersion, 4);
    assert.equal(storedEntry.doseG, entry.doseG);
    assert.equal(storedEntry.cupWeightG, entry.cupWeightG);

    await page.close();
  });

  // NIEUW (Implementatieplan Zetadvies v3.0, §5 — Fase 6 testplan): de volledige weg van
  // proeven naar voorstel — inclusief het randvoorwaarde-vereiste dat het voorstel pas
  // verschijnt bij de VOLGENDE kop (op het Recept-scherm), nooit met terugwerkende kracht
  // op de logging die het veroorzaakte, en altijd expliciet als hypothese gelabeld.
  // BIJGEWERKT (Fase 3): de 0–5-schuifregelaars zijn vervangen door de proefkaart. Dit
  // score-patroon-voorstel bestaat daardoor alleen nog voor oudere loggingen (Fase 4 vervangt
  // het door de diagnose op de nieuwe antwoorden). De test seedt daarom een schema 5-logging
  // met scores, precies zoals de app die vóór Fase 3 schreef. BC-26: de functie die het
  // voorstel toen berekende (cuppingSuggestionFor) bestaat niet meer; de test geeft het
  // bewaarde voorstel daarom letterlijk mee, zoals het in oude loggingen staat.
  const LEGACY_SUGGESTIONS = {
    onderextractie: { pattern: 'onderextractie', diagnose: 'Zuur hoog, zoetheid en body laag — kenmerkend voor onderextractie.',
      voorstel: 'Twee klikken fijner malen bij de volgende kop met deze boon.', wijstNaarWaterprofiel: false },
    vlak_waterbuffering: { pattern: 'vlak_waterbuffering', diagnose: 'Zuur, bitterheid en aftersmaak allemaal laag — een vlakke kop, mogelijk door waterbuffering (alkaliniteit) in plaats van de maalinstelling.',
      voorstel: 'Controleer eerst je waterprofiel (met name alkaliniteit) voor je aan de molenstand draait.', wijstNaarWaterprofiel: true }
  };
  async function seedLegacyScoredLog(page, axisOverrides, suggestion){
    await page.evaluate(([axisOverrides, suggestion]) => {
      const scores = {};
      CUPPING_AXES.forEach(a => { scores[a] = Math.round(RADAR_LEVELS / 2); });
      Object.assign(scores, axisOverrides);
      const bean = { id:'bean-f6', name:'F6 Boon', roastLevel:'medium', profileKey:'klassiek', process:'washed', flavorNotes:[], addedAt:1, doseUsedG:0 };
      const entry = { id:'log_f6', schemaVersion:5, timestamp: Date.now() - 3600000, beanId:'bean-f6', method:'v60', profile:'klassiek',
        roast:'medium', waterMl:300, bypass:false, scores, note:'', suggestion };
      localStorage.setItem('brewconsole_beans', JSON.stringify([bean]));
      localStorage.setItem('brewConsoleLog', JSON.stringify([entry]));
      localStorage.removeItem('brewconsole_brews');
      localStorage.removeItem('brewconsole_active_brew');
    }, [axisOverrides, suggestion]);
    await page.reload({ waitUntil: 'load' });
  }
  async function goViaSeededBeanToPrep(page){
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

  test('Fase 6: een onderextractie-patroon (oudere score-logging) levert een gelabelde hypothese op, zichtbaar in Historie én bij de volgende kop met deze boon', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    // Onderextractie-patroon (plantabel §Fase 6, rij 1): zuur hoog, zoet+body laag.
    await seedLegacyScoredLog(page, { zuur: 3, zoet: 1, body: 1 }, LEGACY_SUGGESTIONS.onderextractie);
    const goViaBeanToBatchStep = () => goViaSeededBeanToPrep(page);

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

    // NIEUW (Fase 3): een nieuwere kop met de proefkaart laat de oude hypothese vervallen —
    // het voorstel hoort altijd bij de láátste kop, niet bij de laatste met scores.
    await page.click('#start-btn');
    await assertBecomesActive(page, '#screen-brew');
    await page.clock.fastForward(FAST_FORWARD);
    await page.waitForFunction(() => getComputedStyle(document.getElementById('brewlog-open-btn')).display !== 'none');
    await page.click('#brewlog-open-btn');
    await assertBecomesActive(page, '#screen-brewlog');
    await page.click('#brewlog-save-btn');
    await page.waitForFunction(() => document.getElementById('brewlog-saved-msg').hidden === false);
    await goViaBeanToBatchStep();
    assert.ok(await page.locator('#prep-cupping-suggestion').isHidden(), 'na een nieuwere kop geen verouderde hypothese meer');

    await page.close();
  });

  // NIEUW (Implementatieplan Zetadvies v3.0, §5 — Fase 6 testplan): het "vlak, mogelijk
  // waterbuffering"-patroon is de enige van de vier die naar een ANDER scherm-onderdeel
  // verwijst (het waterprofiel) in plaats van naar de molenstand/dosis — apart getoetst
  // omdat dat een eigen knop (#prep-suggestion-water-link) aan- of uitzet.
  test('Fase 6: het "vlak/waterbuffering"-patroon toont de link naar het waterprofiel, de andere patronen niet', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    // Vlak/waterbuffering-patroon (plantabel §Fase 6, rij 4): zuur, bitter én aftersmaak laag.
    // BIJGEWERKT (Fase 3): als oudere score-logging geseed, zie seedLegacyScoredLog().
    await seedLegacyScoredLog(page, { zuur: 1, bitter: 1, aftersmaak: 1 }, LEGACY_SUGGESTIONS.vlak_waterbuffering);
    await goViaSeededBeanToPrep(page);

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

      await enterGrindAndPassGate(startingPoint + offsetFromStartingPoint);
      await page.click('#brewlog-save-btn');
      await page.waitForFunction(() => document.getElementById('brewlog-saved-msg').hidden === false);
    }
    // BIJGEWERKT (Fase 3): "goedgekeurd" is geen losse checkbox meer maar de gate van de
    // proefkaart (alles beantwoord, ≥4/5, geen "veel te …"); de maalstand via "Anders…".
    async function enterGrindAndPassGate(clicks){
      await page.click('#actuals-edit-btn');
      await page.fill('#brewlog-actual-grind', String(clicks));
      await answerTasting(page, { strength: 'just_right', acidity: 'lively', finish: 'sweet_clean', liking: '4' });
      assert.match(await page.locator('#tasting-gate').textContent(), /Geslaagde kop/);
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
    await enterGrindAndPassGate(thirdStartingPoint - 2);
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

  // NIEUW (Implementatieplan v3.0, P3 §OCR-hardening — "robuustere tekstherkenning"): de
  // eerste end-to-end dekking van de tekstherkenning op het boon-toevoegen-formulier
  // (applyParsedTextToForm(), tot nu toe volledig ongetest). Gebruikt bewust de plak-
  // tekstinvoer (#f-scan-text + #scan-text-btn) i.p.v. de foto-scan zelf — precies het pad
  // dat de app als eigen offline-vangnet aanbiedt ("Geen verbinding? Plak de tekst
  // hieronder"), dus geen externe OCR-library nodig om dit te testen.
  test('Tekstherkenning: samengestelde branddieptes winnen van de nieuwe kale light/dark-trefwoorden, geen verkeerde classificatie', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="beans"]');
    await assertBecomesActive(page, '#screen-beans');
    await page.click('#bean-add-link');
    await assertBecomesActive(page, '#screen-bean-add');

    async function scanText(text){
      await page.fill('#f-scan-text', text);
      await page.click('#scan-text-btn');
    }
    async function selectedRoast(){
      return page.locator('#f-roast-chips [data-froast][data-selected="true"]').getAttribute('data-froast');
    }

    // "light medium roast" bevat zelf de substring "light" — moet toch als de preciezere
    // samengestelde categorie herkend worden, niet als kale 'light'.
    await scanText('Kenya AA — washed — light medium roast. Floral, bergamot.');
    assert.equal(await selectedRoast(), 'light_medium');

    // Zelfde risico voor "medium-dark roast" (bevat zelf "medium").
    await scanText('Guatemala Antigua — natural — medium-dark roast. Chocolate, spice.');
    assert.equal(await selectedRoast(), 'medium_dark');

    // De nieuwe kale 'dark'/'light'-trefwoorden zelf: vóór deze wijziging kon een kale
    // "Dark" (zonder het woord "roast" erbij) helemaal niet herkend worden.
    await scanText('Brazil Cerrado — natural — Dark. Chocolate, nuts.');
    assert.equal(await selectedRoast(), 'dark');

    await scanText('Ethiopia Guji — washed — Light. Jasmine, peach, black tea.');
    assert.equal(await selectedRoast(), 'light');

    await page.close();
  });

  // NIEUW (audit BC-20): na plakken een controlekaart met naam, branddatum en wat niet herkend
  // is — en direct opslaan zonder door het hele formulier te hoeven.
  test('BC-20: plakken → controlekaart (naam, branddatum, niet-herkend eerlijk benoemd) → direct opslaan', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="beans"]');
    await page.click('#bean-add-link');
    await assertBecomesActive(page, '#screen-bean-add');
    const d = new Date(Date.now() - 5 * 86400000);
    const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0'), yyyy = d.getFullYear();
    await page.fill('#f-scan-text', `Ethiopia Guji — washed — light roast. Notes: jasmine, peach, black tea\nRoasted on ${dd}-${mm}-${yyyy}`);
    await page.click('#scan-text-btn');
    const card = page.locator('#scan-result');
    assert.equal(await card.isVisible(), true);
    const rows = await card.locator('.scan-review-row').allInnerTexts();
    assert.match(rows.join('\n'), /Naam\s+Ethiopia Guji/i);
    assert.match(rows.join('\n'), /Branddatum\s+\d{1,2} \w+ \d{4}/i);
    assert.equal(await page.locator('#f-roast-date').inputValue(), `${yyyy}-${mm}-${dd}`);
    assert.equal(await page.locator('#f-name').inputValue(), 'Ethiopia Guji');
    await page.click('#scan-review-save-btn');
    const beans = await page.evaluate(() => beanLibrary.map(b => ({ name: b.name, roastDate: b.roastDate, roast: b.roastLevel, process: b.process })));
    assert.equal(beans.length, 1);
    assert.deepEqual(beans[0], { name: 'Ethiopia Guji', roastDate: `${yyyy}-${mm}-${dd}`, roast: 'light', process: 'washed' });
    await page.close();
  });

  test('BC-20: wat niet herkend is, staat er eerlijk bij (met de huidige standaard)', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="beans"]');
    await page.click('#bean-add-link');
    await page.fill('#f-scan-text', 'Huisblend nummer 3');
    await page.click('#scan-text-btn');
    const text = await page.locator('#scan-result').innerText();
    assert.match(text, /Branding\s+niet herkend — staat nu op Medium \(standaard\)/i);
    assert.match(text, /Proces\s+niet herkend — staat nu op Washed \(standaard\)/i);
    assert.match(text, /Branddatum\s+niet herkend/i);
    await page.close();
  });

  // NIEUW (Phase 0 / BC-01 — audit: boonkoppeling). Voorheen koppelde de bonenchip in het
  // advies-scherm de boon niet, en wiste niets ooit een eerdere koppeling: een brouwsel
  // belandde dan stilzwijgend bij de boon van een vorige sessie (of bij geen boon).
  describe('BC-01: elk brouwsel hoort bij de boon die je koos — of bij geen boon', () => {
    const SEED_BEANS = [
      { id:'bean-a', name:'Boon A', roastLevel:'medium', profileKey:'klassiek', process:'washed', flavorNotes:[], addedAt:1, doseUsedG:0 },
      { id:'bean-b', name:'Boon B', roastLevel:'light', profileKey:'klassiek', process:'natural', flavorNotes:[], addedAt:2, doseUsedG:0 }
    ];
    async function seededPage(){
      const page = await newTrackedPage();
      await page.addInitScript((beans) => {
        if (!sessionStorage.getItem('bc01-seeded')){
          localStorage.setItem('brewconsole_beans', JSON.stringify(beans));
          sessionStorage.setItem('bc01-seeded', '1');
        }
      }, SEED_BEANS);
      await page.goto(FILE_URL, { waitUntil: 'load' });
      return page;
    }
    async function openAdviceFresh(page){
      await page.click('.navbar [data-nav="method"]');
      await assertBecomesActive(page, '#screen-method');
      await page.click('#advisor-link');
      await assertBecomesActive(page, '#screen-advice');
    }
    async function adviceToPrep(page){
      await page.click('#advice-batch [data-adv-batch="single"]');
      await page.waitForFunction(() => getComputedStyle(document.getElementById('advice-result')).display !== 'none');
      await page.click('#advice-cta');
      await assertBecomesActive(page, '#screen-prep');
    }
    async function brewAndLog(page){
      await page.click('#start-btn');
      await assertBecomesActive(page, '#screen-brew');
      await page.clock.fastForward(FAST_FORWARD);
      await page.waitForFunction(() => getComputedStyle(document.getElementById('brewlog-open-btn')).display !== 'none');
      await page.click('#brewlog-open-btn');
      await assertBecomesActive(page, '#screen-brewlog');
      await page.click('#brewlog-save-btn');
      await page.waitForFunction(() => document.getElementById('brewlog-saved-msg').hidden === false);
      // BIJGEWERKT (Fase 1): loggings leven als v6-records onder 'brewconsole_brews';
      // brewLog is de platte weergave die alle lezers gebruiken.
      return page.evaluate(() => brewLog.slice().sort((a, b) => b.timestamp - a.timestamp)[0]);
    }
    const beanLine = (page) => page.locator('#prep-bean-line').textContent();

    test('bonenchip → brouwsel hoort bij die boon; daarna een handmatige start hoort bij géén boon', async () => {
      const page = await seededPage();
      await openAdviceFresh(page);
      await page.click('[data-bean-pick="bean-a"]');
      assert.equal(await page.getAttribute('[data-bean-pick="bean-a"]', 'data-selected'), 'true');
      assert.equal(await page.getAttribute('[data-bean-pick="bean-b"]', 'data-selected'), 'false');
      await adviceToPrep(page);
      assert.match(await beanLine(page), /Boon: Boon A/);
      const first = await brewAndLog(page);
      assert.equal(first.beanId, 'bean-a', 'brouwsel via de bonenchip moet bij Boon A gelogd worden');

      // Verse handmatige start via Home: de vorige koppeling mag niet meeliften.
      await page.click('.navbar [data-nav="home"]');
      await assertBecomesActive(page, '#screen-home');
      await page.click('#home-start-brew-btn');
      await assertBecomesActive(page, '#screen-method');
      await page.click('[data-method="v60"]');
      await page.click('#roast-grid [data-roast] >> nth=0');
      await page.click('#profile-grid [data-profile="klassiek"]');
      await assertBecomesActive(page, '#screen-prep');
      assert.match(await beanLine(page), /Geen boon gekoppeld/);
      const second = await brewAndLog(page);
      assert.equal(second.beanId, null, 'een handmatige start zonder boonkeuze mag niet bij de vorige boon belanden');
      await page.close();
    });

    test('van boon wisselen koppelt de laatst gekozen boon; nogmaals tikken ontkoppelt', async () => {
      const page = await seededPage();
      await openAdviceFresh(page);
      await page.click('[data-bean-pick="bean-a"]');
      await page.click('[data-bean-pick="bean-b"]');
      await adviceToPrep(page);
      assert.match(await beanLine(page), /Boon: Boon B/);
      assert.equal(await page.evaluate(() => state.beanId), 'bean-b');

      await openAdviceFresh(page);
      assert.equal(await page.evaluate(() => state.beanId), null, 'advies openen vanaf het methodescherm is een verse start');
      await page.click('[data-bean-pick="bean-a"]');
      await page.click('[data-bean-pick="bean-a"]'); // nogmaals = ontkoppelen
      assert.equal(await page.getAttribute('[data-bean-pick="bean-a"]', 'data-selected'), 'false');
      await adviceToPrep(page);
      assert.match(await beanLine(page), /Geen boon gekoppeld/);
      assert.equal(await page.evaluate(() => state.beanId), null);
      await page.close();
    });

    test('een nieuwe boon opslaan vanuit het advies koppelt meteen die nieuwe boon', async () => {
      const page = await seededPage();
      await openAdviceFresh(page);
      await page.click('[data-bean-pick="bean-a"]');
      await page.click('#advice-scan-new');
      await assertBecomesActive(page, '#screen-bean-add');
      await page.fill('#f-name', 'Verse Boon');
      await page.click('#save-bean-btn');
      await assertBecomesActive(page, '#screen-advice');
      await adviceToPrep(page);
      assert.match(await beanLine(page), /Boon: Verse Boon/);
      const newId = await page.evaluate(() => beanLibrary.find(b => b.name === 'Verse Boon').id);
      assert.equal(await page.evaluate(() => state.beanId), newId);
      await page.close();
    });
  });

  // NIEUW (Phase 0 / BC-05 — audit: triage-crash). Triage is bereikbaar vanaf het
  // Bonen-scherm zonder dat er ooit een recept gekozen is; "Opnieuw naar recept" toonde dan
  // een leeg receptscherm en Start crashte op state.recipe === null.
  describe('BC-05: "Opnieuw naar recept" vanuit Triage crasht nooit', () => {
    async function runTriageToResult(page){
      await page.click('.navbar [data-nav="beans"]');
      await assertBecomesActive(page, '#screen-beans');
      await page.click('#triage-open-btn');
      await assertBecomesActive(page, '#screen-triage');
      for (let i = 0; i < 20 && !(await page.locator('#triage-to-recipe-btn').count()); i++){
        await page.click('[data-triage-opt] >> nth=0');
      }
      assert.equal(await page.locator('#triage-to-recipe-btn').count(), 1, 'triage-resultaat met actieknoppen verwacht');
    }

    test('zonder gekozen recept heet de knop "Recept kiezen" en gaat hij naar het methodescherm', async () => {
      const page = await newTrackedPage();
      const errorsBefore = pageErrors.length;
      await page.goto(FILE_URL, { waitUntil: 'load' });
      await runTriageToResult(page);
      assert.equal((await page.locator('#triage-to-recipe-btn').textContent()).trim(), 'Recept kiezen');
      await page.click('#triage-to-recipe-btn');
      await assertBecomesActive(page, '#screen-method');
      assert.equal(pageErrors.length, errorsBefore, `onverwachte JS-fout: ${pageErrors.slice(errorsBefore).join(' | ')}`);
      await page.close();
    });

    test('met een gekozen recept bouwt de knop het receptscherm op en werkt Start', async () => {
      const page = await newTrackedPage();
      const errorsBefore = pageErrors.length;
      await page.goto(FILE_URL, { waitUntil: 'load' });
      await page.click('.navbar [data-nav="method"]');
      await page.click('[data-method="v60"]');
      await page.click('#roast-grid [data-roast] >> nth=0');
      await page.click('#profile-grid [data-profile="klassiek"]');
      await assertBecomesActive(page, '#screen-prep');
      await runTriageToResult(page);
      assert.equal((await page.locator('#triage-to-recipe-btn').textContent()).trim(), 'Opnieuw naar recept');
      await page.click('#triage-to-recipe-btn');
      await assertBecomesActive(page, '#screen-prep');
      assert.ok((await page.locator('#summary-tag').textContent()).trim().length > 0);
      await page.click('#start-btn');
      await assertBecomesActive(page, '#screen-brew');
      assert.equal(pageErrors.length, errorsBefore, `onverwachte JS-fout: ${pageErrors.slice(errorsBefore).join(' | ')}`);
      await page.close();
    });

    test('vangnet: startBrew() zonder recept gaat terug naar het methodescherm in plaats van te crashen', async () => {
      const page = await newTrackedPage();
      const errorsBefore = pageErrors.length;
      await page.goto(FILE_URL, { waitUntil: 'load' });
      await page.evaluate(() => { state.recipe = null; startBrew(); });
      await assertBecomesActive(page, '#screen-method');
      assert.equal(pageErrors.length, errorsBefore, `onverwachte JS-fout: ${pageErrors.slice(errorsBefore).join(' | ')}`);
      await page.close();
    });
  });

  // NIEUW (Brew Intelligence v2, Fase 1): het v6-record bestaat vanaf Start, wordt bij elke
  // gebeurtenis bewaard, en de bijwerkingen (voorraad, "brouw opnieuw") volgen COMPLETED.
  describe('Fase 1: brouwrecord vanaf Start — levenscyclus, bewaren, herstel, migratie', () => {
    const BEAN = { id:'bean-f1', name:'Fase1 Boon', roastLevel:'medium', profileKey:'klassiek', process:'washed', flavorNotes:[], addedAt:1, doseUsedG:0, bagSizeG:250 };
    async function pageWith(seed){
      const page = await newTrackedPage();
      await page.addInitScript((seed) => {
        if (sessionStorage.getItem('f1-seeded')) return;
        sessionStorage.setItem('f1-seeded', '1');
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      }, seed);
      await page.goto(FILE_URL, { waitUntil: 'load' });
      return page;
    }
    const store = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('brewconsole_brews') || '[]'));
    const beanUsed = (page) => page.evaluate(() => beanLibrary.find(b => b.id === 'bean-f1').doseUsedG);
    async function toPrepWithBean(page){
      await page.click('.navbar [data-nav="method"]');
      await page.click('#advisor-link');
      await page.click('[data-bean-pick="bean-f1"]');
      await page.click('#advice-batch [data-adv-batch="single"]');
      await page.waitForFunction(() => getComputedStyle(document.getElementById('advice-result')).display !== 'none');
      await page.click('#advice-cta');
      await assertBecomesActive(page, '#screen-prep');
    }

    test('Start maakt meteen een bewaard brewing-record; voorraad wordt pas bij voltooien afgeboekt, precies één keer', async () => {
      const page = await pageWith({ brewconsole_beans: [BEAN] });
      await toPrepWithBean(page);
      await page.click('#start-btn');
      await assertBecomesActive(page, '#screen-brew');
      let s = await store(page);
      assert.equal(s.length, 1);
      assert.equal(s[0].lifecycle, 'brewing');
      assert.equal(s[0].beanId, 'bean-f1');
      assert.equal(s[0].actual.events[0].type, 'start');
      assert.equal(await page.evaluate(() => localStorage.getItem('brewconsole_active_brew')), s[0].id);
      assert.equal(await beanUsed(page), 0, 'bij Start nog geen voorraadverbruik');

      await page.clock.fastForward(FAST_FORWARD);
      await page.waitForFunction(() => getComputedStyle(document.getElementById('brewlog-open-btn')).display !== 'none');
      s = await store(page);
      assert.equal(s[0].lifecycle, 'completed');
      assert.equal(s[0].actual.bedDrySec, null, 'een schema-einde is geen bed-droog-meting');
      const planned = s[0].plan.doseG;
      assert.equal(await beanUsed(page), planned, 'voorraad afgeboekt bij voltooien');

      await page.click('#brewlog-open-btn');
      await assertBecomesActive(page, '#screen-brewlog');
      await page.click('#brewlog-save-btn');
      await page.waitForFunction(() => document.getElementById('brewlog-saved-msg').hidden === false);
      await page.click('#brewlog-save-btn'); // dubbel opslaan
      s = await store(page);
      assert.equal(s.length, 1, 'nogmaals opslaan werkt hetzelfde record bij, geen tweede logging');
      assert.equal(s[0].lifecycle, 'logged');
      assert.equal(await page.evaluate(() => brewLog.length), 1);
      assert.equal(await beanUsed(page), planned, 'opslaan boekt niet nog eens af');
      await page.close();
    });

    test('stoppen midden in een brouwsel → abandoned: geen voorraadverbruik en niet in het logboek', async () => {
      const page = await pageWith({ brewconsole_beans: [BEAN] });
      await toPrepWithBean(page);
      await page.click('#start-btn');
      await assertBecomesActive(page, '#screen-brew');
      await page.clock.fastForward('00:30');
      await page.click('#stop-btn');
      await page.click('#confirm-modal-ok');
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('brewconsole_brews'))[0].lifecycle === 'abandoned');
      const s = await store(page);
      const ab = s[0].actual.events.at(-1);
      assert.equal(ab.type, 'abandon');
      assert.equal(ab.reason, 'stopped');
      assert.ok(ab.tSec >= 29 && ab.tSec <= 31, `gestopt na ~30 s, kreeg ${ab.tSec}`);
      assert.equal(await beanUsed(page), 0);
      assert.equal(await page.evaluate(() => brewLog.length), 0);
      await page.close();
    });

    test('reset → het lopende brouwsel wordt abandoned; opnieuw starten maakt een nieuw record', async () => {
      const page = await pageWith({ brewconsole_beans: [BEAN] });
      await toPrepWithBean(page);
      await page.click('#start-btn');
      await page.clock.fastForward('00:20');
      await page.click('#pause-btn');
      await page.click('#pause-btn'); // hervat
      await page.click('#reset-btn');
      await page.click('#confirm-modal-ok'); // BC-14: lopend brouwsel → eerst bevestigen
      await page.click('#pause-btn'); // start opnieuw vanaf 0
      const s = await store(page);
      assert.equal(s.length, 2);
      assert.equal(s[0].lifecycle, 'abandoned');
      assert.deepEqual(s[0].actual.events.map(e => e.type), ['start', 'pause', 'resume', 'abandon']);
      assert.equal(s[1].lifecycle, 'brewing');
      assert.equal(await page.evaluate(() => localStorage.getItem('brewconsole_active_brew')), s[1].id);
      await page.close();
    });

    test('herladen midden in een brouwsel: het record blijft bewaard (brewing); lang daarna wordt het voltooid met bed-droog onbekend', async () => {
      const page = await pageWith({ brewconsole_beans: [BEAN] });
      await toPrepWithBean(page);
      await page.click('#start-btn');
      await page.clock.fastForward('00:40');
      await page.reload({ waitUntil: 'load' });
      let s = await store(page);
      assert.equal(s.length, 1, 'het brouwsel is niet verloren na herladen');
      assert.equal(s[0].lifecycle, 'brewing', 'binnen schema + 15 min blijft het staan (Fase 2 biedt "Doorgaan")');

      await page.clock.fastForward('40:00');
      await page.reload({ waitUntil: 'load' });
      s = await store(page);
      assert.equal(s[0].lifecycle, 'completed');
      const types = s[0].actual.events.map(e => e.type);
      assert.deepEqual(types.slice(-2), ['recovered', 'complete']);
      assert.equal(s[0].actual.events.at(-1).bedDry, 'unknown');
      assert.equal(s[0].actual.bedDrySec, null, 'nooit ingevuld vanuit het schema');
      assert.equal(await beanUsed(page), s[0].plan.doseG, 'voltooid → voorraad afgeboekt, ook na herstel');
      await page.close();
    });

    test('migratie: een schema-5-logboek wordt bij het eerste laden v6, het oude logboek blijft onaangeroerd staan', async () => {
      const legacy = [{ id:'log_old', schemaVersion:5, timestamp: Date.now() - 86400000, beanId:null, method:'v60', profile:'klassiek',
        roast:'medium', waterMl:300, bypass:false, scores:{ aroma:3 }, note:'van vroeger', doseG:17.3, ratioText:'1:17,4',
        actualGrindClicks:null, actualTimeSec:185, cupWeightG:null, approved:false }];
      const page = await pageWith({ brewConsoleLog: legacy });
      const s = await store(page);
      assert.equal(s.length, 1);
      assert.equal(s[0].id, 'log_old');
      assert.equal(s[0].lifecycle, 'logged');
      assert.equal(s[0].legacy.scheduledSec, 185);
      assert.deepEqual(JSON.parse(await page.evaluate(() => localStorage.getItem('brewConsoleLog'))), legacy, 'oude sleutel blijft als bron staan');
      await page.click('.navbar [data-nav="brewlog-history"]');
      await assertBecomesActive(page, '#screen-brewlog-history');
      const card = (await page.locator('.brewlog-entry-card').first().innerText()).trim();
      assert.match(card, /van vroeger/);
      assert.match(card, /schema-tijd 3:05 \(niet gemeten\)/);
      await page.close();
    });

    test('verwijderen is zacht en met één tik ongedaan te maken; het record blijft bewaard met deletedAt', async () => {
      const legacy = [{ id:'log_del', schemaVersion:5, timestamp: Date.now(), beanId:null, method:'v60', profile:'klassiek',
        roast:'medium', waterMl:300, bypass:false, scores:{}, note:'weg ermee' }];
      const page = await pageWith({ brewConsoleLog: legacy });
      await page.click('.navbar [data-nav="brewlog-history"]');
      await assertBecomesActive(page, '#screen-brewlog-history');
      assert.equal(await page.locator('.brewlog-entry-card:visible').count(), 1);
      await page.click('.brewlog-entry-card:visible [data-delete-brew]');
      assert.equal(await page.locator('.brewlog-entry-card:visible').count(), 0);
      assert.equal(await page.locator('#undo-bar').isVisible(), true);
      let s = await store(page);
      assert.equal(s.length, 1, 'zacht verwijderd, niet weg');
      assert.ok(s[0].deletedAt > 0);
      await page.click('#undo-bar-btn');
      assert.equal(await page.locator('.brewlog-entry-card:visible').count(), 1);
      s = await store(page);
      assert.equal(s[0].deletedAt, null);
      await page.close();
    });

    test('backup: export bevat de volledige v6-opslag (ook niet-gelogde records) en import herstelt ze zonder dubbelingen', async () => {
      const page = await pageWith({ brewconsole_beans: [BEAN] });
      await toPrepWithBean(page);
      await page.click('#start-btn');
      await page.clock.fastForward('00:10');
      await page.click('#reset-btn');
      await page.click('#confirm-modal-ok'); // één abandoned record
      const exported = await page.evaluate(() => ({ app:'brew-console', backupVersion:3, beans: beanLibrary, brews: brewStore, brewLog }));
      assert.equal(exported.brews.length, 1);
      await page.evaluate(() => { localStorage.removeItem('brewconsole_brews'); localStorage.removeItem('brewconsole_active_brew'); });
      await page.reload({ waitUntil: 'load' });
      assert.equal((await store(page)).length, 0);
      await page.click('.navbar [data-nav="settings"]');
      for (let i = 0; i < 2; i++){ // twee keer importeren: tweede keer mag niets dupliceren
        await page.evaluate(() => { const el = document.getElementById('backup-status'); el.hidden = true; el.textContent = ''; });
        await page.setInputFiles('#backup-import-file', { name:'backup.json', mimeType:'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
        await page.waitForFunction(() => document.getElementById('backup-status').hidden === false);
      }
      const s = await store(page);
      assert.equal(s.length, 1);
      assert.equal(s[0].lifecycle, 'abandoned');
      await page.close();
    });
  });

  // NIEUW (Brew Intelligence v2, Fase 2): brouwscherm met "Giet tot / Wacht / Laten
  // doorlopen", een timer die na het schema doorloopt, Bed droog als gemeten einde, herstel
  // na herladen, en een Home-banner voor een lopend of nog niet geproefd brouwsel.
  describe('Fase 2: brouwscherm, bed droog, herstel', () => {
    async function toBrewV60Klassiek(page){
      await page.goto(FILE_URL, { waitUntil: 'load' });
      await page.click('.navbar [data-nav="method"]');
      await page.click('[data-method="v60"]');
      await page.click('#roast-grid [data-roast] >> nth=0');
      await page.click('#profile-grid [data-profile="klassiek"]');
      await assertBecomesActive(page, '#screen-prep');
      await page.click('#start-btn');
      await assertBecomesActive(page, '#screen-brew');
    }
    const store = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('brewconsole_brews') || '[]'));
    const action = async (page) => (await page.locator('#brew-action-main').textContent()).trim();

    test('Giet tot / Wacht / Laten doorlopen — en nergens een geschat "toegevoegd"-getal', async () => {
      const page = await newTrackedPage();
      await toBrewV60Klassiek(page);
      await page.clock.fastForward('00:05');
      assert.equal(await action(page), 'Giet tot 60 g');
      await page.clock.fastForward('00:15'); // 0:20
      assert.match(await action(page), /^Wacht · 0:2[45]$/);
      assert.match(await page.locator('#brew-action-sub').textContent(), /Daarna giet tot 120 g/);
      assert.match(await page.locator('#next-info').textContent(), /Volgende: giet tot 120 g om 0:45/);
      const brewText = await page.locator('#screen-brew').innerText();
      assert.doesNotMatch(brewText, /toegevoegd/i, 'het brouwscherm mag geen geschatte toegevoegde hoeveelheid tonen');
      assert.equal(await page.locator('#bed-dry-btn').isVisible(), false, 'Bed droog pas na de laatste giet');
      await page.close();
    });

    test('na het schema loopt de klok door; Bed droog legt de gemeten tijd vast', async () => {
      const page = await newTrackedPage();
      await toBrewV60Klassiek(page);
      await page.clock.fastForward('03:15');
      assert.equal(await action(page), 'Laten doorlopen');
      assert.equal(await page.locator('#bed-dry-btn').isVisible(), true);
      assert.equal(await page.locator('#bed-dry-hint').isVisible(), true, 'uitleg de eerste keren');
      await page.clock.fastForward('00:25'); // 3:40 — 10 s na de schatting van 3:30
      assert.match(await page.locator('#dial-total').textContent(), /\+0:1\d na schema/);
      let s = await store(page);
      assert.equal(s[0].lifecycle, 'brewing', 'na het schema is het brouwsel nog niet klaar');
      assert.equal(await page.locator('#brewlog-open-btn').isVisible(), false);

      await page.click('#bed-dry-btn');
      s = await store(page);
      assert.equal(s[0].lifecycle, 'completed');
      assert.ok(s[0].actual.bedDrySec >= 219 && s[0].actual.bedDrySec <= 221, `bed droog ~3:40, kreeg ${s[0].actual.bedDrySec}`);
      assert.equal(s[0].derived.drainResidualSec, s[0].actual.bedDrySec - 210);
      assert.equal(await action(page), 'Klaar');
      assert.equal(await page.locator('#pause-btn').isDisabled(), true);
      const t1 = await page.locator('#dial-time').textContent();
      await page.clock.fastForward('00:10');
      assert.equal(await page.locator('#dial-time').textContent(), t1, 'na bed droog staat de klok stil');

      await page.click('#brewlog-open-btn');
      await assertBecomesActive(page, '#screen-brewlog');
      assert.match(await page.locator('#brewlog-complete-meta').innerText(), /bed droog\s*3:4\d/i);
      assert.match(await page.locator('#brewlog-honest-summary').textContent() /* Sprint 4: staat onder "Meer meten" (dicht) */, /Bed droog na 3:4\d — rond de schatting van het schema \(3:30\)/);
      await page.click('#brewlog-save-btn');
      await page.waitForFunction(() => document.getElementById('brewlog-saved-msg').hidden === false);
      await page.click('.navbar [data-nav="brewlog-history"]');
      await assertBecomesActive(page, '#screen-brewlog-history');
      assert.match(await page.locator('.brewlog-entry-card').first().innerText(), /bed droog 3:4\d/);
      await page.close();
    });

    test('Einde tijdens het doorlopen = voltooid zonder bed-droog-tijd (nooit ingevuld vanuit het schema)', async () => {
      const page = await newTrackedPage();
      await toBrewV60Klassiek(page);
      await page.clock.fastForward('03:20');
      await page.click('#stop-btn');
      await page.click('#confirm-modal-ok');
      const s = await store(page);
      assert.equal(s[0].lifecycle, 'completed');
      assert.equal(s[0].actual.bedDrySec, null);
      assert.equal(await page.locator('#brewlog-open-btn').isVisible(), true);
      await page.click('#brewlog-open-btn');
      assert.match(await page.locator('#brewlog-honest-summary').textContent() /* Sprint 4: staat onder "Meer meten" (dicht) */, /Bed droog: niet vastgelegd/);
      await page.close();
    });

    test('naar Home laat het brouwsel doorlopen; de banner en de Brouwen-tab brengen je terug', async () => {
      const page = await newTrackedPage();
      await toBrewV60Klassiek(page);
      await page.clock.fastForward('00:30');
      await page.click('#home-btn');
      await assertBecomesActive(page, '#screen-home');
      assert.equal(await page.locator('#home-active-brew').isVisible(), true);
      assert.match(await page.locator('#home-active-brew-title').textContent(), /Brouwsel bezig · 0:3\d/);
      assert.equal((await store(page))[0].lifecycle, 'brewing');
      await page.clock.fastForward('00:30');
      await page.click('.navbar [data-nav="method"]');
      await assertBecomesActive(page, '#screen-brew');
      assert.match(await page.locator('#dial-time').textContent(), /^1:0\d$/, 'de klok liep door terwijl je weg was');
      await page.click('#home-btn');
      await page.click('#home-active-brew');
      await assertBecomesActive(page, '#screen-brew');
      await page.close();
    });

    test('herladen midden in een brouwsel → herstelpaneel; Doorgaan loopt verder op de wandklok', async () => {
      const page = await newTrackedPage();
      await toBrewV60Klassiek(page);
      await page.clock.fastForward('01:00');
      await page.reload({ waitUntil: 'load' });
      await assertBecomesActive(page, '#screen-brew');
      assert.equal(await page.locator('#brew-recovery').isVisible(), true);
      assert.match(await page.locator('#brew-recovery-text').textContent(), /Gestart 1:0\d geleden/);
      await page.clock.fastForward('00:20'); // de ketel stond niet stil
      await page.click('#recovery-continue-btn');
      assert.equal(await page.locator('#brew-recovery').isVisible(), false);
      assert.match(await page.locator('#dial-time').textContent(), /^1:2\d$/);
      const s = await store(page);
      assert.equal(s.length, 1, 'herstel maakt geen nieuw record');
      assert.equal(s[0].actual.events.filter(e => e.type === 'start').length, 1);
      assert.ok(s[0].actual.events.some(e => e.type === 'recovered'));
      await page.close();
    });

    test('herstel: "Bed was al droog" voltooit zonder tijd; "Beëindigen" tijdens het gieten breekt af', async () => {
      const page = await newTrackedPage();
      await toBrewV60Klassiek(page);
      await page.clock.fastForward('03:20');
      await page.reload({ waitUntil: 'load' });
      await page.click('#recovery-bed-dry-btn');
      let s = await store(page);
      assert.equal(s[0].lifecycle, 'completed');
      assert.equal(s[0].actual.bedDrySec, null, 'het moment is gemist — niet invullen');
      assert.equal(await page.locator('#brewlog-open-btn').isVisible(), true);

      await page.click('#reset-btn');
      await page.click('#pause-btn'); // nieuw brouwsel
      await page.clock.fastForward('00:40');
      await page.reload({ waitUntil: 'load' });
      await page.click('#recovery-end-btn');
      await assertBecomesActive(page, '#screen-home');
      s = await store(page);
      assert.equal(s[1].lifecycle, 'abandoned');
      await page.close();
    });

    test('Home-banner "Proef je brouwsel": een voltooid, nog niet gelogd brouwsel kun je later proeven', async () => {
      const page = await newTrackedPage();
      await toBrewV60Klassiek(page);
      await page.clock.fastForward('03:20');
      await page.click('#bed-dry-btn');
      await page.reload({ waitUntil: 'load' });
      await assertBecomesActive(page, '#screen-home');
      assert.match(await page.locator('#home-active-brew-title').textContent(), /Proef je brouwsel van \d\d:\d\d/);
      await page.click('#home-active-brew');
      await assertBecomesActive(page, '#screen-brewlog');
      assert.match(await page.locator('#brewlog-honest-summary').textContent() /* Sprint 4: staat onder "Meer meten" (dicht) */, /Bed droog na 3:2\d/);
      await page.click('#brewlog-save-btn');
      await page.waitForFunction(() => document.getElementById('brewlog-saved-msg').hidden === false);
      const s = await store(page);
      assert.equal(s.length, 1);
      assert.equal(s[0].lifecycle, 'logged');
      await page.click('.navbar [data-nav="home"]');
      assert.equal(await page.locator('#home-active-brew').isVisible(), false, 'na proeven verdwijnt de banner');
      await page.close();
    });

    test('een nieuw brouwsel starten terwijl er een op de achtergrond loopt: het oude wordt afgebroken, de klok begint opnieuw', async () => {
      const page = await newTrackedPage();
      await toBrewV60Klassiek(page);
      await page.clock.fastForward('00:50');
      await page.click('#home-btn');
      await page.click('#home-start-brew-btn');
      await page.click('[data-method="v60"]');
      await page.click('#roast-grid [data-roast] >> nth=0');
      await page.click('#profile-grid [data-profile="klassiek"]');
      await page.click('#start-btn');
      await page.clock.fastForward('00:05');
      assert.match(await page.locator('#dial-time').textContent(), /^0:0[45]$/, 'geen restant van de oude klok');
      const s = await store(page);
      assert.equal(s[0].lifecycle, 'abandoned');
      assert.equal(s[0].actual.events.at(-1).reason, 'superseded');
      assert.equal(s[1].lifecycle, 'brewing');
      await page.close();
    });

    test('▶ op het herstelpaneel werkt als Doorgaan', async () => {
      const page = await newTrackedPage();
      await toBrewV60Klassiek(page);
      await page.clock.fastForward('01:00');
      await page.reload({ waitUntil: 'load' });
      await page.clock.fastForward('00:10');
      await page.click('#pause-btn');
      assert.equal(await page.locator('#brew-recovery').isVisible(), false);
      assert.match(await page.locator('#dial-time').textContent(), /^1:1\d$/);
      await page.close();
    });

    test('de bed-droog-uitleg verdwijnt na drie keer', async () => {
      const page = await newTrackedPage();
      await page.addInitScript(() => localStorage.setItem('brewconsole_bed_dry_hint_count', '3'));
      await toBrewV60Klassiek(page);
      await page.clock.fastForward('03:15');
      assert.equal(await page.locator('#bed-dry-btn').isVisible(), true);
      assert.equal(await page.locator('#bed-dry-hint').isVisible(), false);
      await page.close();
    });
  });

  // NIEUW (Brew Intelligence v2, Fase 3): de proefkaart — actuals-chip, vier vragen, doel en
  // vergelijking; "geslaagd" volgt uit de gate i.p.v. een losse checkbox.
  describe('Fase 3: proefkaart', () => {
    const BEAN = { id:'bean-f3', name:'F3 Boon', roastLevel:'medium', profileKey:'klassiek', process:'washed', flavorNotes:[], addedAt:1, doseUsedG:0 };
    async function seeded(){
      const page = await newTrackedPage();
      await page.addInitScript((bean) => {
        if (sessionStorage.getItem('f3')) return;
        sessionStorage.setItem('f3', '1');
        localStorage.setItem('brewconsole_beans', JSON.stringify([bean]));
      }, BEAN);
      await page.goto(FILE_URL, { waitUntil: 'load' });
      return page;
    }
    async function toPrep(page){
      await page.click('.navbar [data-nav="method"]');
      await page.click('#advisor-link');
      await page.click('[data-bean-pick="bean-f3"]');
      await page.click('#advice-batch [data-adv-batch="single"]');
      await page.waitForFunction(() => getComputedStyle(document.getElementById('advice-result')).display !== 'none');
      await page.click('#advice-cta');
      await assertBecomesActive(page, '#screen-prep');
    }
    async function brewToCard(page){
      await page.click('#start-btn');
      await page.clock.fastForward('03:20');
      await page.click('#bed-dry-btn');
      await page.click('#brewlog-open-btn');
      await assertBecomesActive(page, '#screen-brewlog');
    }
    const store = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('brewconsole_brews') || '[]'));
    const q = async (page, name, v) => { await page.click(`[data-t-step="${name}"]`); await page.click(`[data-t-q="${name}"][data-t-v="${v}"]`); };

    test('geen schuifregelaars meer; vier vragen, en zonder doel of eerdere kop geen extra vragen', async () => {
      const page = await seeded();
      await toPrep(page);
      await brewToCard(page);
      assert.equal(await page.locator('#screen-brewlog input[type="range"]').count(), 0);
      const questions = await page.locator('#tasting-card .tasting-q').allTextContents();
      assert.equal(questions.length, 5, `actuals + 4 vragen, kreeg ${JSON.stringify(questions)}`);
      assert.equal(await page.locator('[data-t-q="goalHit"]').count(), 0);
      assert.equal(await page.locator('[data-t-q="vsLast"]').count(), 0);
      assert.match(await page.locator('#tasting-gate').textContent(), /Nog open: sterkte, zuur, afdronk, hoe lekker/);
      await page.close();
    });

    test('doel op het receptscherm → doelvraag op de proefkaart; gate bepaalt "geslaagd"; actuals bevestigd = U', async () => {
      const page = await seeded();
      await toPrep(page);
      await page.click('#prep-goal [data-goal="bright"]');
      assert.equal(await page.getAttribute('#prep-goal [data-goal="bright"]', 'data-selected'), 'true');
      await brewToCard(page);
      assert.match(await page.locator('#tasting-card').textContent(), /Kwam hij uit zoals je wilde — Helder & fris\?/);
      assert.match(await page.locator('#tasting-progress-label').textContent(), /Vraag 1 van 5/, 'het doel is een extra stap');

      await page.click('#actuals-planned-btn');
      await q(page, 'strength', 'just_right');
      await q(page, 'acidity', 'lively');
      await q(page, 'finish', 'bitter');
      await q(page, 'finish', 'sweet_clean'); // sluit bitter uit
      assert.equal(await page.getAttribute('[data-t-q="finish"][data-t-v="bitter"]', 'data-selected'), 'false');
      await q(page, 'liking', '5');
      assert.match(await page.locator('#tasting-gate').textContent(), /Nog open: doel/);
      await q(page, 'goalHit', 'almost');
      assert.match(await page.locator('#tasting-gate').textContent(), /Telt niet als geslaagde kop \(doel niet gehaald\)/);
      await q(page, 'goalHit', 'yes');
      assert.match(await page.locator('#tasting-gate').textContent(), /Geslaagde kop/);
      await page.click('#brewlog-save-btn');

      const s = await store(page);
      assert.equal(s[0].goal, 'bright');
      assert.equal(s[0].tasting.approved, true);
      assert.deepEqual(s[0].tasting.finish, ['sweet_clean']);
      assert.equal(s[0].actual.confirmed, true);
      assert.equal(s[0].actual.grindSource, 'U');
      assert.equal(s[0].actual.grindClick, s[0].plan.grindStartingPoint);
      assert.equal(await page.evaluate(() => beanLibrary.find(b => b.id === 'bean-f3').goal), 'bright', 'doel onthouden voor deze boon');

      await page.click('.navbar [data-nav="brewlog-history"]');
      const card = await page.locator('.brewlog-entry-card').first().innerText();
      assert.match(card, /Sterkte: Precies goed/);
      assert.match(card, /Lekker: 5\/5/);
      assert.match(card, /Doel Helder & fris: ja/);
      assert.match(card, /geslaagde kop/);
      await page.close();
    });

    test('actuals niet bevestigd → aanname (I): telt niet als werkelijke maalstand', async () => {
      const page = await seeded();
      await toPrep(page);
      await brewToCard(page);
      await q(page, 'strength', 'just_right'); await q(page, 'acidity', 'lively');
      await q(page, 'finish', 'sweet_clean'); await q(page, 'liking', '4');
      await page.click('#brewlog-save-btn');
      const s = await store(page);
      assert.equal(s[0].actual.confirmed, false);
      assert.equal(s[0].actual.grindSource, 'I');
      assert.equal(await page.evaluate(() => brewLog[0].actualGrindClicks), null);
      await page.close();
    });

    test('tweede kop van dezelfde boon + methode → vergelijkingsvraag, gekoppeld aan de vorige kop', async () => {
      const page = await seeded();
      await toPrep(page);
      await brewToCard(page);
      await page.click('#brewlog-save-btn');
      await toPrep(page);
      await brewToCard(page);
      assert.equal(await page.locator('[data-t-q="vsLast"]').count(), 3);
      await q(page, 'vsLast', 'better');
      await page.click('#brewlog-save-btn');
      const s = await store(page);
      assert.equal(s[1].tasting.vsLast, 'better');
      assert.equal(s[1].tasting.vsLastBrewId, s[0].id);
      await page.close();
    });
  });

  // NIEUW (Brew Intelligence v2, Fase 4): diagnose + één advies per kop, adviserend.
  describe('Fase 4: advies na de proefkaart', () => {
    const BEAN = { id:'bean-f4', name:'F4 Boon', roastLevel:'medium', profileKey:'klassiek', process:'washed', flavorNotes:[], addedAt:1, doseUsedG:0 };
    async function seeded(withBean = true){
      const page = await newTrackedPage();
      await page.addInitScript((bean) => {
        if (sessionStorage.getItem('f4')) return;
        sessionStorage.setItem('f4', '1');
        if (bean) localStorage.setItem('brewconsole_beans', JSON.stringify([bean]));
      }, withBean ? BEAN : null);
      await page.goto(FILE_URL, { waitUntil: 'load' });
      return page;
    }
    async function toPrep(page){
      await page.click('.navbar [data-nav="method"]');
      await page.click('#advisor-link');
      await page.click('[data-bean-pick="bean-f4"]');
      await page.click('#advice-batch [data-adv-batch="single"]');
      await page.waitForFunction(() => getComputedStyle(document.getElementById('advice-result')).display !== 'none');
      await page.click('#advice-cta');
      await assertBecomesActive(page, '#screen-prep');
    }
    async function brewToCard(page){
      await page.click('#start-btn');
      await page.clock.fastForward('03:20');
      await page.click('#bed-dry-btn');
      await page.click('#brewlog-open-btn');
      await assertBecomesActive(page, '#screen-brewlog');
    }
    async function answer(page, a){
      if (a.planned !== false) await page.click('#actuals-planned-btn');
      await answerTasting(page, { strength: a.strength, acidity: a.acidity, finish: a.finish, liking: String(a.liking), vsLast: a.vsLast });
      await page.click('#brewlog-save-btn');
    }
    const store = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('brewconsole_brews') || '[]'));
    const pending = (page) => page.evaluate(() => beanLibrary.find(b => b.id === 'bean-f4').pendingAdjust || null);

    test('volledige cyclus: advies → gebruiken → volgende kop op de nieuwe stand → getest "beter" → houd zo', async () => {
      const page = await seeded();
      await toPrep(page);
      const start = await page.evaluate(() => state.recipe.grindStartingPoint);
      await brewToCard(page);
      assert.equal(await page.locator('#reco-card').isVisible(), false, 'advies pas na opslaan');
      await answer(page, { strength: 'just_right', acidity: 'sharp', finish: ['hollow'], liking: 2 });
      assert.equal(await page.locator('#reco-card').isVisible(), true);
      assert.equal((await page.locator('#reco-card .reco-title').textContent()).trim(), `Maal 1 klik fijner (klik ${start} → ${start - 1})`);
      assert.match(await page.locator('#reco-card').innerText(), /scherp zuur, leeg bij een goede sterkte — wijst op onderextractie/);
      assert.match(await page.locator('#reco-card').innerText(), /Waarschijnlijk/i);
      await page.click('#reco-apply-btn');
      assert.match(await page.locator('#reco-card').innerText(), /Staat klaar voor je volgende kop/);
      const p = await pending(page);
      assert.deepEqual([p.lever, p.delta, p.fromValue, p.toValue, p.method], ['grind', -1, start, start - 1, 'v60']);
      let s = await store(page);
      assert.equal(s[0].recommendation.status, 'applied');
      assert.equal(s[0].diagnosis.extraction.state, 'under');

      await toPrep(page);
      assert.equal(await page.locator('#prep-next-adjust').isVisible(), true);
      assert.match(await page.locator('#prep-next-adjust').innerText(), new RegExp(`Maal op klik ${start - 1} — 1 klik fijner dan je vorige kop \\(klik ${start}\\)`));
      assert.equal(await page.evaluate(() => state.recipe.grindStartingPoint), start, 'het engine-recept zelf verandert niet');
      await brewToCard(page);
      assert.match(await page.locator('.tasting-actuals').innerText(), new RegExp(`klik ${start - 1}`));
      await answer(page, { strength: 'just_right', acidity: 'lively', finish: ['sweet_clean'], liking: 5, vsLast: 'better' });
      assert.equal((await page.locator('#reco-card .reco-title').textContent()).trim(), 'Houd dit recept zo');

      s = await store(page);
      assert.equal(s[1].plan.appliedAdjust.fromBrewId, s[0].id);
      assert.equal(s[1].plan.grindTarget, start - 1);
      assert.equal(s[1].actual.grindClick, start - 1, '"zoals gepland" = de toegepaste stand');
      assert.equal(s[0].recommendation.status, 'tested');
      assert.equal(s[0].recommendation.outcome, 'better');
      assert.equal(await pending(page), null, 'de stap is getest en opgeruimd');

      await page.click('.navbar [data-nav="brewlog-history"]');
      const cards = await page.locator('.brewlog-entry-card').allInnerTexts();
      assert.ok(cards.some(c => /Advies: Maal 1 klik fijner .*getest: beter/.test(c)), cards.join('\n---\n'));
      await page.close();
    });

    test('dosis-advies: de stap wordt bij de volgende kop ingesteld; "Toch niet" draait hem terug', async () => {
      const page = await seeded();
      await toPrep(page);
      const dose0 = await page.evaluate(() => state.recipe.dose);
      await brewToCard(page);
      await answer(page, { strength: 'too_weak', acidity: 'lively', finish: ['hollow'], liking: 3 });
      assert.match((await page.locator('#reco-card .reco-title').textContent()).trim(), /^Een stap sterker: ~8% meer koffie \(\d+,\d → \d+,\d g\)$/);
      await page.click('#reco-apply-btn');

      await toPrep(page);
      assert.equal(await page.evaluate(() => state.strengthAdjust), 1);
      assert.ok(await page.evaluate(() => state.recipe.dose) > dose0);
      assert.match(await page.locator('#prep-next-adjust').innerText(), /Een stap sterker/);
      await page.click('#prep-next-adjust-cancel');
      assert.equal(await page.evaluate(() => state.strengthAdjust), 0);
      assert.equal(await page.locator('#prep-next-adjust').isVisible(), false);
      assert.equal(await pending(page), null);
      assert.equal((await store(page))[0].recommendation.status, 'ignored');
      await page.close();
    });

    test('geslaagde kop → "Houd dit recept zo"; onvolledig → geen advies maar wat er ontbreekt', async () => {
      const page = await seeded();
      await toPrep(page);
      await brewToCard(page);
      await page.click('#brewlog-save-btn');
      assert.match(await page.locator('#reco-card').innerText(), /Nog geen advies[\s\S]*Beantwoord eerst: sterkte, zuur, afdronk, hoe lekker/);
      await answer(page, { strength: 'just_right', acidity: 'lively', finish: ['sweet_clean'], liking: 4 });
      assert.equal((await page.locator('#reco-card .reco-title').textContent()).trim(), 'Houd dit recept zo');
      assert.equal(await page.locator('#reco-apply-btn').count(), 0, 'bij houden valt er niets toe te passen');
      await page.close();
    });

    test('zonder gekoppelde boon: advies wel, meenemen niet (met uitleg)', async () => {
      const page = await seeded(false);
      await page.click('.navbar [data-nav="method"]');
      await page.click('[data-method="v60"]');
      await page.click('#roast-grid [data-roast] >> nth=0');
      await page.click('#profile-grid [data-profile="klassiek"]');
      await brewToCard(page);
      await answer(page, { strength: 'just_right', acidity: 'sharp', finish: ['hollow'], liking: 2 });
      assert.match(await page.locator('#reco-card .reco-title').textContent(), /Maal 1 klik fijner/);
      assert.equal(await page.locator('#reco-apply-btn').count(), 0);
      assert.match(await page.locator('#reco-card').innerText(), /Koppel een boon/);
      await page.close();
    });

    test('meetoverzicht op Statistieken: geteste stap telt mee, oordeel blijft "onvoldoende" onder 20', async () => {
      const page = await seeded();
      await toPrep(page);
      await brewToCard(page);
      await answer(page, { strength: 'just_right', acidity: 'sharp', finish: ['hollow'], liking: 2 });
      await page.click('.navbar [data-nav="brewlog-history"]');
      await page.click('#history-tabs [data-tab="statistieken"]');
      let text = await page.locator('#advice-outcome').innerText();
      assert.match(text, /Hoe goed werken de adviezen\?/i);
      assert.match(text, /Getest\s*0/i);
      assert.match(text, /1× een stap/);
      assert.match(text, /Nog 20 geteste stappen tot een betrouwbaar oordeel/);

      await page.click('.navbar [data-nav="brewlog-history"]');
      await page.click('#history-tabs [data-tab="alle"]');
      await page.click('.navbar [data-nav="home"]');
      await toPrep(page);
      await brewToCard(page);
      // Stap niet via het paneel gebruikt: de volgende kop test hem dus niet.
      await answer(page, { strength: 'just_right', acidity: 'sharp', finish: ['hollow'], liking: 2 });
      await page.click('#reco-apply-btn');
      await toPrep(page);
      await brewToCard(page);
      await answer(page, { strength: 'just_right', acidity: 'lively', finish: ['sweet_clean'], liking: 5, vsLast: 'better' });
      const s = await store(page);
      assert.equal(s[1].recommendation.status, 'tested');

      await page.click('.navbar [data-nav="brewlog-history"]');
      await page.click('#history-tabs [data-tab="statistieken"]');
      text = await page.locator('#advice-outcome').innerText();
      assert.match(text, /Getest\s*1\s*stap/i);
      const tops = await page.locator('#advice-outcome .stat-block').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top)));
      assert.equal(tops.length, 3);
      assert.equal(new Set(tops).size, 1, `tegels niet op één rij: ${tops}`);
      assert.match(text, /Gelukt\s*100%\s*1 van 1/i);
      assert.match(text, /Slechter\s*0%\s*0 van 1/i);
      assert.match(text, /1× houd zo/);
      assert.equal(await page.locator('#advice-outcome [data-advice-gate]').getAttribute('data-advice-gate'), 'insufficient');
      assert.match(text, /Nog 19 geteste stappen tot een betrouwbaar oordeel/);
      await page.close();
    });
  });

  // NIEUW (audit BC-12): het receptscherm is in een paar seconden te scannen.
  test('BC-12: startklik vooraan, elke waarde met één regel uitleg, onderbouwing ingeklapt', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.evaluate(() => { selectMethod('v60'); selectRoast('light'); selectProfile('klassiek'); });
    const rec = await page.evaluate(() => ({ start: state.recipe.grindStartingPoint, min: state.recipe.grindStartingRange.clicksMin, max: state.recipe.grindStartingRange.clicksMax }));
    const grind = page.locator('#stats-grid .stat-block', { hasText: 'Maalgraad' });
    assert.equal((await grind.locator('.stat-value').textContent()).trim(), `Klik ${rec.start}`);
    assert.match(await grind.innerText(), new RegExp(`start hier · klik ${rec.min}–${rec.max} is het startgebied`));
    assert.match(await grind.innerText(), /zuur en snel door\? fijner · bitter en traag\? grover/);
    for (const label of ['Gemalen koffie', 'Watertemperatuur', 'Ratio', 'Maalgraad', 'Brouwtijd']){
      const n = await page.locator('#stats-grid .stat-block', { hasText: label }).locator('.stat-sub').count();
      assert.ok(n >= 1, `${label} heeft een uitlegregel`);
    }
    assert.equal(await page.locator('#disclaimer').isVisible(), false, 'onderbouwing standaard ingeklapt');
    assert.equal(await page.locator('#why-details').getAttribute('open'), null);
    assert.equal(await page.locator('#why-recipe-details').getAttribute('open'), null, 'Sprint 3: techniekkaart standaard ingeklapt');
    await page.click('#why-recipe-details > summary');
    const styleText = (await page.locator('#style-note').innerText()).trim();
    assert.ok(styleText.length < 400, `techniekkaart kort (${styleText.length} tekens)`);
    if (await page.locator('#style-more-toggle').count()){
      await page.click('#style-more-toggle');
      assert.equal(await page.locator('#style-more-body').isVisible(), true);
    }
    const words = await page.evaluate(() => document.getElementById('screen-prep').innerText.split(/\s+/).filter(Boolean).length);
    assert.ok(words < 450, `zichtbare tekst op het receptscherm: ${words} woorden`);
    await page.close();
  });

  // NIEUW (audit BC-15): het terug-gebaar gaat één scherm terug in plaats van de app uit.
  test('BC-15: terug-gebaar = één scherm terug; in-app terug laat de geschiedenis niet groeien; tijdens gieten blijf je op de timer', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    const active = () => page.evaluate(() => document.querySelector('.screen.active').id);
    await page.click('.navbar [data-nav="method"]');
    await page.click('[data-method="v60"]');
    await page.click('#roast-grid [data-roast] >> nth=0');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');
    const lenAtPrep = await page.evaluate(() => history.length);
    await page.goBack();
    await assertBecomesActive(page, '#screen-profile');
    await page.goBack();
    await assertBecomesActive(page, '#screen-roast');
    await page.goForward();
    await assertBecomesActive(page, '#screen-profile');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await assertBecomesActive(page, '#screen-prep');
    await page.click('#screen-prep .back-btn');
    await assertBecomesActive(page, '#screen-profile');
    assert.equal(await page.evaluate(() => history.length), lenAtPrep, 'in-app terug groeit de geschiedenis niet');
    await page.click('#profile-grid [data-profile="klassiek"]');
    await page.click('#start-btn');
    await assertBecomesActive(page, '#screen-brew');
    await page.goBack();
    await page.waitForTimeout(150);
    assert.equal(await active(), 'screen-brew', 'tijdens het gieten brengt terug je niet van de timer af');
    await page.close();
  });

  // NIEUW (na de update-controle): de oude versie koppelde brouwsels via het advies soms aan
  // geen of de verkeerde boon. Na de migratie kun je die nakijken; niets verandert vanzelf.
  test('Oude brouwsels nakijken: verdachte gemigreerde brouwsels koppelen, ongedaan maken, "Klopt zo"', async () => {
    const page = await newTrackedPage();
    const day = 86400000, now = Date.now();
    const beans = [
      { id:'bean-eth', name:'Ethiopia Guji', roastLevel:'light', profileKey:'fruitig_clean', process:'washed', flavorNotes:[], addedAt: now - 30 * day, doseUsedG:0 },
      { id:'bean-bra', name:'Brazil Cerrado', roastLevel:'medium', profileKey:'klassiek', process:'natural', flavorNotes:[], addedAt: now - 30 * day, doseUsedG:36, bagSizeG:250 }
    ];
    const entry = (id, beanId, roast, snapRoast, note, t) => ({ id, schemaVersion: 5, timestamp: now - t * day, beanId, method:'v60', profile:'klassiek', roast, waterMl:300, doseG:18,
      scores:{}, note, approved:true, beanSnapshot: snapRoast ? { roastLevel: snapRoast, process: 'natural', intendedUse: null, roastDate: null } : null });
    const legacy = [
      entry('log_a', '', 'light', null, 'geen boon', 3),
      entry('log_b', 'bean-bra', 'light', 'medium', 'verkeerde boon', 2),
      entry('log_c', 'bean-bra', 'medium', 'medium', 'klopt', 1)
    ];
    await page.addInitScript(([b, l]) => { if (sessionStorage.getItem('lr')) return; sessionStorage.setItem('lr', '1');
      localStorage.setItem('brewconsole_beans', JSON.stringify(b)); localStorage.setItem('brewConsoleLog', JSON.stringify(l)); }, [beans, legacy]);
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.click('.navbar [data-nav="brewlog-history"]');
    const box = page.locator('#legacy-review');
    assert.equal(await box.isVisible(), true);
    assert.match(await box.innerText(), /2 oude brouwsels om na te kijken/);
    await page.click('#legacy-review-toggle');
    const items = box.locator('.legacy-review-item');
    assert.equal(await items.count(), 2);
    const itemA = box.locator('[data-lr-id="log_a"]');
    assert.match(await itemA.innerText(), /Zonder boon opgeslagen/);
    assert.equal(await itemA.locator('select').inputValue(), 'bean-eth', 'voorstel: de enige lichte boon');
    assert.match(await box.locator('[data-lr-id="log_b"]').innerText(), /Gebrand als Light, maar gekoppeld aan Brazil Cerrado \(Medium\) — mogelijk de verkeerde boon/);

    await itemA.locator('[data-lr-save]').click();
    let rec = await page.evaluate(() => { const r = getBrewRecord('log_a'); const v = brewLog.find(e => e.id === 'log_a'); return { bean: r.beanId, snap: r.beanSnapshot && r.beanSnapshot.roastLevel, reviewed: !!r.reviewedAt, viewBean: v.beanId, viewSnap: v.beanSnapshot && v.beanSnapshot.roastLevel }; });
    assert.deepEqual(rec, { bean: 'bean-eth', snap: 'light', reviewed: true, viewBean: 'bean-eth', viewSnap: 'light' });
    assert.match(await box.innerText(), /1 oud brouwsel om na te kijken/);
    assert.match(await page.locator('#undo-bar').innerText(), /Gekoppeld aan Ethiopia Guji/);
    await page.click('#undo-bar-btn');
    rec = await page.evaluate(() => { const r = getBrewRecord('log_a'); return { bean: r.beanId, reviewed: !!r.reviewedAt }; });
    assert.deepEqual(rec, { bean: null, reviewed: false }, 'ongedaan maken zet alles terug');
    assert.match(await box.innerText(), /2 oude brouwsels om na te kijken/);

    // Voorraadcorrectie: de oude versie schreef log_b af van Brazil; opnieuw koppelen aan
    // Ethiopia verplaatst die 18 g. Ongedaan maken zet beide zakken exact terug.
    const usage = () => page.evaluate(() => Object.fromEntries(beanLibrary.map(b => [b.id, b.doseUsedG])));
    assert.deepEqual(await usage(), { 'bean-eth': 0, 'bean-bra': 36 }, 'log_a (zonder boon) was nergens afgeschreven; undo van log_a zette eth terug');
    await box.locator('[data-lr-id="log_b"] select').selectOption('bean-eth');
    await box.locator('[data-lr-id="log_b"] [data-lr-save]').click();
    assert.deepEqual(await usage(), { 'bean-eth': 18, 'bean-bra': 18 });
    assert.match(await page.locator('#undo-bar').innerText(), /Gekoppeld aan Ethiopia Guji\. 18\sg voorraad verplaatst van Brazil Cerrado\./);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('brewconsole_beans')).map(b => b.doseUsedG)), [18, 18], 'ook opgeslagen');
    await page.click('#undo-bar-btn');
    assert.deepEqual(await usage(), { 'bean-eth': 0, 'bean-bra': 36 });
    assert.equal(await page.evaluate(() => 'stockBeanId' in getBrewRecord('log_b')), false);

    await box.locator('[data-lr-id="log_b"] [data-lr-ok]').click();
    await itemA.locator('[data-lr-save]').click();
    assert.equal(await box.isVisible(), false, 'alles nagekeken → melding weg');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('brewconsole_brews')).map(r => [r.id, r.beanId, !!r.reviewedAt]));
    assert.deepEqual(stored.sort(), [['log_a', 'bean-eth', true], ['log_b', 'bean-bra', true], ['log_c', 'bean-bra', false]]);
    assert.deepEqual(await usage(), { 'bean-eth': 18, 'bean-bra': 36 }, 'log_a nu bij Ethiopia afgeschreven; "Klopt zo" verandert niets');
    await page.close();
  });

  test('Oude brouwsels nakijken: al opnieuw gekoppeld vóór de voorraadcorrectie → gram één keer verplaatst bij opstarten', async () => {
    const page = await newTrackedPage();
    const day = 86400000, now = Date.now();
    const beans = [
      { id:'bean-eth', name:'Ethiopia Guji', roastLevel:'light', profileKey:'fruitig_clean', process:'washed', flavorNotes:[], addedAt: now - 30 * day, doseUsedG:0 },
      { id:'bean-bra', name:'Brazil Cerrado', roastLevel:'medium', profileKey:'klassiek', process:'natural', flavorNotes:[], addedAt: now - 30 * day, doseUsedG:18 }
    ];
    const legacy = [{ id:'log_b', schemaVersion: 5, timestamp: now - day, beanId:'bean-bra', method:'v60', profile:'klassiek', roast:'light', waterMl:300, doseG:18, scores:{}, note:'', approved:true }];
    // De bewaker staat in localStorage (niet sessionStorage): deze test herlaadt twee keer, en
    // op de CI-browser bleef sessionStorage bij het herladen van een file://-pagina niet altijd
    // bewaard — dan zette het init-script de beginvoorraad terug en leek de correctie dubbel.
    await page.addInitScript(([b, l]) => { if (localStorage.getItem('lr2-seeded')) return; localStorage.setItem('lr2-seeded', '1');
      localStorage.setItem('brewconsole_beans', JSON.stringify(b)); localStorage.setItem('brewConsoleLog', JSON.stringify(l)); }, [beans, legacy]);
    await page.goto(FILE_URL, { waitUntil: 'load' });
    // Zoals de vorige versie het opsloeg: wel opnieuw gekoppeld, geen voorraadcorrectie.
    await page.evaluate(() => { const r = getBrewRecord('log_b'); r.beanId = 'bean-eth'; r.beanRelinkedAt = r.reviewedAt = Date.now(); persistBrewStore(); });
    const usage = () => page.evaluate(() => Object.fromEntries(beanLibrary.map(b => [b.id, b.doseUsedG])));
    assert.deepEqual(await usage(), { 'bean-eth': 0, 'bean-bra': 18 });
    await page.reload({ waitUntil: 'load' });
    assert.deepEqual(await usage(), { 'bean-eth': 18, 'bean-bra': 0 });
    assert.equal(await page.evaluate(() => getBrewRecord('log_b').stockBeanId), 'bean-eth');
    await page.reload({ waitUntil: 'load' });
    assert.deepEqual(await usage(), { 'bean-eth': 18, 'bean-bra': 0 }, 'geen tweede keer');
    await page.close();
  });

  // NIEUW (D2-1/D4-2, onderzoek_D2_D4.md): kleine V60-kop op de dosisondergrens met eerlijk
  // label, en richting-hints bij duidelijk kleine/grote brouwsels — tekst, geen receptgetal.
  test('D2-1/D4-2: V60 250 ml op de ondergrens met label; hints bij kleine V60 en kleine/grote Chemex', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.evaluate(() => { selectMethod('v60'); selectRoast('medium'); selectProfile('klassiek'); state.waterMl = 250; renderPrep(); });
    const grid = page.locator('#stats-grid');
    let txt = await grid.innerText();
    assert.match(txt, /15,0 g/);
    assert.match(txt, /ondergrens van dit toestel/);
    assert.match(txt, /1:16,7/);
    assert.match(txt, /iets sterker dan het midden van je doel \(nog binnen het doel\)/);
    assert.match(await page.locator('#batch-hint').innerText(), /kleine kop: .*spoel de dripper heet voor/);

    await page.evaluate(() => { state.waterMl = 300; renderPrep(); });
    txt = await grid.innerText();
    assert.equal(await page.locator('#batch-hint').count(), 0, 'een gewone kop krijgt geen hint');
    assert.doesNotMatch(txt, /ondergrens|midden van je doel/);

    await page.evaluate(() => { state.waterMl = 250; state.strengthAdjust = 1; renderPrep(); });
    assert.doesNotMatch(await grid.innerText(), /nog binnen het doel/, 'met de sterkteknop geen "binnen het doel"-claim');
    await page.evaluate(() => { state.strengthAdjust = 0; });

    await page.evaluate(() => { selectMethod('chemex'); selectRoast('medium'); selectProfile('klassiek'); state.waterMl = 300; renderPrep(); });
    assert.match(await page.locator('#batch-hint').innerText(), /klein brouwsel/);
    await page.evaluate(() => { state.waterMl = 600; renderPrep(); });
    assert.equal(await page.locator('#batch-hint').count(), 0, 'een volle 6-kops is gewoon');
    await page.evaluate(() => { state.waterMl = 850; renderPrep(); });
    assert.match(await page.locator('#batch-hint').innerText(), /groot brouwsel: .*iets grover/);
    await page.close();
  });

  // NIEUW (D4-1): de contacttijdband geldt voor een gewone hoeveelheid; bij een klein
  // Chemex-brouwsel (17 g, band geldt voor ~42 g) geen binnen/buiten-oordeel.
  test('D4-1: klein Chemex-brouwsel krijgt op het Klaar-scherm geen tijdsoordeel, met uitleg', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.evaluate(() => { selectMethod('chemex'); selectRoast('medium'); selectProfile('klassiek'); state.waterMl = 300; renderPrep(); });
    await page.click('#start-btn');
    await assertBecomesActive(page, '#screen-brew');
    await page.clock.fastForward(FAST_FORWARD);
    await page.waitForFunction(() => getComputedStyle(document.getElementById('brewlog-open-btn')).display !== 'none');
    await page.click('#brewlog-open-btn');
    await assertBecomesActive(page, '#screen-brewlog');
    const summary = await page.locator('#brewlog-honest-summary').textContent();
    assert.match(summary, /loopt het bed normaal sneller door dan bij een gewone hoeveelheid \(~42 g\).*geen oordeel over je tijd/);
    assert.doesNotMatch(summary, /valt (binnen|buiten) de normale tijd voor dit toestel/);
    await page.close();
  });

  // NIEUW (BP-A/BP-C, onderzoek_maling_dosis_bypass.md §3.6): stappenplan op de bypass-kaart,
  // en een klaargezette stap uit een bypass-kop zet bypass terug zodat de test eerlijk is.
  test('BP-A/BP-C: stappenplan bij bypass; stap uit een bypass-kop zet bypass terug, anders een waarschuwing', async () => {
    const page = await newTrackedPage();
    const bean = { id:'bean-bp', name:'Bypass Boon', roastLevel:'medium', profileKey:'klassiek', process:'washed', flavorNotes:[], addedAt: 1, doseUsedG: 0,
      lastBrew: { method:'v60', waterMl:300, bypass:false, bypassPct:null },
      pendingAdjust: { fromBrewId:'log_bp', lever:'grind', delta:-1, fromValue:16, toValue:15, method:'v60', createdAt: 1, bypassPct: 30, waterMl: 300 } };
    await page.addInitScript((b) => { if (sessionStorage.getItem('bp')) return; sessionStorage.setItem('bp', '1');
      localStorage.setItem('brewconsole_beans', JSON.stringify([b])); }, bean);
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.evaluate(() => brewAgain('bean-bp'));
    await assertBecomesActive(page, '#screen-prep');
    assert.deepEqual(await page.evaluate(() => [state.bypass, state.bypassPct]), [true, 30], 'de stap kwam uit een 30%-bypass-kop');
    assert.equal(await page.locator('#prep-next-adjust-setup').count(), 0, 'zelfde opzet → geen waarschuwing');

    await page.evaluate(() => { document.getElementById('refine-details').open = true; });
    const howto = page.locator('#bypass-howto');
    assert.equal(await howto.isVisible(), true);
    await howto.locator('summary').click();
    assert.equal(await howto.locator('li').count(), 6);
    assert.match(await howto.innerText(), /Begin met 20%[\s\S]*Te dun of zuur\? Eerst Sterkte een stap omhoog[\s\S]*tellen apart/);

    await page.evaluate(() => { state.bypass = false; renderPrep(); });
    assert.match(await page.locator('#prep-next-adjust-setup').innerText(), /kop met 30% bypass .* telt deze test niet mee/);
    await page.close();
  });

  // NIEUW (audit BC-10): blinde helder-proef; het recept verandert alleen als je dat na een
  // duidelijke uitslag zelf aanzet.
  test('BC-10: blinde proef bij Helder & fris — onthullen, opslaan, en pas na een duidelijke uitslag zelf aanzetten', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.evaluate(() => { selectMethod('v60'); selectRoast('medium'); selectProfile('klassiek'); });
    assert.equal(await page.locator('#ab-trial').isVisible(), false, 'zonder helder-doel geen proefkaart');
    const dose0 = await page.evaluate(() => state.recipe.dose);
    await page.click('[data-goal="bright"]');
    assert.equal(await page.locator('#ab-trial').isVisible(), true);
    assert.equal(await page.evaluate(() => state.recipe.dose), dose0, 'standaard verandert het recept niet');
    await page.click('#ab-start-btn');
    const cup = await page.evaluate(() => abOpenTrial.cupForVariant);
    assert.match(await page.locator('#ab-trial').innerText(), /Kop 1: [\d,]+ g · Kop 2: [\d,]+ g/);
    assert.equal(await page.locator('#ab-reveal-btn').isDisabled(), true, 'eerst antwoorden');
    await page.click(`[data-ab-q="preferredCup"][data-ab-a="${cup}"]`);
    await page.click(`[data-ab-q="brighterCup"][data-ab-a="${cup}"]`);
    await page.click('#ab-reveal-btn');
    assert.match(await page.locator('#ab-reveal').innerText(), new RegExp(`Kop ${cup} had minder koffie .* Je vond de kop met minder koffie lekkerder`));
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('brewconsole_ab_trials')));
    assert.equal(stored.length, 1);
    assert.equal(stored[0].preferred, 'variant');
    assert.equal(stored[0].brighter, 'variant');
    assert.ok(stored[0].variantDose < stored[0].controlDose);
    assert.equal(await page.locator('#ab-lighter-on').count(), 0, 'na één proef nog niets aan te zetten');

    // Vier extra proeven waarin de variant wint → duidelijke uitslag → zelf aanzetten.
    await page.evaluate(() => { for (let i = 0; i < 4; i++) abTrials.push({ id: 'x' + i, preferred: 'variant' }); saveAbTrials(); renderAbTrial(); });
    assert.equal(await page.locator('.ab-tally').getAttribute('data-ab-verdict'), 'variant');
    await page.click('#ab-lighter-on');
    assert.equal(await page.evaluate(() => state.strengthAdjust), -1);
    assert.ok(await page.evaluate(() => state.recipe.dose) < dose0, 'nu een stap minder koffie');
    await page.click('[data-goal="balanced"]');
    assert.equal(await page.evaluate(() => state.strengthAdjust), 0, 'ander doel → automatische stap terug');
    assert.equal(await page.evaluate(() => state.recipe.dose), dose0);
    await page.close();
  });

  // NIEUW (audit BC-23): smaakrichting en gietstijl gescheiden, één schaal.
  test('BC-23: profielkeuze in twee groepen (smaakrichting / gietstijl), zonder percentages', async () => {
    const page = await newTrackedPage();
    await page.goto(FILE_URL, { waitUntil: 'load' });
    const layout = await page.evaluate(() => {
      selectMethod('v60'); selectRoast('light'); showScreen('profile');
      const grid = document.getElementById('profile-grid');
      const kids = [...grid.children];
      const labelIdx = kids.findIndex(el => el.classList.contains('profile-group-label'));
      const keyIdx = (k) => kids.findIndex(el => el.getAttribute('data-profile') === k);
      adviceState.flavorScores = { heel_fruitig: 2, fruitig_clean: 3, fresh_clean: 1, vol_rond: 0, zoet: 0 };
      renderAdviceChips();
      return {
        label: labelIdx >= 0 ? kids[labelIdx].textContent : null,
        flavorBefore: ['heel_fruitig', 'klassiek'].every(k => keyIdx(k) >= 0 && keyIdx(k) < labelIdx),
        styleAfter: PROFILE_TECHNIQUE_ONLY_KEYS.filter(k => keyIdx(k) >= 0).every(k => keyIdx(k) > labelIdx),
        adviceText: document.getElementById('advice-profile').textContent,
        adviceStars: document.querySelectorAll('#advice-profile .chip-with-stars').length
      };
    });
    assert.equal(layout.label, 'Of kies een gietstijl');
    assert.ok(layout.flavorBefore, 'smaakrichtingen staan boven het gietstijl-label');
    assert.ok(layout.styleAfter, 'gietstijlen staan eronder');
    assert.match(layout.adviceText, /Of kies een gietstijl/);
    assert.doesNotMatch(layout.adviceText, /\d+%/, 'geen percentage meer naast de sterren');
    assert.ok(layout.adviceStars >= 1, 'de sterren blijven de ene schaal');
    await page.close();
  });

  // NIEUW (audit BC-14/BC-25): geen stille verliezen en een eerlijke eerste indruk.
  describe('Audit: bevestigen, ongedaan maken en eerste start', () => {
    const BEAN = { id:'bean-au', name:'Audit Boon', roastLevel:'medium', profileKey:'klassiek', process:'washed', flavorNotes:[], addedAt:1, doseUsedG:0 };
    async function seeded(beans){
      const page = await newTrackedPage();
      await page.addInitScript((beans) => {
        if (sessionStorage.getItem('au')) return;
        sessionStorage.setItem('au', '1');
        if (beans) localStorage.setItem('brewconsole_beans', JSON.stringify(beans));
      }, beans || null);
      await page.goto(FILE_URL, { waitUntil: 'load' });
      return page;
    }

    test('eerste start zegt "Welkom" (ook met alleen een boon), na een brouwsel "Welkom terug"', async () => {
      let page = await seeded(null);
      assert.equal((await page.locator('#home-title').textContent()).trim(), 'Welkom');
      await page.close();
      // Sprint 1 (UX-review F3): alleen een boon invoeren is nog geen "terug".
      page = await seeded([BEAN]);
      assert.equal((await page.locator('#home-title').textContent()).trim(), 'Welkom');
      await page.close();
      page = await newTrackedPage();
      await page.addInitScript(() => {
        if (sessionStorage.getItem('au2')) return;
        sessionStorage.setItem('au2', '1');
        localStorage.setItem('brewConsoleLog', JSON.stringify([{ id:'w1', schemaVersion:5, timestamp:Date.now()-86400000, beanId:null, method:'v60', profile:'klassiek', roast:'medium', waterMl:300, bypass:false, scores:{aroma:3}, note:'', doseG:17.3, ratioText:'1:17,4' }]));
      });
      await page.goto(FILE_URL, { waitUntil: 'load' });
      assert.equal((await page.locator('#home-title').textContent()).trim(), 'Welkom terug');
      await page.close();
    });

    test('Reset tijdens een lopend brouwsel vraagt eerst; "Nee" laat het brouwsel doorlopen', async () => {
      const page = await seeded(null);
      await page.click('.navbar [data-nav="method"]');
      await page.click('[data-method="v60"]');
      await page.click('#roast-grid [data-roast] >> nth=0');
      await page.click('#profile-grid [data-profile="klassiek"]');
      await page.click('#start-btn');
      await page.clock.fastForward('00:20');
      await page.click('#reset-btn');
      assert.equal(await page.locator('#confirm-modal').isVisible(), true);
      await page.click('#confirm-modal-cancel');
      const st = await page.evaluate(() => ({ brewing: isActiveBrewBrewing(), elapsed: timer.elapsed }));
      assert.equal(st.brewing, true, 'annuleren breekt het brouwsel niet af');
      assert.ok(st.elapsed >= 20);
      await page.close();
    });

    test('boon verwijderen kan ongedaan worden gemaakt, op dezelfde plek', async () => {
      const B2 = Object.assign({}, BEAN, { id:'bean-au2', name:'Tweede Boon' });
      const page = await seeded([BEAN, B2]);
      await page.click('.navbar [data-nav="beans"]');
      await page.click('[data-del="bean-au"]');
      assert.match(await page.locator('#undo-bar').innerText(), /Audit Boon verwijderd/);
      assert.deepEqual(await page.evaluate(() => beanLibrary.map(b => b.id)), ['bean-au2']);
      await page.click('#undo-bar-btn');
      assert.deepEqual(await page.evaluate(() => beanLibrary.map(b => b.id)), ['bean-au', 'bean-au2']);
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('brewconsole_beans')).map(b => b.id)), ['bean-au', 'bean-au2'], 'ook opgeslagen');
      await page.close();
    });
  });

  // NIEUW (audit BC-12/BC-25): interne codes, bestandsnamen en functienamen horen niet in de
  // UI. Loopt elk profiel × branding × methode langs (V60 ook met bypass), inclusief
  // ingeklapte uitleg (textContent i.p.v. innerText).
  describe('Audit: geen interne codes of Engelse labels op het receptscherm', () => {
    const LEAKS = [
      [/\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b/, 'engine-code (bv. RESEARCH_GAP)'],
      [/bevinding\s+[A-Z]-\d/i, 'auditbevinding-ID'],
      [/\b[a-z]+[A-Z][A-Za-z]*\(\)/, 'JS-functienaam'],
      [/\bG-[A-Z-]+-\d+/, 'gap-ID'],
      [/\.md\b/, 'bestandsnaam'],
      [/\bPour \d|\bHoofdpour\b|\bmedium fine\b/i, 'Engels stap-/maallabel']
    ];
    test('alle profielen, brandingen en methodes', async () => {
      const page = await newTrackedPage();
      await page.goto(FILE_URL, { waitUntil: 'load' });
      const combos = await page.evaluate(() => {
        const out = [];
        for (const m of ['v60', 'chemex']) for (const r of ['light', 'medium', 'dark'])
          for (const p of Object.keys(PROFILE_INFO)) if (!PROFILE_INFO[p].methodOnly || PROFILE_INFO[p].methodOnly === m) out.push([m, r, p]);
        return out;
      });
      const problems = [];
      for (const [m, r, p] of combos){
        const texts = await page.evaluate(([m, r, p]) => {
          selectMethod(m); selectRoast(r); selectProfile(p);
          const t = [document.getElementById('screen-prep').textContent];
          const byp = document.querySelector('[data-bypass-pct="30"]');
          if (m === 'v60' && byp){ byp.click(); t.push(document.getElementById('screen-prep').textContent); document.querySelector('[data-bypass-pct="0"]').click(); }
          return t;
        }, [m, r, p]);
        for (const text of texts) for (const [re, what] of LEAKS){
          const hit = text.match(re);
          if (hit) problems.push(`${m}/${r}/${p}: ${what} "${hit[0]}"`);
        }
      }
      assert.deepEqual([...new Set(problems)], []);
      await page.close();
    });
  });

  // NIEUW (UX-review, Sprint 1): het advies in beeld, één hoofdactie na afloop, geen
  // misleidende terugknoppen en tikdoelen van minimaal 44 px — op telefoonformaat.
  describe('Sprint 1: quick wins uit de UX-review', () => {
    const PHONE = { viewport: { width: 390, height: 844 } };
    const BEAN = { id:'bean-s1', name:'Sprint Boon', roastLevel:'light', profileKey:'klassiek', process:'washed', flavorNotes:[], addedAt:1, doseUsedG:0 };
    async function phonePage(beans){
      const page = await newTrackedPage(PHONE);
      await page.addInitScript((beans) => {
        if (sessionStorage.getItem('s1')) return;
        sessionStorage.setItem('s1', '1');
        if (beans) localStorage.setItem('brewconsole_beans', JSON.stringify(beans));
      }, beans || null);
      await page.goto(FILE_URL, { waitUntil: 'load' });
      return page;
    }
    async function brewToDone(page){
      await page.click('.navbar [data-nav="method"]');
      await page.click('#advisor-link');
      await page.click('[data-bean-pick="bean-s1"]');
      await page.click('#advice-batch [data-adv-batch="single"]');
      await page.click('#advice-cta');
      await assertBecomesActive(page, '#screen-prep');
      await page.click('#start-btn');
      await assertBecomesActive(page, '#screen-brew');
      await page.clock.fastForward('03:20');
      await page.click('#bed-dry-btn');
    }

    test('na bed droog: geen ▶, × Stop of lege pil — "Proeven & loggen" is de hoofdknop; ↻ brengt ▶ terug', async () => {
      const page = await phonePage([BEAN]);
      await brewToDone(page);
      assert.equal(await page.locator('#pause-btn').isVisible(), false, '▶ heeft na afloop geen functie');
      assert.equal(await page.locator('#stop-btn').isVisible(), false, '× Stop hoort niet bij een klaar brouwsel');
      assert.equal(await page.locator('#next-info').isVisible(), false, 'geen lege pil onder "Bed droog na …"');
      const open = page.locator('#brewlog-open-btn');
      assert.equal(await open.isVisible(), true);
      assert.ok(await open.evaluate(el => el.classList.contains('start-btn')), 'loggen is de primaire knop');
      assert.equal((await open.textContent()).trim(), 'Proeven & loggen →');
      assert.equal(await page.locator('#home-btn').isVisible(), true);
      await page.click('#reset-btn');
      assert.equal(await page.locator('#pause-btn').isVisible(), true, 'na ↻ kun je weer starten');
      assert.equal(await page.locator('#stop-btn').isVisible(), true);
      await page.close();
    });

    test('na "Loggen opslaan" staan de bevestiging en het advies in beeld, boven de tabbalk', async () => {
      const page = await phonePage([BEAN]);
      await brewToDone(page);
      await page.click('#brewlog-open-btn');
      await assertBecomesActive(page, '#screen-brewlog');
      assert.ok(await page.locator('#brewlog-save-btn').evaluate(el => el.classList.contains('start-btn')), 'opslaan is de primaire knop');
      await page.click('#actuals-planned-btn');
      await answerTasting(page, { strength: 'just_right', acidity: 'sharp', finish: 'hollow', liking: '2' });
      await page.click('#brewlog-save-btn');
      await page.waitForFunction(() => {
        const card = document.getElementById('reco-card');
        const nav = document.getElementById('navbar');
        if (!card || card.hidden) return false;
        const c = card.getBoundingClientRect();
        const navTop = nav && !nav.hidden ? nav.getBoundingClientRect().top : window.innerHeight;
        return c.top >= 0 && c.bottom <= navTop;
      }, null, { timeout: 5000 });
      assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'brewlog-saved-msg', 'focus op de bevestiging');
      assert.equal(await page.locator('#reco-apply-btn').isVisible(), true);
      await page.close();
    });

    test('via de tabbalk geen terugknop op Bonen/Geschiedenis; via een link binnen de app wel', async () => {
      const page = await phonePage([BEAN]);
      const backVisible = (screen) => page.locator(`#screen-${screen} > .back-btn`).isVisible();
      await page.click('.navbar [data-nav="beans"]');
      await assertBecomesActive(page, '#screen-beans');
      assert.equal(await backVisible('beans'), false, 'Bonen via de tab = hoofdscherm');
      await page.click('.navbar [data-nav="brewlog-history"]');
      await assertBecomesActive(page, '#screen-brewlog-history');
      assert.equal(await backVisible('brewlog-history'), false, 'Geschiedenis via de tab = hoofdscherm');
      await page.click('.navbar [data-nav="method"]');
      await page.click('#beans-link');
      await assertBecomesActive(page, '#screen-beans');
      assert.equal(await backVisible('beans'), true, 'via "Bonen beheren" blijft "← Methode" staan');
      await page.close();
    });

    test('elke zichtbare knop, link en invoer op de hoofdschermen is minstens 44 × 44 px', async () => {
      const page = await phonePage([BEAN]);
      const problems = [];
      for (const nav of ['home', 'beans', 'method', 'brewlog-history', 'settings']){
        await page.click(`.navbar [data-nav="${nav}"]`);
        await page.waitForTimeout(100);
        const small = await page.evaluate(() => [...document.querySelectorAll('.screen.active button, .screen.active a, .screen.active input, .screen.active select, .screen.active summary, #theme-toggle')]
          .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && (r.width < 43.5 || r.height < 43.5); })
          .map(el => `${el.id || el.className} ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`));
        for (const x of small) problems.push(`${nav}: ${x}`);
      }
      assert.deepEqual([...new Set(problems)], []);
      await page.close();
    });

    test('woordkeuze: Nederlands in plaats van "Brew Intelligence"/"Start brew"/"Pour-over"', async () => {
      const page = await phonePage([BEAN]);
      await page.click('.navbar [data-nav="method"]');
      await page.click('[data-method="v60"]');
      await page.click('#roast-grid [data-roast] >> nth=0');
      await page.click('#profile-grid [data-profile="klassiek"]');
      await assertBecomesActive(page, '#screen-prep');
      const prep = await page.locator('#screen-prep').innerText();
      assert.doesNotMatch(prep, /Brew Intelligence|Start brew/i);
      assert.match(prep, /Waarom dit recept\?/);
      assert.match((await page.locator('#start-btn').textContent()).trim(), /^Start · \d+:\d\d$/, 'Sprint 3: Start noemt de schemalengte');
      await page.click('#start-btn');
      assert.doesNotMatch(await page.locator('#screen-brew').innerText(), /pour-over/i);
      await page.close();
    });
  });

  // NIEUW (UX-review, Sprint 2 + 4): Home als "je volgende kop", de Zet-knop in het midden
  // van de tabbalk, de proefkaart als stepper en het advies als eigen scherm.
  describe('Sprint 2 + 4: volgende kop, navigatie, stepper en adviesscherm', () => {
    const PHONE = { viewport: { width: 390, height: 844 } };
    const BEAN = { id:'bean-s2', name:'Stepper Boon', roastLevel:'light', profileKey:'klassiek', process:'washed', flavorNotes:[], addedAt:1, doseUsedG:0, bagSizeG:250 };
    async function phonePage(){
      const page = await newTrackedPage(PHONE);
      await page.addInitScript((bean) => {
        if (sessionStorage.getItem('s24')) return;
        sessionStorage.setItem('s24', '1');
        localStorage.setItem('brewconsole_beans', JSON.stringify([bean]));
      }, BEAN);
      await page.goto(FILE_URL, { waitUntil: 'load' });
      return page;
    }
    async function brewToCard(page){
      await page.click('.navbar [data-nav="method"]');
      await page.click('#advisor-link');
      await page.click('[data-bean-pick="bean-s2"]');
      await page.click('#advice-batch [data-adv-batch="single"]');
      await page.click('#advice-cta');
      await assertBecomesActive(page, '#screen-prep');
      await page.click('#start-btn');
      await page.clock.fastForward('03:20');
      await page.click('#bed-dry-btn');
      await page.click('#brewlog-open-btn');
      await assertBecomesActive(page, '#screen-brewlog');
    }
    const visibleSteps = (page) => page.evaluate(() => [...document.querySelectorAll('#tasting-card .tasting-step')].filter(b => !b.hidden).map(b => b.dataset.stepKey));

    test('tabbalk: Home · Bonen · Zet · Logboek · Instellingen, Zet met label', async () => {
      const page = await phonePage();
      const labels = await page.locator('.navbar .navbar-btn span:last-child').allTextContents();
      assert.deepEqual(labels.map(t => t.trim()), ['Home', 'Bonen', 'Zet', 'Logboek', 'Instellingen']);
      assert.equal(await page.getAttribute('.navbar [data-nav="method"]', 'aria-label'), 'Zet een kop');
      await page.close();
    });

    test('eerste start: geen "volgende kop"-kaart, wel de sfeerfoto', async () => {
      const page = await phonePage();
      assert.equal(await page.locator('#home-next-cup').isVisible(), false);
      assert.equal(await page.locator('#home-hero').isVisible(), true);
      await page.close();
    });

    test('proefkaart: één vraag tegelijk, automatisch door bij één keuze, afdronk via Volgende', async () => {
      const page = await phonePage();
      await brewToCard(page);
      assert.deepEqual(await visibleSteps(page), ['strength']);
      assert.match(await page.locator('#tasting-progress-label').textContent(), /Vraag 1 van 4 · Sterkte/);
      assert.equal(await page.locator('#tasting-prev').isVisible(), false);
      await page.click('[data-t-q="strength"][data-t-v="just_right"]');
      assert.deepEqual(await visibleSteps(page), ['acidity'], 'na een keuze door naar zuur');
      assert.match(await page.locator('#tasting-progress-label').textContent(), /Vraag 2 van 4/);
      await page.click('[data-t-q="acidity"][data-t-v="sharp"]');
      await page.click('[data-t-q="finish"][data-t-v="hollow"]');
      assert.deepEqual(await visibleSteps(page), ['finish'], 'afdronk is meerkeuze: blijft staan');
      await page.click('#tasting-next');
      assert.deepEqual(await visibleSteps(page), ['liking']);
      assert.equal(await page.locator('#tasting-next').isVisible(), false, 'laatste vraag: geen Volgende');
      await page.click('#tasting-prev');
      assert.deepEqual(await visibleSteps(page), ['finish']);
      assert.equal(await page.getAttribute('[data-t-q="finish"][data-t-v="hollow"]', 'data-selected'), 'true', 'terug houdt het antwoord');
      assert.equal(await page.locator('#brewlog-more').evaluate(el => el.open), false, '"Meer meten" standaard dicht');
      await page.close();
    });

    test('na opslaan met een stap: adviesscherm met Nu → Volgende; proefkaart één tik terug', async () => {
      const page = await phonePage();
      await brewToCard(page);
      const start = await page.evaluate(() => state.recipe.grindStartingPoint);
      await page.click('#actuals-planned-btn');
      await answerTasting(page, { strength: 'just_right', acidity: 'sharp', finish: 'hollow', liking: '2' });
      await page.click('#brewlog-save-btn');
      assert.equal(await page.getAttribute('#screen-brewlog', 'data-mode'), 'result');
      assert.equal(await page.locator('#tasting-card').isVisible(), false);
      assert.equal(await page.locator('#brewlog-save-btn').isVisible(), false);
      const tiles = (await page.locator('#reco-card .reco-fromto').innerText()).replace(/\s+/g, ' ');
      assert.match(tiles, new RegExp(`Nu klik ${start} → Volgende klik ${start - 1}`, 'i'));
      assert.ok(await page.locator('#reco-apply-btn').evaluate(el => el.classList.contains('start-btn')), 'gebruiken is de hoofdknop');
      await page.click('#brewlog-edit-btn');
      assert.equal(await page.getAttribute('#screen-brewlog', 'data-mode'), 'form');
      assert.equal(await page.locator('#tasting-card').isVisible(), true);
      await page.close();
    });

    test('onvolledig opgeslagen: het formulier blijft staan met wat er nog open is', async () => {
      const page = await phonePage();
      await brewToCard(page);
      await page.click('#brewlog-save-btn');
      assert.equal(await page.getAttribute('#screen-brewlog', 'data-mode'), 'form');
      assert.match(await page.locator('#reco-card').innerText(), /Nog geen advies/);
      assert.equal(await page.locator('#tasting-card').isVisible(), true);
      await page.close();
    });

    test('toegepast advies → Home toont "je volgende kop" met voorraad in koppen; starten zet de stap klaar', async () => {
      const page = await phonePage();
      await brewToCard(page);
      const start = await page.evaluate(() => state.recipe.grindStartingPoint);
      await page.click('#actuals-planned-btn');
      await answerTasting(page, { strength: 'just_right', acidity: 'sharp', finish: 'hollow', liking: '2' });
      await page.click('#brewlog-save-btn');
      await page.click('#reco-apply-btn');
      await page.click('#brewlog-home-btn');
      await assertBecomesActive(page, '#screen-home');
      const card = await page.locator('#home-next-cup').innerText();
      assert.match(card, /Je volgende kop · advies klaar/i);
      assert.match(card, /Stepper Boon · V60/);
      assert.match(card, new RegExp(`Maal 1 klik fijner \\(klik ${start} → ${start - 1}\\)`));
      assert.match(card, /g over · ± \d+ koppen/);
      assert.equal(await page.locator('#home-hero').isVisible(), false, 'de kaart is het hoofdonderwerp');
      await page.click('.navbar [data-nav="method"]');
      assert.equal(await page.locator('#method-next-cup').isVisible(), true, 'ook bovenaan het Zet-scherm');
      await page.click('.navbar [data-nav="home"]');
      await page.click('[data-next-cup-go="bean-s2"]');
      await assertBecomesActive(page, '#screen-prep');
      assert.match(await page.locator('#prep-next-adjust').innerText(), new RegExp(`Maal op klik ${start - 1}`));
      await page.close();
    });

    test('"Zonder deze stap zetten" laat de stap vallen (niet toegepast) en opent het gewone recept', async () => {
      const page = await phonePage();
      await brewToCard(page);
      await page.click('#actuals-planned-btn');
      await answerTasting(page, { strength: 'just_right', acidity: 'sharp', finish: 'hollow', liking: '2' });
      await page.click('#brewlog-save-btn');
      await page.click('#reco-apply-btn');
      await page.click('#brewlog-home-btn');
      await page.click('[data-next-cup-skip="bean-s2"]');
      await assertBecomesActive(page, '#screen-prep');
      assert.equal(await page.locator('#prep-next-adjust').isVisible(), false);
      assert.equal(await page.evaluate(() => beanLibrary.find(b => b.id === 'bean-s2').pendingAdjust || null), null);
      const recs = await page.evaluate(() => JSON.parse(localStorage.getItem('brewconsole_brews') || '[]'));
      assert.equal(recs[0].recommendation.status, 'ignored');
      await page.close();
    });
  });

  // NIEUW (UX-review, Sprint 3): het receptscherm — vier heldengetallen, water één keer (met
  // −/+ in de tegel), een klaargezette stap zichtbaar in de tegel, en Start altijd in beeld.
  describe('Sprint 3: receptscherm', () => {
    const PHONE = { viewport: { width: 390, height: 844 } };
    const BEAN = { id:'bean-s3', name:'Recept Boon', roastLevel:'light', profileKey:'klassiek', process:'washed', flavorNotes:[], addedAt:1, doseUsedG:0, bagSizeG:250 };
    async function toPrep(){
      const page = await newTrackedPage(PHONE);
      await page.addInitScript((bean) => {
        if (sessionStorage.getItem('s3')) return;
        sessionStorage.setItem('s3', '1');
        localStorage.setItem('brewconsole_beans', JSON.stringify([bean]));
      }, BEAN);
      await page.goto(FILE_URL, { waitUntil: 'load' });
      await page.click('.navbar [data-nav="method"]');
      await page.click('#advisor-link');
      await page.click('[data-bean-pick="bean-s3"]');
      await page.click('#advice-batch [data-adv-batch="single"]');
      await page.click('#advice-cta');
      await assertBecomesActive(page, '#screen-prep');
      return page;
    }

    test('vier heldengetallen vooraan; water staat er één keer, met −/+ in de tegel', async () => {
      const page = await toPrep();
      const labels = await page.locator('#stats-grid .stat-block--hero .stat-label').allTextContents();
      assert.deepEqual(labels.map(t => t.trim()), ['Gemalen koffie', 'Water', 'Maalgraad', 'Watertemperatuur']);
      assert.equal(await page.locator('#screen-prep .serving-row').count(), 0, 'geen losse waterregel meer');
      const before = await page.evaluate(() => state.waterMl);
      await page.click('#serving-plus');
      assert.equal(await page.evaluate(() => state.waterMl), before + 50);
      assert.equal((await page.locator('#serving-value').textContent()).trim(), `${before + 50} ml`);
      await page.click('#serving-minus');
      assert.equal(await page.evaluate(() => state.waterMl), before);
      await page.click('#stats-water-open');
      assert.equal(await page.locator('#water-modal').isVisible(), true, 'het getal opent de water-modal');
      await page.close();
    });

    test('Start is zonder scrollen zichtbaar, boven de tabbalk, en noemt de schemalengte', async () => {
      const page = await toPrep();
      const box = await page.evaluate(() => {
        const s = document.getElementById('start-btn').getBoundingClientRect();
        const z = document.querySelector('.navbar-btn--zet svg').getBoundingClientRect();
        return { top: s.top, bottom: s.bottom, zetTop: z.top, vh: innerHeight };
      });
      assert.ok(box.top >= 0 && box.bottom <= box.zetTop, `Start in beeld boven de Zet-knop: ${JSON.stringify(box)}`);
      const total = await page.evaluate(() => fmtTime(state.recipe.totalTime));
      assert.equal((await page.locator('#start-btn').textContent()).trim(), `Start · ${total}`);
      assert.equal(await page.locator('#why-recipe-details').getAttribute('open'), null);
      assert.equal(await page.locator('#prep-tips-details').getAttribute('open'), null);
      await page.close();
    });

    test('een klaargezette maalstap staat in de tegel: "Klik 14 · was 15", het engine-recept blijft gelijk', async () => {
      const page = await toPrep();
      const start = await page.evaluate(() => state.recipe.grindStartingPoint);
      await page.click('#start-btn');
      await page.clock.fastForward('03:20');
      await page.click('#bed-dry-btn');
      await page.click('#brewlog-open-btn');
      await page.click('#actuals-planned-btn');
      await answerTasting(page, { strength: 'just_right', acidity: 'sharp', finish: 'hollow', liking: '2' });
      await page.click('#brewlog-save-btn');
      await page.click('#reco-apply-btn');
      await page.click('#brewlog-home-btn');
      await page.click('[data-next-cup-go="bean-s3"]');
      await assertBecomesActive(page, '#screen-prep');
      const grind = page.locator('#stats-grid .stat-block', { hasText: 'Maalgraad' });
      assert.ok(await grind.evaluate(el => el.classList.contains('stat-block--adjusted')));
      assert.equal((await grind.locator('.stat-value').textContent()).trim(), `Klik ${start - 1}`);
      assert.match(await grind.innerText(), new RegExp(`was ${start} · stap uit je vorige kop`));
      assert.equal(await page.evaluate(() => state.recipe.grindStartingPoint), start, 'alleen de weergave, niet het engine-recept');
      await page.close();
    });
  });

  // NIEUW (UX-review, Sprint 6): het logboek per boon — stippen per kop, wat je probeerde, en
  // je beste kop met één knop opnieuw zetten.
  describe('Sprint 6: logboek per boon', () => {
    const PHONE = { viewport: { width: 390, height: 844 } };
    const BEAN = { id:'bean-s6', name:'Logboek Boon', roastLevel:'light', profileKey:'klassiek', process:'washed', flavorNotes:[], addedAt:1, doseUsedG:0, bagSizeG:250 };
    async function phonePage(){
      const page = await newTrackedPage(PHONE);
      await page.addInitScript((bean) => {
        if (sessionStorage.getItem('s6')) return;
        sessionStorage.setItem('s6', '1');
        localStorage.setItem('brewconsole_beans', JSON.stringify([bean]));
      }, BEAN);
      await page.goto(FILE_URL, { waitUntil: 'load' });
      return page;
    }
    async function cup(page, answers, { apply = false, viaHome = false } = {}){
      if (viaHome){
        await page.click('.navbar [data-nav="home"]');
        await page.click('[data-next-cup-go="bean-s6"]');
      } else {
        await page.click('.navbar [data-nav="method"]');
        await page.click('#advisor-link');
        await page.click('[data-bean-pick="bean-s6"]');
        await page.click('#advice-batch [data-adv-batch="single"]');
        await page.click('#advice-cta');
      }
      await assertBecomesActive(page, '#screen-prep');
      await page.click('#start-btn');
      await page.clock.fastForward('03:20');
      await page.click('#bed-dry-btn');
      await page.click('#brewlog-open-btn');
      await page.click('#actuals-planned-btn');
      await answerTasting(page, answers);
      await page.click('#brewlog-save-btn');
      if (apply) await page.click('#reco-apply-btn');
    }

    test('één groep per boon met stippen, de adviesketen en de beste kop', async () => {
      const page = await phonePage();
      await cup(page, { strength: 'just_right', acidity: 'sharp', finish: 'hollow', liking: '2' }, { apply: true });
      await cup(page, { strength: 'just_right', acidity: 'lively', finish: 'sweet_clean', liking: '5', vsLast: 'better' }, { viaHome: true });
      await page.click('.navbar [data-nav="brewlog-history"]');
      await assertBecomesActive(page, '#screen-brewlog-history');
      const group = page.locator('[data-history-group="bean-s6"]');
      assert.equal(await group.count(), 1);
      assert.match(await group.locator('.history-group-sub').textContent(), /V60 · 2 koppen/);
      assert.deepEqual(await group.locator('.cup-dot').evaluateAll(els => els.map(e => e.dataset.l)), ['2', '5'], 'oud → nieuw');
      const chain = await group.locator('.advice-chain').innerText();
      assert.match(chain, /Kop 1 · 2\/5 → Maal 1 klik fijner/);
      assert.match(chain, /getest: beter/);
      assert.match(await group.locator('.history-best').innerText(), /Beste kop: 5\/5/);
      assert.equal(await group.locator('.brewlog-entry-card').count(), 2, 'de koppen staan eronder');
      await page.close();
    });

    test('"Zet je beste kop opnieuw" opent het recept met methode en water van die kop, plus de stand van toen', async () => {
      const page = await phonePage();
      await cup(page, { strength: 'just_right', acidity: 'lively', finish: 'sweet_clean', liking: '5' });
      await page.click('.navbar [data-nav="brewlog-history"]');
      const bestId = await page.getAttribute('[data-best-cup]', 'data-best-cup');
      const rec = await page.evaluate((id) => getBrewRecord(id), bestId);
      await page.click('[data-best-cup]');
      await assertBecomesActive(page, '#screen-prep');
      assert.equal(await page.evaluate(() => state.method), rec.plan.methodId);
      assert.equal(await page.evaluate(() => state.waterMl), rec.plan.waterMl);
      const ref = await page.locator('#prep-best-ref').innerText();
      assert.match(ref, /Je beste kop \(5\/5/);
      assert.match(ref, new RegExp(`klik ${rec.plan.grindStartingPoint}`));
      await page.close();
    });

    test('geen "beste kop" onder 4/5; meer dan drie koppen → de oudere onder "Eerdere koppen"', async () => {
      const page = await phonePage();
      for (let i = 0; i < 4; i++) await cup(page, { strength: 'just_right', acidity: 'lively', finish: 'hollow', liking: '3' });
      await page.click('.navbar [data-nav="brewlog-history"]');
      const group = page.locator('[data-history-group="bean-s6"]');
      assert.equal(await group.locator('.history-best').count(), 0);
      assert.equal(await group.locator('.history-group-cups .brewlog-entry-card').count(), 3);
      assert.match(await group.locator('.history-more > summary').textContent(), /Eerdere koppen \(1\)/);
      await page.close();
    });
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
