import type { JSX } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { Route } from '../../core/router.ts';
import { href } from '../../core/router.ts';
import {
  ROAST_LABEL, beanArchive, beanRows, beanUpsert, daysSinceRoast, emptyForm, formFromBean, scanText, validateForm,
  type BeanForm, type FormKey, type BeanRow
} from '../../core/beans.ts';
import { formFromScan } from '../../core/beans.ts';
import { BeanFormView } from '../BeanFormView.tsx';
import { useApp, useSnapshot } from '../store-context.tsx';

const todayIso = (now: number): string => new Date(now).toISOString().slice(0, 10);

function Meta({ row, today }: { row: BeanRow; today: string }): JSX.Element {
  const age = daysSinceRoast(row.roastDate, today);
  const bits = [row.roaster, row.country, row.roastLevel ? ROAST_LABEL[row.roastLevel] : null, age !== null ? `${age} d na branding` : null, row.cups ? `${row.cups} ${row.cups === 1 ? 'kop' : 'koppen'}` : null].filter(Boolean);
  return <small>{bits.join(' · ') || 'Nog geen details'}</small>;
}

function List(): JSX.Element {
  const { state } = useSnapshot();
  const { env } = useApp();
  const rows = beanRows(state);
  const today = todayIso(env.now());
  return (
    <section>
      <div class="head"><h1>Zakken</h1><a class="btn primary" href={href('zakken', 'nieuw')}>Zak toevoegen</a></div>
      {rows.length === 0
        ? <div class="empty"><p>Nog geen zakken.</p><p>Plak de tekst van een zak of een webshoppagina, of scan de QR-code.</p></div>
        : <ul class="list">{rows.map(r => (
            <li key={r.id}><a class="item" href={href('zakken', r.id)}><strong>{r.name}</strong><Meta row={r} today={today} /></a></li>
          ))}</ul>}
    </section>
  );
}

function Editor({ beanId }: { beanId: string | null }): JSX.Element {
  const { store, env } = useApp();
  const { state } = useSnapshot();
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
      setForm(formFromScan(reading));
      setQrMsg(reading.url ? `QR gelezen (webadres: ${reading.url}). Plak de tekst van die pagina voor meer velden.` : 'QR gelezen.');
    } catch { setQrMsg('Deze foto kon niet gelezen worden.'); }
  };

  const save = async (): Promise<void> => {
    const r = validateForm(form, env);
    if (!r.ok) { setProblems(r.problems); return; }
    setBusy(true); setSaveErr('');
    try {
      await store.append([beanUpsert(env, beanId, r)]);
      location.hash = href('zakken');
    } catch (e) { setSaveErr(`Opslaan is mislukt: ${(e as Error).message}`); setBusy(false); }
  };

  return (
    <section>
      <div class="head"><a class="btn" href={href('zakken')} aria-label="Terug naar zakken">Terug</a><h1>{beanId ? 'Zak bewerken' : 'Zak toevoegen'}</h1></div>
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
  if (sub) return known ? <Editor key={sub} beanId={sub} /> : <section><h1>Zak niet gevonden</h1><a class="btn" href={href('zakken')}>Terug</a></section>;
  return <List />;
}
