import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import type { Series } from '../core/trends.ts';

const W = 320, H = 150, L = 34, R = 34, T = 12, B = 22;

interface Props {
  readonly series: Series;
  /** Eén zin in gewone taal onder de titel (core/trends.ts → explainSeries), of null. */
  readonly explain?: string | null;
  /** Vaste onder- en bovengrens (waardering 1–5, sterkte −2…+2); anders volgt de as de data. */
  readonly domain?: readonly [number, number];
  readonly ticks?: readonly number[];
  readonly format: (y: number) => string;
  readonly formatTick?: (y: number) => string;
  /** Lijn op deze waarde (bijv. 0 = precies goed). */
  /** Stapgroottes voor de ticks (bijv. seconden: 10, 15, 30, 60). */
  readonly steps?: readonly number[];
  /** Korte tekst bij het laatste punt; anders `format`. */
  readonly formatEnd?: (y: number) => string;
  readonly reference?: { readonly at: number; readonly label: string };
  readonly dateText: (at: number) => string;
}

const DEFAULT_STEPS = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 500];

/** Ronde ticks (2 tot 4) binnen het bereik, bijvoorbeeld 20 en 22 g in plaats van 19 en 20,6. */
function niceTicks(lo: number, hi: number, steps: readonly number[]): number[] {
  for (const step of steps) {
    const first = Math.ceil(lo / step) * step;
    const out: number[] = [];
    for (let v = first; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
    if (out.length >= 2 && out.length <= 4) return out;
  }
  return [lo, hi];
}

function niceDomain(vals: readonly number[]): [number, number] {
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = Math.max(hi - lo, 1);
  const pad = span * 0.25;
  return [lo - pad, hi + pad];
}

export function TrendChart({ explain, series, domain, ticks, steps, format, formatEnd, formatTick, reference, dateText }: Props): JSX.Element {
  const pts = series.points;
  const [active, setActive] = useState<number | null>(null);
  if (pts.length === 0) {
    return (<div class="chart"><h3>{series.title}</h3><p class="sub">Nog geen gegevens.</p></div>);
  }
  const [lo, hi] = domain ?? niceDomain(pts.map(p => p.y));
  const xs = pts.map(p => p.n);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const x = (n: number): number => (xmax === xmin ? L + (W - L - R) / 2 : L + ((n - xmin) / (xmax - xmin)) * (W - L - R));
  const y = (v: number): number => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const tickValues = ticks ?? niceTicks(lo, hi, steps ?? DEFAULT_STEPS);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.n).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1]!;
  const cur = active === null ? null : pts[active]!;
  const summary = `${series.title}: ${pts.length} ${pts.length === 1 ? 'kop' : 'koppen'}, laatste ${format(last.y)}.`;
  return (
    <div class="chart" onPointerLeave={() => setActive(null)}>
      <h3>{series.title}</h3>
      <p class="sub">{series.unit ? `in ${series.unit}` : ' '}</p>
      {explain && <p class="chart-note">{explain}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={summary}>
        {tickValues.map(t => (
          <g key={t}>
            <line class="grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
            <text class="ax" x={L - 6} y={y(t) + 3} text-anchor="end">{(formatTick ?? format)(t)}</text>
          </g>
        ))}
        {reference && (<g><line class="zero" x1={L} x2={W - R} y1={y(reference.at)} y2={y(reference.at)} /><text class="ax" x={W - R + 4} y={y(reference.at) + 3}>{reference.label}</text></g>)}
        {cur && <line class="cross" x1={x(cur.n)} x2={x(cur.n)} y1={T} y2={H - B} />}
        {pts.length > 1 && <path class="line" d={path} />}
        {pts.map((p, i) => <circle key={p.brewId} class={active === i ? 'dot on' : 'dot'} cx={x(p.n)} cy={y(p.y)} r={4} />)}
        <text class="endlabel" x={Math.min(x(last.n) + 6, W - R + 4)} y={y(last.y) - 8} text-anchor={x(last.n) > W - R - 20 ? 'end' : 'start'}>{(formatEnd ?? format)(last.y)}</text>
        <text class="ax" x={x(xmin)} y={H - 6} text-anchor="start">kop {xmin}</text>
        {xmax !== xmin && <text class="ax" x={x(xmax)} y={H - 6} text-anchor="end">kop {xmax}</text>}
        {pts.map((p, i) => (
          <circle key={`h${p.brewId}`} class="hit" cx={x(p.n)} cy={y(p.y)} r={14} tabIndex={0} role="img"
            aria-label={`Kop ${p.n}, ${dateText(p.at)}: ${format(p.y)}${p.note ? `, ${p.note}` : ''}`}
            onPointerEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} />
        ))}
      </svg>
      {cur && (
        <div class="tip" style={`left:${Math.max(18, Math.min(82, (x(cur.n) / W) * 100))}%`}>
          <b>{format(cur.y)}</b><span>Kop {cur.n} · {dateText(cur.at)}</span>{cur.note && <span>{cur.note}</span>}
        </div>)}
      <details>
        <summary>Tabel</summary>
        <table class="plain"><thead><tr><th>Kop</th><th>Datum</th><th class="n">{series.title}</th><th>Toelichting</th></tr></thead>
          <tbody>{pts.map(p => <tr key={p.brewId}><td>{p.n}</td><td>{dateText(p.at)}</td><td class="n">{format(p.y)}</td><td>{p.note}</td></tr>)}</tbody></table>
      </details>
    </div>
  );
}
