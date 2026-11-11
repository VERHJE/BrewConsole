import type { JSX } from 'preact';
import { ENGINE3_CONTRACT_VERSION, ENGINE3_VERSION } from '../../../../engine3/src/index.ts';
import type { Route } from '../../core/router.ts';
import { href } from '../../core/router.ts';
import { CATEGORIES } from '../../core/tasting.ts';
import { STATUS_TEXT, grindView, profileOf } from '../../core/insights.ts';
import { useEffect, useState } from 'preact/hooks';
import { indexedDbSyncStorage } from '../../core/sync.ts';
import { EmptyState } from '../EmptyState.tsx';
import { IconArchive, IconBrew, IconDrop, IconGrind, IconInfo, IconSliders, IconSync, IconTaste } from '../icons.tsx';
import { Topo, useSnapshot } from '../store-context.tsx';
import { cupRows } from '../../core/insights.ts';
import { beanRows, PROCESS_LABEL, ROAST_LABEL, tagLabel } from '../../core/beans.ts';
import { Stars } from '../Stars.tsx';
import { Gegevens } from './Gegevens.tsx';
import { Sync } from './Sync.tsx';
import { Voorkeuren, Water, ZeroCheck } from './Instellingen.tsx';

const pct = (n: number | null): string => (n === null ? '–' : `${Math.round(n * 100)} %`);
/** Korte pillen: de volledige zin (STATUS_TEXT) is te lang voor een label. */
const STATUS_SHORT: Partial<Record<string, string>> = { picks_up: 'Je merkt dit op', misses: 'Je mist dit vaak', overcalls: 'Je vinkt snel aan', mixed: 'Wisselend' };
const catName = (k: string): string => CATEGORIES.find(c => c.key === k)?.name ?? k;
const f1 = (n: number): string => (Math.round(n * 10) / 10).toString().replace('.', ',');
/** Groepsnamen in het Nederlands (proces en branding komen als sleutel uit de engine). */
const groupName = (label: string, key: string): string =>
  label === 'Smaakgroep' ? catName(key) : label === 'Proces' ? ((PROCESS_LABEL as Record<string, string>)[key] ?? key) : label === 'Branding' ? ((ROAST_LABEL as Record<string, string>)[key] ?? key) : key;
const deltaText = (d: number): string => (Math.abs(d) < 0.05 ? '±0' : `${d > 0 ? '+' : '−'}${f1(Math.abs(d))}`);

function Back(): JSX.Element { return <a class="btn" href={href('meer')}>Terug</a>; }

function Profiel(): JSX.Element {
  const { state } = useSnapshot();
  const p = profileOf(state);
  if (p.cups === 0) {
    return (
      <section>
        <div class="head"><Back /><h1>Smaakprofiel</h1></div>
        <EmptyState icon={<IconBrew />} title="Nog geen smaakprofiel" action={{ label: 'Zet een kop', href: href('zetten') }}>Het profiel groeit mee met elke kop die je proeft. Na een paar koppen zie je hier wat je opmerkt en waardeert.</EmptyState>
      </section>
    );
  }
  return (
    <section>
      <div class="head"><Back /><h1>Smaakprofiel</h1></div>
      <p class="muted">Dit laat zien wat je opmerkt en waardeert. Het stuurt je recept niet.</p>
      <div class="numbers meertiles">
        <div class="num"><b>{p.cups}</b><small>geproefd</small></div>
        <div class="num"><b>{p.liking.overall ? f1(p.liking.overall.mean) : '–'}</b><small>gemiddeld van 5</small></div>
        <div class="num"><b>{p.cataCups}</b><small>blinde smaakkeuze</small></div>
        <div class="num"><b>{pct(p.tendencies.lateShare)}</b><small>laat geproefd</small></div>
      </div>
      <h2>Wat merk je op?</h2>
      {(() => {
        const known = p.sensitivity.filter(s => s.status !== 'unknown');
        const unknown = p.sensitivity.filter(s => s.status === 'unknown');
        return (
          <div>
            {known.length > 0 && <ul class="sens grouped">{known.map(s => (
              <li key={s.category}>
                <div class="senshead"><strong>{catName(s.category)}</strong><span class="tag" title={STATUS_TEXT[s.status]}>{STATUS_SHORT[s.status] ?? STATUS_TEXT[s.status]}</span></div>
                <div class="meter" role="img" aria-label={`${s.hits} van ${s.nExpected} herkend`}><i style={`width:${s.nExpected > 0 ? Math.round((s.hits / s.nExpected) * 100) : 0}%`} /></div>
                <div class="stat">{s.hits} van {s.nExpected} herkend{s.nNotExpected > 0 ? ` · ${s.falseAlarms} van ${s.nNotExpected} aangevinkt zonder dat de zak het noemt` : ''}</div></li>))}</ul>}
            {unknown.length > 0 && (
              <details class="tech-note sens-empty"><summary>{unknown.length} {unknown.length === 1 ? 'smaakgroep' : 'smaakgroepen'} nog zonder oordeel</summary>
                <p class="engine-note">Daarvoor zijn nog te weinig zakken geproefd: {unknown.map(s => catName(s.category)).join(', ')}.</p></details>)}
          </div>);
      })()}
      <h2>Notities die je herkent</h2>
      {p.notes.length === 0 ? <EmptyState compact title="Nog geen herkende notities">Je krijgt ze zodra je bij het proeven aangeeft welke notities van de zak je herkent.</EmptyState>
        : <ul class="grouped notelist">{p.notes.slice(0, 12).map(n => <li key={n.note}><strong>{tagLabel(n.note)}</strong><NoteBar yes={n.yes} bit={n.bit} no={n.no} /></li>)}</ul>}
      {p.vocabulary.length > 0 && <p class="meta">Je woordenschat: {[...new Set(p.vocabulary.map(tagLabel))].join(', ')}</p>}
      <h2>Waardering</h2>
      {p.liking.overall === null ? <EmptyState compact title="Nog geen waarderingen">Geef bij het proeven een aantal sterren, dan verschijnt hier wat je lekker vindt.</EmptyState> : (
        <div>
          <p class="avgline"><Stars value={Math.round(p.liking.overall.mean * 4) / 4} /> <span>Gemiddeld {f1(p.liking.overall.mean)} van 5 over {p.liking.overall.n} koppen</span></p>
          {[['Smaakgroep', p.liking.byCategory], ['Proces', p.liking.byProcess], ['Branding', p.liking.byRoast]].map(([label, stats]) => (
            (stats as typeof p.liking.byCategory).some(s => s.reliable) && (
              <div key={label as string}><h3 class="sub-h">{label as string}</h3>
                <ul class="grouped deltas">{(stats as typeof p.liking.byCategory).filter(s => s.reliable).map(s => (
                  <li key={s.key}><span class="dl">{groupName(label as string, s.key)}</span><span class="dn">{s.n}×</span><span class={s.delta >= 0.05 ? 'dv up' : s.delta <= -0.05 ? 'dv down' : 'dv'}>{deltaText(s.delta)}</span></li>))}</ul></div>)
          ))}
          <p class="meta">Verschil met je gemiddelde; kleine aantallen tellen minder mee. Pas bij 3 koppen of meer wordt een groep getoond.</p>
        </div>)}
    </section>
  );
}

/** Eén gestapeld balkje per notitie: ja, een beetje, nee. De tekst eronder blijft voor wie liever leest. */
function NoteBar({ yes, bit, no }: { yes: number; bit: number; no: number }): JSX.Element {
  const total = Math.max(1, yes + bit + no);
  const w = (n: number): string => `width:${(n / total) * 100}%`;
  return (
    <span class="notebar">
      <span class="stack" aria-hidden="true"><i class="y" style={w(yes)} /><i class="b" style={w(bit)} /><i class="n" style={w(no)} /></span>
      <small>{yes}× ja · {bit}× een beetje · {no}× nee</small>
    </span>
  );
}

function Molen(): JSX.Element {
  const { state } = useSnapshot();
  const g = grindView(state);
  return (
    <section>
      <div class="head"><Back /><h1>Molen</h1></div>
      <p class="muted">Timemore Chestnut C3S Pro. Brew Console leert hoeveel het doorlopen verandert per klik.</p>
      <div class="numbers meertiles">
        <div class="num"><b>{g.pctPerClick > 0 ? '+' : g.pctPerClick < 0 ? '−' : ''}{f1(Math.abs(g.pctPerClick))} %</b><small>doorlooptijd per klik</small></div>
        <div class="num"><b>{g.observations}</b><small>bruikbare metingen</small></div>
      </div>
      <p class="sourceline"><span class={g.learned ? 'tag ok' : 'tag'}>{g.learned ? 'Uit jouw metingen' : 'Startwaarde'}</span> {g.learned ? 'De waarde komt uit je eigen koppen.' : 'Nog niet uit jouw metingen.'}</p>
      <ZeroCheck />
      {!g.learned && <p class="banner">Tik bij elke giet op “Doorgelopen” en zet een paar koppen met 3 klikken verschil; dan leert de molen jouw waarde.</p>}
    </section>
  );
}

function Over(): JSX.Element {
  return (
    <section>
      <div class="head"><Back /><h1>Over</h1></div>
      <div class="numbers meertiles">
        <div class="num"><b>{ENGINE3_VERSION}</b><small>engine</small></div>
        <div class="num"><b>{ENGINE3_CONTRACT_VERSION}</b><small>contract</small></div>
      </div>
      <p class="muted">Je gegevens staan op dit toestel. Er wordt niets verstuurd tenzij je synchronisatie aanzet.</p>
    </section>
  );
}

function useSyncLine(): string {
  const [line, setLine] = useState('Twee toestellen gelijk houden');
  useEffect(() => { void (async () => {
    try {
      const st = await indexedDbSyncStorage();
      const v = st ? await st.load() : null;
      if (v) setLine(v.settings.lastSyncAt ? `Verbonden · laatst ${new Date(v.settings.lastSyncAt).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Verbonden · nog niet gesynchroniseerd');
    } catch { /* onbekend: standaardtekst */ }
  })(); }, []);
  return line;
}

function Entry({ to, icon, title, sub }: { to: string; icon: JSX.Element; title: string; sub: string }): JSX.Element {
  return <li><a class="item go" href={href('meer', to)}><span class="ic">{icon}</span><span class="itext"><strong>{title}</strong><small>{sub}</small></span></a></li>;
}

/** Bovenaan Meer: je koffie in drie getallen, op een etiket zoals bij de zakken. */
function Summary(): JSX.Element | null {
  const { state } = useSnapshot();
  const cups = cupRows(state).filter(r => r.status === 'complete');
  if (cups.length === 0) return null;
  const rated = cups.filter(r => r.liking !== null);
  const mean = rated.length ? rated.reduce((a, r) => a + (r.liking ?? 0), 0) / rated.length : null;
  const beans = beanRows(state).length;
  return (
    <div class="meerhero bagart label" style="--l1:#24403d;--l2:#33605a">
      <Topo seed="Brew Console" />
      <small class="eyebrow">Jouw koffie tot nu toe</small>
      <div class="mh-nums">
        <div><b>{cups.length}</b><small>{cups.length === 1 ? 'kop' : 'koppen'}</small></div>
        <div><b>{mean !== null ? f1(mean) : '–'}</b><small>gemiddeld</small></div>
        <div><b>{beans}</b><small>{beans === 1 ? 'zak' : 'zakken'}</small></div>
      </div>
    </div>
  );
}

export function Meer({ route }: { route: Route }): JSX.Element {
  const syncLine = useSyncLine();
  switch (route.parts[1]) {
    case 'profiel': return <Profiel />;
    case 'molen': return <Molen />;
    case 'over': return <Over />;
    case 'gegevens': return <Gegevens />;
    case 'sync': return <Sync />;
    case 'water': return <Water />;
    case 'voorkeuren': return <Voorkeuren />;
    default:
      return (
        <section class="meerhub">
          <h1>Meer</h1>
          <Summary />
        <div class="meergroups">
<div class="mcol">
          <h2 class="group-h">Jouw koffie</h2>
          <ul class="list grouped">
            <Entry to="profiel" icon={<IconTaste />} title="Smaakprofiel" sub="Wat je opmerkt en waardeert" />
            <Entry to="molen" icon={<IconGrind />} title="Molen" sub="Hoe jouw molen reageert" />
            <Entry to="water" icon={<IconDrop />} title="Water" sub="Hardheid, alkaliniteit en verdunning" />
          </ul>
</div>
<div class="mcol">
          <h2 class="group-h">Gedrag</h2>
          <ul class="list grouped">
            <Entry to="voorkeuren" icon={<IconSliders />} title="Voorkeuren" sub="Hoe proeven, vragen en de timer werken" />
          </ul>
          <h2 class="group-h">Gegevens en app</h2>
          <ul class="list grouped">
            <Entry to="gegevens" icon={<IconArchive />} title="Gegevens" sub="Back-up maken en terugzetten" />
            <Entry to="sync" icon={<IconSync />} title="Synchronisatie" sub={syncLine} />
            <Entry to="over" icon={<IconInfo />} title="Over" sub="Versie en privacy" />
          </ul>
</div>
</div>
        </section>
      );
  }
}
