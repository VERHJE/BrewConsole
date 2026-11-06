import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { compareEvents, effectiveEvents, mergeLogs, validateEvent } from '../src/events.ts';
import { migrateBackupV3 } from '../src/migrate/v3.ts';
import { BACKUP_V3 } from './fixtures.ts';
import type { EngineEvent } from '../src/types.ts';

const base = migrateBackupV3(BACKUP_V3).events;

test('samenvoegen is onafhankelijk van volgorde en dubbelingen (zoals twee toestellen)', () => {
  fc.assert(fc.property(fc.shuffledSubarray(base, { minLength: 1 }), fc.shuffledSubarray(base, { minLength: 1 }), (a, b) => {
    const ab = mergeLogs(a, b, a).events;
    const ba = mergeLogs(b, a).events;
    assert.equal(JSON.stringify(ab), JSON.stringify(ba));
    assert.equal(new Set(ab.map(e => e.id)).size, ab.length);
    for (let i = 1; i < ab.length; i++) assert.ok(compareEvents(ab[i - 1]!, ab[i]!) <= 0);
  }), { numRuns: 200 });
});
test('zelfde id met andere inhoud wordt gemeld, niet stil overschreven', () => {
  const e = base[0]!;
  const changed = { ...e, at: (e.at + 1) as EngineEvent['at'] } as EngineEvent;
  const r = mergeLogs([e], [changed]);
  assert.deepEqual(r.conflicts, [e.id]);
  assert.equal(r.events.length, 1);
});
test('intrekken haalt precies die ene gebeurtenis weg', () => {
  const target = base.find(e => e.kind === 'tasting')!;
  const retract: EngineEvent = { id: 'r1', at: (target.at + 1) as EngineEvent['at'], device: 'test', v: 1, kind: 'retract', data: { targetId: target.id, reason: 'verkeerd getikt' } };
  const eff = effectiveEvents([...base, retract]);
  assert.ok(!eff.some(e => e.id === target.id));
  assert.equal(eff.length, effectiveEvents(base).length - 1);
});
test('de validator vangt kapotte gebeurtenissen', () => {
  assert.ok(validateEvent({}).length > 0);
  assert.ok(validateEvent({ id: 'x', at: 1, device: 'd', v: 1, kind: 'tasting', data: { brewId: 'b', strength: 3, finish: [], cata: [] } }).some(i => i.path === 'data.strength'));
  assert.ok(validateEvent({ id: 'x', at: 1, device: 'd', v: 1, kind: 'brew.plan', data: { brewId: 'b', recipe: { doseG: 15, waterG: 250, pours: [{ atSec: 30, addG: 50, toG: 50 }, { atSec: 10, addG: 50, toG: 100 }] } } }).some(i => i.path.endsWith('atSec')));
  assert.ok(validateEvent({ id: 'x', at: 1, device: 'd', v: 1, kind: 'onzin', data: {} }).some(i => i.path === 'kind'));
});

test('waardering: kwartsterren zijn geldig, andere waarden niet (contract 1.1)', () => {
  const t = (liking: unknown) => validateEvent({ id: 'x', at: 1, device: 'd', v: 1, kind: 'tasting', data: { brewId: 'b', strength: 0, liking, finish: [], cata: [] } });
  for (const ok of [null, 1, 3, 3.25, 3.5, 3.75, 5]) assert.deepEqual(t(ok), [], String(ok));
  for (const bad of [0, 0.75, 5.25, 3.3, '4', NaN]) assert.ok(t(bad).some(i => i.path === 'data.liking'), String(bad));
});

test('waardering: afronden, begrenzen en een kwart omhoog of omlaag', async () => {
  const { normaliseLiking, nudgeLiking, isLiking } = await import('../src/liking.ts');
  assert.equal(normaliseLiking(3.3), 3.25);
  assert.equal(normaliseLiking(9), 5);
  assert.equal(normaliseLiking(-2), 1);
  assert.equal(normaliseLiking('x'), null);
  assert.equal(nudgeLiking(3, 1), 3.25);
  assert.equal(nudgeLiking(1, -1), 1);
  assert.equal(nudgeLiking(5, 1), 5);
  assert.equal(isLiking(4.25), true);
});

test('winkeladres: alleen http(s); normaliseren; validatie op bean.upsert (contract 1.2)', async () => {
  const { isShopUrl, normaliseShopUrl } = await import('../src/shopurl.ts');
  assert.equal(normaliseShopUrl('brander.nl/zak'), 'https://brander.nl/zak');
  assert.equal(normaliseShopUrl('http://a.nl/x'), 'http://a.nl/x');
  for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'ftp://a.nl', '', '   ', 'http://']) assert.equal(normaliseShopUrl(bad), null, bad);
  assert.equal(isShopUrl('https://a.nl'), true);
  assert.equal(isShopUrl('javascript:alert(1)'), false);
  const up = (shopUrl: unknown) => validateEvent({ id: 'x', at: 1, device: 'd', v: 1, kind: 'bean.upsert', data: { beanId: 'b', fields: { name: 'z', shopUrl }, sources: {} } });
  assert.deepEqual(up('https://a.nl/z'), []);
  assert.deepEqual(up(null), []);
  assert.ok(up('javascript:alert(1)').some(i => i.path === 'data.fields.shopUrl'));
});
