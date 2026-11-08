import type { JSX } from 'preact';
import {
  FORM_LABEL, PROCESS_LABEL, ROAST_LABEL, SOURCE_LABEL, editForm, type BeanForm, type FormKey
} from '../core/beans.ts';

interface Props {
  readonly form: BeanForm;
  readonly problems: Readonly<Partial<Record<FormKey, string>>>;
  readonly onChange: (f: BeanForm) => void;
}

const TEXT_KEYS: readonly FormKey[] = ['name', 'roaster', 'country', 'region', 'farm', 'variety'];

export function BeanFormView({ form, problems, onChange }: Props): JSX.Element {
  const set = (k: FormKey) => (e: Event): void => onChange(editForm(form, k, (e.currentTarget as HTMLInputElement).value));
  const Label = ({ k }: { k: FormKey }): JSX.Element => {
    const s = form.sources[k];
    return (<span>{FORM_LABEL[k]}{s && <small class={s === 'user' ? 'badge user' : 'badge'}>{SOURCE_LABEL[s]}</small>}</span>);
  };
  const Err = ({ k }: { k: FormKey }): JSX.Element | null => problems[k] ? <div class="err" role="alert">{problems[k]}</div> : null;
  return (
    <div>
      {form.warnings.map(w => <p class="banner" key={w} role="status">{w}</p>)}
      {TEXT_KEYS.map(k => (
        <label class="field" key={k}><Label k={k} /><input name={k} value={form.values[k]} onInput={set(k)} autocomplete="off" aria-invalid={problems[k] ? 'true' : undefined} /><Err k={k} /></label>
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
      <label class="field"><Label k="roastDate" /><input name="roastDate" type="date" value={form.values.roastDate} onInput={set('roastDate')} /><Err k="roastDate" /></label>
      <label class="field"><Label k="bagSizeG" /><input name="bagSizeG" inputMode="numeric" value={form.values.bagSizeG} onInput={set('bagSizeG')} /><Err k="bagSizeG" /></label>
      <label class="field"><Label k="shopUrl" /><input name="shopUrl" type="url" inputMode="url" value={form.values.shopUrl} onInput={set('shopUrl')} placeholder="brander.nl/jouw-zak" autocomplete="off" aria-invalid={problems.shopUrl ? 'true' : undefined} /><Err k="shopUrl" /></label>
      <label class="field"><Label k="notes" /><input name="notes" value={form.values.notes} onInput={set('notes')} placeholder="bijv. jasmijn, perzik, zwarte thee" /></label>
    </div>
  );
}
