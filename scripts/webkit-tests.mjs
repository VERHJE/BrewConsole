// Draait een kleine set schermtests in WebKit, de engine van Safari (review 17 nov 2026, O1, besluit Jelle).
// Dekt verschillen in CSS, CSP en JavaScript; niet wat alleen iOS doet (installeren als app, scherm aan houden, camera).
// In CI is dit een aparte job die een merge niet blokkeert. Lokaal: eerst `npx playwright install --with-deps webkit`.
import { spawnSync } from 'node:child_process';

const SET = [
  'welkom',      // eerste start, met axe
  'csp',         // Content-Security-Policy: geen schendingen, een vreemd script wordt tegengehouden
  'zetten',      // advies, de hele stroom tot de timer klaar is, herladen midden in een zetsel
  'proeven',     // timer tot het eind, proeven en opslaan
  'foto',        // zakfoto kiezen, in de back-up en terugzetten
  'pwa',         // service worker: offline starten
  'woordbreuk'   // geen woord midden in afgebroken, geen overloop
];

const r = spawnSync(process.execPath, ['--test', ...SET.map(f => `app3/test/${f}.ui.test.mjs`)], {
  stdio: 'inherit',
  env: { ...process.env, BC_BROWSER: 'webkit' }
});
process.exit(r.status ?? 1);
