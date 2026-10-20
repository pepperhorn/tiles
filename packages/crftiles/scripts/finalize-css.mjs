// The fonts stay @fontsource imports in dist/style.css (resolved by the host's bundler) instead of being inlined:
// library mode would otherwise embed every woff2 as base64. Poppins is the UI face, Space Mono the uppercase labels.
import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../dist/style.css', import.meta.url);
const css = await readFile(file, 'utf8');
const fonts = [
  ...[400, 500, 600, 700].map(weight => `@fontsource/poppins/${weight}.css`),
  ...[400, 700].map(weight => `@fontsource/space-mono/${weight}.css`),
];
if (!css.includes(fonts[0])) {
  const charset = css.match(/^@charset "[^"]*";\s*/)?.[0] ?? '';
  const imports = fonts.map(path => `@import "${path}";`).join('\n');
  await writeFile(file, `${charset}${imports}\n${css.slice(charset.length)}`);
}
