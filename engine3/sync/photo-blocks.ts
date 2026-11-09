// Engine 3 · synchronisatie · foto-blokken.
//
// Een foto per zak reist als eigen versleuteld blok, los van het logboek (eigen routes /photos). Het blok-id verraadt
// niets over de inhoud: `ph-<32 hex van SHA-256 van het zak-id>-<tijdstip van de wijziging, 13 cijfers>`. Daardoor kan
// een toestel uit de lijst met id's alleen al zien welke versie van een zak de nieuwste is, zonder iets te ontsleutelen.
// Verwijderen is een nieuw blok met `deleted: true` (een grafsteen) en een later tijdstip; de nieuwste wijziging wint.

import { open, seal, type CryptoDeps } from './crypto.ts';
import type { webcrypto } from 'node:crypto';

export const PHOTO_ID_PATTERN = /^ph-[0-9a-f]{32}-\d{13}$/;

export interface PhotoPlain {
  readonly v: 1;
  readonly beanId: string;
  /** Tijdstip van de wijziging (ms), hetzelfde getal als in het blok-id. */
  readonly at: number;
  readonly deleted: boolean;
  /** Alleen bij een foto: media-type en inhoud (base64). */
  readonly type?: string;
  readonly data?: string;
}

/** 32 hex-tekens uit de SHA-256 van het zak-id: een vast, niet-herleidbaar kenmerk per zak. */
export async function beanKey(deps: Pick<CryptoDeps, 'subtle'>, beanId: string): Promise<string> {
  const d = new Uint8Array(await deps.subtle.digest('SHA-256', new TextEncoder().encode(`brewconsole-photo|${beanId}`)));
  return [...d.subarray(0, 16)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function photoId(key: string, at: number): string {
  if (!/^[0-9a-f]{32}$/.test(key)) throw new Error('ongeldige zaksleutel');
  if (!Number.isInteger(at) || at < 0 || at > 9_999_999_999_999) throw new Error('ongeldig tijdstip');
  return `ph-${key}-${String(at).padStart(13, '0')}`;
}

export function parsePhotoId(id: string): { key: string; at: number } | null {
  if (!PHOTO_ID_PATTERN.test(id)) return null;
  return { key: id.slice(3, 35), at: Number(id.slice(36)) };
}

/** Per zak de nieuwste versie en de oudere versies (die weg mogen). Onbekende id's worden genegeerd. */
export function latestPerBean(ids: readonly string[]): Map<string, { id: string; at: number; older: string[] }> {
  const out = new Map<string, { id: string; at: number; older: string[] }>();
  for (const id of ids) {
    const p = parsePhotoId(id);
    if (!p) continue;
    const cur = out.get(p.key);
    if (!cur) { out.set(p.key, { id, at: p.at, older: [] }); continue; }
    if (p.at > cur.at) { cur.older.push(cur.id); cur.id = id; cur.at = p.at; }
    else cur.older.push(id);
  }
  return out;
}

export async function sealPhoto(deps: CryptoDeps, key: webcrypto.CryptoKey, id: string, plain: PhotoPlain): Promise<string> {
  return seal(deps, key, id, JSON.stringify(plain));
}

/** Pakt een foto-blok uit en controleert de vorm; het tijdstip in het blok moet bij het id passen. */
export async function openPhoto(deps: CryptoDeps, key: webcrypto.CryptoKey, id: string, body: string): Promise<PhotoPlain> {
  const text = await open(deps, key, id, body);
  let p: PhotoPlain;
  try { p = JSON.parse(text) as PhotoPlain; } catch { throw new Error('foto-blok bevat geen geldige JSON'); }
  const parsed = parsePhotoId(id);
  if (!parsed || p.v !== 1 || typeof p.beanId !== 'string' || p.beanId.length === 0 || typeof p.deleted !== 'boolean' || p.at !== parsed.at) throw new Error('foto-blok heeft een onbekende vorm');
  if (!p.deleted && (typeof p.type !== 'string' || typeof p.data !== 'string' || p.data.length === 0)) throw new Error('foto-blok zonder inhoud');
  return p;
}
