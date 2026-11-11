// Maakt de opstartschermen (icons/splash/*.png) en schrijft de <link>-regels voor index.html.
// Gebruik: node scripts/maak-opstartschermen.mjs        (maakt de plaatjes)
//          node scripts/maak-opstartschermen.mjs --links (schrijft de link-regels naar stdout)
// Ontwerp: dezelfde groene ondergrond als de app, hoogtelijnen, een dunne messing lijn en de naam in serif.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { opstartPlaatjes } from './opstartscherm-maten.mjs';
import { labelContours } from '../app3/src/core/photos.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plaatjes = opstartPlaatjes();

if (process.argv.includes('--links')) {
  for (const p of plaatjes) console.log(`<link rel="apple-touch-startup-image" href="icons/${p.file}" media="${p.media}">`);
  process.exit(0);
}

const font = pathToFileURL(path.join(ROOT, 'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2')).href;
const lijnen = labelContours('Brew Console', 13).map((d, i) => `<path d="${d}" class="${i % 4 === 3 ? 'm' : ''}"/>`).join('');
const html = (w, h) => `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: Fraunces; src: url("${font}") format("woff2"); font-weight: 100 900; }
html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; background: #0d1611; }
body { background: radial-gradient(130% 70% at 50% -10%, #2f4a3d 0%, #142019 55%, #0b120e 100%); position: relative; }
svg { position: absolute; inset: 0; width: 100%; height: 100%; }
path { fill: none; stroke: #e6c58f; stroke-opacity: .10; stroke-width: 1.2; vector-effect: non-scaling-stroke; }
path.m { stroke-opacity: .2; }
.naam { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-58%); text-align: center; color: #f1e8d8; font-family: Fraunces, Georgia, serif; }
.naam i { display: block; width: ${Math.round(Math.min(w, h) * 0.12)}px; height: 2px; margin: 0 auto ${Math.round(Math.min(w, h) * 0.04)}px; background: #e6c58f; opacity: .8; }
.naam b { display: block; font-weight: 500; font-size: ${Math.round(Math.min(w, h) * 0.105)}px; letter-spacing: -.01em; line-height: 1.05; }
.naam span { display: block; margin-top: ${Math.round(Math.min(w, h) * 0.035)}px; font: 600 ${Math.round(Math.min(w, h) * 0.028)}px system-ui, sans-serif; letter-spacing: .34em; text-transform: uppercase; color: #e6c58f; }
</style><svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">${lijnen}</svg>
<div class="naam"><i></i><b>Brew Console</b><span>V60 · Chemex</span></div>`;


// Een gewone schermafbeelding van een verloop weegt 0,6–1 MB per plaatje (22 stuks). De kleuren liggen op één lijn
// (groen naar bijna zwart, plus de goudtint van de lijnen), dus een paletplaatje met ≤ 256 kleuren is vrijwel verliesvrij en
// weegt een fractie. Het palet wordt in de browser bepaald; hier schrijven we het PNG-bestand.
async function naarPalet(page, png) {
  const r = await page.evaluate(async d => {
    const img = new Image(); img.src = 'data:image/png;base64,' + d; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
    const a = x.getImageData(0, 0, c.width, c.height).data;
    // Exacte kleuren tellen; zijn het er meer dan 256, dan "median cut": steeds de doos met het grootste bereik doormidden.
    const count = new Map();
    for (let i = 0; i < a.length; i += 4) { const k = (a[i] << 16) | (a[i + 1] << 8) | a[i + 2]; count.set(k, (count.get(k) || 0) + 1); }
    let boxes = [[...count.entries()]];
    const range = box => { let lo = [255, 255, 255], hi = [0, 0, 0]; for (const [k] of box) for (let ch = 0; ch < 3; ch++) { const v = (k >> (16 - 8 * ch)) & 255; if (v < lo[ch]) lo[ch] = v; if (v > hi[ch]) hi[ch] = v; } return hi.map((h, ch) => h - lo[ch]); };
    while (boxes.length < 256) {
      let best = -1, bestSpan = 0, bestCh = 0;
      boxes.forEach((box, i) => { if (box.length < 2) return; const r = range(box); const m = Math.max(...r); if (m > bestSpan) { bestSpan = m; best = i; bestCh = r.indexOf(m); } });
      if (best < 0) break;
      const box = boxes[best], sh = 16 - 8 * bestCh;
      box.sort((p, q) => ((p[0] >> sh) & 255) - ((q[0] >> sh) & 255));
      const total = box.reduce((t, e) => t + e[1], 0); let run = 0, cut = 1;
      for (let i = 0; i < box.length - 1; i++) { run += box[i][1]; cut = i + 1; if (run >= total / 2) break; }
      boxes.splice(best, 1, box.slice(0, cut), box.slice(cut));
    }
    const where = new Map(); const pal = new Uint8Array(boxes.length * 3);
    boxes.forEach((box, n) => {
      let t = 0, sr = 0, sg = 0, sb = 0;
      for (const [k, c] of box) { where.set(k, n); t += c; sr += ((k >> 16) & 255) * c; sg += ((k >> 8) & 255) * c; sb += (k & 255) * c; }
      pal[n * 3] = Math.round(sr / t); pal[n * 3 + 1] = Math.round(sg / t); pal[n * 3 + 2] = Math.round(sb / t);
    });
    const idx = new Uint8Array(c.width * c.height);
    for (let i = 0, p = 0; i < a.length; i += 4, p++) idx[p] = where.get((a[i] << 16) | (a[i + 1] << 8) | a[i + 2]);
    let bin = ''; for (let i = 0; i < idx.length; i += 8192) bin += String.fromCharCode.apply(null, idx.subarray(i, i + 8192));
    let pb = ''; for (const v of pal) pb += String.fromCharCode(v);
    return { w: c.width, h: c.height, shift: 0, unique: count.size, pal: btoa(pb), idx: btoa(bin) };
  }, png.toString('base64'));
  if (!r) throw new Error('geen palet');
  const idx = Buffer.from(r.idx, 'base64'), pal = Buffer.from(r.pal, 'base64');
  const rows = Buffer.alloc((r.w + 1) * r.h);
  for (let y = 0; y < r.h; y++) { rows[y * (r.w + 1)] = 0; idx.copy(rows, y * (r.w + 1) + 1, y * r.w, (y + 1) * r.w); }
  const chunk = (type, data) => {
    const t = Buffer.from(type, 'ascii'); const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([t, data])) >>> 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(r.w, 0); ihdr.writeUInt32BE(r.h, 4); ihdr[8] = 8; ihdr[9] = 3;
  return { unique: r.unique, buf: Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('PLTE', pal), chunk('IDAT', zlib.deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]), shift: r.shift };
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'splash-'));
const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined, args: ['--no-sandbox'] });
fs.mkdirSync(path.join(ROOT, 'icons/splash'), { recursive: true });
for (const p of plaatjes) {
  const ctx = await browser.newContext({ viewport: { width: p.cssW, height: p.cssH }, deviceScaleFactor: p.ratio });
  const page = await ctx.newPage();
  const f = path.join(tmp, 'x.html'); fs.writeFileSync(f, html(p.cssW, p.cssH));
  await page.goto(pathToFileURL(f).href); await page.evaluate(() => document.fonts.ready);
  const shot = await page.screenshot({ type: 'png' });
  const { buf, unique } = await naarPalet(page, shot);
  fs.writeFileSync(path.join(ROOT, 'icons', p.file), buf);
  console.log(`${p.file}: ${Math.round(buf.length / 1024)} kB (${unique} kleuren naar ${Math.min(unique, 256)})`);
  await ctx.close();
}
await browser.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${plaatjes.length} opstartschermen gemaakt in icons/splash/`);
