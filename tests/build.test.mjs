// K23: de bouwstap (scripts/build.mjs). Controleert de lexer op de lastige gevallen, dat de
// rekenkern byte voor byte gelijk blijft, en dat de gebouwde app laadt zonder fouten. De hele
// suite draait ook op de gebouwde versie met BREWCONSOLE_APP_HTML=dist/index.html.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { stripJs, build } from '../scripts/build.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const FIXED_CHROMIUM_PATH = '/opt/pw-browsers/chromium';
const executablePath = fs.existsSync(FIXED_CHROMIUM_PATH) ? FIXED_CHROMIUM_PATH : undefined;

describe('K23: commentaar strippen zonder de code te raken', () => {
  test('strings, webadressen, template literals en reguliere expressies blijven staan', () => {
    const src = [
      "const a = 'https://cdn.example/x.js'; // weg",
      'const b = "/* geen commentaar */";',
      'const c = `regel // blijft ${x /* weg */ + `${y}// ook`} /* blijft */`;',
      'const d = /\\/\\/[a-z]*\\/*/g.test(s); /* weg */',
      'const e = x / 2 / 3; // deling',
      'if (ok) return /[/]+/.source;'
    ].join('\n');
    const out = stripJs(src);
    assert.ok(out.includes("'https://cdn.example/x.js'"));
    assert.ok(out.includes('"/* geen commentaar */"'));
    assert.ok(out.includes('`regel // blijft ${x  + `${y}// ook`} /* blijft */`'), out);
    assert.ok(out.includes('/\\/\\/[a-z]*\\/*/g.test(s)'));
    assert.ok(out.includes('x / 2 / 3'));
    assert.ok(out.includes('/[/]+/.source'));
    assert.ok(!/weg|deling/.test(out), out);
  });

  test('de bouw: rekenkern ongewijzigd, kleiner, alle bestanden mee, en de app laadt zonder fouten', async () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'brew-dist-'));
    const { before, after } = build(out);
    assert.ok(after < before * 0.85, `${after} van ${before} bytes`);
    const src = fs.readFileSync(path.join(ROOT, 'brewconsole_v2_2.html'), 'utf8');
    const built = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
    const engine = (h) => { const b = h.indexOf('<body>'); const s = h.indexOf('<script>', b); return h.slice(s, h.indexOf('</script>', s)); };
    assert.equal(engine(built), engine(src), 'de rekenkern is byte voor byte gelijk');
    for (const f of ['sw.js', 'manifest.webmanifest', 'icons/icon-512.png', 'photos/home-hero.webp']) assert.ok(fs.existsSync(path.join(out, f)), f);
    const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('file://' + path.join(out, 'index.html'), { waitUntil: 'load' });
    await page.click('#home-start-brew-btn');
    await page.click('[data-method="v60"]');
    await page.click('[data-roast="light"]');
    await page.click('[data-profile="klassiek"]');
    await page.waitForFunction(() => document.getElementById('screen-prep').classList.contains('active'));
    assert.match(await page.locator('#stats-grid').innerText(), /Klik \d+/);
    assert.deepEqual(errors, []);
    await browser.close();
    fs.rmSync(out, { recursive: true, force: true });
  });
});
