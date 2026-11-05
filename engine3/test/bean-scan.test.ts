import { test } from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import { processFromScan, scanBeanText } from '../src/bean/scan.ts';
import { readQrPayload } from '../src/bean/qr.ts';
import { decodeQr, readQrFromPixels, type PixelImage } from '../qr/decode.ts';
import { learnFacts } from '../src/state.ts';
import { parseBeanText } from '../src/bean/text.ts';
import type { EngineEvent } from '../src/types.ts';
import type { EpochMs } from '../src/units.ts';

const NOW = Date.parse('2026-11-05T12:00:00Z');
const scan = (t: string, source: 'paste' | 'ocr' | 'qr' | 'ai' = 'paste') => scanBeanText(t, { source, nowMs: NOW });

test('een zak als boonvelden: land, proces, variëteit, hoogte als bereik, notities in drie lijsten, bron per veld', () => {
  const s = scan('Colombia El Diviso\nProcess: Washed\nVariety: Caturra, Castillo\nElevation 1580 - 1680\nTasting notes: Apple | Caramel | aloe vera\nRoasted on 2026-10-20\nQuantity 250g\nLight roast\nFilter roast', 'ocr');
  const f = s.fields;
  assert.equal(f.country, 'Colombia');
  assert.equal(f.process?.base, 'washed');
  assert.deepEqual(f.process?.fermentation, []);
  assert.equal(f.roastLevel, 'light');
  assert.equal(f.intendedUse, 'filter');
  assert.deepEqual(f.altitude, { minM: 1580, maxM: 1680 });
  assert.equal(f.roastDate, '2026-10-20');
  assert.equal(f.bagSizeG, 250);
  assert.deepEqual(f.notes?.raw, ['Apple', 'Caramel', 'aloe vera']);
  assert.ok(f.notes!.tags.includes('Appel'));
  assert.deepEqual(f.notes?.unmapped, ['aloe vera']);
  for (const k of Object.keys(f)) assert.equal((s.sources as Record<string, string>)[k], 'ocr', k);
});
test('niets verzinnen: lege tekst, onbekende woorden en een te oude branddatum leveren geen velden', () => {
  assert.deepEqual(scan('').fields, {});
  assert.deepEqual(scan('   \n  ').fields, {});
  const old = scan('Roasted on 2024-01-05');
  assert.equal(old.fields.roastDate, undefined);
  assert.equal(scan('zzzz qqqq xxxx').fields.country, undefined);
});
test('procesassen: anaerobe natural, lactic honey, experimenteel, semi-washed (niet geraden) en cafeïnevrij', () => {
  const p = (t: string) => processFromScan(parseBeanText(t, NOW), t)!;
  assert.deepEqual(p('Anaerobic Natural'), { base: 'natural', fermentation: ['anaerobic'], experimental: p('Anaerobic Natural').experimental, decaf: null, ambiguousTerm: null });
  const lactic = p('PROCESS LACTIC FERMENTED HONEY');
  assert.equal(lactic.base, 'honey');
  assert.ok(lactic.fermentation.includes('lactic'));
  const semi = p('Semi-washed');
  assert.equal(semi.base, 'unknown');
  assert.equal(semi.ambiguousTerm, 'semi-washed');
  assert.equal(p('Swiss Water Decaf').decaf, 'swiss_water');
  assert.equal(p('Sugarcane Decaf').decaf, 'sugarcane_ea');
  assert.equal(p('Decaf').decaf, 'other');
  assert.equal(p('Carbonic maceration').fermentation.includes('carbonic_maceration'), true);
  assert.equal(processFromScan(parseBeanText('Colombia', NOW), 'Colombia'), null);
});
test('webshop: meerdere maten en bestelopties tellen niet; fuzzy treffers worden gemarkeerd', () => {
  const shop = scan('Colombia Huila\nQuantity 250g, 1KG\nespresso prep\nAdd to cart');
  assert.equal(shop.fields.bagSizeG, undefined);
  assert.equal(shop.flags.webshop, true);
  assert.equal(shop.fields.intendedUse, undefined);
  const typo = scan('Colobmia');
  assert.equal(typo.flags.countryFuzzy, typo.fields.country !== undefined);
});
test('de bron per veld volgt de herkomst van de tekst (paste, ocr, qr, ai)', () => {
  for (const source of ['paste', 'ocr', 'qr', 'ai'] as const) assert.equal(scan('Ethiopia\nProcess: Natural', source).sources.country, source);
});
test('een scan wordt een bean.upsert die learn() begrijpt', () => {
  const s = scan('Colombia El Diviso\nProcess: Natural\nLight roast\nNotes: Apple, Caramel');
  const ev: EngineEvent = { id: 'scan:1', at: NOW as EpochMs, device: 't', v: 1, kind: 'bean.upsert', data: { beanId: 'zak1', fields: s.fields, sources: s.sources, legacy: null } };
  const st = learnFacts([ev]);
  assert.equal(st.beans.get('zak1')!.fields.country, 'Colombia');
  assert.equal(st.beans.get('zak1')!.fields.process?.base, 'natural');
  assert.equal(st.beans.get('zak1')!.sources.country, 'paste');
});

// ───────────────────────────── QR ─────────────────────────────

function qrImage(text: string, o: { scale?: number; quiet?: number; invert?: boolean; level?: 'L' | 'M' | 'Q' | 'H' } = {}): PixelImage {
  const scale = o.scale ?? 6, quiet = o.quiet ?? 4;
  const q = QRCode.create(text, { errorCorrectionLevel: o.level ?? 'M' });
  const n = q.modules.size;
  const size = (n + quiet * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const mx = Math.floor(x / scale) - quiet, my = Math.floor(y / scale) - quiet;
    const dark = mx >= 0 && my >= 0 && mx < n && my < n && q.modules.data[my * n + mx] === 1;
    const v = (dark !== !!o.invert) ? 20 : 235;
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255;
  }
  return { data, width: size, height: size };
}

test('QR: tekst terug uit pixels, ook omgekeerd en klein; zonder code komt er null', () => {
  const text = '{"name":"El Diviso","origin":"Colombia"}';
  assert.equal(decodeQr(qrImage(text)), text);
  assert.equal(decodeQr(qrImage(text, { scale: 3 })), text);
  assert.equal(decodeQr(qrImage(text, { invert: true })), text);
  assert.equal(decodeQr(qrImage(text, { level: 'H', scale: 8 })), text);
  const blank: PixelImage = { data: new Uint8ClampedArray(100 * 100 * 4).fill(200), width: 100, height: 100 };
  assert.equal(decodeQr(blank), null);
});
test('QR: webadres, JSON, sleutel-waarde en gewone tekst worden boonvelden met bron qr', () => {
  const url = readQrPayload('https://www.blommers.coffee/products/colombia-el-diviso-natural', NOW);
  assert.equal(url.kind, 'url');
  assert.equal(url.url, 'https://www.blommers.coffee/products/colombia-el-diviso-natural');
  assert.equal(url.fields.roaster, 'Blommers');
  assert.equal(url.fields.country, 'Colombia');
  assert.equal(url.fields.process?.base, 'natural');
  assert.equal(url.sources.country, 'qr');

  const json = readQrPayload(JSON.stringify({ name: 'Lord Voldemor', roaster: 'Zwarte Roes', origin: 'Colombia', process: 'Natural', roast_date: '2026-10-20', altitude: '1800', notes: ['Apple', 'Caramel'], weight: 250, onzin: 'x' }), NOW);
  assert.equal(json.kind, 'json');
  assert.equal(json.fields.name, 'Lord Voldemor');
  assert.equal(json.fields.roaster, 'Zwarte Roes');
  assert.equal(json.fields.country, 'Colombia');
  assert.equal(json.fields.bagSizeG, 250);
  assert.equal(json.fields.roastDate, '2026-10-20');
  assert.deepEqual(json.fields.altitude, { minM: 1800, maxM: 1800 });
  assert.ok(json.fields.notes!.tags.includes('Appel'));

  const kv = readQrPayload('Origin: Ethiopia\nProcess: Washed\nVariety: Heirloom', NOW);
  assert.equal(kv.kind, 'keyvalue');
  assert.equal(kv.fields.country, 'Ethiopië');
  assert.equal(readQrPayload('Kenya AA', NOW).kind, 'text');
  assert.equal(readQrPayload('{kapot', NOW).kind, 'text');
  assert.deepEqual(readQrPayload('', NOW).fields, {});
});
test('QR: van pixels tot boonvelden in één stap', () => {
  const r = readQrFromPixels(qrImage('Origin: Kenya\nProcess: Washed\nRoast: Light roast'), NOW)!;
  assert.equal(r.fields.country, 'Kenia');
  assert.equal(r.fields.roastLevel, 'light');
  assert.equal(readQrFromPixels({ data: new Uint8ClampedArray(40 * 40 * 4).fill(255), width: 40, height: 40 }, NOW), null);
});
