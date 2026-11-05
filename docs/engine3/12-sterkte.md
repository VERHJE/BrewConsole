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
| basis | 46 % | 46 % | 0 % |
| veel ruis | 33 % | 33 % | 0 % |
| vlak oordeel | 49 % | 49 % | 0 % |
| scheef | 44 % | 44 % | 0 % |
| voorkeur drift | 45 % | 45 % | 0 % |
| zakken verschillen veel | 43 % | 43 % | 0 % |

(200 herhalingen per wereld; 'koppen tot eerste goede', afwijking in de tweede helft en dosisstap zijn ook gelijk.) Een test speelt bovendien in alle zes werelden twee volledige reeksen (8 zakken × 10 koppen) af en eist dat Engine 3 **bij elke kop dezelfde dosis** geeft als Engine 2. Dat is strenger dan de eis uit het bouwplan (maximaal 1 punt verlies).

## Wat nog niet is overgezet

Bewust niet in deze stap, want het hoort bij een andere module of de app:

- het tijdmodel en het maaleffect per klik (stap 4);
- proeftips en proefuitkomsten (stap 5);
- de dosisgrens van het toestel en het dilutie-advies in de app (frontend).

## Ruimte om te verbeteren

De nulmeting wijst twee plekken aan: voorkeur die driftt (45 tegenover 52 %) en zakken die veel verschillen (43 tegenover 52 %). Dat kan later, met dezelfde meetopstelling als scheidsrechter.
