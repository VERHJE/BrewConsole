// Rooktest van de gebouwde bundel (engine3/dist/engine3.mjs): draait zoals de frontend hem straks laadt,
// zonder TypeScript en zonder iets uit src/. Draait na `npm run e3:build`.
import assert from 'node:assert/strict';
import { createEngine, ENGINE3_CONTRACT_VERSION, ENGINE3_VERSION, migrateBackupV3, scanBeanText, readQrPayload, tasteProfile } from '../dist/engine3.mjs';
import { decodeQr } from '../dist/qr.mjs';

assert.equal(ENGINE3_CONTRACT_VERSION, 'e3-contract-1.0');
const engine = createEngine();
assert.equal(engine.stamp.name, 'engine3');
assert.equal(engine.stamp.version, ENGINE3_VERSION);

const bean = { id: 'b1', at: 1_790_000_000_000, device: 'smoke', v: 1, kind: 'bean.upsert',
  data: { beanId: 'zak', fields: { name: 'Rooktest', roastLevel: 'light' }, sources: {}, legacy: null } };
const state = engine.learn([bean]);
const advice = engine.plan(state, { at: 1_790_000_100_000, beanId: 'zak', method: 'v60', cupG: 250, goal: null, technique: null });
assert.equal(advice.recipe.technique, 'kasuya_46');
assert.equal(advice.recipe.tempC, 93); // lichte branding
assert.equal(advice.recipe.pours.reduce((s, p) => s + p.addG, 0), advice.recipe.waterG);
assert.ok(advice.recipe.doseG >= 15 && advice.recipe.doseG <= 22);
assert.ok(advice.reasons.length >= 3);

const migrated = migrateBackupV3({ backupVersion: 3, beans: [], brews: [], brewLog: [], abTrials: [], settings: {} });
assert.ok(Array.isArray(migrated.events));
// Zuiver: twee keer dezelfde vraag, twee keer hetzelfde antwoord.
const again = engine.plan(engine.learn([bean]), { at: 1_790_000_100_000, beanId: 'zak', method: 'v60', cupG: 250, goal: null, technique: null });
assert.equal(JSON.stringify(advice), JSON.stringify(again));
// Zakherkenning: tekst, QR-inhoud en de pixel-decoder uit de aparte QR-bundel.
const scan = scanBeanText('Colombia El Diviso\nProcess: Natural\nLight roast', { source: 'paste', nowMs: 1_790_000_000_000 });
assert.equal(scan.fields.country, 'Colombia');
assert.equal(scan.fields.process.base, 'natural');
assert.equal(readQrPayload('https://www.blommers.coffee/products/kenya-aa', 1_790_000_000_000).fields.roaster, 'Blommers');
assert.equal(decodeQr({ data: new Uint8ClampedArray(30 * 30 * 4).fill(255), width: 30, height: 30 }), null);
const profile = tasteProfile(state);
assert.equal(profile.cups, 0);
assert.equal(profile.sensitivity.length, 9);
console.log('bundel-rooktest: ok');
