// Verzonnen back-up in de vorm van backupVersion 3 (geen echte gegevens van Jelle).
export const BACKUP_V3 = {
  app: 'brew-console', backupVersion: 3, exportedAt: '2026-10-28T10:00:00.000Z',
  beans: [
    { id: 'bean_1', name: 'Kenia Test', roaster: 'Brander X', country: 'Kenia', region: 'Nyeri', farm: '', process: 'washed', variety: 'SL28',
      flavorNotes: ['Zwarte thee', 'Cassis / zwarte bes', 'aloe vera'], roastLevel: 'light', experimental: false, roastDate: '2026-10-01', altitude: 1800,
      addedAt: 1790000000000, openedDate: null, intendedUse: 'filter', bagSizeG: 250, schemaVersion: 5 },
    { id: 'bean_2', name: 'Anaeroob', process: 'anaerobic', experimental: true, decaf: true, roastLevel: 'medium', flavorNotes: [], addedAt: 1790000001000, altitude: null, roastDate: 'geen datum' }
  ],
  brews: [
    { id: 'brew_a', schemaVersion: 6, createdAt: 1790100000000, updatedAt: 1790100400000, lifecycle: 'logged', beanId: 'bean_1', goal: 'balanced',
      plan: { modelPolicyVersion: 'e2-2026.5', methodId: 'v60', waterMl: 300, doseG: 16.4, tempC: 93, technique: 'Kasuya 4:6', grindTarget: 16,
        steps: [{ t: 0, add: 50 }, { t: 45, add: 70 }, { t: 90, add: 60 }, { t: 130, add: 60 }, { t: 160, add: 60 }], expectedTotalSec: 210, expectedDrainEndSec: 210, bypass: null },
      actual: { doseG: 16.3, grindClick: 16, cupWeightG: null, bypassActualG: null, tdsPct: null, bedDrySec: 241, completedAt: 1790100241000,
        events: [{ type: 'start', at: 1790100000000, tSec: 0 }, { type: 'drained', at: 1790100100000, tSec: 100, stepIndex: 2 }, { type: 'log', at: 1790100300000 }, { type: 'complete', at: 1790100241000, tSec: 241 }] },
      tasting: { at: 1790100400000, minutesAfterBrew: 5, strength: 'too_strong', acidity: 'lively', finish: ['bitter'], liking: 3, goalHit: 'almost', vsLast: null, missed: 'sweet', late: false, note: 'iets fel' },
      deletedAt: null },
    { id: 'brew_b', schemaVersion: 6, createdAt: 1790200000000, updatedAt: 1790200000000, lifecycle: 'abandoned', beanId: 'bean_1',
      plan: { methodId: 'v60', waterMl: 300, doseG: 16.4, steps: null }, actual: { events: [{ type: 'start', at: 1790200000000, tSec: 0 }, { type: 'abandon', at: 1790200050000, tSec: 50 }] },
      tasting: null, deletedAt: 1790300000000 }
  ],
  brewLog: [
    { id: 'brew_a', timestamp: 1790100000000, method: 'v60', waterMl: 300, doseG: 16.4 },
    { id: 'log_old', timestamp: 1789000000000, beanId: 'bean_1', method: 'chemex', waterMl: 500, doseG: 30, temp: 94, grindStartingPoint: 20,
      actualDoseG: 30.1, actualGrindClicks: 21, bedDrySec: 290, scores: { aroma: 7, zuur: 6 }, note: 'oude score' }
  ],
  abTrials: [
    { id: 'ab_1', createdAt: 1790400000000, beanId: 'bean_1', method: 'v60', waterMl: 300, controlDose: 16.4, variantDose: 15.8, preferred: 'variant', brighter: 'control' }
  ],
  theme: 'dark', waterHardnessMgL: 120, waterAlkalinity: { value: null, unit: 'CaCO3' }, waterDilution: { tapParts: 1, demiParts: 1 }, brightLighter: false
};
