// Schermmaten waarvoor iOS een eigen opstartscherm (apple-touch-startup-image) nodig heeft.
// iOS kiest het plaatje alleen bij een EXACTE overeenkomst van breedte, hoogte en pixeldichtheid (in CSS-punten, staand);
// zonder match toont iOS een leeg scherm. Maten in punten uit https://www.ios-resolution.com/ (nov 2026).
// `landscape`: ook een liggend plaatje (iPad); op een telefoon is staand genoeg.
export const OPSTART_MATEN = [
  // iPhone
  { w: 375, h: 667, ratio: 2, landscape: false, modellen: 'iPhone SE (3e gen)' },
  { w: 390, h: 844, ratio: 3, landscape: false, modellen: 'iPhone 12, 13, 14, 16e, 17e' },
  { w: 393, h: 852, ratio: 3, landscape: false, modellen: 'iPhone 15, 15 Pro, 16, 14 Pro' },
  { w: 402, h: 874, ratio: 3, landscape: false, modellen: 'iPhone 16 Pro, 17, 17 Pro, 18 Pro' },
  { w: 420, h: 912, ratio: 3, landscape: false, modellen: 'iPhone Air' },
  { w: 428, h: 926, ratio: 3, landscape: false, modellen: 'iPhone 12/13 Pro Max, 14 Plus' },
  { w: 430, h: 932, ratio: 3, landscape: false, modellen: 'iPhone 15 Plus, 15 Pro Max, 16 Plus, 14 Pro Max' },
  { w: 440, h: 956, ratio: 3, landscape: false, modellen: 'iPhone 16 Pro Max, 17 Pro Max, 18 Pro Max' },
  // iPad
  { w: 744, h: 1133, ratio: 2, landscape: true, modellen: 'iPad mini (6e en 7e gen)' },
  { w: 810, h: 1080, ratio: 2, landscape: true, modellen: 'iPad (7e t/m 9e gen)' },
  { w: 820, h: 1180, ratio: 2, landscape: true, modellen: 'iPad (10e en 11e gen), iPad Air 11"' },
  { w: 834, h: 1194, ratio: 2, landscape: true, modellen: 'iPad Pro 11" (eerdere gen), iPad Air (4e en 5e gen)' },
  { w: 834, h: 1210, ratio: 2, landscape: true, modellen: 'iPad Pro 11" (M4 en later)' },
  { w: 1024, h: 1366, ratio: 2, landscape: true, modellen: 'iPad Pro 12,9", iPad Air 13"' },
  { w: 1032, h: 1376, ratio: 2, landscape: true, modellen: 'iPad Pro 13" (M4 en later)' }
];

/** Alle plaatjes: bestandsnaam, pixelmaat en de mediaquery waarmee iOS het kiest. */
export function opstartPlaatjes() {
  const out = [];
  for (const m of OPSTART_MATEN) {
    const stand = [{ o: 'portrait', cw: m.w, ch: m.h }];
    if (m.landscape) stand.push({ o: 'landscape', cw: m.h, ch: m.w });
    for (const s of stand) {
      const px = { w: s.cw * m.ratio, h: s.ch * m.ratio };
      out.push({
        file: `splash/splash-${px.w}x${px.h}.png`, cssW: s.cw, cssH: s.ch, ratio: m.ratio, ...px,
        // device-width/height blijven staand (portrait-maat); de richting zit in `orientation`
        media: `(device-width: ${m.w}px) and (device-height: ${m.h}px) and (-webkit-device-pixel-ratio: ${m.ratio}) and (orientation: ${s.o})`
      });
    }
  }
  return out;
}
