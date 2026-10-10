// Expertreview oktober 2026, Sprint D: data en code.
// - R-20: back-upherinnering (30 dagen, vanaf 3 gelogde koppen, "Later" = een week) en de opslagstatus.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load-app.mjs';

const { api } = loadApp();
const DAY = 86400000;
const NOW = Date.UTC(2026, 9, 10);
const j = (x) => JSON.parse(JSON.stringify(x)); // objecten uit de vm-sandbox

describe('R-20: back-upherinnering', () => {
  const due = (o) => j(api.backupReminderDue(Object.assign({ nowMs: NOW, cupCount: 5, firstDataAt: NOW - 40 * DAY, lastBackupAt: null, snoozeUntil: null }, o)));
  test('nooit een back-up en de eerste data is 30+ dagen oud → herinneren', () => {
    assert.deepEqual(due({}), { days: 40, never: true });
    assert.equal(api.BACKUP_REMIND_DAYS, 30);
  });
  test('niet bij een nieuwe gebruiker: minder dan 3 gelogde koppen, of data jonger dan 30 dagen', () => {
    assert.equal(due({ cupCount: 2 }), null);
    assert.equal(due({ firstDataAt: NOW - 29 * DAY }), null);
    assert.equal(due({ firstDataAt: null }), null);
  });
  test('na een back-up telt de datum van die back-up; "Later" houdt het een week stil', () => {
    assert.equal(due({ lastBackupAt: NOW - 10 * DAY }), null);
    assert.deepEqual(due({ lastBackupAt: NOW - 31 * DAY }), { days: 31, never: false });
    assert.equal(due({ snoozeUntil: NOW + DAY }), null);
    assert.deepEqual(due({ snoozeUntil: NOW - 1 }), { days: 40, never: true });
  });
});

describe('R-20: opslagstatus in Instellingen', () => {
  test('blijvend / mag opgeruimd worden / onbekend, plus gebruik en laatste back-up', () => {
    assert.match(api.storageStatusText(true, 300 * 1024, NOW - 2 * DAY, NOW), /^Opslag: blijvend.*In gebruik: 300 kB \(±6% van de ±5 MB.*Laatste back-up: 2 dagen geleden\.$/);
    assert.match(api.storageStatusText(false, 4.5 * 1024 * 1024, null, NOW), /mag je gegevens opruimen.*4,5 MB \(±90%.*bijna vol: maak een back-up\..*Nog geen back-up gemaakt\./);
    assert.doesNotMatch(api.storageStatusText(null, 1000, null, NOW), /Opslag:/, 'zonder Storage-API geen claim over blijvend');
  });
});
