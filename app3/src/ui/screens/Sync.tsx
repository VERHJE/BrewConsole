import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { href } from '../../core/router.ts';
import { connect, disconnect, indexedDbSyncStorage, memorySyncStorage, syncNow, type SyncDeps, type SyncOutcome, type SyncSettings, type SyncStorage } from '../../core/sync.ts';
import { useApp } from '../store-context.tsx';

function photoLine(o: Extract<SyncOutcome, { ok: true }>): string {
  if (o.photoError) return ` Foto’s: ${o.photoError}`;
  const p = o.photos;
  if (!p) return '';
  const parts = [p.pushed ? `${p.pushed} verstuurd` : '', p.pulled ? `${p.pulled} opgehaald` : '', p.removed ? `${p.removed} verwijderd` : '', p.skipped ? `${p.skipped} overgeslagen` : ''].filter(Boolean);
  return parts.length ? ` Foto’s: ${parts.join(', ')}.` : ' Foto’s: alles up-to-date.';
}

function describe(o: SyncOutcome): string {
  return o.ok ? `Gelukt: ${o.fetched} blok${o.fetched === 1 ? '' : 'ken'} opgehaald, ${o.pushed} gebeurtenissen verstuurd, ${o.added} nieuw hier.${photoLine(o)}` : o.message;
}

export function Sync(): JSX.Element {
  const { store, env, photoSync } = useApp();
  const [storage, setStorage] = useState<SyncStorage | null>(null);
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { void (async () => { const s = (await indexedDbSyncStorage()) ?? memorySyncStorage(); setStorage(s); setSettings((await s.load())?.settings ?? null); })(); }, []);
  const deps = useMemo<SyncDeps | null>(() => storage && ({
    storage, store, device: env.device, now: env.now,
    crypto: { subtle: crypto.subtle as never, randomBytes: n => crypto.getRandomValues(new Uint8Array(n)) },
    fetch: (u, init) => fetch(u, init),
    ...(photoSync ? { photoSync } : {})
  }), [storage, store, env, photoSync]);

  const run = async (f: (d: SyncDeps) => Promise<SyncOutcome>): Promise<void> => {
    if (!deps) return;
    setBusy(true); setMsg('');
    try { const o = await f(deps); setMsg(describe(o)); setSettings((await deps.storage.load())?.settings ?? null); if (o.ok) setPhrase(''); }
    finally { setBusy(false); }
  };

  return (
    <section>
      <div class="head"><a class="btn" href={href('meer')}>Terug</a><h1>Synchronisatie</h1></div>
      <p class="muted">Houd twee toestellen gelijk, ook de foto’s van je zakken en het verwijderen ervan. Alles wordt versleuteld op dit toestel; de server ziet geen inhoud.</p>
      {msg && <p class="banner" role="status">{msg}</p>}
      {settings ? (
        <div class="card">
          <p><strong>Verbonden</strong> met {settings.baseUrl}</p>
          <p class="meta">{settings.lastSyncAt ? `Laatste keer: ${new Date(settings.lastSyncAt).toLocaleString('nl-NL')}` : 'Nog niet gesynchroniseerd.'}</p>
          <div class="actions">
            <button class="btn primary" type="button" disabled={busy} onClick={() => run(syncNow)}>{busy ? 'Bezig…' : 'Nu synchroniseren'}</button>
            <button class="btn" type="button" disabled={busy} onClick={async () => { if (deps) { await disconnect(deps); setSettings(null); setMsg('Losgekoppeld. Je gegevens op dit toestel zijn ongewijzigd.'); } }}>Loskoppelen</button>
          </div>
        </div>
      ) : (
        <div class="card">
          <label class="field"><span>Adres van de Worker</span><input name="url" inputMode="url" placeholder="https://brewconsole-sync.….workers.dev" value={url} onInput={e => setUrl((e.currentTarget as HTMLInputElement).value)} autocomplete="off" /></label>
          <label class="field"><span>Token (uit de tokengenerator)</span><input name="token" type="password" value={token} onInput={e => setToken((e.currentTarget as HTMLInputElement).value)} autocomplete="off" /></label>
          <label class="field"><span>Wachtwoordzin (zelfde op elk toestel; niet te herstellen)</span><input name="phrase" type="password" value={phrase} onInput={e => setPhrase((e.currentTarget as HTMLInputElement).value)} autocomplete="off" /></label>
          <button class="btn primary" type="button" disabled={busy || !url || !token || !phrase} onClick={() => run(d => connect(d, { baseUrl: url, token, passphrase: phrase }))}>{busy ? 'Bezig… (even geduld)' : 'Verbinden'}</button>
        </div>)}
    </section>
  );
}
