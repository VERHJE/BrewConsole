# 03 · Datamodel: een logboek van gebeurtenissen

Bron van waarheid: `engine3/src/types.ts`. De regels staan in `engine3/src/events.ts`.

## Waarom een logboek

- **Niets gaat verloren.** Een correctie is een nieuwe gebeurtenis; de oude blijft bestaan.
- **Samenvoegen is eenvoudig.** Twee toestellen samenvoegen betekent: dubbele id's weg en sorteren op tijd. Er zijn geen conflicten over 'welke versie wint'. Dit is getoetst met fast-check: elke volgorde en elke dubbeling geeft hetzelfde resultaat.
- **De engine kan altijd opnieuw rekenen.** Een nieuwe engineversie leest hetzelfde logboek en komt tot een nieuwe toestand.

## Omhulsel (elke gebeurtenis)

| Veld | |
|---|---|
| `id` | uniek en stabiel |
| `at` | epoch-ms |
| `device` | toestel-id, of `migratie-v3` |
| `v` | schemaversie (1) |
| `kind` | soort gebeurtenis |
| `data` | inhoud |

## Soorten

| kind | data (kort) | Regel |
|---|---|---|
| `bean.upsert` | beanId, fields (deel van BeanFields), sources per veld, legacy | later vult aan of overschrijft per veld |
| `bean.archive` | beanId | zak is op of weg |
| `brew.plan` | brewId, beanId, goal, engine (naam en versie), recipe, trialId, legacy | één per zetsel |
| `brew.timer` | brewId, type, tSec, pourIndex | start, pauze, 'erdoor', bed droog, klaar of afgebroken |
| `brew.actuals` | brewId, werkelijke dosis, water, klik, bypass, kop, TDS, techniek | laatste wint |
| `tasting` | brewId, sterkte (−2…+2), zuur, afdronk, waardering, doel gehaald, vergelijking, gemist, blinde CATA, herkende notities, oude scores, notitie | laatste wint |
| `pair.trial` | trialId, soort, controle en variant, voorkeur, helderder | blinde proef |
| `setting` | water · grinder · brightLighter | laatste wint |
| `retract` | targetId, reden | trekt één gebeurtenis in |
| `brew.delete` | brewId | haalt een heel zetsel uit het effectieve logboek |

## Boonvelden

- **Basisgegevens:** name, roaster, country, region, farm, producer, variety, roastLevel, intendedUse, roastDate, openedDate, bagSizeG, cuppingScore, harvestYear en coordinates.
- **Hoogte** als bereik {minM, maxM}.
- **process** in drie assen:
  - base;
  - fermentation[] (anaerobic, carbonic_maceration, yeast_inoculated, lactic, co_fermented, thermal_shock, double_fermentation, other);
  - experimental;
  - decaf (sugarcane_ea, swiss_water, co2, other);
  - ambiguousTerm (bijvoorbeeld 'semi-washed').
- **notes** in drie lijsten:
  - raw: precies zoals op de zak;
  - tags: wieltags van de app;
  - unmapped: niet geraden.
- **sources:** bij elk veld staat waar het vandaan komt (user, paste, ocr, qr, ai of migrated).

## Eenheden

Gewicht in g (1 ml water = 1 g). Tijd binnen een zetsel in s, tijdstip in epoch-ms, datum als YYYY-MM-DD. Verder: °C, TDS in %, EY als fractie, klikken op de C3S Pro, en hoogte in m. Zie `engine3/src/units.ts`.

## Synchronisatie (bouwstap 0, zie 08)

1. **Lokaal (standaard):** het logboek gaat als bestand via het deelmenu naar iCloud Drive, en een ander toestel leest het weer in. Samenvoegen gebeurt met `mergeLogs`.
2. **Optioneel automatisch:** via een gratis Cloudflare Worker.
   - Elk blok gebeurtenissen wordt op het toestel versleuteld: AES-GCM met een sleutel uit een wachtwoordzin (PBKDF2). De toestelcheck bevestigt dat dit op de iPhone werkt (3–5 ms).
   - De Worker bewaart alleen onleesbare blokken.
   - Het gratis plan geeft 100.000 verzoeken per dag, 1 GB opslag en 1.000 schrijfacties per dag.
