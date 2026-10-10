// Visuele en UX-audit "Calm Precision", VA-20 en VA-21: een lint op het ontwerpsysteem, zodat het
// niet stilletjes terugzakt. Leest het app-bestand als tekst; de gebundelde engine (het eerste
// <script>-blok) blijft buiten beschouwing.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_HTML_PATH } from './load-app.mjs';

const html = readFileSync(APP_HTML_PATH, 'utf8');
const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, (c) => ' '.repeat(c.length)); // commentaar telt niet mee
const body = html.slice(html.indexOf('<body>'));
const engineStart = body.indexOf('<script>');
const engineEnd = body.indexOf('</script>', engineStart) + '</script>'.length;
const markupAndApp = body.slice(0, engineStart) + body.slice(engineEnd);
// Themablokken: :root en html[data-theme="light"] (zonder verdere selector).
const themeBlocks = [...css.matchAll(/(:root|html\[data-theme="light"\])\{[^}]*\}/g)].map(m => [m.index, m.index + m[0].length]);
const inTheme = (pos) => themeBlocks.some(([a, b]) => pos >= a && pos < b);

describe('VA-21: tokens in plaats van losse waarden', () => {
  test('geen hex- of rgb-kleur buiten de themablokken', () => {
    const loose = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)].filter(m => !inTheme(m.index)).map(m => m[0]);
    assert.deepEqual(loose, []);
  });
  test('geen inline style in de opmaak, behalve datagestuurde waarden (${…}, --tag-color)', () => {
    const inline = [...markupAndApp.matchAll(/\sstyle="([^"]*)"/g)].map(m => m[1]).filter(v => !v.includes('${') && !v.includes('--tag-color'));
    assert.deepEqual(inline, []);
  });
  test('één [hidden]-regel voor de hele app', () => {
    const rules = [...css.matchAll(/([^{}]*\[hidden\][^{}]*)\{([^}]*)\}/g)].filter(m => /display\s*:\s*none/.test(m[2]));
    assert.deepEqual(rules.map(m => m[1].trim()), ['[hidden]']);
  });
  test('elke gebruikte custom property is gedefinieerd (--tag-color zet het element zelf)', () => {
    const defined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
    const used = new Set([...html.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]));
    const missing = [...used].filter(u => !defined.has(u) && u !== '--tag-color');
    assert.deepEqual(missing, []);
  });
  test('hoeken alleen via tokens (of een cirkel)', () => {
    const radii = [...css.matchAll(/border-radius\s*:\s*([^;}]+)/g)].map(m => m[1].trim()).filter(v => !v.includes('var(') && v !== '50%' && v !== '0');
    assert.deepEqual(radii, []);
  });
  test('body::before is één keer gedefinieerd', () => {
    assert.equal([...css.matchAll(/(^|\n)\s*body::before\s*\{/g)].length, 1);
  });
});

describe('VA-20: één knopfamilie', () => {
  test('elke gevulde primaire knop draagt .btn-primary', () => {
    const classLists = [...markupAndApp.matchAll(/class="([^"]*)"/g)].map(m => m[1].split(/\s+/));
    const primaries = classLists.filter(c => c.some(x => ['start-btn', 'pill-cta', 'advice-cta', 'bed-dry-btn'].includes(x)));
    assert.ok(primaries.length >= 10);
    assert.deepEqual(primaries.filter(c => !c.includes('btn-primary')).map(c => c.join(' ')), []);
  });
  test('knoppen staan in de sansletter; serif alleen voor titels', () => {
    for (const sel of ['.btn-primary, .start-btn, .pill-cta, .advice-cta', '.btn-secondary, .advisor-primary, .advisor-link, .bean-use-btn']){
      const i = css.indexOf(sel + '{');
      assert.ok(i >= 0, sel);
      assert.match(css.slice(i, css.indexOf('}', i)), /font-family:var\(--font-body\)/, sel);
    }
  });
});
