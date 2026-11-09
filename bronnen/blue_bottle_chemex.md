# Bron: Blue Bottle Coffee, "How to brew Chemex pour over" (gecorrigeerd Engels transcript)

Aangeleverd door Jelle op 9 nov 2026 (PDF, 2 pagina's). Klasse A: de roaster zelf (video), niet via Prima Coffee. Dit vervangt de eerdere aanname dat de eigen pagina van Blue Bottle niet bereikbaar was (`onderzoek_chemex.md`).

## Gegevens
- **Benodigd:** 6-kops Chemex, Chemex-filter, **50 g koffie**, weegschaal met timer, ketel, molen.
- **Water:** ongeveer een volle ketel op **205 tot 210 °F (96 tot 99 °C)**; genoeg om de Chemex voor te verwarmen en te brouwen.
- **Filter:** de drie lagen naar de **tuit**; grondig spoelen en het water weggooien (verwarmt de kan, zorgt voor een goede afsluiting, haalt smaak van het papier).
- **Maling:** **medium-grof, iets fijner dan French press**, zoals zeezout.
- **Bed:** grondig schudden voor een vlak bed; weegschaal op nul.
- **Vier gietbeurten, samen 700 g.** Elke giet begint in het midden, dan in concentrische cirkels naar buiten en terug naar het midden; één ronde duurt ongeveer een seconde.

| Giet | Moment | Naar totaal | Opmerking |
|---|---|---|---|
| 1 (bloem) | 0:00 | ca. 100 g | vanuit het midden naar buiten en terug tot alles nat is |
| 2 | **0:45** | **300 g** | in dezelfde beweging, naar de rand van de koffie, niet op het filter; het water moet bijna helemaal door de koffie zijn voor de volgende giet |
| 3 | **1:50** | **500 g** | zelfde patroon; weer laten doorlopen |
| 4 | **3:10** | **700 g** | zelfde patroon |

- **Afloop:** meestal klaar in ongeveer **4 minuten**; langer is niet ongewoon, vooral bij lichtgebrande koffie van grote hoogte. Als het water uitgedruppeld is: filter weg.

## Wat dit verandert in de app (nog niet gedaan; Jelle: "voeg later toe wat nodig is")
`chemex_blue_bottle` in `engine3/src/data/chemex-techniques.ts` gebruikt nu plaatshouders uit de Prima-vergelijking:
1. Gietmomenten **0 / 50 / 110 / 170 s** worden **0 / 45 / 110 / 190 s** (nu allemaal uit de bron; de plaatshouder in `open` vervalt).
2. Temperatuur: nu 96 °C; de bron geeft **96 tot 99 °C** (205 tot 210 °F).
3. Maling: de bron noemt "iets fijner dan French press"; bevestigt medium-grof.
4. Eindtijd: nu 3:30 tot 4:30; de bron zegt "ongeveer 4 minuten, langer is niet ongewoon" (licht gebrand, hoge teelt: langer).
5. Tips per giet: patroon (midden, naar buiten, terug), niet op het filter; wachten tot het water bijna doorgelopen is is een **doorloopkoppeling**, geen klok (de momenten zijn dus een richtlijn).
6. Bron: klasse B (via Prima) wordt klasse A met `readPrimary: true`; `sourceClass` aanpassen.
7. De bloem is 100 g bij 50 g koffie (2 ×), zoals de Prima-versie.
