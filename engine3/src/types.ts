// Engine 3 · contract en datamodel (concept, nov 2026).
//
// Twee lagen:
//   1. Het LOGBOEK: alles wat er gebeurt is een losse, onveranderlijke gebeurtenis (EngineEvent).
//      Er wordt alleen toegevoegd. Correcties zijn nieuwe gebeurtenissen (latere wint, of 'retract').
//      Dat maakt samenvoegen tussen toestellen eenvoudig: dedupliceren op id, sorteren op tijd.
//   2. De ENGINE: twee pure functies. learn(logboek) → toestand, plan(toestand, vraag) → advies.
//      Geen scherm, geen opslag, geen netwerk, geen klok (de tijd komt mee in de vraag).
//
// Zie docs/engine3/02-contract.md en 03-datamodel.md voor de toelichting per veld.

import type { Band, Celsius, Clicks, EpochMs, EyFraction, Grams, IsoDate, Metres, Seconds, TdsPct } from './units.ts';

// ───────────────────────────── vaste lijsten ─────────────────────────────

export type Method = 'v60' | 'chemex';

/** De acht V60-technieken uit het verslag ('Technieken: de keuze voor de herbouw') en de zes Chemex-recepten uit het onderzoek. */
export type TechniqueId =
  | 'kasuya_46'
  | 'hoffmann_ultimate'
  | 'gagne'
  | 'wendelboe'
  | 'osmotic_flow'
  | 'april'
  | 'hedrick_one_and_done'
  | 'rao'
  | 'chemex_howell_cup'
  | 'chemex_verve'
  | 'chemex_pull_pour'
  | 'chemex_barefoot'
  | 'chemex_stumptown'
  | 'chemex_blue_bottle'
  | 'chemex_onyx'
  | 'chemex_hedrick'
  | 'chemex_ox';

/** Oude of onbekende technieknamen uit de huidige app blijven bewaard als tekst. */
export type TechniqueRef = TechniqueId | `legacy:${string}`;

export type RoastLevel = 'light' | 'light_medium' | 'medium' | 'medium_dark' | 'dark';
export type IntendedUse = 'filter' | 'espresso' | 'omni';

/** Proces in drie assen (verslag punt 2 + punt 3). */
export type ProcessBase = 'washed' | 'natural' | 'honey' | 'wet_hulled' | 'unknown';
export type Fermentation =
  | 'anaerobic'
  | 'carbonic_maceration'
  | 'yeast_inoculated'
  | 'lactic'
  | 'co_fermented'
  | 'thermal_shock'
  | 'double_fermentation'
  | 'other';
export type DecafMethod = 'sugarcane_ea' | 'swiss_water' | 'co2' | 'other';

/** De 9 hoofdcategorieën van het SCA/WCR-smaakwiel (CVA-keuzevakjes); de sleutels van de huidige app. */
export type WheelCategory =
  | 'fruitig'
  | 'zuur_gefermenteerd'
  | 'groen_plantaardig'
  | 'overig'
  | 'geroosterd'
  | 'specerijen'
  | 'notig_cacao'
  | 'zoet'
  | 'bloemig';

/** Sterkte-oordeel: −2 veel te slap … +2 veel te sterk. */
export type StrengthOrd = -2 | -1 | 0 | 1 | 2;
export type Acidity = 'flat' | 'lively' | 'sharp';
export type Finish = 'sweet_clean' | 'bitter' | 'drying' | 'hollow';
/** 1–5 sterren in stappen van een kwart (zie liking.ts); hele sterren uit oudere logboeken blijven geldig. */
export type Liking = number;
export type Goal = 'bright' | 'balanced' | 'rich';
export type GoalHit = 'yes' | 'almost' | 'no';
export type VsLast = 'better' | 'same' | 'worse';
export type Missed = 'fruit' | 'sweet' | 'body' | 'less_bitter' | 'unsure';
export type NoteHit = 'yes' | 'bit' | 'no';

/** Waar een boonveld vandaan komt (de controlekaart toont dit per veld). */
export type FieldSource = 'user' | 'paste' | 'ocr' | 'qr' | 'ai' | 'migrated';

// ───────────────────────────── de boon ─────────────────────────────

export interface BeanProcess {
  readonly base: ProcessBase;
  readonly fermentation: readonly Fermentation[];
  readonly experimental: boolean;
  readonly decaf: DecafMethod | null;
  /** Een term die niet eenduidig is en dus niet geraden werd, bv. 'semi-washed'. */
  readonly ambiguousTerm: string | null;
}

export interface BeanNotes {
  /** Precies zoals op de zak, in volgorde. */
  readonly raw: readonly string[];
  /** Herkende tags van het wiel (huidige app-tags, bv. 'Zwarte thee'). */
  readonly tags: readonly string[];
  /** Notities zonder tag: niet geraden, wel bewaard (bv. 'aloe vera'). */
  readonly unmapped: readonly string[];
}

export interface BeanFields {
  readonly name: string;
  readonly roaster: string | null;
  readonly country: string | null;
  readonly region: string | null;
  readonly farm: string | null;
  readonly producer: string | null;
  readonly variety: string | null;
  readonly process: BeanProcess;
  readonly roastLevel: RoastLevel | null;
  readonly intendedUse: IntendedUse | null;
  readonly altitude: { readonly minM: Metres; readonly maxM: Metres } | null;
  readonly notes: BeanNotes;
  readonly roastDate: IsoDate | null;
  readonly openedDate: IsoDate | null;
  readonly bagSizeG: Grams | null;
  readonly cuppingScore: number | null;
  readonly harvestYear: number | null;
  readonly coordinates: { readonly lat: number; readonly lon: number } | null;
  /** Waar je deze zak (opnieuw) koopt: een http(s)-adres (contract 1.2). */
  readonly shopUrl?: string | null;
}
export type BeanFieldKey = keyof BeanFields;

// ───────────────────────────── het recept ─────────────────────────────

export type PourStyle = 'spiral' | 'center' | 'circles';
export type Agitation = 'none' | 'swirl' | 'gentle_swirl' | 'stir' | 'rao_spin';

export interface Pour {
  /** Moment waarop deze giet begint (klok), in s vanaf de start. */
  readonly atSec: Seconds;
  /** Hoeveel water er bij deze giet bij komt. */
  readonly addG: Grams;
  /** Totaal op de weegschaal na deze giet. */
  readonly toG: Grams;
  readonly style: PourStyle;
  readonly agitationAfter: Agitation;
  /** Wacht tot het bed (bijna) droog is als dat later is dan atSec (Philocoffea-regel bij Kasuya). */
  readonly waitForDrain: boolean;
}

export interface Recipe {
  readonly technique: TechniqueRef;
  readonly method: Method;
  readonly doseG: Grams;
  /** Water door het bed (zonder bypass). */
  readonly waterG: Grams;
  /** Water dat na afloop wordt toegevoegd (verdunnen), 0 als er geen bypass is. */
  readonly bypassG: Grams;
  readonly tempC: Celsius | null;
  readonly grindClick: Clicks | null;
  readonly pours: readonly Pour[];
  /** Verwacht einde (bed droog), met band. */
  readonly expectedEndSec: Band<Seconds> | null;
}

// ───────────────────────────── het logboek ─────────────────────────────

export const EVENT_SCHEMA_VERSION = 1 as const;

interface EventEnvelope<K extends string, D> {
  /** Uniek en stabiel (ook bij migratie: dezelfde bron geeft dezelfde id). */
  readonly id: string;
  readonly at: EpochMs;
  /** Herkomst: toestel-id of 'migratie-v3'. */
  readonly device: string;
  readonly v: typeof EVENT_SCHEMA_VERSION;
  readonly kind: K;
  readonly data: D;
}

export interface EngineStamp {
  readonly name: string;
  readonly version: string;
}

export type BeanUpsertEvent = EventEnvelope<'bean.upsert', {
  readonly beanId: string;
  /** Alleen de velden die veranderen; ontbrekende velden blijven zoals ze waren. */
  readonly fields: Partial<BeanFields>;
  readonly sources: Partial<Record<BeanFieldKey, FieldSource>>;
  /** Gegevens uit de huidige app zonder vaste plek in Engine 3 (voorraad, favoriet, profiel …), ongewijzigd. */
  readonly legacy: Readonly<Record<string, unknown>> | null;
}>;

export type BeanArchiveEvent = EventEnvelope<'bean.archive', { readonly beanId: string }>;

export type BrewPlanEvent = EventEnvelope<'brew.plan', {
  readonly brewId: string;
  readonly beanId: string | null;
  readonly goal: Goal | null;
  /** Wie het recept maakte: Engine 3, Engine 2, oude regels, of de gebruiker zelf. */
  readonly engine: EngineStamp;
  readonly recipe: Recipe;
  /** Een proef die in deze kop wordt getest (bijvoorbeeld een klik grover). */
  readonly trialId: string | null;
  /** Uit de huidige app: diagnose, tip en de uitkomst van die tip, ongewijzigd bewaard. */
  readonly legacy: Readonly<Record<string, unknown>> | null;
}>;

export type TimerType = 'start' | 'pause' | 'resume' | 'drained' | 'drained_undo' | 'bed_dry' | 'complete' | 'abandon';

export type BrewTimerEvent = EventEnvelope<'brew.timer', {
  readonly brewId: string;
  readonly type: TimerType;
  /** Klokstand binnen het zetsel. */
  readonly tSec: Seconds;
  /** Bij 'drained'/'drained_undo': na welke giet (index in recipe.pours). */
  readonly pourIndex: number | null;
}>;

export type BrewActualsEvent = EventEnvelope<'brew.actuals', {
  readonly brewId: string;
  readonly doseG: Grams | null;
  readonly waterG: Grams | null;
  readonly grindClick: Clicks | null;
  readonly bypassG: Grams | null;
  readonly cupG: Grams | null;
  readonly tdsPct: TdsPct | null;
  readonly technique: TechniqueRef | null;
}>;

export type BrewDeleteEvent = EventEnvelope<'brew.delete', { readonly brewId: string }>;

export interface NoteRecognition {
  readonly note: string;
  readonly hit: NoteHit;
}

export type TastingEvent = EventEnvelope<'tasting', {
  readonly brewId: string;
  readonly minutesAfter: number | null;
  /** Later geproefd (≥ 120 min): telt lichter mee. */
  readonly late: boolean;
  readonly strength: StrengthOrd | null;
  readonly acidity: Acidity | null;
  readonly finish: readonly Finish[];
  readonly liking: Liking | null;
  readonly goalHit: GoalHit | null;
  readonly vsLast: VsLast | null;
  readonly missed: Missed | null;
  /** Blind aangevinkte wielcategorieën (vóór de zaknotities getoond werden). */
  readonly cata: readonly WheelCategory[];
  /** Is de blinde keuzevraag gesteld? Zonder dit veld telt een lege lijst als 'niet gesteld' (migratie, oude app). */
  readonly cataAsked?: boolean;
  /** Daarna: werden de notities van de zak herkend? */
  readonly noteHits: readonly NoteRecognition[];
  /** Oude 7-punts scores uit schema 1–5, ongewijzigd bewaard. */
  readonly legacyScores: Readonly<Record<string, number>> | null;
  readonly note: string;
}>;

export type PairArm = 'control' | 'variant';

export type PairTrialEvent = EventEnvelope<'pair.trial', {
  readonly trialId: string;
  readonly beanId: string | null;
  readonly method: Method;
  readonly waterG: Grams;
  /** Waar de proef over gaat. */
  readonly kind: 'strength' | 'technique' | 'grind' | 'other';
  readonly control: { readonly doseG: Grams; readonly technique: TechniqueRef | null; readonly grindClick: Clicks | null };
  readonly variant: { readonly doseG: Grams; readonly technique: TechniqueRef | null; readonly grindClick: Clicks | null };
  readonly preferred: PairArm | 'none';
  readonly brighter: PairArm | 'none' | null;
}>;

export interface WaterSetting {
  readonly hardnessMgL: number | null;
  readonly alkalinity: { readonly value: number | null; readonly unit: 'CaCO3' | 'HCO3' } | null;
  readonly dilution: { readonly tapParts: number; readonly demiParts: number } | null;
}

export type SettingEvent =
  | EventEnvelope<'setting', { readonly key: 'water'; readonly value: WaterSetting }>
  | EventEnvelope<'setting', { readonly key: 'grinder'; readonly value: { readonly model: 'TIMEMORE_C3S_PRO'; readonly zeroCheckedAt: EpochMs | null } }>
  | EventEnvelope<'setting', { readonly key: 'brightLighter'; readonly value: boolean }>;

export type RetractEvent = EventEnvelope<'retract', { readonly targetId: string; readonly reason: string }>;

export type EngineEvent =
  | BeanUpsertEvent
  | BeanArchiveEvent
  | BrewPlanEvent
  | BrewTimerEvent
  | BrewActualsEvent
  | BrewDeleteEvent
  | TastingEvent
  | PairTrialEvent
  | SettingEvent
  | RetractEvent;

export type EventKind = EngineEvent['kind'];

// ───────────────────────────── de engine ─────────────────────────────

export type ModuleId = 'strength' | 'grind_time' | 'technique' | 'recipe' | 'bean' | 'taste_profile';

/** Waarom het advies is wat het is, in gewone taal (de frontend toont dit). */
export interface Reason {
  readonly module: ModuleId;
  /** Stabiele code voor tests en vertaling, bv. 'strength.two_too_strong'. */
  readonly code: string;
  readonly text: string;
}

export interface TrialProposal {
  readonly id: string;
  readonly kind: 'strength_pair' | 'technique' | 'grind';
  readonly text: string;
  readonly control: Recipe;
  readonly variant: Recipe;
}

/** Klachten die de engine niet zelf uit het logboek kan afleiden; de frontend geeft ze mee. */
export type FeedbackSignal = 'sour_or_hollow' | 'drying' | 'uneven_drain';

export interface PlanRequest {
  readonly at: EpochMs;
  readonly beanId: string | null;
  readonly method: Method;
  /** Hoeveel koffie je wilt drinken (kop + eventueel bypass), in g. */
  readonly cupG: Grams;
  readonly goal: Goal | null;
  /** De gebruiker kiest zelf een techniek; anders kiest de engine. */
  readonly technique: TechniqueId | null;
  /** Optioneel: extra klachten, bijvoorbeeld 'uneven_drain' (ongelijk doorlopen). */
  readonly feedback?: readonly FeedbackSignal[];
}

export interface Advice {
  readonly engine: EngineStamp;
  readonly recipe: Recipe;
  readonly reasons: readonly Reason[];
  readonly uncertainty: {
    readonly targetTds: Band<TdsPct> | null;
    readonly doseG: Band<Grams> | null;
    readonly endSec: Band<Seconds> | null;
  };
  readonly trial: TrialProposal | null;
  readonly warnings: readonly string[];
}

/** De toestand is voor de buitenwereld ondoorzichtig; alleen de engine leest hem. */
export interface EngineState {
  readonly __engineState: true;
}

export interface Engine {
  readonly stamp: EngineStamp;
  learn(events: readonly EngineEvent[]): EngineState;
  plan(state: EngineState, request: PlanRequest): Advice;
}

/** Hulptype voor de extractieaanname waarmee een recept rekent (zonder refractometer geschat). */
export interface ExtractionAssumption {
  readonly ey: EyFraction;
  readonly retentionGPerG: number;
  readonly source: 'nominal' | 'measured';
}
