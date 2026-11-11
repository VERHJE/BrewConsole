import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { href } from '../../core/router.ts';
import { base64ToBytes, bytesToBase64, exportLog, previewImport, type BackupPhoto, type ImportPreview } from '../../core/backup.ts';
import { beanRows } from '../../core/beans.ts';
import { cupRows } from '../../core/insights.ts';
import { IconDownload, IconTrash, IconUpload } from '../icons.tsx';
import { Panel } from '../settings-kit.tsx';
import { useApp, useSnapshot } from '../store-context.tsx';

const KIND_LABEL: Record<string, string> = {
  'bean.upsert': 'zakken', 'brew.plan': 'koppen', 'brew.timer': 'timer-momenten', 'tasting': 'proeverijen', 'pair.trial': 'proeven A tegen B',
  'brew.actuals': 'werkelijke waarden', 'setting': 'instellingen', 'bean.archive': 'gearchiveerde zakken', 'brew.delete': 'verwijderde koppen', 'retract': 'intrekkingen'
};
const LAST_EXPORT = 'brewconsole.lastExport';

export function Gegevens(): JSX.Element {
  const { store, env, photos } = useApp();
  const { events, state } = useSnapshot();
  const nBeans = beanRows(state).length;
  const nCups = cupRows(state).length;
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState('');
  let last: number | null = null;
  try { last = Number(localStorage.getItem(LAST_EXPORT)) || null; } catch { last = null; }
  const days = last ? Math.floor((env.now() - last) / 86_400_000) : null;

  const doExport = async (): Promise<void> => {
    const beanIds = [...new Set(events.filter(e => e.kind === 'bean.upsert').map(e => (e.data as { beanId: string }).beanId))];
    const pics: BackupPhoto[] = [];
    for (const id of beanIds) {
      try {
        const b = await photos.get(id);
        if (b) pics.push({ beanId: id, type: b.type || 'image/jpeg', data: bytesToBase64(new Uint8Array(await b.arrayBuffer())) });
      } catch { /* deze foto laten we weg; de rest van de back-up is belangrijker */ }
    }
    const text = exportLog(events, env.now(), pics);
    const name = `brewconsole-${new Date(env.now()).toISOString().slice(0, 10)}.json`;
    const file = new File([text], name, { type: 'application/json' });
    try {
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) { await nav.share({ files: [file], title: 'Brew Console back-up' }); }
      else {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      try { localStorage.setItem(LAST_EXPORT, String(env.now())); } catch { /* geen opslag: prima */ }
      setMsg(pics.length ? `Back-up gemaakt, met ${pics.length} foto${pics.length === 1 ? '' : "'s"}.` : 'Back-up gemaakt.');
    } catch (e) { if ((e as Error).name !== 'AbortError') setMsg('De back-up kon niet worden gedeeld of opgeslagen.'); }
  };

  const onFile = async (e: Event): Promise<void> => {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    if (f.size > 50_000_000) { setMsg('Dit bestand is te groot voor een back-up.'); return; }
    setPreview(previewImport(await f.text(), events)); setMsg('');
  };
  const doImport = async (): Promise<void> => {
    if (!preview) return;
    try {
      const r = await store.merge(preview.events);
      let pics = 0;
      for (const p of preview.photos) {
        if (await photos.get(p.beanId)) continue; // een foto op dit toestel blijft staan
        await photos.put(p.beanId, new Blob([base64ToBytes(p.data) as BlobPart], { type: p.type })); pics++;
      }
      setMsg(`${r.added} nieuwe gebeurtenissen toegevoegd${pics ? `, ${pics} foto${pics === 1 ? '' : "'s"} teruggezet` : ''}.`); setPreview(null);
    }
    catch (e) { setMsg(`Importeren is mislukt: ${(e as Error).message}`); }
  };
  const wipe = async (): Promise<void> => { await store.clear(); try { await photos.clear(); } catch { /* geen foto's te wissen */ } setConfirm(''); setMsg('Alles op dit toestel is gewist.'); };

  return (
    <section class="settings">
      <div class="head"><a class="btn" href={href('meer')}>Terug</a><h1>Gegevens</h1></div>
      <p class="muted">Op dit toestel{store.storage.persistent ? '' : ' (tijdelijk: niet blijvend opgeslagen)'}.</p>
      <div class="numbers meertiles">
        <div class="num"><b>{nBeans}</b><small>{nBeans === 1 ? 'zak' : 'zakken'}</small></div>
        <div class="num"><b>{nCups}</b><small>{nCups === 1 ? 'kop' : 'koppen'}</small></div>
        <div class="num wide"><b>{days === null ? '–' : days === 0 ? 'vandaag' : `${days} d`}</b><small>{days === null ? 'nog geen back-up' : 'sinds je back-up'}</small></div>
      </div>
      {days !== null && days >= 14 && <p class="banner" role="status">Je laatste back-up is {days} dagen oud.</p>}
      {last === null && events.length > 0 && <p class="banner" role="status">Je hebt nog geen back-up gemaakt.</p>}
      {msg && <p class="banner" role="status">{msg}</p>}

      <Panel icon={<IconDownload />} title="Back-up maken" sub="Eén bestand met alles, ook de foto's van je zakken. Bewaar het buiten dit toestel.">
        <button class="btn primary" type="button" onClick={doExport} disabled={events.length === 0}>Back-up maken</button>
      </Panel>

      <Panel icon={<IconUpload />} title="Back-up terugzetten" sub="Werkt met een back-up van deze app en met die van de oude Brew Console. Bestaande gegevens blijven staan; alleen wat nieuw is wordt toegevoegd.">
        <label class="btn">Bestand kiezen<input class="sr-only" type="file" accept="application/json,.json" onChange={onFile} /></label>
        {preview && (
          <div class="previewbox">
            {preview.kind === 'unknown' ? null : <p>{preview.kind === 'old-app' ? 'Back-up van de oude app' : 'Back-up van Brew Console'}: {Object.entries(preview.counts).map(([k, n]) => `${n} ${KIND_LABEL[k] ?? k}`).join(', ')}.</p>}
            {preview.kind !== 'unknown' && <p>{preview.fresh} nieuw, {preview.known} al aanwezig{preview.photos.length ? `; ${preview.photos.length} foto${preview.photos.length === 1 ? '' : "'s"} van zakken` : ''}.</p>}
            {preview.warnings.map(w => <p class="banner warn" key={w} role="status">{w}</p>)}
            {preview.kind !== 'unknown' && <button class="btn primary" type="button" onClick={doImport} disabled={preview.fresh === 0 && preview.photos.length === 0}>{preview.fresh > 0 ? `${preview.fresh} toevoegen` : preview.photos.length > 0 ? "Foto's terugzetten" : 'Niets nieuws'}</button>}
          </div>)}
      </Panel>

      <Panel icon={<IconTrash />} tone="danger" title="Alles wissen" sub="Wist alle gegevens op dit toestel. Maak eerst een back-up. Staat synchronisatie aan, dan blijft de kopie op de server staan.">
        <label class="field"><span>Typ WISSEN om te bevestigen</span><input name="confirm" value={confirm} onInput={e => setConfirm((e.currentTarget as HTMLInputElement).value)} autocomplete="off" /></label>
        <button class="btn" type="button" onClick={wipe} disabled={confirm !== 'WISSEN'}>Alles wissen</button>
      </Panel>
    </section>
  );
}
