// Typen voor tests/load-app.mjs, zodat engine3 (TypeScript) de huidige app kan laden als nulmeting.
export declare const APP_HTML_PATH: string;
export declare function extractScripts(html: string): string[];
// De app-API is ongetypeerd JavaScript; engine3/eval/adapters.ts legt er zelf een smal type op.
export declare function loadApp(): { api: Record<string, unknown>; [k: string]: unknown };
