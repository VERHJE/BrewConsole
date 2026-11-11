// Maakt alle app-iconen uit het bronbeeld assets/icoon-bron-1024.png (vol vierkant, 1024 x 1024, ondoorzichtig).
// Gebruik: node scripts/maak-iconen.mjs
//   icons/apple-touch-icon.png (180)   iOS rondt de hoeken zelf af
//   icons/icon-192.png, icons/icon-512.png   gewone iconen (vol vierkant)
//   icons/icon-maskable-512.png        hetzelfde beeld: Android mag er een cirkel of afgeronde vorm uit snijden; het onderwerp ligt binnen de veilige zone (middelste 80%)
// De bron is geleverd door Jelle (nov 2026). Het bestand blijft ongewijzigd in assets/ staan, zodat de iconen opnieuw te maken zijn.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bron = fs.readFileSync(path.join(ROOT, 'assets/icoon-bron-1024.png')).toString('base64');
const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<body></body>');
const uit = await page.evaluate(async d => {
  const img = new Image(); img.src = 'data:image/png;base64,' + d; await img.decode();
  if (img.width !== 1024 || img.height !== 1024) throw new Error(`bron is ${img.width} x ${img.height}, verwacht 1024 x 1024`);
  const canvas = (s) => { const c = document.createElement('canvas'); c.width = c.height = s; return c; };
  // Verkleinen in stappen van de helft: scherper dan in één keer van 1024 naar 180.
  const klein = (from, s) => { let cur = from; while (cur.width / 2 >= s) { const n = canvas(cur.width / 2); const x = n.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, n.width, n.height); cur = n; } const o = canvas(s); const x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.fillStyle = '#13201a'; x.fillRect(0, 0, s, s); x.drawImage(cur, 0, 0, s, s); return o; };
  const A = canvas(1024); const a = A.getContext('2d'); a.fillStyle = '#13201a'; a.fillRect(0, 0, 1024, 1024); a.drawImage(img, 0, 0);
  // Maskable: hetzelfde volle beeld. Het onderwerp (dripper, kan, druppel) ligt binnen de veilige zone van 80% (cirkel met straal 40%), de damp mag door de uitsnede vervagen.
  // Een eigen rand of marge eromheen gaf een zichtbaar kader als de launcher een cirkel uitsnijdt.
  const png = c => c.toDataURL('image/png').split(',')[1];
  return { 'apple-touch-icon.png': png(klein(A, 180)), 'icon-192.png': png(klein(A, 192)), 'icon-512.png': png(klein(A, 512)), 'icon-maskable-512.png': png(klein(A, 512)) };
}, bron);
for (const [naam, b64] of Object.entries(uit)) {
  const buf = Buffer.from(b64, 'base64'); fs.writeFileSync(path.join(ROOT, 'icons', naam), buf);
  console.log(`icons/${naam}: ${Math.round(buf.length / 1024)} kB`);
}
await browser.close();
