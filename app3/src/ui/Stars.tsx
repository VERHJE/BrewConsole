import type { JSX } from 'preact';
import { formatLiking } from '../core/tasting.ts';

/** Vijf sterren met een gedeeltelijk gevulde laatste ster (kwartsterren). Alleen tekst voor schermlezers: 'x van 5'. */
export function Stars({ value }: { value: number | null }): JSX.Element | null {
  if (value === null) return null;
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span class="starrow" role="img" aria-label={`${formatLiking(value)} van 5`}>
      <span class="starrow-bg" aria-hidden="true">★★★★★</span>
      <span class="starrow-fg" aria-hidden="true" style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  );
}
