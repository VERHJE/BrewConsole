import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import {
  FORM_LABEL, PROCESS_LABEL, ROAST_LABEL, SOURCE_LABEL, editForm, type BeanForm, type FormKey
} from '../core/beans.ts';

interface Props {
  readonly form: BeanForm;
  readonly problems: Readonly<Partial<Record<FormKey, string>>>;
  readonly onChange: (f: BeanForm) => void;
}

/** Altijd zichtbaar: wat nodig is om een zak te herkennen en wat voorraad en versheid aandrijft. */
const MORE_ORIGIN: readonly FormKey[] = ['region', 'farm', 'variety', 'process', 'roastLevel'];
const MORE_TASTE: readonly FormKey[] = ['notes', 'shopUrl'];

/** Optionele velden: dicht zolang ze leeg zijn, open zodra ze iets bevatten (bijvoorbeeld na het herkennen) of een fout hebben. Gaat nooit onder je vingers dicht. */
function Fold({ title, filled, children }: { title: string; filled: boolean; children: ComponentChildren }): JSX.Element {
  const [open, setOpen] = useState(filled);
  useEffect(() => { if (filled) setOpen(true); }, [filled]);
  return (
    <details class="fold card" open={open} onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>{title}</summary>
      {children}
    </details>
  );
}

export function BeanFormView({ form, problems, onChange }: Props): JSX.Element {
  const set = (k: FormKey) => (e: Event): void => onChange(editForm(form, k, (e.currentTarget as HTMLInputElement).value));
  const Label = ({ k }: { k: FormKey }): JSX.Element => {
    const s = form.sources[k];
    return (<span>{FORM_LABEL[k]}{s && <small class={s === 'user' ? 'badge user' : 'badge'}>{SOURCE_LABEL[s]}</small>}</span>);
  };
  /** Staat er in een van deze velden al iets, of is er een fout? Dan hoort de groep open te staan. */
  const used = (keys: readonly FormKey[]): boolean => keys.some(k => form.values[k] !== '' || !!problems[k]);
  const Err = ({ k }: { k: FormKey }): JSX.Element | null => problems[k] ? <div class="err" role="alert">{problems[k]}</div> : null;
  return (
    <div>
      {form.warnings.map(w => <p class="banner" key={w} role="status">{w}</p>)}
      {(['name', 'roaster', 'country'] as const).map(k => (
        <label class="field" key={k}><Label k={k} /><input name={k} value={form.values[k]} onInput={set(k)} autocomplete="off" aria-invalid={problems[k] ? 'true' : undefined} /><Err k={k} /></label>
      ))}
      <label class="field"><Label k="roastDate" /><input name="roastDate" type="date" value={form.values.roastDate} onInput={set('roastDate')} /><Err k="roastDate" /></label>
      <label class="field"><Label k="bagSizeG" /><input name="bagSizeG" inputMode="numeric" value={form.values.bagSizeG} onInput={set('bagSizeG')} /><Err k="bagSizeG" /></label>
      <Fold title="Meer over de herkomst en het proces" filled={used(MORE_ORIGIN)}>
        {(['region', 'farm', 'variety'] as const).map(k => (
          <label class="field" key={k}><Label k={k} /><input name={k} value={form.values[k]} onInput={set(k)} autocomplete="off" /></label>
        ))}
        <label class="field"><Label k="process" />
          <select name="process" value={form.values.process} onChange={set('process')}>
            <option value="">Onbekend</option>
            {(['washed', 'natural', 'honey', 'wet_hulled'] as const).map(p => <option key={p} value={p}>{PROCESS_LABEL[p]}</option>)}
          </select></label>
        <label class="field"><Label k="roastLevel" />
          <select name="roastLevel" value={form.values.roastLevel} onChange={set('roastLevel')}>
            <option value="">Onbekend</option>
            {(Object.keys(ROAST_LABEL) as Array<keyof typeof ROAST_LABEL>).map(r => <option key={r} value={r}>{ROAST_LABEL[r]}</option>)}
          </select></label>
      </Fold>
      <Fold title="Smaaknotities en winkel" filled={used(MORE_TASTE)}>
        <label class="field"><Label k="notes" /><input name="notes" value={form.values.notes} onInput={set('notes')} placeholder="bijv. jasmijn, perzik, zwarte thee" /></label>
        <label class="field"><Label k="shopUrl" /><input name="shopUrl" type="url" inputMode="url" value={form.values.shopUrl} onInput={set('shopUrl')} placeholder="brander.nl/jouw-zak" autocomplete="off" aria-invalid={problems.shopUrl ? 'true' : undefined} /><Err k="shopUrl" /></label>
      </Fold>
    </div>
  );
}
