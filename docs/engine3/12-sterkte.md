# 12 · Sterkte (bouwstap 3)

Code: `engine3/src/strength.ts` · tests: `engine3/test/strength.test.ts` · uitvoer van de meetopstelling: `engine3/eval/e3-strength-200.json`

`strengthPlan(feiten, { method, waterG, beanId, baselineDoseG })` geeft de dosis voor deze kop, het doel in % TDS, de verhouding, een band, de modus (`start`, `zoeken`, `rust`), de afwijking per zak, een kalibratiepaar en het hele spoor van beslissingen.

## Keuze: eerst gelijk aan Engine 2

De nulmeting (06) laat zien dat sterkte bijna verzadigd is: Engine 2 haalt 46 van de 52 % die maximaal kan. Een nieuw model kan hooguit een paar punten winnen. Daarom is deze module voorlopig dezelfde rekenkunde als Engine 2 (e2-2026.5), overgezet naar TypeScript en gelezen uit het logboek in plaats van uit de app:

- een rooster-posterior over je voorkeur (ln TDS), gemiddeld over vijf hellingen;
- een geordende probit per oordeel (−2…+2, ruis 0,70);
- blinde paren (Thurstone), te sterk kost 1,8× meer dan te slap;
- verschuiven alleen bij 70 % kans (0,85 in rust) op minstens een halve stap van 4 %, hooguit twee stappen, en nooit tegen het antwoord in;
- afwijking per zak (pas vanaf 3 koppen), laat geproefd of bypass telt half, vergeten met een halfwaardetijd van 30 koppen;
- gemeten TDS (0,4–2,5 %), gemeten vasthouden (vanaf 5 koppen met kopgewicht) en gemeten extractie (vanaf 3 metingen), anders 2,1 en 20 %.

## Wat nieuw is

- De startdosis (`baselineDoseG`) komt van de aanroeper. In `plan()` (stap 8) wordt dat de referentieverhouding van de gekozen techniek, bijvoorbeeld Kasuya 1:15.
- Het geheugen van de beslisregel zit in de module zelf. Een test laat zien dat het de uitkomst nooit verandert.
- Bijgevuld water (`dilutionG`) wordt uit het oude plan gelezen en toegepast.

## Poort (06)

| Wereld | Engine 2 | Engine 3 | Tegen het oordeel in |
|---|---|---|---|
| basis | 46,3 % | 46,4 % | 0 % |
| veel ruis | 32,6 % | 32,3 % | 0 % |
| vlak oordeel | 49,1 % | 49,1 % | 0 % |
| scheef | 44,3 % | 44,3 % | 0 % |
| voorkeur drift | 45,3 % | 45,2 % | 0 % |
| zakken verschillen veel | 42,7 % | 42,6 % | 0 % |

(200 herhalingen per wereld; 'koppen tot eerste goede' en afwijking in de tweede helft zijn ook gelijk.) Met de bewaking tegen het laatste antwoord (zie hieronder) verschilt 'precies goed' hooguit 0,24 punt van Engine 2, ruim binnen de eis van 1 punt. Een test speelt in alle zes werelden drie volledige reeksen af en eist dat de dosis gelijk is aan die van Engine 2 voor de derde kop van elke zak, en daarna in minstens 97 % van de koppen.

## Eén bewuste afwijking van Engine 2

Een afwijking per zak (pas vanaf 3 koppen van die zak) die de andere kant op wijst dan het laatste antwoord over die zak, wordt niet toegepast. Voorbeeld: te sterk, te sterk, te slap: Engine 2 verlaagt dan nog eens via de zak, terwijl je net 'te slap' zei. In de meetopstelling kwam Engine 2 daardoor in 0,05–0,23 % van de stappen tegen het oordeel in; Engine 3 in 0 %. Het kost tot 0,24 punt 'precies goed' (veel ruis 32,6 → 32,3 %) en de dosisstap wordt iets groter (0,12 → 0,13 g).

## Wat nog niet is overgezet

Bewust niet in deze stap, want het hoort bij een andere module of de app:

- het tijdmodel en het maaleffect per klik (stap 4);
- proeftips en proefuitkomsten (stap 5);
- de dosisgrens van het toestel en het dilutie-advies in de app (frontend).

## Ruimte om te verbeteren

De nulmeting wijst twee plekken aan: voorkeur die driftt (45 tegenover 52 %) en zakken die veel verschillen (43 tegenover 52 %). Dat kan later, met dezelfde meetopstelling als scheidsrechter.
