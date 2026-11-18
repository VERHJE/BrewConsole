// Zak toevoegen of bewerken. Tot 18 nov 2026 stond dit in Zakken.tsx (review 17 nov 2026, C2: het meest ingewikkelde scherm).
// Het formulier zelf staat in BeanFormView; alles rond de zakfoto (kiezen, QR-code lezen, verwijderen, opslaan) in useBagPhoto.

import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { encodePhoto } from '../photo-encode.ts';
import { href } from '../../core/router.ts';
import {
  beanArchive, beanRows, beanUpsert, emptyForm, fillEmpty, formFromBean, formFromScan, sameNameBean, scanText, validateForm,
  type BeanForm, type FormKey
} from '../../core/beans.ts';
import type { Env } from '../../core/ids.ts';
import type { PhotoStore } from '../../core/photos.ts';
import { BeanFormView } from '../BeanFormView.tsx';
import { BagArt, useApp, useSnapshot } from '../store-context.tsx';

/** Eén melding voor het volgende scherm (de zakkenlijst), bijvoorbeeld als de foto niet opgeslagen kon worden. */
let notice: string | null = null;
/** Geeft de melding één keer terug en wist hem. */
export function takeNotice(): string | null { const n = notice; notice = null; return n; }

type QrResult = BeanForm | { url: string; form: BeanForm };

/** Zoekt een QR-code in de foto (de app leest hem zelf, er gaat niets naar buiten); null als er geen is of het lezen mislukt. */
async function readQr(env: Env, file: Blob): Promise<QrResult | null> {
  try {
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width; canvas.height = bmp.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0);
    const px = ctx.getImageData(0, 0, bmp.width, bmp.height);
    bmp.close?.();
    const { readQrFromPixels } = await import('../../../../engine3/qr/decode.ts');
    const reading = readQrFromPixels({ data: px.data, width: px.width, height: px.height }, env.now());
    if (!reading) return null;
    const scanned = formFromScan(reading);
    return reading.url ? { url: reading.url, form: { ...scanned, values: { ...scanned.values, shopUrl: reading.url }, sources: { ...scanned.sources, shopUrl: 'qr' } } } : scanned;
  } catch { return null; }
}

/**
 * De zakfoto in het formulier: kiezen (verkleind), bij een nieuwe zak ook de QR-code erin lezen (alleen lege velden, review 17 nov,
 * U3), verwijderen, en bij opslaan wegschrijven. `persist` geeft een melding terug als de foto niet opgeslagen kon worden.
 */
function useBagPhoto(env: Env, photos: PhotoStore, beanId: string | null, form: BeanForm, setForm: (f: (old: BeanForm) => BeanForm) => void) {
  const [blob, setBlob] = useState<Blob | 'remove' | null>(null);
  const [bump, setBump] = useState(0);
  const [msg, setMsg] = useState('');
  const previewUrl = useMemo(() => (blob && blob !== 'remove' ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const choose = async (e: Event): Promise<void> => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setMsg('Bezig…');
    try { setBlob(await encodePhoto(file)); }
    catch { setMsg('Deze foto kon niet gelezen worden.'); input.value = ''; return; }
    let qrLine = '';
    if (!beanId) {
      setMsg('Foto klaar. Zoeken naar een QR-code…');
      const qr = await readQr(env, file);
      if (qr) {
        const scan = 'url' in qr ? qr.form : qr;
        const filled = fillEmpty(form, scan).filled; // voor de melding; het formulier zelf met de nieuwste stand
        setForm(f => fillEmpty(f, scan).form);
        qrLine = 'url' in qr
          ? ` QR-code gelezen (webadres: ${qr.url}). Plak de tekst van die pagina voor meer velden.`
          : filled > 0 ? ` QR-code gelezen: ${filled} ${filled === 1 ? 'veld' : 'velden'} ingevuld.` : ' QR-code gelezen; alle velden stonden al ingevuld.';
      }
    }
    setMsg(`Foto klaar. Ze staat in je back-up en gaat mee met de synchronisatie, als die aanstaat.${qrLine}`);
    input.value = '';
  };
  const remove = (): void => { setBlob('remove'); setBump(bump + 1); setMsg('Foto wordt verwijderd bij opslaan.'); };
  const persist = async (id: string): Promise<string | null> => {
    try {
      if (blob === 'remove') await photos.remove(id);
      else if (blob) await photos.put(id, blob);
      return null;
    } catch {
      // De zak is opgeslagen, alleen de foto niet (review 17 nov 2026: dat gebeurde eerst zonder melding).
      return blob === 'remove' ? 'De zak is opgeslagen, maar de foto kon niet verwijderd worden. Probeer het nog eens.'
        : 'De zak is opgeslagen, maar de foto niet. Kies de foto opnieuw via Bewerken.';
    }
  };
  return { blob, bump, msg, previewUrl, choose, remove, persist };
}

export function Editor({ beanId }: { beanId: string | null }): JSX.Element {
  const { store, env, photos } = useApp();
  const { state } = useSnapshot();
  const [form, setForm] = useState<BeanForm>(() => (beanId ? formFromBean(state, beanId) : null) ?? emptyForm());
  const [paste, setPaste] = useState('');
  const [problems, setProblems] = useState<Partial<Record<FormKey, string>>>({});
  const [busy, setBusy] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const photo = useBagPhoto(env, photos, beanId, form, setForm);

  const recognise = (): void => { setForm(scanText(env, paste)); setProblems({}); };

  const save = async (): Promise<void> => {
    const r = validateForm(form, env);
    if (!r.ok) { setProblems(r.problems); return; }
    setBusy(true); setSaveErr('');
    try {
      const ev = beanUpsert(env, beanId, r);
      await store.append([ev]);
      notice = await photo.persist(ev.data.beanId);
      location.hash = href('zakken');
    } catch (e) { setSaveErr(`Opslaan is mislukt: ${(e as Error).message}`); setBusy(false); }
  };

  const name = form.values.name || 'zak';
  return (
    <section>
      <div class="head"><a class="btn" href={beanId ? href('zakken', beanId) : href('zakken')} aria-label="Terug">Terug</a><h1>{beanId ? 'Zak bewerken' : 'Zak toevoegen'}</h1></div>
      {!beanId && (
        <div class="card">
          <label class="field"><span>Plak de tekst van de zak of de webshoppagina</span>
            <textarea name="paste" value={paste} onInput={e => setPaste((e.currentTarget as HTMLTextAreaElement).value)} /></label>
          <div class="row wrap">
            <button class="btn primary" type="button" onClick={recognise} disabled={!paste.trim()}>Herken velden</button>
          </div>
          <p class="meta">Of kies hieronder een foto van de zak: staat er een QR-code op, dan leest de app die ook.</p>
        </div>
      )}
      <div class="card photo-field">
        <div class="photo-preview">{photo.previewUrl && photo.blob !== 'remove'
          ? <img class="bagart photo" src={photo.previewUrl} alt="" />
          : <BagArt beanId={photo.blob === 'remove' ? 'x' : beanId ?? 'nieuw'} name={name} bump={photo.bump} />}</div>
        <div class="photo-actions">
          <strong>Foto van de zak</strong>
          <span class="meta">Staat in je back-up en gaat mee met de synchronisatie, als die aanstaat.</span>
          <div class="row wrap">
            <label class="btn">Foto kiezen<input class="sr-only" type="file" name="photo" accept="image/*" onChange={photo.choose} /></label>
            {(photo.blob && photo.blob !== 'remove' || beanId) && <button class="btn" type="button" onClick={photo.remove}>Foto verwijderen</button>}
          </div>
          {photo.msg && <span class="meta" role="status">{photo.msg}</span>}
        </div>
      </div>
      <BeanFormView form={form} problems={problems} onChange={setForm} />
      {sameNameBean(beanRows(state), form.values.name, beanId) && (
        <p class="banner" role="status">Er is al een zak met de naam “{form.values.name.trim()}”. Opslaan maakt een tweede zak; wil je de bestaande aanpassen, open die dan via Zakken.</p>)}
      {saveErr && <p class="banner warn" role="alert">{saveErr}</p>}
      <div class="actions editor-actions">
        <button class="btn primary" type="button" onClick={save} disabled={busy}>Opslaan</button>
        {beanId && <button class="btn" type="button" onClick={async () => { await store.append([beanArchive(env, beanId)]); location.hash = href('zakken'); }}>Archiveren</button>}
      </div>
    </section>
  );
}
