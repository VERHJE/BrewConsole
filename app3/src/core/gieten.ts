// Gietaanwijzingen per giet, uit de brondata van de techniek (engine3/src/data/techniques.ts, gecontroleerd tegen de bronnen op
// 9 nov 2026). Het recept zelf (tijd, gewicht, patroon, swirl/roeren) komt uit de engine; hier komt bij HOE je het doet en wat er
// na de giet gebeurt, zodat de timer het op het juiste moment kan laten zien. Zuiver: recept in, tekst uit.

import { TECHNIQUE_BY_ID, type Agitation, type PourStyle, type Recipe } from '../../../engine3/src/index.ts';

const STYLE_TEXT: Readonly<Record<PourStyle, string>> = { spiral: 'in spiraal', center: 'in het midden', circles: 'in rondjes' };
/** Korte vorm voor in een tabel of schema. */
export const AGITATION_SHORT: Readonly<Record<Agitation, string>> = { none: '', swirl: 'swirl', gentle_swirl: 'zacht swirlen', stir: 'roeren', rao_spin: 'Rao-spin' };
/** Als opdracht, voor op de timer. */
export const AGITATION_TODO: Readonly<Record<Agitation, string>> = {
  none: '', swirl: 'swirl de V60', gentle_swirl: 'geef een zachte swirl', stir: 'roer', rao_spin: 'doe de Rao-spin'
};

export interface PourGuide {
  /** 'in spiraal' enzovoort, of null als de bron geen patroon noemt. */
  readonly style: string | null;
  /** Hoe je deze giet doet (tempo, hoogte, waar), of null. */
  readonly tip: string | null;
  /** Wat er na de giet gebeurt: de opdracht ('swirl de V60') en de uitleg erbij; beide kunnen null zijn. */
  readonly after: { readonly todo: string | null; readonly detail: string | null } | null;
}

/** De brondata van het recept, alleen als het gietschema er één op één bij past (oude of eigen recepten hebben dat niet). */
function referenceOf(recipe: Recipe) {
  const ref = TECHNIQUE_BY_ID.get(recipe.technique as never)?.reference;
  return ref?.pours && ref.pours.length === recipe.pours.length ? ref : null;
}

export function pourGuide(recipe: Recipe, index: number): PourGuide {
  const p = recipe.pours[index]!;
  const rp = referenceOf(recipe)?.pours?.[index];
  const style = rp?.styleGiven === false ? null : STYLE_TEXT[p.style];
  const todo = p.agitationAfter !== 'none' ? AGITATION_TODO[p.agitationAfter] : null;
  const detail = rp?.after ?? null;
  return { style, tip: rp?.tip ?? null, after: todo || detail ? { todo, detail } : null };
}

/** Wat de bron zegt vóór de start (filter spoelen, kuiltje maken, ...). */
export function prepLines(recipe: Recipe): readonly string[] { return referenceOf(recipe)?.prep ?? TECHNIQUE_BY_ID.get(recipe.technique as never)?.reference.prep ?? []; }

/** Wat de bron zegt na de laatste giet (uitlopen, roeren voor het serveren, ...). */
export function finishLines(recipe: Recipe): readonly string[] { return TECHNIQUE_BY_ID.get(recipe.technique as never)?.reference.finish ?? []; }

/** Per giet de aanwijzing (tempo en wat daarna), voor een uitklapbaar blok op het receptscherm. Giet zonder aanwijzing ontbreekt. */
export function pourNotes(recipe: Recipe): Array<{ index: number; tip: string | null; after: string | null }> {
  const out: Array<{ index: number; tip: string | null; after: string | null }> = [];
  for (let i = 0; i < recipe.pours.length; i++) {
    const g = pourGuide(recipe, i);
    const after = g.after ? [g.after.todo ? g.after.todo.charAt(0).toUpperCase() + g.after.todo.slice(1) + '.' : null, g.after.detail].filter(Boolean).join(' ') : null;
    if (g.tip || after) out.push({ index: i, tip: g.tip, after: after || null });
  }
  return out;
}
