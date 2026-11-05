# 04 · Migratie van de huidige back-up

Code: `engine3/src/migrate/v3.ts` · tests: `engine3/test/migrate.test.ts`

## Regels

- **Niets verzinnen.** Een ontbrekende of ongeldige waarde wordt null. Een kapotte datum wordt null, niet geraden.
- **Niets weggooien.** Wat in Engine 3 geen vaste plek heeft, gaat ongewijzigd in `legacy`. Het rapport meldt wat niet over te zetten was.
- **Deterministisch.** De id's worden afgeleid van de bron, bijvoorbeeld `mig:brew:<id>:plan`. Twee keer importeren of twee toestellen samenvoegen geeft dus geen dubbelen.
- **Geen frontendinstellingen.** Thema, gesproken aanwijzingen en dergelijke gaan niet mee.

## Van bron naar gebeurtenis

| Bron | Gebeurtenis | Bijzonderheden |
|---|---|---|
| bean | `bean.upsert` | proces 'anaerobic' → base unknown + fermentation [anaerobic]; flavorNotes gesplitst in tags en unmapped; hoogte als bereik; profileKey, favorite, doseUsedG, stands en dergelijke in legacy |
| brew.plan | `brew.plan` | 'Kasuya 4:6' → kasuya_46, andere namen → `legacy:<naam>`; steps → pours (cumulatief); grindTarget, anders grindStartingPoint; diagnosis, recommendation, appliedAdjust, inputs en derived in legacy |
| brew.actual.events | `brew.timer` | start, pause, resume, drained (stepIndex → pourIndex), drained_undo, bed_dry, complete, abandon; 'log' en 'recovered' vallen weg (dat zijn app-boekhouding) |
| actual.bedDrySec zonder bed_dry-event | `brew.timer` (bed_dry) | |
| actual.* | `brew.actuals` | alleen als er minstens één werkelijke waarde is |
| tasting | `tasting` | sterkte → −2…+2; oude scores in legacyScores |
| deletedAt | `brew.delete` | |
| brewLog-regel die al als v6 bestaat | — | geteld als legacy_duplicate |
| brewLog-regel zonder v6 | `brew.plan` + `brew.actuals` + `brew.timer` + `tasting` | |
| abTrials | `pair.trial` (kind strength) | |
| waterHardness/Alkalinity/Dilution | `setting` water | |
| brightLighter | `setting` brightLighter | |

## Getoetst op Jelles back-up (lokaal, niet in de repo)

| | |
|---|---|
| Gebeurtenissen | 105 (5 bonen, 20 plannen, 56 timer, 10 werkelijke waarden, 12 proeven, 2 instellingen) |
| Ongeldige gebeurtenissen | 0 |
| Twee keer migreren | identiek |
| Proeven | 12 van de 12 over, 9 met sterkte (gelijk aan de bron) |
| Meldingen | 2: oude logregels zonder dosis, dus zonder plan (de proef blijft bewaard) |
