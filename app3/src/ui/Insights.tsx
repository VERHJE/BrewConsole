import { formatLiking } from '../core/tasting.ts';
import type { JSX } from 'preact';
import { href } from '../core/router.ts';
import { clock, nl1 } from '../core/brew.ts';
import { cupRows } from '../core/insights.ts';
import { explainSeries, fitView, seriesOf, trendPoints, STRENGTH_WORD } from '../core/trends.ts';
import { TrendChart } from './TrendChart.tsx';
import { EmptyState } from './EmptyState.tsx';
import { useSnapshot } from './store-context.tsx';

const dateText = (at: number): string => new Date(at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
const ordinal = (v: number): string => (v > 0 ? `+${v}` : String(v));

/** De vier verloopgrafieken voor een zak (of alle koppen als beanId null is). */
export function Trends({ beanId }: { beanId: string | null }): JSX.Element {
  const { state } = useSnapshot();
  const points = trendPoints(state, beanId);
  const s = Object.fromEntries(seriesOf(points).map(x => [x.key, x]));
  if (points.length === 0) return <EmptyState compact title="Nog geen afgeronde koppen">Na je eerste kop verschijnt hier het verloop.</EmptyState>;
  return (
    <div>
      {points.length < 2 && <p class="muted">Na twee koppen verschijnt hier een lijn.</p>}
      <div class="charts">
        <TrendChart explain={explainSeries(s['dose']!)} series={s['dose']!} format={n => `${nl1(n)} g`} dateText={dateText} />
        <TrendChart explain={explainSeries(s['end']!)} series={s['end']!} steps={[10, 15, 30, 60, 120]} format={clock} dateText={dateText} />
        <TrendChart explain={explainSeries(s['strength']!)} series={s['strength']!} domain={[-2.5, 2.5]} ticks={[-2, 0, 2]} format={v => STRENGTH_WORD[String(v)] ?? ordinal(v)} formatTick={ordinal} formatEnd={ordinal} reference={{ at: 0, label: 'goed' }} dateText={dateText} />
        <TrendChart explain={explainSeries(s['liking']!)} series={s['liking']!} domain={[0.5, 5.5]} ticks={[1, 3, 5]} format={v => `${formatLiking(v)} van 5`} formatTick={v => String(v)} dateText={dateText} />
      </div>
      <p class="meta">Sterkte: onder 0 is te slap, boven 0 te sterk. Alleen afgeronde koppen; een kop zonder oordeel staat niet in die grafiek.</p>
    </div>
  );
}

export function BeanInsights({ beanId }: { beanId: string }): JSX.Element {
  const { state } = useSnapshot();
  const fit = fitView(state, beanId);
  const cups = cupRows(state, beanId);
  // Geen kop-grote uitkomst als er niets te zeggen valt: dan alleen de zin, en de tabel ingeklapt.
  const neutral = fit.expectedDelta === null || Math.abs(fit.expectedDelta) < 0.15;
  return (
    <div>
      <h2>Past bij je smaak</h2>
      <div class="card fit">
        {fit.expectedDelta !== null && !neutral && <p class="delta">{`${fit.expectedDelta >= 0 ? '+' : ''}${nl1(fit.expectedDelta)}`} punt</p>}
        <p>{neutral && fit.expectedDelta === null ? 'Nog te weinig koppen om te voorspellen of deze zak bij je smaak past.' : fit.text}</p>
        {fit.parts.length > 0 && (
          <details open={!neutral}>
            <summary>Waarop dit is gebaseerd</summary>
            <table class="plain"><thead><tr><th>Kenmerk</th><th class="n">Aantal</th><th class="n">Verschil</th></tr></thead>
              <tbody>{fit.parts.map(p => <tr key={p.label}><td>{p.label}</td><td class="n">{p.n}</td><td class="n">{Math.abs(p.delta) < 0.05 ? '±0' : `${p.delta >= 0 ? '+' : ''}${nl1(p.delta)}`}</td></tr>)}</tbody></table>
          </details>)}
        <p class="meta">Dit laat alleen zien wat je eerder waardeerde. Het verandert je recept niet.</p>
      </div>
      <h2>Verloop</h2>
      <Trends beanId={beanId} />
      <h2>Koppen van deze zak</h2>
      {cups.length === 0 ? <EmptyState compact title="Nog geen koppen met deze zak">Zet er een met “Zet deze zak”.</EmptyState>
        : <ul class="list">{cups.slice(0, 10).map(r => (
          <li key={r.id}><a class="item" href={href('logboek', r.id)}><strong>{new Date(r.at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}{r.liking ? ` · ${formatLiking(r.liking)} van 5` : ''}</strong>
            <small>{nl1(r.doseG)} g{r.click !== null ? ` · klik ${r.click}` : ''}{r.endSec !== null ? ` · ${clock(r.endSec)}` : ''}{r.status === 'complete' && !r.tasted ? ' · nog te proeven' : ''}</small></a></li>))}</ul>}
    </div>
  );
}
