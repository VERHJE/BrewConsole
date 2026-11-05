// Engine 3 · stap 6 · zakherkenning uit tekst (geplakt of OCR).
//
// Dit is parseBeanText() uit de huidige app (brewconsole_v2_2.html, PR #40), overgezet naar strikte
// TypeScript. De woordenlijsten komen uit data/bean-scan-data.ts (gegenereerd uit de app). Een
// differentiële test (engine3/test/bean-text.test.ts) eist dat dit voor dezelfde tekst precies
// dezelfde uitkomst geeft als de app, zodat de zakken die daar getest zijn hier ook kloppen.
//
// Verschil met de app: geen Date.now() (de engine kent geen klok): extractRoastDateFromText krijgt
// het huidige moment mee. Verder zijn de reguliere expressies en de volgorde van de stappen letterlijk
// overgenomen.

import { FLAVOR_WHEEL } from '../data/flavor-wheel.ts';
import {
  COUNTRY_SCAN_SYNONYMS, EXPERIMENTAL_SCAN_KEYWORDS, FLAVOR_SCAN_SYNONYMS, INTENDED_USE_SCAN_KEYWORDS,
  PROCESS_SCAN_KEYWORDS, REGION_SCAN_SYNONYMS, ROAST_SCAN_KEYWORDS, VARIETY_SCAN_SYNONYMS
} from '../data/bean-scan-data.ts';

// ───────────────────────────── tikfouttolerantie ─────────────────────────────

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1), curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    const tmp = prev; prev = curr; curr = tmp;
  }
  return prev[n]!;
}
function maxFuzzyDistance(len: number): number {
  if (len <= 3) return 0;
  if (len <= 6) return 1;
  return 2;
}
export function tokenizeForFuzzy(text: string): string[] {
  return (text.match(/[a-zà-öø-ÿ]+/gi) || []).map(w => w.toLowerCase());
}
function fuzzyMatchesKeyword(tokens: readonly string[], keyword: string): boolean {
  if (!keyword || keyword.includes(' ')) return false; // meerdere woorden: te riskant om fuzzy te matchen
  const maxDist = maxFuzzyDistance(keyword.length);
  if (maxDist === 0) return false;
  return tokens.some(tok => {
    if (Math.abs(tok.length - keyword.length) > maxDist) return false;
    return levenshtein(tok, keyword) <= maxDist;
  });
}
function textOrFuzzyIncludes(text: string, tokens: readonly string[], keyword: string): boolean {
  return text.includes(keyword) || fuzzyMatchesKeyword(tokens, keyword);
}
function matchKind(text: string, tokens: readonly string[], keyword: string): 'exact' | 'fuzzy' | null {
  if (text.includes(keyword)) return 'exact';
  if (fuzzyMatchesKeyword(tokens, keyword)) return 'fuzzy';
  return null;
}

// ───────────────────────────── smaaknotities ─────────────────────────────

const FLAVOR_CONTEXT_STRIP_PATTERNS: readonly RegExp[] = [
  /(?:extra[- ]?)?(?:light|medium|dark|city|full[- ]city|french|italian|vienna|filter|espresso|omni)(?:[- ](?:to[- ])?(?:light|medium|dark))?[- ]?roast(?:ed|ing)?(?![a-zà-öø-ÿ])/g,
  /roast(?:ed|ing)?[- ](?:on|by|in|at|date|level|profile|degree)(?![a-zà-öø-ÿ])/g,
  /(?<![a-zà-öø-ÿ])roast(?:er|ers|ery|eries)(?![a-zà-öø-ÿ])/g,
  /(?:licht|lichte|medium|middel|donker|donkere)[- ]?(?:gebrand|gebrande|branding|geroosterd|geroosterde)(?![a-zà-öø-ÿ])/g,
  /(?:gebrand|geroosterd) op(?![a-zà-öø-ÿ])/g,
  /(?:(?:white|yellow|golden|red|black|double|hydro)[- ])?honey[- ](?:process(?:ed)?|method)(?![a-zà-öø-ÿ])/g,
  /(?:white|yellow|golden|red|black|double|hydro)[- ]honey(?![a-zà-öø-ÿ])/g,
  /(?:(?:double|triple|lactic|anaerobic|aerobic|yeast|extended|co|carbonic|thermal)[- ]?)+(?:fermented|fermentation|ferment)(?:[- ](?:honey|natural|washed|process))?(?![a-zà-öø-ÿ])/g,
  /fermented[- ](?:honey|natural|washed)(?![a-zà-öø-ÿ])/g,
  /lactic(?:[- ]acid)?[- ](?:bacteria|process|fermentation|fermented)(?![a-zà-öø-ÿ])/g,
  /(?:sugar[- ]?cane|ea|e\.a\.|swiss[- ]water|mountain[- ]water|co2|ethyl[- ]acetate)[-\s]+(?:decaf(?:feinated)?|decaffeination|process|method)(?![a-zà-öø-ÿ])/g,
  /roasted(?=[- ](?:(?:red|green|yellow)[- ])?(?:apples?|pears?|peach(?:es)?|plums?|pineapples?|bananas?|figs?|cherr(?:y|ies)|apricots?|nectarines?|grapes?)(?![a-zà-öø-ÿ]))/g
];
function stripFlavorContextPhrases(text: string): string {
  return FLAVOR_CONTEXT_STRIP_PATTERNS.reduce((t, re) => t.replace(re, m => ' '.repeat(m.length)), text);
}
function escapeForRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}
interface Span { readonly start: number; readonly end: number }
function flavorKeywordSpans(text: string, keyword: string): Span[] {
  const variants = [keyword, keyword + 's', keyword + 'es', keyword + 'en', keyword + 'n', keyword + 'e'];
  if (keyword.endsWith('y')) variants.push(keyword.slice(0, -1) + 'ies');
  const alt = variants.sort((a, b) => b.length - a.length).map(escapeForRegExp).join('|');
  const re = new RegExp(`(^|[^a-zà-öø-ÿ])(${alt})(?![a-zà-öø-ÿ])`, 'g');
  const spans: Span[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const start = m.index + m[1]!.length;
    spans.push({ start, end: start + m[2]!.length });
    re.lastIndex = start + m[2]!.length;
  }
  return spans;
}
function flavorFuzzyDistance(len: number): number {
  if (len <= 6) return 0;
  if (len <= 9) return 1;
  return 2;
}
const SHARED_HEAD_RE = /([a-zà-öø-ÿ]+)\s*(?:&|\+|\/|\band\b|\ben\b)\s*([a-zà-öø-ÿ]+)\s+(fruit|fruits|vruchten|berries|bessen|chocolate|chocolade|thee|tea)(?![a-zà-öø-ÿ])/g;
/** "Gedroogd & tropisch fruit" → "gedroogd fruit, tropisch fruit". */
export function expandSharedHeadNouns(text: string): string {
  return String(text || '').replace(SHARED_HEAD_RE, (_m, a: string, b: string, head: string) => `${a} ${head}, ${b} ${head}`);
}

/** Alle tags van het smaakwiel, in volgorde van het wiel, zonder dubbelen. */
const WHEEL_TAGS: readonly string[] = Array.from(new Set(FLAVOR_WHEEL.flatMap(c => c.subgroups.flatMap(sg => sg.tags.map(t => t.tag)))));

export function scanFlavorTagsInText(lowerText: string, opts?: { readonly fuzzy?: boolean }): Set<string> {
  const fuzzy = !!(opts && opts.fuzzy);
  const text = stripFlavorContextPhrases(expandSharedHeadNouns(lowerText || ''));
  const candidates: Array<{ keyword: string; tag: string }> = [];
  WHEEL_TAGS.forEach(tag => candidates.push({ keyword: tag.toLowerCase(), tag }));
  Object.keys(FLAVOR_SCAN_SYNONYMS).forEach(kw => candidates.push({ keyword: kw, tag: FLAVOR_SCAN_SYNONYMS[kw]! }));
  const hits: Array<{ tag: string; start: number; end: number }> = [];
  candidates.forEach(c => flavorKeywordSpans(text, c.keyword).forEach(sp => hits.push({ tag: c.tag, start: sp.start, end: sp.end })));
  const kept = hits.filter(h => !hits.some(o => (o.end - o.start) > (h.end - h.start) && o.start <= h.start && o.end >= h.end));
  const tags = new Set(kept.map(h => h.tag));
  if (fuzzy) {
    const tokenRe = /[a-zà-öø-ÿ]+/g;
    const freeTokens: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = tokenRe.exec(text))) {
      const start = m.index, end = start + m[0].length;
      if (!kept.some(h => h.start < end && h.end > start)) freeTokens.push(m[0]);
    }
    candidates.forEach(c => {
      if (tags.has(c.tag) || /[^a-zà-öø-ÿ]/.test(c.keyword)) return;
      const maxDist = flavorFuzzyDistance(c.keyword.length);
      if (maxDist === 0) return;
      if (freeTokens.some(tok => Math.abs(tok.length - c.keyword.length) <= maxDist && levenshtein(tok, c.keyword) <= maxDist)) tags.add(c.tag);
    });
  }
  return tags;
}

// ───────────────────────────── velden op het etiket ─────────────────────────────

/** Hoogte uit de tekst: gemiddelde van een bereik, of een los getal. */
export function extractAltitudeFromText(text: string): number | null {
  let m = text.match(/(?:hoogte|altitude|elevation)\D{0,12}(\d{3,4})\s*[-–]\s*(\d{3,4})(?!\d)/i);
  if (m) return Math.round((parseInt(m[1]!, 10) + parseInt(m[2]!, 10)) / 2);
  m = text.match(/(\d{3,4})\s*[-–]\s*(\d{3,4})\s*m(?:\.?a\.?s\.?l\.?|eter|eters)?\b/i);
  if (m) return Math.round((parseInt(m[1]!, 10) + parseInt(m[2]!, 10)) / 2);
  m = text.match(/(\d{3,4})\s*m\.?a\.?s\.?l\.?\b/i);
  if (m) return parseInt(m[1]!, 10);
  m = text.match(/(?:hoogte|altitude|elevation|grown at)\D{0,12}(\d{3,4})/i);
  if (m) return parseInt(m[1]!, 10);
  m = text.match(/(\d{3,4})\s*(?:meter|meters)\b/i);
  if (m) return parseInt(m[1]!, 10);
  return null;
}

/** Hoogte als bereik (Engine 3 bewaart een bereik): hetzelfde als hierboven, maar zonder te middelen. */
export function extractAltitudeRangeFromText(text: string): { minM: number; maxM: number } | null {
  const range = (a: string, b: string): { minM: number; maxM: number } => {
    const x = parseInt(a, 10), y = parseInt(b, 10);
    return { minM: Math.min(x, y), maxM: Math.max(x, y) };
  };
  let m = text.match(/(?:hoogte|altitude|elevation)\D{0,12}(\d{3,4})\s*[-–]\s*(\d{3,4})(?!\d)/i);
  if (m) return range(m[1]!, m[2]!);
  m = text.match(/(\d{3,4})\s*[-–]\s*(\d{3,4})\s*m(?:\.?a\.?s\.?l\.?|eter|eters)?\b/i);
  if (m) return range(m[1]!, m[2]!);
  const single = extractAltitudeFromText(text);
  return single === null ? null : { minM: single, maxM: single };
}

export function tidyAllCaps(line: string): string {
  if (!/[A-Z]/.test(line) || line !== line.toUpperCase() || line.length < 4) return line;
  return line.toLowerCase().replace(/(^|[\s\-/(])([a-zà-ÿ])/g, (_m, a: string, b: string) => a + b.toUpperCase());
}

export function extractFarmFromText(rawText: string | null | undefined): string | null {
  if (!rawText) return null;
  const m = rawText.match(/(?:^|\n)\s*(?:farm|estate|finca|hacienda|washing station|wasstation)\s*[:：]\s*([^\n,;]{2,60})/i);
  if (m) return m[1]!.trim();
  const inl = rawText.match(/(?:^|[^a-zà-öø-ÿ])((?:finca|hacienda|sitio|fazenda)\s+[a-zà-öø-ÿ0-9][a-zà-öø-ÿ0-9 '’.#&-]{1,40}?)\s*(?=$|\n|[,;|]|\s[-–—]\s)/im);
  if (!inl) return null;
  const toks = inl[1]!.trim().split(/\s+/);
  while (toks.length > 2 && !/^#?\d+$/.test(toks[toks.length - 1]!) && (/^[a-zà-öø-ÿ]{1,2}$/i.test(toks[toks.length - 1]!) || /[^a-zà-öø-ÿ'-]/i.test(toks[toks.length - 1]!))) toks.pop();
  const farm = toks.join(' ');
  const letterToks = toks.filter(t => /[a-zà-öø-ÿ]/i.test(t));
  return letterToks.every(t => t === t.toUpperCase()) ? tidyAllCaps(farm) : farm;
}

const SCAN_NOTES_FIELD_RE = /^\s*(?:tasting notes|flavou?r notes|cup notes|cup profile|notes|note|taste|smaaknotities|smaakprofiel|smaak|in de kop)\b\s*[:：]?\s*(.*)$/i;
const SCAN_OTHER_FIELD_RE = /^\s*(?:process(?:ing)?|proces|verwerking|variety|varietal|vari[eë]teit|sort|cultivar|region|regio|regi[oó]n|origin|herkomst|country|elevation|altitude|hoogte|harvest(?:\s+year)?|oogst(?:jaar)?|quantity|amount|inhoud|preparation|manufacturer|producer|producent|farm|finca|estate|roast(?:\s+(?:type|level|date|profile))?|cupping score|score|best before|ingredi[eë]nts?|co[oö]rdinat(?:es|en)|perfect brew|name|naam)(?![a-zà-öø-ÿ])/i;
const SCAN_REGION_FIELD_RE = /^\s*(?:region|regio|regi[oó]n)\s*[:：]?\s+(.{2,80})$/i;
const SCAN_WEBSHOP_RE = /add to cart|in (?:de )?winkel(?:wagen|mand)|excl\.?\s*(?:vat|btw)|terms of delivery|delivery is free|verzendkosten/i;
const SCAN_DECAF_RE = /(?:^|[^a-zà-öø-ÿ])(?:decaf(?:feinated)?|cafe[iï]nevrij|entkoffeiniert|swiss[- ]water|ethyl[- ]acetate)(?![a-zà-öø-ÿ])/i;

export interface FlavorSource { readonly text: string; readonly notes: string[]; readonly hasNotesField: boolean }

export function scanFlavorSourceText(rawText: string): FlavorSource {
  const lines = String(rawText || '').split('\n');
  const notes: string[] = [];
  let hasNotesField = false, inNotes = false;
  const kept: string[] = [];
  lines.forEach(line => {
    const t = line.trim();
    const nm = t.match(SCAN_NOTES_FIELD_RE);
    if (nm) { hasNotesField = true; inNotes = true; if (nm[1]) notes.push(nm[1]); kept.push(nm[1] || ''); return; }
    if (inNotes && notes.length && /[,|&+/]\s*$/.test(notes[notes.length - 1]!) && t && !SCAN_OTHER_FIELD_RE.test(t)) { notes[notes.length - 1] += ' ' + t; kept.push(t); return; }
    inNotes = false;
    if (SCAN_OTHER_FIELD_RE.test(t)) { kept.push(''); return; }
    kept.push(t);
  });
  const isProse = (l: string): boolean => /[a-zà-öø-ÿ]\.\s*$/i.test(l) || /[a-zà-öø-ÿ]\.\s+[A-ZÀ-Ý]/.test(l)
    || l.split(/[,;|]/).some(seg => seg.split(/\s+/).filter(w => /[a-zà-öø-ÿ]/i.test(w)).length >= 5);
  const body = hasNotesField ? kept.filter(l => !isProse(l)) : kept;
  return { text: body.join('\n').toLowerCase(), notes, hasNotesField };
}

/** Notities uit het notitieveld die geen enkele smaaktag opleveren: niet raden, wel bewaren. */
export function unmappedScanNotes(notes: readonly string[]): string[] {
  const out: string[] = [];
  notes.forEach(n => expandSharedHeadNouns(n.toLowerCase()).split(/\s*[,;|]\s*|\s+&\s+/).forEach(item => {
    const it = item.replace(/[*.]+$/, '').trim();
    if (it.length < 3 || it.length > 40 || !/^[a-zà-öø-ÿ][a-zà-öø-ÿ '’-]*$/.test(it) || it.split(/\s+/).length > 3) return;
    if (scanFlavorTagsInText(it, { fuzzy: false }).size) return;
    if (!out.includes(it)) out.push(it);
  }));
  return out;
}

// ───────────────────────────── naam, brander, zakgrootte, branddatum ─────────────────────────────

const NAME_SKIP_RE = /^(roast(ed)?\b|gebrand|branddatum|best before|tht\b|ten minste|origin\b|herkomst|process\b|processing\b|proces\b|notes?\b|smaak|tasting|taste\b|variety\b|varietal\b|vari[eë]teit\b|sort\b|region\b|regio\b|elevation\b|altitude\b|hoogte\b|country\b|quantity\b|amount\b|inhoud\b|preparation\b|cupping\b|harvest\b|oogst|manufacturer\b|producer\b|ingredi|co[oö]rdinat|perfect brew\b|info\b|score\b|specification\b|terms of delivery\b|add to cart\b)/i;
const NAME_GENERIC_RE = /^(?:(?:100\s*%\s*)?(?:specialty|speciality)\s+arabica|100\s*%\s*arabica|whole bean coffee[*"'”]*|whole beans?|hele bonen|single origin|filter roast|espresso roast|omni roast|name|naam|where have your beans been\??|ingredients?\b.*|roasted beans)$/i;
const NAME_TAGLINE_RE = /^[^\n]{0,40}\b(?:coffee|koffie)\*?$/i;
const ROASTER_LINE_RE = /\b(roasters?|roastery|roasting( co(mpany)?)?|coffee co\.?|coffee company|koffiebranderij|branderij|brandery|rösterei|kaffeerösterei|torrefacteur|torréfaction)\b/i;

function isCountryOnlyLine(line: string): boolean {
  const l = String(line || '').toLowerCase().replace(/[^a-zà-öø-ÿ\s-]/g, '').trim();
  return Object.prototype.hasOwnProperty.call(COUNTRY_SCAN_SYNONYMS, l);
}
function startsWithCountry(line: string): boolean {
  const l = String(line || '').toLowerCase().trim();
  return Object.keys(COUNTRY_SCAN_SYNONYMS).some(k => l === k || l.startsWith(k + ' '));
}
function isTaglineLine(line: string): boolean {
  return NAME_TAGLINE_RE.test(line) && !/www|\.(?:com|nl|be|coffee)\b/i.test(line) && line.split(/\s+/).length <= 4 && !isCountryOnlyLine(line.replace(/\b(?:coffee|koffie)\*?$/i, ''));
}
function looksLikeBrandLine(line: string): boolean {
  return line.split(/\s+/).length <= 4 && !/\d/.test(line) && !/(?:process|roast|amount|date|notes?|variety|taste|origin|region|score)/i.test(line);
}
function roasterFromWebAddress(rawText: string): string | null {
  const m = String(rawText || '').match(/www\s*\.?\s*([a-z][a-z0-9-]{2,30})\s*\.\s*(?:coffee|com|nl|be|de|eu|co|cafe)\b|www\s+([a-z][a-z0-9-]{2,30})\s+(?:coffee|com|nl|be)\b/i);
  const name = m ? (m[1] || m[2]) : null;
  return name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : null;
}
function isRoasterLine(line: string): boolean { return ROASTER_LINE_RE.test(line) && line.length <= 50; }
function roasterLineIndex(lines: readonly string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (isRoasterLine(l)) return i;
    if (isCountryOnlyLine(l) || startsWithCountry(l) || NAME_GENERIC_RE.test(l) || l.length > 40) continue;
    const next = lines[i + 1];
    if (next && isTaglineLine(next) && !isTaglineLine(l) && looksLikeBrandLine(l)) return i;
    if (i === 0 && next && /^[A-ZÀ-Ý][A-ZÀ-Ý&'’.-]{2,}$/.test(l) && startsWithCountry(next)) return i;
  }
  return -1;
}
function cleanScanLine(line: string): string {
  const toks = String(line || '').trim().split(/\s+/).filter(Boolean);
  const junk = (t: string): boolean => /^[^a-z0-9]*[a-z]{0,3}[^a-z0-9]+$/i.test(t) || /^[^a-z0-9]+$/i.test(t) || /^[a-z]$/i.test(t) || /^[a-z]{1,5}[^a-z0-9\s]+$/.test(t);
  while (toks.length > 1 && junk(toks[0]!)) toks.shift();
  while (toks.length > 1 && (/^(?:\d|[a-z]{1,2})$/.test(toks[toks.length - 1]!) || /^[^a-z0-9]+$/i.test(toks[toks.length - 1]!))) toks.pop();
  return toks.join(' ');
}
function looksLikeText(line: string): boolean {
  const chars = line.replace(/\s/g, '');
  if (!chars) return false;
  const letters = (chars.match(/[a-zà-öø-ÿ]/gi) || []).length;
  return /[a-zà-öø-ÿ]{4,}/i.test(line) && letters / chars.length >= 0.7;
}
function scanNameLines(rawText: string): string[] {
  return String(rawText || '').split('\n').map(cleanScanLine).filter(l => l && looksLikeText(l));
}

export function extractRoasterFromText(rawText: string): string | null {
  const lines = scanNameLines(rawText);
  const i = roasterLineIndex(lines);
  if (i >= 0) return tidyAllCaps(lines[i]!.replace(/[®™]/g, '').trim());
  return roasterFromWebAddress(rawText);
}
/** Zakgrootte: alleen een plausibele zak (100–2500 g); meerdere maten betekent een bestelkeuze: niet raden. */
export function extractBagSizeFromText(rawText: string): number | null {
  const t = String(rawText || '');
  const sizes = new Set<number>();
  for (const m of t.matchAll(/(?:^|[^\d.,])(\d(?:[.,]\d)?)\s?kg\b/gi)) { const g = Math.round(parseFloat(m[1]!.replace(',', '.')) * 1000); if (g >= 100 && g <= 2500) sizes.add(g); }
  for (const m of t.matchAll(/(?:^|[^\d.,])(\d{3,4})\s?(?:g|gr|gram|grams)\b/gi)) { const g = Number(m[1]); if (g >= 100 && g <= 2500) sizes.add(g); }
  return sizes.size === 1 ? [...sizes][0]! : null;
}
export function extractBeanNameFromText(rawText: string): string | null {
  const all = scanNameLines(rawText);
  for (const l of all) {
    const m = l.match(/^(?:name|naam)\s*[:：]?\s+(.{2,60})$/i);
    if (m) return tidyAllCaps(m[1]!.trim());
  }
  const lines = all.filter(l => !NAME_SKIP_RE.test(l));
  const ri = roasterLineIndex(lines);
  const isProseBit = (l: string): boolean => /^[a-zà-öø-ÿ]/.test(l) && l.split(/\s+/).length >= 4;
  const isFlavorList = (l: string): boolean => scanFlavorTagsInText(l.toLowerCase()).size >= 2;
  const isHeaderRow = (l: string): boolean => (l.match(/(?:process|roast\s*(?:type|date)|amount|variety|taste|best before|origin|notes)/gi) || []).length >= 2;
  const nonRoaster = lines.filter((l, i) => i !== ri && !isRoasterLine(l) && !NAME_GENERIC_RE.test(l) && !(ri >= 0 && i === ri + 1 && isTaglineLine(l)) && !isTaglineLine(l) && !isProseBit(l) && !isFlavorList(l) && !isHeaderRow(l));
  const ci = nonRoaster.findIndex(l => startsWithCountry(l));
  if (ci > 0) nonRoaster.splice(0, ci);
  let first: string | null = nonRoaster.length ? tidyAllCaps(nonRoaster[0]!) : (lines[0] || null);
  if (!first) return null;
  if (isCountryOnlyLine(first) && nonRoaster.length > 1 && !isCountryOnlyLine(nonRoaster[1]!) && !/(?:^|[^a-zà-öø-ÿ])(?:finca|hacienda|sitio|fazenda)(?![a-zà-öø-ÿ])/i.test(nonRoaster[1]!)) {
    const next = tidyAllCaps(nonRoaster[1]!).split(/\s*[,;|]\s*|\s[—–-]\s/)[0]!.trim();
    if (next.length >= 3 && next.length <= 40 && next.split(/\s+/).length <= 6) first = `${first} ${next}`;
  }
  if (first.length <= 40 && !/[.:;]\s/.test(first) && !/\s[—–|]\s/.test(first)) return first;
  const head = first.split(/\s[—–\-|·]\s|[.,;:](?:\s|$)/)[0]!.trim();
  if (head.length >= 3 && head.length <= 60) return head;
  const words = first.split(/\s+/).slice(0, 6).join(' ');
  return words.length <= 60 ? words : words.slice(0, 60).trim();
}

const SCAN_MONTHS: Readonly<Record<string, number>> = { jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, mrt: 3, maart: 3, mar: 3, march: 3, apr: 4, april: 4, mei: 5, may: 5, jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7, aug: 8, augustus: 8, august: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
function scanYmd(y: number, mo: number, d: number): string | null {
  if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function parseScanDate(s: string): string | null {
  let m: RegExpMatchArray | null;
  if ((m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return scanYmd(+m[1]!, +m[2]!, +m[3]!);
  if ((m = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/))) { let y = +m[3]!; if (y < 100) y += 2000; return scanYmd(y, +m[2]!, +m[1]!); }
  if ((m = s.match(/(\d{1,2})\s+([a-zé]+)\.?\s+(\d{4})/i))) { const mo = SCAN_MONTHS[m[2]!.toLowerCase()]; if (mo) return scanYmd(+m[3]!, mo, +m[1]!); }
  if ((m = s.match(/([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/i))) { const mo = SCAN_MONTHS[m[1]!.toLowerCase()]; if (mo) return scanYmd(+m[3]!, mo, +m[2]!); }
  return null;
}
const ROAST_DATE_KEYWORD_RE = /(roasted(\s+on)?|roast(ing)?\s+date|roast\s+on|gebrand(\s+op)?|brand\s*datum|geroosterd(\s+op)?|röstdatum|geröstet(\s+am)?)/i;
/** Branddatum (YYYY-MM-DD) met een brandwoord ervoor; toekomst of ouder dan ~13 maanden telt niet. `nowMs` is verplicht: de engine kent geen klok. */
export function extractRoastDateFromText(rawText: string, nowMs: number): string | null {
  for (const line of String(rawText || '').split('\n')) {
    const kw = line.match(ROAST_DATE_KEYWORD_RE);
    if (!kw) continue;
    const at = kw.index ?? 0;
    const iso = parseScanDate(line.slice(at + kw[0].length, at + kw[0].length + 40));
    if (!iso) continue;
    const t = Date.parse(iso + 'T12:00:00Z');
    if (isNaN(t) || t > nowMs + 86400000 || nowMs - t > 400 * 86400000) continue;
    return iso;
  }
  return null;
}

// ───────────────────────────── alles samen ─────────────────────────────

export interface ParsedBeanText {
  roast: string | null;
  intendedUse: string | null;
  process: string | null;
  processAmbiguous: string | null;
  country: string | null;
  countryFuzzy: boolean;
  region: string | null;
  regionFuzzy: boolean;
  farm: string | null;
  variety: string | null;
  varietyFuzzy: boolean;
  tags: string[];
  unmappedNotes: string[];
  experimental: boolean;
  decaf: boolean;
  altitude: number | null;
  webshop: boolean;
  name?: string | null;
  roaster?: string | null;
  bagSizeG?: number | null;
  roastDate?: string | null;
}

export function parseBeanText(rawText: string, nowMs: number): ParsedBeanText {
  const raw = String(rawText || '');
  const text = raw.toLowerCase();
  const found: ParsedBeanText = { roast: null, intendedUse: null, process: null, processAmbiguous: null, country: null, countryFuzzy: false, region: null, regionFuzzy: false, farm: null, variety: null, varietyFuzzy: false, tags: [], unmappedNotes: [], experimental: false, decaf: false, altitude: null, webshop: false };
  if (!text.trim()) return found;
  const tokens = tokenizeForFuzzy(text);
  found.webshop = SCAN_WEBSHOP_RE.test(raw);
  found.farm = extractFarmFromText(raw);

  for (const key of Object.keys(ROAST_SCAN_KEYWORDS)) {
    if (ROAST_SCAN_KEYWORDS[key]!.some(kw => textOrFuzzyIncludes(text, tokens, kw))) { found.roast = key; break; }
  }
  const useText = text.replace(/(?:espresso|filter|whole bean|hele bonen)[- ]prep(?![a-zà-öø-ÿ])/g, m => ' '.repeat(m.length));
  const useTokens = tokenizeForFuzzy(useText);
  for (const key of Object.keys(INTENDED_USE_SCAN_KEYWORDS)) {
    if (INTENDED_USE_SCAN_KEYWORDS[key]!.some(kw => textOrFuzzyIncludes(useText, useTokens, kw))) { found.intendedUse = key; break; }
  }
  if (found.intendedUse && found.intendedUse !== 'omni' && /(?:^|[^a-z])espresso(?![a-z])/.test(useText) && /(?:^|[^a-z])filter(?![a-z])/.test(useText)) found.intendedUse = 'omni';
  const SEMI_RE = /semi[- ]?washed/g;
  if (SEMI_RE.test(text)) found.processAmbiguous = 'semi-washed';
  const procText = text.replace(SEMI_RE, m => ' '.repeat(m.length));
  const procTokens = tokenizeForFuzzy(procText);
  for (const key of Object.keys(PROCESS_SCAN_KEYWORDS)) {
    if (PROCESS_SCAN_KEYWORDS[key]!.some(kw => textOrFuzzyIncludes(procText, procTokens, kw))) { found.process = key; break; }
  }
  found.experimental = EXPERIMENTAL_SCAN_KEYWORDS.some(kw => textOrFuzzyIncludes(procText, procTokens, kw));
  if (found.experimental && !found.process) found.process = 'anaerobic';
  found.decaf = SCAN_DECAF_RE.test(raw);
  for (const key of Object.keys(COUNTRY_SCAN_SYNONYMS)) {
    const kind = matchKind(text, tokens, key);
    if (kind) { found.country = COUNTRY_SCAN_SYNONYMS[key]!; found.countryFuzzy = kind === 'fuzzy'; break; }
  }
  for (const key of Object.keys(REGION_SCAN_SYNONYMS).sort((a, b) => b.length - a.length)) {
    const kind = matchKind(text, tokens, key);
    if (kind === 'fuzzy' && key.length < 5) continue;
    if (kind) { found.region = REGION_SCAN_SYNONYMS[key]!; found.regionFuzzy = kind === 'fuzzy'; break; }
  }
  if (!found.region) {
    for (const line of raw.split('\n')) {
      const m = line.match(SCAN_REGION_FIELD_RE);
      if (!m) continue;
      const head = m[1]!.split(/\s+[-–—]\s*|\s*[-–—]\s+|\s*[,;|]\s*|\s+-(?=[a-zà-öø-ÿ])/i)[0]!.trim();
      if (head.length >= 4 && head.length <= 40 && /^[A-ZÀ-Ý][A-Za-zÀ-ÿ' -]+$/.test(head) && !/^(?:finca|hacienda|sitio|fazenda)\b/i.test(head)) { found.region = tidyAllCaps(head); break; }
    }
  }
  for (const key of Object.keys(VARIETY_SCAN_SYNONYMS).sort((a, b) => b.length - a.length)) {
    const kind = matchKind(text, tokens, key);
    if (kind) { found.variety = VARIETY_SCAN_SYNONYMS[key]!; found.varietyFuzzy = kind === 'fuzzy'; break; }
  }
  found.altitude = extractAltitudeFromText(text);
  const flavorSrc = scanFlavorSourceText(raw);
  found.tags = Array.from(scanFlavorTagsInText(flavorSrc.text, { fuzzy: true }));
  found.unmappedNotes = unmappedScanNotes(flavorSrc.notes);

  found.name = extractBeanNameFromText(raw);
  if (found.name && found.farm && isCountryOnlyLine(found.name)) found.name = `${found.name} ${found.farm}`;
  found.roaster = extractRoasterFromText(raw);
  found.bagSizeG = extractBagSizeFromText(raw);
  found.roastDate = extractRoastDateFromText(raw, nowMs);
  return found;
}
