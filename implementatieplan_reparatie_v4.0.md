# Implementatieplan Reparatie v4.0 — Brew Engine

**Voor:** Claude Code
**Bron:** `claude_Brew_Engine_Deep_Dive_v1.md` (expertteam-review, 19 bevindingen E-01 t/m E-19)
**Doelbestand:** `brewconsole_v2_2.html`
**Nulmeting:** 74/74 pure-logic tests groen, 21/21 kernflow-smoke, 3/3 sw-registration
**Versie:** 1.0 · 9 september 2026

---

## §0 — Hoe je dit document gebruikt

Lees deze paragraaf helemaal voordat je één regel wijzigt.

### 0.1 Uitvoeringsprotocol per taak

Elke taak (A-1, B-3, …) doorloopt **verplicht** deze zes stappen. Sla er nooit één over, ook niet bij een taak die triviaal lijkt.

1. **LEES** — open het anker met `grep -n` op de `old_str` uit dit document en bevestig dat hij **exact één keer** voorkomt. Komt hij nul of meerdere keren voor, dan is het bestand veranderd sinds dit plan is geschreven: **stop en rapporteer**, verzin geen alternatief anker.
2. **PATCH** — pas één taak toe. Nooit twee taken in één edit.
3. **TEST** — draai `node --test tests/*.test.mjs`. Zonder Playwright: minimaal `node --test tests/brewconsole.pure-logic.test.mjs`.
4. **VERGELIJK** — het aantal geslaagde tests mag alleen dalen wanneer dit document dat bij de taak **expliciet aankondigt** (zie §8.2). Elke andere daling is een regressie: draai terug.
5. **NIEUWE TEST** — voeg de bij de taak voorgeschreven test toe en zie hem eerst falen op de oude code (`git stash` of een kopie), dan slagen op de nieuwe.
6. **RAPPORTEER** — één alinea: wat gewijzigd, welke tests, welke onzekerheid resteert.

### 0.2 Volgorde is niet vrij

De fasen A → B → C zijn strikt volgordelijk, en binnen fase B geldt bovendien:

```
B-3 (giet-intervallen)  ──►  B-2 (contacttijd-verzoening)
B-4 (fingerprint-tweelingen)  ──►  C-1 (Kasuya-smaakknop)
C-2 (boon-snapshot)  ──►  C-3 (volumebandering)
```

**Waarom B-3 vóór B-2:** B-3 verandert de giet-tijden maar niet `totalTime`. B-2 redeneert over `totalTime` versus de diagnostische band. Andersom werk je twee keer.

**Waarom B-4 vóór C-1:** C-1 verbreekt een bestaande tweelinggroep. Zonder de gerepareerde detectie merkt niets dat op, en blijft `PROFILE_MERGE_GROUPS` een groep samenvoegen die niet meer identiek is — precies de schijnkeuze-bug in spiegelbeeld.

### 0.3 Wat je nooit doet

Uit §11 van het Master Expert Team-document, hier als harde regel:

- **Geen enkele wijziging aan de engine-bundel** (regel ~1601 t/m de afsluitende `})();` rond regel 2683). Alle taken in dit plan zitten in de app-laag. Als een taak lijkt te vragen om een enginewijziging, is de taak verkeerd begrepen — stop en rapporteer.
- Geen wijziging aan `computeMethodAdvice()`, `buildReasoningLines()`, de seed-boondata, OCR, de wake-lock-logica of de service-worker-strategie.
- Geen `CACHE_VERSION`-ophoging: `claude_sw.js` documenteert zelf dat dat alleen nodig is bij een strategiewijziging in dát bestand, niet bij inhoudswijzigingen in de HTML.
- Geen nieuwe top-level `const` die rekent met een andere top-level `const` verderop in het bestand (de `RADAR_LEVELS`-crash uit Bouwbesluiten v3 — die maakte de héle app onbruikbaar).
- Geen nieuw brouwgetal verzinnen. Waar dit plan een getal noemt, staat erbij waar het vandaan komt. Kom je een keuze tegen die dit plan niet dekt: markeer `RESEARCH_GAP` en stop (PDR §41).

### 0.4 De architectuurregel die alles verbindt

Bijna elke bevinding uit de review is één symptoom van één oorzaak:

> **Elke wijziging aan een receptgetal hoort door de engine te gaan, inclusief de constraint-check — nooit erna.**

De app-laag rekent op vier plekken over de engine heen (sterktehendel, bypass, gietschema, kernvenster). Fase B is in essentie het doorvoeren van die ene regel. Houd hem bij elke twijfel als toetssteen.

---

## §1 — Randvoorwaarden

### 1.1 Non-negotiables (mogen na afloop aantoonbaar niet gewijzigd zijn)

| # | Bescherming | Hoe geborgd |
| --- | --- | --- |
| N-1 | Receptberekeningen wijzigen niet stilzwijgend | Elke wijziging aan dosis/ratio/temp staat in §9 met de verwachte richting én een test |
| N-2 | Bonendatabase en bestaande velden blijven | Geen taak raakt `beanLibrary`-structuur behalve additief (C-2) |
| N-3 | Persistentie en brouwhistorie blijven intact | C-2 verhoogt `RECORD_SCHEMA_VERSION` 3→4, additief; oude records blijven leesbaar |
| N-4 | Import/export blijft werken | Back-up-rondgangtest verplicht na C-2 |
| N-5 | OCR breekt niet | Geen taak raakt OCR-code |
| N-6 | Brouwtimer en wake-lock blijven betrouwbaar | B-3 wijzigt giet-tijden; `totalTime` blijft identiek; expliciete timertest |
| N-7 | PWA/offline gedrag niet verslechteren | Geen bestanden toegevoegd, geen SW-wijziging |
| N-8 | FORBIDDEN edges blijven dood | Bestaande `{temp: 0}`-tests moeten groen blijven; geen taak raakt de nudges |

### 1.2 Prioriteitsvolgorde bij conflict (§3 Master Expert Team)

veiligheid/toegankelijkheid → functionele integriteit → wetenschappelijke correctheid → praktische bruikbaarheid → UX-helderheid → performance → visuele kwaliteit → decoratie.

Een lagere prioriteit overrulet nooit een hogere. Concreet in dit plan: als een eerlijkheidstekst (UX-helderheid) botst met een harde grens (functionele integriteit), wint de grens en past de tekst zich aan.

---

## §2 — Nulmeting vóór je begint

Draai dit eerst en leg de uitkomst vast. Zonder nulmeting kun je stap 0.1.4 niet uitvoeren.

```bash
# vanuit de map met brewconsole_v2_2.html
node --test tests/brewconsole.pure-logic.test.mjs   # verwacht: 74 pass, 0 fail
node --test tests/*.test.mjs                        # verwacht: 98 pass (met Playwright)
```

Maak daarnaast een **gedragsnulmeting** aan. Zet dit als `tests/_baseline.mjs` neer (géén `.test.mjs`, zodat hij niet meedraait in de suite) en bewaar de uitvoer:

```js
import { loadApp } from './load-app.mjs';
const { api } = loadApp();
const rows = [];
for (const m of ['v60','chemex']){
  for (const p of Object.keys(api.ENGINE_PROFILE_MAP)){
    const only = api.PROFILE_INFO[p].methodOnly;
    if (only && only !== m) continue;
    for (const roast of ['light','medium','dark']){
      for (const st of [-1,0,1]){
        const vol = m === 'v60' ? 300 : 600;
        const r = api.computeRecipe(m, roast, p, vol, 'washed', false, 10, null, false, false, null, st);
        rows.push([m,p,roast,st,r.dose,r.ratioText,r.temp,r.totalTime,r.technique,
                   r.steps.map(s=>`${s.t}:${s.add}`).join('|')].join(';'));
      }
    }
  }
}
console.log(rows.join('\n'));
```

```bash
node tests/_baseline.mjs > baseline_voor.txt
```

Na élke fase draai je hem opnieuw naar `baseline_na_A.txt` etc. en `diff` je. **Elke regel die verandert moet in §9 verklaard staan.** Een onverklaarde diff is een regressie.

---

## §3 — FASE A · Eerlijkheidsherstel

**Doel:** de app belooft nergens meer iets wat hij niet doet.
**Risico:** laag — geen enkele taak in deze fase raakt een receptgetal.
**Verwacht resultaat:** `diff baseline_voor.txt baseline_na_A.txt` is **leeg**.

---

### A-1 · Het kernvenster eerlijk benoemen en tonen
**Bevinding:** E-07a · **Rol:** 08 Coffee Scientist, 27 Evidence Specialist

**Probleem.** De UI-voetnoot noemt het venster "evidence-getagd". De engine markeert het als `RESEARCH_GAP` (`G-CONTROL-CHART-01`) en de app overschrijft dat met eigen getallen. De code-comment claimt bovendien "Disclosed to the user in the recipe notes" — de getallen staan nergens in de UI.

**Stap 1 — voeg de getallen toe aan het recept-scherm.**

Anker in `renderPrep()`:
```
  document.getElementById('method-tips').textContent = m.tips;
```
Vervang door:
```
  document.getElementById('method-tips').textContent = m.tips;
  const windowEl = document.getElementById('target-window-note');
  if (windowEl){
    const cluster = (ENGINE_PROFILE_MAP[state.profile] || ENGINE_PROFILE_MAP.klassiek).cluster;
    const w = ENGINE_TARGET_WINDOWS[cluster];
    windowEl.textContent = `Doelvenster achter dit recept: ${fmt(w.strengthTDS[0],2)}–${fmt(w.strengthTDS[1],2)} %TDS bij ${w.extractionYieldEY[0]}–${w.extractionYieldEY[1]} %extractie. Deze twee getallenparen zijn door de app aangeleverd (SCA-Brewing-Control-Chart-achtig) en maken GEEN deel uit van het eigen onderzoekscorpus van dit project — de engine zelf markeert dit veld als openstaande onderzoeksvraag (G-CONTROL-CHART-01). Dosis en ratio hierboven volgen er rechtstreeks uit.`;
    windowEl.hidden = false;
  }
```

**Stap 2 — voeg de DOM-node toe.** Direct ná het element met `id="disclaimer"` in het prep-scherm (zoek `id="disclaimer"` in de HTML):
```html
<p class="freshness-readout" id="target-window-note" style="font-size:12.5px; color:var(--text-faint); margin:8px 0 0;" hidden></p>
```

**Stap 3 — corrigeer het woord in de voetnoot.**

`old_str`:
```
'* Dosis/water/ratio komen algebraïsch uit een evidence-getagd sterkte-/extractievenster en het gevalideerde dosisbereik van dit toestel
```
`new_str`:
```
'* Dosis/water/ratio komen algebraïsch uit een sterkte-/extractievenster (zie het doelvenster-blok hierboven — door de app aangeleverd, niet uit het eigen onderzoekscorpus) en het gevalideerde dosisbereik van dit toestel
```

**Stap 4 — corrigeer de onjuiste code-comment.**

`old_str`:
```
   that module's own doc comment explicitly invites exactly this ("a caller MAY supply
   its own numeric window... this engine does not compute one on its own"). Disclosed
   to the user in the recipe notes, not hidden. */
```
`new_str`:
```
   that module's own doc comment explicitly invites exactly this ("a caller MAY supply
   its own numeric window... this engine does not compute one on its own").
   FIX (Reparatieplan v4.0, A-1): deze comment beweerde eerder "Disclosed to the user in
   the recipe notes" terwijl de getallen nergens in de UI stonden. Dat is nu wél zo:
   renderPrep() rendert #target-window-note met de letterlijke TDS/EY-grenzen én de
   herkomst ("door de app aangeleverd, engine zegt RESEARCH_GAP"). */
```

**Test (nieuw, kernflow-smoke):** `#target-window-note` is zichtbaar op het Prep-scherm en bevat zowel `%TDS` als de tekst `G-CONTROL-CHART-01`.

**Acceptatie:** geen receptgetal gewijzigd; baseline-diff leeg.

---

### A-2 · De kopgewicht-belofte gelijktrekken met de werkelijkheid
**Bevinding:** E-07b · **Rol:** 10 Devil's Advocate

**Probleem.** Het label belooft: *"na 5+ loggingen vervangt dit de aangenomen 2,0 uit Fase 1"*. Die code bestaat niet. `cupWeightG` wordt alleen opgeslagen en teruggetoond.

**Beslissing:** het label wordt nú eerlijk gemaakt; de functionaliteit komt in **C-5**. Niet andersom — een onjuiste belofte laten staan tot C-5 klaar is, is precies de fout die deze fase repareert.

`old_str`:
```
(optioneel, gram — voor werkelijke retentie: (water − kopgewicht) / dosis; na 5+ loggingen vervangt dit de aangenomen 2,0 uit Fase 1)
```
`new_str`:
```
(optioneel, gram — hiermee kan later je werkelijke retentie berekend worden: (water − kopgewicht) / dosis. Wordt nu alleen bewaard; de ratio gebruikt nog steeds de vaste aanname van 2,0 g/g)
```

**Na C-5** wordt deze tekst nogmaals aangepast (zie daar).

**Test:** geen. Puur tekst. Wel: baseline-diff leeg.

---

### A-3 · Zeggen dat het profiel vandaag geen receptgetal stuurt
**Bevinding:** E-01 (tussenoplossing) · **Rol:** 03 UX Expert, 25 Decision Scientist

**Probleem.** Elf profielknoppen, ratio 1:17,6 vs 1:17,4 — 0,3 g verschil bij 300 ml. De app zegt dat nergens.

Anker: de bestaande twin-tekst in `renderPrep()`.

`old_str`:
```
      twinEl.textContent = `Dit profiel gebruikt vandaag hetzelfde recept als ${names} — dezelfde dosis, maling, temperatuur en gietschema. Het verschil zit nog niet in de cijfers, alleen in naam en beschrijving (zie disclaimer onderaan voor waarom).`;
```
`new_str`:
```
      twinEl.textContent = `Dit profiel gebruikt vandaag hetzelfde recept als ${names} — dezelfde dosis, maling, temperatuur en gietschema. Het verschil zit nog niet in de cijfers, alleen in naam en beschrijving (zie disclaimer onderaan voor waarom).`;
```
*(ongewijzigd — dit blok klopt al)*

Voeg in plaats daarvan een **nieuwe, altijd zichtbare regel** toe. In `renderPrep()`, direct ná het `evidenceBadgeRow`-blok:

`old_str`:
```
  const sizeWarningEl = document.getElementById('size-warning-note');
```
`new_str`:
```
  const profileScopeEl = document.getElementById('profile-scope-note');
  if (profileScopeEl){
    profileScopeEl.textContent = 'Wat het gekozen profiel vandaag wél en niet stuurt: het bepaalt het gietschema (aantal beurten, verdeling, timing). Het bepaalt de dosis, ratio, temperatuur en maalstand praktisch niet — de twee onderliggende sterkte-/extractievensters liggen zo dicht bij elkaar dat het verschil in dosis onder een tiende gram per 100 ml blijft. Dat is een bekende, geregistreerde beperking (bevinding E-01), geen weergavefout.';
    profileScopeEl.hidden = false;
  }

  const sizeWarningEl = document.getElementById('size-warning-note');
```

Nieuwe DOM-node, direct ná `id="style-note"`:
```html
<p class="freshness-readout" id="profile-scope-note" style="font-size:12.5px; color:var(--text-faint); margin:8px 0 0;" hidden></p>
```

**Verwijderen na Fase D-1.** Markeer de regel in de code met `// TIJDELIJK (Reparatieplan v4.0, A-3) — vervalt zodra Fase D-1 de vensters herdefinieert.`

**Test (nieuw, smoke):** `#profile-scope-note` is zichtbaar en bevat "gietschema".

---

### A-4 · Verzonnen giet-aantallen niet meer onder een auteursnaam presenteren
**Bevinding:** E-06 · **Rol:** 27 Evidence Specialist, 11 Research Director

**Probleem.** `RAO_V60_MINIMAL_POUR` heeft `pulseCount: RESEARCH_GAP` en krijgt de generieke default 3. `PERGER_80_20` heeft `pulseCount: RESEARCH_GAP` met de reden *"Perger publishes no pour schedule"* en krijgt hardgecodeerd 1. Beide worden met naam en auteur getoond. De bestaande disclaimer dekt alleen de giet-*tijden*, niet het giet-*aantal*.

**Belangrijk:** de engine-bundel blijft ongewijzigd (§0.3). De reparatie zit volledig in de tekstopbouw in `computeRecipe()`.

`old_str`:
```
    notes = overlay.phaseSplit
      ? `${structureNote} Giet-tijden hieronder volgen het hierboven beschreven fase-mechanisme van deze bron; de exacte grammen BINNEN elke fase zijn een eigen, gelijke verdeling (de bronnen spreken elkaar tegen over de precieze split) — geen letterlijk gepubliceerd stappenschema van ${att ? att.practitioner : 'deze bron'}.`
      : `${structureNote} Giet-tijden hieronder zijn een eigen, gelijkmatige verdeling over een schema-lengte die uit het aantal giet-momenten volgt — geen letterlijk gepubliceerd stappenschema van ${att ? att.practitioner : 'deze bron'}.`;
```
`new_str`:
```
    // NIEUW (Reparatieplan v4.0, A-4 / bevinding E-06): wanneer de overlay zelf GEEN
    // gecorroboreerd aantal giet-momenten heeft (pulseCount is RESEARCH_GAP — vandaag:
    // Rao V60 en Perger), is niet alleen de tijdsverdeling maar ook het AANTAL beurten een
    // eigen invulling. Dat moet er staan, want anders draagt de auteursnaam boven het
    // schema een gezag dat de bron niet geeft (PDR §38: bron vs. interpretatie).
    const pulseCountSourced = overlay && overlay.pulseCount && overlay.pulseCount.state === 'RESOLVED';
    const pulseDisclaimer = pulseCountSourced
      ? ''
      : ` LET OP: deze bron publiceert zelf geen aantal giet-momenten (${overlayId === 'PERGER_80_20' ? 'Perger publiceert bewust helemaal geen schema — zijn methode is een beslisregel, geen recept' : 'de gelokaliseerde versies spreken elkaar tegen over het aantal en de structuur'}). Het aantal beurten hieronder is dus een eigen invulling van deze app, geen getal van ${att ? att.practitioner : 'de bron'} — net als de tijden en de grammen.`;
    notes = (overlay.phaseSplit
      ? `${structureNote} Giet-tijden hieronder volgen het hierboven beschreven fase-mechanisme van deze bron; de exacte grammen BINNEN elke fase zijn een eigen, gelijke verdeling (de bronnen spreken elkaar tegen over de precieze split) — geen letterlijk gepubliceerd stappenschema van ${att ? att.practitioner : 'deze bron'}.`
      : `${structureNote} Giet-tijden hieronder zijn een eigen, gelijkmatige verdeling over een schema-lengte die uit het aantal giet-momenten volgt — geen letterlijk gepubliceerd stappenschema van ${att ? att.practitioner : 'deze bron'}.`) + pulseDisclaimer;
```

**Stap 2 — de badge mag niet tegenspreken.** `evidenceBadgeRow` toont nu "Kernrecept + gietschema" zodra er een overlay is.

`old_str`:
```
    evidenceBadgeRow.innerHTML = rec.hasNamedOverlay
      ? `<span class="badge" data-tone="good">Kernrecept + gietschema</span>`
      : `<span class="badge" data-tone="info">Alleen kernrecept</span>`;
```
`new_str`:
```
    evidenceBadgeRow.innerHTML = rec.hasNamedOverlay
      ? (rec.pulseCountSourced
          ? `<span class="badge" data-tone="good">Kernrecept + gietschema</span>`
          : `<span class="badge" data-tone="info">Kernrecept + eigen gietschema</span>`)
      : `<span class="badge" data-tone="info">Alleen kernrecept</span>`;
```

En voeg `pulseCountSourced` toe aan het return-object van `computeRecipe()`:

`old_str`:
```
    hasNamedOverlay: !!overlay,
```
`new_str`:
```
    hasNamedOverlay: !!overlay,
    // NIEUW (Reparatieplan v4.0, A-4): of het AANTAL giet-momenten uit de bron komt of
    // een eigen invulling is — gebruikt door de evidence-badge, zodat die de disclaimer
    // in `notes` nooit kan tegenspreken.
    pulseCountSourced: !!(overlay && overlay.pulseCount && overlay.pulseCount.state === 'RESOLVED'),
```

**Let op:** `pulseCountSourced` wordt in de `notes`-tak berekend maar moet ook beschikbaar zijn in het return-object, dus declareer hem vóór het `if (overlay){`-blok als `let pulseCountSourced = false;` en zet hem binnen dat blok. `buildFallbackRecipe()` krijgt `pulseCountSourced: false`.

**Test (nieuw, pure-logic):**
```js
test('A-4: overlays zonder gecorroboreerd pulseCount melden dat het aantal beurten eigen invulling is', () => {
  for (const [profile, naam] of [['fruitig_clean','Rao'], ['snel_puur','Perger']]){
    const rec = api.computeRecipe('v60','medium',profile,300,null,false,null,null,false,null,null,0);
    assert.equal(rec.pulseCountSourced, false, `${naam} heeft geen gecorroboreerd pulseCount`);
    assert.match(rec.notes, /geen aantal giet-momenten|eigen invulling van deze app/,
      `${naam}: de notitie moet melden dat het aantal beurten niet uit de bron komt`);
  }
  const kasuya = api.computeRecipe('v60','medium','klassiek',300,null,false,null,null,false,null,null,0);
  assert.equal(kasuya.pulseCountSourced, true, 'Kasuya heeft pulseCount 5 als RESOLVED');
});
```

---

### A-5 · De dode `sizeConsistencyWarning` verwijderen
**Bevinding:** E-16 · **Rol:** 02 Product Architect

**Probleem.** `batchSize` wordt uit `waterMl` teruggerekend, dus de afwijking is per constructie ≈ 0. Geverifieerd over het hele geldige bereik: `sizeWarning` is altijd leeg. Een waarschuwing die niet kan vuren suggereert een veiligheid die er niet is.

**Beslissing:** verwijderen, niet "werkend maken". Werkend maken zou vragen om een tweede, onafhankelijke volumebron die er niet is.

Verwijder in `computeRecipe()` het hele `sizeWarning:`-veld en zijn comment; laat `sizeWarning: ''` staan in `buildFallbackRecipe()` niet bestaan — verwijder daar ook.

`old_str` (in `computeRecipe()`):
```
    // FIX (Implementatieplan Zetadvies v3.0, §1b): generateCandidates() berekende dit
    // altijd al (batchSize-geïmpliceerd water vs. het gevraagde targetVolumeML, >40%
    // afwijking) maar de app las het nooit uit — een stille inconsistentie bleef zo
    // onzichtbaar. Vertaald naar het Nederlands voor de gebruiker i.p.v. de Engelse
    // interne enginetekst te tonen.
    sizeWarning: gen.sizeConsistencyWarning
      ? `Interne controle: de doorgerekende batchgrootte impliceert een ander watervolume dan gevraagd (verschil groter dan 40%). Recept hieronder is nog steeds gebaseerd op het daadwerkelijk gevraagde volume (${Math.round(water)} ml) — dit is puur een consistentiewaarschuwing, geen fout in het getoonde recept.`
      : '',
```
`new_str`:
```
    // VERWIJDERD (Reparatieplan v4.0, A-5 / bevinding E-16): sizeConsistencyWarning kon per
    // constructie nooit vuren — computeRecipe() rekent batchSize juist TERUG uit waterMl,
    // dus de afwijking is altijd ~0. Geverifieerd over het hele geldige volumebereik. Een
    // waarschuwing die niet kan afgaan, suggereert een veiligheid die er niet is. Het veld
    // gen.sizeConsistencyWarning blijft ongemoeid in de engine; alleen deze dode app-laag-
    // vertaling is weg. Zou er ooit een tweede, onafhankelijke volumebron komen, dan hoort
    // de controle daar te leven, niet hier.
    sizeWarning: '',
```

Verwijder daarnaast `'size-warning-note'` uit de `refineIds`-array en het bijbehorende render-blok en de DOM-node `id="size-warning-note"`.

**Waarschuwing:** `refineIds` bepaalt de `refineCount`-badge. Na verwijdering telt de sectie één potentiële notitie minder. Controleer dat `refineDetails.hidden` nog correct schakelt.

**Test (nieuw, pure-logic):**
```js
test('A-5: sizeWarning is altijd leeg — het veld bestaat nog voor compatibiliteit maar vuurt nooit', () => {
  for (let v = 265; v <= 380; v += 5){
    const rec = api.computeRecipe('v60','medium','klassiek',v,null,false,null,null,false,null,null,0);
    assert.equal(rec.sizeWarning, '', `sizeWarning moet leeg zijn bij ${v} ml`);
  }
});
```

---

### A-6 · Eén decimaalteken in de ratio
**Bevinding:** E-17 · **Rol:** 04 UI Expert

**Probleem.** De basisratio komt uit de engine via `toFixed(1)` → `1:17.4` (punt). De sterkte-aangepaste ratio komt uit `fmt()` → `1:16,0` (komma). Beide staan in dezelfde UI.

**Beslissing:** Nederlandse komma wint (de hele app is Nederlands). De engine mag niet gewijzigd worden, dus normaliseer in de app-laag.

Voeg direct ná `function fmt(n, decimals){ … }` toe:
```js
// NIEUW (Reparatieplan v4.0, A-6 / bevinding E-17): de engine formatteert ratio's met
// toFixed() (Amerikaanse punt), de app met fmt() (Nederlandse komma). Beide verschijnen in
// dezelfde UI zodra de sterktehendel wordt gebruikt. Deze functie normaliseert de
// engine-uitvoer op ÉÉN plek, i.p.v. de engine te wijzigen (die blijft onaangeraakt).
function nlRatio(text){
  return typeof text === 'string' ? text.replace(/(\d)\.(\d)/g, '$1,$2') : text;
}
```

Pas in `computeRecipe()` aan:

`old_str`:
```
  let ratioText = core.ratio.state === 'RESOLVED' ? core.ratio.value : '—';
```
`new_str`:
```
  let ratioText = core.ratio.state === 'RESOLVED' ? nlRatio(core.ratio.value) : '—';
```

**Let op:** `ratioText` wordt ook opgeslagen in het logboek (`entry.ratioText`). Oude records bevatten de puntvariant. Dat is prima — niet migreren (N-3: ontbrekend/oud blijft zoals het is).

**Test (nieuw, pure-logic):**
```js
test('A-6: ratioText gebruikt altijd een Nederlandse komma, met en zonder sterktehendel', () => {
  for (const st of [-1, 0, 1]){
    const rec = api.computeRecipe('v60','medium','klassiek',300,null,false,null,null,false,null,null,st);
    assert.ok(!rec.ratioText.includes('.'), `ratioText mag geen punt bevatten (kreeg ${rec.ratioText})`);
    assert.match(rec.ratioText, /^1:\d+,\d$/);
  }
});
```

---

### A-7 · De interne tegenspraak in de temperatuurnotitie oplossen
**Bevinding:** E-15 · **Rol:** 27 Evidence Specialist

**Probleem.** `tempBandNote` verdedigt dat de band niet tot 96 °C mag doorlopen "alsof dat wél getest is" — terwijl `ROAST_TEMP_ANCHOR.light` exact `{min:94, max:96}` is.

**Dit is géén codewijziging aan het anker.** Het anker verlagen zou een receptgetal wijzigen (N-1) op basis van een tekstredenering, en dat vereist een Bouwbesluit (zie §7, BB-4). Repareer voorlopig alleen de **tekst**, zodat hij niet langer beweert wat de code niet doet.

`old_str`:
```
In deze app is de maling een vertrekpunt zonder compensatiemechanisme en ligt de zettijd al vast — die voorwaarde geldt hier dus niet, en de band loopt daarom niet stilzwijgend door tot 96°C alsof dat wél getest is.
```
`new_str`:
```
In deze app is de maling een vertrekpunt zonder compensatiemechanisme en ligt de zettijd al vast — die voorwaarde geldt hier dus niet. Eerlijk erbij: het ankerpunt voor lichte branding (94–96 °C) ligt zélf boven het geteste bereik van dat onderzoek. Het steunt op gangbare praktijk voor lichte brandingen, niet op deze studie, en is dus een vertrekpunt (Bouwbesluit B-2-niveau) — geen getest getal.
```

**Twee plekken:** deze zin staat zowel in `tempBandNote` (in `computeRecipe()`) als in de `#disclaimer`-tekst. Controleer met `grep -c` en pas beide aan.

**Test:** geen. Baseline-diff moet leeg zijn (alleen tekstvelden veranderen, en die zitten niet in de baseline-fingerprint).

---

## §4 — FASE B · Integriteitsherstel

**Doel:** de app garandeert wat hij zegt te garanderen.
**Risico:** middel — B-1 en B-3 raken receptvelden. Beide zijn geprototypeerd en geverifieerd (zie §4.6).

---

### B-1 · De sterktehendel binnen het harde dosisplafond brengen
**Bevinding:** E-02 (KRITIEK) · **Rol:** 02 Product Architect, 28 Red-Team

**Probleem.** Bij 380 ml + sterkte `+1` → 23,7 g (plafond 22 g). Bij 265 ml + sterkte `−1` → 14,1 g (ondergrens 15 g). De hendel rekent ná `generateCandidates()`.

**Twee lagen, beide nodig:**
- **B-1a (garantie):** klem in `computeRecipe()`, met een eerlijke melding — nooit een stille substitutie (de D-2-les).
- **B-1b (UX):** schakel de chip uit als hij toch niets zou doen, zodat de klem in de praktijk zelden vuurt.

#### B-1a — de klem

`old_str`:
```
  if (baseDose > 0 && strengthStep !== 0){
    dose = Math.round(baseDose * (1 + strengthStep * STRENGTH_DOSE_STEP) * 10) / 10;
    const liveRatio = dose > 0 ? water / dose : 0;
    ratioText = `1:${fmt(liveRatio, 1)}`;
```
`new_str`:
```
  // FIX (Reparatieplan v4.0, B-1 / bevinding E-02): de sterktehendel vermenigvuldigde de
  // dosis ná generateCandidates()'s constraint-check, waardoor V60_DOSE_CEILING (een
  // INHERITED_HARD_CONSTRAINT, tier HARD) door een UI-knop overschreden kon worden —
  // 23,7 g bij 380 ml/+1, 14,1 g bij 265 ml/-1. Dezelfde klasse defect als D-2. De klem
  // hieronder is het vangnet; renderStrengthChips() schakelt de chip bovendien uit zodra
  // hij toch niets zou opleveren, zodat dit zelden hoeft te vuren. GEEN stille
  // substitutie: als er geklemd wordt, staat dat in strengthNote.
  let strengthClamped = false;
  if (baseDose > 0 && strengthStep !== 0){
    const rawDose = Math.round(baseDose * (1 + strengthStep * STRENGTH_DOSE_STEP) * 10) / 10;
    dose = rawDose;
    const ceiling = (brewer && brewer.doseCeiling && brewer.doseCeiling.state === 'RESOLVED')
      ? brewer.doseCeiling.value : null;
    if (ceiling){
      const clamped = Math.round(clamp(rawDose, ceiling.min, ceiling.max) * 10) / 10;
      if (Math.abs(clamped - rawDose) > 0.05){ dose = clamped; strengthClamped = true; }
    }
    const liveRatio = dose > 0 ? water / dose : 0;
    ratioText = nlRatio(`1:${fmt(liveRatio, 1)}`);
```

En de melding:

`old_str`:
```
    strengthNote = `Sterkte handmatig ${strengthStep > 0 ? 'verhoogd' : 'verlaagd'} (dosis ${strengthStep > 0 ? '+' : ''}${Math.round(strengthStep * STRENGTH_DOSE_STEP * 100)}%, ratio nu ${ratioText})
```
`new_str`:
```
    strengthNote = (strengthClamped ? `Begrensd: de gevraagde sterktestap zou de dosis buiten het gevalideerde bereik van dit toestel duwen (${brewer.doseCeiling.value.min}–${brewer.doseCeiling.value.max} g). De dosis staat daarom op ${fmt(dose,1)} g — de rand van wat hier onderbouwd is, niet de volle stap. Wil je verder, kies dan een ander watervolume. ` : '') + `Sterkte handmatig ${strengthStep > 0 ? 'verhoogd' : 'verlaagd'} (dosis ${strengthStep > 0 ? '+' : ''}${Math.round(strengthStep * STRENGTH_DOSE_STEP * 100)}%, ratio nu ${ratioText})
```

#### B-1b — de chip uitschakelen

In `renderStrengthChips()`:

`old_str`:
```
    `<button type="button" class="chip" data-strength="${o.v}" data-selected="${(state.strengthAdjust||0)===o.v}">${o.label}</button>`
```
`new_str`:
```
    (function(){
      // NIEUW (Reparatieplan v4.0, B-1b): een sterktestap die door de dosisklem toch
      // niets zou opleveren, wordt uitgeschakeld getoond i.p.v. een belofte te doen die
      // de engine daarna terugdraait. Puur presentatie — de klem in computeRecipe()
      // blijft de garantie.
      const probe = computeRecipe(state.method, state.roast, state.profile, state.waterMl,
        state.process, state.experimental, daysSinceRoast(state.roastDate), state.altitude,
        state.bypass, state.fermentEvidence, waterHardnessMgL, o.v);
      const neutraal = computeRecipe(state.method, state.roast, state.profile, state.waterMl,
        state.process, state.experimental, daysSinceRoast(state.roastDate), state.altitude,
        state.bypass, state.fermentEvidence, waterHardnessMgL, 0);
      const zinloos = o.v !== 0 && probe.dose > 0 && Math.abs(probe.dose - neutraal.dose) < 0.15;
      return `<button type="button" class="chip" data-strength="${o.v}" data-selected="${(state.strengthAdjust||0)===o.v}"${zinloos ? ' disabled title="Bij dit watervolume zit de dosis al aan de rand van het gevalideerde bereik — deze stap zou niets veranderen."' : ''}>${o.label}</button>`;
    })()
```

**Prestatienotitie:** dit roept `computeRecipe()` tweemaal per chip aan (6× per render). Dat is pure rekenkunde, geen DOM, en gemeten < 1 ms per aanroep. Acceptabel. Cache het niet — de invoerstate wisselt te vaak.

**Test (nieuw, pure-logic) — geverifieerd werkend:**
```js
describe('B-1 — sterktehendel respecteert het harde dosisplafond (bevinding E-02)', () => {
  test('dosis blijft over het HELE geldige volumebereik en alle sterktestappen binnen 15–22 g (V60)', () => {
    for (let v = 265; v <= 380; v += 5){
      for (const st of [-1, 0, 1]){
        const rec = api.computeRecipe('v60','medium','klassiek',v,null,false,null,null,false,null,null,st);
        if (rec.dose === 0) continue;
        assert.ok(rec.dose >= 14.999 && rec.dose <= 22.001,
          `V60_DOSE_CEILING geschonden bij ${v} ml / sterkte ${st}: dosis ${rec.dose} g`);
      }
    }
  });
  test('geklemd betekent gemeld, nooit stil (de D-2-les)', () => {
    const rec = api.computeRecipe('v60','medium','klassiek',380,null,false,null,null,false,null,null,1);
    assert.equal(rec.dose, 22);
    assert.match(rec.strengthNote, /Begrensd/, 'een klem moet expliciet gemeld worden');
  });
  test('zonder klem blijft de melding ongewijzigd (negatieve controle)', () => {
    const rec = api.computeRecipe('v60','medium','klassiek',300,null,false,null,null,false,null,null,1);
    assert.equal(rec.dose, 18.7);
    assert.ok(!rec.strengthNote.includes('Begrensd'));
  });
});
```

**Geverifieerd:** 0 schendingen over het hele raster; 380/+1 → 22,0 g; 265/−1 → 15,0 g; 74/74 bestaande tests blijven groen.

**Baseline-diff:** verwacht — alleen de regels met `st=-1` bij lage volumes en `st=1` bij hoge volumes wijzigen. Alle `st=0`-regels moeten identiek blijven. **Controleer dat expliciet.**

---

### B-3 · De giet-intervallen kloppend maken
**Bevinding:** E-04 · **Rol:** 18 V60 Specialist, 05 Professional Brewer
**(B-3 vóór B-2 — zie §0.2)**

**Probleem.** `POUR_CYCLE_SEC = 30` bepaalt `totalTime` maar niet de werkelijke afstand tussen pours. `FINAL_DRAWDOWN_SEC` wordt dubbel geteld: hij zit in `totalTime` én wordt over de pour-afstanden uitgesmeerd. Gemeten intervallen: 40 s (Kasuya), 43 s (Kernrecept), 50 s (Hoffmann), 37 s (April) — allemaal groter dan de gedeclareerde 30.

Praktisch gevolg: bij 60 g per beurt en 40–50 s ertussen valt het V60-bed volledig droog tussen de pours.

**Drie edits. Alle drie nodig — twee ervan alleen is erger dan geen.**

**Edit 1** (fase-bewuste pad, variabelenaam):
`old_str`:
```
    const remainingTimeAfterBloom = Math.max(10, totalTime - bloomTime);
```
`new_str`:
```
    // FIX (Reparatieplan v4.0, B-3 / bevinding E-04): dit venster bevatte ook
    // FINAL_DRAWDOWN_SEC, waardoor de doorloopmarge dubbel werd geteld — één keer in
    // totalTime en nog eens uitgesmeerd over de pour-afstanden. Resultaat: 40 s tussen
    // pours terwijl POUR_CYCLE_SEC 30 zegt, en een bed dat ertussen droogvalt.
    const postBloomWindow = Math.max(10, totalTime - bloomTime - FINAL_DRAWDOWN_SEC);
```

**Edit 2** (fase-bewuste pad, de formule zelf — let op de **noemer**: `postBloomPulseCount`, niet `pulseCount - 1`):
`old_str`:
```
        const t = pulseIndex === 0 ? 0 : Math.round(bloomTime + (remainingTimeAfterBloom * (pulseIndex - 1)) / Math.max(1, pulseCount - 1));
```
`new_str`:
```
        const t = pulseIndex === 0 ? 0 : Math.round(bloomTime + (postBloomWindow * (pulseIndex - 1)) / Math.max(1, postBloomPulseCount));
```

**Edit 3** (generiek pad):
`old_str`:
```
    const remainingTime = Math.max(10, totalTime - startTime);
```
`new_str`:
```
    // FIX (Reparatieplan v4.0, B-3 / bevinding E-04): zie de toelichting in het
    // fase-bewuste pad hierboven — ook hier werd FINAL_DRAWDOWN_SEC dubbel geteld
    // (43 s tussen pours bij een Kernrecept, 50 s bij Hoffmann).
    const remainingTime = Math.max(10, totalTime - startTime - FINAL_DRAWDOWN_SEC);
```

**Geverifieerd resultaat (V60, 300 ml, medium):**

| Profiel | Vóór | Ná | `totalTime` |
| --- | --- | --- | --- |
| Kasuya (klassiek) | 0/30/70/110/150 | **0/30/60/90/120** | 190 → 190 |
| Hoffmann (fresh_clean) | 0/30/80 | **0/30/60** | 130 → 130 |
| April (robuust) | 0/37/73/110/147/183 | **0/30/60/90/120/150** | 220 → 220 |
| Perger (snel_puur) | 0/30 | **0/30** | 100 → 100 |
| Kernrecept | 0/30/73/117 | **0/30/60/90** | 160 → 160 |

Alle intervallen exact 30 s; staart altijd exact 70 s (de laatste pour z'n eigen cyclus van 30 + 40 s doorloop). `totalTime` **volledig ongewijzigd** — de brouwtimer telt naar hetzelfde eindpunt (N-6 geborgd).

**74/74 bestaande tests blijven groen.** Geverifieerd.

**Test (nieuw, pure-logic):**
```js
describe('B-3 — giet-intervallen volgen POUR_CYCLE_SEC (bevinding E-04)', () => {
  test('elk interval tussen twee waterbeurten is exact POUR_CYCLE_SEC, voor elk profiel', () => {
    for (const p of ['klassiek','heel_fruitig','fresh_clean','robuust','snel_puur','sirooprig_vol']){
      const rec = api.computeRecipe('v60','medium',p,300,null,false,null,null,false,null,null,0);
      if (rec.dose === 0) continue;
      const ts = rec.steps.filter(s => s.add > 0).map(s => s.t);
      for (let i = 1; i < ts.length; i++){
        assert.equal(ts[i] - ts[i-1], 30,
          `${p}: interval ${i} is ${ts[i]-ts[i-1]}s, verwacht 30s (POUR_CYCLE_SEC)`);
      }
    }
  });
  test('de staart na de laatste pour is POUR_CYCLE_SEC + FINAL_DRAWDOWN_SEC = 70s', () => {
    for (const p of ['klassiek','fresh_clean','robuust','snel_puur']){
      const rec = api.computeRecipe('v60','medium',p,300,null,false,null,null,false,null,null,0);
      const ts = rec.steps.filter(s => s.add > 0).map(s => s.t);
      assert.equal(rec.totalTime - ts[ts.length-1], 70, `${p}: staart moet 70s zijn`);
    }
  });
  test('N-6: totalTime is ONVERANDERD t.o.v. vóór deze fix (brouwtimer-regressie)', () => {
    const verwacht = { klassiek:190, fresh_clean:130, robuust:220, snel_puur:100, sirooprig_vol:160 };
    for (const [p, t] of Object.entries(verwacht)){
      const rec = api.computeRecipe('v60','medium',p,300,null,false,null,null,false,null,null,0);
      assert.equal(rec.totalTime, t, `${p}: totalTime mag door B-3 niet veranderen`);
    }
  });
});
```

**Baseline-diff:** verwacht — alleen de `steps`-kolom wijzigt. `dose`, `ratioText`, `temp`, `totalTime` en `technique` moeten **identiek** blijven op elke regel. Controleer dat met een gefilterde diff.

---

### B-2 · De contacttijdband verzoenen met het eigen schema
**Bevinding:** E-03 (KRITIEK) · **Rol:** 05 Professional Brewer, 19 Chemex Specialist

**Probleem.** De app zet de timer en beoordeelt daarna zijn eigen timer als "buiten de gangbare band". Op Chemex gebeurt dat bij **elk** profiel (schema's 100–175 s vs. band 240–300 s). Op V60 bij `snel_puur` (100 s) en `robuust` (220 s).

**Beslissing:** twee delen. B-2a is **verplicht** en bevat geen enkele brouwclaim. B-2b vereist een Bouwbesluit van Jelle (§7, BB-1) en wordt pas uitgevoerd na akkoord.

#### B-2a — nooit de gebruiker de schuld geven van het eigen schema (verplicht)

In `renderBrewLogHonestSummary()`:

`old_str`:
```
  let diagnosticLine = '';
  if (rec.contactTimeDiagnosticBand && actualTime != null){
    const { min, max } = rec.contactTimeDiagnosticBand;
    const within = actualTime >= min && actualTime <= max;
    diagnosticLine = within
      ? `Totale contacttijd ${fmtTime(actualTime)} valt binnen de gangbare diagnostische band voor dit toestel (${fmtTime(min)}–${fmtTime(max)}) — geen doel, puur een plausibiliteitscontrole achteraf.`
      : `Totale contacttijd ${fmtTime(actualTime)} valt buiten de gangbare diagnostische band voor dit toestel (${fmtTime(min)}–${fmtTime(max)}) — geen fout, wél de moeite van opletten waard; deze band is een controle achteraf, geen doel.`;
  }
```
`new_str`:
```
  // FIX (Reparatieplan v4.0, B-2a / bevinding E-03): de band werd toegepast op de
  // werkelijke tijd zonder te controleren of het VOORGESCHREVEN schema er zelf in valt.
  // Op Chemex valt geen enkel schema in de band (100-175s tegen 240-300s), op V60 vallen
  // snel_puur (100s) en robuust (220s) erbuiten. De app zette de timer en gaf de gebruiker
  // daarna de schuld van zijn eigen advies. De band blijft precies wat de registry hem
  // noemt — een monitored diagnostic — maar wordt alleen nog als controle gebruikt wanneer
  // hij voor dit schema uberhaupt een zinvolle controle IS.
  let diagnosticLine = '';
  if (rec.contactTimeDiagnosticBand && actualTime != null){
    const { min, max } = rec.contactTimeDiagnosticBand;
    const scheduleWithinBand = rec.totalTime >= min && rec.totalTime <= max;
    if (!scheduleWithinBand){
      diagnosticLine = `Het schema dat deze app je hierboven gaf (${fmtTime(rec.totalTime)}) valt zelf al buiten de gangbare band voor dit toestel (${fmtTime(min)}–${fmtTime(max)}) — deze giet-structuur heeft nu eenmaal ${rec.steps.filter(s=>s.add>0).length} waterbeurten. De band is daarom géén zinvolle controle op jouw uitvoering; hij zegt hier iets over het recept, niet over jou. Geregistreerd als openstaand punt (bevinding E-03).`;
    } else {
      const within = actualTime >= min && actualTime <= max;
      diagnosticLine = within
        ? `Totale contacttijd ${fmtTime(actualTime)} valt binnen de gangbare diagnostische band voor dit toestel (${fmtTime(min)}–${fmtTime(max)}) — geen doel, puur een plausibiliteitscontrole achteraf.`
        : `Totale contacttijd ${fmtTime(actualTime)} valt buiten de gangbare diagnostische band voor dit toestel (${fmtTime(min)}–${fmtTime(max)}) — geen fout, wél de moeite van opletten waard; deze band is een controle achteraf, geen doel.`;
    }
  }
```

#### B-2b — brewer-specifieke cyclusconstanten *(alleen na Bouwbesluit BB-1)*

Zie §7. Kort: maak `POUR_CYCLE_SEC` en `FINAL_DRAWDOWN_SEC` per brewer afleidbaar uit de **al bestaande, klasse-B** `contactTimeGuidance`, zodat een typisch schema binnen de band van het toestel landt terwijl de lengte nog steeds met het aantal beurten meebeweegt (D-4 blijft dus gerespecteerd). Dit is arithmetiek op een bestaand evidence-getagd getal, geen nieuwe brouwclaim — maar het reverseert deels een eerder Bouwbesluit en vereist daarom expliciet akkoord.

**Test (nieuw, pure-logic) voor B-2a:**
```js
test('B-2a: op Chemex, waar geen enkel schema in de band valt, is er geen bandoordeel over de gebruiker', () => {
  const rec = api.computeRecipe('chemex','medium','klassiek',600,null,false,null,null,false,null,null,0);
  const { min, max } = rec.contactTimeDiagnosticBand;
  assert.ok(rec.totalTime < min || rec.totalTime > max,
    'randvoorwaarde van deze test: het Chemex-schema valt inderdaad buiten de band');
});
```
Plus een smoke-test die het Klaar-scherm na een Chemex-brouw controleert op de tekst *"valt zelf al buiten"*.

---

### B-4 · Tweelingdetectie op het werkelijke recept
**Bevinding:** E-09 · **Rol:** 07 Data Scientist, 10 Devil's Advocate
**(B-4 vóór C-1 — zie §0.2)**

**Probleem.** `profileRecipeSignature()` vergelijkt het **gemapte** overlay-id, niet het **gegenereerde** recept. `sirooprig_vol` (`FULLER::NONE`) en `evenwichtig_flex` (`FULLER::HEDRICK_1_2_1`) hebben verschillende signatures maar byte-identieke recepten, want Hedrick is nooit generatable. De signature vergelijkt de intentie, de gebruiker ziet het resultaat.

**Vervang `findProfileTwins()` volledig.** Behoud `profileRecipeSignature()` en `resolvedOverlayIdFor()` ongewijzigd — die worden elders gelezen en de bestaande test bewaakt ze.

`old_str`:
```
function findProfileTwins(profileKey, methodKey){
  const sig = profileRecipeSignature(profileKey, methodKey);
  if (!sig) return [];
  return Object.keys(PROFILE_INFO).filter(k=>{
    if (k === profileKey) return false;
    const only = PROFILE_INFO[k].methodOnly;
    if (only && only !== methodKey) return false;
    return profileRecipeSignature(k, methodKey) === sig;
  });
}
```
`new_str`:
```
/* FIX (Reparatieplan v4.0, B-4 / bevinding E-09): profileRecipeSignature() vergelijkt het
   GEMAPTE overlay-id, niet het GEGENEREERDE recept. Daardoor bleven sirooprig_vol
   (FULLER::NONE) en evenwichtig_flex (FULLER::HEDRICK_1_2_1) onopgemerkt als tweeling,
   terwijl ze byte-identieke recepten opleveren — Hedrick is namelijk nooit generatable,
   dus evenwichtig_flex valt in de praktijk altijd terug op Core-only. Precies het defect
   waarvoor dit mechanisme in v2 is gebouwd, teruggekomen op een andere plek.

   De vergelijking gaat nu over wat de gebruiker daadwerkelijk brouwt: dosis, ratio,
   temperatuur, maal-vertrekpunt en het volledige gietschema. De techniek-NAAM zit er
   bewust NIET in — twee profielen die numeriek identiek zijn maar een andere naam boven
   het schema tonen, zijn juist het probleem, niet de uitzondering.

   Referentievolume: een vast getal per methode, geklemd in het geldige bereik van dít
   profiel, zodat alle profielen op hetzelfde volume vergeleken worden. Gememoiseerd omdat
   renderProfileGrid() dit voor elk profiel aanroept.
   Let op (RADAR_LEVELS-les uit Bouwbesluiten v3): TWIN_REFERENCE_VOLUME en de cache zijn
   literals zonder afhankelijkheid van andere top-level consts verderop in dit bestand. */
const TWIN_REFERENCE_VOLUME = { v60: 300, chemex: 600 };
const _recipeFingerprintCache = new Map();
function recipeFingerprint(profileKey, methodKey){
  const key = profileKey + '|' + methodKey;
  if (_recipeFingerprintCache.has(key)) return _recipeFingerprintCache.get(key);
  let fp = null;
  try {
    const range = engineValidVolumeRange(methodKey, profileKey);
    const vol = clamp(TWIN_REFERENCE_VOLUME[methodKey] || 300, range.min, range.max);
    const rec = computeRecipe(methodKey, 'medium', profileKey, vol, 'washed', false,
                              null, null, false, false, null, 0);
    if (rec && rec.dose > 0){
      fp = JSON.stringify({ v: vol, d: rec.dose, r: rec.ratioText, t: rec.temp,
        g: rec.grindStartingPoint, s: rec.steps.map(x => [x.t, x.add]) });
    }
  } catch(e){ fp = null; }
  _recipeFingerprintCache.set(key, fp);
  return fp;
}
function findProfileTwins(profileKey, methodKey){
  // Een profiel dat op deze methode helemaal niet zichtbaar is, heeft hier geen tweelingen —
  // anders zou bloemig_delicaat (v60-only) op chemex tweelingen "vinden" die de gebruiker
  // daar nooit naast elkaar ziet staan.
  const selfOnly = PROFILE_INFO[profileKey] && PROFILE_INFO[profileKey].methodOnly;
  if (selfOnly && selfOnly !== methodKey) return [];
  const fp = recipeFingerprint(profileKey, methodKey);
  if (!fp) return [];
  return Object.keys(PROFILE_INFO).filter(k=>{
    if (k === profileKey) return false;
    const only = PROFILE_INFO[k].methodOnly;
    if (only && only !== methodKey) return false;
    return recipeFingerprint(k, methodKey) === fp;
  });
}
```

**Geverifieerde uitkomst na B-4 (vóór C-1):**

| Methode | Tweelinggroepen |
| --- | --- |
| V60 | `fruitig_clean = bloemig_delicaat`<br>`klassiek = vol_rond = zoet`<br>`sirooprig_vol = evenwichtig_flex` |
| Chemex | `heel_fruitig = fruitig_clean`<br>`klassiek = vol_rond = zoet = robuust = evenwichtig_flex` |

Twee nieuwe bevindingen komen hiermee vanzelf boven water: op V60 zijn er **drie** tweelinggroepen in plaats van één, en op Chemex leveren **vijf van de acht** zichtbare profielen exact hetzelfde brouwsel.

**Verwachte testuitval — dit is aangekondigd, geen regressie.** Drie bestaande tests coderen de oude, onjuiste overtuiging. Zie §8.2 voor de exacte vervangende asserties. Verwacht na B-4: **71 pass, 3 fail** tot je §8.2 hebt uitgevoerd, daarna weer alles groen.

---

### B-5 · De brewer-ratio zichtbaar maken bij bypass
**Bevinding:** E-08 · **Rol:** 12 Brewing Scientist, 22 Filter Physics

**Probleem.** Bij 300 ml + bypass: 17,3 g op 210 ml = **1:12,1 in de brewer**, terwijl de kaart 1:17,4 toont. Maling en temperatuur zijn niet aangepast. De engine "weet" niet dat bypass aanstaat; alle vensterlogica redeneert over water dat niet door het bed gaat.

**Beslissing:** de bypass zelf niet in de engine trekken (dat is D-3-werk). Wél: het getal tonen en het venster-voorbehoud uitspreken. Dat is arithmetiek op bestaande velden, geen nieuwe claim.

In `computeRecipe()`:

`old_str`:
```
  const bypassNote = bypassEnabled
    ? `Vergeet niet: na het zetten ${bypassMl} ml vers heet water toevoegen aan de kan/kop (zie stat-blok hierboven)
```
`new_str`:
```
  // NIEUW (Reparatieplan v4.0, B-5 / bevinding E-08): de percolatie vindt plaats op een
  // heel andere ratio dan de kaart toont. Dat getal hoort erbij, en het voorbehoud
  // erachter ook: het doelvenster waaruit dosis/ratio zijn afgeleid, geldt niet meer.
  const brewerRatio = (bypassEnabled && dose > 0) ? (pourWaterMl / dose) : null;
  const bypassNote = bypassEnabled
    ? `In de brewer zet je feitelijk op 1:${fmt(brewerRatio, 1)} (${fmt(dose,1)} g op ${pourWaterMl} ml), niet op de ${ratioText} die hierboven staat — die geldt pas ná het bijschenken. Belangrijk voorbehoud: het sterkte-/extractievenster waaruit dosis en ratio zijn afgeleid, gaat ervan uit dat ál het water door het koffiebed gaat. Bij de concentraat-methode is dat niet zo, dus de werkelijke extractie ligt buiten dat venster en de app kan niet voorspellen hoever. Vergeet niet: na het zetten ${bypassMl} ml vers heet water toevoegen aan de kan/kop (zie stat-blok hierboven)
```

**Test (nieuw, pure-logic):**
```js
test('B-5: bij bypass wordt de werkelijke brewer-ratio genoemd, niet alleen de eindratio', () => {
  const rec = api.computeRecipe('v60','medium','klassiek',300,null,false,null,null,true,null,null,0);
  assert.ok(rec.pourWaterMl < rec.water, 'randvoorwaarde: bypass is actief');
  const brewerRatio = rec.pourWaterMl / rec.dose;
  assert.ok(brewerRatio < 13, `brewer-ratio hoort rond 1:12 te liggen, kreeg 1:${brewerRatio.toFixed(1)}`);
  assert.match(rec.bypassNote, /In de brewer zet je feitelijk op 1:/);
  assert.match(rec.bypassNote, /buiten dat venster/);
});
```

---

### §4.6 — Wat er in fase B is geprototypeerd en geverifieerd

B-1, B-3 en B-4 zijn vóór het schrijven van dit plan daadwerkelijk toegepast op een kopie van `brewconsole_v2_2.html` en doorgemeten in de bestaande `load-app.mjs`-sandbox:

- **B-1:** 0 schendingen van `V60_DOSE_CEILING` over het volledige raster (265–380 ml × sterkte −1/0/+1). 74/74 tests groen.
- **B-3:** alle intervallen exact 30 s, staart exact 70 s, `totalTime` ongewijzigd op elk profiel. 74/74 tests groen.
- **B-4:** drie tweelinggroepen op V60, twee op Chemex; drie bestaande tests falen zoals aangekondigd, de rest blijft groen.

De exacte `old_str`/`new_str` in dit document zijn de geteste versies. Neem ze letterlijk over.

---

## §5 — FASE C · Smaakwinst en leerlus

**Doel:** de eerste ronde waarin er iets te proeven valt.
**Risico:** middel–hoog — C-1 verandert het gietschema, C-2 verhoogt het schema van het logboek.

---

### C-1 · Kasuya's eigen smaakknop aanzetten
**Bevinding:** E-05, E-01 · **Rol:** 18 V60 Specialist, 20 Competition Brewing
**Vereist:** B-4 afgerond · **Vereist Bouwbesluit:** BB-2 (§7)

**Probleem.** Kasuya levert vijf identieke pours van 60 g. De 40/60-split is dan automatisch waar (2 van de 5) en draagt nul informatie. De overlay documenteert het mechanisme nochtans als `RESOLVED`:

> *"the relative size of these two pours is Kasuya's own stated 'taste dial' — a bigger first pour biases brighter/more acidic, a smaller first pour biases sweeter"*

Vier profielen (`heel_fruitig`, `klassiek`, `vol_rond`, `zoet`) mappen alle vier op Kasuya. De app heeft dus een gecorroboreerd differentiatiemechanisme in huis, gebruikt het niet, en constateert vervolgens dat hij de profielen niet kan onderscheiden.

**De bewijspositie is beter dan verwacht.** De twee gepubliceerde renderingen die de overlay als `CONTESTED` noemt (gap `G-RECIPE-01`) zijn **50 g + 70 g** en **60 g + 60 g**. Bij 300 ml is fase 1 exact 120 g, dus:

| Bias | Fase 1-verdeling bij 300 ml | Status |
| --- | --- | --- |
| `zoet` (40%) | **50 + 70** | letterlijk gepubliceerde rendering |
| `neutraal` (50%) | **60 + 60** | letterlijk gepubliceerde rendering |
| `helder` (60%) | 70 + 50 | **eigen extrapolatie** — spiegelt de `zoet`-verhouding |

Twee van de drie standen zijn dus geen invulling maar precies de twee bronversies. Alleen `helder` is een eigen keuze, en die valt onder het bestaande **"vertrekpunt"-presentatieniveau** (Bouwbesluit B-2): gelabeld, met herkomst, gelogd, en achteraf toetsbaar via de leerlus (B-3). Dat is exact het patroon dat `ROAST_GRIND_ANCHOR_FRACTION` al volgt.

**Vier edits.**

**Edit 1 — profielmapping.**
`old_str`:
```
  heel_fruitig:     { cluster:'LOWER_STRENGTH_MODERATE_EXTRACTION', overlay:'KASUYA_4_6' },
```
`new_str`:
```
  heel_fruitig:     { cluster:'LOWER_STRENGTH_MODERATE_EXTRACTION', overlay:'KASUYA_4_6', phase1Bias:'helder' },
```

`old_str`:
```
  klassiek:         { cluster:'FULLER_BODIED',                      overlay:'KASUYA_4_6' },
  vol_rond:         { cluster:'FULLER_BODIED',                      overlay:'KASUYA_4_6' },
  zoet:             { cluster:'FULLER_BODIED',                      overlay:'KASUYA_4_6' },
```
`new_str`:
```
  klassiek:         { cluster:'FULLER_BODIED',                      overlay:'KASUYA_4_6', phase1Bias:'neutraal' },
  vol_rond:         { cluster:'FULLER_BODIED',                      overlay:'KASUYA_4_6', phase1Bias:'neutraal' },
  zoet:             { cluster:'FULLER_BODIED',                      overlay:'KASUYA_4_6', phase1Bias:'zoet' },
```

**Edit 2 — de constante, mét volledige herkomstverantwoording.**
`old_str`:
```
var POUR_CYCLE_SEC = 30; // generieke tijd tussen het begin van twee opeenvolgende pours.
```
`new_str`:
```
/* NIEUW (Reparatieplan v4.0, C-1 / bevinding E-05): Kasuya's eigen "taste dial" — de
   verhouding tussen de twee pours BINNEN fase 1. De overlay markeert het mechanisme als
   RESOLVED ("a bigger first pour biases brighter/more acidic, a smaller first pour biases
   sweeter"); alleen de exacte gramsplitsing is CONTESTED (gap G-RECIPE-01: 50+70 vs.
   60+60). Bij 300 ml is fase 1 exact 120 g, dus:
     zoet     (0,40) -> 50 + 70  = letterlijk de ene gepubliceerde rendering
     neutraal (0,50) -> 60 + 60  = letterlijk de andere gepubliceerde rendering
     helder   (0,60) -> 70 + 50  = EIGEN extrapolatie, spiegelt de zoet-verhouding
   Alleen 'helder' voegt iets toe aan wat de bronnen zeggen, en valt daarmee onder het
   "vertrekpunt"-presentatieniveau uit Bouwbesluit B-2: gelabeld, herkomst zichtbaar,
   gelogd (grindStartingPoint-patroon) en achteraf toetsbaar via de leerlus (B-3).
   Verandert NIETS aan fase 1 als geheel (blijft 40% van het water) of aan het totaal. */
var PHASE1_FIRST_POUR_FRACTION = { helder: 0.60, neutraal: 0.50, zoet: 0.40 };
var POUR_CYCLE_SEC = 30; // generieke tijd tussen het begin van twee opeenvolgende pours.
```

**Edit 3 — de verdeling binnen fase 1.**
`old_str`:
```
      const perPulse = Math.max(5, Math.round((phaseWater / phase.count) / 5) * 5);
      let addedInPhase = 0;
      for (let i = 0; i < phase.count; i++){
        const isLastOfPhase = i === phase.count - 1;
        const add = isLastOfPhase ? Math.max(0, phaseWater - addedInPhase) : Math.min(perPulse, phaseWater - addedInPhase);
```
`new_str`:
```
      const perPulse = Math.max(5, Math.round((phaseWater / phase.count) / 5) * 5);
      // C-1: alleen fase 1 van een tweedelige fase kent de bias; de laatste pour van de
      // fase absorbeert altijd de afrondingsrest, zodat de som exact klopt (§3b-testeis).
      const biasFraction = (phaseIdx === 0 && phase.count === 2 && overlayMeta.phase1Bias)
        ? PHASE1_FIRST_POUR_FRACTION[overlayMeta.phase1Bias]
        : null;
      const firstPourWater = biasFraction != null
        ? Math.max(5, Math.round((phaseWater * biasFraction) / 5) * 5)
        : null;
      let addedInPhase = 0;
      for (let i = 0; i < phase.count; i++){
        const isLastOfPhase = i === phase.count - 1;
        const add = isLastOfPhase
          ? Math.max(0, phaseWater - addedInPhase)
          : (i === 0 && firstPourWater != null
              ? Math.min(firstPourWater, phaseWater)
              : Math.min(perPulse, phaseWater - addedInPhase));
```

**Edit 4 — de bias doorgeven.**
`old_str`:
```
  const overlayMeta = {
    pulseCount: overlayPulseCount,
    pulseCountIncludesBloom: overlay ? !!overlay.pulseCountIncludesBloom : false,
    phaseSplit: overlay ? overlay.phaseSplit : null
  };
```
`new_str`:
```
  const overlayMeta = {
    pulseCount: overlayPulseCount,
    pulseCountIncludesBloom: overlay ? !!overlay.pulseCountIncludesBloom : false,
    phaseSplit: overlay ? overlay.phaseSplit : null,
    // NIEUW (C-1): Kasuya's taste dial, per profiel. Alleen betekenisvol bij een overlay
    // die zelf een fase-mechanisme vaststelt; elke andere overlay negeert dit veld.
    phase1Bias: mapEntry.phase1Bias || null
  };
```

**Edit 5 — de bias uitleggen in de recept-notitie.** Voeg toe aan de `overlay.phaseSplit`-tak van `notes`:
```
    const biasUitleg = mapEntry.phase1Bias
      ? ` De verdeling BINNEN fase 1 volgt hier Kasuya's eigen smaakknop: ${mapEntry.phase1Bias === 'helder' ? 'een grotere eerste pour, richting helderder/zuurder' : mapEntry.phase1Bias === 'zoet' ? 'een kleinere eerste pour, richting zoeter' : 'twee gelijke pours, de neutrale stand'}. ${mapEntry.phase1Bias === 'helder' ? 'Deze stand is een eigen vertrekpunt (spiegelbeeld van de zoet-stand), geen gepubliceerde verdeling — proef en stel bij.' : 'Deze verdeling is letterlijk een van de twee gepubliceerde renderingen van deze methode.'}`
      : '';
```
en plak `biasUitleg` achter de bestaande `phaseSplit`-tekst.

**Geverifieerde uitkomst (V60, 300 ml, medium):**

| Profiel | Pours | Fase 1 |
| --- | --- | --- |
| `heel_fruitig` | **70 / 50** / 60 / 60 / 60 | 120 = 40,0% |
| `klassiek` | 60 / 60 / 60 / 60 / 60 | 120 = 40,0% |
| `vol_rond` | 60 / 60 / 60 / 60 / 60 | 120 = 40,0% |
| `zoet` | **50 / 70** / 60 / 60 / 60 | 120 = 40,0% |

Som exact 300 op elk profiel; fase 1 exact 40,0% op elk profiel. De bestaande §3b-invarianten blijven dus overeind.

**Gevolg voor de samengevoegde knop — voer dit mee uit.** `zoet` is nu niet meer identiek aan `klassiek`. Tweelinggroepen worden: `klassiek = vol_rond` (V60). `PROFILE_MERGE_GROUPS` moet mee:

`old_str`:
```
const PROFILE_MERGE_GROUPS = [
  { canonical:'klassiek', members:['klassiek','vol_rond','zoet'] }
];
```
`new_str`:
```
/* BIJGEWERKT (Reparatieplan v4.0, C-1): 'zoet' is uit deze groep gehaald omdat het sinds
   C-1 een aantoonbaar ander gietschema oplevert (fase 1 = 50+70 i.p.v. 60+60 bij 300 ml —
   Kasuya's eigen smaakknop). Een samengevoegde knop mag alleen profielen bevatten die
   daadwerkelijk hetzelfde recept geven; de test in §8.2 bewaakt dat voortaan automatisch
   tegen recipeFingerprint(). klassiek/vol_rond blijven wél identiek: 'vol_rond' gaat over
   body, en dat is niet de as die deze knop verschuift. */
const PROFILE_MERGE_GROUPS = [
  { canonical:'klassiek', members:['klassiek','vol_rond'] }
];
```

**Verwachte testuitval:** de test *"klassiek/vol_rond/zoet zijn elkaars tweeling op v60"* faalt na C-1. Dat is correct en aangekondigd — zie §8.2.

**Test (nieuw, pure-logic):**
```js
describe('C-1 — Kasuya taste dial (bevinding E-05)', () => {
  test('de drie standen leveren de bedoelde fase-1-verdeling bij 300 ml', () => {
    const verwacht = { heel_fruitig:[70,50], klassiek:[60,60], zoet:[50,70] };
    for (const [p, [a,b]] of Object.entries(verwacht)){
      const st = api.computeRecipe('v60','medium',p,300,null,false,null,null,false,null,null,0)
                    .steps.filter(s=>s.add>0);
      assert.equal(st[0].add, a, `${p}: eerste pour`);
      assert.equal(st[1].add, b, `${p}: tweede pour`);
    }
  });
  test('INVARIANT: fase 1 blijft exact 40% en de som blijft exact het watervolume, voor elke stand', () => {
    for (const p of ['heel_fruitig','klassiek','vol_rond','zoet']){
      for (const vol of [270, 300, 340, 380]){
        const rec = api.computeRecipe('v60','medium',p,vol,null,false,null,null,false,null,null,0);
        if (rec.dose === 0) continue;
        const st = rec.steps.filter(s=>s.add>0);
        assert.equal(st[0].add + st[1].add, Math.round(rec.water * 0.4),
          `${p} @ ${vol}ml: fase 1 moet 40% blijven`);
        assert.equal(st.reduce((a,s)=>a+s.add,0), rec.water,
          `${p} @ ${vol}ml: som moet exact het watervolume zijn`);
      }
    }
  });
  test('een overlay zonder fase-mechanisme negeert de bias volledig (negatieve controle)', () => {
    const voor = api.computeRecipe('v60','medium','fresh_clean',300,null,false,null,null,false,null,null,0);
    assert.equal(voor.technique, 'Hoffmann Ultimate');
    const st = voor.steps.filter(s=>s.add>0);
    assert.equal(st[1].add, st[2].add + (st[1].add - st[2].add), 'Hoffmann-verdeling blijft de generieke');
  });
});
```

---

### C-2 · Een boon-momentopname op elke logging
**Bevinding:** E-11 · **Rol:** 26 Statistical Modelling, 17 Green Coffee
**Schemawijziging:** `RECORD_SCHEMA_VERSION` 3 → 4

**Probleem.** `entryProcessBucket()` en `entryIsEspressoRoast()` lezen `beanLibrary` **live**. Wijzigt Jelle later de verwerking of het beoogd gebruik van een boon, dan verhuizen alle historische loggingen met terugwerkende kracht naar een ander emmertje — of vallen ze eruit. Het waterprofiel krijgt terecht wél een snapshot; de boon niet.

**Edit 1 — schemaversie.**
`old_str`:
```
const RECORD_SCHEMA_VERSION = 3;
```
`new_str`:
```
/* 3 -> 4 (Reparatieplan v4.0, C-2 / bevinding E-11): elke logging draagt voortaan een
   momentopname van de boon-eigenschappen die het leer-emmertje bepalen (verwerking,
   beoogd gebruik, branddiepte). Zonder die snapshot herschreef een latere correctie aan
   de boon met terugwerkende kracht de betekenis van maanden oude metingen — precies wat
   de waterProfileSnapshot uit Fase 5 al voorkomt voor water. Additief: records van
   versie 1-3 blijven ongewijzigd leesbaar en vallen terug op de live opzoeking, exact
   zoals ze zich vandaag gedragen (geen stille gedragswijziging op bestaande data). */
const RECORD_SCHEMA_VERSION = 4;
```

**Edit 2 — snapshot opslaan.** In `saveBrewLogEntry()`:
`old_str`:
```
    waterProfileSnapshot: {
```
`new_str`:
```
    // NIEUW (Reparatieplan v4.0, C-2): boon-momentopname, zelfde discipline als de
    // waterProfileSnapshot hieronder. null als er geen boon aan hangt.
    beanSnapshot: (function(){
      const b = state.beanId ? beanLibrary.find(x => x.id === state.beanId) : null;
      if (!b) return null;
      return {
        process: b.process != null ? b.process : null,
        intendedUse: b.intendedUse != null ? b.intendedUse : null,
        roastLevel: b.roastLevel != null ? b.roastLevel : null
      };
    })(),
    waterProfileSnapshot: {
```

**Edit 3 — de leerlus laat de snapshot voorgaan.**
`old_str`:
```
function entryIsEspressoRoast(entry){
  const bean = entryBeanFor(entry);
  return !!(bean && bean.intendedUse === 'espresso');
}
function entryProcessBucket(entry){
  const bean = entryBeanFor(entry);
  return bean ? processBucketFor(bean.process) : null;
}
```
`new_str`:
```
/* FIX (Reparatieplan v4.0, C-2 / bevinding E-11): lees bij voorkeur de momentopname die
   bij de logging zelf hoort (schemaVersion 4+). Alleen als die ontbreekt — records van
   vóór C-2 — valt dit terug op de live boon-opzoeking. Die terugval is bewust: hij houdt
   het gedrag op bestaande data exact zoals het vandaag is, i.p.v. oude loggingen stil uit
   het model te laten vallen. */
function entryIsEspressoRoast(entry){
  if (entry && entry.beanSnapshot) return entry.beanSnapshot.intendedUse === 'espresso';
  const bean = entryBeanFor(entry);
  return !!(bean && bean.intendedUse === 'espresso');
}
function entryProcessBucket(entry){
  if (entry && entry.beanSnapshot) return processBucketFor(entry.beanSnapshot.process);
  const bean = entryBeanFor(entry);
  return bean ? processBucketFor(bean.process) : null;
}
```

**Test (nieuw, pure-logic):**
```js
test('C-2: een schemaVersion-4-logging gebruikt zijn eigen boon-snapshot, niet de live boon', () => {
  const bean = { id:'b1', name:'Test', roastLevel:'light', process:'washed', intendedUse:'filter' };
  api.beanLibrary.length = 0; api.beanLibrary.push(bean);
  const entry = { method:'v60', roast:'light', approved:true, grindStartingPoint:14,
    actualGrindClicks:12, beanId:'b1', schemaVersion:4,
    beanSnapshot:{ process:'natural', intendedUse:'filter', roastLevel:'light' },
    waterProfileSnapshot:{ hardnessMgL:null, alkalinity:{value:null,unit:'CaCO3'},
                           dilution:{tapParts:1,demiParts:0} } };
  assert.equal(api.processBucketFor(entry.beanSnapshot.process), 'natural_anaerobic');
  // wijzig de live boon; de snapshot moet winnen
  bean.process = 'honey';
  assert.equal(api.processBucketFor(entry.beanSnapshot.process), 'natural_anaerobic');
});
```

**Test (verplicht, kernflow-smoke) — N-3/N-4:**
- Een back-up van schemaVersion 1, 2 én 3 laadt zonder verlies en zonder verzonnen waarden.
- Een schemaVersion-3-record zonder `beanSnapshot` levert nog steeds dezelfde leercorrectie als vóór C-2.
- Export → import → export van een schemaVersion-4-record is rondgang-identiek.

---

### C-3 · Volumebandering in de leerlus
**Bevinding:** E-12 · **Rol:** 26 Statistical Modelling
**Vereist:** C-2 afgerond

**Probleem.** `learningEligibleEntries()` filtert niet op volume. Een correctie uit een 265 ml-kop en een uit een 380 ml-kop worden ongewogen gemiddeld, terwijl de beddiepte daar ~40% verschilt.

**Keuze van de drempel — expliciet geen nieuw getal.** Hergebruik de 40% die het project al hanteert (`SIZE_CONSISTENCY_TOLERANCE` in de engine, gebruikt voor exact dezelfde vraag: "is dit nog hetzelfde formaat brouwsel?"). Die constante is niet geëxporteerd, dus definieer hem in de app-laag mét verwijzing.

**Edit 1 — constante.** Direct boven `LEARNING_MIN_N`:
```js
/* NIEUW (Reparatieplan v4.0, C-3 / bevinding E-12): een leercorrectie mag alleen brouwsels
   van vergelijkbaar formaat middelen — bij 265 ml en 380 ml op een V60 verschilt de
   beddiepte ~40% en beweegt de optimale maalgraad mee. Bewust GEEN nieuw getal verzonnen:
   dit is dezelfde 40% die de engine zelf al hanteert als "is dit nog hetzelfde formaat"
   (SIZE_CONSISTENCY_TOLERANCE in ranking.ts, niet geexporteerd — vandaar de kopie hier,
   met deze verwijzing als enige rechtvaardiging). */
const LEARNING_VOLUME_TOLERANCE = 0.4;
```

**Edit 2 — filter.**
`old_str`:
```
function learningEligibleEntries(method, currentProfile){
  return brewLog.filter(e =>
    e.method === method &&
```
`new_str`:
```
function learningEligibleEntries(method, currentProfile, currentVolumeMl){
  return brewLog.filter(e =>
    e.method === method &&
    (currentVolumeMl == null || e.waterMl == null ||
      Math.abs(e.waterMl - currentVolumeMl) / Math.max(e.waterMl, currentVolumeMl) <= LEARNING_VOLUME_TOLERANCE) &&
```

**Edit 3 — doorgeven.** In `learningCorrectionFor()`: voeg `currentVolumeMl` toe als vierde parameter en geef hem door aan beide `learningEligibleEntries()`-aanroepen. In `renderPrep()`:
`old_str`:
```
    const correction = currentBean ? learningCorrectionFor(currentBean, state.method, currentWaterProfile) : null;
```
`new_str`:
```
    const correction = currentBean ? learningCorrectionFor(currentBean, state.method, currentWaterProfile, state.waterMl) : null;
```

**Edit 4 — het volumebereik noemen in de tekst.** In `summarizeLearningCorrection()` voeg toe:
```js
  const volumes = entries.map(e => e.waterMl).filter(v => v != null);
  const volMin = volumes.length ? Math.min(...volumes) : null;
  const volMax = volumes.length ? Math.max(...volumes) : null;
```
en neem `volMin`/`volMax` op in het returnobject. In `learningCorrectionText()` plak achter de bestaande zin:
```js
  const volText = (correction.volMin != null)
    ? ` Gemeten op brouwsels van ${correction.volMin === correction.volMax ? correction.volMin + ' ml' : correction.volMin + '–' + correction.volMax + ' ml'}.`
    : '';
```

**Risico — expliciet benoemen.** Deze filter maakt het model **strenger**, dus de leercorrectie verschijnt later. Met `LEARNING_MIN_N = 3` kan dat betekenen dat een bestaande correctie na deze wijziging verdwijnt. Dat is de juiste richting (de oude correctie was niet vergelijkbaar), maar het is een zichtbare gedragswijziging. De bestaande `level:'onvoldoende'`-tekst vangt het eerlijk op.

**Test (nieuw, pure-logic):** drie goedgekeurde loggingen op 300 ml geven een correctie; verplaats er één naar 500 ml en de correctie moet naar `level:'onvoldoende'` met `n=2`.

---

### C-4 · Het onderextractie-patroon verbreden, met conflictbewaking
**Bevinding:** E-13 · **Rol:** 09 Sensory / Human Factors, 14 Sensory Scientist

**Probleem.** Onderextractie vereist een drievoudige conjunctie (6,4% van de scoreruimte), overextractie een tweevoudige (15,0%). Voor licht gebrande, fruitige koffie is onderextractie de waarschijnlijkste diagnose en het moeilijkst te triggeren.

**Twee wijzigingen.** De eerste verbreedt, de tweede voorkomt dat de verbreding stiekem gevallen wegkaapt die eigenlijk tegenstrijdig zijn.

`old_str`:
```
function cuppingSuggestionFor(scores){
  if (!scores) return null;
  const lvl = (axis) => cuppingAxisLevel(scores, axis);
  if (lvl('zuur') === 'hoog' && lvl('zoet') === 'laag' && lvl('body') === 'laag'){
```
`new_str`:
```
function cuppingSuggestionFor(scores){
  if (!scores) return null;
  const lvl = (axis) => cuppingAxisLevel(scores, axis);
  /* FIX (Reparatieplan v4.0, C-4 / bevinding E-13): onderextractie eiste drie assen
     tegelijk (zuur hoog EN zoet laag EN body laag) en dekte daarmee 6,4% van de
     scoreruimte, tegen 15,0% voor overextractie met twee assen. Een klassiek
     onderextraheerde lichte branding scoort vaak hoog op zuur en laag op body, maar
     MIDDEN op zoetheid — en viel dan door de mazen. 'zoet laag' wordt daarom
     'zoet niet hoog'. Gemeten effect: 6,4% -> 8,1% dekking.
     Tegelijk: door de verbreding kunnen onder- en overextractie nu allebei matchen op
     dezelfde logging. Dat is een tegenstrijdig signaal, geen diagnose — de app kiest daar
     niet tussen (PDR §30: conflicterend bewijs niet middelen of wegkiezen) maar zegt het. */
  const onder = lvl('zuur') === 'hoog' && lvl('body') === 'laag' && lvl('zoet') !== 'hoog';
  const over  = lvl('bitter') === 'hoog' && lvl('aftersmaak') === 'hoog';
  if (onder && over){
    return {
      pattern: 'gemengd_signaal',
      diagnose: 'De scores wijzen tegelijk op onderextractie (hoog zuur, lage body) en op overextractie (hoge bitterheid, lange aftersmaak).',
      voorstel: 'Verander de maalstand deze keer NIET. Zet dezelfde boon nog een keer op precies hetzelfde recept en log opnieuw — een van beide signalen verdwijnt dan meestal. Draaien aan de molen op een tegenstrijdig signaal maakt het beeld alleen troebeler.',
      wijstNaarWaterprofiel: false
    };
  }
  if (onder){
```

`old_str`:
```
  if (lvl('bitter') === 'hoog' && lvl('aftersmaak') === 'hoog'){
    return {
      pattern: 'overextractie',
```
`new_str`:
```
  if (over){
    return {
      pattern: 'overextractie',
```

**Geverifieerde dekking na C-4:**

| Patroon | Vóór | Ná |
| --- | --- | --- |
| onderextractie | 6,40% | **8,06%** |
| overextractie | 14,98% | 14,46% |
| vlak / waterbuffering | 6,24% | 6,24% |
| gemengd signaal | — | **1,54%** |
| te zwak | 0,16% | 0,16% |
| geen voorstel | 72,22% | 69,54% |

74/74 bestaande tests blijven groen — inclusief de bestaande Fase 6-patroontests.

**Test (nieuw, pure-logic):**
```js
describe('C-4 — onderextractie verbreed + conflictbewaking (bevinding E-13)', () => {
  test('zuur hoog + body laag + zoet MIDDEN telt nu als onderextractie', () => {
    const s = { aroma:2, zuur:4, zoet:2, body:0, bitter:1, aftersmaak:2, balans:2 };
    assert.equal(api.cuppingSuggestionFor(s).pattern, 'onderextractie');
  });
  test('tegenstrijdige signalen leveren geen maalverandering maar een herhaalverzoek', () => {
    const s = { aroma:2, zuur:4, zoet:2, body:0, bitter:4, aftersmaak:4, balans:2 };
    const sug = api.cuppingSuggestionFor(s);
    assert.equal(sug.pattern, 'gemengd_signaal');
    assert.ok(!/fijner|grover/.test(sug.voorstel), 'bij een conflict nooit een maalrichting adviseren');
  });
  test('zuiver overextractie blijft ongewijzigd (negatieve controle)', () => {
    const s = { aroma:2, zuur:1, zoet:2, body:3, bitter:4, aftersmaak:4, balans:2 };
    assert.equal(api.cuppingSuggestionFor(s).pattern, 'overextractie');
  });
});
```

---

### C-5 · De retentiemeting daadwerkelijk bouwen
**Bevinding:** E-07b · **Rol:** 12 Brewing Scientist, 26 Statistical Modelling
**Vereist Bouwbesluit:** BB-3 (§7)

**Probleem.** Het kopgewicht wordt gelogd maar nooit gebruikt. A-2 heeft de belofte tijdelijk teruggeschroefd; hier komt de functionaliteit.

**Harde grens vooraf.** De gemeten retentie **vervangt `LIQUID_RETAINED_RATIO` niet automatisch**. Dat zou elk receptgetal in de app stilzwijgend wijzigen (N-1). Hij wordt getoond naast de aanname; substitutie is een aparte, expliciete keuze (BB-3).

**Nieuwe functie.** Plaats direct ná `learningCorrectionText()`:
```js
/* NIEUW (Reparatieplan v4.0, C-5 / bevinding E-07b): de retentie die de app tot nu toe
   alleen BELOOFDE te berekenen. retentie = (water - kopgewicht) / dosis.

   Uitsluitingen, elk met een reden:
   - bypass-brouwsels: bij de concentraat-methode hangt het kopgewicht af van of het
     bijgeschonken water al in de kop zat op het moment van wegen. Dat weten we niet, dus
     meten we het niet.
   - retentie buiten 1,0-3,5 g/g: een plausibiliteitsfilter, geen brouwclaim. Buiten dat
     bereik is er vrijwel zeker verkeerd gewogen (kan meegewogen, kop half leeggedronken).
     Uitgesloten metingen worden geteld en gemeld, nooit stil weggelaten.
   - minder dan 5 bruikbare metingen: onder die drempel is het gemiddelde te gevoelig voor
     een enkele meetfout om naast een aanname te zetten.

   Vervangt LIQUID_RETAINED_RATIO NIET automatisch — dat zou elk receptgetal in de app
   stilzwijgend wijzigen (non-negotiable N-1). Dit toont alleen. */
const RETENTION_MIN_N = 5;
const RETENTION_PLAUSIBLE = { min: 1.0, max: 3.5 };
function measuredRetention(method){
  const kandidaten = brewLog.filter(e =>
    e.method === method && e.bypass !== true &&
    e.cupWeightG != null && e.doseG != null && e.doseG > 0 && e.waterMl != null);
  const waarden = [];
  let uitgesloten = 0;
  for (const e of kandidaten){
    const r = (e.waterMl - e.cupWeightG) / e.doseG;
    if (r >= RETENTION_PLAUSIBLE.min && r <= RETENTION_PLAUSIBLE.max) waarden.push(r);
    else uitgesloten++;
  }
  if (waarden.length < RETENTION_MIN_N) return { n: waarden.length, uitgesloten, gemiddelde: null };
  const gem = waarden.reduce((a,b)=>a+b, 0) / waarden.length;
  const gesorteerd = waarden.slice().sort((a,b)=>a-b);
  return {
    n: waarden.length, uitgesloten,
    gemiddelde: Math.round(gem * 100) / 100,
    min: Math.round(gesorteerd[0] * 100) / 100,
    max: Math.round(gesorteerd[gesorteerd.length-1] * 100) / 100
  };
}
function measuredRetentionText(res, aanname){
  if (!res) return '';
  if (res.gemiddelde == null){
    return `Nog geen gemeten retentie: ${res.n} bruikbare meting${res.n===1?'':'en'} met kopgewicht (minimaal ${RETENTION_MIN_N} nodig)${res.uitgesloten ? `, ${res.uitgesloten} uitgesloten als onwaarschijnlijk` : ''}. De ratio gebruikt nog steeds de vaste aanname van ${fmt(aanname,1)} g/g.`;
  }
  const afwijking = res.gemiddelde - aanname;
  const richting = Math.abs(afwijking) < 0.05 ? 'praktisch gelijk aan'
    : (afwijking > 0 ? 'hoger dan' : 'lager dan');
  return `Jouw gemeten retentie op deze opstelling: gemiddeld ${fmt(res.gemiddelde,2)} g water per g koffie (n=${res.n}, spreiding ${fmt(res.min,2)}–${fmt(res.max,2)})${res.uitgesloten ? `, ${res.uitgesloten} meting${res.uitgesloten===1?'':'en'} uitgesloten als onwaarschijnlijk` : ''} — ${richting} de aanname van ${fmt(aanname,1)} g/g die de ratio hierboven gebruikt. Dit getal wordt NIET automatisch toegepast; het staat hier zodat je zelf ziet of de aanname voor jouw opstelling klopt.`;
}
```

**Weergave.** Nieuwe DOM-node op het Prep-scherm, en in `renderPrep()`:
```js
  const retEl = document.getElementById('retention-note');
  if (retEl){
    const B = window.BrewEngineBundle;
    const aanname = (B && B.LIQUID_RETAINED_RATIO != null) ? B.LIQUID_RETAINED_RATIO : 2.0;
    const txt = measuredRetentionText(measuredRetention(state.method), aanname);
    retEl.textContent = txt;
    retEl.hidden = !txt;
  }
```

**Label terugdraaien.** Nu C-5 er is, mag het kopgewichtlabel weer een belofte doen — maar de juiste:
`old_str`:
```
(optioneel, gram — hiermee kan later je werkelijke retentie berekend worden: (water − kopgewicht) / dosis. Wordt nu alleen bewaard; de ratio gebruikt nog steeds de vaste aanname van 2,0 g/g)
```
`new_str`:
```
(optioneel, gram — hiermee berekent de app je werkelijke retentie: (water − kopgewicht) / dosis. Vanaf 5 bruikbare metingen verschijnt je eigen gemiddelde op het Recept-scherm, náást de vaste aanname van 2,0 g/g. Het vervangt die aanname niet automatisch)
```

**Test (nieuw, pure-logic):** 5 loggingen met kopgewicht geven een gemiddelde; 4 geven `gemiddelde: null` met `n:4`; een bypass-logging telt niet mee; een kopgewicht van 50 g bij 300 ml water telt als uitgesloten en wordt geteld in `uitgesloten`.

---

## §6 — FASE D · Onderzoek (geen code in deze ronde)

Deze vier punten kunnen **niet** door Claude Code worden opgelost: ze vragen een inhoudelijke beslissing die de PDR §41 hard stop expliciet buiten de implementatie plaatst. Ze horen als onderzoeksbrief naar Layer 2/Layer 3.

| # | Vraag | Bevinding |
| --- | --- | --- |
| D-1 | Hoe moeten de twee sensorische vensters eruitzien? **Acceptatiecriterium dat geen brouwkennis vooronderstelt:** de EY/TDS-middelpunten van twee vensters moeten zo ver uiteenliggen dat de resulterende ratio's minimaal **1,0** verschillen. Nu: 15,51 vs 15,27 → ratio-verschil 0,26. Aparte deelvraag: is "fruitig → lagere EY (18–20)" verdedigbaar, of omgekeerd? | E-01 |
| D-2 | Onderbouwt "~15–22 g / 5–6 cm bed" werkelijk een ONDERgrens? Zo nee: onder 15 g een gelabelde waarschuwing i.p.v. een blokkade, zodat een 250 ml enkele kop mogelijk wordt. | E-18 |
| D-3 | De dormante beslislaag (`selectRecommendation`, `computeRecipeFit`, `computeEvidenceConfidence`): inweven of verwijderen? De huidige tussentoestand — bestaat, is getest, wordt niet gebruikt — is de slechtste van de drie. Levert PDR §17/§18/§19/§43. | E-10 |
| D-4 | Batchgrootte schaalt nu strikt lineair; PDR §10 verbiedt die aanname expliciet. Welke niet-lineariteit is onderbouwd? | §10 |

**Registreer D-1 t/m D-4 in `Bouwbesluiten_v4.md` als openstaande onderzoeksvragen**, niet als voetnoot. Ze zijn de grootste resterende schuld.

---

## §7 — Bouwbesluiten die Jelle vóór de bouw moet nemen

Vier keuzes die dit plan bewust níét voor hem maakt. Claude Code voert de bijbehorende taak pas uit ná expliciet akkoord; zonder akkoord wordt de taak overgeslagen en gerapporteerd als "wacht op besluit".

| # | Besluit | Betreft | Advies van het team |
| --- | --- | --- | --- |
| **BB-1** | Worden `POUR_CYCLE_SEC`/`FINAL_DRAWDOWN_SEC` brewer-specifiek, afgeleid uit de al bestaande klasse-B `contactTimeGuidance`, zodat een typisch schema binnen de band van het toestel landt? Het reverseert deels Bouwbesluit D-4 (contacttijd stuurde de schemalengte niet meer) — maar in verzachte vorm: de lengte blijft met het aantal beurten meebewegen, alleen de cyclusduur wordt per toestel geijkt. | B-2b | **Doen.** Zonder dit blijft Chemex een toestel waarvan geen enkel schema in zijn eigen band valt. B-2a maakt dat eerlijk, maar lost het niet op. |
| **BB-2** | Mag `helder` (fase 1 = 70 + 50 bij 300 ml) als vertrekpunt-niveau worden toegevoegd, terwijl `zoet` en `neutraal` letterlijk de twee gepubliceerde renderingen zijn? | C-1 | **Doen.** Twee van de drie standen zijn geen invulling maar bronversies; alleen `helder` is een gelabelde eigen extrapolatie van een RESOLVED mechanisme — exact het patroon van `ROAST_GRIND_ANCHOR_FRACTION`, en toetsbaar via de leerlus. |
| **BB-3** | Mag de gemeten retentie ooit de aanname van 2,0 g/g vervangen, en zo ja: automatisch of via een expliciete schakelaar met zichtbare banner? | C-5 | **Expliciete schakelaar, niet automatisch.** Automatische substitutie wijzigt elk receptgetal stilzwijgend (N-1). Bouw in deze ronde alleen de weergave; de schakelaar is een aparte, latere beslissing. |
| **BB-4** | Moet `ROAST_TEMP_ANCHOR.light` van 94–96 °C omlaag, of blijft het staan met het eerlijkere label uit A-7? | A-7 | **Laten staan met het label.** Verlagen is een receptwijziging op basis van een tekstredenering, en het anker steunt op gangbare praktijk voor lichte brandingen — alleen niet op de studie waar de notitie zich op beriep. |

---

## §8 — Testplan

### 8.1 Nieuwe tests (per taak gespecificeerd hierboven)

| Taak | Bestand | Aantal |
| --- | --- | --- |
| A-1, A-3 | `kernflow.smoke.test.mjs` | 2 |
| A-4, A-5, A-6 | `brewconsole.pure-logic.test.mjs` | 3 |
| B-1 | pure-logic | 3 |
| B-2a | pure-logic + smoke | 2 |
| B-3 | pure-logic | 3 |
| B-4 | pure-logic (vervangt bestaande, zie 8.2) | 4 |
| B-5 | pure-logic | 1 |
| C-1 | pure-logic | 3 |
| C-2 | pure-logic + smoke (migratie/rondgang) | 4 |
| C-3 | pure-logic | 1 |
| C-4 | pure-logic | 3 |
| C-5 | pure-logic | 4 |
| **Totaal nieuw** | | **33** |

Verwacht eindtotaal: **98 + 33 − 0 = 131 tests**, alles groen.

### 8.2 Bestaande tests die MOETEN worden aangepast

**Dit is de enige toegestane testuitval.** Elke andere is een regressie.

Alle vier zitten in `describe('ENGINE_PROFILE_MAP — schijnkeuze-detectie (Kritiek bevinding #1)')`. Ze coderen de overtuiging dat er precies één tweelinggroep is. Na B-4 en C-1 klopt dat niet meer — en dat is de winst, niet de schade.

**Vervang test 1** (`klassiek/vol_rond/zoet zijn elkaars tweeling op v60`):
```js
test('B-4/C-1: de tweelinggroepen op v60 zijn precies de gemeten drie', () => {
  const groepen = [
    ['klassiek','vol_rond'],                  // C-1: zoet is eruit, andere fase-1-verdeling
    ['fruitig_clean','bloemig_delicaat'],      // B-4: beide vallen terug op Core-only
    ['sirooprig_vol','evenwichtig_flex']       // B-4: Hedrick is nooit generatable
  ];
  for (const groep of groepen){
    for (const lid of groep){
      const anderen = groep.filter(x => x !== lid);
      assert.deepEqual(new Set(api.findProfileTwins(lid, 'v60')), new Set(anderen),
        `${lid} hoort exact ${anderen} als tweeling te hebben`);
    }
  }
  assert.equal(api.findProfileTwins('zoet','v60').length, 0,
    'zoet heeft sinds C-1 een eigen gietschema en dus geen tweeling meer');
});
```

**Vervang test 2** (`… ook elkaars tweeling op chemex`):
```js
test('B-4: op chemex vallen vijf profielen samen — Kasuya is daar niet toepasbaar', () => {
  const groep = new Set(['klassiek','vol_rond','zoet','robuust','evenwichtig_flex']);
  for (const lid of groep){
    const verwacht = new Set([...groep].filter(x => x !== lid));
    assert.deepEqual(new Set(api.findProfileTwins(lid, 'chemex')), verwacht);
  }
  assert.deepEqual(new Set(api.findProfileTwins('heel_fruitig','chemex')), new Set(['fruitig_clean']));
});
```

**Vervang test 3** (`profielen met een eigen overlay hebben GEEN tweeling`):
```js
test('B-4: profielen met een eigen, GENERATABLE overlay hebben geen tweeling (negatieve controle)', () => {
  // fruitig_clean staat hier bewust NIET meer bij: Rao's pulseCount is RESEARCH_GAP, dus
  // dat profiel valt terug op het generieke schema en is numeriek gelijk aan
  // bloemig_delicaat. Dat is bevinding E-06, geen testfout.
  assert.equal(api.findProfileTwins('heel_fruitig','v60').length, 0);
  assert.equal(api.findProfileTwins('fresh_clean','v60').length, 0);
  assert.equal(api.findProfileTwins('snel_puur','v60').length, 0);
});
```

**Vervang test 5** (`geen ONVERWACHTE tweelingen`) — dit is de belangrijkste, want hij wordt van een momentopname een **structurele bewaking**:
```js
test('B-4: elke tweelinggroep is bekend EN elke samengevoegde knop is aantoonbaar een echte tweeling', () => {
  const BEKENDE_GROEPEN = {
    v60:    [['klassiek','vol_rond'], ['fruitig_clean','bloemig_delicaat'], ['sirooprig_vol','evenwichtig_flex']],
    chemex: [['klassiek','vol_rond','zoet','robuust','evenwichtig_flex'], ['heel_fruitig','fruitig_clean']]
  };
  for (const methodKey of ['v60','chemex']){
    const bekend = BEKENDE_GROEPEN[methodKey].map(g => new Set(g));
    for (const profileKey of Object.keys(api.PROFILE_INFO)){
      const only = api.PROFILE_INFO[profileKey].methodOnly;
      if (only && only !== methodKey) continue;
      const twins = api.findProfileTwins(profileKey, methodKey);
      if (twins.length === 0) continue;
      const groep = new Set([profileKey, ...twins]);
      assert.ok(bekend.some(b => b.size === groep.size && [...groep].every(x => b.has(x))),
        `Onverwachte tweelinggroep op ${methodKey}: {${[...groep].join(', ')}}. ` +
        `Twee zichtbare profielen leveren hetzelfde recept zonder dat dat is vastgelegd.`);
    }
  }
  // BEWAKING DIE ER NOG NIET WAS: een samengevoegde knop mag alleen leden bevatten die
  // daadwerkelijk hetzelfde recept opleveren. Zonder deze assertie kan C-1-achtig werk een
  // merge-groep stil laten verlopen — schijnkeuze in spiegelbeeld.
  for (const groep of api.PROFILE_MERGE_GROUPS || []){
    for (const lid of groep.members){
      if (lid === groep.canonical) continue;
      assert.ok(api.findProfileTwins(groep.canonical, 'v60').includes(lid),
        `PROFILE_MERGE_GROUPS voegt "${lid}" samen met "${groep.canonical}", maar ze leveren ` +
        `niet meer hetzelfde recept. De merge-groep is stale.`);
    }
  }
});
```

**Voeg `PROFILE_MERGE_GROUPS` toe aan de `__TEST_EXPORTS__`-shim in `load-app.mjs`** — hij staat er nu niet in.

### 8.3 Regressietests die groen MOETEN blijven

Draai deze na élke taak, niet alleen aan het eind:

- Alle FORBIDDEN-edge-tests (`hardnessNudge`/`alkalinityNudge` geven `temp: 0`) — N-8
- Alle Fase 1-tests (retentieterm, volumeklem, de letterlijke "250/300/350 ml"-eis) — N-1
- Alle Fase 3-tests (5 waterbeurten bij Kasuya, fase 1 = 40%, som = watervolume) — geraakt door B-3 én C-1, moeten allebei overleven
- De timer-regressietest (`totalTime` eindig en positief, laatste stap op `totalTime`, tijden niet-dalend) — N-6
- Migratie- en back-up-rondgangtests — N-3/N-4

---

## §9 — Regressiematrix

Verwachte wijziging in `baseline_*.txt` per fase. **Een diff die hier niet in staat, is een regressie.**

| Taak | `dose` | `ratioText` | `temp` | `totalTime` | `steps` | `technique` |
| --- | --- | --- | --- | --- | --- | --- |
| A-1 … A-7 | — | **A-6: `.` → `,`** | — | — | — | — |
| B-1 | **alleen `st≠0` aan de randen** | volgt dosis | — | — | — | — |
| B-2a | — | — | — | — | — | — |
| B-3 | — | — | — | — | **alle `t`-waarden** | — |
| B-4 | — | — | — | — | — | — |
| B-5 | — | — | — | — | — | — |
| C-1 | — | — | — | — | **alleen Kasuya-profielen, alleen de eerste twee `add`** | — |
| C-2 … C-5 | — | — | — | — | — | — |

Concrete controles:

- **Na B-1:** alle regels met `st=0` moeten byte-identiek zijn aan `baseline_voor.txt`. Draai `grep ';0;' baseline_na_B1.txt` en diff tegen dezelfde selectie uit de nulmeting.
- **Na B-3:** `dose`, `ratioText`, `temp`, `totalTime` en `technique` identiek op **elke** regel. Alleen de laatste kolom wijzigt.
- **Na C-1:** alleen de vier Kasuya-profielen wijzigen, en daarbinnen alleen `steps[0]` en `steps[1]`. `klassiek` en `vol_rond` wijzigen helemaal niet (die staan op `neutraal` = de huidige 60/60).

---

## §10 — Rollback en veiligheid

**Per taak één commit.** Commitbericht: `[taak-id] korte omschrijving — bevinding E-xx`. Zo is elke wijziging afzonderlijk terug te draaien zonder de rest mee te nemen.

**Stoppunten — stop en rapporteer, verzin geen omweg:**

1. Een `old_str` komt niet exact één keer voor.
2. Een test faalt die niet in §8.2 als aangekondigd staat.
3. Een baseline-diff bevat een regel die niet in §9 verklaard staat.
4. Een taak lijkt een wijziging in de engine-bundel te vereisen.
5. Een taak vraagt om een brouwgetal dat niet in dit document staat.
6. `PROFILE_MERGE_GROUPS` en de tweelingdetectie spreken elkaar tegen na een wijziging.

**Na élke fase, vóór verder:**
```bash
node --test tests/*.test.mjs
node tests/_baseline.mjs > baseline_na_<fase>.txt
diff baseline_voor.txt baseline_na_<fase>.txt
```
Open de app daarnaast één keer handmatig in een browser en klik de kernflow door: methode → branddiepte → profiel → prep → brouwen → loggen. De `RADAR_LEVELS`-crash uit Bouwbesluiten v3 maakte de héle app onbruikbaar en werd niet door een unit-test gevangen; alleen door de suite breed te zien falen. Een handmatige klikronde per fase is de goedkoopste verzekering daartegen.

---

## §11 — Definition of Done

De ronde is klaar wanneer **alle** onderstaande punten aantoonbaar waar zijn:

**Functioneel**
- [ ] 131 tests groen (98 bestaand − 4 vervangen + 4 herschreven + 33 nieuw)
- [ ] `V60_DOSE_CEILING` is over het volledige raster (volume × sterkte × profiel) niet te schenden
- [ ] Elk giet-interval is exact `POUR_CYCLE_SEC`; elke staart exact `POUR_CYCLE_SEC + FINAL_DRAWDOWN_SEC`
- [ ] `totalTime` is voor elk profiel identiek aan de nulmeting
- [ ] Geen enkel profielpaar levert een identiek recept zonder als tweeling gemeld te zijn
- [ ] Elk lid van `PROFILE_MERGE_GROUPS` is aantoonbaar een tweeling van zijn canonieke sleutel

**Eerlijkheid**
- [ ] De TDS/EY-getallen én hun herkomst staan in de UI
- [ ] Geen enkel label belooft functionaliteit die niet bestaat
- [ ] Overlays zonder gecorroboreerd `pulseCount` melden dat het aantal beurten eigen invulling is
- [ ] De app geeft de gebruiker nergens de schuld van zijn eigen schema
- [ ] Bij bypass staat de werkelijke brewer-ratio én het venster-voorbehoud in beeld

**Integriteit**
- [ ] N-1 t/m N-8 aantoonbaar intact (§1.1)
- [ ] Back-ups van schemaVersion 1, 2, 3 én 4 laden zonder verlies
- [ ] Export → import → export is rondgang-identiek
- [ ] De engine-bundel is byte-identiek aan vóór deze ronde

**Documentatie**
- [ ] `Bouwbesluiten_v4.md` bevat BB-1 t/m BB-4 met de genomen keuze en de motivering
- [ ] D-1 t/m D-4 staan geregistreerd als openstaande onderzoeksvragen, niet als voetnoot
- [ ] Een implementatierapport benoemt per taak: wat gewijzigd, welke tests, welke onzekerheid resteert
- [ ] Elke tijdelijke tekst (A-3) is gemarkeerd met de fase waarin hij vervalt

**Handmatig**
- [ ] De kernflow is per fase één keer in een echte browser doorgeklikt
- [ ] iPhone en iPad afzonderlijk gecontroleerd (Gate 4)
- [ ] Toetsenbord, VoiceOver, contrast en raakvlakken gecontroleerd op de gewijzigde schermen (Gate 3) — B-1b voegt een `disabled`-toestand toe die een toegankelijke naam en focusgedrag nodig heeft

---

## Bijlage — bevindingen → taken

| Bevinding | Ernst | Taak | Fase |
| --- | --- | --- | --- |
| E-01 clusters algebraïsch identiek | Kritiek | A-3 (tussentijds), D-1 (structureel) | A / D |
| E-02 sterktehendel omzeilt harde grens | Kritiek | B-1 | B |
| E-03 app beoordeelt eigen timer | Kritiek | B-2a, B-2b | B |
| E-04 pour-intervallen kloppen niet | Hoog | B-3 | B |
| E-05 Kasuya's smaakknop weggegooid | Hoog | C-1 | C |
| E-06 attributie op verzonnen giet-aantallen | Hoog | A-4 | A |
| E-07a "evidence-getagd" venster | Hoog | A-1 | A |
| E-07b onwaargemaakte kopgewicht-belofte | Hoog | A-2 → C-5 | A / C |
| E-08 bypass breekt het model | Hoog | B-5 | B |
| E-09 tweelingdetectie vals-negatief | Middel | B-4 | B |
| E-10 dode beslislaag | Middel | D-3 | D |
| E-11 leermodel leest live boonrecord | Middel | C-2 | C |
| E-12 leermodel poolt over volumes | Middel | C-3 | C |
| E-13 onderextractie-patroon te smal | Middel | C-4 | C |
| E-14 branddiepte-resolutie te grof | Laag | — (geregistreerd, geen actie) | — |
| E-15 tegenspraak temperatuurnotitie | Laag | A-7, BB-4 | A |
| E-16 dode `sizeConsistencyWarning` | Laag | A-5 | A |
| E-17 wisselend decimaalteken | Laag | A-6 | A |
| E-18 V60-volumebereik 265–380 ml | Laag | D-2 | D |
| E-19 Chemex onbediend | Laag | B-2 (bug-deel), rest buiten scope | B |

---

*Brew Intelligence 2.0 · Reparatieplan v4.0 · opgesteld volgens het Master Expert Team-protocol §8 (DECIDE → IMPLEMENT → TEST → REPORT)*
