import type { ComponentChildren, JSX } from 'preact';

/** Eén vorm voor alle lege schermen: pictogram, korte kop, uitleg en één actie. `compact` laat het pictogram weg (zoekopdracht zonder resultaat). */
export function EmptyState({ icon, title, children, action, compact = false }: {
  icon?: JSX.Element; title: string; children?: ComponentChildren; action?: { label: string; href: string; primary?: boolean }; compact?: boolean;
}): JSX.Element {
  return (
    <div class={compact ? 'empty compact' : 'empty'} role={compact ? 'status' : undefined}>
      {!compact && icon && <div class="empty-icon" aria-hidden="true">{icon}</div>}
      <p class="empty-title">{title}</p>
      {children && <p class="empty-text">{children}</p>}
      {action && <a class={action.primary === false ? 'btn' : 'btn primary'} href={action.href}>{action.label}</a>}
    </div>
  );
}
