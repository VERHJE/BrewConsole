// Engine 3 · publieke ingang. Nog zonder rekenlogica: dit is het contract waar de bouw aan moet
// voldoen, plus de onderdelen die al klaar zijn (eenheden, logboek, migratie, techniekdata).
export const ENGINE3_CONTRACT_VERSION = 'e3-contract-0.1' as const;

export type * from './types.ts';
export { EVENT_SCHEMA_VERSION } from './types.ts';
export * from './units.ts';
export { validateEvent, mergeLogs, effectiveEvents, compareEvents } from './events.ts';
export type { ValidationIssue } from './events.ts';
export { migrateBackupV3, MIGRATION_DEVICE } from './migrate/v3.ts';
export type { MigrationReport } from './migrate/v3.ts';
export { TECHNIQUES, TECHNIQUE_BY_ID, PERGER_8020_NOTE } from './data/techniques.ts';
export type { TechniqueDef, SourceClass } from './data/techniques.ts';
export { SELECTION_RULES } from './data/selection-rules.ts';
export type { SelectionRule, RuleWhen } from './data/selection-rules.ts';
export { FLAVOR_WHEEL, TAG_CATEGORY } from './data/flavor-wheel.ts';
export { learnFacts, factsOf, cupsOf, countsBy } from './state.ts';
export type { FactState, CupFacts, BeanFacts, CupFilter } from './state.ts';
