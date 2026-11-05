// Bouwt app3 naar <doel>/app3/ (standaard dist/app3/): app.js, app.css, index.html.
// Gebruik: node scripts/build-app3.mjs [doelmap]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(path.resolve(process.argv[2] ?? path.join(ROOT, 'dist')), 'app3');

fs.mkdirSync(OUT, { recursive: true });
await build({
  entryPoints: [path.join(ROOT, 'app3/src/main.tsx')],
  outfile: path.join(OUT, 'app.js'),
  bundle: true, format: 'esm', target: 'es2022', platform: 'browser', minify: true, legalComments: 'none',
  jsx: 'automatic', jsxImportSource: 'preact', logLevel: 'warning'
});
const css = ['tokens.css', 'base.css'].map(f => fs.readFileSync(path.join(ROOT, 'app3/styles', f), 'utf8')).join('\n');
fs.writeFileSync(path.join(OUT, 'app.css'), css);
fs.copyFileSync(path.join(ROOT, 'app3/index.html'), path.join(OUT, 'index.html'));
console.log(`app3 gebouwd in ${path.relative(ROOT, OUT)}`);
