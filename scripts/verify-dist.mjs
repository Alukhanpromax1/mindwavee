// Runs after `vite build`. Fails the build loudly (instead of letting the host report a
// missing output folder later) if dist/ was not produced where Vercel expects it.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const fail = (msg) => {
  console.error(`\n✗ verify-dist: ${msg}\n  expected output directory: ${DIST}\n  working directory: ${process.cwd()}\n`);
  process.exit(1);
};

if (!existsSync(DIST)) fail('dist/ was not created by the build.');
const index = join(DIST, 'index.html');
if (!existsSync(index)) fail('dist/index.html is missing.');
const html = readFileSync(index, 'utf8');
if (/src\/main\.js/.test(html)) fail('dist/index.html still points at /src/main.js — the Vite build did not run.');
const scripts = [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+)"/g)].map((m) => m[1]);
if (!scripts.some((s) => s.endsWith('.js'))) fail('dist/index.html does not reference a bundled script.');
for (const s of scripts) if (!existsSync(join(DIST, s))) fail(`dist/index.html references a missing file: ${s}`);

let files = 0;
let bytes = 0;
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else {
      files++;
      bytes += st.size;
    }
  }
};
walk(DIST);
console.log(`✓ verify-dist: ${files} files, ${(bytes / 1024 / 1024).toFixed(2)} MB in ${DIST}`);
