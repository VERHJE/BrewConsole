import type { JSX } from 'preact';
import { factsOf } from '../../../../engine3/src/index.ts';
import type { Route } from '../../core/router.ts';
import { href } from '../../core/router.ts';
import { METHOD_LABEL, clock, nl1, pourLines, techniqueName } from '../../core/brew.ts';
import { cupRows, brewDeleteEvent } from '../../core/insights.ts';
import { EmptyState } from '../EmptyState.tsx';
import { IconLog } from '../icons.tsx';
import { Stars } from '../Stars.tsx';
import { ACIDITY_LABEL, formatLiking, FINISH_LABEL, GOALHIT_LABEL, STRENGTH_LABEL, VSLAST_LABEL } from '../../core/tasting.ts';
import { compareById, groupByMonth, matches } from '../../core/ronde2.ts';
import { useState } from 'preact/hooks';
import { Trends } from '../Insights.tsx';
import { useApp, useSnapshot } from '../store-context.tsx';

const STATUS: Record<string, string> = { planned: 'Niet gestart', brewing: 'Bezig', complete: 'Klaar', abandoned: 'Afgebroken' };
const BREWER_SHORT = { v60: 'V60', chemex: 'Chemex' } as const;
const dateText = (ms: number): string => new Date(ms).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Een rij heeft vaste plekken: links de datum als blokje, in het midden de titel met de waardering, een regel met brewer, techniek en
 * cijfers, en (als je die hebt) een regel over hoe de kop was. Met één zak is de zaknaam ruis: dan is de techniek de titel.
 */
function Row({ r, active, multi }: { r: ReturnType<typeof cupRows>[number]; active: boolean; multi: boolean }): JSX.Element {
  const d = new Date(r.at);
  const day = d.toLocaleString('nl-NL', { day: 'numeric' });
  const mon = d.toLocaleString('nl-NL', { month: 'short' }).replace('.', '');
  const time = d.toLocaleString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const facts = [time, `${nl1(r.doseG)} g`, r.click !== null ? `klik ${r.click}` : null, r.endSec !== null ? clock(r.endSec) : null, r.status !== 'complete' ? STATUS[r.status] : null, r.status === 'complete' && !r.tasted ? 'nog te proeven' : null].filter(Boolean).join(' · ');
  return (
    <li><a class="item go logrow" href={href('logboek', r.id)} aria-current={active ? 'true' : undefined}>
      <span class="logdate" aria-hidden="true"><b>{day}</b><small>{mon}</small></span>
      <span class="logbody">
        <strong>{multi ? (r.beanName ?? 'Zonder zak') : techniqueName(r.technique)} <Stars value={r.liking} /></strong>
        <small class="logmeta"><span class="brewer">{BREWER_SHORT[r.method]}</span>{multi && <> {techniqueName(r.technique)}</>}</small>
        <small class="lognums"><span class="sr-only">{dateText(r.at)}. </span>{facts}</small>
        {r.taste && <small class="taste">{r.taste}</small>}
      </span>
    </a></li>
  );
}

function List({ activeId = null }: { activeId?: string | null }): JSX.Element {
  const { state } = useSnapshot();
  const [q, setQ] = useState('');
  const all = cupRows(state);
  const multi = new Set(all.map(r => r.beanName)).size > 1;
  const rows = q.trim() ? all.filter(r => matches(`${r.beanName ?? ''} ${techniqueName(r.technique)} ${dateText(r.at)}`, q)) : all;
  return (
    <section>
      {activeId ? <h2 class="list-title">Logboek</h2> : <h1>Logboek</h1>}
      {all.length > 1 && <details class="card"><summary>Verloop van alle koppen</summary><Trends beanId={null} /></details>}
      {all.length > 5 && <label class="field search"><span class="sr-only">Zoek in koppen</span><input type="search" name="zoek" placeholder="Zoek op zak, techniek of datum" value={q} onInput={e => setQ((e.currentTarget as HTMLInputElement).value)} /></label>}
      {all.length === 0 ? <EmptyState icon={<IconLog />} title="Nog geen koppen" action={{ label: 'Zet je eerste kop', href: href('zetten') }}>Elk zetsel dat je afrondt komt hier te staan, met wat je ervan vond.</EmptyState>
        : rows.length === 0 ? <EmptyState compact title={`Geen koppen gevonden voor ‘${q}’`} />
        : groupByMonth(rows).map(g => (
          <div key={g.label} class="month"><h2 class="month-h">{g.label} <small>{g.rows.length} {g.rows.length === 1 ? 'kop' : 'koppen'}</small></h2>
            <ul class="list">{g.rows.map(r => <Row key={r.id} r={r} active={r.id === activeId} multi={multi} />)}</ul></div>))}
    </section>
  );
}

function Compare({ a, b }: { a: string; b: string }): JSX.Element {
  const { state } = useSnapshot();
  const c = compareById(state, a, b);
  if (!c) return <section><h1>Vergelijken kan niet</h1><a class="btn" href={href('logboek')}>Terug</a></section>;
  const changed = c.rows.filter(r => r.changed).length;
  return (
    <section>
      <div class="head"><a class="btn" href={href('logboek', a)}>Terug</a><h1>Vergelijken</h1></div>
      <p class="muted" role="status">{changed === 0 ? 'Geen verschillen in wat hier staat.' : `${changed} ${changed === 1 ? 'verschil' : 'verschillen'}: gemarkeerd.`}</p>
      <table class="plain compare"><thead><tr><th></th><th scope="col">{dateText(c.a.at)}</th><th scope="col">{dateText(c.b.at)}</th></tr></thead>
        <tbody>{c.rows.map(r => <tr key={r.label} class={r.changed ? 'diff' : ''}><th scope="row">{r.label}{r.changed && <span class="sr-only"> (anders)</span>}</th><td>{r.a}</td><td>{r.b}</td></tr>)}</tbody></table>
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
  const others = cupRows(state, c.beanId).filter(o => o.id !== id && o.status === 'complete').slice(0, 20);
  const del = async (): Promise<void> => { if (confirm('Deze kop verwijderen? Dit haalt hem uit je advies.')) { await store.append([brewDeleteEvent(env, id)]); location.hash = href('logboek'); } };
  return (
    <section>
      <div class="head"><a class="btn back-narrow" href={href('logboek')}>Terug</a><h1>{bean?.fields.name ?? 'Kop'}</h1></div>
      <p class="meta">{dateText(c.at)} · {STATUS[c.status]}</p>
      {(c.status === 'planned' || c.status === 'brewing') && <p><a class="btn primary" href={href('timer', id)}>{c.status === 'brewing' ? 'Terug naar de timer' : 'Naar de timer'}</a></p>}
      <div class="numbers">
        <div class="num"><b>{nl1(c.doseG)} g</b><small>koffie</small></div>
        <div class="num"><b>{Math.round(c.waterG)} g</b><small>water{c.bypassG > 0 ? ` + ${Math.round(c.bypassG)} g bypass` : ''}</small></div>
        {c.grindClick !== null && <div class="num"><b>klik {c.grindClick}</b><small>molen</small></div>}
        {c.endSec !== null && <div class="num"><b>{clock(c.endSec)}</b><small>klaar na</small></div>}
      </div>
      <p class="logmeta"><span class="brewer">{BREWER_SHORT[c.method]}</span> {techniqueName(c.technique)}</p>
      <dl class="kv small">
        {c.planned.tempC !== null && <><dt>Temperatuur</dt><dd>{c.planned.tempC} °C</dd></>}
        {c.lastDrainSec !== null && <><dt>Laatste giet doorgelopen na</dt><dd>{clock(c.lastDrainSec)}</dd></>}
        {c.tdsPct !== null && <><dt>TDS</dt><dd>{c.tdsPct.toFixed(2).replace('.', ',')} %</dd></>}
      </dl>
      <div class="card"><strong>Schema</strong>
        <table class="plain"><tbody>{lines.map(l => <tr key={l.index}><td>{l.at}</td><td>{l.add}</td><td>→ {l.to}</td><td>{c.drainedAtSec.has(l.index) ? `erdoor ${clock(c.drainedAtSec.get(l.index)!)}` : ''}</td></tr>)}</tbody></table></div>
      <div class="card"><strong>Geproefd</strong>
        {!t ? <EmptyState compact title="Nog niet geproefd">{c.status === 'complete' ? 'Leg vast hoe hij was; dat telt mee voor je volgende advies.' : undefined}</EmptyState> : (
          <dl class="kv">
            {t.strength !== null && <><dt>Sterkte</dt><dd>{STRENGTH_LABEL[t.strength]}</dd></>}
            {t.acidity && <><dt>Zuur</dt><dd>{ACIDITY_LABEL[t.acidity]}</dd></>}
            {t.finish.length > 0 && <><dt>Afdronk</dt><dd>{t.finish.map(f => FINISH_LABEL[f]).join(', ')}</dd></>}
            {t.liking && <><dt>Waardering</dt><dd><Stars value={t.liking} /> <span class="muted">{formatLiking(t.liking)} van 5</span></dd></>}
            {t.goalHit && <><dt>Doel gehaald</dt><dd>{GOALHIT_LABEL[t.goalHit]}</dd></>}
            {t.vsLast && <><dt>Tegenover vorige</dt><dd>{VSLAST_LABEL[t.vsLast]}</dd></>}
            {t.note && <><dt>Notitie</dt><dd>{t.note}</dd></>}
          </dl>)}
        {c.status === 'complete' && <a class="btn" href={href('proeven', id)}>{t ? 'Proeven aanpassen' : 'Proeven'}</a>}
      </div>
      {others.length > 0 && (
        <label class="field"><span>Vergelijk met een andere kop</span>
          <select name="compare" value="" onChange={e => { const v = (e.currentTarget as HTMLSelectElement).value; if (v) location.hash = href('logboek', 'vergelijk', id, v); }}>
            <option value="">Kies een kop…</option>
            {others.map(o => <option key={o.id} value={o.id}>{dateText(o.at)}{o.liking ? ` · ${formatLiking(o.liking)} van 5` : ''}</option>)}
          </select></label>)}
      <details class="tech-note"><summary>Over dit advies</summary><p class="engine-note">Gemaakt door <span>{c.engine.name} {c.engine.version}</span></p></details>
      <div class="actions"><button class="btn" type="button" onClick={del}>Kop verwijderen</button></div>
    </section>
  );
}

export function Logboek({ route }: { route: { parts: readonly string[] } & Route }): JSX.Element {
  const id = route.parts[1];
  if (id === 'vergelijk' && route.parts[2] && route.parts[3]) return <Compare a={route.parts[2]} b={route.parts[3]} />;
  return id ? <div class="split has-detail"><div class="split-list"><List activeId={id} /></div><Detail key={id} id={id} /></div> : <List />;
}
