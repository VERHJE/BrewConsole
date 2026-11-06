import type { JSX } from 'preact';
import { ENGINE3_CONTRACT_VERSION, ENGINE3_VERSION } from '../../../../engine3/src/index.ts';
import type { Route } from '../../core/router.ts';
import { href } from '../../core/router.ts';
import { CATEGORIES } from '../../core/tasting.ts';
import { STATUS_TEXT, grindView, profileOf } from '../../core/insights.ts';
import { useEffect, useState } from 'preact/hooks';
import { indexedDbSyncStorage } from '../../core/sync.ts';
import { useSnapshot } from '../store-context.tsx';
import { Gegevens } from './Gegevens.tsx';
import { Sync } from './Sync.tsx';
import { Voorkeuren, Water, ZeroCheck } from './Instellingen.tsx';

const pct = (n: number | null): string => (n === null ? '–' : `${Math.round(n * 100)} %`);
const catName = (k: string): string => CATEGORIES.find(c => c.key === k)?.name ?? k;
const f1 = (n: number): string => (Math.round(n * 10) / 10).toString().replace('.', ',');

function Back(): JSX.Element { return <a class="btn" href={href('meer')}>Terug</a>; }

function Profiel(): JSX.Element {
  const { state } = useSnapshot();
  const p = profileOf(state);
  return (
    <section>
      <div class="head"><Back /><h1>Smaakprofiel</h1></div>
      <p class="muted">Dit laat zien wat je opmerkt en waardeert. Het stuurt je recept niet.</p>
      <p class="meta">{p.cups} geproefde koppen · {p.cataCups} met de blinde smaakkeuze</p>
      <h2>Wat merk je op?</h2>
      {(() => {
        const known = p.sensitivity.filter(s => s.status !== 'unknown');
        const unknown = p.sensitivity.filter(s => s.status === 'unknown');
        return (
          <div>
            {known.length > 0 && <ul class="sens">{known.map(s => (
              <li key={s.category}><strong>{catName(s.category)}</strong>
                <div>{STATUS_TEXT[s.status]}</div>
                <div class="stat">{s.hits} van {s.nExpected} herkend · {s.falseAlarms} van {s.nNotExpected} aangevinkt zonder dat de zak het noemt</div></li>))}</ul>}
            {unknown.length > 0 && <p class="sens-empty">Nog te weinig zakken om iets te zeggen over: {unknown.map(s => catName(s.category)).join(', ')}.</p>}
          </div>);
      })()}
      <h2>Notities die je herkent</h2>
      {p.notes.length === 0 ? <p class="muted">Nog geen herkende notities.</p>
        : <ul class="list">{p.notes.slice(0, 12).map(n => <li key={n.note}><span class="item"><strong>{n.note}</strong><small>{n.yes}× ja · {n.bit}× een beetje · {n.no}× nee</small></span></li>)}</ul>}
      {p.vocabulary.length > 0 && <p class="meta">Je woordenschat: {p.vocabulary.join(', ')}</p>}
      <h2>Waardering</h2>
      {p.liking.overall === null ? <p class="muted">Nog geen waarderingen.</p> : (
        <div>
          <p>Gemiddeld {f1(p.liking.overall.mean)} van 5 over {p.liking.overall.n} koppen.</p>
          {[['Smaakgroep', p.liking.byCategory], ['Proces', p.liking.byProcess], ['Branding', p.liking.byRoast]].map(([label, stats]) => (
            (stats as typeof p.liking.byCategory).some(s => s.reliable) && (
              <div key={label as string}><strong>{label as string}</strong>
                <table class="plain"><tbody>{(stats as typeof p.liking.byCategory).filter(s => s.reliable).map(s => (
                  <tr key={s.key}><td>{label === 'Smaakgroep' ? catName(s.key) : s.key}</td><td class="n">{s.n}×</td><td class="n">{s.delta >= 0 ? '+' : ''}{f1(s.delta)}</td></tr>))}</tbody></table></div>)
          ))}
          <p class="meta">Verschil met je gemiddelde; kleine aantallen tellen minder mee. Pas bij 3 koppen of meer wordt een groep getoond.</p>
        </div>)}
      <h2>Tendensen</h2>
      <p class="meta">Laat geproefd: {pct(p.tendencies.lateShare)}</p>
    </section>
  );
}

function Molen(): JSX.Element {
  const { state } = useSnapshot();
  const g = grindView(state);
  return (
    <section>
      <div class="head"><Back /><h1>Molen</h1></div>
      <p class="muted">Timemore Chestnut C3S Pro. Brew Console leert hoeveel het doorlopen verandert per klik.</p>
      <dl class="kv">
        <dt>Effect per klik</dt><dd>{g.pctPerClick > 0 ? '+' : ''}{f1(g.pctPerClick)} % doorlooptijd</dd>
        <dt>Bron</dt><dd>{g.learned ? 'uit jouw metingen' : 'startwaarde (nog niet uit jouw metingen)'}</dd>
        <dt>Bruikbare metingen</dt><dd>{g.observations}</dd>
      </dl>
      <ZeroCheck />
      {!g.learned && <p class="banner">Tik bij elke giet op “Erdoor” en zet een paar koppen met 3 klikken verschil; dan leert de molen jouw waarde.</p>}
    </section>
  );
}

function Over(): JSX.Element {
  return (
    <section>
      <div class="head"><Back /><h1>Over</h1></div>
      <dl class="kv"><dt>Engine</dt><dd>{ENGINE3_VERSION}</dd><dt>Contract</dt><dd>{ENGINE3_CONTRACT_VERSION}</dd></dl>
      <p class="muted">Je gegevens staan op dit toestel. Er wordt niets verstuurd tenzij je synchronisatie aanzet.</p>
      <h2>Oude app</h2>
      <p class="muted">De vorige versie staat nog op een eigen adres. Maak daar een back-up (Meer → Gegevens) en lees die hier in via Meer → Gegevens om je zakken en koppen over te nemen.</p>
      <a class="btn" href="oud/">Open de oude app</a>
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
        <section>
          <h1>Meer</h1>
          <ul class="list">
            <li><a class="item" href={href('meer', 'profiel')}><strong>Smaakprofiel</strong><small>Wat je opmerkt en waardeert</small></a></li>
            <li><a class="item" href={href('meer', 'molen')}><strong>Molen</strong><small>Hoe jouw molen reageert</small></a></li>
            <li><a class="item" href={href('meer', 'water')}><strong>Water</strong><small>Hardheid, alkaliniteit en verdunning</small></a></li>
            <li><a class="item" href={href('meer', 'voorkeuren')}><strong>Voorkeuren</strong><small>Hoe proeven en vragen werken</small></a></li>
            <li><a class="item" href={href('meer', 'gegevens')}><strong>Gegevens</strong><small>Back-up maken en terugzetten</small></a></li>
            <li><a class="item" href={href('meer', 'sync')}><strong>Synchronisatie</strong><small>{syncLine}</small></a></li>
            <li><a class="item" href={href('meer', 'over')}><strong>Over</strong><small>Versie en privacy</small></a></li>
          </ul>
        </section>
      );
  }
}
