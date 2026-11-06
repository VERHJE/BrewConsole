# 19 · Ontwerprichting (ronde 3)

Vastgesteld 6 nov 2026 als voorstel; de keuze ligt bij Jelle. Borden: `docs/engine3/ontwerp/bord-0-eisen.png`, `bord-1-zetten.png`, `bord-2-timer.png`, `bord-3-zakken.png` (bron: `maak-borden.mjs`, `node docs/engine3/ontwerp/maak-borden.mjs`). De schermen zijn echte HTML met de echte receptgetallen; foto's van zakken zijn illustraties tot er eigen foto's zijn.

## Besluiten van Jelle

- Richtingen uit het sfeerbord: **1 Quiet Luxury** (donker), **3 Organic Light** (licht), **6 Minimal Pro** (licht, alleen typografie), **8 Spatial Depth** (alleen de kaartenstapel voor zakken) en eventueel **10 Editorial Story** (herkomstverhaal van een zak).
- **Foto per zak: ja.**
- Beide lettertype-opties moeten zichtbaar zijn: A) serif voor koppen (Fraunces) met schreefloos (Inter) voor getallen en tekst, B) alles schreefloos.

## Wat 2026 vraagt (en wat standhoudt)

Veel trendartikelen zijn meningen van bureaus; harde cijfers zijn schaars.

| Trend | Besluit |
|---|---|
| Eenvoud en snelheid, duim-navigatie, licht én donker, haptiek en geluid | Overnemen (geluid bij een stap ontbreekt nog) |
| Expressief ontwerp (Material 3 Expressive: grotere cijfers, kleur en vorm voor hiërarchie) | Deels. Google meldt dat gebruikers hoofdzaken sneller vinden, maar waarschuwt zelf dat helderheid voorgaat |
| Doorschijnend glas over inhoud (iOS 26 Liquid Glass) | Niet. Kritiek op tekstcontrast over wisselende achtergronden; Apple voegde in iOS 26.1 een 'Tinted'-optie toe om het af te zwakken |
| AI-eerst | Niet (kostenbesluit) |

## Eisen aan elk ontwerp

- Tekstcontrast ≥ 4,5 : 1, bedieningselementen ≥ 3 : 1, in licht en donker; getest met axe (blijft zo).
- Tikvlakken ≥ 48 px (WCAG 2.2 vraagt minimaal 24 px). WCAG 2.1 AA is de wettelijke maat onder de Europese toegankelijkheidswet (EN 301 549); 2.2 AA is ons doel. (Bronnen spreken elkaar hierin deels tegen; vóór een beroep op de wet de W3C- en EC-teksten nalezen.)
- Tekstvergroting tot 200 % en 'minder beweging'.
- Tijd, doel en actie leesbaar op een armlengte: cijfers ≥ 22 px.
- Tekst over een foto krijgt altijd een donkere verloop-laag (≥ 55 %), nooit blur. Geen informatie alleen via kleur.
- Offline, geen laadsprongen. Het koppenlettertype laadt alleen voor koppen (subset), met terugval op Georgia.

## Foto per zak (technisch)

- Optioneel; zonder foto staat er een getekende zak met de naam.
- De foto blijft **op het toestel** (IndexedDB), verkleind: lange zijde 1080 px, WebP, ≲ 150 kB. Camera of fotobibliotheek.
- **Niet in de synchronisatieblokken** (limiet ≈ 900 kB per blok), of alleen als kleine miniatuur.
- Verwijderen met één tik; in de back-up optioneel.
- Hero-foto's voor Zetten: de bestaande beelden van de V60 en Chemex uit de oude app (`photos/`).

## Open keuzes

1. Eén richting als basis, of de combinatie: 6 voor Zetten en Timer, 3 als licht thema, 1 als donker thema, 8 en 10 voor de zakken.
2. Serif voor koppen of alles schreefloos.
3. Of het donkere thema een volwaardig tweede thema wordt naast licht (nu volgt de app het toestel).
