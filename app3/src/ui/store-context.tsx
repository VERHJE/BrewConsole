import { createContext } from 'preact';
import { useContext, useEffect, useMemo, useState } from 'preact/hooks';
import type { Engine, RoastLevel } from '../../../engine3/src/index.ts';
import type { Env } from '../core/ids.ts';
import type { Snapshot, Store } from '../core/store.ts';
import { labelContours, labelTint, monogram, ROAST_STEP, type PhotoStore } from '../core/photos.ts';
import { ROAST_LABEL } from '../core/beans.ts';
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

/** Hoogtelijnen als achtergrond van het etiket (vast per naam). */
function Topo({ seed }: { seed: string }): JSX.Element {
  const paths = useMemo(() => labelContours(seed), [seed]);
  return <svg class="l-topo" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" focusable="false">{paths.map((d, i) => <path key={i} d={d} class={i % 4 === 3 ? 'major' : undefined} />)}</svg>;
}

/** Brandingsschaal: vijf boontjes, gevuld tot de graad van deze zak. */
function RoastScale({ level }: { level: RoastLevel }): JSX.Element {
  const step = ROAST_STEP[level];
  return <span class="l-roast"><span class="l-beans">{[1, 2, 3, 4, 5].map(i => <i key={i} class={i <= step ? 'on' : undefined} />)}</span>{ROAST_LABEL[level]}</span>;
}

/**
 * Foto of, zonder foto, een etiket: een donker vlak met hoogtelijnen (vast per naam) en een dunne messing lijn.
 * Klein een monogram in een zegel (op een breed raster met het land eronder), groot (zakdetail) brander, naam,
 * herkomst en een brandingsschaal in serif. Ivoor tekst; alles is decoratief (aria-hidden), de tekst staat ook op het scherm.
 */
export function BagArt({ beanId, name, bump = 0, large = false, roaster = null, meta = null, sub = null, roast = null }: { beanId: string; name: string; bump?: number; large?: boolean; roaster?: string | null; meta?: string | null; sub?: string | null; roast?: RoastLevel | null }): JSX.Element {
  const url = usePhoto(beanId, bump);
  if (url) return <img class={large ? 'bagart photo large' : 'bagart photo'} src={url} alt="" />;
  const [t1, t2] = labelTint(name);
  const style = `--l1:${t1};--l2:${t2}`;
  if (!large) return (
    <span class="bagart label" style={style} aria-hidden="true">
      <Topo seed={name} />
      <span class="l-seal"><span class="mono">{monogram(name)}</span>{sub && <span class="l-sub">{sub}</span>}</span>
    </span>
  );
  return (
    <span class="bagart label large" style={style} aria-hidden="true">
      <Topo seed={name} />
      <span class="l-frame">
        {roaster && <span class="l-roaster">{roaster}</span>}
        <span class="l-rule" />
        <span class="l-name">{name}</span>
        {meta && <span class="l-meta">{meta}</span>}
        {roast && <RoastScale level={roast} />}
      </span>
    </span>
  );
}
