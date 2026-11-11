import type { JSX } from 'preact';

/**
 * Het gietschema als tijdlijn: tijd, stip op een lijn, "+gram → totaal" en eventueel hoe (swirl, roeren).
 * Eén component voor Zetten (het recept), de timer (met de huidige giet gemarkeerd) en het Logboek (met wanneer het doorliep),
 * zodat het schema overal hetzelfde eruitziet. De staat staat ook als verborgen tekst erbij: kleur is nooit het enige signaal.
 */
export type PourState = 'past' | 'now' | 'hold' | 'next' | '';
export interface PourRow { readonly index: number; readonly at: string; readonly add: string; readonly to: string; readonly how?: string | null; readonly wait?: boolean; readonly state?: PourState; readonly note?: string | null }

const STATE_TEXT: Record<PourState, string> = { past: 'Klaar: ', now: 'Nu: ', hold: 'Wacht: ', next: 'Straks: ', '': '' };

export function PourTimeline({ rows, label, className }: { rows: readonly PourRow[]; label: string; className?: string }): JSX.Element {
  return (
    <ol class={className ? `pourline ${className}` : 'pourline'} aria-label={label}>
      {rows.map(r => (
        <li key={r.index} class={r.state || undefined}>
          <span class="pt">{r.at}{r.wait ? '*' : ''}</span>
          <span class="pd" aria-hidden="true" />
          <span class="pw">{r.state ? <span class="sr-only">{STATE_TEXT[r.state]}</span> : null}<b>{r.add}</b> → {r.to}{r.how ? <small class="how">{r.how}</small> : null}{r.note ? <small class="dr">{r.note}</small> : null}</span>
        </li>))}
    </ol>
  );
}
