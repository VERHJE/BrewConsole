// Engine 3 · QR lezen uit pixels (browser, Worker of Node). Dit zit bewust buiten engine3/src: de engine
// is zuiver en kent geen camera of afbeeldingen. De iPhone heeft geen ingebouwde QR-lezer (BarcodeDetector,
// zie de toestelcheck), dus gebruiken we jsQR (Apache-2.0, pure JavaScript, geen WebAssembly nodig).
// De frontend geeft RGBA-pixels (canvas.getImageData); wat erin staat gaat naar readQrPayload().

import * as jsqrModule from 'jsqr';
import { readQrPayload, type QrReading } from '../src/bean/qr.ts';

type JsQr = (data: Uint8ClampedArray, width: number, height: number, options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' }) => { data: string } | null;

/** jsQR is een CommonJS/UMD-pakket; afhankelijk van Node, esbuild of de browser zit de functie één of twee 'default's diep. */
function resolveJsQr(mod: unknown): JsQr {
  let m: unknown = mod;
  for (let i = 0; i < 3 && typeof m !== 'function'; i++) m = (m as { default?: unknown } | null)?.default;
  if (typeof m !== 'function') throw new Error('jsqr kon niet worden geladen');
  return m as JsQr;
}
const jsQR: JsQr = resolveJsQr(jsqrModule);

export interface PixelImage { readonly data: Uint8ClampedArray; readonly width: number; readonly height: number }

/** De tekst in de eerste QR-code in het beeld, of null. Probeert ook een omgekeerde (lichte op donker) code. */
export function decodeQr(img: PixelImage): string | null {
  const r = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
  return r ? r.data : null;
}

export function readQrFromPixels(img: PixelImage, nowMs: number): QrReading | null {
  const text = decodeQr(img);
  return text === null ? null : readQrPayload(text, nowMs);
}
