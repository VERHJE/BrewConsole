# 05 · Technieken en regeltabel

Data: `engine3/src/data/techniques.ts` en `engine3/src/data/selection-rules.ts`. Elk getal komt uit de genoemde bron. Waar de bron iets niet zegt, staat null of een gemarkeerde plaatshouder.

## De acht technieken

| Techniek | Bron (klasse) | Referentie | Einde | Assen (agitatie · structuur · extractie) |
|---|---|---|---|---|
| Kasuya 4:6 | Hario Europe + Philocoffea (A/B) | 20/300; 0:00 50 · 0:45 120 · 1:30 180 · 2:10 240 · 2:40 300 | 3:30 | gemiddeld · twee fasen · normaal |
| Hoffmann Ultimate | Hario USA (A/B) | 30/500, net van de kook (donker 88 °C, C); bloom 60 + swirl · 0:45→300 · 1:15→500 + roeren | 3:30 | gemiddeld · weinig gieten · normaal |
| Gagné | Coffee ad Astra (A) | 22/352, kokend; 66 + Rao spin · 0:30→~200 · →352 | 2:30–3:30 | gemiddeld · weinig gieten · hoog |
| Wendelboe | timwendelboe.no (A; temperatuur C) | 65 g/l, 96 °C (aanname); 60 + roeren · 0:30→200 · rondjes →500 | 3:00–3:30 | gemiddeld · doorlopend · normaal |
| Osmotic Flow | European Coffee Trip (C) | alleen in het midden, bolle korst; 20/250 of 15/225 | — | zeer laag · doorlopend · normaal |
| April | eigen gids (A; temperatuur C) | 20/300, 6 × 50 g op 0:00, 0:40, 1:10, 1:40, 2:10, 2:40; 92 °C | 3:20–3:30 | hoog · gelijke pulsen · normaal |
| Hedrick One and Done | Gota (B) | 15/225, 93 °C; 45 · 0:30→90 · 1:00→225 krachtig in het midden, niet swirlen | 2:00–2:30 | laag · één hoofdgiet · normaal |
| Rao Spin | Hario UK (A/B) | 20/330, 97 °C; 60 + krachtige spin · 0:40→200 · bij ~70 % doorgelopen →330 | 4:00–4:30 | gemiddeld · weinig gieten · hoog |

Perger 80/20 is een beslisregel, geen recept.

## Regeltabel voor de starttechniek

| Prioriteit | Als | Voorstel → proef | Kasuya eerste giet | Bewijs |
|---|---|---|---|---|
| 100 | Chemex | Hoffmann | — | besluit |
| 90 | licht/light-medium, en herhaald zuur of hol | Gagné → Kasuya | — | E3 |
| 85 | ongelijk doorlopen of droge afdronk | Rao → Kasuya | — | E3 |
| 60 | bloemige of theenotities | Wendelboe (eigen recept) → Kasuya | — | E3; besluit |
| 55 | natural/honey met fruit | Kasuya → Osmotic Flow | 0,667 (80 + 40, helderder) | E3; verdeling Gota (B) |
| 50 | chocolade, karamel, noot, zoet | April → Kasuya | 0,333 (40 + 80, zoeter) | E3; verdeling Gota (B) |
| 20 | kop ≤ 230 g | Kasuya → Hedrick | — | E3 |
| 0 | anders | Kasuya | 50 + 70 (Hario) | besluit |

Eigen uitkomsten gaan altijd boven deze tabel. Een gewonnen proef wint, voor die zak en voor vergelijkbare koffies.

## Open punten bij de technieken

1. ~~**Wendelboe past niet bij zijn rol.**~~ **Besloten (5 nov 2026):** Wendelboe houdt de rol voor bloemige en theeachtige koffies, met zijn eigen recept (bloom roeren, doorlopend in rondjes). Er komt geen 'lage agitatie'-variant, en de verzonnen namen 'Serene pulse' en 'Nordic light' vervallen.
2. **Osmotic Flow heeft geen gietschema.** Hij kan pas een proefkandidaat worden met eigen metingen, of als er een betrouwbare bron gevonden wordt.
3. **Plaatshouders in de tijden.** Bij Gagné (laatste giet), Wendelboe (derde stap) en Rao (laatste giet, die aan het doorlopen hangt) staat een tijd die de bron niet geeft. Die is gemarkeerd in de data. Bij die gieten moet `waitForDrain` de regel worden, niet de klok.
4. ~~**Hoffmann en Wendelboe noemen geen temperatuur.**~~ **Opgezocht (5 nov 2026):**
   - **Hoffmann:** Hario USA: 'the hotter, the better (especially with lighter roasts)'. Secundaire gidsen zeggen eensgezind 'net van de kook'. Licht en medium: 100 °C op de ketel. Donker: 88 °C, alleen uit een secundaire bron (klasse C).
   - **Wendelboe:** zijn eigen gids zegt alleen 'hot water'. Er is geen primair getal te vinden. Het beste alternatief is 96 °C (klasse C, aanname): zijn café zet de AeroPress met 96 °C uit de boiler, en recepten-sites die zijn gids overnemen noemen 96 °C. Bij donkere branding geldt de Philocoffea-regel (88/83 °C) als terugval.
   - Een eigen proef (96 tegen 100 °C) kan de aanname bij Wendelboe vervangen.
