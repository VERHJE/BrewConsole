import type { JSX } from 'preact';
import { factsOf } from '../../../../engine3/src/index.ts';
import type { Route } from '../../core/router.ts';
import { href } from '../../core/router.ts';
import { clock, nl1, pourLines, techniqueName } from '../../core/brew.ts';
import { cupRows, brewDeleteEvent } from '../../core/insights.ts';
import { ACIDITY_LABEL, FINISH_LABEL, GOALHIT_LABEL, STRENGTH_LABEL, VSLAST_LABEL } from '../../core/tasting.ts';
import { useApp, useSnapshot } from '../store-context.tsx';

const STATUS: Record<string, string> = { planned: 'Niet gestart', brewing: 'Bezig', complete: 'Klaar', abandoned: 'Afgebroken' };
const dateText = (ms: number): string => new Date(ms).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const stars = (n: number | null): string => (n === null ? '' : '★'.repeat(n) + '☆'.repeat(5 - n));

function List(): JSX.Element {
  const { state } = useSnapshot();
  const rows = cupRows(state);
  return (
    <section>
      <h1>Logboek</h1>
      {rows.length === 0 ? <div class="empty"><p>Nog geen koppen.</p><a class="btn primary" href={href('zetten')}>Zet je eerste kop</a></div>
        : <ul class="list">{rows.map(r => (
          <li key={r.id}><a class="item" href={href('logboek', r.id)}>
            <strong>{r.beanName ?? 'Zonder zak'} <span class="stars" aria-label={r.liking ? `${r.liking} van 5` : undefined}>{stars(r.liking)}</span></strong>
            <small>{dateText(r.at)} · {techniqueName(r.technique)} · {nl1(r.doseG)} g{r.click !== null ? ` · klik ${r.click}` : ''}{r.endSec !== null ? ` · ${clock(r.endSec)}` : ''}{r.status !== 'complete' ? ` · ${STATUS[r.status]}` : ''}{r.status === 'complete' && !r.tasted ? ' · nog te proeven' : ''}</small>
          </a></li>))}</ul>}
    </section>
  );
}

function Detail({ id }: { id: string }): JSX.Element {
  const { store, env } = useApp();
  const { state } = useSnapshot();
  const facts = factsOf(state);
  const c = facts.cups.get(id);
  if (!c) return <section><h1>Kop niet gevonden</h1><a class="btn" href={href('logboek')}>Terug</a></section>;
  const bean = c.beanId ? facts.beans.get(c.beanId) : undefined;
  const t = c.tasting;
  const lines = pourLines(c.planned);
  const del = async (): Promise<void> => { if (confirm('Deze kop verwijderen? Dit haalt hem uit je advies.')) { await store.append([brewDeleteEvent(env, id)]); location.hash = href('logboek'); } };
  return (
    <section>
      <div class="head"><a class="btn" href={href('logboek')}>Terug</a><h1>{bean?.fields.name ?? 'Kop'}</h1></div>
      <p class="meta">{dateText(c.at)} · {STATUS[c.status]}</p>
      <dl class="kv">
        <dt>Techniek</dt><dd>{techniqueName(c.technique)}</dd>
        <dt>Koffie</dt><dd>{nl1(c.doseG)} g</dd><dt>Water</dt><dd>{Math.round(c.waterG)} g{c.bypassG > 0 ? ` + ${Math.round(c.bypassG)} g bypass` : ''}</dd>
        {c.grindClick !== null && <><dt>Klik</dt><dd>{c.grindClick}</dd></>}
        {c.planned.tempC !== null && <><dt>Temperatuur</dt><dd>{c.planned.tempC} °C</dd></>}
        {c.endSec !== null && <><dt>Klaar na</dt><dd>{clock(c.endSec)}</dd></>}
        {c.lastDrainSec !== null && <><dt>Laatste giet doorgelopen na</dt><dd>{clock(c.lastDrainSec)}</dd></>}
        {c.tdsPct !== null && <><dt>TDS</dt><dd>{c.tdsPct.toFixed(2).replace('.', ',')} %</dd></>}
        <dt>Advies van</dt><dd>{c.engine.name} {c.engine.version}</dd>
      </dl>
      <div class="card"><strong>Schema</strong>
        <table class="plain"><tbody>{lines.map(l => <tr key={l.index}><td>{l.at}</td><td>{l.add}</td><td>→ {l.to}</td><td>{c.drainedAtSec.has(l.index) ? `erdoor ${clock(c.drainedAtSec.get(l.index)!)}` : ''}</td></tr>)}</tbody></table></div>
      <div class="card"><strong>Geproefd</strong>
        {!t ? <p class="muted">Nog niet geproefd.</p> : (
          <dl class="kv">
            {t.strength !== null && <><dt>Sterkte</dt><dd>{STRENGTH_LABEL[t.strength]}</dd></>}
            {t.acidity && <><dt>Zuur</dt><dd>{ACIDITY_LABEL[t.acidity]}</dd></>}
            {t.finish.length > 0 && <><dt>Afdronk</dt><dd>{t.finish.map(f => FINISH_LABEL[f]).join(', ')}</dd></>}
            {t.liking && <><dt>Waardering</dt><dd class="stars">{stars(t.liking)}</dd></>}
            {t.goalHit && <><dt>Doel gehaald</dt><dd>{GOALHIT_LABEL[t.goalHit]}</dd></>}
            {t.vsLast && <><dt>Tegenover vorige</dt><dd>{VSLAST_LABEL[t.vsLast]}</dd></>}
            {t.note && <><dt>Notitie</dt><dd>{t.note}</dd></>}
          </dl>)}
        {c.status === 'complete' && <a class="btn" href={href('proeven', id)}>{t ? 'Proeven aanpassen' : 'Proeven'}</a>}
      </div>
      <div class="actions"><button class="btn" type="button" onClick={del}>Kop verwijderen</button></div>
    </section>
  );
}

export function Logboek({ route }: { route: { parts: readonly string[] } & Route }): JSX.Element {
  const id = route.parts[1];
  return id ? <Detail id={id} /> : <List />;
}
