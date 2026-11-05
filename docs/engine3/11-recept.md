# 11 · Recept (bouwstap 2)

Code: `engine3/src/recipe.ts` · tests: `engine3/test/recipe.test.ts`

`buildRecipe({ technique, method, doseG, waterG, roast, kasuyaFirstPourShare, … })` geeft een `Recipe` (gietschema, temperatuur, verwacht einde) plus `warnings` en de herkomst van de temperatuur (`tempSource`). De functie is zuiver. Dosis en water komen mee: de sterktemodule (stap 3) bepaalt de dosis.

## Regels

- **Referentie:** bij de referentiehoeveelheid van de bron komt precies het brongetal terug (test per techniek: momenten, gewichten, `waitForDrain`, einde).
- **Momenten:** de gietmomenten blijven bij elke hoeveelheid gelijk (besluit Jelle). Alleen de hoeveelheden schalen. Eigenschapstest: voor elke hoeveelheid tussen 120 en 800 g lopen tijd en gewicht op en klopt het totaal.
- **Kasuya:** de eerste 40 % in twee gieten, daarna 3 × 20 %. De verdeling van de eerste 40 % is een parameter: standaard 50 + 70 (Hario), 40 + 80 is zoeter, 80 + 40 is helderder (Gota). De waarden komen uit `SELECTION_RULES`. Elke giet na de eerste heeft `waitForDrain`.
- **Overige technieken:** schalen op verhouding met het water. Alleen bij Hoffmann zegt de bron dat (verhouding). Bij de rest meldt de functie dat de schaling een aanname is.
- **Osmotic Flow:** geeft `RecipeError('no_schedule')`, want er is geen gietschema in de bron.

## Temperatuur

| Techniek | Licht | Medium | Donker | Onbekend |
|---|---|---|---|---|
| Kasuya | 93 °C | 88 °C | 83 °C | 92 °C (Hario-voorbeeld) |
| Hoffmann | 100 °C | 100 °C | 88 °C (klasse C, aanname) | 100 °C |
| Wendelboe | 96 °C (aanname) | 96 °C (aanname) | 83 °C (aanname) | 96 °C (aanname) |
| Overige | uit de bron | | | |

'Licht-medium' valt bij Kasuya onder licht, 'medium-donker' onder medium. Bij Wendelboe geeft 'medium-donker' 88 °C (Philocoffea-regel, aanname).

## Einde

- **Kasuya:** 3:30 als midden, met de bewaking van Gota (2:50–4:10) als band.
- **Overige technieken:** de band uit de bron.
- Bij een andere hoeveelheid dan de referentie is het einde nog niet uit eigen zetsels geleerd. Dat staat in `warnings`. De molenmodule (stap 4) maakt het eigen.

## Meldingen

- eerste giet kleiner dan 2 × de dosis (koffie kan droog blijven);
- V60-techniek op de Chemex (dikker filter loopt trager);
- schaling zonder bronregel;
- plaatshouders in de tijden van Gagné, Wendelboe en Rao (uit de technieken-data);
- het einde bij een andere hoeveelheid is nog niet geleerd.
