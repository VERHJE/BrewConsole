import type { JSX } from 'preact';
import { href } from '../../core/router.ts';
export function Proeven({ brewId }: { brewId: string }): JSX.Element {
  return <section><h1>Proeven</h1><p class="muted">Zetsel {brewId}. Komt in stap F4.</p><a class="btn" href={href('zetten')}>Terug</a></section>;
}
