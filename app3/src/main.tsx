import { render } from 'preact';
import { createEngine } from '../../engine3/src/index.ts';
import { memoryStorage, openIndexedDbStorage } from './core/storage.ts';
import { createStore } from './core/store.ts';
import type { Env } from './core/ids.ts';
import { App } from './ui/App.tsx';
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
  const engine = createEngine();
  const idb = await openIndexedDbStorage();
  const storage = idb ?? memoryStorage();
  if (idb) { try { await navigator.storage?.persist?.(); } catch { /* geen probleem: alleen een verzoek */ } }
  const store = await createStore(storage, engine);
  const env: Env = { now: () => Date.now(), uuid: () => crypto.randomUUID(), device: deviceId() };
  render(<Ctx.Provider value={{ store, engine, env }}><App persistent={storage.persistent} /></Ctx.Provider>, document.getElementById('root')!);
}

void start();
