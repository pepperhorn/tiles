import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// @ts-expect-error plain ESM helper without types
import scopeCss from './scripts/scope-css.mjs';

// The package name is the single source of truth: it is the npm name, the root CSS class every rule is scoped under,
// and (with the version) what src/meta.ts exposes.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  name: string; version: string; dependencies: Record<string, string>; peerDependencies: Record<string, string>;
};
const externals = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)];

export const define = {
  __PKG_NAME__: JSON.stringify(pkg.name),
  __PKG_VERSION__: JSON.stringify(pkg.version),
};

/**
 * `vite build`: library mode, one ESM entry + one stylesheet (dist/style.css). The component sources live in the app
 * (../../src) and are bundled in; react, react-dom, smplr and the fonts stay external.
 * `vite` (dev): the demo page in demo/ with a real sheet.
 */
export default defineConfig(({ command }) => ({
  root: command === 'serve' ? fileURLToPath(new URL('./demo', import.meta.url)) : undefined,
  base: './',
  plugins: [react(), tailwindcss()],
  define,
  css: { postcss: { plugins: [scopeCss({ root: pkg.name, include: /[\\/]src[\\/]styles\.css$/ })] } },
  server: { host: '0.0.0.0', fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] } },
  build: {
    lib: { entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)), formats: ['es'], fileName: () => 'index.js', cssFileName: 'style' },
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022',
    rollupOptions: { external: (id: string) => externals.some(dep => id === dep || id.startsWith(`${dep}/`)) },
  },
}));
