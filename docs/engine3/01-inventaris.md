# 01 · Inventaris van de huidige app

Stand: `brewconsole_v2_2.html` op main na PR #40 (5 november 2026). Engine 2 heeft versie e2-2026.5; de hash van de oude rekenkern (de engine-bundle) is 1b13e449b38e07ee.

## Opslag (localStorage)

| Sleutel | Inhoud | Naar Engine 3 |
|---|---|---|
| `brewconsole_beans` | bonen (recordschema 5) | `bean.upsert` |
| `brewconsole_brews` | zetsels (recordschema 6) | `brew.plan`, `brew.timer`, `brew.actuals`, `tasting`, `brew.delete` |
| `brewConsoleLog` | oude platte logregels (schema 1–5); alleen nog migratiebron | idem, als ze niet al als v6 bestaan |
| `brewconsole_ab_trials` | blinde paren | `pair.trial` |
| `brewconsole_water_hardness` | hardheid, alkaliniteit, menging | `setting` (water) |
| `brewconsole_bright_lighter` | eigen keuze na blinde proef | `setting` (brightLighter) |
| `brewconsole_e2_trial` | lopende Engine 2-proef | niet (wordt een proef in Engine 3) |
| `brewconsole_theme` en andere schermvoorkeuren | frontend | niet |

## Back-up (backupVersion 3)

`{ app, backupVersion: 3, exportedAt, beans[], brews[], brewLog[], theme, waterHardnessMgL, waterAlkalinity, waterDilution, abTrials[], brightLighter }`

### Boon (schema 5)

- **Velden:** id, name, roaster, country, region, farm, process, variety, flavorNotes[], roastLevel, intendedUse, roastDate, openedDate, altitude, bagSizeG, experimental en decaf (nieuw in PR #40).
- **App-eigen velden:** profileKey, flavorScores, fermentEvidence, goal, favorite, stands, pendingAdjust, lastBrew, doseUsedG, addedAt en schemaVersion. Deze gaan ongewijzigd mee in `legacy`.

### Zetsel (schema 6)

- **plan:** methodId, profileId, roastId, waterMl, doseG, tempC, grindStartingPoint, grindStand, grindTarget, technique, steps[{t, add}], expectedTotalSec, expectedDrainEndSec, bypass{pct, pourWaterG, plannedG, moment}, inputs, appliedAdjust, modelPolicyVersion en drainMode.
- **actual:** doseG, grindClick, cupWeightG, bypassActualG, tdsPct, bedDrySec, completedAt, confirmed, en events[].
  - De events zijn start, pause, resume, drained, drained_undo, bed_dry, complete, abandon, log en recovered.
  - Bij `drained` hoort een stepIndex.
- **tasting:** strength, acidity, finish[], liking, goalHit, vsLast, missed, late, minutesAfterBrew en note. Oude zetsels hebben daarnaast scores{aroma, zuur, zoet, body, bitter, aftersmaak, balans}.
- **Overig:** lifecycle (brewing, completed, logged, abandoned), deletedAt (zacht verwijderd, 30 dagen), diagnosis, recommendation en derived.

### Vaste lijsten

| Lijst | Waarden |
|---|---|
| Sterkte | much_too_weak · too_weak · just_right · too_strong · much_too_strong |
| Zuur | flat · lively · sharp |
| Afdronk | sweet_clean · bitter · drying · hollow |
| Gemist | fruit · sweet · body · less_bitter · unsure |
| Doelen | bright · balanced · rich |
| Branding | light · light_medium · medium · medium_dark · dark |
| Proces | washed · natural · honey · anaerobic · wet_hulled · overig |

## Engine 2 (e2-2026.5)

De volledige beschrijving staat in [docs/engine2.md](../engine2.md). De kern:

- een posterior op een rooster van ln-TDS;
- ordinaal-probit met slopes [1,61, 3, 5, 8, 12] als modelgemiddelde en ruis 0,7;
- beslisregel met drempels 0,70 en 0,85, en per kop hooguit 2 halve stappen (ln 1,04);
- zakafwijking met prior-sd 0,05;
- massabalans met R 2,1 g/g en EY 0,20;
- een tijdmodel.

Engine 3 neemt hieruit over: de massabalans (`engine3/src/units.ts`) en de sterkte-aanpak als startpunt (zie 06).

## Jelles back-up (28 oktober 2026, alleen tellingen)

| | Aantal |
|---|---|
| Bonen | 5 |
| Zetsels (v6) | 22 |
| Oude logregels | 12, allemaal al als v6 aanwezig |
| Geproefd | 12, waarvan 9 met een sterkte-oordeel |
| Blinde paren | 0 |
| 'Erdoor'-tikken | 0 |

Er zijn nog geen 'erdoor'-tikken en geen blinde paren. Voor het molenmodel en de proeven is dus nog geen eigen data, alleen de 17 eindtijden die al eerder gebruikt zijn.
