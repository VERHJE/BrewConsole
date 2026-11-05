// Engine 3 · stap 6 · de inhoud van een QR-code op een zak.
//
// De pixels worden buiten de engine gelezen (engine3/qr/decode.ts); hier gaat het om wat erin staat:
//   - een webadres (webshop- of productpagina): het merk uit de domeinnaam en de woorden uit het pad
//   - JSON of "sleutel: waarde"-regels met boonvelden
//   - gewone tekst
// Alles wordt omgezet naar regels die de tekstherkenning kent (text.ts) en met bron 'qr' gescand,
// zodat QR en foto precies dezelfde regels volgen. Er wordt niets opgehaald: de engine heeft geen netwerk.

import type { BeanScan } from './scan.ts';
import { scanBeanText } from './scan.ts';

export type QrKind = 'url' | 'json' | 'keyvalue' | 'text';

export interface QrReading extends BeanScan {
  readonly kind: QrKind;
  /** Bij een webadres: het adres, zodat de frontend de pagina kan tonen of de tekst ervan laten plakken. */
  readonly url: string | null;
}

const LABELS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^(?:name|naam|title|product(?:name)?)$/, 'Name'],
  [/^(?:origin|country|land|herkomst)$/, 'Origin'],
  [/^(?:region|regio)$/, 'Region'],
  [/^(?:farm|estate|finca|hacienda|producer|producent)$/, 'Farm'],
  [/^(?:variety|varietal|vari[eë]teit|cultivar)$/, 'Variety'],
  [/^(?:process(?:ing)?|proces|verwerking)$/, 'Process'],
  [/^(?:roast(?:[_ -]?level)?|branding)$/, 'Roast'],
  [/^(?:roast[_ -]?date|roasted(?:[_ -]?on)?|branddatum)$/, 'Roasted on'],
  [/^(?:altitude|elevation|masl|hoogte)$/, 'Elevation'],
  [/^(?:notes?|tasting[_ -]?notes?|flavou?rs?|taste|smaak|smaaknotities)$/, 'Notes'],
  [/^(?:weight|size|bag[_ -]?size(?:[_ -]?g)?|inhoud|quantity)$/, 'Quantity']
];

function linesFromObject(o: Record<string, unknown>): { lines: string[]; roaster: string | null } {
  const lines: string[] = [];
  let roaster: string | null = null;
  for (const [k, v] of Object.entries(o)) {
    const key = k.trim().toLowerCase();
    const val = Array.isArray(v) ? v.filter(x => typeof x === 'string' || typeof x === 'number').join(', ')
      : (typeof v === 'string' || typeof v === 'number') ? String(v) : '';
    if (!val.trim()) continue;
    if (/^(?:roaster|brand|brander|merk)$/.test(key)) { roaster = val.trim().slice(0, 60); continue; }
    const label = LABELS.find(([re]) => re.test(key))?.[1];
    if (!label) continue;
    const unit = label === 'Quantity' && /^\d+$/.test(val.trim()) ? `${val.trim()}g` : val.trim();
    lines.push(`${label}: ${unit}`);
  }
  return { lines, roaster };
}

function brandFromHost(host: string): string | null {
  const parts = host.toLowerCase().replace(/^www\./, '').split('.').filter(Boolean);
  if (parts.length < 2) return null;
  const sld = parts[parts.length - 2]!;
  return /^[a-z][a-z0-9-]{2,30}$/.test(sld) ? sld.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null;
}

export function readQrPayload(payload: string, nowMs: number): QrReading {
  const trimmed = String(payload || '').trim();
  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL | null = null;
    try { url = new URL(trimmed); } catch { url = null; }
    if (url) {
      const slug = decodeURIComponent(url.pathname).replace(/[/_-]+/g, ' ').replace(/\.(?:html?|php|aspx?)$/i, '').trim();
      const scan = scanBeanText(slug, { source: 'qr', nowMs });
      const brand = brandFromHost(url.hostname);
      const fields = { ...scan.fields };
      const sources = { ...scan.sources };
      if (brand && !fields.roaster) { fields.roaster = brand; sources.roaster = 'qr'; }
      return { ...scan, fields, sources, kind: 'url', url: url.toString() };
    }
  }
  if (trimmed.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const { lines, roaster } = linesFromObject(parsed as Record<string, unknown>);
        const scan = scanBeanText(lines.join('\n'), { source: 'qr', nowMs });
        const fields = { ...scan.fields };
        const sources = { ...scan.sources };
        if (roaster) { fields.roaster = roaster; sources.roaster = 'qr'; }
        return { ...scan, fields, sources, kind: 'json', url: null };
      }
    } catch { /* geen JSON: als tekst behandelen */ }
  }
  const scan = scanBeanText(trimmed, { source: 'qr', nowMs });
  const keyvalue = trimmed.split('\n').filter(l => /^\s*[A-Za-z _-]{2,24}\s*[:=]/.test(l)).length >= 2;
  return { ...scan, kind: keyvalue ? 'keyvalue' : 'text', url: null };
}
