import type { JSX } from 'preact';

const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': true } as const;

export const IconBrew = (): JSX.Element => (<svg {...base}><path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" /><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" /><path d="M9 3v3M12 3v3" /></svg>);
export const IconBean = (): JSX.Element => (<svg {...base}><path d="M12 3c-4.5 0-8 3.6-8 8.5S7.5 21 12 21s8-4.6 8-9.5S16.5 3 12 3z" /><path d="M9 5c4 2 2 6 4 8s2 4 1 7" /></svg>);
export const IconLog = (): JSX.Element => (<svg {...base}><path d="M5 4h14v16H5z" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>);
export const IconMore = (): JSX.Element => (<svg {...base}><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></svg>);
