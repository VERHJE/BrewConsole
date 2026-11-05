// Bouwt app3 naar <doel>/app3/ (standaard dist/app3/): app.js, app.css, index.html.
// Gebruik: node scripts/build-app3.mjs [doelmap]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(path.resolve(process.argv[2] ?? path.join(ROOT, 'dist')), 'app3');

fs.mkdirSync(OUT, { recursive: true });
await build({
  entryPoints: [path.join(ROOT, 'app3/src/main.tsx')],
  outdir: OUT, entryNames: 'app', chunkNames: 'chunk-[hash]', splitting: true,
  bundle: true, format: 'esm', target: 'es2022', platform: 'browser', minify: true, legalComments: 'none',
  jsx: 'automatic', jsxImportSource: 'preact', logLevel: 'warning'
});
const css = ['tokens.css', 'base.css'].map(f => fs.readFileSync(path.join(ROOT, 'app3/styles', f), 'utf8')).join('\n');
fs.writeFileSync(path.join(OUT, 'app.css'), css);
fs.copyFileSync(path.join(ROOT, 'app3/index.html'), path.join(OUT, 'index.html'));
fs.copyFileSync(path.join(ROOT, 'app3/manifest.webmanifest'), path.join(OUT, 'manifest.webmanifest'));
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, 'icons'))) fs.copyFileSync(path.join(ROOT, 'icons', f), path.join(OUT, 'icons', f));

// Service worker: versie uit de inhoud van alle bestanden, lijst van wat vooraf in de cache gaat.
const files = fs.readdirSync(OUT, { recursive: true }).map(String).filter(f => fs.statSync(path.join(OUT, f)).isFile() && f !== 'sw.js').sort();
const hash = crypto.createHash('sha256');
for (const f of files) hash.update(f).update(fs.readFileSync(path.join(OUT, f)));
const version = hash.digest('hex').slice(0, 12);
const precache = ['index.html', ...files.filter(f => f !== 'index.html')];
fs.writeFileSync(path.join(OUT, 'sw.js'), fs.readFileSync(path.join(ROOT, 'app3/sw.js'), 'utf8').replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache)));
console.log(`app3 gebouwd in ${path.relative(ROOT, OUT)}`);
