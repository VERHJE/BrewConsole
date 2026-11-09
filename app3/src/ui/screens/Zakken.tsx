import type { JSX } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { encodePhoto } from '../photo-encode.ts';
import type { Route } from '../../core/router.ts';
import { href } from '../../core/router.ts';
import {
  ROAST_LABEL, beanArchive, beanDetail, rowLines, stockView, beanRows, beanUpsert, daysSinceRoast, emptyForm, formFromBean, scanText, validateForm,
  type BeanForm, type FormKey, type BeanRow, type StockView
} from '../../core/beans.ts';
import { formFromScan } from '../../core/beans.ts';
import { BeanFormView } from '../BeanFormView.tsx';
import { BeanInsights } from '../Insights.tsx';
import { EmptyState } from '../EmptyState.tsx';
import { IconBean } from '../icons.tsx';
import { BagArt, useApp, useSnapshot } from '../store-context.tsx';
import { cupRows } from '../../core/insights.ts';
import { matches, readFavs, restView, toggleFav } from '../../core/ronde2.ts';
import {
  FILTER_KEYS, FILTER_LABEL, SORT_LABEL, filterBeans, isDefault, readListPrefs, saveListPrefs, sortBeans,
  type BeanFacts, type FilterKey, type ListPrefs, type SortMode
} from '../../core/zakkenlijst.ts';

const todayIso = (now: number): string => new Date(now).toISOString().slice(0, 10);

function Meta({ row, today, stock }: { row: BeanRow; today: string; stock: StockView | undefined }): JSX.Element {
  const l = rowLines(row, stock, today);
  return <><small>{l.origin}</small><small>{l.facts}{l.low && <> · <span class="tag warn">Bijna op</span></>}</small></>;
}

function List({ activeId = null }: { activeId?: string | null }): JSX.Element {
  const { state } = useSnapshot();
  const { env } = useApp();
  const [q, setQ] = useState('');
  const [prefs, setPrefs] = useState<ListPrefs>(() => readListPrefs(localStorage));
  const change = (p: ListPrefs): void => { saveListPrefs(localStorage, p); setPrefs(p); };
  const favs = readFavs(localStorage);
  const today = todayIso(env.now());
  const base = beanRows(state);
  const facts = useMemo(() => {
    const m = new Map<string, BeanFacts>();
    const st = new Map<string, StockView>();
    for (const r of base) {
      const l = cupRows(state, r.id).map(c => c.liking).filter((x): x is number => typeof x === 'number');
      const sv = stockView(state, r.id);
      st.set(r.id, sv);
      m.set(r.id, { fav: favs.has(r.id), low: sv.low, avg: l.length ? l.reduce((a, b) => a + b, 0) / l.length : null });
    }
    return { m, st };
  }, [state, favs.size]);
  const ctx = { facts: facts.m, todayIso: today };
  const all = sortBeans(base, prefs.sort, ctx);
  const filtered = filterBeans(all, prefs.filters, ctx);
  const rows = q.trim() ? filtered.filter(r => matches([r.name, r.roaster, r.country].filter(Boolean).join(' '), q)) : filtered;
  const narrowed = !isDefault(prefs) || q.trim() !== '';
  // De grote kaart pas bij drie of meer zakken; anders toont hij dezelfde zak als de lijst eronder.
  const top = narrowed || rows.length < 3 ? undefined : rows[0];
  const avg = (id: string): string | null => { const a = facts.m.get(id)?.avg; return a == null ? null : a.toFixed(1).replace('.', ','); };
  const toggleFilter = (k: FilterKey): void => change({ ...prefs, filters: prefs.filters.includes(k) ? prefs.filters.filter(x => x !== k) : [...prefs.filters, k] });
  return (
    <section>
      <div class="head">{activeId ? <h2 class="list-title">Zakken</h2> : <h1>Zakken</h1>}<a class="btn primary" href={href('zakken', 'nieuw')}>Zak toevoegen</a></div>
      {base.length === 0
        ? <EmptyState icon={<IconBean />} title="Nog geen zakken" >Plak de tekst van een zak of een webshoppagina, of scan de QR-code.</EmptyState>
        : <>
          {all.length > 3 && <label class="field search"><span class="sr-only">Zoek in zakken</span><input type="search" name="zoek" placeholder="Zoek op naam, brander of land" value={q} onInput={e => setQ((e.currentTarget as HTMLInputElement).value)} /></label>}
          {base.length > 3 && (
            <div class="listtools">
              <label class="field"><span>Sorteren</span>
                <select name="sorteer" value={prefs.sort} onChange={e => change({ ...prefs, sort: (e.currentTarget as HTMLSelectElement).value as SortMode })}>
                  {(Object.keys(SORT_LABEL) as SortMode[]).map(k => <option key={k} value={k}>{SORT_LABEL[k]}</option>)}
                </select></label>
              <div class="chips" role="group" aria-label="Filteren">
                {FILTER_KEYS.map(k => <button key={k} type="button" class="chip" aria-pressed={prefs.filters.includes(k)} onClick={() => toggleFilter(k)}>{FILTER_LABEL[k]}</button>)}
              </div>
              {narrowed && <p class="meta" role="status">{rows.length} van {base.length} {base.length === 1 ? 'zak' : 'zakken'}{!isDefault(prefs) && <> · <button type="button" class="linklike" onClick={() => change({ sort: 'standaard', filters: [] })}>Wis sorteren en filters</button></>}</p>}
            </div>)}
          {top && (
            <a class={rows.length > 1 ? 'hero stacked' : 'hero'} href={href('zakken', top.id)} aria-label={`Open ${top.name}`}>
              <BagArt beanId={top.id} name={top.name} large />
              <span class="hero-text">
                <small class="eyebrow">{favs.has(top.id) ? 'Favoriet' : 'Nieuwste zak'}</small>
                <strong>{top.name}</strong>
                <span class="chips">
                  {[top.country, daysSinceRoast(top.roastDate, today) !== null ? `${daysSinceRoast(top.roastDate, today)} d na branding` : null, avg(top.id) ? `★ ${avg(top.id)} · ${top.cups} ${top.cups === 1 ? 'kop' : 'koppen'}` : null]
                    .filter(Boolean).map(c => <span class="tag" key={c}>{c}</span>)}
                </span>
              </span>
            </a>)}
          <ul class="list thumbs">{rows.map(r => (
            <li key={r.id}><a class="item" href={href('zakken', r.id)} aria-current={r.id === activeId ? 'true' : undefined}><span class="thumb"><BagArt beanId={r.id} name={r.name} /></span><span class="itext"><strong>{favs.has(r.id) && <span aria-label="Favoriet">★ </span>}{r.name}</strong><Meta row={r} today={today} stock={facts.st.get(r.id)} /></span></a></li>
          ))}</ul>
          {rows.length === 0 && <EmptyState compact title={q.trim() ? `Geen zakken gevonden voor ‘${q}’` : 'Geen zakken met deze filters'}>{!isDefault(prefs) ? <button type="button" class="btn" onClick={() => change({ sort: 'standaard', filters: [] })}>Wis sorteren en filters</button> : undefined}</EmptyState>}
        </>}
    </section>
  );
}

function Detail({ beanId }: { beanId: string }): JSX.Element {
  const { state } = useSnapshot();
  const { env } = useApp();
  const d = beanDetail(state, beanId);
  const [fav, setFav] = useState(() => readFavs(localStorage).has(beanId));
  if (!d) return <section><h1>Zak niet gevonden</h1><a class="btn" href={href('zakken')}>Terug</a></section>;
  const age = daysSinceRoast(d.roastDate, todayIso(env.now()));
  const rest = restView(age);
  const stock = stockView(state, beanId);
  const zet = (): void => {
    try {
      const prev = JSON.parse(localStorage.getItem('brewconsole.zetten') ?? '{}') as Record<string, unknown>;
      localStorage.setItem('brewconsole.zetten', JSON.stringify({ ...prev, beanId }));
    } catch { /* zonder opslag: kies de zak op het zetscherm */ }
    location.hash = href('zetten');
  };
  return (
    <section class="detail">
      <div class="hero-photo"><a class="btn back-narrow backtop" href={href('zakken')} aria-label="Terug naar zakken">Terug</a><BagArt beanId={beanId} name={d.name} large /></div>
      <div class="head"><button class="btn" type="button" aria-pressed={fav} onClick={() => setFav(toggleFav(localStorage, beanId))}>{fav ? '★ Favoriet' : '☆ Favoriet'}</button><a class="btn" href={href('zakken', beanId, 'bewerken')}>Bewerken</a></div>
      {d.eyebrow && <small class="eyebrow">{d.eyebrow}</small>}
      <h1>{d.name}</h1>
      <p class="muted">{[d.roaster, age !== null ? `${age} d na branding` : null, d.cups ? `${d.cups} ${d.cups === 1 ? 'kop' : 'koppen'}` : null].filter(Boolean).join(' · ')}</p>
      {rest && <p class="rest"><span class="tag">{rest.label}</span> <span class="muted">{rest.hint}</span></p>}
      {stock.remainingG !== null && (
        <p class="stock"><span class={stock.low ? 'tag warn' : 'tag'}>{stock.low ? 'Bijna op' : 'Voorraad'}</span>{' '}
          <span class="muted">nog ± {stock.remainingG} g{stock.cupsLeft !== null ? `, ongeveer ${stock.cupsLeft} ${stock.cupsLeft === 1 ? 'kop' : 'koppen'}` : ''}</span></p>)}
      {d.shopUrl
        ? <p><a class={stock.low ? 'btn primary' : 'btn'} href={d.shopUrl} target="_blank" rel="noopener noreferrer">Opnieuw kopen <span class="sr-only">(opent de winkel in een nieuw tabblad)</span></a></p>
        : stock.low && <p class="muted">Bijna op. Voeg bij Bewerken een webadres toe om hem met één tik opnieuw te kopen.</p>}
      {d.tags.length > 0 && <p class="chips">{d.tags.map(t => <span class="tag" key={t}>{t}</span>)}</p>}
      {d.facts.length > 0 && <dl class="facts">{d.facts.map(f => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}
      <BeanInsights beanId={beanId} />
      <div class="startbar"><button class="btn primary" type="button" onClick={zet}><span>Zet deze zak</span></button></div>
    </section>
  );
}

function Editor({ beanId }: { beanId: string | null }): JSX.Element {
  const { store, env, photos } = useApp();
  const { state } = useSnapshot();
  const [photoBlob, setPhotoBlob] = useState<Blob | 'remove' | null>(null);
  const [bump, setBump] = useState(0);
  const [photoMsg, setPhotoMsg] = useState('');
  const [form, setForm] = useState<BeanForm>(() => (beanId ? formFromBean(state, beanId) : null) ?? emptyForm());
  const [paste, setPaste] = useState('');
  const [problems, setProblems] = useState<Partial<Record<FormKey, string>>>({});
  const [busy, setBusy] = useState(false);
  const [qrMsg, setQrMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');

  const recognise = (): void => { setForm(scanText(env, paste)); setProblems({}); };

  const onQr = async (e: Event): Promise<void> => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    setQrMsg('Bezig met lezen…');
    try {
      const bmp = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bmp.width; canvas.height = bmp.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bmp, 0, 0);
      const px = ctx.getImageData(0, 0, bmp.width, bmp.height);
      const { readQrFromPixels } = await import('../../../../engine3/qr/decode.ts');
      const reading = readQrFromPixels({ data: px.data, width: px.width, height: px.height }, env.now());
      if (!reading) { setQrMsg('Geen QR-code gevonden in deze foto.'); return; }
      const scanned = formFromScan(reading);
      setForm(reading.url ? { ...scanned, values: { ...scanned.values, shopUrl: reading.url }, sources: { ...scanned.sources, shopUrl: 'qr' } } : scanned);
      setQrMsg(reading.url ? `QR gelezen (webadres: ${reading.url}). Plak de tekst van die pagina voor meer velden.` : 'QR gelezen.');
    } catch { setQrMsg('Deze foto kon niet gelezen worden.'); }
  };

  const onPhoto = async (e: Event): Promise<void> => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setPhotoMsg('Bezig…');
    try { setPhotoBlob(await encodePhoto(file)); setPhotoMsg('Foto klaar. Ze staat in je back-up en gaat mee met de synchronisatie, als die aanstaat.'); }
    catch { setPhotoMsg('Deze foto kon niet gelezen worden.'); }
    input.value = '';
  };
  const previewUrl = useMemo(() => (photoBlob && photoBlob !== 'remove' ? URL.createObjectURL(photoBlob) : null), [photoBlob]);

  const save = async (): Promise<void> => {
    const r = validateForm(form, env);
    if (!r.ok) { setProblems(r.problems); return; }
    setBusy(true); setSaveErr('');
    try {
      const ev = beanUpsert(env, beanId, r);
      await store.append([ev]);
      try {
        if (photoBlob === 'remove') await photos.remove(ev.data.beanId);
        else if (photoBlob) await photos.put(ev.data.beanId, photoBlob);
      } catch { /* de zak is opgeslagen; alleen de foto lukte niet */ }
      location.hash = href('zakken');
    } catch (e) { setSaveErr(`Opslaan is mislukt: ${(e as Error).message}`); setBusy(false); }
  };

  return (
    <section>
      <div class="head"><a class="btn" href={beanId ? href('zakken', beanId) : href('zakken')} aria-label="Terug">Terug</a><h1>{beanId ? 'Zak bewerken' : 'Zak toevoegen'}</h1></div>
      {!beanId && (
        <div class="card">
          <label class="field"><span>Plak de tekst van de zak of de webshoppagina</span><textarea name="paste" value={paste} onInput={e => setPaste((e.currentTarget as HTMLTextAreaElement).value)} /></label>
          <div class="row wrap">
            <button class="btn primary" type="button" onClick={recognise} disabled={!paste.trim()}>Herken velden</button>
            <label class="btn">QR-foto kiezen<input class="sr-only" type="file" accept="image/*" onChange={onQr} /></label>
          </div>
          {qrMsg && <p class="meta" role="status">{qrMsg}</p>}
        </div>
      )}
      <div class="card photo-field">
        <div class="photo-preview">{previewUrl && photoBlob !== 'remove'
          ? <img class="bagart photo" src={previewUrl} alt="" />
          : photoBlob === 'remove' ? <BagArt beanId="x" name={form.values.name || 'zak'} bump={bump} /> : <BagArt beanId={beanId ?? 'nieuw'} name={form.values.name || 'zak'} bump={bump} />}</div>
        <div class="photo-actions">
          <strong>Foto van de zak</strong>
          <span class="meta">Staat in je back-up en gaat mee met de synchronisatie, als die aanstaat.</span>
          <div class="row wrap">
            <label class="btn">Foto kiezen<input class="sr-only" type="file" name="photo" accept="image/*" onChange={onPhoto} /></label>
            {(photoBlob && photoBlob !== 'remove' || beanId) && <button class="btn" type="button" onClick={() => { setPhotoBlob('remove'); setBump(bump + 1); setPhotoMsg('Foto wordt verwijderd bij opslaan.'); }}>Foto verwijderen</button>}
          </div>
          {photoMsg && <span class="meta" role="status">{photoMsg}</span>}
        </div>
      </div>
      <BeanFormView form={form} problems={problems} onChange={setForm} />
      {saveErr && <p class="banner warn" role="alert">{saveErr}</p>}
      <div class="actions">
        <button class="btn primary" type="button" onClick={save} disabled={busy}>Opslaan</button>
        {beanId && <button class="btn" type="button" onClick={async () => { await store.append([beanArchive(env, beanId)]); location.hash = href('zakken'); }}>Archiveren</button>}
      </div>
    </section>
  );
}

export function Zakken({ route }: { route: Route }): JSX.Element {
  const sub = route.parts[1];
  const { state } = useSnapshot();
  const known = useMemo(() => (sub && sub !== 'nieuw' ? beanRows(state).some(r => r.id === sub) : true), [state, sub]);
  if (sub === 'nieuw') return <Editor key="nieuw" beanId={null} />;
  if (sub && route.parts[2] === 'bewerken') return known ? <Editor key={sub + 'e'} beanId={sub} /> : <section><h1>Zak niet gevonden</h1><a class="btn" href={href('zakken')}>Terug</a></section>;
  if (sub) return known ? <div class="split has-detail"><div class="split-list"><List activeId={sub} /></div><Detail key={sub} beanId={sub} /></div> : <section><h1>Zak niet gevonden</h1><a class="btn" href={href('zakken')}>Terug</a></section>;
  return <List />;
}
