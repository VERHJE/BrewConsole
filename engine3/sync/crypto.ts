// Engine 3 · synchronisatie · versleuteling.
//
// Sleutel: PBKDF2-SHA-256 uit een wachtwoordzin. Blok: AES-GCM-256 met een nieuwe IV per blok.
// Het blok-id en de schemaversie gaan mee als 'additional data': een blok dat onder een ander id
// wordt aangeboden, ontsleutelt niet.
// WebCrypto en toeval worden meegegeven (CryptoDeps), zodat dit in de browser, in een Worker
// en in Node draait en testbaar is.

import type { webcrypto } from 'node:crypto';

export interface CryptoDeps {
  readonly subtle: webcrypto.SubtleCrypto;
  /** Veilige willekeurige bytes (crypto.getRandomValues). */
  readonly randomBytes: (n: number) => Uint8Array;
}

export const KDF_ITERATIONS = 600_000;
export const SEAL_VERSION = 1;
export const SALT_BYTES = 16;
const IV_BYTES = 12;

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Nieuw zout bij het opzetten van een logboek. Het zout is niet geheim. */
export function newSalt(deps: CryptoDeps): string {
  return toBase64(deps.randomBytes(SALT_BYTES));
}

/** Sleutel uit wachtwoordzin en zout. `iterations` alleen verlagen in tests. */
export async function deriveKey(deps: CryptoDeps, passphrase: string, saltB64: string, iterations: number = KDF_ITERATIONS): Promise<webcrypto.CryptoKey> {
  if (passphrase.length === 0) throw new Error('wachtwoordzin is leeg');
  const salt = fromBase64(saltB64);
  if (salt.length < 8) throw new Error('zout te kort');
  const material = await deps.subtle.importKey('raw', enc.encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return deps.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function aad(id: string): Uint8Array {
  return enc.encode(`brewconsole-sync|v${SEAL_VERSION}|${id}`);
}

/** Versleutelt tekst tot een JSON-envelop (tekst), gebonden aan `id`. */
export async function seal(deps: CryptoDeps, key: webcrypto.CryptoKey, id: string, plaintext: string): Promise<string> {
  const iv = deps.randomBytes(IV_BYTES);
  const ct = new Uint8Array(await deps.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(id) }, key, enc.encode(plaintext)));
  return JSON.stringify({ v: SEAL_VERSION, iv: toBase64(iv), ct: toBase64(ct) });
}

/** Ontsleutelt een envelop. Gooit bij een verkeerde zin, gewijzigd blok of ander id. */
export async function open(deps: CryptoDeps, key: webcrypto.CryptoKey, id: string, envelope: string): Promise<string> {
  let parsed: unknown;
  try { parsed = JSON.parse(envelope); } catch { throw new Error('blok is geen geldige envelop'); }
  const o = parsed as { v?: unknown; iv?: unknown; ct?: unknown };
  if (o.v !== SEAL_VERSION || typeof o.iv !== 'string' || typeof o.ct !== 'string') throw new Error('onbekende envelopversie');
  const iv = fromBase64(o.iv);
  if (iv.length !== IV_BYTES) throw new Error('ongeldige IV');
  try {
    const pt = await deps.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad(id) }, key, fromBase64(o.ct));
    return dec.decode(pt);
  } catch {
    throw new Error('ontsleutelen mislukt: verkeerde wachtwoordzin, of het blok is gewijzigd of hoort bij een ander id');
  }
}
