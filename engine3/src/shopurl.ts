// Winkeladres van een zak: alleen http en https (nooit javascript: of data:), hoogstens 500 tekens.

export function isShopUrl(x: unknown): x is string {
  if (typeof x !== 'string' || x.length === 0 || x.length > 500) return false;
  try { const u = new URL(x); return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.length > 0; } catch { return false; }
}

/** Zet 'brander.nl/zak' om naar 'https://brander.nl/zak'; null als het geen bruikbaar adres is. */
export function normaliseShopUrl(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
  try { const u = new URL(withScheme); const out = u.toString(); return isShopUrl(out) ? out : null; } catch { return null; }
}
