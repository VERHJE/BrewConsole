# 14 · Techniekkeuze (bouwstap 5)

Code: `engine3/src/technique.ts` · data: `engine3/src/data/selection-rules.ts` · tests: `engine3/test/technique.test.ts` · meetopstelling: `engine3/eval/technique-sim.ts` (uitvoer `engine3/eval/e3-technique-200.json`)

`chooseTechnique(feiten, { beanId, method, cupG, technique, feedback })` geeft de techniek die nu gezet wordt, het aandeel van de eerste Kasuya-giet, de reden (`reasons`), hooguit één voorstel voor een paar-proef en een eventueel lopende proef. `trialProposalFor(keuze, { dosis, water, … })` maakt van dat voorstel twee recepten (controle en variant) met gelijke dosis, water en maling.

## Afspraken

- **Een afwijking van Kasuya is altijd een proef.** Kasuya blijft de controle en de variant komt ernaast. Alleen een besluit van Jelle (nu: Chemex → Hoffmann) wordt direct gezet.
- **Een gewonnen proef wint**, voor die zak en voor vergelijkbare koffies. Wint de controle, dan blijft het Kasuya en komt de verliezer niet terug.
- **Alleen techniek met een bronschema.** Osmotic Flow heeft geen gietschema en wordt nooit voorgesteld.
- **Niet te vroeg, niet te vaak:** een proef pas na 2 geproefde Kasuya-koppen van deze zak, nooit twee tegelijk, en niet in de twee koppen na een proef.
- **Elke geprobeerde variant telt**, ook bij gelijkspel: dezelfde variant wordt voor die zak niet nog eens voorgesteld.

## Volgorde van de keuze

1. Zelf gekozen techniek (`user`).
2. Jouw laatste beslissende proef met deze zak (`won_trial`).
3. Vergelijkbare zakken: zelfde proces, zelfde brandingklasse (licht, medium, donker) en minstens één gedeelde smaakcategorie. Twee netto gewonnen proeven maken een techniek de standaard (`similar_wins`). Eén netto winst wordt de voorgestelde proef (`basis: similar`).
4. De regeltabel. Een besluit van Jelle wordt direct gezet (`rule_direct`); anders is Kasuya de controle en komt de proefkandidaat uit de eerste passende regel met een techniek die nog niet is geprobeerd (`rule`). Het aandeel van de eerste giet komt van de belangrijkste passende regel die er een heeft (0,667 bij natural/honey met fruit, 0,333 bij chocolade en karamel).
5. Anders Kasuya (`fallback`).

## Wat de regels zien

| Regel | Kijkt naar |
|---|---|
| methode, proces, branding | de boonvelden in het logboek |
| smaakcategorie | de tags van de zaknotities (via het smaakwiel) |
| terugkerend zuur of hol | minstens 2 van de laatste 4 geproefde koppen van de zak met scherpe zuurgraad of een holle afdronk |
| droge afdronk | minstens 2 van de laatste 4 koppen met een droge afdronk |
| ongelijk doorlopen | niet af te leiden uit het logboek; de frontend geeft het mee als `feedback: ['uneven_drain']` |
| kleine kop | `cupG` ≤ 230 g |

## Meetopstelling

Elke zak heeft een verborgen beste techniek; een paar-proef kiest de variant als het kwaliteitsverschil plus ruis boven een gelijkspelband uitkomt. Een deel van de zakken (de 'regelnauwkeurigheid') heeft precies de techniek die de regeltabel voorstelt als beste, de rest een willekeurige. Zo is te meten wat de regels waard zijn én wat het kost als ze niet kloppen. 12 zakken × 10 koppen, 200 herhalingen. 'Spijt' is het gemiddelde kwaliteitsverlies per kop ten opzichte van de beste techniek (lager is beter).

| Wereld | Strategie | Spijt per kop | Op de beste techniek | Proeven per zak | Overbodige proeven | Koppen tot beste | Laatste kop op beste |
|---|---|---|---|---|---|---|---|
| regels kloppen deels (50 %) | altijd Kasuya | 0.78 | 22 % | 0.0 | — | 8.8 | 22 % |
| regels kloppen deels (50 %) | Engine 3 (regels + proeven) | 0.52 | 46 % | 0.8 | 8 % | 5.9 | 56 % |
| regels kloppen deels (50 %) | proef elke techniek | 0.70 | 25 % | 5.0 | 36 % | 5.8 | 10 % |
| regels kloppen deels (50 %) | orakel (kent de beste) | 0.00 | 100 % | 0.0 | — | 1.0 | 100 % |
| regels kloppen vaak (80 %) | altijd Kasuya | 0.74 | 26 % | 0.0 | — | 8.4 | 26 % |
| regels kloppen vaak (80 %) | Engine 3 (regels + proeven) | 0.37 | 60 % | 0.7 | 5 % | 4.3 | 74 % |
| regels kloppen vaak (80 %) | proef elke techniek | 0.70 | 26 % | 5.0 | 38 % | 5.7 | 9 % |
| regels kloppen vaak (80 %) | orakel (kent de beste) | 0.00 | 100 % | 0.0 | — | 1.0 | 100 % |
| regels kloppen niet (0 %) | altijd Kasuya | 0.84 | 15 % | 0.0 | — | 9.5 | 15 % |
| regels kloppen niet (0 %) | Engine 3 (regels + proeven) | 0.77 | 20 % | 0.8 | 14 % | 8.7 | 23 % |
| regels kloppen niet (0 %) | proef elke techniek | 0.71 | 24 % | 5.0 | 34 % | 6.0 | 14 % |
| regels kloppen niet (0 %) | orakel (kent de beste) | 0.00 | 100 % | 0.0 | — | 1.0 | 100 % |
| klein verschil tussen technieken | altijd Kasuya | 0.39 | 22 % | 0.0 | — | 8.8 | 22 % |
| klein verschil tussen technieken | Engine 3 (regels + proeven) | 0.29 | 41 % | 0.8 | 8 % | 5.9 | 48 % |
| klein verschil tussen technieken | proef elke techniek | 0.38 | 22 % | 5.0 | 29 % | 5.8 | 10 % |
| klein verschil tussen technieken | orakel (kent de beste) | 0.00 | 100 % | 0.0 | — | 1.0 | 100 % |
| veel ruis in de proef | altijd Kasuya | 0.78 | 22 % | 0.0 | — | 8.8 | 22 % |
| veel ruis in de proef | Engine 3 (regels + proeven) | 0.56 | 43 % | 0.7 | 9 % | 5.9 | 51 % |
| veel ruis in de proef | proef elke techniek | 0.74 | 22 % | 5.0 | 30 % | 5.8 | 10 % |
| veel ruis in de proef | orakel (kent de beste) | 0.00 | 100 % | 0.0 | — | 1.0 | 100 % |
| groot verschil tussen technieken | altijd Kasuya | 1.56 | 22 % | 0.0 | — | 8.8 | 22 % |
| groot verschil tussen technieken | Engine 3 (regels + proeven) | 0.96 | 49 % | 0.7 | 9 % | 5.9 | 61 % |
| groot verschil tussen technieken | proef elke techniek | 1.34 | 28 % | 5.0 | 41 % | 5.8 | 10 % |
| groot verschil tussen technieken | orakel (kent de beste) | 0.00 | 100 % | 0.0 | — | 1.0 | 100 % |

## Poort

- **Nergens meer spijt dan altijd Kasuya** (getest in alle zes werelden), met minder dan twee proeven per zak.
- **Meer winst naarmate de regels beter zijn:** bij 80 % juiste regels daalt de spijt van 0,74 naar 0,37; bij 50 % van 0,78 naar 0,52.
- **Overbodige proeven** (de controle was al de beste): 5–14 %.
- **Beter dan alles proberen** zodra de regels iets waard zijn. In een wereld waar de regels niets waard zijn wint alles proberen (spijt 0,72 tegen 0,77), maar dat kost 5 proeven per zak, dus de helft van de koppen in een zak van 10.

## Beperkingen

- De regels zijn praktijkkennis (bewijs E3), geen gecontroleerde studie. Daarom blijft elke afwijking een proef.
- Engine 3 stelt alleen kandidaten uit de passende regels voor. Zijn die op, dan blijft het Kasuya. Verkennen buiten de regels doet hij niet.
- De werelden zijn simulaties. Hoe goed de regels voor jouw smaak zijn, laten pas jouw eigen proeven zien. De frontend moet de proef kunnen aanbieden, blind laten kiezen en als `pair.trial` met `kind: 'technique'` vastleggen.
