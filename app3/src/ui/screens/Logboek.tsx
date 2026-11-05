import type { JSX } from 'preact';
import type { Route } from '../../core/router.ts';

export function Logboek(_props: { route: Route }): JSX.Element {
  return (<section><h1>Logboek</h1><p class="muted">Komt in een volgende stap.</p></section>);
}
