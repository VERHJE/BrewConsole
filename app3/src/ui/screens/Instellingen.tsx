import { CUE_SOUND_KEY, CUE_VIBRATE_KEY, readCuePrefs, saveCuePref } from '../../core/cues.ts';
import { playCue, unlockAudio } from '../cues.ts';
import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import type { WaterSetting } from '../../../../engine3/src/index.ts';
import { href } from '../../core/router.ts';
import {
  DILUTIONS, SCA_ALKALINITY, SCA_HARDNESS, WATER_PRESETS, brightLighterEvent, dilutionKey, effectiveWater, grinderEvent,
  settingsOf, validateWater, verdictOf, waterEvent, type Verdict
} from '../../core/settings.ts';
import { THEME_KEY, THEME_LABEL, TYPE_KEY, TYPE_LABEL, applyPrefs, readTheme, readType, savePref, themeColor, type ThemePref, type TypePref } from '../../core/prefs.ts';
import { useApp, useSnapshot } from '../store-context.tsx';

const VERDICT: Record<Verdict, string> = { below: 'onder', within: 'binnen', above: 'boven' };
const nl = (n: number): string => (Math.round(n * 10) / 10).toString().replace('.', ',');
const Back = (): JSX.Element => <a class="btn" href={href('meer')}>Terug</a>;

export function Water(): JSX.Element {
  const { store, env } = useApp();
  const { state } = useSnapshot();
  const saved = settingsOf(state).water;
  const [w, setW] = useState<WaterSetting>(saved);
  const [msg, setMsg] = useState('');
  const problems = validateWater(w);
  const dirty = JSON.stringify(w) !== JSON.stringify(saved);
  const eff = effectiveWater(w);
  const hv = verdictOf(eff.hardnessMgL, SCA_HARDNESS);
  const av = verdictOf(eff.alkalinityCaCO3, SCA_ALKALINITY);
  const preset = WATER_PRESETS.find(p => p.value.hardnessMgL === w.hardnessMgL && p.value.alkalinity?.value === w.alkalinity?.value && p.value.alkalinity?.unit === w.alkalinity?.unit);
  const num = (raw: string): number | null => { const t = raw.replace(',', '.').trim(); return t === '' ? null : Number(t); };

  const save = async (): Promise<void> => {
    if (Object.keys(problems).length) return;
    try { await store.append([waterEvent(env, w)]); setMsg('Opgeslagen.'); } catch (e) { setMsg(`Opslaan is mislukt: ${(e as Error).message}`); }
  };

  return (
    <section>
      <div class="head"><Back /><h1>Water</h1></div>
      <p class="muted">Eenmalig invullen. Het wordt bewaard en verandert geen receptgetal.</p>
      <details class="tech-note"><summary>Waarom verandert dit niets?</summary>
        <p class="engine-note">Voor hardheid en alkaliniteit is geen gevalideerde omrekening naar temperatuur of maling gevonden. Wel zegt Gagné (natuurkundige, podcast) dat veel bicarbonaat (alkaliniteit) het zuur dempt en fruitige koffies saai maakt. Het getal staat op het waterrapport van je kraanwater.</p></details>
      {msg && <p class="banner" role="status">{msg}</p>}
      <p class="meta">Snel invullen</p>
      <div class="chips" role="group" aria-label="Snel invullen">
        {WATER_PRESETS.map(p => <button key={p.key} type="button" class="chip" aria-pressed={preset?.key === p.key} onClick={() => setW(p.value)}>{p.label}</button>)}
        <button type="button" class="chip" onClick={() => setW({ hardnessMgL: null, alkalinity: null, dilution: { tapParts: 1, demiParts: 0 } })}>Wissen</button>
      </div>
      {preset?.source && <p class="meta">{preset.area ? `${preset.area}. ` : ''}{preset.source}</p>}

      <label class="field"><span>Hardheid (mg/L als CaCO3)</span>
        <input name="hardness" inputMode="decimal" placeholder="bijv. 128" value={w.hardnessMgL === null ? '' : String(w.hardnessMgL)} onInput={e => setW({ ...w, hardnessMgL: num((e.currentTarget as HTMLInputElement).value) })} aria-invalid={problems.hardnessMgL ? 'true' : undefined} />
        {problems.hardnessMgL && <div class="err" role="alert">{problems.hardnessMgL}</div>}</label>
      <div class="field"><span id="alk-l">Alkaliniteit</span>
        <div class="row">
          <input name="alkalinity" inputMode="decimal" aria-labelledby="alk-l" placeholder="bijv. 50" value={w.alkalinity?.value == null ? '' : String(w.alkalinity.value)}
            onInput={e => setW({ ...w, alkalinity: { value: num((e.currentTarget as HTMLInputElement).value), unit: w.alkalinity?.unit ?? 'CaCO3' } })} aria-invalid={problems.alkalinity ? 'true' : undefined} />
          <select name="alkunit" aria-label="Eenheid alkaliniteit" value={w.alkalinity?.unit ?? 'CaCO3'} onChange={e => setW({ ...w, alkalinity: { value: w.alkalinity?.value ?? null, unit: (e.currentTarget as HTMLSelectElement).value as 'CaCO3' | 'HCO3' } })}>
            <option value="CaCO3">mg/L CaCO3</option><option value="HCO3">mg/L HCO3</option>
          </select>
        </div>
        {problems.alkalinity && <div class="err" role="alert">{problems.alkalinity}</div>}</div>
      <label class="field"><span>Verdunning kraan : gedemineraliseerd (optioneel)</span>
        <select name="dilution" value={dilutionKey(w.dilution)} onChange={e => setW({ ...w, dilution: DILUTIONS.find(d => d.key === (e.currentTarget as HTMLSelectElement).value)!.value })}>
          {DILUTIONS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select></label>

      <div class="card" aria-live="polite"><strong>In je kop</strong>
        <dl class="kv">
          <dt>Hardheid</dt><dd>{eff.hardnessMgL === null ? '–' : `${nl(eff.hardnessMgL)} mg/L${hv ? ` · ${VERDICT[hv]} de SCA-richtwaarde (${SCA_HARDNESS.low}–${SCA_HARDNESS.high})` : ''}`}</dd>
          <dt>Alkaliniteit</dt><dd>{eff.alkalinityCaCO3 === null ? '–' : `${nl(eff.alkalinityCaCO3)} mg/L CaCO3${av ? ` · ${VERDICT[av]} de SCA-richtwaarde (${SCA_ALKALINITY.low}–${SCA_ALKALINITY.high})` : ''}`}</dd>
        </dl>
        <p class="meta">Waterstofcarbonaat (HCO3) wordt omgerekend met ×0,82. Demiwater telt als 0. Zoek je waarden op de kwaliteitspagina van je waterbedrijf (“totale hardheid” en “waterstofcarbonaat”).</p>
      </div>
      <div class="actions"><button class="btn primary" type="button" onClick={save} disabled={!dirty || Object.keys(problems).length > 0}>Opslaan</button></div>
    </section>
  );
}

function Radios<T extends string>({ name, legend, value, labels, onPick }: { name: string; legend: string; value: T; labels: Readonly<Record<T, string>>; onPick: (v: T) => void }): JSX.Element {
  return (
    <fieldset class="field"><legend class="meta">{legend}</legend>
      {(Object.keys(labels) as T[]).map(k => (
        <label key={k} class="choice" style="margin-top:8px"><input type="radio" name={name} value={k} checked={value === k} onChange={() => onPick(k)} /><span>{labels[k]}</span></label>
      ))}
    </fieldset>
  );
}

export function Voorkeuren(): JSX.Element {
  const { store, env } = useApp();
  const { state } = useSnapshot();
  const s = settingsOf(state);
  const [theme, setTheme] = useState<ThemePref>(() => readTheme(localStorage));
  const [type, setType] = useState<TypePref>(() => readType(localStorage));
  const [cues, setCues] = useState(() => readCuePrefs(localStorage));
  const changeCue = (key: typeof CUE_SOUND_KEY | typeof CUE_VIBRATE_KEY, on: boolean): void => { saveCuePref(localStorage, key, on); setCues(readCuePrefs(localStorage)); };
  const change = (t: ThemePref, f: TypePref): void => {
    savePref(localStorage, THEME_KEY, t); savePref(localStorage, TYPE_KEY, f);
    applyPrefs(document.documentElement, t, f);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', themeColor(t, matchMedia('(prefers-color-scheme: dark)').matches));
    setTheme(t); setType(f);
  };
  return (
    <section>
      <div class="head"><Back /><h1>Voorkeuren</h1></div>
      <h2>Weergave</h2>
      <Radios<ThemePref> name="theme" legend="Thema" value={theme} labels={THEME_LABEL} onPick={t => change(t, type)} />
      <Radios<TypePref> name="type" legend="Lettertype van koppen en namen" value={type} labels={TYPE_LABEL} onPick={f => change(theme, f)} />
      <p class="meta">Cijfers en teksten blijven in beide gevallen schreefloos. Deze keuze geldt voor dit toestel.</p>
      <h2>Timer</h2>
      <label class="choice" style="margin-top:8px">
        <input type="checkbox" name="cueSound" checked={cues.sound} onChange={e => changeCue(CUE_SOUND_KEY, (e.currentTarget as HTMLInputElement).checked)} />
        <span>Geluid bij elke giet en aan het einde</span>
      </label>
      <label class="choice" style="margin-top:8px">
        <input type="checkbox" name="cueVibrate" checked={cues.vibrate} onChange={e => changeCue(CUE_VIBRATE_KEY, (e.currentTarget as HTMLInputElement).checked)} />
        <span>Trillen bij een giet</span>
      </label>
      <p><button class="btn" type="button" name="cueTest" onClick={() => { unlockAudio(); playCue('pour', cues); }}>Test het signaal</button></p>
      <p class="meta">Een tikje in de laatste drie seconden voor een giet, een dubbele piep als de giet begint, een aandachtssignaal als je “Doorgelopen” moet tikken en een stijgende toon als het klaar is. Trillen werkt niet op een iPhone; het scherm blijft wel aan tijdens het zetsel. Deze keuzes gelden voor dit toestel.</p>
      <h2>Proeven</h2>
      <label class="choice" style="margin-top:8px">
        <input type="checkbox" name="lighter" checked={s.brightLighter} onChange={e => { void store.append([brightLighterEvent(env, (e.currentTarget as HTMLInputElement).checked)]); }} />
        <span>Bij een proef A tegen B ook vragen welke helderder was</span>
      </label>
      <p class="meta">Dit staat standaard uit. Het helpt de engine te zien of een techniek je koffie helderder maakt, niet alleen lekkerder.</p>
    </section>
  );
}

export function ZeroCheck(): JSX.Element {
  const { store, env } = useApp();
  const { state } = useSnapshot();
  const at = settingsOf(state).zeroCheckedAt;
  const days = at === null ? null : Math.floor((env.now() - at) / 86_400_000);
  return (
    <div class="card"><strong>Nulpunt van de molen</strong>
      <p class="meta">Klikken tellen vanaf de nulstand (messen dicht): draai de molen dicht tot hij licht aanloopt en tel vanaf daar. Controleer dit na schoonmaken of als de molen een tik heeft gehad; een verschoven nulpunt maakt elke klik onjuist.</p>
      <p>{at === null ? 'Nog niet gecontroleerd.' : `Gecontroleerd op ${new Date(at).toLocaleDateString('nl-NL')}${days !== null && days > 0 ? ` (${days} dagen geleden)` : ' (vandaag)'}.`}</p>
      <button class="btn" type="button" onClick={() => { void store.append([grinderEvent(env, env.now())]); }}>Nulpunt zojuist gecontroleerd</button>
    </div>
  );
}
