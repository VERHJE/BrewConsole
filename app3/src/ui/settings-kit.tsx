import type { ComponentChildren, JSX } from 'preact';

/** Bouwstenen voor de instelschermen (Water, Voorkeuren, Gegevens, Synchronisatie): een kaart met rond icoon en kop, en een schakelaar. */

export function Panel({ icon, title, sub, tone, children }: { icon: JSX.Element; title: string; sub?: string; tone?: 'danger'; children: ComponentChildren }): JSX.Element {
  return (
    <section class={tone === 'danger' ? 'panel danger' : 'panel'}>
      <div class="phead">
        <span class="ic" aria-hidden="true">{icon}</span>
        <div><h2>{title}</h2>{sub && <p class="meta">{sub}</p>}</div>
      </div>
      {children}
    </section>
  );
}

/** Een aan/uit-regel met een echte checkbox (role=switch), zodat toetsenbord en schermlezer gewoon werken. */
export function Switch({ name, checked, onChange, title, sub }: { name: string; checked: boolean; onChange: (on: boolean) => void; title: string; sub?: string }): JSX.Element {
  return (
    <label class="switchrow">
      <span class="stext"><strong>{title}</strong>{sub && <small>{sub}</small>}</span>
      <input class="switch" type="checkbox" role="switch" name={name} checked={checked} onChange={e => onChange((e.currentTarget as HTMLInputElement).checked)} />
    </label>
  );
}
