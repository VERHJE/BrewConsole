import { render } from 'preact';
import { createEngine } from '../../engine3/src/index.ts';
import { memoryStorage, openIndexedDbStorage } from './core/storage.ts';
import { createStore } from './core/store.ts';
import type { Env } from './core/ids.ts';
import { App } from './ui/App.tsx';
import { applyPrefs, readType } from './core/prefs.ts';
import { openPhotoStore } from './core/photos.ts';
import { createPhotoSync, localPhotoMeta } from './core/photosync.ts';
import { Ctx } from './ui/store-context.tsx';

function deviceId(): string {
  try {
    const k = 'brewconsole.device';
    let v = localStorage.getItem(k);
    if (!v) { v = `web-${crypto.randomUUID().slice(0, 8)}`; localStorage.setItem(k, v); }
    return v;
  } catch { return 'web-tijdelijk'; }
}

async function start(): Promise<void> {
  applyPrefs(document.documentElement, readType(localStorage));
  const engine = createEngine();
  const idb = await openIndexedDbStorage();
  const storage = idb ?? memoryStorage();
  if (idb) { try { await navigator.storage?.persist?.(); } catch { /* geen probleem: alleen een verzoek */ } }
  const store = await createStore(storage, engine);
  const env: Env = { now: () => Date.now(), uuid: () => crypto.randomUUID(), device: deviceId() };
  const photoSync = createPhotoSync(await openPhotoStore(), localPhotoMeta(localStorage), () => Date.now());
  const root = document.getElementById('root')!;
  root.textContent = ''; // het opstartplaatje uit index.html maakt plaats voor de app
  render(<Ctx.Provider value={{ store, engine, env, photos: photoSync.store, photoSync: photoSync.run }}><App persistent={storage.persistent} /></Ctx.Provider>, root);
}

function registerWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const announce = (): void => { if (navigator.serviceWorker.controller) dispatchEvent(new CustomEvent('app3:update', { detail: reg })); };
    if (reg.waiting) announce();
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed') announce(); });
    });
  }).catch(() => { /* zonder worker werkt de app gewoon online */ });
  // Herladen alleen bij een vervanging van een bestaande worker (bewuste update), niet bij de allereerste installatie.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloading) { reloading = true; location.reload(); } });
}

void start().then(registerWorker);
