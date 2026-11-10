import type { JSX } from 'preact';

const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': true } as const;

export const IconBrew = (): JSX.Element => (<svg {...base}><path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" /><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" /><path d="M9 3v3M12 3v3" /></svg>);
export const IconBean = (): JSX.Element => (<svg {...base}><path d="M12 3c-4.5 0-8 3.6-8 8.5S7.5 21 12 21s8-4.6 8-9.5S16.5 3 12 3z" /><path d="M9 5c4 2 2 6 4 8s2 4 1 7" /></svg>);
export const IconLog = (): JSX.Element => (<svg {...base}><path d="M5 4h14v16H5z" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>);
export const IconMore = (): JSX.Element => (<svg {...base}><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></svg>);

export const IconFilter = (): JSX.Element => (<svg {...base}><path d="M4 6h16M7 12h10M10 18h4" /></svg>);

/** Lijnillustratie voor de welkomstkaart: een kop met stoom. */
export const CupSteam = (): JSX.Element => (
  <svg viewBox="0 0 120 96" width="120" height="96" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M38 14c-6 8 6 12 0 20M58 8c-6 8 6 12 0 20M78 14c-6 8 6 12 0 20" class="steam" />
    <path d="M24 46h60v18a24 24 0 0 1-24 24h-12a24 24 0 0 1-24-24z" />
    <path d="M84 52h6a10 10 0 0 1 0 20h-8" />
    <path d="M14 92h80" />
  </svg>
);
// Iconen voor Meer: eenvoudige lijnen in dezelfde stijl.
export const IconTaste = (): JSX.Element => (<svg {...base}><path d="M12 3.5l2.5 5.2 5.6.8-4.1 3.9 1 5.6L12 16.3 7 19l1-5.6-4.1-3.9 5.6-.8z" /></svg>);
export const IconGrind = (): JSX.Element => (<svg {...base}><path d="M7 9h10l-1.2 11H8.2z" /><path d="M6 9h12" /><path d="M12 9V5h5" /><circle cx="18.5" cy="5" r="1.3" /></svg>);
export const IconDrop = (): JSX.Element => (<svg {...base}><path d="M12 3.5c3 3.8 6 7.2 6 10.5a6 6 0 0 1-12 0c0-3.3 3-6.7 6-10.5z" /></svg>);
export const IconSliders = (): JSX.Element => (<svg {...base}><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></svg>);
export const IconArchive = (): JSX.Element => (<svg {...base}><path d="M4 5h16v4H4z" /><path d="M5 9v10h14V9" /><path d="M10 13h4" /></svg>);
export const IconSync = (): JSX.Element => (<svg {...base}><path d="M19 8a7 7 0 0 0-12.5-2L5 7.5" /><path d="M5 3.5v4h4" /><path d="M5 16a7 7 0 0 0 12.5 2l1.5-1.5" /><path d="M19 20.5v-4h-4" /></svg>);
export const IconInfo = (): JSX.Element => (<svg {...base}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><path d="M12 7.6v.2" /></svg>);
