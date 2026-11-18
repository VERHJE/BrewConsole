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
// De stijl in vaste volgorde (de cascade hangt ervan af). Tot 18 nov 2026 stond alles vanaf basis.css in één base.css; die is
// op de bestaande sectiegrenzen gesplitst zonder iets te verplaatsen, dus app.css is inhoudelijk gelijk (review 17 nov, C4).
export const STYLE_FILES = ['fonts.css', 'tokens.css', 'basis.css', 'etiket-lijsten.css', 'timer.css', 'sfeer.css', 'proeven.css',
  'zakdetail.css', 'logboek.css', 'meer.css', 'instellingen.css', 'correcties.css', 'breed-en-smal.css'];
const css = STYLE_FILES.map(f => fs.readFileSync(path.join(ROOT, 'app3/styles', f), 'utf8')).join('\n');
fs.writeFileSync(path.join(OUT, 'app.css'), css);
// index.html met de CSP: de hash van elk inline script (zonder src) komt op de plaats van __INLINE_SCRIPT_HASHES__, zodat
// het script mag draaien en een gewijzigd script zonder nieuwe hash wordt tegengehouden (audit 15 nov, P3-07).
{
  const html = fs.readFileSync(path.join(ROOT, 'app3/index.html'), 'utf8');
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => `'sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  if (!html.includes('__INLINE_SCRIPT_HASHES__') || inline.length === 0) throw new Error('index.html: CSP-plaatshouder of inline script ontbreekt');
  fs.writeFileSync(path.join(OUT, 'index.html'), html.replace('__INLINE_SCRIPT_HASHES__', inline.join(' ')));
}
// Lettertype voor koppen (OFL-1.1): bestand en licentietekst gaan samen mee.
const FONT_DIR = path.join(ROOT, 'node_modules/@fontsource-variable/fraunces');
fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true });
fs.copyFileSync(path.join(FONT_DIR, 'files/fraunces-latin-wght-normal.woff2'), path.join(OUT, 'fonts/fraunces-latin-wght-normal.woff2'));
fs.copyFileSync(path.join(FONT_DIR, 'LICENSE'), path.join(OUT, 'fonts/Fraunces-OFL.txt'));
fs.copyFileSync(path.join(ROOT, 'app3/manifest.webmanifest'), path.join(OUT, 'manifest.webmanifest'));
// Iconen en opstartschermen (icons/splash/): de hele map, ook de submap.
fs.cpSync(path.join(ROOT, 'icons'), path.join(OUT, 'icons'), { recursive: true });

// Op de wortel blijven de hulppagina's (tokengenerator voor synchronisatie, toestelcheck) bereikbaar op hun eigen adres.
const EXTRA_PAGES = ['tokengenerator.html', 'toestelcheck.html'];
if (AT_ROOT) for (const f of EXTRA_PAGES) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));

/** Opruim-worker voor een oud adres: wist alle caches, haalt zichzelf weg en laat open tabbladen opnieuw laden. */
const CLEANUP_SW = `/* Opruim-worker: wist alle caches, haalt zichzelf weg en laat open tabbladen opnieuw laden. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const c of clients) { try { c.navigate(c.url); } catch (e) { /* tabblad weg */ } }
})()));
`;

// De oude app is opgeruimd. Wie /oud/ nog opent (bladwijzer, geïnstalleerde kopie) ziet een korte melding, en de worker daar
// wist zichzelf en zijn caches, zodat het toestel niet blijft hangen in de oude versie.
if (AT_ROOT) {
  const OUD = path.join(OUT, 'oud');
  fs.mkdirSync(OUD, { recursive: true });
  fs.writeFileSync(path.join(OUD, 'index.html'), `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Brew Console · oude versie opgeruimd</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;padding:32px 20px;background:#f6f1e7;color:#231a12}main{max-width:32rem;margin:0 auto}a{display:inline-block;margin-top:12px;padding:14px 20px;border-radius:12px;background:#2a1f15;color:#f6f1e7;text-decoration:none;font-weight:600}@media(prefers-color-scheme:dark){body{background:#120e0a;color:#f5ecdf}a{background:#d9a65a;color:#1a1108}}</style></head>
<body><main><h1>De oude versie is opgeruimd</h1><p>Brew Console staat nu op één adres. Je zakken en koppen staan in de nieuwe app als je ze hebt overgezet via een back-up.</p><a href="../">Naar de nieuwe app</a></main>
<script>if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){if(r.scope.indexOf('/oud/')>-1)r.unregister()})}).catch(function(){})}</script></body></html>
`);
  fs.writeFileSync(path.join(OUD, 'sw.js'), CLEANUP_SW);

  // Tot 6 nov 2026 stond de app op /app3/. Een toestel dat hem daar installeerde, heeft nog een worker met scope /app3/.
  // Een omleiding alleen helpt die niet: een worker mag bij een update niet omgeleid worden, dan blijft de oude staan.
  // Daarom staat op /app3/sw.js dezelfde opruim-worker als op /oud/; daarna brengt de omleiding hieronder het tabblad naar /.
  fs.mkdirSync(path.join(OUT, 'app3'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'app3/sw.js'), CLEANUP_SW);

  // Omleidingen en headers als bestanden in de publicatiemap: Netlify leest ze ook bij het uploaden van een zip,
  // waar netlify.toml (in de repo, niet in dist/) niet meekomt. Een bestaand bestand (zoals /app3/sw.js) wint van een omleiding.
  fs.writeFileSync(path.join(OUT, '_redirects'), `/app3/*  /:splat  301
/app3    /        301
`);
  // Beveiligingsheaders voor de hele site (audit 15 nov, P3-07). De CSP van de app zelf staat als meta-tag in index.html;
  // frame-ancestors werkt alleen als header en staat daarom hier.
  const SECURITY = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Content-Security-Policy: frame-ancestors 'none'
`;
  fs.writeFileSync(path.join(OUT, '_headers'), SECURITY + ['/', '/index.html', '/sw.js', '/oud/sw.js', '/app3/sw.js']
    .map(p => `${p}\n  Cache-Control: no-cache\n`).join(''));
}

// Service worker: versie uit de inhoud van alle bestanden, lijst van wat vooraf in de cache gaat.
// De opstartschermen (22 plaatjes, 2,7 MB) en de app-iconen haalt het toestel zelf op bij 'Zet op beginscherm'; de app toont ze
// nergens, dus ze horen niet in de voorraad van de worker (de iconen waren 850 kB van de 1,4 MB; audit 15 nov, P3-02).
const files = fs.readdirSync(OUT, { recursive: true }).map(String).filter(f => !f.startsWith('oud') && !f.startsWith('app3') && !f.startsWith('_') && !f.startsWith('icons') && !EXTRA_PAGES.includes(f) && fs.statSync(path.join(OUT, f)).isFile() && f !== 'sw.js').sort();
const hash = crypto.createHash('sha256');
for (const f of files) hash.update(f).update(fs.readFileSync(path.join(OUT, f)));
const version = hash.digest('hex').slice(0, 12);
const precache = ['index.html', ...files.filter(f => f !== 'index.html')];
fs.writeFileSync(path.join(OUT, 'sw.js'), fs.readFileSync(path.join(ROOT, 'app3/sw.js'), 'utf8').replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache)));
console.log(`app3 gebouwd in ${path.relative(ROOT, OUT)}`);
