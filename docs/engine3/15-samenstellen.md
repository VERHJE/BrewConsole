# 15 · Samenstellen (bouwstap 8)

Code: `engine3/src/engine.ts`, `engine3/src/data/brewer.ts` · tests: `engine3/test/engine.test.ts` · rooktest van de bundel: `engine3/scripts/smoke-bundle.mjs` · contract: `e3-contract-1.0`

```ts
import { createEngine } from './engine3.mjs';        // engine3/dist/engine3.mjs, gebouwd met npm run e3:build
const engine = createEngine();
const state  = engine.learn(events);                  // het hele logboek (of het effectieve deel)
const advice = engine.plan(state, { at, beanId, method, cupG, goal, technique, feedback? });
```

`learn()` en `plan()` zijn zuiver: dezelfde invoer geeft hetzelfde antwoord, zonder klok, toeval, opslag of netwerk. De frontend bewaart alleen het logboek; de toestand kan altijd opnieuw worden opgebouwd.

## Wat `plan()` doet

1. **Techniek** (`chooseTechnique`): zelf gekozen, gewonnen proef, vergelijkbare zakken, regeltabel, Kasuya. Het doel (helder, gebalanceerd, rond) zet bij Kasuya de eerste giet op 0,667, het Hario-voorbeeld of 0,333; het wint van de regeltabel.
2. **Water en dosis:** de kop is `water − (vasthouden − extractie) × dosis`. Omdat de dosis van het water afhangt, rekent `plan()` dit iteratief uit tot de kop gelijk is aan `cupG`. De dosis komt van de sterktemodule. Buiten de grenzen van de brewer (V60: 15–22 g, geschat; Chemex: geen grens) wordt de dosis begrensd en komt er een waarschuwing.
3. **Recept** (`buildRecipe`): gietschema, temperatuur per branding.
4. **Molen** (`grindPlan`): klik en verwacht einde. Het einde komt uit jouw eigen koppen zodra er voor die techniek tijden zijn gelogd; anders uit de bron.
5. **Proef:** hooguit één voorstel (twee recepten met gelijke dosis, water en maling).
6. **Uitleg:** `reasons[]` met een stabiele code en gewone tekst per module; `warnings[]`; `uncertainty` met banden voor het doel in % TDS, de dosis en het einde.

## Wat de frontend moet doen

- Alleen het logboek bewaren (zie 03) en bij elke kop `brew.plan` met het gezette recept, `brew.timer` (ook 'erdoor' en 'bed droog'), `brew.actuals` en `tasting` schrijven.
- Een voorgestelde proef aanbieden, blind laten kiezen en vastleggen als `pair.trial` (`kind: 'technique'` voor een techniekproef, `'strength'` voor een sterkteproef). De `trialId` van het voorstel gaat in `brew.plan.trialId` van beide koppen.
- 'Ongelijk doorlopen' meegeven als `feedback: ['uneven_drain']`: de engine kan dat niet zelf zien.
- Synchronisatie via `engine3/sync` (08), het logboek lokaal als bestand naar iCloud Drive als reserve.

## De vaste regels uit het contract (02) zijn nu tests

| Regel | Test |
|---|---|
| 1 en 2. Na "te sterk" nooit sterker, na "te slap" nooit lichter; nooit tegen het laatste oordeel in | eigenschapstest op `plan()` over willekeurige oordeelreeksen |
| 3. Begrensde stappen per kop | dezelfde test: de dosis verandert per kop hooguit 20 % (ln) |
| 4. Dosis binnen de grenzen van de brewer | eigenschapstest over kopgroottes 120–600 g en reeksen extreme oordelen |
| 5. Volgorde en dubbelingen in het logboek maken niet uit | eigenschapstest (shuffle plus alles dubbel) |

## Poort

- **Eigen koppen** (lokaal, alleen tellingen): op de 9 geproefde koppen met een sterkte-oordeel doet Engine 3 hetzelfde als Engine 2: 3 keer de goede kant op, 1 keer de verkeerde, 5 keer geen richting. Met het volledige `plan()` zijn de tellingen gelijk; het gemiddelde verschil met de gezette dosis is 1,21 g (Engine 2: 1,11 g), doordat Engine 3 zonder koppen begint bij de verhouding van de techniek (Kasuya 1:15) in plaats van het basisrecept van de oude app.
- **Meetopstelling:** sterkte gelijk aan Engine 2 (12), tijd en molen beter dan een vaste klik (13), techniekkeuze nergens slechter dan altijd Kasuya (14).
- **Bundel:** `npm run e3:check` bouwt `engine3/dist/engine3.mjs` en draait de rooktest erop, in CI.

## Bewust niet gedaan

De schakelaar in de bestaande app (`brewconsole_v2_2.html`) is niet gebouwd. De frontend wordt later opnieuw opgezet rond deze engine; de oude app blijft Engine 2 gebruiken, en dient alleen als nulmeting. Dezelfde `createEngine()` kan daar later achter een schakelaar worden gehangen.
