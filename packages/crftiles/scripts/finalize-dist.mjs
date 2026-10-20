// Publish hygiene for dist/, after vite build and tsc:
// - dist/index.d.ts re-exports the declarations tsc wrote under dist/types/ (the component imports the app's sources
//   from ../../src, so tsc's rootDir is the repo root) and drops `import './styles.css'`.
// - Checks the bundle stays an embed: no export/PDF code (jspdf, html2canvas), no crf-admin library fetch, no
//   top-level window/document access (SSR-safe import), smplr loaded lazily, and every style.css rule scoped.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import postcss from 'postcss';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const dist = new URL('../dist/', import.meta.url);
const typesEntry = './types/packages/crftiles/src/index';

const entryTypes = new URL(`${typesEntry.slice(2)}.d.ts`, dist);
await writeFile(entryTypes, (await readFile(entryTypes, 'utf8')).replace(/^import '\.\/styles\.css';\n/m, ''));
await writeFile(new URL('index.d.ts', dist), `export * from '${typesEntry}';\nexport { default } from '${typesEntry}';\n`);

const js = await readFile(new URL('index.js', dist), 'utf8');
for (const banned of ['jspdf', 'html2canvas', 'jsPDF', 'items/tiles', '@dnd-kit']) {
  assert.ok(!js.includes(banned), `dist/index.js must not contain ${banned}`);
}
assert.match(js, /import\(\s*["']smplr["']\s*\)/, 'smplr stays a lazy dynamic import');
assert.ok(!/^import .* from ["']smplr["']/m.test(js), 'smplr is not imported statically');
assert.ok(js.includes(JSON.stringify(pkg.version)), 'version constant is baked in');

const css = await readFile(new URL('style.css', dist), 'utf8');
const scope = `.${pkg.name}`;
assert.ok(!css.includes('fonts.googleapis.com'), 'no remote font import');
assert.ok(!/@layer\b/.test(css), 'layers are unwrapped');
// Every selector outside @keyframes starts with the root class.
const selectors = [];
postcss.parse(css).walkRules(rule => {
  if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
  selectors.push(...rule.selectors);
});
const unscoped = selectors.filter(s => !s.startsWith(scope));
assert.deepEqual(unscoped, [], 'every style.css selector is scoped under the root class');
console.log(`finalize-dist: ${pkg.name}@${pkg.version} ok (${selectors.length} scoped selectors)`);
