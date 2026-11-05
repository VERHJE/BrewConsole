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

function useHash(): string {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = (): void => setHash(location.hash);
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export function App({ persistent }: { persistent: boolean }): JSX.Element {
  const route = parseRoute(useHash());
  useSnapshot(); // herteken bij elke wijziging van het logboek
  const screen = route.tab === 'zakken' ? <Zakken route={route} />
    : route.tab === 'logboek' ? <Logboek route={route} />
    : route.tab === 'meer' ? <Meer route={route} />
    : <Zetten route={route} />;
  return (
    <div class="app">
      {!route.focused && (
        <nav class="tabbar" aria-label="Hoofdmenu">
          {(Object.keys(TAB_LABEL) as Tab[]).map(t => {
            const Icon = TAB_ICON[t];
            return (<a key={t} href={href(t)} aria-current={route.tab === t ? 'page' : undefined}><Icon />{TAB_LABEL[t]}</a>);
          })}
        </nav>
      )}
      <main class={route.focused ? 'main focused' : 'main'} id="main">
        {!persistent && <p class="banner warn" role="status">Opslag in dit venster is tijdelijk: je gegevens verdwijnen als je de pagina sluit. Open de app buiten een privévenster.</p>}
        {screen}
      </main>
    </div>
  );
}
