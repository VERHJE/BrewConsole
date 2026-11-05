# Engine 3 · voorbereiding

Engine 3 is de nieuwe rekenkern van Brew Console. Hij wordt vanaf nul gebouwd en staat los van de frontend: die komt er later omheen. Deze map legt vast wat er vóór het bouwen klaar moet zijn. Alles hieronder is klaar, behalve de rekenlogica zelf.

## Wat er staat

| Onderdeel | Waar | Status |
|---|---|---|
| Inventaris van de huidige app (data, Engine 2, back-up) | [01-inventaris.md](01-inventaris.md) | klaar |
| Contract: wat de engine krijgt en teruggeeft | [02-contract.md](02-contract.md), `engine3/src/types.ts` | klaar (concept 0.1) |
| Datamodel: logboek van gebeurtenissen | [03-datamodel.md](03-datamodel.md), `engine3/src/types.ts`, `engine3/src/events.ts` | klaar |
| Migratie van de huidige back-up | [04-migratie.md](04-migratie.md), `engine3/src/migrate/v3.ts` | klaar, getoetst op Jelles back-up (lokaal) |
| Technieken en regeltabel als data | [05-technieken.md](05-technieken.md), `engine3/src/data/` | klaar, met open punten |
| Meetopstelling en nulmeting Engine 2 | [06-meetopstelling.md](06-meetopstelling.md), `engine3/eval/` | klaar |
| Toestelcheck voor de iPhone | `toestelcheck.html` (in de root, naast de app) | gedraaid op de iPhone (5 nov 2026); uitkomst in 07 |
| Open punten en beslissingen | [07-open-punten.md](07-open-punten.md) | — |
| Synchronisatie (eerste bouwstap) | [08-synchronisatie.md](08-synchronisatie.md) | ontwerp klaar, wordt gebouwd |
| Bouwplan | [09-bouwplan.md](09-bouwplan.md) | vastgesteld |
| Toestand (stap 1) | [10-toestand.md](10-toestand.md) | klaar |
| Recept (stap 2) | [11-recept.md](11-recept.md) | klaar |
| Sterkte (stap 3) | [12-sterkte.md](12-sterkte.md) | klaar |
| Tijd en molen (stap 4) | [13-tijd-en-molen.md](13-tijd-en-molen.md) | klaar, nog niet getoetst op eigen tikken |
| Techniekkeuze (stap 5) | [14-techniekkeuze.md](14-techniekkeuze.md) | klaar |
| Samenstellen (stap 8) | [15-samenstellen.md](15-samenstellen.md) | klaar, contract 1.0 |
| Zakherkenning (stap 6) | [16-zakherkenning.md](16-zakherkenning.md) | klaar |

## Draaien

```
npm run e3:typecheck   # TypeScript strict (tsc 7)
npm run e3:test        # node:test + fast-check
npm run e3:build       # esbuild → engine3/dist/engine3.mjs (niet in git)
npm run e3:check       # alle drie; draait ook in CI
npm run e3:eval        # meetopstelling (standaard 60 herhalingen per wereld)
node engine3/eval/replay-local.ts <back-up.json>   # eigen koppen, alleen lokaal
node engine3/scripts/gen-flavor-wheel.mjs         # smaakwiel opnieuw uit de app halen
```

Node 22 draait TypeScript direct (type stripping). Daarom gebruikt de code alleen 'wisbare' TypeScript: geen `enum`, geen `namespace`. `tsc` controleert alleen, en esbuild bouwt.

## Bouwvolgorde

Het uitgewerkte plan met poorten per stap staat in [09-bouwplan.md](09-bouwplan.md). Samengevat:

Elke stap is pas af als de tests groen zijn en de meetopstelling niet slechter is dan Engine 2 (zie de acceptatie in 06).

0. **Synchronisatie** (besluit Jelle, 5 nov 2026). Het logboek versleuteld naar een eigen, gratis Cloudflare Worker, met de iCloud Drive-back-up als reserve. Dit staat los van de rekenlogica, maar komt eerst, omdat iOS de opslag van de app niet blijvend maakt. Zie 08.
1. **Logboek → toestand** (klaar, `engine3/src/state.ts`). `learn()` leest het effectieve logboek (`effectiveEvents`) en bouwt per zak, per techniek en per hoeveelheid de feiten op. Dit is nog zonder modellen.
2. **Recept** (klaar, `engine3/src/recipe.ts`). Techniekdata (`TECHNIQUES`) plus dosis en water geven het gietschema:
   - Kasuya: Hario-momenten, 40/60, en wachten op het doorlopen;
   - temperatuur per branding volgens Philocoffea.
3. **Sterkte** (klaar, `engine3/src/strength.ts`). Dit module is voorlopig gelijk aan Engine 2, want de nulmeting laat weinig ruimte zien (6 punten tot het orakel). Daarna kan het verbeterd worden.
4. **Tijd en molen** (klaar, `engine3/src/grind.ts`, zie 13). Bayesiaans, met de natuurkundige verwachting (−11 % doorloop per klik grover) en een term per hoeveelheid. Hier zit de grootste winst.
5. **Techniekkeuze** (klaar, `engine3/src/technique.ts`, zie 14). Volgens `SELECTION_RULES`. Een afwijking van Kasuya is altijd een proef; een gewonnen proef wint van elke regel.
6. **Zakherkenning** (klaar, `engine3/src/bean/`, zie 16). `parseBeanText` uit de huidige app wordt overgezet (die is getoetst op 8 zakken). Daarna komen QR en, alleen met toestemming, AI.
7. **Smaakprofiel.** Blinde keuzevakjes (CATA) en herkende notities over alle zakken heen. Dit stuurt het recept niet.

## Grenzen

- De engine leest en schrijft niets zelf: geen DOM, geen opslag, geen netwerk, geen klok en geen toeval. Een test bewaakt dat in de bronbestanden.
- De huidige app (`brewconsole_v2_2.html`) blijft ongewijzigd. Engine 3 gebruikt hem alleen als nulmeting, via `tests/load-app.mjs`.
