# Codegeschiedenis (archief)

Dit archief bewaart, woordelijk, de historische commentaarblokken uit `brewconsole_v2_2.html` die in de expertreview van oktober 2026 (R-22) uit de code zijn gehaald of zijn ingekort. De code houdt alleen het *waarom* van vandaag; het verhaal erachter (welke review, welke fix, wat er eerder stond) staat hier. Besluiten zelf staan in `bouwbesluiten_v4.md`.

Per blok: het volgnummer, de regel in het bestand vóór de opruiming, de eerstvolgende coderegel als anker, en de oorspronkelijke tekst.

## #0 · regel 26 · block

Anker: `/* NIEUW (Visual Design 2.0 — Claude Code Implementation Spec, §3.1): --bg/--copper/`

~~~~text
/* FIX (v2.2 kernflow — Bouwbesluit "Kleurtokens & brouwcijfers, nu meenemen"):
       de copper-palette van v1/v2 wordt vervangen door de Style Guide-tokens
       (Ink/Charcoal/Espresso/Caramel/Cream). Waarden zijn niet 1-op-1 uit de Style
       Guide overgenomen, maar via HSL herafgeleid zodat de relatieve hue/sat/lightness-
       verschillen tussen bv. copper en copper-light behouden blijven (zie Brand_UI_Style_
       Guide_Addendum_v1.1 §2) — dat voorkomt dat deze omzetting de bestaande WCAG-audit
       hieronder stilzwijgend doorbreekt. --sage is nieuw (ontbrak in v1/v2 volledig). */
~~~~

## #1 · regel 33 · block

Anker: `--bg:#080B0A;`

~~~~text
/* NIEUW (Visual Design 2.0 — Claude Code Implementation Spec, §3.1): --bg/--copper/
       --text/--sage genudged naar de exacte Ink/Caramel/Cream/Sage-tokens uit de spec.
       Herverifieerd tegen alle bestaande WCAG AA-eisen hierboven (nooit versoepeld, alleen
       verbeterd — copper vs bg 6.21:1→8.88:1, copper vs surface-2 4.67:1→6.47:1, sage vs
       surface-2 blijft >5:1, text-dim/text-faint blijven boven hun bestaande 4.5:1-marge
       tegen zowel de nieuwe --bg als de ongewijzigde --surface-2). Extend, not replace:
       --copper-light/--copper-dim/--danger/--berry/--text-dim/--text-faint/--surface/
       --surface-2/--border blijven ongewijzigd (al audit-geverifieerd, honderden
       toepassingen) — alleen --copper-light krijgt een evenredige nudge zodat hij
       zichtbaar lichter blijft dan de nieuwe, al lichtere --copper. */
~~~~

## #2 · regel 49 · block

Anker: `--text-faint:#9C8F82;`

~~~~text
/* FIX (teamreview v2 — Midden bevinding, Accessibility Expert), gecorrigeerd voor de
       nieuwe --surface-2 hierboven: #9A8C7F haalde 4.84:1 op de OUDE --surface-2 (#2A2119),
       maar zakt naar 4.41:1 op de nieuwe Espresso-afgeleide --surface-2 (#2A2A26) — onder de
       WCAG AA-drempel van 4.5:1. #9C8F82 (kleinste bruikbare lichtheid-nudge) haalt 4.57:1 op
       --surface-2, met behoud van de lichtheid-volgorde tekst > text-dim > text-faint. */
~~~~

## #3 · regel 60 · block

Anker: `--berry:#A24A5E;`

~~~~text
/* NIEUW (vervolgplan v2.3, Bouwbesluit B5/Fase 4): eigen token voor een attentie-
       signaal dat GEEN foutmelding is (bijv. "Bijna op" op een boonkaart) — de canvas
       gebruikt hiervoor #A24A5E naast --danger, zodat een voorraadwaarschuwing niet
       als error leest. Lichte-thema-waarde HSL-herafgeleid volgens dezelfde methode als
       --danger hierboven (zie FIX-comment bovenaan dit blok), gecontroleerd op ≥4.5:1
       tegen --surface in beide thema's. */
~~~~

## #4 · regel 85 · block

Anker: `--surface-floating:rgba(28,28,26,.72); /* Level 2 glass: --surface met alpha, zie §6 */`

~~~~text
/* NIEUW (Visual Design 2.0, §3-§9/§24): semantische laag bovenop de bestaande tokens
       hierboven — alias, geen vervanging (zie toelichting bovenaan dit blok). Nieuwe
       componenten (§24) gebruiken deze namen; bestaande, al-geverifieerde regels blijven
       gewoon --bg/--surface/--copper/... rechtstreeks gebruiken. */
~~~~

## #5 · regel 124 · block

Anker: `--text-faint:#695643;`

~~~~text
/* FIX, gecorrigeerd voor de nieuwe --surface-2 hierboven: #6B5744 zakte van 4.52:1 op de
       oude --surface-2 (#E1D0B4) naar 4.47:1 op de nieuwe (#D9D0C1) — net onder de AA-drempel.
       #695643 (kleinste bruikbare lichtheid-nudge) haalt 4.56:1 op --surface-2. */
~~~~

## #6 · regel 135 · block

Anker: `--surface-floating:rgba(226,218,205,.78);`

~~~~text
/* NIEUW (Visual Design 2.0, §3-§9): zelfde semantische aliaslaag als het donkere
       thema hierboven — gebruiker akkoord "licht thema meeschalen met dezelfde tokens".
       De onderliggende kleurwaarden blijven de bestaande, al WCAG-geverifieerde lichte-
       thema-tokens (geen nieuwe Caramel-berekening voor licht — de spec zelf is
       donker-georiënteerd en geeft geen lichte-thema-waarden; hergebruik voorkomt een
       ongeverifieerde contrastwijziging op een thema dat de spec niet beschrijft). */
~~~~

## #7 · regel 150 · block

Anker: `body::before{`

~~~~text
/* NIEUW (Visual Design 2.0, §5 Atmospheric light — "Default: nearly black with barely
     visible warm espresso radial light"): een vaste, zeer subtiele gloed rechtsboven de
     viewport. z-index:-1 + pointer-events:none op een fixed pseudo-element van <body>, dus
     geen enkele klikbare laag of stacking-context van bestaande content verandert. Alleen
     voor het donkere thema — de spec geeft geen lichte-thema-variant en de bestaande
     lichte-thema-kleuren zijn al WCAG-geverifieerd zonder deze laag (§6.2 in de conversatie:
     "licht thema meeschalen met dezelfde tokens", niet met een nieuwe, ongeverifieerde gloed). */
~~~~

## #8 · regel 163 · block

Anker: `.splash-screen{`

~~~~text
/* NIEUW (Visual Design 2.0 fase 2, detail-referentie scherm 01 "Splash/Launch"): een
     puur decoratief, ÉÉNMALIG openingsmoment. pointer-events:none staat vanaf de eerste
     frame vast — de splash onderschept dus NOOIT een klik, ook niet tijdens het zelf nog
     zichtbaar zijn. Bestaande/automatische interactie (incl. de hele Playwright-testsuite,
     die meteen na 'load' al klikt) is daarmee gegarandeerd ongewijzigd; dit is zuiver een
     visuele laag bovenop, geen wachttijd of navigatie-wijziging. */
~~~~

## #9 · regel 174 · block

Anker: `animation:splashOut var(--motion-standard) var(--ease-in) .5s both;`

~~~~text
/* FIX (Pagina-Polish-spec §3.3): doel is ~0,5s zichtbaar, geen kunstmatige 1-2s wachttijd
       — was 1,6s vertraging + 0,6s fade (~2,2s totaal). Fade-out nu var(--motion-standard),
       binnen de gevraagde 200-280ms. */
~~~~

## #10 · regel 208 · block

Anker: `/* NIEUW (Visual Design 2.0, §3.2 "Level 3 modal/overlay: stronger separation and blur`

~~~~text
/* FIX (teamreview v2 — Laag bevinding, Interaction Designer): in-thema confirm-modal,
     zie #confirm-modal hierboven in de body en showConfirmModal() in het script. */
~~~~

## #11 · regel 210 · block

Anker: `.modal-overlay{`

~~~~text
/* NIEUW (Visual Design 2.0, §3.2 "Level 3 modal/overlay: stronger separation and blur
     where useful", §6 "appropriate sheets/modals"): backdrop-filter blur op de overlay
     zélf — wat erachter staat vervaagt, de modal-box blijft volledig ondoorzichtig (§6
     "text remains fully opaque", en een confirm-dialoog is precies de plek waar leesbaarheid
     zwaarder weegt dan glaseffect). @supports-fallback: zonder backdrop-filter blijft de
     bestaande, altijd al voldoende contrastrijke rgba(10,7,5,.6)-overlay gewoon staan. */
~~~~

## #12 · regel 225 · block

Anker: `@keyframes modalIn{ from{ opacity:0; transform:scale(.97) translateY(4px); } to{ opacity:1; transform:scale(1) translate`

~~~~text
/* NIEUW (§9 micro-interactions, "cards use subtle opacity/translate entrance"): de modal
     was tot nu toe abrupt (display:none -> flex, geen overgang). [hidden] verwijderen laat
     het element opnieuw layouten, dus de animatie speelt elke keer opnieuw af — standaard,
     browser-onafhankelijk gedrag, geen JS nodig. Reduced-motion-override (regel ~939,
     ongewijzigd) dekt dit automatisch mee. */
~~~~

## #13 · regel 261 · block

Anker: `.texture-grain{ position:relative; isolation:isolate; }`

~~~~text
/* NIEUW (Visual Design 2.0, §19 Subtle texture): microscopische monochrome grain,
     ~1-2% opacity, op geselecteerde grote donkere oppervlakken — CSS-only (geen
     afbeelding, dus geen offline-risico, §23). Nooit op tekstdragende elementen direct
     (§19 "never reduce text clarity") — toegepast via ::after op de achtergrond, niet op
     de content zelf. */
~~~~

## #14 · regel 366 · block

Anker: `.screen-header-row{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:20px; }`

~~~~text
/* NIEUW (Pagina-Polish-spec §4.1 "Title links. Plus button rechtsboven."): generieke
     titel+actie-header-rij, herbruikbaar voor elk scherm dat een primaire header-actie
     nodig heeft — vandaag alleen Bonen. */
~~~~

## #15 · regel 381 · block

Anker: `.triage-header-icon{`

~~~~text
/* NIEUW (Pagina-Polish-spec §6, Triage-scherm): subtiel expert/vraag-icoon boven de titel,
     en de "één vraag per stap"-kaart met genummerde categorie, radiokaart-opties (surface +
     copper + check i.p.v. alleen kleur, spec §6.2) en een voortgangsindicator. */
~~~~

## #16 · regel 438 · block

Anker: `.choice-card{`

~~~~text
/* NIEUW (Visual Design 2.0, §15 Methode/Roast/Profiel-keuzeschermen): dezelfde
     Level-1-kaartdiepte (shadow-card) en motion-tokens als de andere keuzecomponenten —
     kleur/selectiegedrag/hover-lift ongewijzigd. */
~~~~

## #17 · regel 503 · block

Anker: `.profile-twin-note{font-size:var(--fs-label); color:var(--text-faint); font-style:italic; display:block; margin-top:4px;`

~~~~text
/* FIX (teamreview v2, UX Researcher/Devil's Advocate — Kritiek bevinding #1): badge op
     profielkaarten die vandaag naar exact hetzelfde recept resolven, zie findProfileTwins(). */
~~~~

## #18 · regel 638 · block

Anker: `.profile-twin-banner{`

~~~~text
/* FIX (teamreview v2 — Kritiek bevinding #1): expliciete "hetzelfde recept"-banner op
     het Prep-scherm zelf, niet alleen op de keuzekaart — zie renderPrep(). Bewust iets
     zichtbaarder dan de kale .disclaimer-tekst (achtergrondkleur i.p.v. puur tekstkleur),
     want dit is geen kleine kanttekening maar precies de eerlijkheid die Spanning 2 uit
     de plenaire discussie vroeg. */
~~~~

## #19 · regel 649 · block

Anker: `.prep-intel-card{`

~~~~text
/* NIEUW (visuele afstemming referentiebeeld: "Brew Intelligence"/"Jouw signaal"-kaarten):
     icoon+titel+badge-kaartvorm, hergebruikt voor beide — inhoud/data blijft exact wat de
     onderliggende functies al teruggaven, puur nieuwe omkadering. */
~~~~

## #20 · regel 657 · block

Anker: `.prep-intel-card[hidden]{display:none;}`

~~~~text
/* FIX (zelfde klasse fout als eerder bij .bean-search-row/.advisor-link): display:flex
     wint van de standaard [hidden]-UA-stijl. */
~~~~

## #21 · regel 670 · block

Anker: `.serving-row{`

~~~~text
/* NIEUW (Visual Design 2.0, §12 Recipe-scherm): serving-row en stepper-knoppen krijgen
     hetzelfde Level-1-kaartgewicht (shadow-card) en tactiele press-state als de andere
     interactieve componenten — waarde/berekening (serving-value) ongewijzigd. */
~~~~

## #22 · regel 700 · block

Anker: `#stats-grid{ position:relative; }`

~~~~text
/* NIEUW (Visual Design 2.0, §5 "Recipe: slightly warmer focal glow around primary recipe
     area"): alleen op #stats-grid (het dosis/maling/temperatuur/water-blok van het Recept-
     scherm, §12) — niet op de gedeelde .stats-grid-class die renderInsightsScreen() ook
     hergebruikt (Inzichten heeft geen "primaire receptwaarden" om te accentueren). Puur een
     achtergrondgloed via ::before, z-index:-1 binnen de eigen stacking-context van het grid
     (position:relative), dus de kaarten zelf en hun klik-doelen blijven ongewijzigd. */
~~~~

## #23 · regel 712 · block

Anker: `.stat-block{`

~~~~text
/* NIEUW (Visual Design 2.0, §24 MetricCard): tactiele diepte (§3.2 Level 1 card) +
     tabular-nums op de primaire waarde (§4 "20.0→19.5 does not shift layout") — geen
     nieuwe class, bestaande .stat-block/.stat-value upgraden i.p.v. vervangen (§28:
     "prefer upgrading/reusing"). */
~~~~

## #24 · regel 723 · block

Anker: `.stats-grid.stats-grid--three{ grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-bottom:0; }`

~~~~text
/* NIEUW (meetoverzicht adviezen): drie tegels altijd op één rij, ook op een smalle telefoon
     en ook boven de 4-koloms breakpoint verderop (vandaar de dubbele class). */
~~~~

## #25 · regel 732 · block

Anker: `.stat-icon{ width:13px; height:13px; flex-shrink:0; opacity:.85; }`

~~~~text
/* NIEUW (visuele afstemming referentiebeeld recept-scherm): klein line-icoon per primair
     statblok (boon/druppel/thermometer) — puur decoratief bij het bestaande label, geen
     nieuwe data. */
~~~~

## #26 · regel 739 · block

Anker: `.stat-more-toggle{`

~~~~text
/* NIEUW (visuele afstemming referentiebeeld): lokale "meer info"-toggle binnen een
     stat-block (vandaag alleen Maalgraad) — houdt de kaart standaard compact terwijl de
     volledige, ongewijzigde toelichting één tik verderop blijft. */
~~~~

## #27 · regel 750 · block

Anker: `.stat-block--secondary .stat-value{font-size:var(--fs-small); color:var(--text-dim); font-variant-numeric:tabular-nums;}`

~~~~text
/* NIEUW (Visual Design 2.0 fase 2, spec §12 "ratio/grind/brew-time secondary" + §27
     "secondary information stays quiet"): kleinere waarde, gedempt label — zelfde kaart,
     minder visueel gewicht dan de drie dominante stat-blocks. */
~~~~

## #28 · regel 754 · block

Anker: `/* Sprint 3 (UX-review F4): −/+ in de watertegel; het getal zelf opent de modal. */`

~~~~text
/* NIEUW (Visual Design 2.0 fase 3, detail-referentie recept-scherm): het waterhoeveelheid-
     statblok is nu tikbaar (opent #water-modal) — zelfde tactiele taal als .bean-card. */
~~~~

## #29 · regel 805 · block

Anker: `.recipe-rate-note{font-size:var(--fs-label); color:var(--text-faint); margin:-8px 0 14px 2px;}`

~~~~text
/* NIEUW (Visual Design 2.0, §12): recipe-table krijgt shadow-card zodat het kernrecept
     (de belangrijkste content van dit scherm) hetzelfde elevated-kaart-gewicht heeft als
     stats-grid/stat-block erboven — cel-inhoud/berekeningen ongewijzigd. */
~~~~

## #30 · regel 830 · block

Anker: `.recipe-table tbody tr{ cursor:pointer; transition:background var(--motion-standard) var(--ease-out); }`

~~~~text
/* NIEUW (visuele afstemming referentiebeeld "pour step detail"): elke zetstap-rij is
     tikbaar (opent #pourstep-modal) — subtiele hover/press-feedback, geen nieuwe kolom. */
~~~~

## #31 · regel 848 · block

Anker: `/* Sprint 5 (UX-review): drie vaste knopvarianten. Nieuwe code gebruikt .btn-primary /`

~~~~text
/* NIEUW (Visual Design 2.0, §7/§8 PrimaryButton — tactile/soft-physical): subtiele
     elevatie + inner highlight in rust, iets dieper bij press (§7 "pressed state visually
     moves inward ~1-2px", §8 "small scale/depth change, never bounce"). Kleur/geometrie
     ongewijzigd — alleen echte diepte toegevoegd. */
~~~~

## #32 · regel 869 · block

Anker: `.prep-cta-row{display:flex; gap:10px; align-items:stretch;}`

~~~~text
/* NIEUW (Visual Design 2.0 fase 2, spec §12 "Start Brew primary, Adjust secondary"):
     Aanpassen (.advisor-primary, al de bestaande SecondaryButton-stijl) + Start Brew
     naast elkaar, Start Brew nadrukkelijk breder/zwaarder — nooit gelijkwaardig aan de
     primaire actie (§27 "no secondary card competes with the primary action"). */
~~~~

## #33 · regel 907 · block

Anker: `#screen-brew{position:relative; text-align:center;}`

~~~~text
/* HERZIEN (op verzoek, na screenshot-feedback "foto liep door over de hele pagina, de
     knoppen/balken onderin voelen los/zwevend"): de foto zat eerder geclipt in een korte
     band (.brew-hero zelf had overflow:hidden + een vaste min-height), waardoor alles
     eronder (giet-badge, voortgang, "Volledig schema", knoppen) op vlak zwart stond —
     vandaar het "zwevende" gevoel. .brew-bg is nu een aparte laag die de VOLLE hoogte van
     #screen-brew beslaat (dus meegroeit met bv. een opengeklapt "Volledig schema"), met
     dezelfde negatieve-marge-truc als voorheen voor de horizontale bleed. #screen-brew
     krijgt position:relative als ankerpunt voor .brew-bg se top/bottom:0; .brew-fg draagt
     de eigenlijke inhoud en stapelt er via position:relative + normale DOM-volgorde
     bovenop (geen z-index-trucs nodig: niet-gepositioneerde elementen zouden vóór een
     position:absolute achtergrond geschilderd worden, dus moet .brew-fg zelf ook
     "gepositioneerd" zijn om na .brew-bg — en dus erboven — te tekenen). */
~~~~

## #34 · regel 944 · block

Anker: `/* HERZIEN (op verzoek — "foto mag nog meer te zien zijn, zwart mag niet te vroeg/te laag`

~~~~text
/* Zelfde donker-gradient-principe als .photo-scrim elders (bewust hardcoded zwart,
     onafhankelijk van het licht/donker-thema — een foto-overlay is altijd donker, net als
     .photo-scrim al deed). HERZIEN: stops herijkt voor de veel langere laag (liep voorheen
     tot de onderkant van de dial-band, nu tot de onderkant van de knoppenrij) — blijft
     boven relatief licht (titel leesbaar, foto herkenbaar), wordt rond de dial/giet-info al
     grotendeels donker (WCAG-contrast voor die tekst), en blijft daarna bijna (niet
     helemaal) zwart — een vleugje textuur i.p.v. een harde overgang naar vlak zwart, zodat
     "Volledig schema"/de knoppen niet meer los op een zwart vlak lijken te zweven. */
~~~~

## #35 · regel 952 · block

Anker: `.brew-hero-scrim{`

~~~~text
/* HERZIEN (op verzoek — "foto mag nog meer te zien zijn, zwart mag niet te vroeg/te laag
     beginnen"): lichter en later verdonkeren dan de vorige ronde. Dit kán, want de meeste
     elementen die over de foto heen staan (giet-badge, next-info-pil, "Volledig schema",
     de ronde knoppen) hebben AL hun eigen ondoorzichtige achtergrond (var(--surface)/
     var(--copper)) en zijn dus niet van deze scrim afhankelijk voor leesbaarheid — alleen
     kale tekst zonder eigen vlak (titel/subtitel, wake-indicator, dial-flow, finish-note,
     brew-cumulative) heeft bescherming nodig, nu via een eigen text-shadow (zelfde patroon
     als de titel al had) i.p.v. een zware scrim over het hele scherm. Onderin (vanaf ~72%,
     achter accordion/knoppen) blijft het wél decisief donker — geen zwak/gewassen effect —
     zodat het "zwevende" gevoel daar goed wordt opgelost. */
~~~~

## #36 · regel 975 · block

Anker: `.stop-btn{`

~~~~text
/* NIEUW (Visual Design 2.0, §13 Brew Timer hero mode): stop-btn zweeft over de foto-
     band zonder eigen paneel eronder — krijgt daarom hetzelfde selectieve-glas-effect als
     de navbar/andere floating controls (§9), met een ondoorzichtige fallback via
     @supports. Positie/tekst/click-handler ongewijzigd.
     HERZIEN (foto-over-hele-pagina-ronde): top/right vereenvoudigd naar 0 — .brew-hero zit
     nu gewoon normaal binnen .app se padding (die de safe area al regelt), dus de eerdere
     max(18px,--safe-*)-optelling zou hier onnodig extra ruimte toevoegen bovenop wat .app
     al geeft. */
~~~~

## #37 · regel 1011 · block

Anker: `.dial-wrap{`

~~~~text
/* NIEUW (Visual Design 2.0, §13 "ambient light" op het hero-moment van de brouwtimer):
     zachte gloed achter de dial — puur een box-shadow op de bestaande wrapper, geen enkel
     SVG-attribuut (r=83/90 waar de JS stroke-dasharray-berekening op leunt) aangeraakt.
     margin (was 56px auto 20px) vereenvoudigd naar 0 auto: de verticale plaatsing komt nu
     van .brew-hero's justify-content:space-between i.p.v. een vaste top-marge. */
~~~~

## #38 · regel 1021 · block

Anker: `.dial-wrap[data-running="true"]{animation:dialGlowPulse 3.2s ease-in-out infinite;}`

~~~~text
/* NIEUW (op verzoek, referentiebeeld): zachte ademende gloed zolang de timer daadwerkelijk
     loopt — puur een box-shadow-animatie op de bestaande ambient-glow (zelfde
     --accent-glow-token, geen nieuwe kleur), losstaand van .flash (dat blijft de
     eenmalige pre-alert-puls). data-running wordt gezet in runTimer()/pauseTimer()/
     resetTimer() — dezelfde plekken die ook setPauseBtnLabel() al aanroepen. Rustig tempo
     (3.2s) i.p.v. een knipperend effect; @media (prefers-reduced-motion:reduce) hierboven
     zet alle animaties al globaal uit (animation:none !important), dus geen aparte regel
     nodig. */
~~~~

## #39 · regel 1048 · block

Anker: `.dial-time{font-size:var(--fs-display); color:var(--text); letter-spacing:.01em; font-weight:600; font-variant-numeric:t`

~~~~text
/* FIX (v2.2 kernflow — Bouwbesluit "Kleurtokens & brouwcijfers"): expliciete
     tabular-nums bovenop de bestaande .mono-klasse (ui-monospace stack). De monospace-
     fontstack maakt cijfers al even breed, maar font-variant-numeric:tabular-nums
     garandeert dat ook in eventuele fallback-fonts en volgt de "brew numerals"-eis uit
     de Style Guide expliciet, i.p.v. impliciet te leunen op het toeval van monospace. */
~~~~

## #40 · regel 1054 · block

Anker: `.dial-total{font-size:var(--fs-label); color:var(--text-faint); margin-top:-3px; font-weight:500;}`

~~~~text
/* NIEUW: "van {totaal}" naast de verstreken tijd (dial-center staat op de ondoorzichtige
     .dial-backdrop-schijf, dus gewoon thema-tokens — geen hardcoded kleur zoals de titel
     hierboven die wél op de rauwe foto staat). */
~~~~

## #41 · regel 1058 · block

Anker: `.dial-live-grams, .dial-water{display:none;}`

~~~~text
/* HERZIEN (focus-herontwerp): deze twee uitlezingen zijn vervangen door de duidelijkere
     #brew-pour-badge/#brew-cumulative hieronder de dial (giet-telling + lopend totaal in
     plaats van losse getallen in de dial zelf) — de JS die ze vult blijft ongewijzigd
     (geen functionaliteit verwijderd, puur visueel overbodig geworden dubbele info). */
~~~~

## #42 · regel 1064 · block

Anker: `.brew-focus-info{margin:0 0 4px;}`

~~~~text
/* NIEUW: giet-voortgang (welke stap, hoeveelste giet van hoeveel) + lopend totaal —
     zie updateDial() in de JS. */
~~~~

## #43 · regel 1158 · block

Anker: `.brew-controls{display:flex; gap:16px; justify-content:center; align-items:center; margin-top:4px;}`

~~~~text
/* NIEUW (Visual Design 2.0 fase 2, detail-referentie scherm 07 "Brew Timer (Active)"):
     ronde iconknoppen i.p.v. rechthoekige tekstknoppen, Pauze nadrukkelijk groter/gevuld
     (primaire actie tijdens het zetten) met Reset kleiner ernaast. Bewust GEEN "skip
     step"-knop — die functionaliteit bestaat niet in de app en zou nieuwe interactielogica
     zijn; ook geen swipe-gesture (evenmin bestaande logica).
     HERZIEN (focus-herontwerp): de vroegere Pauze/Hervat-tekstwissel via textContent is
     vervangen door setPauseBtnLabel() (pauseTimer()/runTimer()/resetTimer() roepen die nu
     aan i.p.v. rechtstreeks textContent te zetten) — toont nu een ⏸/▶-icoon met een
     sr-only tekstlabel i.p.v. zichtbare tekst. De knopstaat/timing/click-handler zelf
     (welke functie wanneer welke staat zet) is ongewijzigd, alleen hóe die staat visueel
     wordt getoond.
     UITGEBREID (op verzoek): een kleine Home-knop links van Pauze — dit is GEEN nieuwe
     interactielogica zoals de skip-step-knop hierboven die bewust werd afgewezen, want hij
     hergebruikt letterlijk de bestaande stop-bevestigingsflow (zie stopBrewTimer() in de
     JS) — alleen het navigatiedoel is nieuw (home i.p.v. prep), de veiligheidsgate
     (bevestigen bij een lopende timer) blijft exact hetzelfde. Bewust kleiner dan Reset
     (44px i.p.v. 60px) zodat hij zich niet aan Pauze/Reset opdringt. */
~~~~

## #44 · regel 1185 · block

Anker: `.brew-controls button svg{width:24px; height:24px; display:block; flex-shrink:0;}`

~~~~text
/* FIX (Safari/WebKit — screenshot-feedback): expliciete afmeting bovenop de width/height-
     attributen op de <svg>'s zelf (dubbele zekerheid, geen visuele wijziging op Chromium
     waar het al goed ging). Zie de toelichting bij de svg-markup in de HTML/JS. */
~~~~

## #45 · regel 1203 · block

Anker: `/* NIEUW (Visual Design 2.0 fase 2, detail-referentie scherm 08): gecentreerd i.p.v.`

~~~~text
/* FIX (v2.2 kernflow, oorspronkelijk) — VERVANGEN in vervolgplan v2.3, Bouwbesluit B2:
     de 88-scorering + ring uit BrewComplete.dc.html was EXPLICIET een voorbeeldcijfer
     (zie het teamreview-commentaar dat hier stond) in afwachting van een goedgekeurde
     formule (tijd/ratio/temperatuur). Die formule is er nog niet — in plaats van het cijfer
     nóg een keer te tonen, is de ring vervangen door #brewlog-honest-summary: een eerlijke,
     tekstuele samenvatting op basis van wat al écht bekend is (dosis/water/tijd/methode),
     ONDER de smaaksliders geplaatst i.p.v. erboven (zie renderBrewLogHonestSummary()). */
~~~~

## #46 · regel 1210 · block

Anker: `.brewlog-complete-header{`

~~~~text
/* NIEUW (Visual Design 2.0 fase 2, detail-referentie scherm 08): gecentreerd i.p.v.
     inline-links, groter vinkje met een sterkere gloed (§14 "success glow" nu ook
     letterlijk zichtbaar als celebratory moment, niet alleen een randje). */
~~~~

## #47 · regel 1237 · block

Anker: `.brewlog-sliders{`

~~~~text
/* NIEUW (Visual Design 2.0, §14): de smaaksliders krijgen hetzelfde paneel-niveau als
     de andere elevated content-blokken — puur omkadering op de bestaande, al-bestaande
     wrapper-div; de sliders/labels/waarden zelf (en hun input-listeners) ongewijzigd. */
~~~~

## #48 · regel 1254 · block

Anker: `.brewlog-entry-fav{`

~~~~text
/* NIEUW (Visual Design 2.0 fase 2, detail-referentie scherm 10 "History"): favoriet-
     toggle per logging — puur een nieuw boolean-veld (entry.favorite), zie
     toggleBrewLogFavorite() hierboven het script. --berry (bestaande token) i.p.v. een
     nieuwe kleur voor de actieve staat. */
~~~~

## #49 · regel 1294 · block

Anker: `.advisor-link[hidden]{display:none;}`

~~~~text
/* FIX (self-caught tijdens Bonen-header-controle, zelfde klasse fout als .bean-search-row
     eerder): display:block hierboven wint van de standaard [hidden]-UA-stijl. #bean-add-link
     wordt sinds de Pagina-Polish-spec conditioneel verborgen (alleen lege-staat-CTA) — zonder
     deze regel bleef hij altijd zichtbaar. */
~~~~

## #50 · regel 1299 · block

Anker: `.pill-cta{`

~~~~text
/* NIEUW (visuele afstemming referentiebeeld Bonen-scherm "+ Nieuwe boon"-pil): gevulde,
     rond-afgeronde primaire actieknop — zelfde taal als .start-btn maar pill-vormig, voor
     plekken waar een volle-breedte primaire CTA past zonder de zwaardere .start-btn-hoogte. */
~~~~

## #51 · regel 1311 · block

Anker: `.settings-danger-btn{ border-color:var(--danger); color:var(--danger); border-style:solid; }`

~~~~text
/* NIEUW (Visual Design 2.0 fase 2, Instellingen "Reset app"): destructieve variant van
     dezelfde SecondaryButton-vorm — nooit gevuld/prominent zoals .start-btn, dat zou een
     destructieve actie visueel laten concurreren met een primaire CTA (§27). */
~~~~

## #52 · regel 1316 · block

Anker: `.advisor-primary, .btn-secondary{`

~~~~text
/* NIEUW (Visual Design 2.0, §7/§24 SecondaryButton): zelfde tactiele press-diepte als
     .start-btn, maar bescheidener (secundaire actie) — nooit sterker ogen dan de primaire
     CTA (§27 "no secondary card competes with the primary action"). */
~~~~

## #53 · regel 1336 · block

Anker: `.link-secondary[hidden]{display:none;}`

~~~~text
/* FIX (Implementatieplan Zetadvies v3.0, Fase 6): .link-secondary se eigen
     "display:block" heeft dezelfde specificiteit als de UA-standaardregel "[hidden]{display:
     none}", en wint daar via de auteur-vs-UA-cascadelaag altijd van — dus zonder deze regel
     bleef #prep-suggestion-water-link zichtbaar staan ondanks .hidden=true. Tot Fase 6 werd
     deze knopklasse alleen gebruikt op een knop die NOOIT los verborgen werd (alleen de hele
     bannerouder eromheen); dit is de eerste plek die het los moet kunnen, en dus de eerste
     plek waar deze latente bug zichtbaar werd. */
~~~~

## #54 · regel 1385 · block

Anker: `.star-bg{color:var(--text-faint);}`

~~~~text
/* FIX (SMAAKKARAKTER-sterren, leesbaarheid): var(--border) was hetzelfde subtiele
     lijntje-grijs als een dunne rand — een terechte "0 van de 5"-score (classifyProfile()
     vond gewoon geen match voor dit profiel) oogde daardoor als een lege/kapotte knop
     i.p.v. een zichtbaar berekend resultaat. var(--text-faint) is duidelijk feller dan
     --border in beide thema's, maar nog steeds duidelijk zwakker dan de --copper-vulling. */
~~~~

## #55 · regel 1392 · block

Anker: `.advice-tie-note{font-size:var(--fs-label); color:var(--text-faint); margin:4px 0 0;}`

~~~~text
/* NIEUW (bijna-gelijke-stand): default = de oude, passieve informatieve toon (kleine,
     zwakke tekst — gebruikt wanneer een tie inmiddels is opgelost). [data-pending="true"]
     is de actieve variant: geen chip is voorgeselecteerd, dus dit moet opvallen genoeg zijn
     om niet als "kapot scherm" over te komen — accent-gekleurde linkerrand + achtergrondtint,
     hergebruikt --accent-glow (bestaande "--copper op lage alpha"-token, zie hierboven bij
     de theme-vars) i.p.v. een nieuwe kleurmix te verzinnen. */
~~~~

## #56 · regel 1403 · block

Anker: `.chip{`

~~~~text
/* NIEUW (Visual Design 2.0, §7/§24 SegmentedControl/Tag): een geselecteerde chip
     "voelt seated/elevated" (§7) — subtiele inset-highlight i.p.v. alleen een kleur-
     wissel; press-state beweegt licht naar binnen. Radius blijft 999px (pillen zijn
     hier het juiste gebruik, §3.3: "pills reserved for tags/status"). */
~~~~

## #57 · regel 1426 · block

Anker: `.advice-cta{`

~~~~text
/* NIEUW (Visual Design 2.0, §7 PrimaryButton): zelfde tactiele press-diepte als .start-btn
     — .advice-cta is de primaire CTA binnen het advies-resultaat. */
~~~~

## #58 · regel 1445 · block

Anker: `.form-input{`

~~~~text
/* NIEUW (Visual Design 2.0, §12/§24): form-input krijgt een zachte accent-glow bij focus
     i.p.v. alleen een randkleur-wissel — puur een extra box-shadow, geen gedragswijziging. */
~~~~

## #59 · regel 1514 · block

Anker: `.bean-fav{`

~~~~text
/* NIEUW (Visual Design 2.0 fase 3, boon-niveau favorieten): zelfde knop-geometrie als
     .bean-edit/.bean-delete, kleurtaal van .brewlog-entry-fav (--berry als "aan"-status). */
~~~~

## #60 · regel 1549 · block

Anker: `.bean-search-row[hidden]{display:none;}`

~~~~text
/* FIX (self-caught tijdens screenshot-controle): een class-selector met display:flex
     wint van de standaard [hidden]-UA-stijl (display:none) qua specificiteit, waardoor de
     zoek/sorteer-balk altijd zichtbaar bleef, ook bij <4 bonen ondanks searchRow.hidden=true
     in renderBeanLibraryScreen(). Puur een CSS-specificiteitsfix, geen JS aangeraakt. */
~~~~

## #61 · regel 1564 · block

Anker: `.radar-wrap{`

~~~~text
/* NIEUW (Visual Design 2.0, §11 Bean Detail — "Taste/process tags are compact and
     tasteful"): radar-chart krijgt hetzelfde paneel-niveau (surface-1 + shadow-card) als
     andere elevated content-blokken — alleen omkadering, de SVG/kleuren zelf ongewijzigd. */
~~~~

## #62 · regel 1606 · block

Anker: `.splash-screen{ display:none; }`

~~~~text
/* NIEUW (Visual Design 2.0 fase 2, Splash-scherm): de animation:none hierboven zou de
       splash anders voor altijd LATEN STAAN, want zijn verdwijnen is zelf een animatie
       (splashOut) — reduced-motion moet 'm dus meteen verbergen i.p.v. nooit laten
       verdwijnen. pointer-events was toch al none, dus dit is zuiver visueel. */
~~~~

## #63 · regel 1709 · block

Anker: `.navbar{`

~~~~text
/* NIEUW (Visual Design 2.0, §16 BottomDock): "refined floating dock" — het referentie-
     beeld toont een gewone vlakke tabbalk (geen losstaande pil), dus dit blijft de
     bestaande, architectuur-compatibele fixed-bottom-balk (§16 "if compatible with
     current architecture"), maar krijgt nu de donkere translucente glass-behandeling
     (§6/§16: subtiele blur, dun laag-contrast randje) i.p.v. een vlakke ondoorzichtige
     surface, plus een ingetogen Caramel-actieve-staat i.p.v. het platte streepje. */
~~~~

## #64 · regel 1779 · block

Anker: `.photo-slot{`

~~~~text
/* NIEUW (Visual Design 2.0, §18 Photography "content, not decoration"): --shadow-card
     toegevoegd zodat foto's dezelfde fysieke aanwezigheid krijgen als andere Level-1-
     oppervlakken — kleur/crop/gradient (photo-scrim hieronder) ongewijzigd. */
~~~~

## #65 · regel 1793 · block

Anker: `.photo-slot--card{aspect-ratio:16/10; width:100%; border-radius:12px;}`

~~~~text
/* NIEUW (foto's methode/roast-keuzekaarten): zelfde neutraal-vlak-principe (Bouwbesluit B6)
     toegepast op de keuzekaarten van methode en roast — zonder foto (data-has-photo="false")
     valt dit terug op precies het icoon/kleurvlak dat er al stond. */
~~~~

## #66 · regel 1819 · block

Anker: `.home-cta{`

~~~~text
/* Home-scherm — NIEUW (Visual Design 2.0, §10): tactiele diepte op de CTA-kaarten en
     een lichte hover/press-lift op de boon-strip-kaarten (al <button>-elementen, alleen
     presentatie toegevoegd — geen enkele klik-handler aangeraakt). */
~~~~

## #67 · regel 1866 · block

Anker: `.bean-detail-fact-grid{`

~~~~text
/* NIEUW (Visual Design 2.0, §11): "Kenmerken"-feiten krijgen hetzelfde paneel-niveau
     als de radar-wrap hierboven — puur presentatie, feit-labels/waarden ongewijzigd. */
~~~~

## #68 · regel 1876 · block

Anker: `.bean-detail-fact-rows{`

~~~~text
/* NIEUW (visuele afstemming referentiebeeld Boon Detail "Boon details"): icoon+label+
     waarde-rijen i.p.v. het 2-koloms grid — uitsluitend bestaande boonvelden, geen nieuwe
     feiten (geen Oogst/Koffiebrander, die bestaan niet in het boonformulier). Het 2-koloms
     .bean-detail-fact-grid hierboven blijft ongewijzigd voor Instellingen/pourstep-modal. */
~~~~

## #69 · regel 1895 · block

Anker: `.detail-tabs{`

~~~~text
/* NIEUW (Visual Design 2.0 fase 2, detail-referentie scherm 04 + spec §11 "use tabs/
     segments for existing detail sections where appropriate"): een SegmentedControl-achtige
     tab-balk voor Bean Detail — zelfde "seated" selectie-taal als .chip[data-selected], maar
     gelijke-breedte segmenten i.p.v. wrappende pillen. */
~~~~

## #70 · regel 1913 · block

Anker: `.bean-detail-best-brew-facts{ font-family:var(--font-body); font-size:var(--fs-body); color:var(--copper-light); margin:`

~~~~text
/* NIEUW (Pagina-Polish-spec §5.4, Best Brew-kaart): zelfde mono/copper "receptgetal"-
     taal als .stat-value/.stat-sub in het Recept-scherm, hier zonder de volledige
     stat-block-kaart eromheen (dit blok zit al binnen bean-detail-best-brew-block). */
~~~~

## #71 · regel 1918 · block

Anker: `.best-brew-card{`

~~~~text
/* NIEUW (visuele afstemming referentiebeeld "Jouw beste brew"): kaartomkadering met
     lichte copper-accent + doel-icoon (startpunt, geen score/trofee-connotatie) — inhoud
     blijft exact wat renderBeanDetailBestBrew() teruggeeft, geen cijfer toegevoegd. */
~~~~

## #72 · regel 1984 · html

Anker: `<div class="splash-screen" id="splash-screen" aria-hidden="true">`

~~~~text
<!-- NIEUW (Visual Design 2.0 fase 2, detail-referentie scherm 01): puur decoratief
     openingsmoment — zie .splash-screen hierboven voor de pointer-events:none-garantie. -->
~~~~

## #73 · regel 1998 · html

Anker: `<div class="modal-overlay" id="confirm-modal" hidden>`

~~~~text
<!-- FIX (teamreview v2 — Laag bevinding, Interaction Designer): in-thema vervanging voor
     window.confirm() — zie showConfirmModal() en de stop-btn-handler onderaan het script.
     Generiek gehouden (labels via JS) zodat een toekomstige tweede bevestiging dit kan
     hergebruiken i.p.v. opnieuw naar window.confirm te grijpen. -->
~~~~

## #74 · regel 2045 · html

Anker: `<div class="modal-overlay" id="water-modal" hidden>`

~~~~text
<!-- NIEUW (Visual Design 2.0 fase 3, detail-referentie recept-scherm "waterhoeveelheid
     aanpassen"-modal): een grotere, tastbaardere versie van de al bestaande
     waterhoeveelheid-stepper (.serving-row/#serving-minus/#serving-plus, die op het
     receptscherm blijft staan — een bestaande test klikt daar rechtstreeks op) — hier
     bereikbaar door op het waterhoeveelheid-statblok te tikken. Zelfde state.waterMl,
     zelfde engineValidVolumeRange()-klem, geen nieuwe berekening of receptlogica; zie
     openWaterModal()/syncWaterModal() verderop in het script. -->
~~~~

## #75 · regel 2067 · html

Anker: `<div class="modal-overlay" id="pourstep-modal" hidden>`

~~~~text
<!-- NIEUW (visuele afstemming referentiebeeld recept-scherm "pour step detail"-modal): tik
     op een zetstap-rij toont dezelfde tijd/water-erbij/totaal-waarden nog eens groter, plus
     de bestaande giet-tip (s.flow/s.note) — geen nieuwe berekening, puur een detailweergave
     van wat #recipe-body al toont. -->
~~~~

## #76 · regel 2082 · html

Anker: `<nav class="navbar" id="navbar" aria-label="Hoofdnavigatie">`

~~~~text
<!-- NIEUW (vervolgplan v2.3, Fase 3 — Navigatiemodel): vaste navigatiebalk met de vijf
       bestemmingen (Home · Bonen · Brouwen · Inzichten · Historie). Wordt op iPhone-breedte
       een onderbalk, vanaf 900px een zijbalk (zie CSS), en verborgen tijdens Brew Mode
       (showScreen() zet [hidden] op #screen-brew). -->
~~~~

## #77 · regel 2110 · html

Anker: `<div id="route-announcer" class="sr-only" aria-live="polite" role="status"></div>`

~~~~text
<!-- NIEUW: route-aankondiging voor screenreaders — showScreen() vult dit bij elke
       schermwissel, aangezien er tot nu toe geen enkel navigatiesignaal was buiten de
       visuele animatie. role="status" + aria-live="polite" i.p.v. "assertive": een
       schermwissel is geen urgent alarm. -->
~~~~

## #78 · regel 2137 · html

Anker: `<section class="screen active" id="screen-home" data-screen="home">`

~~~~text
<!-- NIEUW (vervolgplan v2.3, Fase 5): Home is de nieuwe standaardbestemming bij het
         openen van de app — de vier bestaande wizardstappen (Methode…Brouwen) blijven
         functioneel exact hetzelfde en zijn nu bereikbaar via de "Brouwen"-tab. Foto-klaar
         (Bouwbesluiten B6): de hero hieronder toont sinds Fase 7 photos/home-hero.webp
         (data-has-photo="true"); zonder foto zou hetzelfde neutrale .photo-slot-vlak tonen. -->
~~~~

## #79 · regel 2210 · html

Anker: `<div class="advice-result texture-grain" id="advice-result" style="display:none;"></div>`

~~~~text
<!-- NIEUW (Visual Design 2.0, §19 Subtle texture): dit is het enige advies-resultaatblok
           van het hele scherm (kinderen zijn platte p/ul/div/button, geen enkele met
           position:fixed/absolute/sticky) — een veilige, doelgerichte plek voor de
           .texture-grain-utility i.p.v. hem overal toe te passen. -->
~~~~

## #80 · regel 2220 · html

Anker: `<div class="screen-header-row">`

~~~~text
<!-- NIEUW (Pagina-Polish-spec §4.1): titel + plus-knop op één regel i.p.v. de tekstlink
           onderaan de lijst — zelfde openBeanAddFromList()-actie als voorheen #bean-add-link
           alleen deed, nu ook bereikbaar vanaf de header. #bean-add-link zelf blijft bestaan
           (zelfde ID/listener) maar is voortaan alleen de lege-staat-CTA, zie hieronder. -->
~~~~

## #81 · regel 2229 · html

Anker: `<button type="button" class="header-icon-btn" id="bean-add-header-btn" aria-label="Nieuwe boon toevoegen (scannen of han`

~~~~text
<!-- HERZIEN (visuele afstemming referentiebeeld Bonen-scherm): camera-icoon i.p.v.
             "+" — zelfde bestemming/actie (openBeanAddFromList, zie onderaan het script),
             het boonformulier begint al met de bestaande scan-sectie bovenaan. -->
~~~~

## #82 · regel 2244 · html

Anker: `<div class="chip-row" id="bean-filter-chip" style="margin-bottom:14px;" role="radiogroup" aria-label="Bonen filteren" hi`

~~~~text
<!-- NIEUW (Pagina-Polish-spec §4.1 "Alle/Favorieten/Recent"): hergebruikt bestaande
           beanSortMode voor "Recent" en het nieuwe bean.favorite-veld voor "Favorieten" —
           geen nieuwe filterlogica los van bestaande data/state, zie filterSortBeans(). -->
~~~~

## #83 · regel 2249 · html

Anker: `<button class="pill-cta" id="bean-add-link">+ Nieuwe boon</button>`

~~~~text
<!-- HERZIEN (visuele afstemming referentiebeeld Bonen-scherm): gevulde pilknop,
           voortaan ook zichtbaar bij een gevulde lijst (niet meer alleen lege-staat-CTA) —
           zelfde element/ID/listener (openBeanAddFromList), puur stijl + zichtbaarheid. -->
~~~~

## #84 · regel 2266 · html

Anker: `<section class="screen" id="screen-bean-detail" data-screen="bean-detail">`

~~~~text
<!-- NIEUW (vervolgplan v2.3, Fase 5 — Bean Detail, Bouwbesluit "Bean Detail — ingang"):
         leesscherm, geopend via een tik op een boonkaart. Vervangt NIETS aan de bestaande
         bewerkflow (#screen-bean-add/editBean() blijft ongewijzigd) — de "Bewerken"-knop
         hieronder gaat naar precies datzelfde formulier. Hergebruikt de bestaande cupping-
         radar-geometrie (B3, geen tweede radar met andere assen) voor het gemiddelde
         smaakprofiel uit het brouwlogboek van déze boon. -->
~~~~

## #85 · regel 2278 · html

Anker: `<button type="button" class="bean-detail-hero-fav" id="bean-detail-fav-btn" aria-pressed="false" aria-label="Toevoegen a`

~~~~text
<!-- NIEUW (Visual Design 2.0 fase 3, boon-niveau favorieten): overlay-hartje op de
             hero-foto — losstaand van de bestaande brewlog-entry-favorieten (die zitten op
             loggings, dit zit op de boon zelf). Zie bean.favorite / toggleBeanFavorite(). -->
~~~~

## #86 · regel 2286 · html

Anker: `<div id="bean-detail-flavor-tags" class="bean-tags"></div>`

~~~~text
<!-- NIEUW (Visual Design 2.0 fase 2, detail-referentie scherm 04): individuele,
           per-categorie gekleurde smaak-tags direct onder de titel, i.p.v. alleen onderin
           als platte tekst — zie renderBeanDetail() en flavorTagChipsHtml() hierboven. -->
~~~~

## #87 · regel 2291 · html

Anker: `<div class="detail-tabs" id="bean-detail-tabs" role="tablist" aria-label="Boondetails">`

~~~~text
<!-- NIEUW (Visual Design 2.0 fase 2, detail-referentie scherm 04, spec §11 "Use
           tabs/segments for existing detail sections where appropriate"): de bestaande
           secties hieronder herschikt onder tabs i.p.v. gestapeld. Geen enkele onderliggende
           databron/functie gewijzigd — puur presentatie + welke container zichtbaar is. -->
~~~~

## #88 · regel 2304 · html

Anker: `<!-- Expertreview, ideeën 5 + 6: "Deze zak" — drinkvenster (vuistregel), wat je van deze`

~~~~text
<!-- HERZIEN (Pagina-Polish-spec §5.4): bewust GEEN samengesteld/verzonnen
             sterrencijfer (Bouwbesluit B2 verwijderde eerder al zo'n composietscore) —
             getoond volgens de exacte regels uit de spec (0/1/meerdere-met-favoriet-logs),
             zie renderBeanDetailBestBrew(). -->
~~~~

## #89 · regel 2324 · html

Anker: `<!-- HERZIEN (visuele afstemming referentiebeeld "Jouw signaal"): zelfde`

~~~~text
<!-- NIEUW (Pagina-Polish-spec §5.5 "Personal signal"): hergebruikt de bestaande
             personalHistoryInsight() (al gebruikt op het Recept-scherm en in Inzichten,
             hier ongewijzigd) — puur een feit uit je eigen loggings voor déze boon, nooit
             een cross-boon-gemiddelde en nooit met engine-confidence-styling. Zie
             renderBeanDetailPersonalSignal(). -->
~~~~

## #90 · regel 2329 · html

Anker: `<!-- Expertreview idee 7: "Bij deze brander" — alleen weergave van je eigen koppen met`

~~~~text
<!-- HERZIEN (visuele afstemming referentiebeeld "Jouw signaal"): zelfde
             prep-intel-card-vorm als op het Recept-scherm — tekst/bron ongewijzigd. -->
~~~~

## #91 · regel 2359 · html

Anker: `<div class="detail-tab-panel" data-tab-panel="historie" id="bean-detail-panel-historie" hidden>`

~~~~text
<!-- NIEUW (Visual Design 2.0 fase 3, detail-referentie: tabs "Overzicht/Smaakprofiel/
           Historie/Recepten"): Herkomst/Details-feiten zijn hierboven in Overzicht opgenomen;
           deze tab toont voortaan de volledige brouwgeschiedenis van déze boon inline
           (i.p.v. een losse knop die wegnavigeert), met dezelfde kaart/hartje als Historie. -->
~~~~

## #92 · regel 2368 · html

Anker: `<div class="detail-tab-panel" data-tab-panel="recepten" id="bean-detail-panel-recepten" hidden>`

~~~~text
<!-- NIEUW (Visual Design 2.0 fase 3): "Recepten" = de recepten die je met déze boon al
           hebt gezet, één kaart per gebruikte methode met de laatst geloggede werkelijke
           waarden — puur een groepering van bestaande brewLog-data, geen nieuwe berekening. -->
~~~~

## #93 · regel 2628 · html

Anker: `<div class="prep-intel-card" id="prep-history-insight" hidden>`

~~~~text
<!-- FIX (teamreview v2 — Hoog bevinding, Data Scientist): lichte "vorige keer"-
           vergelijking uit het Brouwlogboek, zie personalHistoryInsight(). HERZIEN
           (visuele afstemming referentiebeeld "Jouw signaal"-kaart): zelfde kaartvorm als
           de Brew Intelligence-kaart hierboven, met een KORT, eerlijk richtingswoord
           (Hoger/Lager) als badge i.p.v. een los precisiegetal dat de functie niet
           teruggeeft — zie renderPrep() voor de badge-tekst. -->
~~~~

## #94 · regel 2645 · html

Anker: `<div class="profile-twin-banner" id="prep-cupping-suggestion" hidden>`

~~~~text
<!-- NIEUW (Implementatieplan Zetadvies v3.0, Fase 6): het voorstel voor de VOLGENDE
           kop, zoals bewaard op je laatste logging met deze boon (alleen oude loggingen met
           cupping-sliders hebben er een, BC-26). Bewust een apart blok van prep-history-insight hierboven:
           dat blok is een kaal feit ("je score lag hoger"), dit blok is expliciet een
           hypothese om te toetsen, nooit automatisch toegepast op het recept hieronder. -->
~~~~

## #95 · regel 2654 · html

Anker: `<div class="profile-twin-banner" id="prep-learning-correction" hidden>`

~~~~text
<!-- NIEUW (Implementatieplan Zetadvies v3.0, Fase 7): het boontype-model — een
           correctie op basis van meerdere GOEDGEKEURDE loggings binnen hetzelfde emmertje
           (branddiepte × verwerking × methode), dus overdraagbaar naar deze boon ook als
           je 'm nog nooit eerder zette. Zie learningCorrectionFor(). -->
~~~~

## #96 · regel 2665 · html

Anker: `<div class="stats-grid" id="stats-grid"></div>`

~~~~text
<!-- NIEUW (Visual Design 2.0, §5 "Recipe: slightly warmer focal glow around primary
           recipe area"): #stats-grid is precies het dosis/maling/temperatuur/water-blok uit
           §12 ("three primary values ... are dominant") — zie #stats-grid::before hieronder. -->
~~~~

## #97 · regel 2669 · html

Anker: `<!-- Sprint 3 (UX-review F4): de techniekkaart op verzoek — zelfde badge-row/style-note,`

~~~~text
<!-- NIEUW (visuele afstemming referentiebeeld "Brew Intelligence"-kaart): dezelfde
           bestaande evidence-badge-row/style-note, nu in een kaart met icoon+titel i.p.v.
           losse elementen — geen enkele tekst/badge-waarde gewijzigd, puur omkadering.
           Zie Bouwbesluit B4 hierboven voor de badge-woordkeus zelf. -->
~~~~

## #98 · regel 2686 · html

Anker: `<details class="flavor-category" id="refine-details">`

~~~~text
<!-- FIX (teamreview v2 — Midden bevinding, UX Designer/Professional Brewer): tot v2
           konden process-/freshness-/opened-/altitude-/hardness-/bypass-note allemaal
           tegelijk zichtbaar zijn vóór de startknop (tot 5-6 alinea's leeswerk). Gebundeld
           achter één inklapbare "Verfijn dit recept"-sectie (Brainstorm A) — kernrecept
           (stats-grid/recept-tabel) en de startknop blijven standaard zichtbaar; het
           badge-getal toont hoeveel factoren zijn meegenomen zonder dat je open hoeft te
           klikken. native <details> geeft dit gratis toetsenbord-/screenreader-gedrag.

           HERZIEN (visuele afstemming referentiebeeld "Aanvullende informatie"): de
           optionele invulvelden zelf (Branddatum/Zak geopend/Waterprofiel/Sterkte/
           Intensiteit — voorheen altijd zichtbaar, samen ruim 700px) zijn hierin
           verplaatst, vóór de afgeleide *-note-teksten. Geen enkel veld/ID/listener
           gewijzigd, puur waar ze in de DOM staan. De sectie is daarom niet meer
           voorwaardelijk verborgen (zie renderPrep() — refineDetails.hidden werd eerder
           op refineCount===0 gezet, wat de invulvelden zelf ontoegankelijk zou maken
           zodra er nog niets was ingevuld); alleen het badge-getal blijft afhankelijk
           van hoeveel *-notes daadwerkelijk iets te zeggen hebben. -->
~~~~

## #99 · regel 2740 · html

Anker: `<div id="bypass-moment-block" hidden style="margin-top:10px;">`

~~~~text
<!-- NIEUW (Implementatieplan Bypass v1.0, Fase C, "proef-en-vul"): moment van
                 toevoegen — bepaalt de weeginstructie in Brew Mode (zie renderBrewStepsList()).
                 Alleen zichtbaar/zinvol zolang bypass aan staat. -->
~~~~

## #100 · regel 2747 · html

Anker: `<div class="prep-intel-card" id="bypass-experiment-card" hidden style="margin-top:10px;">`

~~~~text
<!-- NIEUW (Implementatieplan Bypass v1.0, Fase A, BP-8/PDR §27): experimenteel-
                 kaart — de techniek krijgt hier expliciet hypothese/verwacht effect/mogelijk
                 voordeel/risico/evidence-niveau/vertrouwen, i.p.v. alleen lopende tekst. Zie
                 renderBypassToggle() voor de invultekst; leeg + hidden zolang bypass uit staat. -->
~~~~

## #101 · regel 2811 · html

Anker: `<div class="prep-cta-row">`

~~~~text
<!-- NIEUW (Visual Design 2.0 fase 2, spec §12 "Start Brew is primary; Adjust
           secondary", detail-referentie scherm 06): een secundaire Aanpassen-knop naast
           Start Brew. Hergebruikt het al bestaande, al-geteste [data-back]-navigatie-
           mechanisme (zie de generieke listener onderaan het script) i.p.v. nieuwe
           navigatielogica te verzinnen — functioneel identiek aan de "← Profiel"-terugknop
           bovenaan dit scherm, alleen hier als tweede CTA naast Start Brew. -->
~~~~

## #102 · regel 2842 · html

Anker: `<div class="brew-bg" aria-hidden="true">`

~~~~text
<!-- HERZIEN (op verzoek, na screenshot-feedback): in de eerdere ronde zat de foto
           geclipt in een korte band bovenaan (.brew-hero), waardoor alles eronder op vlak
           zwart "zweefde" — in het referentiebeeld liep de foto door over de hele pagina.
           .brew-bg is nu een losse laag die de VOLLE hoogte van #screen-brew beslaat (top
           t/m onderkant knoppen, meegroeiend met bv. een opengeklapt "Volledig schema"),
           terwijl .brew-fg (hieronder) de eigenlijke inhoud draagt en er via de normale
           DOM-volgorde + position:relative bovenop stapelt (geen z-index-trucs nodig). -->
~~~~

## #103 · regel 2881 · html

Anker: `<div class="dial-total mono" id="dial-total"></div>`

~~~~text
<!-- NIEUW: "van {totaal}" naast de verstreken tijd — puur afgeleid van
                   state.recipe.totalTime, niets nieuws berekend. -->
~~~~

## #104 · regel 2885 · html

Anker: `<div class="dial-step sr-only" id="dial-step" aria-live="polite">Klaar om te starten</div>`

~~~~text
<!-- FIX (teamreview v2 — Midden bevinding, Accessibility Expert): geen enkel
                   timer-element had een aria-live-regio, dus een screenreader-gebruiker kreeg
                   geen aankondiging bij een stapwissel of aankomende pour — alleen wie de beep
                   kon horen. aria-live="polite" op alleen dial-step/next-info (niet dial-time,
                   dat elke seconde verandert en constante aankondigingen zou geven).
                   HERZIEN (focus-herontwerp): visueel vervangen door #brew-pour-badge
                   hieronder (duidelijker, met giet-telling) — dit element blijft de
                   aria-live-aankondiging dragen, nu sr-only i.p.v. zichtbaar, zodat er geen
                   dubbele aankondiging ontstaat en de screenreader-tekst ongewijzigd blijft. -->
~~~~

## #105 · regel 2900 · html

Anker: `<div class="brew-focus-info">`

~~~~text
<!-- NIEUW: giet-voortgang (stap-gebaseerd, los van de tijd-gebaseerde ring hierboven)
             + de twee-regelige "tot nu toe/volgende"-samenvatting. Vervangt geen bestaande
             functionaliteit — #next-info is hetzelfde element als voorheen (zelfde aria-live),
             alleen herplaatst en met een toegevoegde resultaattotaal-zin. -->
~~~~

## #106 · regel 2929 · html

Anker: `<details class="flavor-category" id="brew-steps-details">`

~~~~text
<!-- HERZIEN (focus-herontwerp): de volledige stappenlijst blijft 100% aanwezig
           (inclusief de proef-en-vul-/weeginstructies bij bypass) maar staat nu achter een
           inklapbare sectie i.p.v. altijd volledig uitgeklapt — zelfde <details>-patroon als
           "Verfijn dit recept" op het Recept-scherm. Geen enkele stap-tekst/instructie
           gewijzigd, puur waar hij standaard staat. -->
~~~~

## #107 · regel 2943 · html

Anker: `<button id="home-btn" aria-label="Naar home"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="current`

~~~~text
<!-- NIEUW (op verzoek, na screenshot-feedback): kleine Home-knop links van Pauze —
             hergebruikt exact dezelfde stop-bevestigingslogica als de bestaande #stop-btn
             (zelfde showConfirmModal-gate bij een lopende timer), alleen het navigatiedoel
             verschilt (home i.p.v. prep). Geen nieuwe "stiekem wegnavigeren"-route: de
             regressierisico-eis "weg-navigeren tijdens een lopende brouw is onmogelijk"
             blijft intact, want ook hier moet je eerst bevestigen. Zie stopBrewTimer() in
             de JS. -->
~~~~

## #108 · regel 2952 · html

Anker: `<button id="reset-btn" aria-label="Reset"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentCol`

~~~~text
<!-- FIX (Safari/WebKit — macOS/iPhone/iPad screenshot-feedback): deze <svg>'s
             hadden geen expliciete width/height, alleen een viewBox. Chromium geeft zo'n
             SVG een werkbare standaardgrootte, maar Safari/WebKit niet — daar valt hij terug
             op zijn eigen (veel te grote, ongeclipte) default-object-size, waardoor er
             binnen de knop niets zichtbaars overblijft. Expliciete width/height="24" lost
             dit browser-onafhankelijk op; puur een maat-attribuut, geen visuele wijziging
             bedoeld op Chromium. Zelfde fix toegepast op PAUSE_ICON/PLAY_ICON in de JS. -->
~~~~

## #109 · regel 2970 · html

Anker: `<div class="brewlog-complete-header">`

~~~~text
<!-- NIEUW (Visual Design 2.0 fase 2, detail-referentie scherm 08 "Timer (Completed)"):
           groter, gecentreerd vinkje + korte statchips vóór de sliders, i.p.v. een kale
           inline check + platte mono-tekstregel. Zelfde éénscherm-verloop als voorheen
           (geen scherm-split) — alleen de opening van dit scherm celebratory'er. -->
~~~~

## #110 · regel 2985 · html

Anker: `<!-- NIEUW (Visual Design 2.0, §19): zelfde redenering als #advice-result — platte`

~~~~text
<!-- NIEUW (Bouwbesluit B2): eerlijke samenvatting i.p.v. het kale cijfer, ÓNDER de
           sliders — zie renderBrewLogHonestSummary(). Geen #score-ring-value meer in de DOM. -->
~~~~

## #111 · regel 2987 · html

Anker: `<!-- Sprint 4 (UX-review F1): alles wat niet nodig is om te proeven — de eerlijke`

~~~~text
<!-- NIEUW (Visual Design 2.0, §19): zelfde redenering als #advice-result — platte
           strong/div-kinderen zonder eigen position, dus veilig voor .texture-grain. -->
~~~~

## #112 · regel 3000 · html

Anker: `<label for="brewlog-cup-weight" style="font-size:var(--fs-label); color:var(--text-faint); display:block; margin:12px 0 `

~~~~text
<!-- NIEUW (Implementatieplan Zetadvies v3.0, Fase 5): het fundament onder Fase 6/7 —
             zonder deze twee werkelijk-gemeten velden (i.p.v. het aanbevolen recept) is er
             straks niets om een leerlus op te bouwen. Beide optioneel: een leeg veld wordt
             NOOIT als 0 opgeslagen (zie saveBrewLogEntry()), puur weggelaten. -->
~~~~

## #113 · regel 3007 · html

Anker: `<div id="brewlog-bypass-actual-block" hidden>`

~~~~text
<!-- NIEUW (Implementatieplan Bypass v1.0, Fase B/C, BP-5/"proef-en-vul"): wat er
             écht is toegevoegd, voor de vergelijking met het geplande bedrag (rec.bypassMl)
             — alleen zichtbaar als deze logging daadwerkelijk met bypass gezet is, zie
             renderBrewLogHonestSummary()/openBrewLogEntry() voor de hidden-toggle. -->
~~~~

## #114 · regel 3048 · html

Anker: `<section class="screen" id="screen-brewlog-history" data-screen="brewlog-history">`

~~~~text
<!-- NIEUW (Visual Design 2.0 fase 2, detail-referentie scherm 10 "History"): tabs
         Alle/Favorieten/Statistieken. "Statistieken" hergebruikt renderInsightsScreen()
         (nu met een targetId-parameter) — geen nieuwe telling-logica, puur een tweede
         plek waar dezelfde functie naar rendert. "Favorieten" is een klein, nieuw,
         zelfstandig boolean-veld per brewLog-entry (entry.favorite, via
         toggleBrewLogFavorite() + persistBrewStore()) — geen ander
         databronveld aangeraakt. -->
~~~~

## #115 · regel 3080 · html

Anker: `<!-- NIEUW (Visual Design 2.0 fase 2, detail-referentie scherm 12 "Settings"): nieuw`

~~~~text
<!-- NIEUW (vervolgplan v2.3, Fase 5 — Inzichten). Ontworpen leeg-eerst (Data Scientist-
         bevinding §07/§26 in het vervolgplan): bij 0/1 loggings staat er een eerlijke lege
         staat, geen trendlijn onder een minimale n, en geen chart-bibliotheek deze ronde —
         puur tellingen + hergebruik van het bestaande personalHistoryInsight()-precedent
         (dat n al expliciet noemt), nooit stilzwijgend geaggregeerd over waterhardheid heen.
         VERVANGEN (Visual Design 2.0 fase 2): het standalone Inzichten-scherm + zijn
         navbar-item zijn vervangen door de "Statistieken"-tab op het Geschiedenis-scherm
         (renderInsightsScreen() rendert daar nu naartoe, zie #history-stats-body) en dit
         navbar-slot door Instellingen hieronder — zie NAV_SCREEN_MAP/wizardless/de
         navbar-click-handler verderop in het script, allemaal in dezelfde commit
         bijgewerkt zodat er geen moment een kapotte "Inzichten"-knop bestaat. -->
~~~~

## #116 · regel 3092 · html

Anker: `<section class="screen" id="screen-settings" data-screen="settings">`

~~~~text
<!-- NIEUW (Visual Design 2.0 fase 2, detail-referentie scherm 12 "Settings"): nieuw
         scherm, nieuw navbar-slot. "Apparaat & Voorkeuren" toont uitsluitend WERKELIJK
         vaste feiten (de engine is app-breed hardgecodeerd op Timemore C3S Pro / °C) als
         niet-interactieve informatierijen — bewust GEEN tikbare/chevron-rijen die een
         instelling suggereren die niet bestaat (geen "Standaardprofiel"/"Hoeveelheid"-rij:
         die instellingen bestaan niet en zouden een illusie van functionaliteit zijn).
         "Data" verplaatst de bestaande, ongewijzigde backup-export/import-knoppen
         (zelfde ID's, dus dezelfde luisteraars verderop in het script blijven werken) van
         het Bonen-scherm hierheen, plus een NIEUWE, echte Reset-knop (zie
         resetAppData()/showConfirmModal() verderop). -->
~~~~

## #117 · regel 3178 · html

Anker: `<section class="screen" id="screen-triage" data-screen="triage">`

~~~~text
<!-- HERZIEN (Pagina-Polish-spec §6): één vraag per stap i.p.v. alle vijf tegelijk, met
         voortgangsindicator en resultaat pas na de laatste vraag — zie renderTriageQuestions()/
         updateTriageResult() verderop. TRIAGE_QUESTIONS zelf (tekst/opties/flagOn/diagnosis)
         blijft ongewijzigd; category/action zijn puur additieve weergave-/actievelden. -->
~~~~

## #118 · regel 4460 · line

Anker: `evenwichtig_flex: { name:'Evenwichtig & flexibel', desc:'Flexibel basisrecept — betrouwbaar bij wisselende bonen', color`

~~~~text
// FIX (P1 §4, gecontroleerde herbeoordeling): "drie simpele pours" beschreef een
  // specifiek giet-aantal als vaststaand feit — dat spreekt de eigen onzekerheid van de
  // engine tegen (HEDRICK_1_2_1.pulseCount is een researchGap, juist omdát het aantal
  // giet-momenten tussen bronnen verschilt) en werd tegengesproken door onafhankelijk
  // heronderzoek (zie coreOnlyReason() hierboven voor de volledige toelichting die al
  // elders op hetzelfde scherm stond). Karakterclaim behouden, structuurclaim verwijderd.
~~~~

## #119 · regel 4546 · block

Anker: `const OVERLAY_DISPLAY = {`

~~~~text
/* UITGEBREID (expertaudit, bevinding 1 — "interne audit-documentatie lekt het scherm op"):
   elke overlay kreeg een eigen korte, Nederlandse `mechanism`-zin. Dit is GEEN nieuwe
   claim of vertaling van cijfers — het herformuleert alleen in gewoon Nederlands wát de
   engine's eigen (Engelse) pourStructure-veld al zegt, zonder de interne bestandsnamen/
   gap-codes (bv. "audit-established-recipes-v60-chemex.md §1, gap G-RECIPE-01") die daar
   voorheen middenin stonden en rechtstreeks op het Prep-scherm belandden. De ruwe, volledige
   Engelse pourStructure/sourceTrace-tekst uit de engine verdwijnt niet — die staat voortaan
   ongewijzigd in de nieuwe "Methodiek & bronnen in detail"-sectie (zie computeRecipe() en
   renderPrep()), voor wie de volledige brontrail wil zien. Puur presentatie, geen enkel
   evidence-veld in de engine zelf aangeraakt. */
~~~~

## #120 · regel 4566 · block

Anker: `function resolvedOverlayIdFor(profileKey, methodKey){`

~~~~text
/* FIX (teamreview v2 — Kritiek bevinding #1, Algorithm Engineer/UX Researcher/Devil's
   Advocate/Product Lead): klassiek, vol_rond en zoet mappen hierboven op EXACT dezelfde
   cluster + overlay ('FULLER_BODIED' + 'KASUYA_4_6'), dus zij leveren altijd, voor elke
   methode/roast/batch-combinatie, een algebraïsch identiek recept. Vóór v2 presenteerde
   het profielscherm ze als drie losse technieken ("Elk profiel is een eigen techniek"),
   wat het vertrouwen in de rest van deze eerlijke app ondermijnt zodra een oplettende
   gebruiker het ontdekt (de recepttabel toont letterlijk dezelfde cijfers).
   Gekozen oplossing = Brainstorm C's "tussenweg": geen nieuw onderzoek nodig (optie 2,
   Fase 2) en geen stille consolidatie van UI-knoppen (optie 1) — gewoon hardop zeggen
   wanneer twee zichtbare profielen vandaag hetzelfde recept opleveren, zowel bij het
   kiezen (renderProfileGrid) als op het Prep-scherm (renderPrep). Puur structureel:
   twee profielen zijn "tweelingen" zodra hun cluster + (voor de huidige methode
   opgeloste) overlay-id identiek zijn — precies de twee velden die het Core Recipe +
   de stijl-overlay bepalen. */
~~~~

## #121 · regel 4590 · block

Anker: `const TWIN_REFERENCE_VOLUME = { v60: 300, chemex: 600 };`

~~~~text
/* FIX (Reparatieplan v4.0, B-4 / bevinding E-09): de oude profileRecipeSignature() (BC-26:
   verwijderd) vergeleek het GEMAPTE overlay-id, niet het GEGENEREERDE recept. Daardoor bleven sirooprig_vol
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
~~~~

## #122 · regel 4642 · block

Anker: `/* BIJGEWERKT (Reparatieplan v4.0, C-1): 'zoet' is uit deze groep gehaald omdat het sinds`

~~~~text
/* FIX (v2.2 kernflow — Bouwbesluit "Schijnkeuze profielen: Knoppen samenvoegen"):
   klassiek/vol_rond/zoet blijven, voor ELKE methode/roast/batch/proces-combinatie,
   naar hetzelfde algebraïsche recept leiden (zie findProfileTwins hierboven — die
   detectie blijft ongewijzigd bestaan). In v2 loste dit team dat op door de drie
   knoppen apart te tonen mét een "dit is hetzelfde recept"-tekstbanner. Jelle koos
   in Bouwbesluiten v1 voor de directere oplossing: toon ze als ÉÉN keuze.
   Bewust NIET gedaan: PROFILE_INFO/ENGINE_PROFILE_MAP inkorten of vol_rond/zoet
   verwijderen. Tientallen andere plekken (PROFILE_KEYWORDS, PROCESS_PROFILE_BOOST,
   classifyProfile()'s 5-bucket flavour-scoring, seed-boon-data, bean-card-labels,
   secondaryFlavorNotes()'s tips-woordenboek) lezen deze specifieke sleutels nog
   steeds en mogen dat blijven doen — dit is uitsluitend een UI-weergavefilter op de
   drie plekken waar een gebruiker een profiel KIEST (renderProfileGrid,
   renderAdviceChips, renderFormProfileChips). Opgeslagen state (adviceState.profile,
   formProfileChip, bean.profileKey) wordt NOOIT herschreven naar de canonieke
   sleutel — alleen op vergelijk-tijd bij het renderen (data-selected) gecanonicaliseerd
   — anders zou secondaryFlavorNotes(scores, adviceState.profile) de verkeerde
   'tips'-ingang opzoeken zodra iemand vol_rond of zoet had gekozen. */
~~~~

## #123 · regel 4659 · block

Anker: `const PROFILE_MERGE_GROUPS = [`

~~~~text
/* BIJGEWERKT (Reparatieplan v4.0, C-1): 'zoet' is uit deze groep gehaald omdat het sinds
   C-1 een aantoonbaar ander gietschema oplevert (fase 1 = 50+70 i.p.v. 60+60 bij 300 ml —
   Kasuya's eigen smaakknop). Een samengevoegde knop mag alleen profielen bevatten die
   daadwerkelijk hetzelfde recept geven; de test in §8.2 bewaakt dat voortaan automatisch
   tegen recipeFingerprint(). klassiek/vol_rond blijven wél identiek: 'vol_rond' gaat over
   body, en dat is niet de as die deze knop verschuift. */
~~~~

## #124 · regel 4736 · block

Anker: `/* NIEUW (Implementatieplan v3.0, §6 "Model Policy"): de twee numerieke TDS/EY-vensters`

~~~~text
/* [App-supplied, NOT part of this project's own research corpus] Widely-cited SCA
   Brewing Control Chart-style TDS/extraction-yield windows, supplied here as an
   explicit override of data/sensoryTargets.ts's own G-CONTROL-CHART-01 research gap —
   that module's own doc comment explicitly invites exactly this ("a caller MAY supply
   its own numeric window... this engine does not compute one on its own").
   FIX (Reparatieplan v4.0, A-1): deze comment beweerde eerder "Disclosed to the user in
   the recipe notes" terwijl de getallen nergens in de UI stonden. Dat is nu wél zo:
   renderPrep() rendert #target-window-note met de letterlijke TDS/EY-grenzen én de
   herkomst ("door de app aangeleverd, engine zegt RESEARCH_GAP"). */
~~~~

## #125 · regel 4745 · block

Anker: `const MODEL_POLICY = Object.freeze({`

~~~~text
/* NIEUW (Implementatieplan v3.0, §6 "Model Policy"): de twee numerieke TDS/EY-vensters
   hieronder zijn productmatig gewenst en blijven getalsmatig ONGEWIJZIGD — dit voegt
   uitsluitend een expliciete, versieerbare Model Policy-laag toe i.p.v. een kale const.
   De engine zelf markeert de bronbasis van deze vensters als RESEARCH_GAP
   (G-CONTROL-CHART-01, SENSORY_TARGET_CLUSTERS); resolveTargetWindow() accepteert dit
   uitdrukkelijk als override ("a caller MAY supply its own numeric window... this engine
   does not compute one on its own"). MODEL_POLICY.version wordt vanaf nu meegeschreven op
   elke nieuwe recept-/logboekrecord (los van RECORD_SCHEMA_VERSION, additief veld) zodat
   een toekomstige policy-wijziging historische loggingen niet met terugwerkende kracht
   herinterpreteert — zie computeRecipe() en saveBrewLogEntry(). Voorkomt ook dat deze
   waarden per ongeluk via een generieke override-route als RESOLVED/STATED gemarkeerd
   raken: resolveTargetWindow() blijft onderscheid maken tussen extern-STATED input en
   interne model policy (provenance staat hieronder altijd op APP_ASSUMED). */
~~~~

## #126 · regel 4807 · block

Anker: `const FRESHNESS_TIERS = [`

~~~~text
/* ============================================================
   VERSHEID/DEGASSING — op basis van een echte branddatum i.p.v. een
   handmatig geschatte categorie. De meeste zakken specialty koffie
   hebben de branddatum erop staan, dus dit is zowel makkelijker
   (geen educated guess nodig) als preciezer (exact aantal dagen i.p.v.
   een brede bucket).

   De curve volgt de bekende CO2-degassing-vuistregel uit de specialty-
   koffiewereld (o.a. James Hoffmann, Perfect Daily Grind "Coffee
   degassing"): de eerste dagen zit een boon vol CO2 (opbollende,
   onregelmatige bloom, kanaalvorming-risico), rond 1-3 weken is het
   gas voldoende uitgewerkt voor een stabiele, voorspelbare doorloop,
   en na ~3-6 weken neemt zowel CO2 als aroma merkbaar af.

   FIX (project-brede audit): dit gaf voorheen ook een klik-/µm- en
   temperatuurcorrectie (gClick/gMicron/temp hieronder) bovenop de
   kwalitatieve notitie. De echte engine (computeRecipe() verderop)
   modelleert versheid alleen als een kwalitatieve bloom-vlag die de
   Evidence Confidence beïnvloedt — nooit als een compenserend cijfer
   op maling/temperatuur (G-FRESH-02, Synthesis §2: "geen specifiek
   water/tijd-getal"). Deze tabel levert daarom alleen nog de
   kwalitatieve notitie en een generieke, gelabelde bloom-tijdsverlenging
   (bloomExtraSec, puur een timing-gemak voor het giet-schema — geen
   evidence-claim over maling of temperatuur).
   ============================================================ */
~~~~

## #127 · regel 4891 · block

Anker: `/* FIX (project-brede audit, vinding H7/altitudeNudge): hoogte gaf hier voorheen een`

~~~~text
/* ============================================================
   HOOGTELIGGING/DICHTHEID — alleen genoteerd, stuurt GEEN receptgetal
   (FORBIDDEN edge, zie de FIX hieronder en tests/forbidden-edges.test.mjs).
   Achtergrond: hoger gelegen bonen worden vaak dichter en zouden taaier
   extraheren (o.a. Scott Rao's dichtheid-notities, Barista Hustle). Een
   eerdere versie maalde daarom hoog (>1700 masl) fijner en laag (<1200
   masl) grover; die aanpassing is verwijderd omdat er geen gevalideerde
   hoogte-naar-maalgraad-relatie is gevonden.
   ============================================================ */
~~~~

## #128 · regel 4900 · block

Anker: `function altitudeNudge(masl){`

~~~~text
/* FIX (project-brede audit, vinding H7/altitudeNudge): hoogte gaf hier voorheen een
   klik-/µm-correctie op de maling — een FORBIDDEN edge (types/coffee.ts: "no function
   computes a grind or temperature delta directly from altitude"). Hoogte wordt nog
   steeds genoteerd (het zegt iets over boondichtheid) maar stuurt geen cijfer meer aan;
   dit geeft alleen nog een eerlijke, neutrale notitie terug. */
~~~~

## #129 · regel 4912 · block

Anker: `/* FIX (project-brede audit, vinding H7/hardnessNudge): waterhardheid gaf hier voorheen`

~~~~text
/* Waterhardheid — alleen genoteerd, GEEN temperatuurcorrectie meer (FORBIDDEN edge, zie
   de FIX vlak boven hardnessNudge() en tests/forbidden-edges.test.mjs). De rest van dit
   blok is de historische onderbouwing van de verwijderde correctie. De SCA Water Quality Standard (Standard 310-2021 /
   SCAE-waterrapport, al gebruikt in METHOD_INFO.tips hierboven) geeft als doelrange voor
   algemene hardheid 50–175 mg/L CaCO3. Gepubliceerd onderzoek van Christopher Hendon &
   Maxwell Colonna-Dashwood (Journal of Agricultural and Food Chemistry, 2014; later het boek
   "Water for Coffee") toont aan dat mineraalhardheid — vooral magnesium — de extractiesnelheid
   verhoogt: harder water trekt sneller/meer uit bij gelijke temperatuur, zachter water minder.
   Gebrond: de hardheidsgrenzen zelf én de extractierichting (harder → sneller/sterker,
   zachter → langzamer/zwakker). NIET gebrond: er bestaat geen gepubliceerde tabel die mg/L
   rechtstreeks naar graden Celsius vertaalt — daarom bestaat de vroegere stapgrootte (harder
   water iets kouder zetten, zachter water iets heter) niet meer.

   C6 (koffie-expertpanel, Petra): bewuste vereenvoudiging — dit modelleert alleen algemene
   hardheid (calcium/magnesium), niet alkaliniteit (bicarbonaat, de bufferende werking tegen
   zuren). Beide zijn onderdeel van de SCA-waterstandaard maar zijn niet hetzelfde: twee
   watermonsters met identieke hardheid kunnen sterk verschillende alkaliniteit hebben, en
   juist bij fruitige/zure profielen (heel_fruitig/fruitig_clean) bepaalt alkaliniteit
   minstens zo sterk hoe zuur de kop aankomt.

   UPDATE (Implementatieplan Zetadvies v3.0, Fase 4a): de oorspronkelijke keuze hierboven
   ("geen tweede invoerveld toegevoegd... te veel gevraagd") is bewust teruggedraaid — er
   is nu wél een los alkaliniteitsveld (zie HCO3_TO_CACO3_FACTOR hieronder en de HTML). Deze
   functie (hardnessNudge) blijft hardheid-only (rec.hardnessNote); het waterprofiel-paneel
   (renderWaterHardnessInput()) geeft per parameter een EIGEN oordeel via waterSCAVerdict()
   (B-5) — nooit een samengevoegd "water is goed"-signaal. */
~~~~

## #130 · regel 4938 · block

Anker: `function hardnessNudge(mgPerL){`

~~~~text
/* FIX (project-brede audit, vinding H7/hardnessNudge): waterhardheid gaf hier voorheen
   een temperatuurcorrectie — een FORBIDDEN edge (generalHardnessGH mag een recept-
   getal structureel niet meer sturen). Hardheid wordt nog genoteerd en tegen de SCA-
   richtwaarde afgezet (puur informatief), maar past de temperatuur niet meer aan. */
~~~~

## #131 · regel 4952 · line

Anker: `var HCO3_TO_CACO3_FACTOR = 0.82;`

~~~~text
// NIEUW (Implementatieplan Zetadvies v3.0, Fase 4a): alkaliniteit apart van hardheid, alleen
// genoteerd en tegen de SCA-richtwaarde (40–70 mg/L CaCO3) afgezet in het waterpaneel
// (waterSCAVerdict()) — stuurt geen receptgetal. Omrekening HCO3→CaCO3-equivalent: ×0,82
// (standaard stoichiometrische omrekeningsfactor, zie SCA Water Quality Standard / Handbook
// 310-2021).
~~~~

## #132 · regel 4959 · line

Anker: `function dilutedWaterValue(rawValue, tapParts, demiParts){`

~~~~text
// NIEUW (Implementatieplan Zetadvies v3.0, Fase 4c, B-6): verdunning kraan:demi is PURE
// rekenkunde op het effectieve waterprofiel — nooit een receptinvloed. Gedemineraliseerd
// water wordt aangenomen 0 hardheid/alkaliniteit bij te dragen (redelijke vereenvoudiging
// voor "zuiver demiwater zonder toevoegingen", zie Fase 0-randvoorwaarde).
~~~~

## #133 · regel 4997 · block

Anker: `const GRIND_CONFIDENCE_LABELS = {`

~~~~text
/* FIX (teamreview v2, Content/Microcopy Specialist — bevinding "onvertaalde enum in NL-UI"):
   grindConfidence komt rechtstreeks uit de Brew Intelligence-engine als kale Engelse
   enum-waarde (INSUFFICIENT/LOW/MEDIUM/HIGH). Tot v2 werd die ongefilterd in de stats-grid
   getoond — omdat de Setting Translator voor élke molen vandaag INSUFFICIENT teruggeeft
   (zie research-timemore-c3s-pro-adjustment-mechanism.md), zag praktisch elke gebruiker
   letterlijk "vertrouwen: INSUFFICIENT" in een verder volledig Nederlandse app. Eén centrale
   vertaaltabel, toegepast vlak vóór het scherm — dekt ook toekomstige engine-waarden
   (bijv. een nieuwe CONTESTED-status) zonder dat er opnieuw iets kan weglekken, mits nieuwe
   waarden hier worden toegevoegd (zie fallback hieronder voor het geval dat niet gebeurt). */
~~~~

## #134 · regel 5040 · line

Anker: `function nlRatio(text){`

~~~~text
// NIEUW (Reparatieplan v4.0, A-6 / bevinding E-17): de engine formatteert ratio's met
// toFixed() (Amerikaanse punt), de app met fmt() (Nederlandse komma). Beide verschijnen in
// dezelfde UI zodra de sterktehendel wordt gebruikt. Deze functie normaliseert de
// engine-uitvoer op ÉÉN plek, i.p.v. de engine te wijzigen (die blijft onaangeraakt).
~~~~

## #135 · regel 5088 · block

Anker: `/* Bypass-percentage — BP-2 (Implementatieplan Bypass v1.0, Fase C, besloten): een door de`

~~~~text
/* Kasuya's eigen 4:6-principe (World Brewers Cup 2016-poster, zie comment bij
   ROAST_TEMP_OFFSET hierboven): de verhouding tussen de eerste twee pours — samen
   de eerste 40% van het water — stuurt zuur/zoet. In de vier Kasuya-profielen
   hierboven is dat al vastgelegd als vier losse keuzes: een grotere eerste pour
   (Bright Split, heel_fruitig) geeft meer helderheid/zuur; een kleinere eerste
   pour (Sweet/Body Split) geeft meer zoetheid/body; Origineel (klassiek) is
   neutraal (vijf gelijke pours).
   FIX (teamreview v2, Frontend Architect — bevinding "dode code"): dit blok
   beschreef en implementeerde kasuyaSplitShiftFraction(), een proces-conditionele
   verschuiving van de Kasuya-pour-splitsing op basis van boongegevens. Sinds de
   overstap naar de eerlijke Brew Intelligence 2.0-engine loopt de daadwerkelijke
   pour-structuur via de engine se eigen, evidence-getagde STYLE_OVERLAY_LIBRARY
   (forbidden edges: proces mag geen receptgetal meer rechtstreeks sturen) — deze
   functie werd nergens meer aangeroepen en stond hier alleen nog als dode code.
   Verwijderd, geen vervanging nodig: de vier Kasuya-profielen hierboven gebruiken
   nu uitsluitend de overlay uit de engine, niet deze losse aanpassing. */
~~~~

## #136 · regel 5105 · block

Anker: `const BYPASS_PCT_OPTIONS = [20, 30, 40];`

~~~~text
/* Bypass-percentage — BP-2 (Implementatieplan Bypass v1.0, Fase C, besloten): een door de
   gebruiker zelf gekozen stap uit drie vaste opties, NOOIT afgeleid van boon/proces/
   branding/water (dat was precies het H7-defect, zie de FIX hieronder — die blijft
   volledig intact, alleen de bron van het getal wisselt van "altijd 30" naar "gekozen uit
   20/30/40"). Onderbouwing van de drie opties (Research Brief Bypass v1.0 §5/§9): 20-40%
   komt overeen met Ben Jones' 60-80% brouwwater (tier 3), en de bijbehorende brouwratio's
   1:14,1 / 1:12,4 / 1:10,6 vallen binnen zowel het 9:1-14:1-gebied van US-patent 4.147.097
   als Drip Roast's 1:10-1:12 (tier 5). Boven 40% is er geen V60-bron: Royal Coffee's "60%
   bypass" (RB §6) was immersie op half volume, niet vergelijkbaar met een volledig
   volume-herstelde V60-zetting. Een vrije schuifregelaar is bewust afgewezen (RB
   Implementatieplan §2) — dat zou een precisie suggereren die er niet is. */
~~~~

## #137 · regel 5118 · block

Anker: `function bypassAdvice(pct){`

~~~~text
/* FIX (project-brede audit, vinding H7/bypassAdvice): het bypass-percentage was
   voorheen proces-/roast-/experimenteel-afhankelijk — een FORBIDDEN edge (verwerkings-
   methode mag geen receptgetal meer sturen, ook niet indirect via een watersplitsing).
   Dat blijft zo: bypassAdvice() accepteert alleen nog het door de gebruiker zelf gekozen
   percentage (state.bypassPct, zie renderBypassToggle()) en klemt op de drie toegestane
   waarden — geen enkel boon-/proces-/roastgegeven komt deze functie meer in. */
~~~~

## #138 · regel 5129 · block

Anker: `/* C2 (koffie-expertpanel, Noor/Dr. Ilse): tot nu toe liep "sterker/zwakker zetten"`

~~~~text
/* FIX (teamreview v2, Frontend Architect — bevinding "dode code"): dit blok
   beschreef en implementeerde bypassGrindTempAdjust(), een percentage-afhankelijke
   klik-/temperatuurcorrectie voor bypass-concentraat. De functie werd nergens
   aangeroepen (geen enkele call-site in computeRecipe() of elders) en stond hier
   alleen nog als dode code — verwijderd. Als een grind-/temperatuurcorrectie voor
   bypass ooit terugkomt, hoort die in de engine (met een eigen evidence-klasse),
   niet als losse, ongebruikte app-laagfunctie. */
~~~~

## #139 · regel 5175 · block

Anker: `function engineValidVolumeRange(methodKey, profileKey){`

~~~~text
/* NIEUW (Implementatieplan Zetadvies v3.0, §1b): het watervolumebereik waarbinnen de
   engine daadwerkelijk een geldig recept teruggeeft voor het huidige methode/profiel —
   het dosisplafond van de brewer (bv. V60: 15-22g, Bouwbesluit non-negotiable) vertaald
   naar volume via dezelfde ratio-mid die computeRecipe() gebruikt (dus inclusief de
   retentieterm sinds D-1/LIQUID_RETAINED_RATIO). METHOD_INFO.minMl/maxMl blijft de
   fysieke apparaatgrens (B-1b, bijlage-onafhankelijk) — een RUIMER getal dat los van deze
   functie blijft bestaan, maar niet langer de schuifregelaar zelf mag begrenzen. Geen
   dosisplafond bekend voor deze brewer (bv. Chemex — G-CHEMEX-DOSE-CEILING-01) betekent:
   geen engine-grens bekend, dus het volledige apparaatbereik blijft de enige grens. */
~~~~

## #140 · regel 5198 · line

Anker: `const volLow = Math.ceil((doseMin * ratioRange.min) / 5) * 5;`

~~~~text
// FIX (Implementatieplan Zetadvies v3.0, §1b — testbevinding): Math.round() naar het
    // dichtstbijzijnde 5ml-stapje kon de bovengrens over de werkelijk haalbare grens heen
    // afronden (bv. LOWER-cluster: 22g-plafond ligt bij ~387,6 ml, round-to-nearest gaf
    // 390 ml terug — een volume dat computeRecipe() zelf daarna alsnog afwijst). Dat is
    // precies het "schuifregelaar belooft iets wat de engine niet waarmaakt"-scenario dat
    // §1b juist wil voorkomen. Ceil voor de ondergrens en floor voor de bovengrens houden
    // het gerapporteerde bereik altijd BINNEN wat de engine daadwerkelijk accepteert — in
    // het slechtste geval één 5ml-stapje conservatiever, nooit een leeg beloofd volume.
    // D2-1: aan de randen mag de ratio tot de rand van het doelvenster schuiven (zie
    // doseEdgeFor()), dus de grens is dosisgrens × ratiorand i.p.v. × ratiomidden.
~~~~

## #141 · regel 5258 · line

Anker: `/* NIEUW (Reparatieplan v4.0, C-1 / bevinding E-05): Kasuya's eigen "taste dial" — de`

~~~~text
// NIEUW (Implementatieplan Zetadvies v3.0, Fase 3c/D-4): de schemalengte volgde tot nu
// toe uit contactTimeGuidance (het APPARAAT-brede "monitored diagnostic, never a
// target"-venster, brewers.ts regel 1737) — dus altijd hetzelfde middelpunt (165s voor de
// V60), ongeacht de gekozen giet-structuur. Deze twee generieke, aan geen bron gebonden
// tijdsconstanten (net als de bestaande bloom-conventie hieronder) laten de schemalengte
// nu meebewegen met het daadwerkelijke aantal giet-momenten. contactTimeGuidance zelf
// verhuist naar het Klaar-scherm als controle-achteraf (renderBrewLogHonestSummary()),
// waar het label het altijd al voor bedoelde: een diagnostische band, geen doel.
~~~~

## #142 · regel 5266 · block

Anker: `var PHASE1_FIRST_POUR_FRACTION = { helder: 0.60, neutraal: 0.50, zoet: 0.40 };`

~~~~text
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
   Verandert NIETS aan fase 1 als geheel (blijft 40% van het water) of aan het totaal.
   Gebruiker heeft dit vooraf goedgekeurd (Bouwbesluit BB-2). */
~~~~

## #143 · regel 5282 · block

Anker: `var KASUYA_POUR_CYCLE_SEC = 45;`

~~~~text
/* NIEUW (heraudit, Kasuya-timing): de generieke 30 sec hierboven lag al binnen de eigen
   gedocumenteerde "30-45 sec"-marge (zie de module-comment bij buildPourSchedule), maar
   voor Kasuya's 4:6-methode specifiek noemen meerdere onafhankelijke, wederzijds
   consistente bronnen (o.a. honestcoffeeguide.com, home-barista.com, japanesecoffeegear.com,
   pullandpourcoffee.com, foursixcoffeeapp.com — geen onderlinge tegenspraak, in
   tegenstelling tot bv. de Rao/Hedrick-bronnen elders in dit bestand) expliciet "45 seconden
   tussen elke pour" als vast onderdeel van de methode zelf, niet als een generieke
   pour-over-conventie. Vandaar een losse, Kasuya-specifieke waarde i.p.v. de gedeelde
   POUR_CYCLE_SEC aan te passen — dat zou ook Hoffmann/April/Rao/Perger's schema's
   veranderen, waarvoor deze specifieke 45-sec-claim niet is onderzocht.
   KASUYA_DRAWDOWN_SEC is GEEN direct gepubliceerd getal — de bronnen noemen alleen een
   totale zettijd "van niet meer dan 3:30". Bij vijf pours 45 sec uit elkaar begint de
   laatste pour op t=3:00, dus impliceert die 3:30-grens een marge van ~30 sec ná de
   laatste pour — een eigen, transparant afgeleide waarde (analoog aan hoe "helder"
   elders al als eigen extrapolatie is gelabeld), geen letterlijk gepubliceerd cijfer.
   Zelfs met deze marge komt de uiteindelijke schema-lengte door een bestaande,
   voor alle fase-bewuste overlays gedeelde rekenkundige eigenschap van
   buildPourSchedule() (één extra "fantoomcyclus" tussen de laatste pour en het einde
   van het schema, los van drawdownSec) nog boven de 3:30 uit — zie de toelichting bij
   de Kasuya-tak hieronder. Dat gedeelde rekenmechanisme raakt deze wijziging bewust niet
   aan: dat is een groter, apart te beoordelen vraagstuk dat alle fase-bewuste overlays
   raakt, niet alleen Kasuya. */
~~~~

## #144 · regel 5308 · block

Anker: `var APRIL_FIRST_POUR_EXTRA_SEC = 10;`

~~~~text
/* HERAUDIT (April-timing): April Coffee Roasters' eigen V60-huisrecept (aprilcoffeeroasters.com,
   dezelfde bron als APRIL_HOUSE_METHOD.attribution hierboven) geeft zes gelijke pours van 50 g
   op expliciete tijden: 0:00, 0:40, 1:10, 1:40, 2:10, 2:40 (20 g dosis, 300 g water), met een
   totale zettijd van 3:20-3:30. Onafhankelijk bevestigd via twee losse zoekopdrachten, beide
   met identieke tijden/gewichten — geen onderlinge tegenspraak. Dat is een 40-sec interval
   tussen de EERSTE en TWEEDE pour, gevolgd door vier intervallen van 30 sec — de generieke
   30-sec-cadans (POUR_CYCLE_SEC) klopt dus voor pour 2 t/m 6, alleen de allereerste pauze is
   10 sec langer. Net als bij Kasuya een losse, techniek-specifieke waarde i.p.v. de gedeelde
   POUR_CYCLE_SEC aan te passen — dat zou ook Hoffmann/Rao/Perger's schema's raken. Met deze
   10 sec extra vóór pour 2, en overigens ongewijzigde cadans/drawdown, komt de laatste pour op
   t=160s en de totale schemalengte op 200s (3:20) — binnen de gepubliceerde 3:20-3:30-marge. */
~~~~

## #145 · regel 5321 · block

Anker: `var HOFFMANN_BLOOM_SEC = 45;`

~~~~text
/* HERAUDIT (Hoffmann-timing): James Hoffmanns "Ultimate V60"-video (dezelfde bron als
   HOFFMANN_ULTIMATE.attribution hierboven) geeft expliciete klokttijden, onafhankelijk
   bevestigd via meerdere secundaire renderingen (unaniem, geen onderlinge tegenspraak):
   bloom tot 0:45, dan een DOORLOPENDE spiraal-hoofdpour tot 60% van het watergewicht op
   1:15, dan een tweede doorlopende pour tot 100% op 1:45, totale zettijd 3:30. Dit is
   wezenlijk anders dan het generieke model (korte, losse "in één beweging"-pours op vaste
   cadans): de twee hoofdpours zijn zelf giet-VENSTERS van 30 sec, geen momentopnames — dat
   modelleert deze functie voortaan via het endT-veld (start/eind van de giet-actie), dat
   voorheen alleen door fmtStepTime()/updateDial() werd GELEZEN maar door
   geen enkele overlay ooit werd GEZET (dode code). Bloomtijd was al 30 sec (generiek) en
   is nu voor Hoffmann specifiek 45 sec, net als bij Kasuya/April een losse constante i.p.v.
   de gedeelde default aan te passen. De 105 sec tussen het einde van pour 2 (1:45) en de
   totale 3:30 is een aanzienlijk langere doorloopmarge dan de generieke FINAL_DRAWDOWN_SEC
   (40 sec) — een eigen, expliciet gepubliceerd getal, geen aanname. */
~~~~

## #146 · regel 5340 · block

Anker: `var V60_REFERENCE_CONTACT_MID = (120 + 210) / 2; // BREWER_REGISTRY.V60_02.contactTimeGuidance`

~~~~text
/* NIEUW (Reparatieplan v4.0, B-2b / Bouwbesluit BB-1, akkoord gebruiker): B-2a maakte
   eerlijk dat op Chemex GEEN enkel schema in zijn eigen contacttijd-diagnostische band valt
   (100-175s tegen 240-300s) — dit lost het daadwerkelijk op, zonder D-4 (schemalengte volgt
   uit het aantal giet-momenten, niet uit contacttijd-als-doel) los te laten.

   Methode: POUR_CYCLE_SEC/FINAL_DRAWDOWN_SEC hierboven zijn de V60-referentie. Voor elke
   andere brewer schaalt cycleSec (de tijd TUSSEN twee giet-momenten) mee met de verhouding
   tussen de middens van de al bestaande, klasse-B contactTimeGuidance-banden
   (BREWER_REGISTRY, ongewijzigd in de engine) — arithmetiek op een bestaand evidence-
   getagd getal, geen nieuw brouwgetal. De schemalengte blijft daarna nog steeds volledig
   een functie van het aantal giet-momenten (D-4 blijft dus intact); alleen de tijd PER
   giet-moment is voortaan per toestel geijkt in plaats van universeel V60-afgeleid.

   Dit is zelf een vertrekpunt (Bouwbesluit-niveau), geen letterlijke publicatie: de keuze
   om te schalen op het bandmidden i.p.v. bijvoorbeeld de bandbreedte is een eigen,
   verdedigbare interpretatie. Toetsbaar: elk Chemex-schema moet voortaan binnen zijn eigen
   band vallen (zie tests/brewconsole.pure-logic.test.mjs, "B-2b"). */
~~~~

## #147 · regel 5358 · block

Anker: `var V60_REFERENCE_EFFECTIVE_CYCLES = 2; // 3-pulse Kernrecept, min 1 fantoomcyclus (buildPourSchedule())`

~~~~text
/* HERAUDIT (Chemex-band-herijking, vervolg op de gegeneraliseerde fantoomcyclus-fix): de
   drawdownSec hierboven schaalde vroeger simpelweg mee met dezelfde factor als cycleSec —
   dat was geijkt tegen de OUDE, foutieve 3-cycli-formule (zie buildPourSchedule(), de
   fantoomcyclus die daar is weggehaald). Het 3-pulse Kernrecept-schema landde toen net
   binnen de Chemex-band; na de fix verliest datzelfde schema 1×cycleSec en valt het eronder.
   cycleSec zelf blijft ongewijzigd geijkt op de contactTimeGuidance-verhouding — dat zegt
   iets reëels over hoe snel je op dit toestel giet, los van hoeveel cycli er in het schema
   zaten. drawdownSec (de marge NA de laatste pour, altijd al het minst evidence-vaste deel)
   wordt nu zo gekozen dat het 3-pulse referentieschema (bloom + 2 cycli, na de fix)
   dezelfde RELATIEVE positie inneemt in zijn eigen contactTimeGuidance-band als het
   V60-referentieschema in zijn eigen band inneemt. Dat is zelfconsistent tussen toestellen
   (geen los geraden getal per brewer) en reduceert voor V60 zelf, door constructie, exact
   tot de ongewijzigde FINAL_DRAWDOWN_SEC — dus geen aparte V60-uitzondering nodig. Net als
   BB-1 zelf: een eigen, verdedigbare herijking op Bouwbesluit-niveau, geen letterlijke
   publicatie (er bestaat geen gepubliceerde uitsplitsing van Chemex' drawdown-marge). */
~~~~

## #148 · regel 5402 · line

Anker: `const isKasuya = overlayId === 'KASUYA_4_6';`

~~~~text
// B-2b: per-brewer cyclusconstanten (zie brewerPourCycleConstants()); default op de
  // V60-referentie zodat bestaande directe aanroepen (o.a. tests) ongewijzigd blijven.
  // HERAUDIT (Kasuya-timing): voor Kasuya specifiek wegen de eigen, meervoudig
  // onafhankelijk bevestigde 45-sec-cadans en de daarvan afgeleide drawdown-marge zwaarder
  // dan de generieke/per-brewer waarden — zie KASUYA_POUR_CYCLE_SEC/KASUYA_DRAWDOWN_SEC
  // hierboven voor de volledige onderbouwing. Alleen voor deze ene overlay: de gedeelde
  // cycleSecArg/drawdownSecArg (en dus ook een eventuele per-brewer-schaling, die toch
  // nooit voor Kasuya's enige brewer-scope V60_02 afwijkt van de referentie) worden hier
  // bewust genegeerd, om geen impact te hebben op Hoffmann/April/Rao/Perger.
~~~~

## #149 · regel 5427 · line

Anker: `const pulseCountIncludesBloom = !!overlayMeta.pulseCountIncludesBloom && !skipBloom && pulseCount >= 2;`

~~~~text
// FIX (D-3, §3a): als de overlay's pulseCount de bloom al meetelt (bv. Kasuya: 5 pours
  // totaal, de eerste ís de bloom), dan is er GEEN aparte bloom-stap vóór deze pulseCount
  // — anders krijg je zes waterbeurten waar de bron er vijf bedoelt.
~~~~

## #150 · regel 5437 · line

Anker: `const effectivePulseCount = Math.max(1, postBloomPulseCount - 1);`

~~~~text
// HERAUDIT (fantoomcyclus, gegeneraliseerd): de formule reserveerde vroeger overal
  // bewust één volledige extra cyclus tussen de laatste pour en drawdownSec, omdat
  // pulse-posities werden berekend als breuken i/N van een venster ter grootte van N
  // cycleSec — waardoor de láátste pulse pas (N-1)/N van dat venster bereikte en er dus
  // een hele cyclus "over" bleef. Dat patroon was voorheen alleen zichtbaar via een
  // zelf-consistente test (totalTime - laatstePulseT === cycleSec + drawdownSec), nooit
  // getoetst aan echte gepubliceerde totaaltijden. Bij Kasuya (eerst) en onafhankelijk
  // ook bij April (Coffee Roasters House Method) bleek de extra cyclus de gepubliceerde
  // totaaltijd met precies één cycleSec te laten overschrijden — voor twee onafhankelijke
  // technieken tegelijk, dus geen toeval maar een fout in de gedeelde formule. Fix: de
  // laatste pour markeert het BEGIN van de laatste cyclus (niet het einde ervan) — er zijn
  // dus effectief N-1 volledige cycli tussen bloom/start en drawdown, niet N. Geldt nu
  // voor alle overlays/paden (niet langer Kasuya-specifiek); Kasuya's eigen 45-sec-cadans
  // en 30-sec-drawdownmarge (KASUYA_POUR_CYCLE_SEC/KASUYA_DRAWDOWN_SEC hierboven) blijven
  // ongewijzigd, dit raakt alleen hoe de pulses over de resterende tijd verdeeld worden.
~~~~

## #151 · regel 5453 · line

Anker: `const firstPourExtraSec = (isApril && effectivePulseCount >= 1) ? APRIL_FIRST_POUR_EXTRA_SEC : 0;`

~~~~text
// HERAUDIT (April-timing): zie APRIL_FIRST_POUR_EXTRA_SEC hierboven — de eerste pauze
  // tussen pour 1 en pour 2 is voor April 10 sec langer dan de generieke cadans.
~~~~

## #152 · regel 5456 · line

Anker: `const totalTime = isHoffmann`

~~~~text
// HERAUDIT (Hoffmann-timing): Hoffmanns schema is geen cyclus-gebaseerd model (zie
  // HOFFMANN_TOTAL_SEC hierboven) — de gedeelde effectivePulseCount/cycleSec-formule slaat
  // er niet op toe, vandaar een expliciete uitzondering i.p.v. de formule te verbuigen.
~~~~

## #153 · regel 5467 · line

Anker: `const bloomWater = Math.max(0, Math.min(Math.round(dose * 2 / 5) * 5, Math.round(water * 0.2 / 5) * 5));`

~~~~text
// HERAUDIT (Hoffmann-timing): bloomWater-formule ongewijzigd t.o.v. het generieke pad
    // (±2x dosis, max 20% van het water) — dat klopt al met Hoffmanns eigen 60g/500g-
    // voorbeeld (12%, exact 2x zijn eigen 30g-dosis). Alleen de TIJDEN en het cumulatieve
    // aandeel bij pour 1 (60% i.p.v. een gelijke verdeling) zijn Hoffmann-specifiek.
    // Geen endT op de bloomstap: de 45 sec is de totale wachttijd tot pour 1 (t hieronder),
    // niet de duur van het ingieten van de bloom zelf — dat blijft, net als bij elke andere
    // overlay, de generieke giettijd bij 4–8 g/s (pourSecFor()) voor een korte pour.
~~~~

## #154 · regel 5504 · line

Anker: `const postBloomWindow = Math.max(10, totalTime - bloomTime - drawdownSec);`

~~~~text
// FIX (Reparatieplan v4.0, B-3 / bevinding E-04): dit venster bevatte ook
    // FINAL_DRAWDOWN_SEC, waardoor de doorloopmarge dubbel werd geteld — één keer in
    // totalTime en nog eens uitgesmeerd over de pour-afstanden. Resultaat: 40 s tussen
    // pours terwijl POUR_CYCLE_SEC 30 zegt, en een bed dat ertussen droogvalt.
~~~~

## #155 · regel 5554 · line

Anker: `const perPulse = Math.max(5, Math.round((remainingWater / pulseCount) / 5) * 5);`

~~~~text
// HERAUDIT (fantoomcyclus, gegeneraliseerd): direct rekenkundige pulse-posities
    // (startTime + i * cycleSec) i.p.v. de vroegere breuk over een te ruim venster — zie
    // de toelichting bij effectivePulseCount hierboven. Bij pulseCount pulses zijn er
    // effectivePulseCount (= pulseCount - 1) volledige cycli tussen de eerste pour en de
    // start van de drawdown; de laatste pour (i = pulseCount - 1) valt dus precies op
    // startTime + effectivePulseCount * cycleSec, wat exact aansluit op totalTime.
~~~~

## #156 · regel 5597 · block

Anker: `function overlayTemplateIdOf(genCandidate){`

~~~~text
/* NIEUW (Implementatieplan v3.0, P1 §13/§27 — "canonical recommendation pipeline"):
   tot nu toe koos computeRecipe() de overlay zelf via een eigen .find() op
   mapEntry.overlay — de motor se eigen B.selectRecommendation()/computeRecipeFit()/
   computeEvidenceConfidence() (gebouwd voor precies deze taak) lagen volledig ongebruikt.
   Dit verving die schaduw-selectie DOOR de canonieke pipeline, zonder een
   nagemaakte TDS/EY-voorspelling per kandidaat te verzinnen: elke kandidaat in één
   generateCandidates()-aanroep deelt letterlijk dezelfde core.targetWindow (overlays
   passen alleen de giettechniek aan, nooit dosis/water/ratio/maling — zie
   buildStyleOverlay()), dus candidateWindow === targetWindow is een echte eigenschap
   van hoe recepten hier worden afgeleid, geen fictieve precisie. Het enige echte
   onderscheid tussen kandidaten is welke techniek bij het gekozen profiel hoort — dat
   bestond al (ENGINE_PROFILE_MAP[profielKey].overlay) en wordt nu doorgegeven als
   computeRecipeFit()'s softConstraintMismatch-signaal i.p.v. buiten de pipeline om
   direct te kiezen. Resultaat geverifieerd via de volledige baseline-sweep (_baselines_v3/):
   0 diff op elk bestaand recept. */
~~~~

## #157 · regel 5787 · line

Anker: `let strengthClamped = false;`

~~~~text
// FIX (Reparatieplan v4.0, B-1 / bevinding E-02): de sterktehendel vermenigvuldigde de
  // dosis ná generateCandidates()'s constraint-check, waardoor V60_DOSE_CEILING (een
  // INHERITED_HARD_CONSTRAINT, tier HARD) door een UI-knop overschreden kon worden —
  // 23,7 g bij 380 ml/+1, 14,1 g bij 265 ml/-1. Dezelfde klasse defect als D-2. De klem
  // hieronder is het vangnet; renderStrengthToggle() schakelt de chip bovendien uit zodra
  // hij toch niets zou opleveren, zodat dit zelden hoeft te vuren. GEEN stille
  // substitutie: als er geklemd wordt, staat dat in strengthNote.
~~~~

## #158 · regel 5814 · line

Anker: `const bypassMethodSupported = methodKey === 'v60';`

~~~~text
// NIEUW (Implementatieplan v3.0, §14, P1 "Bypass method guard"): de concentraat-methode
  // is V60-georiënteerd — de brontechniek (Drip Roast's V60-bypassgids) en de bestaande
  // percentage-opties gelden niet aantoonbaar voor Chemex. renderBypassToggle() verbergt de
  // knop hierop al (BP-9), maar dit is de eigenlijke garantie: zelfs als bypassEnabled toch
  // true binnenkomt op een niet-V60-methode (bv. handmatig aangepaste state), past de
  // motor het nooit stilzwijgend toe — net zo min als B-1's dosisklem een overschrijding
  // stilzwijgend liet passeren.
~~~~

## #159 · regel 5827 · line

Anker: `const deviceTMin = core.temperatureBand.min, deviceTMax = core.temperatureBand.max;`

~~~~text
// Temperatuur — FIX (Implementatieplan Zetadvies v3.0, Fase 2a/2b, Bouwbesluit B-1):
  // een uitvoerbaar ankerpunt + instructie per branddiepte, altijd binnen de bestaande
  // apparaat-envelop (deviceTMin/deviceTMax) — nooit een los, schijn-precies getal, en
  // nooit stilzwijgend tot de bovengrens van de apparaatband doorlopend alsof dat getest
  // is (§2b). Ratio/dosis blijven hierdoor volledig ONVERANDERD — alleen dit ankerpunt en
  // de maalrichting hieronder mogen met branddiepte meebewegen (B-1).
~~~~

## #160 · regel 5849 · line

Anker: `const grindStartingRange = core.grind.startingRangeHint.state === 'RESOLVED' ? core.grind.startingRangeHint.value : null`

~~~~text
// Community-sourced starting-click range (never a calibration value) — resolved only
  // for the Timemore C3S Pro's V60 band today; RESEARCH_GAP everywhere else, including
  // Chemex. See src/registry/grinders.ts's TIMEMORE_C3S_PRO_V60_STARTING_RANGE and
  // decision-grind-starting-range-v60.md for the sourcing/exclusions behind this.
  // BIJGEWERKT (Implementatieplan v3.0 / C3S Pro Technische Deep-Dive, §9): 13-16 -> 15-17,
  // nu als apart "starting"-concept naast de bredere practical range hieronder.
~~~~

## #161 · regel 5856 · line

Anker: `const grindPracticalRange = core.grind.practicalRangeHint && core.grind.practicalRangeHint.state === 'RESOLVED' ? core.g`

~~~~text
// NIEUW (plan §9/§12): de bredere "zinvolle praktische V60-zone" (13-18) — een apart
  // concept van de smallere starting range hierboven, nooit gebruikt om een startpunt te
  // positioneren (dat blijft binnen grindStartingRange), puur om te laten zien hoe breed
  // het werkbare gebied daadwerkelijk is.
~~~~

## #162 · regel 5861 · line

Anker: `const grindRoastPoint = grindStartingRange`

~~~~text
// NIEUW (Implementatieplan Zetadvies v3.0, Fase 2c, Bouwbesluit B-1): maalRICHTING,
  // geen maalgetal — een positie BINNEN de al-gepubliceerde klikrange hierboven (licht
  // brandt fijn/ondergrens, donker brandt grof/bovengrens). Voegt geen nieuwe claim toe
  // en verlegt de range zelf niet; alleen INSUFFICIENT/RESEARCH_GAP-molens (grindStartingRange
  // === null) krijgen terecht geen enkel startpunt, net als hierboven.
~~~~

## #163 · regel 5869 · line

Anker: `const grindMicronContest = core.grind.micronsPerClickEstimate.state === 'CONTESTED' ? core.grind.micronsPerClickEstimate`

~~~~text
// BIJGEWERKT (Implementatieplan v3.0 / C3S Pro Technische Deep-Dive, §11): het
  // micron-per-click-getal is niet langer CONTESTED — de nieuwe technische deep-dive
  // consolideert 83,3 µm/click als SOURCED mechanische specificatie (zie
  // TIMEMORE_C3S_PRO_MECHANICAL_FACTS in de engine); de vroegere 50-micron-tegenclaim
  // staat nu alleen nog in een historical ledger, niet meer gelijkwaardig in de UI.
  // grindMicronContest (het OUDE tegenspraak-object) blijft null voor de C3S Pro — zie
  // grindMechanicalMicron hieronder voor de nieuwe, opgeloste weergave.
~~~~

## #164 · regel 5885 · line

Anker: `phase1Bias: mapEntry.phase1Bias || null`

~~~~text
// NIEUW (C-1): Kasuya's taste dial, per profiel. Alleen betekenisvol bij een overlay
    // die zelf een fase-mechanisme vaststelt; elke andere overlay negeert dit veld.
~~~~

## #165 · regel 5892 · line

Anker: `const grindShortContact = grindRoastPoint != null && totalTime <= SHORT_CONTACT_MAX_SEC;`

~~~~text
// NIEUW (audit BC-11, akkoord gebruiker): de klikrange past bij gangbare contacttijden
  // (~2:30-3:30). Een schema van hooguit SHORT_CONTACT_MAX_SEC laat het water korter met de
  // koffie in contact en extraheert bij dezelfde maling minder — daarom één klik fijner,
  // nooit buiten de praktische range. Vertrekpunt, geen gemeten getal; de proefkaart en
  // het advies corrigeren het als het voor jou niet klopt.
~~~~

## #166 · regel 5901 · line

Anker: `const contactTimeDiagnosticBand = core.contactTimeSeconds.state === 'RESOLVED' ? core.contactTimeSeconds.value : null;`

~~~~text
// FIX (Implementatieplan Zetadvies v3.0, Fase 3c/D-4): contactTimeGuidance stuurt de
  // schemalengte niet langer (die volgt nu uit de giet-structuur, zie buildPourSchedule()
  // hierboven) — het blijft precies wat de registry het al noemde: een gemonitorde
  // diagnostische band, geen doel. Meegegeven aan de UI voor de controle-achteraf op het
  // Klaar-scherm (renderBrewLogHonestSummary()), niet om het schema te bepalen.
~~~~

## #167 · regel 5912 · line

Anker: `let authorUnverified = false;`

~~~~text
// NIEUW (Implementatieplan v3.0, §15 "Technique provenance"): de "Unverified
  // attribution"-categorie uit de taxonomie — vandaag alleen RAO_CHEMEX_DISCLOSED
  // (att.verified === false). Stond al als parenthetische tekst in `author`; hier ook als
  // eigen boolean zodat de UI er een zichtbare badge van kan maken i.p.v. alleen tekst die
  // in de auteursregel kan verdwijnen.
~~~~

## #168 · regel 5924 · line

Anker: `const structureNote = disp.mechanism || '';`

~~~~text
// FIX (expertaudit, bevinding 1): dit was overlay.pourStructure — de engine's eigen,
    // Engelse mechanisme-tekst, met interne bestandsverwijzingen (bv. "audit-established-
    // recipes-v60-chemex.md §1, gap G-RECIPE-01") er middenin. Die tekst belandde ONGEWIJZIGD
    // op het Prep-scherm: Engels in een verder Nederlandse app, en met interne project-
    // documentatie zichtbaar voor de eindgebruiker. disp.mechanism (OVERLAY_DISPLAY
    // hierboven) herformuleert hetzelfde mechanisme in het kort en in het Nederlands, zonder
    // die interne verwijzingen. Geen enkel evidence-veld in de engine zelf gewijzigd of
    // verwijderd — technique/author/evidence-badge (hieronder al zichtbaar) blijven de
    // herkomst tonen; alleen deze mechanisme-uitleg is nu leesbaar voor een eindgebruiker.
~~~~

## #169 · regel 5934 · line

Anker: `pulseCountSourced = !!(overlay.pulseCount && overlay.pulseCount.state === 'RESOLVED');`

~~~~text
// FIX (Implementatieplan Zetadvies v3.0, Fase 3): tekst geactualiseerd — de schemalengte
    // komt niet meer uit de apparaatbrede contacttijd-diagnostiek (die staat nu los, als
    // controle-achteraf op het Klaar-scherm), en de verdeling is niet meer overal simpelweg
    // gelijkmatig: waar de bron zelf een fase-mechanisme vaststelt (bv. Kasuya's 40/60), volgt
    // dat mechanisme mee; ALLEEN de exacte grammen bínnen elke fase zijn een eigen, gelijke
    // verdeling (Fase 3b) — nooit een letterlijk gepubliceerd stappenschema.
    // NIEUW (Reparatieplan v4.0, A-4 / bevinding E-06): wanneer de overlay zelf GEEN
    // gecorroboreerd aantal giet-momenten heeft (pulseCount is RESEARCH_GAP — vandaag:
    // Rao V60 en Perger), is niet alleen de tijdsverdeling maar ook het AANTAL beurten een
    // eigen invulling. Dat moet er staan, want anders draagt de auteursnaam boven het
    // schema een gezag dat de bron niet geeft (PDR §38: bron vs. interpretatie).
~~~~

## #170 · regel 5949 · line

Anker: `const biasUitleg = mapEntry.phase1Bias`

~~~~text
// NIEUW (Reparatieplan v4.0, C-1 / bevinding E-05, Bouwbesluit BB-2): legt uit welke van
    // de drie standen van Kasuya's eigen "taste dial" actief is en waar die vandaan komt —
    // 'zoet'/'neutraal' zijn letterlijk de twee gepubliceerde renderingen, 'helder' is een
    // eigen, gelabelde extrapolatie (spiegelbeeld van 'zoet').
~~~~

## #171 · regel 5980 · block

Anker: `// NIEUW (Reparatieplan v4.0, B-5 / bevinding E-08): de percolatie vindt plaats op een`

~~~~text
/* FIX (teamreview v2, Frontend Architect): roastGrindNote/splitNote zijn hier bewust
     verwijderd — beide velden waren al sinds de overstap naar de eerlijke engine
     permanent leeg (roast-conditionele klikcorrectie resp. proces-conditionele Kasuya-
     splitverschuiving zijn allebei FORBIDDEN edges), en de bijbehorende <p id="roastgrind-
     note">/<p id="split-note"> renderden dus nooit iets. Dode velden, dode DOM-nodes,
     nu allebei weg in plaats van stilzwijgend leeg. */
~~~~

## #172 · regel 5987 · line

Anker: `const brewerRatio = (bypassActuallyApplied && dose > 0) ? (pourWaterMl / dose) : null;`

~~~~text
// NIEUW (Reparatieplan v4.0, B-5 / bevinding E-08): de percolatie vindt plaats op een
  // heel andere ratio dan de kaart toont. Dat getal hoort erbij, en het voorbehoud
  // erachter ook: het doelvenster waaruit dosis/ratio zijn afgeleid, geldt niet meer.
~~~~

## #173 · regel 5991 · line

Anker: `const bypassNote = bypassActuallyApplied`

~~~~text
// FIX (Implementatieplan Bypass v1.0, Fase A, BP-1): "bypass is geen sterktehendel" —
  // deze tekst zei voorheen dat bijschenken de kop terugbrengt op "de normale sterkte" en
  // adviseerde "doorgaans iets fijner/warmer". Beide zijn onjuist/ongefundeerd gebleken
  // (Research Brief Bypass v1.0 §4.4/E5/E6/E7): met volledig volumeherstel is de kop
  // hooguit even sterk (bij gelijke extractie) en eerder iets zwakker (retentie/extractie-
  // verlies in de geconcentreerde fase), nooit intenser. De maalrichting is bovendien
  // CONTESTED (fijner: Coffee ad Astra/Drip Roast/Gagné — grover: Royal Coffee/Wang), dus
  // geen eenzijdig advies meer.
~~~~

## #174 · regel 6022 · line

Anker: `hasNamedOverlay: !!overlay,`

~~~~text
// NIEUW (vervolgplan v2.3, Bouwbesluit B4 — Evidence-badge): tweedelig, exact gekoppeld
    // aan dezelfde overlay-aanwezigheid die coreOnlyReason() hierboven al gebruikt, zodat de
    // badge nooit de disclaimer in `notes` kan tegenspreken (regressierisicotabel §5).
~~~~

## #175 · regel 6026 · line

Anker: `pulseCountSourced,`

~~~~text
// NIEUW (Reparatieplan v4.0, A-4): of het AANTAL giet-momenten uit de bron komt of
    // een eigen invulling is — gebruikt door de evidence-badge, zodat die de disclaimer
    // in `notes` nooit kan tegenspreken.
~~~~

## #176 · regel 6030 · line

Anker: `authorUnverified,`

~~~~text
// NIEUW (Implementatieplan v3.0, §15): zie de toelichting bij authorUnverified hierboven.
~~~~

## #177 · regel 6032 · line

Anker: `contactTimeDiagnosticBand,`

~~~~text
// NIEUW (Implementatieplan Zetadvies v3.0, Fase 3c/D-4): zie de toelichting bij
    // contactTimeDiagnosticBand hierboven — gebruikt door renderBrewLogHonestSummary(),
    // stuurt totalTime/steps niet (meer).
~~~~

## #178 · regel 6036 · line

Anker: `modelPolicyVersion: MODEL_POLICY.version`

~~~~text
// NIEUW (Implementatieplan v3.0, §6/§20): welke Model Policy-versie de TDS/EY-vensters
    // van dít recept leverde — meegeschreven op elke nieuwe logging (saveBrewLogEntry())
    // zodat een toekomstige policy-wijziging historische loggingen niet met
    // terugwerkende kracht herinterpreteert.
~~~~

## #179 · regel 6047 · line

Anker: `const METHOD_PHOTO = { v60: 'photos/method-v60.webp', chemex: 'photos/method-chemex.webp' };`

~~~~text
// NIEUW (foto's methode-keuzekaarten): per methode een foto naast/i.p.v. het kale icoon,
// zelfde neutraal-vlak-fallback (Bouwbesluit B6) als de 5 bestaande foto-plekken.
~~~~

## #180 · regel 6050 · line

Anker: `const ROAST_PHOTO = {`

~~~~text
// NIEUW (foto's roast-keuzekaarten): vervangt het kleurvlakje (ROAST_COLOR) door een foto van
// die branddiepte; zonder foto viel dit terug op het kleurvlak, nu op het neutrale bonen-icoon.
~~~~

## #181 · regel 6059 · line

Anker: `const BREW_PHOTO = {`

~~~~text
// NIEUW (zetscherm-foto's): per methode een staande foto (telefoon, beeldverhouding smaller dan 3:5)
// en een vierkante (tablet, desktop). Eigen foto's met het zetmoment boven en een donkere onderkant
// voor de timer; zie prepareBrewScreen().
~~~~

## #182 · regel 6220 · block

Anker: `/* FIX (teamreview v2 — Hoog bevinding, Software Architect/Senior Frontend Developer):`

~~~~text
/* ============================================================
   BEAN ADVISOR — methode-advies op basis van roast, smaakkarakter,
   batchgrootte en (optioneel) proces. Roast/profiel hergebruiken
   dezelfde keuzes als de hoofd-flow, dus het advies stroomt direct
   door naar Prep.

   De proces-weging hieronder is toegevoegd na navraag bij bronnen
   uit de vakwereld: Elika Liftee (2022 US Brewers Cup Champion,
   Director of Education, Onyx Coffee Lab) en Sam Corra (Director of
   Coffee, ONA Coffee) — via Perfect Daily Grind, "Should you brew
   experimentally processed coffees differently?" (2022). Kernpunt:
   natural/anaerobic-geverfermenteerde bonen zijn minder dicht, malen
   sneller fijnstof en lossen sneller op dan washed koffie. Dat is
   een mechanisch risico voor de dikke, makkelijk verstoppende
   Chemex-filter (bevestigd door meerdere onafhankelijke Chemex-
   brewguides over "fines/stalling"). Vandaar: een lichte (niet-
   dominante) duw richting V60 bij natural/anaerobic.
   FIX (proces-heraudit): deze toelichting beweerde er ook "een reden
   om iets kouder te zetten" bij, en verwees naar "een temperatuurnudge
   in computeRecipe()" — die nudge bestaat niet (meer). computeRecipe()
   geeft zettemperatuur uitsluitend via ROAST_TEMP_ANCHOR (branddiepte),
   processKey komt daar niet in voor — precies de FORBIDDEN edge die de
   audit bij bypassAdvice() hierboven al expliciet dichtte, maar die in
   deze reasoning-tekst nooit werd bijgewerkt. De tekst beloofde dus een
   receptaanpassing die feitelijk niet gebeurde. Weggehaald i.p.v.
   alsnog geïmplementeerd: er is geen gevalideerde, per-proces-specifieke
   temperatuurwaarde gevonden, en het mechanische fijnstof-argument voor
   de brewer-keuze zelf staat op eigen benen overeind.
   ============================================================ */
~~~~

## #183 · regel 6249 · block

Anker: `function computeMethodAdvice(roastKey, profileKey, batchKey, processKey, experimentalFlag){`

~~~~text
/* FIX (teamreview v2 — Hoog bevinding, Software Architect/Senior Frontend Developer):
   computeMethodAdvice() en buildReasoningLines() waren tot v2 twee losse, handmatig
   gesynchroniseerde implementaties van dezelfde V60-vs-Chemex-beslissing (oude audit
   §12.2/§19.2, destijds MODIFY/MERGE, nooit doorgevoerd) — buildReasoningLines had zijn
   eigen kopie van brightProfiles/bodyProfiles en zijn eigen roast-/batch-/proces-
   classificatie, die zonder dat iemand het zou merken uit de pas kon lopen met de
   score-logica hieronder. computeMethodAdvice() geeft nu de bucket-indeling die het
   zelf al gebruikt (roastBucket/profileBucket/isFerment) mee terug in zijn resultaat;
   buildReasoningLines() leest die rechtstreeks terug in plaats van zelf opnieuw te
   classificeren — zie de aangepaste functie hieronder. Eén plek bepaalt nu zowel de
   score als de uitleg. */
~~~~

## #184 · regel 6363 · line

Anker: `const nearTieCandidates = adviceState.flavorScores ? profileNearTieCandidates(adviceState.flavorScores) : null;`

~~~~text
// FIX (v2.2 kernflow — Bouwbesluit "Schijnkeuze profielen: Knoppen samenvoegen"):
  // visibleProfileKeys() i.p.v. Object.keys(PROFILE_INFO), en displayScoreFor() i.p.v. een
  // kale scores[k]-lookup — anders zou de samengevoegde "Klassiek"-chip altijd 0 sterren
  // tonen, ook wanneer de onderliggende vol_rond/zoet-scores wél sterk zijn (klassiek komt
  // zelf nooit voor als sleutel in classifyProfile()'s scores-object).
  // FIX (SMAAKKARAKTER-sterren): PROFILE_TECHNIQUE_ONLY_KEYS (snel_puur/bloemig_delicaat/
  // sirooprig_vol/robuust/evenwichtig_flex) kunnen sowieso nooit een classifyProfile()-score
  // krijgen — displayScoreFor() gaf ze altijd stilzwijgend 0 terug, wat een onzichtbare
  // 0/5-sterrenrij rendert die oogt als kapot i.p.v. "dit is geen smaakwiel-categorie".
  // Voor die knoppen expliciet geen sterrenrij i.p.v. een altijd-nul score te tonen.
  // HERAUDIT (bijna-gelijke-stand): bij een echte bijna-gelijke stand (zie
  // profileNearTieCandidates()) wordt adviceState.profile hier bewust NIET vooringevuld
  // vanuit bean.profileKey — er wordt geen keuze voor de gebruiker gemaakt. Zodra de
  // gebruiker zelf op een profielchip klikt (zie de click-handler verderop) staat
  // tieResolved op true en blijft die keuze bij volgende re-renders (bv. na een
  // roast/batch-klik) gewoon staan, ook al is de score-marge zelf ongewijzigd.
~~~~

## #185 · regel 6397 · block

Anker: `const tieNoteEl = document.getElementById('advice-profile-tie-note');`

~~~~text
/* HERAUDIT (bijna-gelijke-stand): verving de oude, uitsluitend-passieve tie-note (B1,
     koffie-expertpanel Amara/Youssef — alleen exacte gelijke standen, en zelfs dan alleen
     een tekstje ONDER een al stilzwijgend voorgeselecteerde chip). Nu: zolang de tie niet is
     opgelost (hasPendingTie) toont dit blok een actieve, opvallende prompt en is er BEWUST
     geen chip voorgeselecteerd (zie hasPendingTie hierboven) — maybeShowAdviceResult() toont
     dan ook nog geen recept, precies zoals bij een ontbrekende roast/batch-keuze. Zodra de
     gebruiker een profiel aanklikt verdwijnt dit blok en gedraagt het scherm zich weer
     helemaal normaal. */
~~~~

## #186 · regel 6438 · line

Anker: `adviceState.profile = rawKeyForVisibleSelection(b.getAttribute('data-adv-profile'), adviceState.flavorScores);`

~~~~text
// FIX (v2.2): niet blindweg de (mogelijk samengevoegde) canonieke sleutel opslaan —
    // zie rawKeyForVisibleSelection() hierboven voor waarom dat secondaryFlavorNotes() zou
    // breken zodra iemand op "Klassiek" klikt terwijl zijn smaakscore naar vol_rond/zoet wijst.
~~~~

## #187 · regel 6442 · line

Anker: `adviceState.tieResolved = true;`

~~~~text
// HERAUDIT (bijna-gelijke-stand): een klik is altijd een expliciete keuze — zet
    // tieResolved zodat renderAdviceChips() deze keuze bij een volgende re-render niet
    // opnieuw naar null terugzet, ook al blijft de onderliggende score-marge hetzelfde.
~~~~

## #188 · regel 6685 · block

Anker: `{ label:'Steenfruit', tags:[`

~~~~text
/* HERAUDIT (smaakwiel-uitbreiding o.b.v. gebruikersaangeleverde tasting notes): Perzik/
       Abrikoos/Pruim stonden voorheen los in "Overig fruit" — verplaatst naar een eigen
       "Steenfruit"-subgroep (zelfde patroon als de al bestaande Tropisch fruit/Citrusfruit-
       subgroepen), plus twee toevoegingen: Nectarine (dezelfde steenfruit-familie als
       perzik, standaard in tasting notes) en "Steenfruit (algemeen)" als koepelterm — die
       ontbrak, terwijl elke andere fruitcategorie in dit wiel er al een heeft (zie de
       module-comment bovenaan dit wiel over "(algemeen)"-tags: "elke subgroep die
       realistisch als koepelterm voorkomt... krijgt daarom een eigen generieke tag"). Puur
       een herindeling van bestaande tags plus twee nieuwe — geen enkele wijziging aan
       FLAVOR_TAG_HINTS-uitkomsten voor Perzik/Abrikoos/Pruim zelf. */
~~~~

## #189 · regel 6879 · block

Anker: `{t:'Melkchocolade', h:'vol_rond'}`

~~~~text
/* Melkchocolade: HERAUDIT — dit was het grootste gat in het hele wiel. Alleen de
         generieke "Chocolade" en de donkere "Pure chocolade" bestonden, geen melkchocolade-
         specifieke tag, terwijl onafhankelijk onderzoek (Beans with Beanie, data-analyse
         van cupping-notes) caramel/chocolate/dark chocolate/milk chocolate expliciet
         aanwijst als de VIER meest voorkomende smaaktermen in specialty coffee — vaker dan
         welke losse fruit- of bloemnoot dan ook. Milk chocolate wordt specifiek beschreven
         als de romige, minder bittere kant (medium roasts, "syrupy mouthfeel"), tegenover
         Pure chocolade's bitterder/geroosterder karakter — vandaar toch dezelfde vol_rond-
         hint (beide zijn evengoed body/cacao-gedreven), maar een eigen tag omdat de twee in
         de praktijk bewust naast elkaar genoemd worden, nooit als synoniemen. */
~~~~

## #190 · regel 6969 · block

Anker: `const CUPPING_AXES = ['aroma','zuur','zoet','body','bitter','aftersmaak','balans'];`

~~~~text
/* UITGEBREID (expertreview A9, Priya/Q-grader): de radar miste 2 van de 5 kern-categorieën
   van het SCA-cuppingformulier — Aftersmaak en Balans — terwijl juist die twee vaak bepalen
   of een kopje wint of verliest, niet alleen de losse smaakassen. Aftersmaak krijgt, net als
   de bestaande 5 assen, een eigen gewicht per smaakwiel-categorie (zoet/notig/geroosterd/
   specerijen blijven van nature langer hangen dan vluchtige bloemig/fruitig-tonen — eigen
   inschatting, geen gepubliceerde SCA-tabel per categorie, die bestaat niet). Balans wordt
   bewust NIET zo berekend — dat zou een verzonnen gewichtentabel zijn voor iets dat SCA
   juist definieert als de onderlinge verhouding tussen zuur/zoet/body/bitter. Balans is
   daarom een directe toepassing van die eigen SCA-definitie: hoe kleiner de spreiding
   tussen die vier assen, hoe hoger de balans — zie computeCuppingValues() hieronder. */
~~~~

## #191 · regel 6994 · block

Anker: `const CATEGORY_COLOR = {};`

~~~~text
/* NIEUW (Visual Design 2.0 fase 2 — detail-referentiebeelden): kleur per smaakcategorie
   voor individuele smaak-tag-chips op boonkaarten/Bean Detail. Hergebruikt cat.color, dat
   al bestond en al gebruikt werd voor de flavor-wheel-accordeon hierboven — geen nieuwe
   kleurdata, geen classifyProfile-/advieslogica aangeraakt. Vrije tekst uit "Overige
   notities" zit niet in TAG_TO_CATEGORY en krijgt dus terecht geen kleur (neutrale chip). */
~~~~

## #192 · regel 7096 · block

Anker: `const ROAST_SCAN_KEYWORDS = {`

~~~~text
/* NIEUW (Implementatieplan v3.0, P3 §OCR-hardening — "robuustere tekstherkenning"): 'light'
   en 'dark' stonden hier tot nu toe alleen als onderdeel van meerwoordige frasen ('light
   roast', 'dark roast') — en fuzzyMatchesKeyword() matcht meerwoordige termen bewust NOOIT
   fuzzy (te grote kans op een zinloze combinatie van toevallige losse tikfouten, zie
   toelichting daar). Een OCR-fout ergens in zo'n frase (bijv. "Ilght Roast", een klassieke
   I/l-verwarring) kon dus NOOIT via het fuzzy-vangnet alsnog herkend worden — in
   tegenstelling tot medium/washed/natural/honey/anaerobic/filter/espresso/omni, die allemaal
   al een kaal, los woord als vangnet hadden. Deze twee kale woorden geven light/dark
   dezelfde typfouttolerantie als de rest van de lijst, niets meer.
   Objectvolgorde is BEWUST licht_medium/medium_dark vóór light/medium/dark: de matching-
   loop hieronder stopt bij de eerste hit, en "medium" zit al als los woord in de kale
   medium-categorie (dat bestond al, vóór deze wijziging) — zonder de samengestelde
   categorieën eerst te checken zou "medium-dark roast" of "light medium roast" verkeerd als
   het kale medium/light gelezen worden i.p.v. de preciezere samengestelde categorie. Zelfde
   "langste/specifiekste-eerst"-principe als REGION_SCAN_SYNONYMS/VARIETY_SCAN_SYNONYMS
   hieronder al toepassen. */
~~~~

## #193 · regel 7616 · block

Anker: `const NAME_SKIP_RE = /^(roast(ed)?\b|gebrand|branddatum|best before|tht\b|ten minste|origin\b|herkomst|process\b|proces\`

~~~~text
/* NIEUW (audit BC-20): naam en branddatum uit de etikettekst. Pure functies, getest.
   Naam: een lange eerste regel (typisch een geplakte productomschrijving) werd eerder
   helemaal genegeerd, waardoor elke boon "Naamloze boon" heette. Nu het stuk vóór het
   eerste scheidingsteken. Branddatum: alleen met een brand-/roast-woord vlak ervoor op
   dezelfde regel — zo wordt een THT-/best-before-datum nooit als branddatum gelezen. */
~~~~

## #194 · regel 7719 · block

Anker: `const PROFILE_KEYWORDS = {`

~~~~text
/* HERAUDIT (smaakwiel, vrije-tekstveld): 'bloemig'/'floral' stonden hier onder
   fruitig_clean — dat sprak de wiel-hint van diezelfde woorden regelrecht tegen: elke
   florale tag (Kamille/Roos/Jasmijn/Hibiscus/Lavendel/Sinaasappelbloesem/"Bloemig
   (algemeen)") wijst in SCA_FLAVOR_WHEEL naar fresh_clean, niet fruitig_clean. Nu de
   vrije tekst ook tegen de volledige wiel-tags/synoniemen matcht (zie classifyProfile()),
   zou "bloemig"/"floral" typen zonder deze regel zowel fruitig_clean ALS fresh_clean laten
   scoren — tegenstrijdig. Verwijderd i.p.v. het conflict te laten bestaan; het wiel-pad
   dekt deze woorden nu correct af (via 'floral'/'bloemig' in FLAVOR_SCAN_SYNONYMS). */
~~~~

## #195 · regel 7796 · block

Anker: `// BC-06: zelfde strengere smaakmatcher als de OCR-scan (zonder tikfouttolerantie).`

~~~~text
/* HERAUDIT (smaakwiel, vrije-tekstveld): PROFILE_KEYWORDS hierboven is een kleine (~20
     woorden) lijst brede stemmingstermen — een specifieke smaak die iemand typt i.p.v. als
     checkbox aanvinkt (bv. "proeft naar kiwi") telde hierdoor stilzwijgend voor NIETS mee,
     ook al kent het wiel die tag allang. applyParsedTextToForm() (de OCR-scan) deed dit al
     wél correct, tegen de volledige FLAVOR_TAG_HINTS + FLAVOR_SCAN_SYNONYMS (EN/NL) — dit
     past hetzelfde patroon toe op de eigen vrije tekst van classifyProfile(). Tags die al
     via selectedTags zijn aangevinkt tellen hier bewust niet nogmaals mee (voorkomt dubbel
     tellen van hetzelfde signaal). */
~~~~

## #196 · regel 7906 · line

Anker: `const PROFILE_TECHNIQUE_ONLY_KEYS = ['snel_puur', 'bloemig_delicaat', 'sirooprig_vol', 'robuust', 'evenwichtig_flex'];`

~~~~text
// HERAUDIT (SMAAKKARAKTER-sterren): expliciete lijst i.p.v. impliciet uit classifyProfile()
// afgeleid, zodat renderAdviceChips() weet welke knoppen sowieso nooit een echte score
// kunnen krijgen en dus geen (onzichtbare, want 0/5) sterrenrij moet tonen.
~~~~

## #197 · regel 7915 · block

Anker: `const PROFILE_NEAR_TIE_MARGIN = 1;`

~~~~text
/* HERAUDIT (bijna-gelijke-stand): classifyProfile() koos voorheen altijd stilzwijgend de
   hoogste score als winnaar, ook wanneer een tweede profiel er vlak achteraan kwam (bv.
   score 3 tegen 2) — zo'n verschil kan van één enkele smaaktag afhangen. PROFILE_NEAR_TIE_
   MARGIN=1 (het effect van precies één tag) is de grens: bij een groter verschil is er een
   duidelijke winnaar; bij een marge van 0 (exacte gelijke stand, de bestaande B1-situatie)
   of 1 zijn beide kandidaten realistisch. Alleen kandidaten met score > 0 tellen mee — een
   0-score is nooit een serieuze kandidaat, ook niet als de winnaar zelf laag scoort. Geeft
   de kandidaten (aflopend gesorteerd) terug bij een echte bijna-gelijke stand (≥2 profielen
   binnen de marge), anders null — dan is er gewoon een duidelijke winnaar zoals voorheen. */
~~~~

## #198 · regel 8008 · line

Anker: `beanLibrary = [];`

~~~~text
// FIX (Pagina-Polish-spec §4.3 "Geen seeddata alleen om de UI gevuld te laten
      // lijken"): een écht nieuwe gebruiker (nog nooit iets opgeslagen — raw is null) kreeg
      // hier voorheen buildSeedBeans() te zien, alsof het z'n eigen bonen waren. Een genuine
      // eerste-gebruik is voortaan een echte lege staat. buildSeedBeans() blijft wél bestaan
      // en wordt hieronder in de catch nog gebruikt als crash-herstel bij corrupte/onleesbare
      // opslag — dat is een bewust geteste, aparte situatie (zie adversarial-robustness.test.mjs
      // "corrupte localStorage bij opstart crasht de app niet"), geen normale lege staat.
~~~~

## #199 · regel 8043 · line

Anker: `let beanFilterMode = 'alle';`

~~~~text
// NIEUW (Pagina-Polish-spec §4.1, filterchips "Alle/Favorieten/Recent"): 'alle' = geen extra
// filter (behoudt beanSortMode zoals ingesteld), 'favorieten' filtert op het bestaande
// bean.favorite-veld, 'recent' zet beanSortMode terug naar 'recent' — hergebruikt dus puur
// bestaande sort-/filterdata, geen nieuwe logica.
~~~~

## #200 · regel 8079 · line

Anker: `const favCount = beanLibrary.filter(b=>b.favorite).length;`

~~~~text
// NIEUW (visuele afstemming referentiebeeld Bonen-scherm "Alle (12) / Favorieten (4)"):
  // aantallen bij de eerste twee chips — puur .length van bestaande arrays, geen nieuwe
  // telling/logica. "Recent" blijft zonder aantal (het is een sortering, geen deelverzameling).
~~~~

## #201 · regel 8105 · line

Anker: `const backupHintEl = document.getElementById('bean-empty-backup-hint');`

~~~~text
// HERZIEN (visuele afstemming referentiebeeld Bonen-scherm): de "+ Nieuwe boon"-pil
  // blijft nu ook zichtbaar bij een gevulde bibliotheek (naast de header-camera-knop) —
  // alleen de backup-hint blijft lege-staat-only, die is alleen voor een gloednieuwe
  // gebruiker relevant.
~~~~

## #202 · regel 8123 · line

Anker: `const freshDays = daysSinceRoast(b.roastDate);`

~~~~text
// NIEUW (vervolgplan v2.3, Fase 4 — Bouwbesluit B5): versheids-/voorraadbadge via het
    // ene gedeelde badge-component, i.p.v. losse gekleurde tekst. --berry i.p.v. --danger
    // voor "Bijna op" (bevinding: --danger leest als foutmelding, geen attentiesignaal).
~~~~

## #203 · regel 8138 · line

Anker: `const processRoastLine = [procName, r.name].filter(Boolean).join(' · ') + (b.experimental ? ' · 🧪 experimenteel' : '');`

~~~~text
// NIEUW (Pagina-Polish-spec §4.2): tweede regel wordt "Process · Roast" i.p.v. herkomst
    // (land/regio/hoogte) — die blijft volledig beschikbaar op Bean Detail (één tik verder),
    // hier gaat het om scanbaarheid. Experimenteel-markering hangt hier aan vast i.p.v. een
    // eigen chip-rij (die rij, incl. het profiel-chipje, is komen te vervallen — het profiel
    // blijft af te lezen aan de gekleurde smaak-tags eronder).
~~~~

## #204 · regel 8152 · html

Anker: `<div class="photo-slot photo-slot--strip" data-has-photo="true" aria-hidden="true">`

~~~~text
<!-- NIEUW (Visual Design 2.0 fase 2, detail-referentie schermen 03/11): een kleine
             foto-thumbnail per boonkaart, zoals de referentie toont. Bewust de bestaande,
             gedeelde placeholder-foto (geen per-boon-fotostorage — dat zou een nieuwe
             feature zijn: fotografie-upload/opslag per boon, niet gevraagd) — hetzelfde
             "neutraal vlak i.p.v. verzonnen specificiteit"-principe als elders (Bouwbesluit B6). -->
~~~~

## #205 · regel 8194 · line

Anker: `el.querySelectorAll('.bean-card[data-open-detail]').forEach(card=>{`

~~~~text
// NIEUW (Fase 5 — Bean Detail, Bouwbesluit "Bean Detail — ingang"): tik op de kaart zelf
  // (buiten de actieknoppen, die hierboven al stopPropagation() doen) opent het read-only
  // Bean Detail-scherm. Toetsenbord-equivalent (Enter/Spatie) voor wie niet met een muis/
  // touch navigeert. Review R-21: de kaart was zelf een knop mét knoppen erin (verwarrend voor
  // een schermlezer); nu is de boonnaam de echte knop en vangt de kaart alleen de tik eromheen.
~~~~

## #206 · regel 8204 · block

Anker: `function renderHomeScreen(){`

~~~~text
/* ============================================================
   NIEUW (vervolgplan v2.3, Fase 5) — HOME
   Nieuwe standaardbestemming bij het openen van de app. Leeg-eerst ontworpen
   (zelfde principe als Inzichten): een nieuwe gebruiker zonder bonen/loggings
   ziet een eerlijke lege staat, geen verzonnen aanbevelingen. Foto-klaar
   (Bouwbesluit B6) — de hero toont sinds Fase 7 photos/home-hero.webp. De bonenstrip
   hieronder toont per boon de branding-foto van zijn brandingsgraad (beanPhotoSrc());
   er is nog geen fotografie per boon/oorsprong zelf.
   ============================================================ */
~~~~

## #207 · regel 8351 · block

Anker: `const MIN_TREND_N = 5;`

~~~~text
/* ============================================================
   NIEUW (vervolgplan v2.3, Fase 5) — INZICHTEN
   Leeg-eerst (Data Scientist-bevinding §07/§26): geen trendlijn onder een
   minimale n (MIN_TREND_N), geen chart-bibliotheek deze ronde — pure,
   eerlijke tellingen + hergebruik van personalHistoryInsight() (bestaand,
   noemt n al expliciet) voor de meest recent gebrouwen boon met genoeg
   loggings. Aggregeert bewust NIET stilzwijgend over waterhardheid heen
   (Water Chemistry Expert-bevinding): het persoonlijk signaal hieronder is
   altijd per boon, nooit een cross-boon gemiddelde.
   ============================================================ */
~~~~

## #208 · regel 8362 · line

Anker: `function renderAdviceOutcomeSection(st){`

~~~~text
// NIEUW (Brew Intelligence v2, slagboom na Fase 4) — zie adviceOutcomeStats(). Alleen
// tellen en eerlijk benoemen; stuurt niets aan.
~~~~

## #209 · regel 8401 · line

Anker: `function renderRoasterOverview(){`

~~~~text
// NIEUW (Visual Design 2.0 fase 2, Geschiedenis-tabs): optionele targetId-parameter zodat
// dezelfde functie/tellingen ook in de nieuwe "Statistieken"-tab (Geschiedenis-scherm)
// kunnen renderen, i.p.v. een tweede kopie van deze functie te onderhouden. Het losse
// Inzichten-scherm is vervallen; #history-stats-body is nu het enige doel.
// Idee 7: "Per brander" onder Statistieken — alleen branders met gezette koppen.
~~~~

## #210 · regel 8472 · block

Anker: `let beanDetailId = null;`

~~~~text
/* ============================================================
   NIEUW (vervolgplan v2.3, Fase 5) — BEAN DETAIL
   Read-only overzicht van één boon, geopend vanaf een boonkaart. Vervangt
   geen functionaliteit: "Bewerken" gaat naar exact hetzelfde formulier
   (editBean(), ongewijzigd), "Zet deze boon →" naar exact dezelfde advies-
   flow (useBeanForAdvice(), ongewijzigd). Hergebruikt de bestaande cupping-
   radar-geometrie (RADAR_CENTER/radarPoint/CUPPING_AXES, verderop in dit
   bestand — Bouwbesluit B3, geen tweede radar met andere assen) voor het
   gemiddelde smaakprofiel uit brewLog, i.p.v. renderFlavorRadar() zelf aan
   te passen (die blijft ongewijzigd voor het boonformulier).
   ============================================================ */
~~~~

## #211 · regel 8484 · line

Anker: `function selectDetailTab(tabsId, key){`

~~~~text
// NIEUW (Visual Design 2.0 fase 2, Bean Detail-tabs): kleine, generieke tab-wissel-helper —
// zoekt panelen als siblings van de tab-knoppenrij, dus herbruikbaar voor elke toekomstige
// tabbed sectie zonder aanpassing. Puur zichtbaarheid, geen databron aangeraakt.
~~~~

## #212 · regel 8508 · line

Anker: `const FACT_ROW_ICONS = {`

~~~~text
// NIEUW (visuele afstemming referentiebeeld Boon Detail "Boon details"): één klein
// line-icoon per bestaand feit-label — puur decoratief, geen nieuwe data. _default vangt
// elk toekomstig fact-label op zonder dat de rij zonder icoon komt te staan.
~~~~

## #213 · regel 8556 · line

Anker: `const aboutParts = [];`

~~~~text
// NIEUW (Visual Design 2.0 fase 2, "Over"-tab): een samenvattende zin, volledig
  // opgebouwd uit al bestaande, door de gebruiker ingevulde velden — geen enkel nieuw
  // feit verzonnen (geen "Oogst"/"Brander" o.i.d. die niet in het boonformulier bestaan).
~~~~

## #214 · regel 8568 · line

Anker: `const facts = [`

~~~~text
// NIEUW (Visual Design 2.0 fase 3): Herkomst- en Details-feiten samengevoegd in één grid
  // op de Overzicht-tab (de losse Herkomst/Details-tabs zijn vervangen door Historie/
  // Recepten) — zelfde labels/waarden/volgorde als voorheen, alleen niet meer verdeeld
  // over twee tabs.
  // NIEUW (visuele afstemming referentiebeeld): klein icoon per feit — puur decoratief,
  // labels/waarden/volgorde ongewijzigd. FACT_ROW_ICONS staat hieronder in het script.
~~~~

## #215 · regel 8605 · line

Anker: `function renderBeanDetailPersonalSignal(beanId){`

~~~~text
// NIEUW (Pagina-Polish-spec §5.5 "Personal signal"): hergebruikt personalHistoryInsight()
// (bestaand, ongewijzigd — al gebruikt op het Recept-scherm en in Inzichten) 1-op-1, inclusief
// dezelfde formulering-stijl ("puur een feit uit je eigen data") als op het Recept-scherm.
// Geen cross-boon-vergelijking (de functie is al beanId-scoped), geen "hoge/lage
// betrouwbaarheid"-taal zoals bij de engine-adviezen — dit is nooit meer dan een simpel feit.
~~~~

## #216 · regel 8621 · line

Anker: `/* Expertreview idee 5: drinkvenster per zak. Bewust de bestaande versheidstabel (FRESHNESS_TIERS):`

~~~~text
// HERZIEN (Pagina-Polish-spec §5.4 "Best Brew / Latest Brew"): vervangt de eerdere honest-
// variant (favoriet-of-anders-statistieken) door de precieze regels uit de spec — nog steeds
// bewust GEEN samengesteld/verzonnen sterrencijfer (Bouwbesluit B2), maar nu met exacte
// labels per situatie i.p.v. een eigen tussenoplossing:
//   0 relevante logs      → geen kaart.
//   1 relevante log       → 'Laatste gelogde brouwsel'.
//   meerdere, met favoriet→ 'Beste startpunt uit je brouwsels' — de ENIGE transparante
//                           selectie zonder een score te verzinnen is de hartje-markering
//                           die de gebruiker zelf al zette; zonder favoriet is er bij
//                           meerdere logs geen eerlijke manier om er één te kiezen, dus dan
//                           geen kaart (spec: "alleen wanneer een transparante selectie kan
//                           worden gemaakt").
// method/dose/water/temp/grind/time komen 1-op-1 uit het gekozen logging-record, nooit
// herberekend. CTA's hergebruiken de bestaande brewAgain()/tab-navigatie, geen nieuwe flow.
~~~~

## #217 · regel 8796 · line

Anker: `function renderBeanDetailHistoryTab(beanId){`

~~~~text
// NIEUW (Visual Design 2.0 fase 3, Historie-tab): volledige brouwgeschiedenis van déze boon,
// nu inline getoond i.p.v. via een losse knop naar #screen-brewlog-history — hergebruikt
// dezelfde renderBrewLogEntryCard() als het Historie-scherm, dus identieke kaart/hartje.
~~~~

## #218 · regel 8813 · line

Anker: `function renderBeanDetailRecipesTab(beanId){`

~~~~text
// NIEUW (Visual Design 2.0 fase 3, Recepten-tab): de recepten die je met déze boon al hebt
// gezet — één kaart per gebruikte methode, met de meest recente werkelijke receptwaarden
// voor die methode. Puur een groepering van bestaande brewLog-velden (geen nieuwe advies-
// berekening, geen live aanroep van de advisor-engine).
~~~~

## #219 · regel 8896 · block

Anker: `/* 3 -> 4 (Reparatieplan v4.0, C-2 / bevinding E-11): elke logging draagt voortaan een`

~~~~text
/* FIX (teamreview v2 — Midden bevinding, Backend/Database Engineer): individuele
   boon- en logboekrecords hadden geen eigen schemaversie, terwijl de backup-payload
   er al wél één had (backupVersion). Zonder dit veld is er geen migratiepad als een
   toekomstige release een boon-/logveld hernoemt of van vorm verandert — de engine se
   eigen PersonalObservationStore (elders in dit project, niet in deze bundle) doet dit
   al zorgvuldig, deze app-laag nu ook. Nieuwe records krijgen dit veld vanaf v2; oudere,
   via import binnengehaalde records zonder dit veld blijven gewoon werken (nergens leest
   deze v2-build het veld om te migreren — dat is bewust: het is een fundament voor een
   toekomstige migratie, geen migratie die vandaag al nodig is).

   OPGEHOOGD naar 2 (Implementatieplan Zetadvies v3.0, Fase 5): saveBrewLogEntry() slaat nu
   extra velden op (doseG, ratioText, actualGrindClicks, actualTimeSec, cupWeightG,
   waterProfileSnapshot) die schemaVersion-1-records niet hebben. Bestaande records worden
   BEWUST niet geconverteerd of aangevuld bij het laden — ontbrekende velden blijven
   ontbrekend en tellen nergens (bijv. een retentieberekening) als nul mee. Dit is dus geen
   "migratie" in de klassieke zin, alleen een versiemarkering op nieuw geschreven records;
   zie tests/brewconsole.pure-logic.test.mjs voor de bijbehorende migratie-/back-uptest.

   OPGEHOOGD naar 3 (Implementatieplan Zetadvies v3.0, Fase 7): twee nieuwe velden —
   `approved` (bool, standaard false: heeft de gebruiker dit brouwsel expliciet als geslaagd
   gemarkeerd? vervuilingsregel 1 van het boontype-model) en `grindStartingPoint` (het
   "vertrekpunt"-klikgetal uit Fase 2, nodig als basiswaarde voor de leercorrectie omdat
   grindStand voor dit toestel/deze molen vandaag vrijwel altijd null is — zie
   recipeGrindBaseline()). Zelfde discipline als bij v1→v2: oudere records blijven
   ongewijzigd, `approved` ontbreekt dus simpelweg (en telt daardoor terecht NOOIT mee als
   "goedgekeurd" — een ontbrekend veld is geen stilzwijgende `true`). */
~~~~

## #220 · regel 8929 · line

Anker: `const RECORD_SCHEMA_VERSION = 5;`

~~~~text
// BIJGEWERKT (Implementatieplan Bypass v1.0, Fase B, BP-5): 4→5 — nieuwe, additieve
// bypass-velden op elke logging (zie saveBrewLogEntry()). Zelfde discipline als elke
// eerdere schemaversie-ophoging: ontbrekende velden op oudere records blijven gewoon
// null, niets wordt met terugwerkende kracht aangevuld of geraden.
// Fase 1 (Brew Intelligence v2): brouwsels hebben sindsdien hun eigen v6-record (zie
// BREW_RECORD_SCHEMA_VERSION); deze versie markeert vanaf nu alleen nog boonrecords.
~~~~

## #221 · regel 8946 · block

Anker: `const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';`

~~~~text
/* FIX (teamreview v2 — Midden bevinding, Backend/Database Engineer): tot v2 exporteerde
     de backup alléén beans/brewLog — theme- en waterhardheid-voorkeuren gingen bij een
     restore op een nieuw toestel stilzwijgend verloren, terwijl de code elders (loadTheme/
     loadWaterHardness) expliciet zegt dat die "onthouden" horen te blijven. backupVersion
     gaat naar 2 voor deze uitbreiding van de payload-vorm (individuele bean-/log-records
     krijgen hun EIGEN schemaVersion-veld, zie RECORD_SCHEMA_VERSION hieronder bij de
     bean-/log-aanmaak — dat is een apart, fijnmaziger versienummer dan dit backupVersion). */
~~~~

## #222 · regel 9128 · block

Anker: `let prefsMsg = '';`

~~~~text
/* FIX (teamreview v2 — Midden bevinding, Backend/Database Engineer): backupVersion 2
       kan theme/waterHardnessMgL bevatten (zie exportBackup hierboven) — een oudere
       backupVersion-1-export heeft deze velden simpelweg niet, dan verandert er niets. */
~~~~

## #223 · regel 9137 · line

Anker: `if (Array.isArray(data.abTrials)){`

~~~~text
// FIX (Implementatieplan Zetadvies v3.0, Fase 4-persistentie-eis): waterAlkalinity/
    // waterDilution zijn nieuwe velden (backupVersion 2, na deze wijziging) — een oudere
    // backup heeft ze simpelweg niet, en de optionele checks hieronder laten die default
    // dan gewoon staan i.p.v. te crashen op een ontbrekend veld.
    // BC-10: blinde proeven samenvoegen op id (bestaande blijven staan).
~~~~

## #224 · regel 9191 · line

Anker: `function toggleBeanFavorite(id){`

~~~~text
// NIEUW (Visual Design 2.0 fase 3, boon-niveau favorieten): losstaand van de bestaande
// brewlog-entry-favorieten (toggleBrewLogFavorite) — dit is een boolean op de boon zelf,
// zichtbaar als hartje op de boonkaart en op de Bean Detail hero-foto. Zelfde opslagpad als
// elke andere boonwijziging (saveBeansToStorage()).
~~~~

## #225 · regel 9329 · line

Anker: `function applyBrewEvent(rec, type, nowMs, payload){`

~~~~text
// Pure overgang: geeft {ok, rec} terug met een NIEUW record; het origineel blijft ongemoeid.
// Levenscyclus-gebeurtenissen volgen BREW_TRANSITIONS; de overige (pause, resume,
// schedule_end, recovered) mogen alleen tijdens het brouwen.
~~~~

## #226 · regel 9620 · block

Anker: `const AB_TRIALS_KEY = 'brewconsole_ab_trials';`

~~~~text
/* NIEUW (audit BC-10 / open vraag D-1): "Helder & fris" zou volgens de Brewing Control
   Chart (Guinard e.a. 2023) eerder om een lagere STERKTE vragen dan om minder extractie.
   Dat verandert elk recept, dus eerst blind proeven op je eigen bonen: controle = het
   recept zoals het is, variant = AB_LIGHTER_STEP lager (een halve stap, ~4% minder koffie, zelfde
   maling en water; eerst een hele stap, ~8%). Pas als de variant duidelijk wint, kun je hem zelf
   aanzetten — nooit vanzelf. */
~~~~

## #227 · regel 10179 · block

Anker: `function beanSnapshotOf(b){`

~~~~text
/* NIEUW (na de update-controle): de oude app-versie koppelde brouwsels via het advies soms
   aan geen of aan de verkeerde boon (audit BC-01, sinds Phase 0 opgelost). De migratie nam
   dat trouw over. Dit wijst alleen die oude brouwsels aan die verdacht zijn — zonder boon,
   of met een branding die niet bij de gekoppelde boon past — en laat de gebruiker kiezen.
   Er wordt nooit iets vanzelf veranderd. */
~~~~

## #228 · regel 10468 · line

Anker: `const cupWeightEl = document.getElementById('brewlog-cup-weight');`

~~~~text
// NIEUW (Fase 5): draaft leegmaken bij elke nieuwe logging — anders blijft een eerder
  // ingevuld kopgewicht per ongeluk staan voor een heel ander brouwsel.
~~~~

## #229 · regel 10472 · line

Anker: `const bypassActualBlock = document.getElementById('brewlog-bypass-actual-block');`

~~~~text
// NIEUW (Implementatieplan Bypass v1.0, Fase B/C, BP-5/"proef-en-vul"): alleen zichtbaar
  // als dít brouwsel met bypass gezet is; voorgevuld met het geplande bedrag (rec.bypassMl)
  // zodat "niets aanpassen" betekent "precies volgens plan", niet "leeg/onbekend".
~~~~

## #230 · regel 10498 · line

Anker: `const metaEl = document.getElementById('brewlog-complete-meta');`

~~~~text
// FIX (v2.2 kernflow): "Klaar"-samenvattingsregel (dosis · tijd · methode), zoals de
  // visuele schets (BrewComplete.dc.html) toont onder de "Klaar!"-titel.
~~~~

## #231 · regel 10712 · line

Anker: `function activeBedDrySec(){`

~~~~text
// NIEUW (vervolgplan v2.3, Bouwbesluit B2): vervangt de 88-score-ring. Geen verzonnen
// kwaliteitscijfer — puur wat al écht bekend is uit dít brouwsel (tijd t.o.v. het eigen
// recepttarget, het kernrecept-ratio, het temperatuurbereik), in dezelfde eerlijke toon
// als de rest van de app (RESEARCH_GAP/UNKNOWN i.p.v. schijnprecisie).
// Fase 2: de gemeten bed-droog-tijd van het actieve record (null = niet vastgelegd).
~~~~

## #232 · regel 10742 · line

Anker: `const bypassRatioLine = (state.bypass && rec.pourWaterMl != null && rec.bypassMl != null && rec.dose > 0)`

~~~~text
// NIEUW (Implementatieplan Bypass v1.0, Fase B, BP-5 punt 5): bij bypass klopt de
  // kernrecept-ratio hierboven pas ná het bijschenken — het Klaar-scherm toonde tot nu toe
  // geen enkel getal over de daadwerkelijke brewer-ratio (Gate-0-bevinding "Klaar-scherm").
~~~~

## #233 · regel 10749 · line

Anker: `let diagnosticLine = '';`

~~~~text
// NIEUW (Implementatieplan Zetadvies v3.0, Fase 3c/D-4): de controle-achteraf die
  // contactTimeGuidance altijd al bedoelde te zijn ("Monitored diagnostic, never a
  // target", brewers.ts) — losstaand van de recepttarget-vergelijking hierboven, die nu
  // uit de giet-structuur zelf komt (buildPourSchedule()), niet meer uit deze band.
  // FIX (Reparatieplan v4.0, B-2a / bevinding E-03): de band werd toegepast op de
  // werkelijke tijd zonder te controleren of het VOORGESCHREVEN schema er zelf in valt.
  // Op Chemex valt geen enkel schema in de band (100-175s tegen 240-300s), op V60 vallen
  // snel_puur (100s) en robuust (220s) erbuiten. De app zette de timer en gaf de gebruiker
  // daarna de schuld van zijn eigen advies. De band blijft precies wat de registry hem
  // noemt — een monitored diagnostic — maar wordt alleen nog als controle gebruikt wanneer
  // hij voor dit schema uberhaupt een zinvolle controle IS.
~~~~

## #234 · regel 10761 · line

Anker: `if (state.bypass){`

~~~~text
// FIX (Implementatieplan Bypass v1.0, Fase B, BP-5 punt 5): de diagnostische band is
  // afgeleid voor een zetting met het volledige watervolume door het bed — bij bypass gaat
  // er minder water door het bed dan die band veronderstelt, dus een in/buiten-oordeel zou
  // hier iets beweren dat niet onderbouwd is. Kanttekening in plaats van een oordeel.
~~~~

## #235 · regel 10789 · line

Anker: `function readOptionalNumberInput(id){`

~~~~text
// NIEUW (Implementatieplan Zetadvies v3.0, Fase 5): las een optioneel numeriek invoerveld
// als getal, of null als het leeg/ongeldig is — NOOIT 0 voor een leeg veld. Fase 5 eist
// expliciet dat ontbrekende velden ontbrekend blijven en nergens als nul meetellen (dat zou
// bijv. een retentieberekening (water-kopgewicht)/dosis stiekem laten kloppen op een niet-
// ingevuld kopgewicht).
~~~~

## #236 · regel 10905 · line

Anker: `function renderBrewLogEntryCard(e, beanId){`

~~~~text
// NIEUW (Visual Design 2.0 fase 2, Geschiedenis-tabs): het per-entry-kaartje uit
// renderBrewLogHistory() hieronder losgetrokken naar een eigen functie, zodat zowel de
// "Alle"- als de "Favorieten"-lijst exact dezelfde kaart-opmaak delen i.p.v. gedupliceerde
// HTML. Inhoud/velden 100% ongewijzigd t.o.v. de oorspronkelijke inline versie — alleen
// een nieuwe hartje-toggle (data-fav-toggle) toegevoegd.
~~~~

## #237 · regel 10927 · line

Anker: `const actualBits = [];`

~~~~text
// NIEUW (Implementatieplan Zetadvies v3.0, Fase 5): schemaVersion-2-velden, alleen
  // getoond als ze er zijn — oudere (schemaVersion 1) loggingen missen deze simpelweg en
  // laten deze regel dus helemaal weg, i.p.v. een "–" of 0 te tonen (ontbrekend blijft
  // ontbrekend, zie RECORD_SCHEMA_VERSION-toelichting hierboven in het bestand).
~~~~

## #238 · regel 10939 · line

Anker: `if (e.approved === true) actualBits.push(e.tasting ? '✓ geslaagde kop (telt mee om te leren)' : '✓ goedgekeurd (telt mee`

~~~~text
// NIEUW (Fase 7): alleen tonen als het veld bestaat (schemaVersion 3+) — geen "nee"
  // verzinnen voor oudere loggingen die dit onderscheid nog niet konden maken.
~~~~

## #239 · regel 10944 · line

Anker: `const suggestionHtml = e.suggestion`

~~~~text
// NIEUW (Implementatieplan Zetadvies v3.0, Fase 6): het bewaarde voorstel bij déze
  // logging, altijd expliciet als "Hypothese" gelabeld (randvoorwaarde: nooit als
  // bewezen correctie tonen) — ontbreekt gewoon als er geen patroon matchte.
~~~~

## #240 · regel 10969 · line

Anker: `function wireFavToggleButtons(container){`

~~~~text
// NIEUW (Visual Design 2.0 fase 2/3): gedeelde hartje-bekabeling voor elke plek waar
// renderBrewLogEntryCard() wordt gebruikt (Historie-scherm, Bean Detail Historie-tab,
// Bean Detail beste-brew-kaart) — scoped op de container i.p.v. een globale
// document.querySelectorAll, zodat herhaalde renders geen dubbele listeners op elkaars
// kaarten stapelen.
~~~~

## #241 · regel 11015 · line

Anker: `function toggleBrewLogFavorite(id){`

~~~~text
// FIX (Visual Design 2.0 fase 3): deze functie riep voorheen altijd renderBrewLogHistory()
// aan, die op zijn beurt altijd showScreen('brewlog-history') deed — dus een tik op het
// hartje in de nieuwe Bean Detail-tabs navigeerde per ongeluk weg naar het Historie-scherm.
// Ververst nu alleen de al-opgebouwde weergaven waarin deze logging kan voorkomen, zonder
// een schermwissel te forceren.
~~~~

## #242 · regel 11210 · line

Anker: `historyBeanIdShown = beanId || null;`

~~~~text
// NIEUW (vervolgplan v2.3, Fase 5 — Historie als bestemming): tot nu toe werd deze
  // functie alleen met een concrete beanId aangeroepen (vanaf een boonkaart); een leeg/
  // undefined beanId toont voortaan ALLE loggings, zodat #screen-brewlog-history ook als
  // top-level "Historie"-tab in de navigatiebalk kan dienen — zonder de bestaande per-boon
  // aanroepen (vanaf de boonkaart/Bean Detail) op enige manier te wijzigen.
~~~~

## #243 · regel 11244 · block

Anker: `function personalHistoryInsight(beanId){`

~~~~text
/* FIX (teamreview v2 — Hoog bevinding, Data Scientist/Software Architect: "verzamel-
   mechanisme zonder gebruik"): het Brouwlogboek verzamelt sinds v1 al trouw een 7-assige
   cupping-score per brouwsel, maar niets in deze build las die data ooit terug — een reëel
   risico dat gebruikers braaf blijven loggen zonder ooit iets terug te krijgen.

   EXPLICIETE SCOPE-BESLISSING (Brainstorm B/D, plenaire Spanning 3 "motor vs. koetswerk"):
   de volledige Personal Signal-machine — sample-size-/recency-/context-match-weging, zoals
   uitgebreid getest in test-report-scenario-walkthrough.md §16-20 — bestaat al in dit
   project se TypeScript-engine, maar zit NIET in de window.BrewEngineBundle die in dit
   bestand is ingebouwd (zie de Software Architect-bevinding in het teamreview-rapport).
   Die volledige laag alsnog aankoppelen is een bewust UITGESTELDE Fase-2-beslissing, geen
   dode hoek: het vergt óf een nieuwe build van de bundel met die modules erin, óf een
   herbouw van die logica op app-niveau — allebei te groot voor deze iteratie, en zonder
   de eigenaarschapscontrole die het rode team al op de eigenlijke engine-versie afdwong
   (C1/C2 in red-team-review-brew-intelligence-engine.md) zou een app-laag-kopie een stap
   terug in beveiliging zijn.

   Wat v2 WEL doet — de "eerste, kleine stap" uit Brainstorm B/D: een pure, lokale
   vergelijking van je nieuwste logging voor een boon met je eigen eerdere gemiddelde voor
   diezelfde boon. Geen nieuwe infrastructuur, geen voorspelling, geen aanpassing van het
   recept — puur een feit uit je eigen data, plus een verwijzing naar de bestaande Triage-
   checklist (al in de app) om zelf uit te zoeken wat er anders was. Bewust GEEN pasklare
   "verlaag de klik met 2"-advies: dit project se hele identiteit is dat het nooit een
   aanbeveling doet zonder evidence-onderbouwing, en een ad-hoc axis-naar-aanpassing-
   tabel op app-niveau zou precies dat principe schenden. */
~~~~

## #244 · regel 11301 · block

Anker: `function roastBucketFor(roastKey){`

~~~~text
/* ============================================================
   NIEUW (Implementatieplan Zetadvies v3.0, Fase 7) — "Het boontype-model": een correctie
   die zich niet aan één boon bindt maar aan een emmertje (branddiepte-bucket ×
   verwerkings-bucket × methode), zodat hij overdraagbaar is naar een zak die nog nooit
   gekocht is. Wat hier wordt opgeslagen/berekend is de CORRECTIE (gemiddeld X klikken
   fijner/grover dan het vertrekpunt), nooit het recept zelf — dit past dus geen enkel
   receptveld automatisch aan, net zoals het advies uit de proefkaart (recommendNext()) dat
   ook niet doet, en om dezelfde reden (project-identiteit: nooit een aanbeveling die zichzelf als
   bewezen presenteert zonder dat de gebruiker het zelf toetst).

   "Vertrekpunt": de plantekst ("gemiddeld twee klikken fijner dan het vertrekpunt")
   verwijst naar hetzelfde begrip als Bouwbesluit B-2/grindStartingPoint (het "vertrekpunt"-
   presentatieniveau uit Fase 2) — NIET naar grindStand. grindStand komt alleen uit een
   HIGH/MEDIUM-confidence Setting Translator-resolutie, en die geeft vandaag voor élke molen
   in deze bundel INSUFFICIENT (zie de bestaande code-comment bij de Setting Translator) —
   grindStand is dus in de praktijk vrijwel altijd null. recipeGrindBaseline() gebruikt
   daarom grindStand ALS die er is, en valt anders terug op grindStartingPoint — zodat de
   correctie ook werkt met de data die dit toestel/deze molen vandaag daadwerkelijk oplevert.

   Vervuilingsregel 1 (alleen goedgekeurde brouwsels tellen mee): vereist een nieuw
   entry.approved-veld — bestond nog niet, zie de nieuwe checkbox op het Klaar-scherm en
   RECORD_SCHEMA_VERSION 2→3 hieronder bij saveBrewLogEntry(). Bewust standaard UIT: een
   bewust mislukte testkop mag nooit per ongeluk meetellen.

   Vervuilingsregel 2 (espressoroasts): dit is een filter-only app (alleen V60/Chemex) —
   een aparte "espresso-emmertje"-pijplijn zou complexiteit toevoegen voor een emmertje dat
   hier per definitie zelden vult. Scope-beslissing: espresso-bedoelde bonen (bean.intendedUse
   === 'espresso') worden volledig UITGESLOTEN van elke correctie (nooit een eigen emmertje),
   vastgelegd in Bouwbesluiten_v3.md.

   Vervuilingsregel 3 / B-7 (waterprofielwijziging sluit het segment af): matchesWaterProfile()
   vergelijkt de bewaarde waterProfileSnapshot van een logging (Fase 5) met het HUIDIGE
   profiel — zodra de gebruiker één waterveld wijzigt, matchen oudere loggingen niet meer en
   telt het huidige segment vanzelf weer vanaf n=0, zonder dat er een apart "segment-ID"
   hoeft te bestaan. Een schemaVersion-1/2-logging zonder waterProfileSnapshot (van vóór
   Fase 5) matcht per definitie nooit — eerlijker dan een niet-geverifieerde match aannemen.

   Puur, expliciet-geparametriseerd t.o.v. het waterprofiel (currentProfile als argument,
   i.p.v. de module-brede waterHardnessMgL/waterAlkalinity/waterDilution rechtstreeks te
   lezen) zodat dit stuk apart, deterministisch testbaar is — zie tests/brewconsole.pure-
   logic.test.mjs. brewLog/beanLibrary blijven wél rechtstreeks gelezen, net als bij
   personalHistoryInsight() hierboven — dat is het bestaande patroon in dit bestand.
   ============================================================ */
~~~~

## #245 · regel 11363 · block

Anker: `const LEARNING_VOLUME_TOLERANCE = 0.4;`

~~~~text
/* NIEUW (Reparatieplan v4.0, C-3 / bevinding E-12): een leercorrectie mag alleen brouwsels
   van vergelijkbaar formaat middelen — bij 265 ml en 380 ml op een V60 verschilt de
   dosis ~40% (de beddiepte, in een kegel ∝ dosis^(1/3), ~13%) en beweegt de optimale
   maalgraad mee. Bewust GEEN nieuw getal verzonnen:
   dit is dezelfde 40% die de engine zelf al hanteert als "is dit nog hetzelfde formaat"
   (SIZE_CONSISTENCY_TOLERANCE in ranking.ts, niet geexporteerd — vandaar de kopie hier,
   met deze verwijzing als enige rechtvaardiging). */
~~~~

## #246 · regel 11420 · block

Anker: `function entryIsEspressoRoast(entry){`

~~~~text
/* FIX (Reparatieplan v4.0, C-2 / bevinding E-11): lees bij voorkeur de momentopname die
   bij de logging zelf hoort (schemaVersion 4+). Alleen als die ontbreekt — records van
   vóór C-2 — valt dit terug op de live boon-opzoeking. Die terugval is bewust: hij houdt
   het gedrag op bestaande data exact zoals het vandaag is, i.p.v. oude loggingen stil uit
   het model te laten vallen. */
~~~~

## #247 · regel 11436 · line

Anker: `function learningEligibleEntries(method, currentProfile, currentVolumeMl){`

~~~~text
// FIX (Implementatieplan Bypass v1.0, Fase B, BP-4, besloten): vervuilingsregel 4 — een
// bypass-brouwsel gebruikt bewust minder water door het bed dan de normale zetting waar
// deze correctie voor bedoeld is (zie de bypassNote-toelichting in computeRecipe()); mee
// laten tellen zou de normale maalcorrectie ongemerkt laten meebewegen met een heel andere
// techniek. Geldt voor ELK bypass-record, ook oude bypass:true-loggingen van vóór deze
// wijziging (die hadden vóór audit H7 zelfs een procesafhankelijk percentage, 25-37,5%,
// niet meer te reconstrueren) — net zo min mag daarvan meegeteld worden.
~~~~

## #248 · regel 11462 · line

Anker: `const volumes = entries.map(e => e.waterMl).filter(v => v != null);`

~~~~text
// NIEUW (Reparatieplan v4.0, C-3): het volumebereik waarop deze correctie daadwerkelijk
  // gemeten is — zodat de tekst zelf toont dat dit binnen de LEARNING_VOLUME_TOLERANCE-band
  // valt, in plaats van dat alleen stilzwijgend te filteren.
~~~~

## #249 · regel 11499 · line

Anker: `return ˋNog geen leercorrectie voor dit boontype + methode — pas ${correction.n} goedgekeurde, vergelijkbare logging${co`

~~~~text
// NIEUW (Implementatieplan Bypass v1.0, Fase B, BP-4): expliciet genoemd zodat een
    // lager n dan verwacht verklaarbaar is — bypass-brouwsels tellen structureel niet mee
    // (zie learningEligibleEntries()), ook niet als ze verder aan alle eisen voldoen.
~~~~

## #250 · regel 11521 · block

Anker: `const PERSONAL_CALIBRATION_MIN_N = 5;`

~~~~text
/* NIEUW (Implementatieplan v3.0, P2 §13/§13.1/§13.2 — "personal calibration refinement"):
   een PERSONAL_MEASURED samenvatting van wat een gebruiker zelf, op goedgekeurde loggingen,
   daadwerkelijk als succesvolle klikstand gebruikte — los van, en nooit in de plaats van,
   de SOURCED starting/practical range (TIMEMORE_C3S_PRO_MECHANICAL_FACTS blijft
   Object.freeze()'d; dit blok schrijft er nooit naar, alleen weergave, precies zoals
   C-5's retentiemeting hieronder al deed). Hergebruikt bewust dezelfde goedgekeurd-alleen/
   waterprofiel/volumetolerantie-selectie als learningEligibleEntries() (Reparatieplan
   v4.0, C-3) — geen nieuwe, tweede "wat telt mee"-regel verzonnen naast de bestaande. Het
   plan se §12-schema noemt minimumApprovedSamples:5 — dezelfde drempel als C-5's
   RETENTION_MIN_N hieronder, hergebruikt i.p.v. een nieuw getal te verzinnen. */
~~~~

## #251 · regel 11544 · line

Anker: `const confidence = n >= 20 ? 'HIGH' : (n >= 10 ? 'MEDIUM' : 'LOW');`

~~~~text
// NIEUW: geen letterlijke n-drempel per band in het plan gegeven — eigen, verdedigbare
  // keuze (rondgetallen), zelfde geest als elders in dit project (bv. FRESHNESS_TIERS).
~~~~

## #252 · regel 11565 · block

Anker: `const RETENTION_MIN_N = 5;`

~~~~text
/* NIEUW (Reparatieplan v4.0, C-5 / bevinding E-07b, Bouwbesluit BB-3, akkoord gebruiker):
   de retentie die de app tot nu toe alleen BELOOFDE te berekenen. retentie = (water -
   kopgewicht) / dosis.

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
   stilzwijgend wijzigen (non-negotiable N-1). Dit toont alleen. Gebruiker heeft dit vooraf
   goedgekeurd (Bouwbesluit BB-3): alleen weergave in deze ronde, een schakelaar om de
   aanname te vervangen is een aparte, latere beslissing. */
~~~~

## #253 · regel 11626 · line

Anker: `const TRIAGE_QUESTIONS = [`

~~~~text
// category/action zijn NIEUW (Pagina-Polish-spec §6.2/§6.3) en puur additief — text/options/
// flagOn/diagnosis zijn woordelijk ongewijzigd (spec: "Do not alter TRIAGE_QUESTIONS
// semantics"). category is het korte kopje boven de vraag ("01 MOLENSTAND"); action is een
// generieke, rechtstreeks uit de bestaande diagnosis afgeleide volgende-stap-zin — geen
// nieuwe claim, puur de bestaande uitleg omgezet in een concrete actie.
~~~~

## #254 · regel 11638 · line

Anker: `diagnosis:'Te veel bypass-water verdunt verder dan bedoeld — dat proeft precies als "wateriger, minder intens". Te weini`

~~~~text
// UITGEBREID (Implementatieplan Bypass v1.0, Fase B, punt 7): tweede mogelijke oorzaak
    // toegevoegd — ook bij precies de juiste hoeveelheid bijgeschonken water kan de kop
    // afwijken, omdat de geconcentreerde brouwfase zelf een andere extractie kan geven dan
    // een normale zetting (RB §4.2, RESEARCH_GAP voor percolatie). Eerste zin ongewijzigd.
~~~~

## #255 · regel 11658 · line

Anker: `let triageStep = 0;`

~~~~text
// NIEUW (Pagina-Polish-spec §6.2 "Eén vraag per stap"): index van de huidige vraag —
// 0..TRIAGE_QUESTIONS.length-1 tijdens het invullen, === length zodra alle vragen
// beantwoord zijn (dan toont renderTriageQuestions() niets meer en neemt het resultaatblok
// het over). Reset in openTriage(), net als triageAnswers.
~~~~

## #256 · regel 11698 · line

Anker: `function hasRecipeChoice(){`

~~~~text
// NIEUW (Pagina-Polish-spec §6.4 acties): "Opnieuw naar recept" gaat terug naar
// #screen-prep (Triage raakt nooit receptvelden aan); "Terug naar bonen" is de bestaande
// back-bestemming.
// Phase 0 / BC-05 (audit: triage-crash): Triage is ook bereikbaar vanaf het Bonen-scherm,
// zónder dat er ooit een recept gekozen is. De knop toonde dan een leeg receptscherm en
// Start crashte op state.recipe === null. Nu: is er een volledige receptkeuze, dan wordt
// het receptscherm eerst opgebouwd; anders heet de knop eerlijk "Recept kiezen" en gaat
// hij naar het methodescherm.
~~~~

## #257 · regel 11730 · line

Anker: `const flagged = answered.filter(q => triageAnswers[q.id] === q.flagOn);`

~~~~text
// NIEUW (§6.3 "vraag → waarom → praktische volgende stap"): elke gevlagde oorzaak krijgt nu
  // drie regels i.p.v. één samengevoegde zin — nog steeds uitsluitend bestaande
  // tekst/diagnosis, plus de nieuwe, generieke action-zin. Geen percentages (§14).
~~~~

## #258 · regel 11932 · line

Anker: `adviceState.tieResolved = false;`

~~~~text
// HERAUDIT (bijna-gelijke-stand): elke nieuw geladen boon start opnieuw onopgelost —
  // een eerder gemaakte keuze voor een ANDERE boon mag een tie hier niet stilzwijgend
  // overslaan.
~~~~

## #259 · regel 12168 · block

Anker: `// Audit BC-24: het waterprofiel staat in Instellingen en kan ook zonder lopend recept`

~~~~text
/* Waterprofiel-invoer op het prep-scherm — losstaand van de gekozen boon/methode (het is
   een vaste eigenschap van je kraanwater), daarom blijft de waarde onthouden via
   loadWaterHardness()/localStorage in plaats van in `state` (die per methode/boon reset).
   UITGEBREID (Implementatieplan Zetadvies v3.0, Fase 4a-4d): alkaliniteit + eenheid,
   verdunningsinstelling, en per-parameter oordelen (B-5) i.p.v. één hardheidsgetal. */
~~~~

## #260 · regel 12272 · line

Anker: `const diluted = waterDilution.demiParts > 0 && (waterDilution.tapParts + waterDilution.demiParts) > 0;`

~~~~text
// FIX (Fase 4c, B-6): verdunning is PURE rekenkunde op het effectieve profiel dat hier
  // getoond wordt — computeRecipe()/hardnessNudge() bij het recept zelf blijven de RUWE,
  // onverdunde waarde krijgen (waterHardnessMgL), dus dit raakt de receptgetallen nooit.
~~~~

## #261 · regel 12281 · line

Anker: `const hardnessEl = document.getElementById('hardness-readout');`

~~~~text
// NIEUW (Fase 4b, B-5): elke parameter zijn EIGEN uitspraak, nooit een samengevoegd
  // "water is goed"-signaal. Zolang alkaliniteit ontbreekt, staat er expliciet "onbekend",
  // nooit "binnen de richtwaarde" (B-5's letterlijke eis).
~~~~

## #262 · regel 12317 · line

Anker: `const confEl = document.getElementById('water-confidence-readout');`

~~~~text
// NIEUW (Fase 4d): deriveWaterConfidenceInputs()/applyWaterProvenanceCeiling() bestonden
  // al in de engine maar werden nooit gevoed — dit voedt ze met de echte herkomst van het
  // alkaliniteitsgegeven. Deze app gebruikt zelf geen postcode-schatting (geen zo'n functie
  // bestaat hier), dus postcodeLookupUsed is altijd false — dat plafond raakt dit
  // waterprofiel dus per definitie nooit; wél varieert het "grove herkomst"-oordeel echt
  // mee met of alkaliniteit is ingevuld.
~~~~

## #263 · regel 12359 · line

Anker: `const probe = computeRecipe(state.method, state.roast, state.profile, state.waterMl,`

~~~~text
// NIEUW (Reparatieplan v4.0, B-1b): een sterktestap die door de dosisklem toch
      // niets zou opleveren, wordt uitgeschakeld getoond i.p.v. een belofte te doen die
      // de engine daarna terugdraait. Puur presentatie — de klem in computeRecipe()
      // blijft de garantie.
~~~~

## #264 · regel 12385 · block

Anker: `function renderBypassToggle(){`

~~~~text
/* Concentraat/bypass-percentagekeuze op het prep-scherm — brew-methode-keuze, dus hier en
   niet in het boon-formulier (je kiest 'm per keer zetten, niet per boon). Bron/mechanisme:
   Drip Roast's V60-bypassgids (tier 5, zie Research Brief Bypass v1.0 §5/§9). Scott Rao
   publiceert hierover in de context van batchbrouwen/bed-diepte (RB §3) — dat is NIET
   dezelfde claim als deze V60-smaaktechniek, dus geen Rao-attributie hier (FIX,
   Implementatieplan Bypass v1.0 Fase A, BP-1 punt 6: attributie gecorrigeerd). */
~~~~

## #265 · regel 12425 · line

Anker: `const adv = bypassAdvice(state.bypassPct);`

~~~~text
// FIX (project-brede audit, H7 — blijft intact): geen per-boon "aanbevolen/niet
  // aanbevolen"-oordeel op basis van proces/roast/experimenteel (FORBIDDEN edge).
~~~~

## #266 · regel 12481 · line

Anker: `el.innerHTML = visibleProfileKeys().map(k=>`

~~~~text
// FIX (v2.2 kernflow — Bouwbesluit "Schijnkeuze profielen: Knoppen samenvoegen"):
  // visibleProfileKeys() i.p.v. Object.keys(PROFILE_INFO); data-selected canonicaliseert
  // formProfileChip alleen bij het VERGELIJKEN — het opgeslagen formProfileChip zelf blijft
  // de ruwe sleutel (zie click-handler hieronder), zodat bean.profileKey (en dus een latere
  // Advisor-ronde op deze boon) het vol_rond/zoet-onderscheid niet verliest.
~~~~

## #267 · regel 12592 · block

Anker: `s.integrity = 'sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F';`

~~~~text
/* FIX (teamreview v2 — Laag bevinding, Security Engineer/PWA Specialist): dit script
       werd tot v2 zonder Subresource Integrity geladen — bij een gepinde CDN-versie een
       goedkope extra garantie dat het bestand niet stilzwijgend is aangepast. Hash
       berekend over precies dezelfde dist/tesseract.min.js als in het gepinde npm-pakket
       tesseract.js@5.1.1 (jsdelivr's /npm/-CDN serveert het npm-pakket ongewijzigd, dat is
       gedocumenteerd gedrag) — directe toegang tot cdn.jsdelivr.net was niet beschikbaar
       vanuit deze reviewomgeving. Reproduceerbaar/controleerbaar met:
       `curl -s https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js | openssl dgst -sha384 -binary | openssl base64 -A`
       — team: verifieer dit één keer met directe CDN-toegang vóór het uitrollen. */
~~~~

## #268 · regel 13254 · line

Anker: `const badgeEl = document.getElementById('prep-signal-badge');`

~~~~text
// NIEUW (visuele afstemming referentiebeeld "Jouw signaal"-badge): een kort,
      // waarheidsgetrouw richtingswoord (Hoger/Lager voor déze as) i.p.v. een los precisie-
      // getal dat personalHistoryInsight() niet als apart, op zichzelf staand cijfer
      // teruggeeft — de exacte waarden staan al voluit in de zin hierboven.
~~~~

## #269 · regel 13269 · line

Anker: `const suggestionEl = document.getElementById('prep-cupping-suggestion');`

~~~~text
// NIEUW (Implementatieplan Zetadvies v3.0, Fase 6): het voorstel voor DEZE kop komt van
  // de meest recente logging voor deze boon — niet van de meest recente logging mét een
  // voorstel. Zodra er een nieuwere logging bijkomt (met of zonder eigen voorstel) is dat
  // de actuelere datapunt en vervalt het oudere voorstel vanzelf, zonder aparte "afgehandeld"
  // -vlag nodig te hebben: het is altijd het voorstel van de láátste kop, nooit een oudere.
~~~~

## #270 · regel 13295 · line

Anker: `const learningEl = document.getElementById('prep-learning-correction');`

~~~~text
// NIEUW (Implementatieplan Zetadvies v3.0, Fase 7): het boontype-model, per boon+methode
  // opnieuw berekend zodra dit scherm rendert (geen gecachete correctie) — B-7 zorgt er via
  // matchesWaterProfile() vanzelf voor dat een wijziging van het waterprofiel het huidige
  // segment afsluit, zonder dat renderPrep() daar zelf iets voor hoeft te doen.
~~~~

## #271 · regel 13329 · line

Anker: `const grindHeadline = grindHeadlineFor(rec);`

~~~~text
// NIEUW (Visual Design 2.0 fase 2, spec §12 "dose/water/temperature dominant, ratio/
  // grind/brew-time secondary"): dose/temp/water blijven vooraan als de drie dominante
  // waarden; ratio/maalgraad/brouwtijd volgen als stillere .stat-block--secondary-items —
  // ZELFDE #stats-grid-container, ZELFDE innerText-inhoud per veld, alleen volgorde +
  // een modifier-class. Bewust geen apart grid-element: de bestaande tests zoeken
  // "#stats-grid .stat-block" (incl. .first() voor de dosis) en die aanname blijft kloppen
  // zolang Dosis het eerste blok is en Maalgraad ergens in dezelfde grid staat.
  // NIEUW (detail-referentie recept-scherm, gebruikersinstructie): toon bij Maalgraad niet
  // alleen de kwalitatieve band ("Medium-fine") als er geen µm-waarde is, maar de echte
  // klikrange (bijv. "Klik 15–17") — die data (grindStartingRange/grindPracticalRange)
  // bestond al en werd al getoond als stat-sub-toelichting hieronder, nu ook als kopregel.
  // Geen nieuw getal berekend — puur welk al-bestaand veld de hoofdwaarde wordt.
  // Audit BC-12: het getal waar je mee begint staat vooraan; het startgebied eronder.
~~~~

## #272 · regel 13344 · line

Anker: `const grindMoreNotes = [];`

~~~~text
// NIEUW (visuele afstemming referentiebeeld): de langere kalibratie-/range-toelichtingen
  // bij Maalgraad (voorheen altijd alle tegelijk zichtbaar, samen een muur tekst die het
  // compacte kaart-uiterlijk van de referentie doorbrak) staan voortaan achter een lokale
  // "Meer over deze maalstand"-toggle — woordelijk dezelfde teksten, alleen niet meer
  // permanent uitgeklapt. De korte "stand X/vertrouwen"-regel blijft altijd zichtbaar.
~~~~

## #273 · regel 13484 · line

Anker: `evidenceBadgeRow.innerHTML = (rec.hasNamedOverlay`

~~~~text
// NIEUW (Implementatieplan v3.0, §15 "Technique provenance"): de "Unverified
    // attribution"-badge staat los van de hasNamedOverlay/pulseCountSourced-badge
    // hierboven — een overlay kan tegelijk een bronstructuur volgen ÉN een
    // ongeverifieerde toeschrijving hebben (vandaag: RAO_CHEMEX_DISCLOSED). Eerder alleen
    // een parenthetische tekst in de auteursregel (#technique-line), makkelijk over het
    // hoofd te zien; nu ook een eigen, zichtbare badge.
~~~~

## #274 · regel 13582 · block

Anker: `const refineIds = ['process-note','freshness-note','opened-note','intendeduse-note','altitude-note','hardness-note','byp`

~~~~text
/* FIX (teamreview v2 — Midden bevinding, UX Designer): telt hoeveel van de zeven
     "Verfijn dit recept"-notities daadwerkelijk iets te zeggen hebben, en toont/verbergt
     de hele sectie + badge dienovereenkomstig. Geen count meegerekend voor test-sound-
     result — dat hoort niet inhoudelijk bij het recept en staat er al buiten. */
~~~~

## #275 · regel 13591 · line

Anker: `const refineCountEl = document.getElementById('refine-count');`

~~~~text
// FIX (nodig sinds de verplaatsing van de invulvelden zelf in #refine-details): deze
  // sectie werd voorheen volledig verborgen bij refineCount===0 — dat was veilig zolang
  // ze alleen afgeleide *-notes bevatte (niets te tonen = niets te verbergen), maar zou nu
  // ook Branddatum/Zak geopend/Waterprofiel/Sterkte/Intensiteit zelf ontoegankelijk maken
  // voordat er iets is ingevuld. De sectie blijft daarom altijd bereikbaar; alleen het
  // badge-getal hieronder toont nog hoeveel *-notes daadwerkelijk actief zijn.
~~~~

## #276 · regel 13619 · line

Anker: `recipeBodyEl.querySelectorAll('[data-pourstep]').forEach(tr=>{`

~~~~text
// NIEUW (visuele afstemming referentiebeeld "pour step detail"-modal): elke zetstap-rij
  // tikbaar, opent #pourstep-modal met dezelfde waarden groter + de bestaande giet-tip.
~~~~

## #277 · regel 13650 · line

Anker: `document.getElementById('disclaimer').textContent =`

~~~~text
// FIX (expertaudit, bevinding 1): de tekst hieronder bevatte interne verwijzingen naar
  // dit project se eigen planningsdocumenten ("Implementatieplan Zetadvies v3.0, Fase 2,
  // Bouwbesluit B-1", "Reparatieplan v4.0, A-7", "research-brewing-variables.md §2.1/§4.2")
  // — waardevol voor intern traceren, maar zonder enige betekenis voor een eindgebruiker,
  // en op het hoofdscherm van elk recept zichtbaar. Verwijderd; alle onderliggende FEITEN
  // (retentieaanname 2,0 g/g, de Batali/Ristenpart/Guinard-bevinding, het vertrekpunt-
  // karakter van het temperatuur-ankerpunt) blijven woordelijk staan — puur de interne
  // documentverwijzingen weg, geen inhoud. (De "G-CONTROL-CHART-01"-gapcode bij het
  // doelvenster hieronder is bewust ongewijzigd gelaten: dat is een stabiele, toetsbare
  // evidence-ID, geen intern planningsdocument — zie tests/kernflow.smoke.test.mjs "A-1".)
~~~~

## #278 · regel 13663 · line

Anker: `const waterOpenBtn = document.getElementById('stats-water-open');`

~~~~text
// NIEUW (Visual Design 2.0 fase 3): het waterhoeveelheid-statblok hierboven opnieuw
  // tikbaar maken na elke render (het element wordt via innerHTML vervangen, dus oude
  // listeners verdwijnen vanzelf mee — geen stapeling). syncWaterModal() ververst de al-
  // open modal als state.waterMl elders wijzigde (bypass/sterkte/±50-knoppen).
  // Sprint 3: het getal in de watertegel opent de modal; −/+ ernaast (zie de gedelegeerde
  // listener op #stats-grid) passen direct aan.
~~~~

## #279 · regel 13673 · line

Anker: `const grindMoreToggle = document.getElementById('grind-more-toggle');`

~~~~text
// NIEUW (visuele afstemming referentiebeeld): "Meer over deze maalstand"-toggle opnieuw
  // bekabelen na elke render (zelfde reden als hierboven — innerHTML vervangt het element).
~~~~

## #280 · regel 13688 · line

Anker: `const range = engineValidVolumeRange(state.method, state.profile);`

~~~~text
// FIX (Implementatieplan Zetadvies v3.0, §1b): klemt voortaan op het engine-geldige
  // bereik (engineValidVolumeRange) i.p.v. de fysieke apparaatgrens uit METHOD_INFO —
  // zie de non-negotiable-toelichting daar.
~~~~

## #281 · regel 13695 · line

Anker: `function openWaterModal(){`

~~~~text
// NIEUW (Visual Design 2.0 fase 3, detail-referentie recept-scherm "waterhoeveelheid
// aanpassen"-modal): grotere stepper+slider-variant van de bestaande #serving-minus/
// #serving-plus-stepper (die ongewijzigd op het receptscherm blijft staan — zie het
// commentaar bij #water-modal in de body). Zelfde state.waterMl, zelfde
// engineValidVolumeRange()-klem, zelfde renderPrep()-herberekening — geen nieuwe
// receptlogica, puur een tweede, tastbaardere ingang naar dezelfde waarde.
~~~~

## #282 · regel 13718 · line

Anker: `function openPourStepModal(stepIndex){`

~~~~text
// NIEUW (visuele afstemming referentiebeeld recept-scherm "pour step detail"-modal): puur
// een grotere weergave van een al-gerenderde #recipe-body-rij — leest rechtstreeks uit
// state.recipe.steps, geen nieuwe berekening.
~~~~

## #283 · regel 13755 · line

Anker: `const range = engineValidVolumeRange(state.method, state.profile);`

~~~~text
// FIX (self-caught tijdens Playwright-controle): een step="50" op de <input type="range">
  // snapt op de browser-eigen stapgrid vanaf MIN (265, 315, 365, ...) — als max (380) daar
  // niet op valt, wordt hij nooit bereikbaar door helemaal naar rechts te slepen (de browser
  // snapt terug naar 365). Zelfde soort fout als D-2 (250 ml nooit bereikbaar via de knop),
  // nu via de slider i.p.v. de stepper. Fix: step="1" op het element (altijd exact tot en
  // met min/max bereikbaar) en hier gewoon direct klemmen, geen eigen 50-ml-afronding.
~~~~

## #284 · regel 13769 · line

Anker: `const NAV_SCREEN_MAP = {`

~~~~text
// NIEUW (vervolgplan v2.3, Fase 3 — Navigatiemodel): koppelt elk van de 15 schermen
// (11 bestaand + 4 nieuw) aan één van de vijf tabbalk-bestemmingen, zodat de juiste tab
// als "actief" markeert ongeacht via welk concreet scherm je er bent (bijv. Triage en
// Bean Detail horen allebei bij "Bonen").
~~~~

## #285 · regel 13780 · block

Anker: `const NAV_HISTORY = (typeof window !== 'undefined' && window.history && typeof window.history.pushState === 'function') `

~~~~text
/* NIEUW (audit BC-15): het terug-gebaar van de telefoon ging de app uit. Elke schermwissel
   krijgt nu een eigen stap in de browsergeschiedenis; terug = één scherm terug. Een
   in-app terugknop naar het vorige scherm loopt via history.back(), zodat de geschiedenis
   niet aangroeit. Schermen die gegevens nodig hebben vallen terug op een veilig scherm. */
~~~~

## #286 · regel 13840 · line

Anker: `const navbar = document.getElementById('navbar');`

~~~~text
// NIEUW (Fase 3 — navigatieshell): tabbalk verbergen tijdens Brew Mode, zodat weg-
  // navigeren tijdens een lopende brouw (vandaag onmogelijk, regressierisicotabel §5
  // vervolgplan) dat ook in de nieuwe shell blijft; actieve bestemming markeren.
~~~~

## #287 · regel 13851 · line

Anker: `const heading = target.querySelector('[data-screen-heading]') || target.querySelector('h1');`

~~~~text
// NIEUW (Fase 3 — focusbeheer + route-aankondiging): tot nu toe verplaatste een
  // schermwissel alleen de scroll-positie, zonder enig signaal voor wie geen muis
  // gebruikt. Focus gaat naar de kop van het nieuwe scherm; een aria-live-regio meldt
  // de bestemming. tabindex wordt maar één keer gezet (idempotent, geen dubbele attr).
~~~~

## #288 · regel 13914 · line

Anker: `const range = engineValidVolumeRange(state.method, state.profile);`

~~~~text
// FIX (Implementatieplan Zetadvies v3.0, §1b): klem op het engine-geldige bereik.
~~~~

## #289 · regel 13933 · block

Anker: `const prepHistoryTriageLink = document.getElementById('prep-history-triage-link');`

~~~~text
/* FIX (teamreview v2 — Hoog bevinding, Data Scientist): opent de bestaande Triage-checklist
   vanaf de "vorige keer"-vergelijking op het Prep-scherm, zie personalHistoryInsight(). */
~~~~

## #290 · regel 13937 · line

Anker: `function openWaterSettings(){`

~~~~text
// NIEUW (Implementatieplan Zetadvies v3.0, Fase 6): bij het "vlak, mogelijk waterbuffering"
// -patroon wijst het voorstel naar het waterprofiel — dat staat verderop op ditzelfde
// Recept-scherm, dus scrollen + focus i.p.v. een nieuwe navigatie.
// Audit BC-24: het waterprofiel staat in Instellingen — beide links gaan daarheen.
~~~~

## #291 · regel 13953 · line

Anker: `function openBeanAddFromList(){`

~~~~text
// NIEUW (Pagina-Polish-spec §4.1): gedeelde actie voor zowel de lege-staat-CTA
// (#bean-add-link) als de nieuwe header-plusknop (#bean-add-header-btn) — exact dezelfde
// stappen als voorheen inline op #bean-add-link stonden, nu op één plek.
~~~~

## #292 · regel 14106 · line

Anker: `const tasteFirstG = Math.min(60, rec.bypassMl);`

~~~~text
// FIX (Implementatieplan Bypass v1.0, Fase B, BP-6): "aanvullen tot X g totaal" was
  // dubbelzinnig — alleen juist als de dripper nog op de weegschaal stond; zonder dripper
  // erbij voeg je feitelijk het volle waterMl-getal toe i.p.v. alleen bypassMl, en wordt de
  // kop veel te slap. Nu een expliciete weeginstructie per gekozen moment
  // (state.bypassMoment, zie renderBypassToggle()), plus "proef-en-vul" (Fase C): bij
  // achteraf eerst een deel toevoegen en proeven, dan pas aanvullen — in plaats van in één
  // keer blind het hele bedrag erbij te gieten.
~~~~

## #293 · regel 14172 · line

Anker: `const PAUSE_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="6" y="4" width="4" heig`

~~~~text
// NIEUW (focus-herontwerp): icoon i.p.v. tekst op de grote pauzeknop — zelfde Pauze/
// Hervat-toestand als voorheen (nog steeds via timer.running gestuurd), alleen de
// weergave verandert. sr-only-tekst behoudt de toegankelijke naam van de knop exact
// zoals die was (screenreaders lezen nog steeds "Pauze"/"Hervat" voor, niets verwijderd).
// FIX (Safari/WebKit — screenshot-feedback macOS/iPhone/iPad): width/height="24" naast de
// viewBox, anders valt Safari terug op een eigen (veel te grote) default-object-size en
// blijft de knop leeg — zie dezelfde toelichting bij reset-btn/home-btn in de HTML.
~~~~

## #294 · regel 14186 · line

Anker: `function setDialRunning(running){`

~~~~text
// NIEUW (ademende gloed op de dial tijdens het lopen, zie .dial-wrap[data-running] in de
// CSS): puur een presentatie-attribuut, geen enkele timer-berekening aangeraakt.
~~~~

## #295 · regel 14255 · line

Anker: `const heroImg = document.getElementById('brew-hero-img');`

~~~~text
// NIEUW (focus-herontwerp): hero-foto + kop bij het starten van een brouw — zelfde
  // BREW_PHOTO-mapping (staand of vierkant naar schermvorm), boonnaam alleen
  // als er daadwerkelijk een boon aan deze sessie hangt (state.beanId).
~~~~

## #296 · regel 14308 · line

Anker: `setPauseBtnLabel(false);`

~~~~text
// FIX (bestaand gedrag gecorrigeerd tijdens icoon-omzetting): na reset staat de timer
  // stil (running=false) — de knop start 'm dus weer op, net als runTimer(). De oude
  // tekstversie zei hier nog "Pauze" (leek te impliceren dat de knop iets zou pauzeren),
  // wat als icoon (⏸ i.p.v. ▶) een écht misleidend beeld zou geven — als tekstlabel viel
  // dat niet op, als icoon wel.
~~~~

## #297 · regel 14795 · block

Anker: `function showConfirmModal(message, opts){`

~~~~text
/* FIX (teamreview v2 — Laag bevinding, Interaction Designer): vervangt window.confirm(),
   dat als kale systeemdialoog niet in het thema past en de brouwflow abrupt onderbreekt —
   precies op het moment dat je handen vol koffie hebben. Belooft-gebaseerd zodat de
   aanroepende code er gewoon op kan `await`-en; valt terug op window.confirm als de
   modal-elementen onverhoopt niet in de DOM staan, dan werkt bevestigen in elk geval nog. */
~~~~

## #298 · regel 14824 · block

Anker: `async function stopBrewTimer(confirmMessage){`

~~~~text
/* NIEUW (Home-knop): gedeelde stop-bevestigingslogica, geëxtraheerd uit de bestaande
   stop-btn-handler zodat #home-btn exact dezelfde veiligheidsgate gebruikt (bevestigen bij
   een lopende timer) in plaats van een eigen kopie die uit de pas zou kunnen gaan lopen.
   Gedrag/voorwaarde/labels ongewijzigd t.o.v. de oorspronkelijke stop-btn-handler — puur
   verplaatst, plus een aanroeper-specifieke boodschap. Geeft true terug als de brew
   daadwerkelijk gestopt is (of er nooit een liep), false bij annuleren. */
~~~~

## #299 · regel 15022 · block

Anker: `function registerOfflineServiceWorker(){`

~~~~text
/* ============================================================
   SERVICE WORKER — cachet deze app zodat hij ook volledig offline
   (vliegtuigstand, geen wifi in de keuken, koud gestart vanaf het
   beginscherm) betrouwbaar opnieuw opstart.

   FIX (vervolgplan v2.3 — afwijking F, Product Architect + Devil's
   Advocate): dit registreerde tot v2.2 vanaf een blob:-URL, om de app
   één zelfstandig HTML-bestand te houden. Dat kan niet: een service
   worker-script moet volgens de spec een http:- of https:-URL zijn;
   een blob:-URL geeft altijd een TypeError. Gemeten in een echte
   browser: de registratie faalde bij elke poging, stil, want de
   .catch() eromheen logde alleen een console.warn — er is dus nooit
   iets gecachet, en offline opstarten leunde volledig op de gewone
   HTTP-cache van Safari.

   De oplossing (bijlage A, Bouwbesluit B7): een los bestand `sw.js`
   naast deze HTML, want de deploy naar Netlify is toch al een map.
   Dat kost het single-file-principe niets — zonder webserver
   (file://) is een service worker sowieso onmogelijk, dus lokaal
   testen/openen werkt exact als voorheen. sw.js zelf regelt de
   cachestrategie (netwerk-eerst voor het opstarten, cache-eerst voor
   de rest) en de CACHE_VERSION-opruiming; hier blijft alleen de
   registratie over. */
~~~~

## #300 · regel 15125 · line

Anker: `function resetAppData(){`

~~~~text
// NIEUW (Visual Design 2.0 fase 2, Instellingen-scherm "Data"-sectie): een ECHTE reset-
// functie — wist de gebruikersdata (bonen, brouwsels incl. het oude logboek en een lopend
// brouwsel, blinde proeven), exact de localStorage-sleutels die loadBeans()/loadBrewLog()/
// loadAbTrials() lezen, en herlaadt de pagina. Na het wissen valt de app terug op de bestaande, al-geteste
// seed-bonen-fallback (zie de adversarial-robustness-tests voor corrupte/lege
// localStorage) — geen nieuw "leeg"-pad nodig, hergebruikt puur wat er al is. Thema-
// voorkeur (brewconsole_theme) blijft bewust ongemoeid: dat is geen "data" in de zin van
// deze sectie, en onverwacht van thema wisselen bij een reset zou verrassend zijn.
~~~~

## #301 · regel 15134 · line

Anker: `showConfirmModal(`

~~~~text
// FIX (Pagina-Polish-spec §7.5, self-caught tijdens verificatie): de tekst beweerde
  // "en instellingen" te wissen, maar hieronder wordt alleen data verwijderd — thema (spec §7.5: "blijft ongemoeid") en waterprofiel
  // blijven bewust staan. De tekst moest exact matchen wat er werkelijk gebeurt, anders
  // is dit zelf een voorbeeld van de "fake"/overclaimende tekst die deze hele spec net
  // wil voorkomen.
~~~~

## #302 · regel 15174 · line

Anker: `document.querySelectorAll('.navbar [data-nav]').forEach(btn=>{`

~~~~text
// NIEUW (vervolgplan v2.3, Fase 3 — Navigatieshell): koppelt de vijf tabbalk-/zijbalk-
// knoppen aan hun bestemming. Elke bestemming rendert zichzelf vers bij binnenkomst
// (consistent met hoe bv. beans-link/advisor-link elders al werken), zodat de tab ook
// klopt als je 'm binnenkomt ná een wijziging elders (nieuwe boon, nieuwe logging).
~~~~
