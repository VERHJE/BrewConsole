import type { JSX } from 'preact';
import { ENGINE3_CONTRACT_VERSION, ENGINE3_VERSION } from '../../../../engine3/src/index.ts';
import type { Route } from '../../core/router.ts';
import { href } from '../../core/router.ts';
import { CATEGORIES } from '../../core/tasting.ts';
import { STATUS_TEXT, grindView, profileOf } from '../../core/insights.ts';
import { useSnapshot } from '../store-context.tsx';

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
      <table class="plain"><thead><tr><th>Groep</th><th class="n">Treffers</th><th class="n">Valse alarmen</th><th>Beeld</th></tr></thead>
        <tbody>{p.sensitivity.map(s => (
          <tr key={s.category}><td>{catName(s.category)}</td><td class="n">{s.hits}/{s.nExpected}</td><td class="n">{s.falseAlarms}/{s.nNotExpected}</td><td>{STATUS_TEXT[s.status]}</td></tr>))}</tbody></table>
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
    </section>
  );
}

export function Meer({ route }: { route: Route }): JSX.Element {
  switch (route.parts[1]) {
    case 'profiel': return <Profiel />;
    case 'molen': return <Molen />;
    case 'over': return <Over />;
    default:
      return (
        <section>
          <h1>Meer</h1>
          <ul class="list">
            <li><a class="item" href={href('meer', 'profiel')}><strong>Smaakprofiel</strong><small>Wat je opmerkt en waardeert</small></a></li>
            <li><a class="item" href={href('meer', 'molen')}><strong>Molen</strong><small>Hoe jouw molen reageert</small></a></li>
            <li><a class="item" href={href('meer', 'over')}><strong>Over</strong><small>Versie en privacy</small></a></li>
          </ul>
        </section>
      );
  }
}
