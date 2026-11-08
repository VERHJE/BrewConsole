# 17 · Smaakprofiel (bouwstap 7)

Code: `engine3/src/profile.ts` · tests: `engine3/test/profile.test.ts`

`tasteProfile(feiten)` leest alle geproefde koppen en vat samen wat jij opmerkt en waardeert. `beanFit(feiten, profiel, zakId)` zegt hoe goed een zak past bij wat je waardeert. Alles is herleidbaar uit het logboek (zuiver, volgorde en dubbelingen maken niet uit).

**Dit stuurt het recept niet.** `plan()` leest niets hiervan. Een test geeft twee logboeken met alleen verschillende keuzevakjes, herkende notities, waardering en notitie en eist hetzelfde advies. Het profiel is bedoeld om te tonen en om zakken te vinden die bij je passen.

## Wat erin zit

| Onderdeel | Betekenis |
|---|---|
| **Gevoeligheid per categorie** (9 smaakwiel-categorieën) | Van de koppen waarbij de zak de categorie vermeldt: hoe vaak vink je hem blind aan (treffers)? Van de koppen waarbij de zak hem niet vermeldt: hoe vaak toch (valse alarmen)? Daaruit `recall`, `falseAlarmRate` en `skill` (treffers min valse alarmen). |
| **Status per categorie** | `picks_up` (je merkt hem op en vinkt niet te veel aan), `misses` (minder dan een derde van de keren), `overcalls` (meer dan de helft aangevinkt terwijl de zak hem niet noemt), `mixed`, `unknown` (te weinig zakken: minder dan 3) |
| **Herkende notities** | Per notitie hoe vaak 'ja', 'een beetje' en 'nee', en een score; de **woordenschat** zijn notities die je minstens twee keer herkende (score ≥ 0,67) |
| **Waardering** (1–5) | Gemiddelde per smaakcategorie, proces en brandingklasse, naar het algemene gemiddelde getrokken met het gewicht van drie koppen, zodat één kop weinig zegt. Onder de 3 koppen: `reliable: false` |
| **Tendensen** | Zuurgraad, afdronk, wat je miste en het aandeel laat geproefd |

## Blinde keuze: is de vraag gesteld?

Een lege lijst kan 'niets aangevinkt' betekenen of 'de vraag is niet gesteld' (de migratie van de oude app heeft er geen). Daarom heeft `tasting` sinds deze stap een optioneel veld `cataAsked`. Zonder dat veld geldt: gesteld als er iets is aangevinkt of er herkende notities zijn. Dit is een kleine, optionele toevoeging aan het contract (1.0): bestaande gebeurtenissen blijven geldig. De frontend moet `cataAsked: true` schrijven zodra de keuzevraag getoond is, ook als de lijst leeg blijft.

De expliciete categorieën van de zak komen uit de tags van de zaknotities. Notities zonder tag (`unmapped`) tellen niet mee: daar is geen categorie voor.

## Passen bij je smaak

`beanFit` neemt de categorieën, het proces en de brandingklasse van een zak en middelt het (bijgetrokken) verschil in waardering van de kenmerken met minstens 3 waarderingen. Is er niets betrouwbaars, dan is het resultaat `null` in plaats van een gok.

## Getoetst

- Telling van treffers, valse alarmen, gesteld en niet gesteld; de vijf statussen; woordenschat; bijtrekken van kleine aantallen; volgorde en dubbelingen.
- Een simulatie van een proever met bekende treffers en valse alarmen (240 koppen over 12 zakken): de geschatte `recall` en `falseAlarmRate` komen binnen 0,12 van de waarheid, en de statussen kloppen (fruitig pakt op, bloemig mist, zoet overcalls).
- Op de gemigreerde back-up werkt het profiel zonder fouten. Die heeft nog geen blinde keuzes, dus alles is `unknown`.

## Beperkingen

- Een profiel heeft veel koppen nodig. Met 5 à 10 zakken en een keuzevraag bij elke kop is het over een paar maanden bruikbaar; tot die tijd staat er vooral `unknown`.
- 'Valse alarmen' gaan ervan uit dat de notities op de zak volledig zijn. Een zak die een categorie niet noemt maar toch heeft, geeft een valse alarm. Daarom is `overcalls` een aanwijzing, geen oordeel.
