# De rekenkern (engine-bundel)

**Wat het is:** het eerste `<script>` na `<body>` in `brewconsole_v2_2.html` (±57 kB). Het zet `globalThis.BrewEngineBundle` met:
- de registers voor molen en brewer (Timemore C3S Pro, V60-02, Chemex 6-kops);
- de harde grenzen;
- de stijlrecepten (Kasuya, Hoffmann, April, Rao, Perger, Hedrick);
- `buildCoreRecipe` (dosis, water en verhouding uit een TDS/EY-venster, met `LIQUID_RETAINED_RATIO = 2,0`);
- het maken en rangschikken van kandidaten;
- de vertrouwensbanden.

**Herkomst:** de bundel is gebouwd uit een TypeScript-project (`src/registry/*.ts`, `src/webapp/engine-bundle.ts`, zie de paadcommentaren in de bundel zelf). **Die TypeScript-bron staat niet in deze repository.** Daarom is de bundel hier bevroren: de app-laag (`computeRecipe()` en verder) past niets in de kern aan en legt eigen keuzes er alleen bovenop.

**Bewaking:**
- `tests/engine-integrity.test.mjs` controleert de volledige sha256 van het scriptblok (`<script>` tot en met `</script>`). Een onbedoelde wijziging laat de test falen.
- `tests/build.test.mjs` controleert dat de bouwstap (`dist/`) de kern byte voor byte gelijk laat.

| Veld | Waarde |
|---|---|
| sha256 (volledig blok) | `1b13e449b38e07ee6247dac4472cce36971f01585178c4572b9fbb66355d9430` |
| Lengte | 57.444 tekens |
| Korte hash (in bouwbesluiten) | `1b13e449b38e07ee` |

**Als de kern ooit moet veranderen:**
1. Pas de TypeScript-bron aan in het oorspronkelijke project. Liefst eerst die bron hier toevoegen (bijvoorbeeld onder `engine/`), met een build-script.
2. Bouw de bundel en vervang het scriptblok in `brewconsole_v2_2.html`.
3. Werk de hash in deze tabel en in `tests/engine-integrity.test.mjs` bij.
4. Genereer de gouden recepten opnieuw (`node tests/_baseline.mjs > tests/fixtures/golden-recipes.txt`), bekijk het verschil en leg het vast in de bouwbesluiten.
5. Verhoog `MODEL_POLICY.version` als receptgetallen veranderen.

Zonder de TypeScript-bron: wijzig de kern niet met de hand. Leg een nieuwe keuze in de app-laag, zoals `computeRecipe()` dat nu doet.
