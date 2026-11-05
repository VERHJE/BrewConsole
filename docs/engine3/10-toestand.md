# 10 · Toestand (bouwstap 1)

Code: `engine3/src/state.ts` · tests: `engine3/test/state.test.ts`

`learnFacts(events)` leest het effectieve logboek (samengevoegd, zonder ingetrokken of verwijderde dingen) en bouwt er feiten van op. Er zit nog geen model in. De latere modules lezen deze feiten.

## Wat erin zit

| Onderdeel | Inhoud |
|---|---|
| `beans` | per zak: velden (laatste wint per veld), herkomst per veld, legacy, gearchiveerd, zetsels op tijd |
| `cups` | per zetsel een `CupFacts`, zie hieronder |
| `cupOrder` | alle zetsels op plan-moment |
| `trials` | blinde proeven (`pair.trial`) |
| `settings` | water, molen, 'helderder/zoeter'-schakelaar |
| `notes` | meldingen over het logboek zelf: gebeurtenissen zonder plan, zetsels van een onbekende zak |

## `CupFacts`

- **Wat werkelijk gebruikt is:** dosis, water, bypass, klik en techniek komen uit de werkelijke waarden, anders uit het plan. `actualsGiven` zegt welke van de twee.
- **Tijden:** start, einde, bed droog en per giet het moment van 'erdoor'. Een ongedaan gemaakte tik is eruit.
- **`lastDrainSec`:** de tijd van de start van de laatste giet tot 'erdoor' na die giet. Alleen ingevuld als beide bekend zijn. Dit is de maat voor de molenmodule (stap 4).
- **Status:** gepland, bezig, klaar of afgebroken.
- **Oordeel:** het laatste `tasting`-event, met het moment waarop het gegeven is.

## Regels

- Volgorde en dubbelingen in het logboek maken niets uit (fast-check, 100 volgordes met en zonder dubbelen).
- `tasting`, `brew.actuals` en `setting`: de laatste wint. `bean.upsert`: de laatste wint per veld, de rest blijft.
- Een tweede `brew.plan` voor hetzelfde zetsel vervangt het eerste.
- Niets wordt geraden. Ontbrekend blijft `null`.

## Lezen

`cupsOf(state, filter)` geeft zetsels op tijd, te filteren op zak, techniek, methode, hoeveelheid water, status en of er geproefd is. `countsBy(state, sleutel, filter)` telt per groep, voor modules die moeten weten of er genoeg data is.

## Getoetst op Jelles back-up (lokaal, aantallen)

| | |
|---|---|
| Gebeurtenissen | 105 |
| Zakken | 5 |
| Zetsels | 20 (18 klaar) |
| Met oordeel | 10, waarvan 9 met sterkte (gelijk aan de bron) |
| Met klikstand | 20 |
| Met 'erdoor'-tik na de laatste giet | 0 |
| Meldingen | 2 |

De nul bij 'erdoor' klopt met het meetplan in 07: de huidige back-up bevat nog geen enkele tik. De molenmodule heeft ze nodig.
