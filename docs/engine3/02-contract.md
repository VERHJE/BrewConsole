# 02 · Contract (concept 0.1)

Bron van waarheid: `engine3/src/types.ts`. Dit document legt uit waarom het contract zo is.

## Twee functies

```ts
interface Engine {
  readonly stamp: { name: string; version: string };
  learn(events: readonly EngineEvent[]): EngineState;
  plan(state: EngineState, request: PlanRequest): Advice;
}
```

- **Puur.** Dezelfde invoer geeft altijd dezelfde uitkomst. Er is geen klok: de tijd zit in `request.at`. Er is geen toeval, en ook geen opslag of netwerk.
- **Ondoorzichtige toestand.** De frontend bewaart en leest alleen het logboek. De toestand kan altijd opnieuw uit het logboek worden opgebouwd. Dat kan later ook stapsgewijs, zoals de cache van Engine 2.

## Vraag

| Veld | Betekenis |
|---|---|
| `at` | tijdstip van de vraag (epoch-ms) |
| `beanId` | welke zak; null = onbekende koffie |
| `method` | `v60` of `chemex` |
| `cupG` | hoeveel koffie je wilt drinken (g) |
| `goal` | helder, gebalanceerd, rond, of null |
| `technique` | zelf gekozen techniek, of null (dan kiest de engine) |

## Advies

| Veld | Betekenis |
|---|---|
| `recipe` | technique, method, doseG, waterG, bypassG, tempC, grindClick, pours[], expectedEndSec (band) |
| `reasons[]` | per module een stabiele code plus gewone tekst ('waarom dit recept') |
| `uncertainty` | band om doel-TDS, dosis en eindtijd |
| `trial` | hooguit één voorgestelde proef (twee recepten: controle en variant) |
| `warnings[]` | bijvoorbeeld 'dosis op de grens van de brewer' |

Elke giet heeft atSec, addG, toG, style, agitationAfter en waitForDrain. Met `waitForDrain` geldt de regel van Philocoffea: giet pas als het water er bijna door is. De klok is daarbij een richtpunt, geen regel.

## Modules

| Module | Leest | Levert | Uit het verslag |
|---|---|---|---|
| strength | sterkte-oordelen, blinde paren, TDS | doel-TDS en dosis | Engine 2-aanpak |
| grind_time | klik, dosis, tijden, 'erdoor'-tikken | klikadvies en verwacht einde | punt 4: molenmodel |
| technique | boon, eigen uitkomsten | starttechniek plus proef | punt 1, regeltabel |
| recipe | techniek, dosis, branding | gietschema en temperatuur | Kasuya-besluiten |
| bean | tekst, OCR, QR, AI | boonvelden met bron per veld | punt 3 |
| taste_profile | blinde CATA, herkende notities | profiel over alle zakken | punt 4: notitievraag |

## Vaste regels (worden tests)

Overgenomen uit Engine 2 (`tests/engine2.invariants.test.mjs`):

1. Een extra "te sterk" maakt het recept nooit sterker. Een extra "te slap" maakt het nooit lichter.
2. Nooit een stap tegen het laatste oordeel in.
3. Per kop hooguit twee halve stappen.
4. De dosis blijft binnen de grenzen van de brewer.
5. De volgorde in de opslag maakt niet uit.
6. De verhouding hangt niet af van de hoeveelheid water.

Nieuw, uit de besluiten van Jelle:

7. Sterkte is persoonlijk. Notities, proces, hoogte en variëteit verschuiven geen grammen.
8. De temperatuur bij Kasuya hangt alleen af van de branding (93, 88 of 83 °C).
9. Kasuya houdt bij elke hoeveelheid de Hario-momenten (0, 45, 90, 130 en 160 s). De verdeling is 40/60.
10. Een andere techniek dan Kasuya is altijd eerst een proef. Een gewonnen proef wint van elke regel.
11. Een onbekende notitie wordt nooit geraden.
12. Elk recept noemt zijn reden (`reasons` is nooit leeg).
