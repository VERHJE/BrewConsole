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
  test('geen inline style in de opmaak, behalve datagestuurde waarden (${…}, --tag-color, --swatch)', () => {
    const inline = [...markupAndApp.matchAll(/\sstyle="([^"]*)"/g)].map(m => m[1]).filter(v => !v.includes('${') && !v.includes('--tag-color'));
    assert.deepEqual(inline, []);
  });
  test('één [hidden]-regel voor de hele app', () => {
    const rules = [...css.matchAll(/([^{}]*\[hidden\][^{}]*)\{([^}]*)\}/g)].filter(m => /display\s*:\s*none/.test(m[2]));
    assert.deepEqual(rules.map(m => m[1].trim()), ['[hidden]']);
  });
  test('elke gebruikte custom property is gedefinieerd (--tag-color en --swatch zet het element zelf)', () => {
    const defined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
    const used = new Set([...html.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]));
    const missing = [...used].filter(u => !defined.has(u) && u !== '--tag-color' && u !== '--swatch');
    assert.deepEqual(missing, []);
  });
  test('hoeken alleen via tokens (of een cirkel, of die van de ouder)', () => {
    const radii = [...css.matchAll(/border-radius\s*:\s*([^;}]+)/g)].map(m => m[1].trim()).filter(v => !v.includes('var(') && v !== '50%' && v !== '0' && v !== 'inherit');
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

describe('VA-22: één iconenset', () => {
  // Emoji en losse symbooltekens (☕ 🔍 📷 🧪 🔔 🗑️ ⬇️ ⬆️ 🌸 ⚠ ♡ ♥ ✎ ★) horen niet in knoppen of labels;
  // lijniconen (SVG) wel. Pijlen en ✓ zijn gewone tekstletters.
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2B00}-\u{2BFF}\u{270E}\u{2764}\u{21BB}\u{2302}\u{23F8}]/u;
  const inner = (tag) => [...markupAndApp.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))].map(m => m[1].replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ''));
  test('geen emoji in knoppen, labels of uitklapkoppen', () => {
    const hits = ['button', 'label', 'summary'].flatMap(t => inner(t).filter(x => EMOJI.test(x)).map(x => `${t}: ${x.trim().slice(0, 50)}`));
    assert.deepEqual(hits, []);
  });
  test('lijniconen tekenen met één lijndikte (1,7)', () => {
    const widths = new Set([...markupAndApp.matchAll(/stroke="currentColor"[^>]*?stroke-width="([\d.]+)"/g)].map(m => m[1]));
    assert.deepEqual([...widths], ['1.7']);
  });
});

describe('VA-46: hover alleen met een echte muis', () => {
  test('elke :hover-regel staat binnen @media (hover:hover)', () => {
    const loose = [];
    const ctx = [];
    let start = 0;
    for (let i = 0; i < css.length; i++){
      const ch = css[i];
      if (ch === '{'){
        const sel = css.slice(start, i).trim();
        if (sel.includes(':hover') && !sel.startsWith('@') && !ctx.some(c => /@media[^{]*hover\s*:\s*hover/.test(c))) loose.push(sel);
        ctx.push(sel); start = i + 1;
      } else if (ch === '}'){ ctx.pop(); start = i + 1; }
    }
    assert.deepEqual(loose, []);
  });
});
