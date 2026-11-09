import { createContext } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import type { Engine } from '../../../engine3/src/index.ts';
import type { Env } from '../core/ids.ts';
import type { Snapshot, Store } from '../core/store.ts';
import { labelTint, monogram, type PhotoStore } from '../core/photos.ts';
import type { PhotoSyncRun } from '../core/photosync.ts';
import type { JSX } from 'preact';

export interface AppContext { readonly store: Store; readonly engine: Engine; readonly env: Env; readonly photos: PhotoStore; /** Foto's meesynchroniseren (alleen in de echte app). */ readonly photoSync?: PhotoSyncRun }

export const Ctx = createContext<AppContext | null>(null);

export function useApp(): AppContext {
  const c = useContext(Ctx);
  if (!c) throw new Error('geen AppContext');
  return c;
}

export function useSnapshot(): Snapshot {
  const { store } = useApp();
  const [snap, setSnap] = useState(store.snapshot());
  useEffect(() => store.subscribe(setSnap), [store]);
  return snap;
}

/** De foto van een zak als object-URL (of null). `bump` ververst na wijzigen. */
export function usePhoto(beanId: string | null, bump = 0): string | null {
  const { photos } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let dead = false; let made: string | null = null;
    setUrl(null);
    if (beanId) void photos.get(beanId).then(b => { if (!dead && b) { made = URL.createObjectURL(b); setUrl(made); } }).catch(() => { /* geen foto */ });
    return () => { dead = true; if (made) URL.revokeObjectURL(made); };
  }, [photos, beanId, bump]);
  return url;
}

/**
 * Foto of, zonder foto, een etiket in tekst: klein een monogram in een omlijst vlak, groot (zakdetail) met brander, naam en herkomst in serif.
 * De tint volgt de naam maar blijft donker en ingetogen; ivoor tekst en een dunne messing lijn.
 */
export function BagArt({ beanId, name, bump = 0, large = false, roaster = null, meta = null }: { beanId: string; name: string; bump?: number; large?: boolean; roaster?: string | null; meta?: string | null }): JSX.Element {
  const url = usePhoto(beanId, bump);
  if (url) return <img class={large ? 'bagart photo large' : 'bagart photo'} src={url} alt="" />;
  const [t1, t2] = labelTint(name);
  const style = `--l1:${t1};--l2:${t2}`;
  if (!large) return <span class="bagart label" style={style} aria-hidden="true"><span class="mono">{monogram(name)}</span></span>;
  return (
    <span class="bagart label large" style={style} aria-hidden="true">
      <span class="l-frame">
        {roaster && <span class="l-roaster">{roaster}</span>}
        <span class="l-rule" />
        <span class="l-name">{name}</span>
        {meta && <span class="l-meta">{meta}</span>}
      </span>
    </span>
  );
}
