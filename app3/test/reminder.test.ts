import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupReminder, readLastExport } from '../src/core/reminder.ts';

// Review 17 nov 2026, W3: één regel voor de back-upherinnering op Meer en Gegevens.
const DAY = 86_400_000; const NOW = Date.UTC(2026, 10, 17);

test('herinnering: geen gegevens, geen herinnering; nog geen back-up; 14 dagen of ouder', () => {
  assert.equal(backupReminder({ lastExport: null, now: NOW, hasData: false, lastSyncAt: null }), null);
  assert.equal(backupReminder({ lastExport: null, now: NOW, hasData: true, lastSyncAt: null }), 'Je hebt nog geen back-up gemaakt.');
  assert.equal(backupReminder({ lastExport: NOW - 13 * DAY, now: NOW, hasData: true, lastSyncAt: null }), null);
  assert.equal(backupReminder({ lastExport: NOW - 14 * DAY, now: NOW, hasData: true, lastSyncAt: null }), 'Je laatste back-up is 14 dagen oud.');
});

test('herinnering: niet als de synchronisatie in de laatste 14 dagen gelukt is', () => {
  assert.equal(backupReminder({ lastExport: null, now: NOW, hasData: true, lastSyncAt: NOW - DAY }), null);
  assert.equal(backupReminder({ lastExport: null, now: NOW, hasData: true, lastSyncAt: NOW - 15 * DAY }), 'Je hebt nog geen back-up gemaakt.');
});

test('laatste back-up lezen: getal, leeg, rommel en een kapotte opslag', () => {
  assert.equal(readLastExport({ getItem: () => String(NOW) }), NOW);
  assert.equal(readLastExport({ getItem: () => null }), null);
  assert.equal(readLastExport({ getItem: () => 'rommel' }), null);
  assert.equal(readLastExport({ getItem: () => { throw new Error('geen opslag'); } }), null);
  assert.equal(readLastExport(undefined), null);
});
