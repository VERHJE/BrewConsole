// K23: bouwstap voor de publicatie. Maakt dist/ met dezelfde app zonder commentaar.
//
// De bronnen blijven zoals ze zijn (brewconsole_v2_2.html is waar we in werken en wat de tests
// lezen). dist/ is wat je publiceert: index.html (de app zonder commentaar), sw.js, het manifest,
// de iconen en de foto's. Geen pakketten nodig: alleen Node.
//
// Wat eruit gaat:
//   - HTML-commentaar in de opmaak (<!-- … -->), niet binnen <script> of <style>;
//   - CSS-commentaar (/* … */) in <style>;
//   - JavaScript-commentaar (// … en /* … */) in de app-scripts, met een kleine lexer die
//     strings, template literals (met ${…}) en reguliere expressies herkent, zodat een // in
//     een webadres of een /* in een tekst blijft staan;
//   - regels die daardoor leeg worden.
// Wat blijft: de rekenkern (het eerste <script> na <body>) byte voor byte, en alle code zelf
// (geen hernoemen of samenpersen). Elk script wordt na het strippen door de JS-parser van Node
// gehaald; een syntaxfout stopt de bouw.
//
// Gebruik: npm run build   (of: node scripts/build.mjs [doelmap])

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'brewconsole_v2_2.html');

const KEYWORDS_BEFORE_REGEX = new Set(['return', 'typeof', 'case', 'in', 'of', 'new', 'delete', 'void', 'throw', 'else', 'do', 'yield', 'await', 'instanceof']);

export function stripJs(code){
  let out = '';
  let i = 0;
  const n = code.length;
  const braceStack = []; // per open template-${: de accolade-diepte waarop hij sluit
  let depth = 0;
  // Laatste betekenisvolle teken/woord buiten commentaar en witruimte: bepaalt of '/' een regex opent.
  let lastSig = '';
  let lastWord = '';
  const regexAllowed = () => {
    if (lastSig === '') return true;
    if (lastWord && KEYWORDS_BEFORE_REGEX.has(lastWord)) return true;
    return '(,=:[!&|?{};+-*%<>~^'.includes(lastSig);
  };
  const emitWs = () => { if (out && !/\s$/.test(out)) out += ' '; };
  function readTemplate(){ // i staat op de openende backtick
    out += '`'; i++;
    while (i < n){
      const c = code[i];
      if (c === '\\'){ out += c + code[i + 1]; i += 2; continue; }
      if (c === '`'){ out += c; i++; return; }
      if (c === '$' && code[i + 1] === '{'){ out += '${'; i += 2; braceStack.push(depth); depth++; lastSig = '{'; lastWord = ''; return 'expr'; }
      out += c; i++;
    }
  }
  while (i < n){
    const c = code[i], d = code[i + 1];
    if (c === '/' && d === '/'){ while (i < n && code[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*'){
      const end = code.indexOf('*/', i + 2);
      if (end < 0) throw new Error('open /* zonder */');
      const chunk = code.slice(i, end + 2);
      if (chunk.includes('\n')) out += '\n'; else emitWs();
      i = end + 2; continue;
    }
    if (c === '"' || c === "'"){
      let j = i + 1;
      while (j < n && code[j] !== c){ if (code[j] === '\\') j++; if (code[j] === '\n') throw new Error('string over regelgrens bij ' + i); j++; }
      out += code.slice(i, j + 1); i = j + 1; lastSig = c; lastWord = ''; continue;
    }
    if (c === '`'){ readTemplate(); lastSig = '`'; lastWord = ''; continue; }
    if (c === '}' && braceStack.length && braceStack[braceStack.length - 1] === depth - 1){
      // einde van een ${…}: terug in de template literal
      out += '}'; i++; depth--; braceStack.pop();
      while (i < n){
        const r = (function cont(){
          while (i < n){
            const t = code[i];
            if (t === '\\'){ out += t + code[i + 1]; i += 2; continue; }
            if (t === '`'){ out += t; i++; return 'end'; }
            if (t === '$' && code[i + 1] === '{'){ out += '${'; i += 2; braceStack.push(depth); depth++; return 'expr'; }
            out += t; i++;
          }
          return 'end';
        })();
        if (r === 'end'){ lastSig = '`'; lastWord = ''; break; }
        if (r === 'expr'){ lastSig = '{'; lastWord = ''; break; }
      }
      continue;
    }
    if (c === '/' && regexAllowed()){
      let j = i + 1, inClass = false;
      while (j < n){
        const t = code[j];
        if (t === '\\'){ j += 2; continue; }
        if (t === '\n') throw new Error('regex over regelgrens bij ' + i);
        if (inClass){ if (t === ']') inClass = false; }
        else if (t === '[') inClass = true;
        else if (t === '/') break;
        j++;
      }
      j++;
      while (j < n && /[a-z]/i.test(code[j])) j++;
      out += code.slice(i, j); i = j; lastSig = '/'; lastWord = ''; continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    if (/\s/.test(c)){ out += c; i++; continue; }
    if (/[A-Za-z0-9_$]/.test(c)){
      let j = i; while (j < n && /[A-Za-z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);
      out += word; i = j; lastSig = word[word.length - 1]; lastWord = word; continue;
    }
    out += c; i++; lastSig = c; lastWord = '';
  }
  return out;
}

export function stripCss(css){
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

const dropBlankLines = (s) => s.split('\n').filter(l => l.trim() !== '').join('\n');

export function buildHtml(html){
  const bodyAt = html.indexOf('<body>');
  const engineStart = html.indexOf('<script>', bodyAt);
  const engineEnd = html.indexOf('</script>', engineStart) + '</script>'.length;
  const parts = [];
  // Doorloop het document; script- en style-blokken apart.
  const re = /<(script|style)(\s[^>]*)?>([\s\S]*?)<\/\1>/g;
  let last = 0, m;
  while ((m = re.exec(html))){
    parts.push({ kind: 'markup', text: html.slice(last, m.index) });
    const isEngine = m.index === engineStart;
    parts.push({ kind: m[1], open: `<${m[1]}${m[2] || ''}>`, body: m[3], isEngine });
    last = m.index + m[0].length;
  }
  parts.push({ kind: 'markup', text: html.slice(last) });
  return parts.map(p => {
    if (p.kind === 'markup') return dropBlankLines(p.text.replace(/<!--[\s\S]*?-->/g, ''));
    if (p.kind === 'style') return `${p.open}${dropBlankLines(stripCss(p.body))}</style>`;
    if (p.isEngine) return `${p.open}${p.body}</script>`;
    const stripped = dropBlankLines(stripJs(p.body));
    new vm.Script(stripped, { filename: 'gebouwd-script.js' }); // syntaxcontrole
    return `${p.open}${stripped}</script>`;
  }).join('\n');
}

function copyDir(from, to){
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) fs.copyFileSync(path.join(from, f), path.join(to, f));
}

export function build(outDir){
  const html = fs.readFileSync(SRC, 'utf8');
  const built = buildHtml(html);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), built);
  for (const f of ['sw.js', 'manifest.webmanifest']) fs.copyFileSync(path.join(ROOT, f), path.join(outDir, f));
  copyDir(path.join(ROOT, 'icons'), path.join(outDir, 'icons'));
  copyDir(path.join(ROOT, 'photos'), path.join(outDir, 'photos'));
  return { before: Buffer.byteLength(html), after: Buffer.byteLength(built) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)){
  const outDir = path.resolve(process.argv[2] || path.join(ROOT, 'dist'));
  const { before, after } = build(outDir);
  const kb = (b) => (b / 1024).toFixed(0) + ' kB';
  console.log(`dist klaar in ${path.relative(ROOT, outDir) || outDir}: index.html ${kb(before)} → ${kb(after)} (−${Math.round((1 - after / before) * 100)} %)`);
}
