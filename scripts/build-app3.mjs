// Bouwt app3 naar <doel>/app3/ (standaard dist/app3/): app.js, app.css, index.html.
// Gebruik: node scripts/build-app3.mjs [doelmap] [--root]
//   zonder --root: <doelmap>/app3/ (de schermtests); met --root: direct in <doelmap> (de publicatie, app op /).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const AT_ROOT = args.includes('--root');
const TARGET = path.resolve(args.find(a => !a.startsWith('--')) ?? path.join(ROOT, 'dist'));
const OUT = AT_ROOT ? TARGET : path.join(TARGET, 'app3');

fs.mkdirSync(OUT, { recursive: true });
await build({
  entryPoints: [path.join(ROOT, 'app3/src/main.tsx')],
  outdir: OUT, entryNames: 'app', chunkNames: 'chunk-[hash]', splitting: true,
  bundle: true, format: 'esm', target: 'es2022', platform: 'browser', minify: true, legalComments: 'none',
  jsx: 'automatic', jsxImportSource: 'preact', logLevel: 'warning'
});
const css = ['fonts.css', 'tokens.css', 'base.css'].map(f => fs.readFileSync(path.join(ROOT, 'app3/styles', f), 'utf8')).join('\n');
fs.writeFileSync(path.join(OUT, 'app.css'), css);
fs.copyFileSync(path.join(ROOT, 'app3/index.html'), path.join(OUT, 'index.html'));
// Lettertype voor koppen (OFL-1.1): bestand en licentietekst gaan samen mee.
const FONT_DIR = path.join(ROOT, 'node_modules/@fontsource-variable/fraunces');
fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true });
fs.copyFileSync(path.join(FONT_DIR, 'files/fraunces-latin-wght-normal.woff2'), path.join(OUT, 'fonts/fraunces-latin-wght-normal.woff2'));
fs.copyFileSync(path.join(FONT_DIR, 'LICENSE'), path.join(OUT, 'fonts/Fraunces-OFL.txt'));
fs.copyFileSync(path.join(ROOT, 'app3/manifest.webmanifest'), path.join(OUT, 'manifest.webmanifest'));
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, 'icons'))) fs.copyFileSync(path.join(ROOT, 'icons', f), path.join(OUT, 'icons', f));

// Op de wortel blijven de hulppagina's (tokengenerator voor synchronisatie, toestelcheck) bereikbaar op hun eigen adres.
const EXTRA_PAGES = ['tokengenerator.html', 'toestelcheck.html'];
if (AT_ROOT) for (const f of EXTRA_PAGES) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));

// Service worker: versie uit de inhoud van alle bestanden, lijst van wat vooraf in de cache gaat.
const files = fs.readdirSync(OUT, { recursive: true }).map(String).filter(f => !f.startsWith('oud') && !EXTRA_PAGES.includes(f) && fs.statSync(path.join(OUT, f)).isFile() && f !== 'sw.js').sort();
const hash = crypto.createHash('sha256');
for (const f of files) hash.update(f).update(fs.readFileSync(path.join(OUT, f)));
const version = hash.digest('hex').slice(0, 12);
const precache = ['index.html', ...files.filter(f => f !== 'index.html')];
fs.writeFileSync(path.join(OUT, 'sw.js'), fs.readFileSync(path.join(ROOT, 'app3/sw.js'), 'utf8').replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache)));
console.log(`app3 gebouwd in ${path.relative(ROOT, OUT)}`);
