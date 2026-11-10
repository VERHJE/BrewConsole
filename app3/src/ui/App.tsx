import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { parseRoute, href, type Tab } from '../core/router.ts';
import { IconBean, IconBrew, IconLog, IconMore } from './icons.tsx';
import { useSnapshot } from './store-context.tsx';
import { Zetten } from './screens/Zetten.tsx';
import { Zakken } from './screens/Zakken.tsx';
import { Logboek } from './screens/Logboek.tsx';
import { Meer } from './screens/Meer.tsx';

const TAB_LABEL: Record<Tab, string> = { zetten: 'Zetten', zakken: 'Zakken', logboek: 'Logboek', meer: 'Meer' };
const TAB_ICON: Record<Tab, () => JSX.Element> = { zetten: IconBrew, zakken: IconBean, logboek: IconLog, meer: IconMore };

/** Het eerste deel van de route (tab of scherm): alleen bij een ander scherm een overgang, niet bij elke kleine wijziging. */
const screenOf = (h: string): string => h.replace(/^#\/?/, '').split('/').slice(0, 2).join('/');

const hashRef = { current: location.hash };

function useHash(): string {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = (): void => {
      const next = location.hash;
      type VT = { ready?: Promise<unknown>; finished?: Promise<unknown>; updateCallbackDone?: Promise<unknown> };
      const doc = document as Document & { startViewTransition?: (cb: () => Promise<void>) => VT };
      // Zachte overgang tussen schermen (View Transitions, waar de browser die kent; uit bij "verminder beweging").
      const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (doc.startViewTransition && !calm && screenOf(next) !== screenOf(hashRef.current)) {
        hashRef.current = next;
        const vt = doc.startViewTransition(() => new Promise<void>(resolve => { setHash(next); setTimeout(resolve, 0); }));
        // Een overgang die de browser overslaat (snel opnieuw navigeren, tabblad op de achtergrond) wijst deze beloftes af;
        // het scherm zelf wisselt dan gewoon. Opvangen, anders is het een onafgehandelde fout.
        const quiet = (): void => {};
        vt?.ready?.catch(quiet); vt?.finished?.catch(quiet); vt?.updateCallbackDone?.catch(quiet);
      } else { hashRef.current = next; setHash(next); }
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return hash;
}

function useUpdate(): ServiceWorkerRegistration | null {
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null);
  useEffect(() => {
    const on = (e: Event): void => setReg((e as CustomEvent<ServiceWorkerRegistration>).detail);
    addEventListener('app3:update', on);
    return () => removeEventListener('app3:update', on);
  }, []);
  return reg;
}

export function App({ persistent }: { persistent: boolean }): JSX.Element {
  const route = parseRoute(useHash());
  const update = useUpdate();
  useSnapshot(); // herteken bij elke wijziging van het logboek
  const screen = route.tab === 'zakken' ? <Zakken route={route} />
    : route.tab === 'logboek' ? <Logboek route={route} />
    : route.tab === 'meer' ? <Meer route={route} />
    : <Zetten route={route} />;
  return (
    <div class="app">
      {!route.focused && (
        <nav class="tabbar" aria-label="Hoofdmenu">
          <span class="brandmark" aria-hidden="true">Brew<br />Console</span>
          {(Object.keys(TAB_LABEL) as Tab[]).map(t => {
            const Icon = TAB_ICON[t];
            return (<a key={t} href={href(t)} aria-current={route.tab === t ? 'page' : undefined}><Icon />{TAB_LABEL[t]}</a>);
          })}
        </nav>
      )}
      <main class={route.focused ? 'main focused' : 'main'} id="main">
        {!persistent && <p class="banner warn" role="status">Opslag in dit venster is tijdelijk: je gegevens verdwijnen als je de pagina sluit. Open de app buiten een privévenster.</p>}
        {update && !route.focused && (
          <p class="banner" role="status">Er is een nieuwe versie. <button class="btn" type="button" onClick={() => update.waiting?.postMessage('activate')}>Vernieuwen</button></p>
        )}
        {screen}
      </main>
    </div>
  );
}
