import type { JSX } from 'preact';

const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': true } as const;

export const IconBrew = (): JSX.Element => (<svg {...base}><path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" /><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" /><path d="M9 3v3M12 3v3" /></svg>);
export const IconBean = (): JSX.Element => (<svg {...base}><path d="M12 3c-4.5 0-8 3.6-8 8.5S7.5 21 12 21s8-4.6 8-9.5S16.5 3 12 3z" /><path d="M9 5c4 2 2 6 4 8s2 4 1 7" /></svg>);
export const IconLog = (): JSX.Element => (<svg {...base}><path d="M5 4h14v16H5z" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>);
export const IconMore = (): JSX.Element => (<svg {...base}><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></svg>);

/** Lijnillustratie voor de welkomstkaart: een kop met stoom. */
export const CupSteam = (): JSX.Element => (
  <svg viewBox="0 0 120 96" width="120" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M38 14c-6 8 6 12 0 20M58 8c-6 8 6 12 0 20M78 14c-6 8 6 12 0 20" class="steam" />
    <path d="M24 46h60v18a24 24 0 0 1-24 24h-12a24 24 0 0 1-24-24z" />
    <path d="M84 52h6a10 10 0 0 1 0 20h-8" />
    <path d="M14 92h80" />
  </svg>
);
