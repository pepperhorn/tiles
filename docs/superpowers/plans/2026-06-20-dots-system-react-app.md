# Dots System React App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `latest-note-tile-sheets.html` demo as a React app that keeps the full tile generator and adds a flowing Sheet Designer for composing song pages out of note-tiles.

**Architecture:** Vite + React + TypeScript + Tailwind app with two tab-switched modes sharing a pure core (`notes`, `geometry`, `sheetModel`, `storage`) and a shared `Tile` component + export layer. All layout/model/keyboard logic lives in framework-free modules and is unit-tested; React components are thin views over that core.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), `@fontsource/poppins`, jsPDF, html2canvas, Vitest, @testing-library/react, jsdom.

## Global Constraints

- Primary font is **Poppins**; load via `@fontsource/poppins`.
- Every JSX element carries a **semantic contextual class name** alongside Tailwind utilities (e.g. `className="tile-note flex ..."`).
- Note letters/glyphs over a colored dot use the house note-text style: `text-anchor:middle; dominant-baseline:central; fill:#fff; font-family:Poppins; font-weight:600; stroke:rgba(0,0,0,.35); stroke-width:3; paint-order:stroke` (CSS equivalent for HTML tiles: white text + dark text-shadow, already used in the demo).
- The 12-note CRF palette is ported **verbatim** (ids, glyphs, hex) from the demo.
- Dev server binds `--host 0.0.0.0`.
- TDD: write the failing test first, watch it fail, implement minimally, watch it pass, commit. Frequent commits. DRY, YAGNI.
- Work happens on branch `dots-react-app`.

---

### Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `vitest.config.ts`, `src/test/setup.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: a running Vite app; `App` default export renders a tab shell with two buttons labelled `Tile Generator` and `Sheet Designer`; `npm test` runs Vitest in jsdom.

- [ ] **Step 1: Initialize package and install deps**

Run:
```bash
npm create vite@latest . -- --template react-ts
npm install
npm install @tailwindcss/vite tailwindcss @fontsource/poppins jspdf html2canvas
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```
Expected: `node_modules/` populated, no errors. (If `npm create` refuses because the dir is non-empty, run it in a temp dir and copy files in, preserving `docs/` and `latest-note-tile-sheets.html`.)

- [ ] **Step 2: Configure Vite + Tailwind + Vitest**

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '0.0.0.0' },
});
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts' },
});
```

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

`src/index.css` (replace contents):
```css
@import 'tailwindcss';
@import '@fontsource/poppins/400.css';
@import '@fontsource/poppins/500.css';
@import '@fontsource/poppins/600.css';
@import '@fontsource/poppins/700.css';

:root { font-family: Poppins, system-ui, sans-serif; }
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, and `"dev": "vite --host 0.0.0.0"`.

- [ ] **Step 3: Write the failing test**

`src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders both mode tabs', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /tile generator/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /sheet designer/i })).toBeInTheDocument();
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL (default Vite `App` has no such buttons).

- [ ] **Step 5: Minimal App shell**

`src/App.tsx`:
```tsx
import { useState } from 'react';

type Mode = 'generator' | 'designer';

export default function App() {
  const [mode, setMode] = useState<Mode>('generator');
  return (
    <div className="app-shell min-h-screen bg-slate-100 text-slate-900">
      <nav className="app-tabs flex gap-1 border-b border-slate-200 bg-white px-4 py-2">
        <button
          className={`tab-generator rounded-lg px-4 py-2 text-sm font-semibold ${mode === 'generator' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
          aria-pressed={mode === 'generator'}
          onClick={() => setMode('generator')}
        >Tile Generator</button>
        <button
          className={`tab-designer rounded-lg px-4 py-2 text-sm font-semibold ${mode === 'designer' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
          aria-pressed={mode === 'designer'}
          onClick={() => setMode('designer')}
        >Sheet Designer</button>
      </nav>
      <main className="app-body">
        {mode === 'generator' ? <div className="generator-placeholder p-8">Generator</div>
                              : <div className="designer-placeholder p-8">Designer</div>}
      </main>
    </div>
  );
}
```
Ensure `src/main.tsx` imports `./index.css` and renders `<App />`.

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite+React+TS+Tailwind app with tab shell"
```

---

### Task 2: Note & symbol palette (`src/notes.ts`)

**Files:**
- Create: `src/notes.ts`
- Test: `src/notes.test.ts`

**Interfaces:**
- Produces:
  - `type Note = { id: string; main: string; sub: string; hex: string }`
  - `type Sym = { id: 'arrowUp' | 'arrowDown'; glyph: '↑' | '↓'; hex: string }`
  - `const NOTES: Note[]` (12 notes, verbatim)
  - `const SYMBOLS: Sym[]`
  - `const CHROMATIC: string[]` — note ids in semitone order
  - `noteById(id: string): Note | undefined`
  - `semitone(id: string, delta: number): string` — returns the note id `delta` semitones away (wraps mod 12)

- [ ] **Step 1: Write the failing test**

`src/notes.test.ts`:
```ts
import { NOTES, SYMBOLS, semitone, noteById } from './notes';

test('palette has 12 notes ported verbatim', () => {
  expect(NOTES).toHaveLength(12);
  expect(noteById('C')!.hex).toBe('#f86e6e');
  expect(noteById('G')!.hex).toBe('#6bc6a0');
  expect(noteById('Cs')!.main).toBe('C♯');
});

test('symbols are the two direction arrows', () => {
  expect(SYMBOLS.map(s => s.id)).toEqual(['arrowUp', 'arrowDown']);
});

test('semitone shifts up and down with wraparound', () => {
  expect(semitone('C', 1)).toBe('Cs');   // sharpen
  expect(semitone('C', -1)).toBe('B');   // flatten wraps
  expect(semitone('A', 1)).toBe('Bb');   // A# == Bb in this palette
  expect(semitone('B', 1)).toBe('C');    // wraps up
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/notes.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/notes.ts`**

```ts
export type Note = { id: string; main: string; sub: string; hex: string };
export type Sym = { id: 'arrowUp' | 'arrowDown'; glyph: '↑' | '↓'; hex: string };

export const NOTES: Note[] = [
  { id: 'C',  main: 'C',        sub: '',        hex: '#f86e6e' },
  { id: 'Cs', main: 'C♯',  sub: 'D♭', hex: '#f58841' },
  { id: 'D',  main: 'D',        sub: '',        hex: '#ffbc57' },
  { id: 'Ds', main: 'D♯',  sub: 'E♭', hex: '#b8a334' },
  { id: 'E',  main: 'E',        sub: '',        hex: '#fff56d' },
  { id: 'F',  main: 'F',        sub: '',        hex: '#b3f888' },
  { id: 'Fs', main: 'F♯',  sub: 'G♭', hex: '#93d154' },
  { id: 'G',  main: 'G',        sub: '',        hex: '#6bc6a0' },
  { id: 'Gs', main: 'G♯',  sub: 'A♭', hex: '#7ee8df' },
  { id: 'A',  main: 'A',        sub: '',        hex: '#88a7f8' },
  { id: 'Bb', main: 'B♭',  sub: '',        hex: '#cc97e8' },
  { id: 'B',  main: 'B',        sub: '',        hex: '#e277b1' },
];

export const SYMBOLS: Sym[] = [
  { id: 'arrowUp',   glyph: '↑', hex: '#64748b' },
  { id: 'arrowDown', glyph: '↓', hex: '#64748b' },
];

// Chromatic order (semitone steps) for sharpen/flatten.
export const CHROMATIC = NOTES.map(n => n.id);

const byId = new Map(NOTES.map(n => [n.id, n]));
export function noteById(id: string): Note | undefined { return byId.get(id); }

export function semitone(id: string, delta: number): string {
  const i = CHROMATIC.indexOf(id);
  if (i < 0) return id;
  const n = CHROMATIC.length;
  return CHROMATIC[((i + delta) % n + n) % n];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/notes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/notes.ts src/notes.test.ts
git commit -m "feat: add note palette, symbols, and semitone helper"
```

---

### Task 3: Page geometry (`src/geometry.ts`)

**Files:**
- Create: `src/geometry.ts`
- Test: `src/geometry.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Paper = 'A4' | 'A3' | 'Letter' | 'Legal'`
  - `type Orient = 'portrait' | 'landscape'`
  - `type TilesPerRow = 'auto' | number`
  - `const MM: number`, `const PAD: number` (page margin px), `const PAPERS`
  - `pageBox(paper, orient): { w: number; h: number }` (px)
  - `sheetDimsMm(paper, orient): { w: string; h: string }` (e.g. `'210mm'`)
  - `autoCols(size, gap, pageW): number`
  - `resolveCols(tpr, size, gap, pageW): number`
  - `rowsPerPage(size, gap, pageH): number`
  - `cssPageName(paper): string`

- [ ] **Step 1: Write the failing test**

`src/geometry.test.ts`:
```ts
import { pageBox, autoCols, resolveCols, rowsPerPage, sheetDimsMm, cssPageName } from './geometry';

test('A4 portrait page box matches demo geometry', () => {
  const { w, h } = pageBox('A4', 'portrait');
  expect(Math.round(w)).toBe(794);   // 210mm @96dpi
  expect(Math.round(h)).toBe(1123);  // 297mm @96dpi
});

test('autoCols matches demo: MD 80px tiles, 4px gap on A4 portrait', () => {
  const { w } = pageBox('A4', 'portrait');
  expect(autoCols(80, 4, w)).toBe(9);
});

test('resolveCols honors a fixed tiles-per-row, else auto', () => {
  const { w } = pageBox('A4', 'portrait');
  expect(resolveCols(5, 80, 4, w)).toBe(5);
  expect(resolveCols('auto', 80, 4, w)).toBe(autoCols(80, 4, w));
  expect(resolveCols(0, 80, 4, w)).toBe(1); // never below 1
});

test('rowsPerPage is at least 1', () => {
  const { h } = pageBox('A4', 'portrait');
  expect(rowsPerPage(80, 4, h)).toBeGreaterThanOrEqual(1);
});

test('sheet dims and css page name', () => {
  expect(sheetDimsMm('A4', 'landscape')).toEqual({ w: '297mm', h: '210mm' });
  expect(cssPageName('Letter')).toBe('letter');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/geometry.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/geometry.ts`** (ported from demo math)

```ts
export type Paper = 'A4' | 'A3' | 'Letter' | 'Legal';
export type Orient = 'portrait' | 'landscape';
export type TilesPerRow = 'auto' | number;

export const MM = 96 / 25.4;      // px per mm @96dpi
export const PAD = 8 * MM;        // page margin, matches demo --pad

export const PAPERS: Record<Paper, { short: number; long: number }> = {
  A4:     { short: 210,   long: 297 },
  A3:     { short: 297,   long: 420 },
  Letter: { short: 215.9, long: 279.4 },
  Legal:  { short: 215.9, long: 355.6 },
};

const CSS_PAGE: Record<Paper, string> = { A4: 'A4', A3: 'A3', Letter: 'letter', Legal: 'legal' };
export function cssPageName(paper: Paper): string { return CSS_PAGE[paper]; }

export function pageBox(paper: Paper, orient: Orient): { w: number; h: number } {
  const p = PAPERS[paper];
  return orient === 'landscape'
    ? { w: p.long * MM,  h: p.short * MM }
    : { w: p.short * MM, h: p.long * MM };
}

export function sheetDimsMm(paper: Paper, orient: Orient): { w: string; h: string } {
  const p = PAPERS[paper];
  const w = orient === 'landscape' ? p.long  : p.short;
  const h = orient === 'landscape' ? p.short : p.long;
  return { w: `${w}mm`, h: `${h}mm` };
}

export function autoCols(size: number, gap: number, pageW: number): number {
  const inner = pageW - PAD * 2;
  return Math.max(1, Math.floor((inner + gap) / (size + gap)));
}

export function resolveCols(tpr: TilesPerRow, size: number, gap: number, pageW: number): number {
  if (tpr === 'auto') return autoCols(size, gap, pageW);
  return Math.max(1, Math.floor(tpr));
}

export function rowsPerPage(size: number, gap: number, pageH: number): number {
  const inner = pageH - PAD * 2;
  return Math.max(1, Math.floor((inner + gap) / (size + gap)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/geometry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/geometry.ts src/geometry.test.ts
git commit -m "feat: add pure page geometry with tiles-per-row resolution"
```

---

### Task 4: Shared Tile component (`src/Tile.tsx`)

**Files:**
- Create: `src/Tile.tsx`
- Test: `src/Tile.test.tsx`

**Interfaces:**
- Consumes: `Note`, `Sym` from `notes.ts`.
- Produces: `Tile` component.
  ```ts
  type TileProps =
    | { kind: 'note'; note: Note; size: number; onClick?: () => void }
    | { kind: 'arrow'; sym: Sym; size: number; onClick?: () => void };
  ```
  Renders a square colored tile; note tiles show `main` (and `sub` if present), arrow tiles show the glyph. White text with dark shadow (house style).

- [ ] **Step 1: Write the failing test**

`src/Tile.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { Tile } from './Tile';
import { noteById, SYMBOLS } from './notes';

test('note tile shows main and sub glyphs and the note color', () => {
  render(<Tile kind="note" note={noteById('Cs')!} size={80} />);
  expect(screen.getByText('C♯')).toBeInTheDocument();
  expect(screen.getByText('D♭')).toBeInTheDocument();
});

test('arrow tile shows its glyph', () => {
  render(<Tile kind="arrow" sym={SYMBOLS[0]} size={80} />);
  expect(screen.getByText('↑')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/Tile.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/Tile.tsx`**

```tsx
import type { Note, Sym } from './notes';

type TileProps =
  | { kind: 'note'; note: Note; size: number; onClick?: () => void }
  | { kind: 'arrow'; sym: Sym; size: number; onClick?: () => void };

const shadow = { textShadow: '0 1px 0 rgba(0,0,0,.22), 0 2px 4px rgba(0,0,0,.38)' } as const;

export function Tile(props: TileProps) {
  const { size, onClick } = props;
  const bg = props.kind === 'note' ? props.note.hex : props.sym.hex;
  const main = props.kind === 'note' ? props.note.main : props.sym.glyph;
  const sub = props.kind === 'note' ? props.note.sub : '';
  return (
    <div
      className="tile flex flex-col items-center justify-center text-white leading-none text-center select-none"
      style={{ width: size, height: size, background: bg, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="tile-main font-bold" style={{ ...shadow, fontSize: size * (sub ? 0.4 : 0.46) }}>{main}</div>
      {sub && (
        <div className="tile-sub font-semibold opacity-90" style={{ ...shadow, fontSize: size * 0.22, marginTop: '.12em' }}>{sub}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/Tile.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/Tile.tsx src/Tile.test.tsx
git commit -m "feat: add shared Tile component for notes and arrows"
```

---

### Task 5: Persistence (`src/storage.ts`)

**Files:**
- Create: `src/storage.ts`
- Test: `src/storage.test.ts`

**Interfaces:**
- Produces a generic, namespaced store factory:
  ```ts
  type Store<T> = {
    list(): string[];
    save(name: string, value: T): boolean;
    load(name: string): T | undefined;
    remove(name: string): boolean;
  };
  function createStore<T>(key: string): Store<T>;
  const templateStore: Store<unknown>;   // key 'crf_note_tiles_templates_v1' (preserves demo key)
  const designStore: Store<unknown>;     // key 'crf_sheet_designs_v1'
  ```
  All methods swallow storage exceptions and return `false`/`undefined` on failure.

- [ ] **Step 1: Write the failing test**

`src/storage.test.ts`:
```ts
import { createStore } from './storage';

beforeEach(() => localStorage.clear());

test('save/load/list/remove round-trip', () => {
  const s = createStore<{ a: number }>('test_key_v1');
  expect(s.list()).toEqual([]);
  expect(s.save('one', { a: 1 })).toBe(true);
  expect(s.load('one')).toEqual({ a: 1 });
  expect(s.list()).toEqual(['one']);
  expect(s.remove('one')).toBe(true);
  expect(s.load('one')).toBeUndefined();
});

test('load of missing name is undefined', () => {
  const s = createStore('test_key_v1');
  expect(s.load('nope')).toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/storage.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/storage.ts`**

```ts
export type Store<T> = {
  list(): string[];
  save(name: string, value: T): boolean;
  load(name: string): T | undefined;
  remove(name: string): boolean;
};

export function createStore<T>(key: string): Store<T> {
  const readAll = (): Record<string, T> => {
    try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; }
    catch { return {}; }
  };
  const writeAll = (obj: Record<string, T>): boolean => {
    try { localStorage.setItem(key, JSON.stringify(obj)); return true; }
    catch { return false; }
  };
  return {
    list: () => Object.keys(readAll()).sort((a, b) => a.localeCompare(b)),
    save: (name, value) => { const all = readAll(); all[name] = value; return writeAll(all); },
    load: (name) => readAll()[name],
    remove: (name) => { const all = readAll(); delete all[name]; return writeAll(all); },
  };
}

export const templateStore = createStore('crf_note_tiles_templates_v1');
export const designStore = createStore('crf_sheet_designs_v1');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage.ts src/storage.test.ts
git commit -m "feat: add namespaced localStorage stores"
```

---

### Task 6: Export layer (`src/export/`)

**Files:**
- Create: `src/export/raster.ts`, `src/export/pdf.ts`, `src/export/print.css`
- Test: `src/export/raster.test.ts`

**Interfaces:**
- Consumes: `Paper`, `Orient` from `geometry.ts`.
- Produces:
  - `raster.ts`: `blobFromElement(el: HTMLElement, type: 'image/png' | 'image/webp'): Promise<Blob>`, `downloadBlob(blob: Blob, filename: string): void`, `exportRaster(el, type, filename): Promise<void>`
  - `pdf.ts`: `exportPdf(sheets: HTMLElement[], paper: Paper, orient: Orient, filename: string): Promise<void>` (ported from demo `downloadPDF`)
  - `print.css`: print rules ported from the demo `@media print` block, imported by `App`.

- [ ] **Step 1: Write the failing test** (filename helper is the pure, testable seam)

`src/export/raster.test.ts`:
```ts
import { extFor } from './raster';

test('extFor maps mime types to extensions', () => {
  expect(extFor('image/png')).toBe('png');
  expect(extFor('image/webp')).toBe('webp');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/export/raster.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/export/raster.ts`**

```ts
import html2canvas from 'html2canvas';

export type RasterType = 'image/png' | 'image/webp';

export function extFor(type: RasterType): string {
  return type === 'image/webp' ? 'webp' : 'png';
}

async function canvasOf(el: HTMLElement): Promise<HTMLCanvasElement> {
  if (document.fonts?.ready) await document.fonts.ready;
  const shadow = el.style.boxShadow;
  el.style.boxShadow = 'none';
  try {
    return await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
  } finally {
    el.style.boxShadow = shadow;
  }
}

export async function blobFromElement(el: HTMLElement, type: RasterType): Promise<Blob> {
  const canvas = await canvasOf(el);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, 0.95));
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export async function exportRaster(el: HTMLElement, type: RasterType, baseName: string): Promise<void> {
  const blob = await blobFromElement(el, type);
  downloadBlob(blob, `${baseName}.${extFor(type)}`);
}
```

- [ ] **Step 4: Implement `src/export/pdf.ts`** (port of demo `downloadPDF`)

```ts
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { Paper, Orient } from '../geometry';

export async function exportPdf(sheets: HTMLElement[], paper: Paper, orient: Orient, filename: string): Promise<void> {
  if (sheets.length === 0) return;
  if (document.fonts?.ready) await document.fonts.ready;
  const fmt = paper.toLowerCase();
  const doc = new jsPDF({ orientation: orient, unit: 'mm', format: fmt });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let i = 0; i < sheets.length; i++) {
    const el = sheets[i];
    const shadow = el.style.boxShadow; el.style.boxShadow = 'none';
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    el.style.boxShadow = shadow;
    let w = pageW, h = pageW * (canvas.height / canvas.width);
    if (h > pageH + 0.5) { h = pageH; w = pageH * (canvas.width / canvas.height); }
    if (i > 0) doc.addPage(fmt, orient);
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h, undefined, 'FAST');
  }
  doc.save(`${filename}.pdf`);
}
```

- [ ] **Step 5: Implement `src/export/print.css`** (ported from demo)

```css
@media print {
  .no-print { display: none !important; }
  .app-body { padding: 0; }
  .sheet { box-shadow: none !important; margin: 0 auto !important; page-break-after: always; break-after: page; }
  .sheet:last-child { page-break-after: auto; break-after: auto; }
  body { background: #fff; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```
Import it in `src/main.tsx` (`import './export/print.css'`).

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- src/export/raster.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/export
git commit -m "feat: add raster (png/webp), pdf, and print export layer"
```

---

### Task 7: Generator state hook (`src/generator/useGeneratorState.ts`)

**Files:**
- Create: `src/generator/useGeneratorState.ts`, `src/generator/buildSheets.ts`
- Test: `src/generator/buildSheets.test.ts`

**Interfaces:**
- Consumes: `NOTES`, `geometry` helpers.
- Produces:
  - `type GeneratorState` with: `type:'tiles'|'grid'`, `paper`, `orientation`, `size`, `sizeLabel`, `mode:'rows'|'pages'`, `margin`, `guides`, `gridPages`, `clearance`, `tilesPerRow:TilesPerRow`, `counts: Record<string,number>`, `on: Record<string,boolean>`.
  - `defaultGeneratorState(): GeneratorState`
  - `buildSheets(state): SheetPlan[]` — **pure** function returning a description of sheets to render:
    ```ts
    type SheetPlan =
      | { kind: 'tiles'; cols: number; rows: { noteId: string }[]; size: number; gap: number; guides: boolean }
      | { kind: 'gridpaper'; size: number; clearance: number };
    type BuildResult = { sheets: SheetPlan[]; totalTiles: number };
    ```
  - `useGeneratorState()` hook returning `{ state, set, buildResult }`.

- [ ] **Step 1: Write the failing test**

`src/generator/buildSheets.test.ts`:
```ts
import { buildSheets, defaultGeneratorState } from './useGeneratorState';

test('rows mode emits one row per requested count, wrapping across pages', () => {
  const s = { ...defaultGeneratorState(), type: 'tiles' as const, mode: 'rows' as const };
  // default: every note on, count 2 -> 24 rows
  const { sheets } = buildSheets(s);
  const tileSheets = sheets.filter(x => x.kind === 'tiles');
  const totalRows = tileSheets.reduce((n, x) => n + (x.kind === 'tiles' ? x.rows.length : 0), 0);
  expect(totalRows).toBe(24);
});

test('fixed tilesPerRow overrides auto column count', () => {
  const s = { ...defaultGeneratorState(), tilesPerRow: 3 };
  const { sheets } = buildSheets(s);
  const first = sheets.find(x => x.kind === 'tiles');
  expect(first && first.kind === 'tiles' && first.cols).toBe(3);
});

test('grid mode emits N gridpaper sheets', () => {
  const s = { ...defaultGeneratorState(), type: 'grid' as const, gridPages: 4 };
  const { sheets } = buildSheets(s);
  expect(sheets.filter(x => x.kind === 'gridpaper')).toHaveLength(4);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/generator/buildSheets.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/generator/useGeneratorState.ts`** (port of demo `render` logic as a pure builder)

```ts
import { useMemo, useState } from 'react';
import { NOTES } from '../notes';
import {
  pageBox, resolveCols, rowsPerPage, type Paper, type Orient, type TilesPerRow,
} from '../geometry';

export type GeneratorState = {
  type: 'tiles' | 'grid';
  paper: Paper; orientation: Orient;
  size: number; sizeLabel: string;
  mode: 'rows' | 'pages';
  margin: number; guides: boolean;
  gridPages: number; clearance: number;
  tilesPerRow: TilesPerRow;
  counts: Record<string, number>;
  on: Record<string, boolean>;
};

export function defaultGeneratorState(): GeneratorState {
  const counts: Record<string, number> = {};
  const on: Record<string, boolean> = {};
  NOTES.forEach(n => { counts[n.id] = 2; on[n.id] = true; });
  return {
    type: 'tiles', paper: 'A4', orientation: 'portrait',
    size: 80, sizeLabel: 'MD', mode: 'rows',
    margin: 2, guides: true, gridPages: 1, clearance: 4,
    tilesPerRow: 'auto', counts, on,
  };
}

export type SheetPlan =
  | { kind: 'tiles'; cols: number; rows: { noteId: string }[]; size: number; gap: number; guides: boolean }
  | { kind: 'gridpaper'; size: number; clearance: number };
export type BuildResult = { sheets: SheetPlan[]; totalTiles: number };

export function buildSheets(state: GeneratorState): BuildResult {
  const gap = state.margin * 2;
  const { w: pageW, h: pageH } = pageBox(state.paper, state.orientation);
  const cols = resolveCols(state.tilesPerRow, state.size, gap, pageW);
  const rpp = rowsPerPage(state.size, gap, pageH);
  const sheets: SheetPlan[] = [];
  let totalTiles = 0;

  if (state.type === 'grid') {
    const pages = Math.max(1, state.gridPages || 1);
    for (let p = 0; p < pages; p++) sheets.push({ kind: 'gridpaper', size: state.size, clearance: state.clearance });
    return { sheets, totalTiles: 0 };
  }

  if (state.mode === 'rows') {
    const rowNotes: { noteId: string }[] = [];
    NOTES.forEach(n => {
      if (!state.on[n.id]) return;
      const c = Math.max(0, state.counts[n.id] || 0);
      for (let i = 0; i < c; i++) rowNotes.push({ noteId: n.id });
    });
    for (let i = 0; i < rowNotes.length; i += rpp) {
      const rows = rowNotes.slice(i, i + rpp);
      sheets.push({ kind: 'tiles', cols, rows, size: state.size, gap, guides: state.guides });
      totalTiles += rows.length * cols;
    }
  } else {
    NOTES.forEach(n => {
      if (!state.on[n.id]) return;
      const count = Math.max(0, state.counts[n.id] || 0);
      if (count === 0) return;
      let rowsLeft = count * rpp;
      while (rowsLeft > 0) {
        const rowsHere = Math.min(rpp, rowsLeft);
        const rows = Array.from({ length: rowsHere }, () => ({ noteId: n.id }));
        sheets.push({ kind: 'tiles', cols, rows, size: state.size, gap, guides: state.guides });
        totalTiles += rowsHere * cols;
        rowsLeft -= rowsHere;
      }
    });
  }
  return { sheets, totalTiles };
}

export function useGeneratorState() {
  const [state, setState] = useState<GeneratorState>(defaultGeneratorState);
  const set = (patch: Partial<GeneratorState>) => setState(s => ({ ...s, ...patch }));
  const buildResult = useMemo(() => buildSheets(state), [state]);
  return { state, setState, set, buildResult };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/generator/buildSheets.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/generator/useGeneratorState.ts src/generator/buildSheets.test.ts
git commit -m "feat: add generator state + pure sheet builder with tiles-per-row"
```

---

### Task 8: Generator sheets view (`src/generator/GeneratorSheets.tsx`)

**Files:**
- Create: `src/generator/GeneratorSheets.tsx`, `src/generator/GridPaper.tsx`
- Test: `src/generator/GeneratorSheets.test.tsx`

**Interfaces:**
- Consumes: `SheetPlan` from `useGeneratorState`, `Tile`, `sheetDimsMm`, `PAD`.
- Produces: `GeneratorSheets({ sheets, paper, orientation })` rendering `.sheet` boxes (a `.sheet` per `SheetPlan`); `GridPaper({ size, clearance, pageW, pageH })` rendering the SVG grid (ported from demo `gridSheetEl`).

- [ ] **Step 1: Write the failing test**

`src/generator/GeneratorSheets.test.tsx`:
```tsx
import { render } from '@testing-library/react';
import { GeneratorSheets } from './GeneratorSheets';

test('renders one .sheet element per plan', () => {
  const sheets = [
    { kind: 'tiles' as const, cols: 2, rows: [{ noteId: 'C' }], size: 40, gap: 4, guides: false },
    { kind: 'tiles' as const, cols: 2, rows: [{ noteId: 'G' }], size: 40, gap: 4, guides: false },
  ];
  const { container } = render(<GeneratorSheets sheets={sheets} paper="A4" orientation="portrait" />);
  expect(container.querySelectorAll('.sheet')).toHaveLength(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/generator/GeneratorSheets.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/generator/GridPaper.tsx`** (port of demo `gridSheetEl`)

```tsx
import { PAD } from '../geometry';

export function GridPaper({ size, clearance, pageW, pageH }: { size: number; clearance: number; pageW: number; pageH: number }) {
  const pitch = size + clearance;
  const innerW = pageW - PAD * 2, innerH = pageH - PAD * 2;
  const c = Math.max(1, Math.floor(innerW / pitch));
  const r = Math.max(1, Math.floor(innerH / pitch));
  const gw = c * pitch, gh = r * pitch;
  const vlines = Array.from({ length: c + 1 }, (_, i) => i * pitch);
  const hlines = Array.from({ length: r + 1 }, (_, j) => j * pitch);
  return (
    <svg className="grid-svg block" width={gw} height={gh} viewBox={`0 0 ${gw} ${gh}`}>
      {vlines.map((x, i) => (
        <line key={`v${i}`} x1={x} y1={0} x2={x} y2={gh} stroke="#d6d4e0" strokeWidth={0.75} strokeDasharray="1 5" />
      ))}
      {hlines.map((y, j) => (
        <line key={`h${j}`} x1={0} y1={y} x2={gw} y2={y} stroke="#b3b1c0" strokeWidth={0.9} />
      ))}
    </svg>
  );
}
```

- [ ] **Step 4: Implement `src/generator/GeneratorSheets.tsx`**

```tsx
import { Tile } from '../Tile';
import { noteById } from '../notes';
import { sheetDimsMm, pageBox, PAD, type Paper, type Orient } from '../geometry';
import { GridPaper } from './GridPaper';
import type { SheetPlan } from './useGeneratorState';

export function GeneratorSheets({ sheets, paper, orientation }: { sheets: SheetPlan[]; paper: Paper; orientation: Orient }) {
  const dims = sheetDimsMm(paper, orientation);
  const { w: pageW, h: pageH } = pageBox(paper, orientation);
  if (sheets.length === 0) {
    return <div className="empty text-slate-500 text-center mt-20">No tiles yet — switch on a note and give it a count.</div>;
  }
  return (
    <div className="sheets block">
      {sheets.map((plan, i) => (
        <div key={i} className={`sheet bg-white mx-auto mb-6 ${plan.kind === 'tiles' && plan.guides ? 'guides' : ''}`}
             style={{ width: dims.w, padding: PAD, boxShadow: '0 2px 18px rgba(20,18,40,.12)' }}>
          {plan.kind === 'gridpaper'
            ? <GridPaper size={plan.size} clearance={plan.clearance} pageW={pageW} pageH={pageH} />
            : (
              <div className="grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${plan.cols}, ${plan.size}px)`, gap: plan.gap, justifyContent: 'start', alignContent: 'start' }}>
                {plan.rows.flatMap((row, r) =>
                  Array.from({ length: plan.cols }, (_, k) => (
                    <Tile key={`${r}-${k}`} kind="note" note={noteById(row.noteId)!} size={plan.size} />
                  )))}
              </div>
            )}
        </div>
      ))}
    </div>
  );
}
```
Add to `src/index.css`: `.guides .tile { outline: .4px dashed rgba(0,0,0,.22); outline-offset: -.2px; }`

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/generator/GeneratorSheets.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/generator/GeneratorSheets.tsx src/generator/GridPaper.tsx src/generator/GeneratorSheets.test.tsx src/index.css
git commit -m "feat: render generator sheets and grid paper"
```

---

### Task 9: Generator control panel + mode wiring (`src/generator/GeneratorPanel.tsx`, `src/generator/GeneratorMode.tsx`)

**Files:**
- Create: `src/generator/GeneratorPanel.tsx`, `src/generator/GeneratorMode.tsx`
- Modify: `src/App.tsx` (render `<GeneratorMode />` for the generator tab)
- Test: `src/generator/GeneratorMode.test.tsx`

**Interfaces:**
- Consumes: `useGeneratorState`, `GeneratorSheets`, `templateStore`, export functions.
- Produces: `GeneratorPanel({ state, set, setState, totalTiles, sheetsRef })` (all controls: sheet type, paper, orientation, size seg, tiles-per-row, by-rows/pages, margins/guides, per-note list, templates, export buttons); `GeneratorMode()` composing panel + sheets with a `ref` on the sheets container for export.

- [ ] **Step 1: Write the failing test**

`src/generator/GeneratorMode.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeneratorMode } from './GeneratorMode';

test('changing tiles-per-row to a fixed number re-renders columns', async () => {
  render(<GeneratorMode />);
  const input = screen.getByLabelText(/tiles per row/i);
  await userEvent.clear(input);
  await userEvent.type(input, '4');
  const grid = document.querySelector('.sheet .grid') as HTMLElement;
  expect(grid.style.gridTemplateColumns).toContain('repeat(4');
});

test('select none empties the preview', async () => {
  render(<GeneratorMode />);
  await userEvent.click(screen.getByRole('button', { name: /select none/i }));
  expect(screen.getByText(/no tiles yet/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/generator/GeneratorMode.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/generator/GeneratorPanel.tsx`**

Build the control panel. It receives `state`, `set` (partial patch), `setState`, `totalTiles`, and an `onExport` callback object. Include a labelled **Tiles per row** control:
```tsx
// inside the panel JSX — the tiles-per-row field (note htmlFor/id for the test)
<div className="field tpr-field flex items-center justify-between gap-2 mt-2">
  <label htmlFor="tilesPerRow">Tiles per row</label>
  <input
    id="tilesPerRow" className="num w-20 border rounded-lg px-2 py-1 text-center"
    type="text" inputMode="numeric"
    value={state.tilesPerRow === 'auto' ? '' : String(state.tilesPerRow)}
    placeholder="Auto"
    onChange={e => {
      const v = e.target.value.trim();
      set({ tilesPerRow: v === '' ? 'auto' : Math.max(1, parseInt(v) || 1) });
    }}
  />
</div>
```
Port the remaining controls from the demo as React (sheet-type toggle, paper segmented, orientation toggle, size segmented with `sizeLabel`, by-rows/pages toggle, apply-to-all, cut guides + margin, per-note checkbox+count list with `Select all/none/Reset`, grid sheets + clearance, template name/save/load/delete using `templateStore`). Each control calls `set({...})`. Give every control a semantic class name. Export buttons (Download PDF / PNG / WebP / Print) call the callbacks from `GeneratorMode`.

- [ ] **Step 4: Implement `src/generator/GeneratorMode.tsx`**

```tsx
import { useRef } from 'react';
import { useGeneratorState } from './useGeneratorState';
import { GeneratorSheets } from './GeneratorSheets';
import { GeneratorPanel } from './GeneratorPanel';
import { exportPdf } from '../export/pdf';
import { exportRaster } from '../export/raster';

export function GeneratorMode() {
  const { state, set, setState, buildResult } = useGeneratorState();
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetEls = () => Array.from(stageRef.current?.querySelectorAll('.sheet') ?? []) as HTMLElement[];

  const onExport = {
    pdf: () => exportPdf(sheetEls(), state.paper, state.orientation, 'CRF Note Tiles'),
    png: () => sheetEls()[0] && exportRaster(sheetEls()[0], 'image/png', 'CRF Note Tiles'),
    webp: () => sheetEls()[0] && exportRaster(sheetEls()[0], 'image/webp', 'CRF Note Tiles'),
    print: () => window.print(),
  };

  return (
    <div className="generator-mode grid md:grid-cols-[340px_1fr] min-h-[calc(100vh-49px)]">
      <GeneratorPanel state={state} set={set} setState={setState} totalTiles={buildResult.totalTiles} onExport={onExport} />
      <main className="stage overflow-auto p-6 md:p-8" ref={stageRef}>
        <GeneratorSheets sheets={buildResult.sheets} paper={state.paper} orientation={state.orientation} />
      </main>
    </div>
  );
}
```
Wire `App.tsx` to render `<GeneratorMode />` for the generator tab. Mark the panel container with `no-print`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/generator/GeneratorMode.test.tsx`
Expected: PASS.

- [ ] **Step 6: Manual verification**

Run: `npm run dev` and confirm the generator matches the demo (paper/size/counts/grid/templates) and that **Tiles per row** forces column count when set. Then stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/generator/GeneratorPanel.tsx src/generator/GeneratorMode.tsx src/generator/GeneratorMode.test.tsx src/App.tsx
git commit -m "feat: wire up Tile Generator mode with controls and export"
```

---

### Task 10: Sheet document model + reducer (`src/designer/sheetModel.ts`)

**Files:**
- Create: `src/designer/sheetModel.ts`
- Test: `src/designer/sheetModel.test.ts`

**Interfaces:**
- Consumes: `semitone`, `noteById` from `notes.ts`; `Paper`, `Orient`, `TilesPerRow` from `geometry.ts`.
- Produces:
  - `type Item` (note | arrow | break | section), `type SheetDoc`, `defaultDoc(): SheetDoc`
  - `type Action` and `reduce(doc: SheetDoc, action: Action): SheetDoc` (pure)
  - Actions: `{type:'insertNote',noteId}`, `{type:'insertArrow',dir}`, `{type:'sharpenLast'}`, `{type:'flattenLast'}`, `{type:'insertBreak'}`, `{type:'insertSection',text}`, `{type:'deleteLast'}`, `{type:'removeAt',index}`, `{type:'setHeader',field,value}`, `{type:'setLayout',patch}`

- [ ] **Step 1: Write the failing test**

`src/designer/sheetModel.test.ts`:
```ts
import { defaultDoc, reduce } from './sheetModel';

test('insertNote appends a note item', () => {
  const d = reduce(defaultDoc(), { type: 'insertNote', noteId: 'C' });
  expect(d.items).toEqual([{ type: 'note', noteId: 'C' }]);
});

test('sharpenLast/flattenLast transform the last note only', () => {
  let d = reduce(defaultDoc(), { type: 'insertNote', noteId: 'C' });
  d = reduce(d, { type: 'sharpenLast' });
  expect(d.items.at(-1)).toEqual({ type: 'note', noteId: 'Cs' });
  d = reduce(d, { type: 'flattenLast' });
  expect(d.items.at(-1)).toEqual({ type: 'note', noteId: 'C' });
});

test('sharpenLast is a no-op when last item is not a note', () => {
  let d = reduce(defaultDoc(), { type: 'insertArrow', dir: 'up' });
  d = reduce(d, { type: 'sharpenLast' });
  expect(d.items).toEqual([{ type: 'arrow', dir: 'up' }]);
});

test('insertBreak, insertSection, deleteLast, removeAt', () => {
  let d = defaultDoc();
  d = reduce(d, { type: 'insertSection', text: 'Verse 1' });
  d = reduce(d, { type: 'insertNote', noteId: 'G' });
  d = reduce(d, { type: 'insertBreak' });
  expect(d.items).toEqual([
    { type: 'section', text: 'Verse 1' },
    { type: 'note', noteId: 'G' },
    { type: 'break' },
  ]);
  d = reduce(d, { type: 'deleteLast' });
  expect(d.items.at(-1)).toEqual({ type: 'note', noteId: 'G' });
  d = reduce(d, { type: 'removeAt', index: 0 });
  expect(d.items).toEqual([{ type: 'note', noteId: 'G' }]);
});

test('setHeader and setLayout patch the doc', () => {
  let d = reduce(defaultDoc(), { type: 'setHeader', field: 'title', value: 'My Song' });
  expect(d.title).toBe('My Song');
  d = reduce(d, { type: 'setLayout', patch: { tilesPerRow: 6 } });
  expect(d.tilesPerRow).toBe(6);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/designer/sheetModel.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/designer/sheetModel.ts`**

```ts
import { semitone, noteById } from '../notes';
import type { Paper, Orient, TilesPerRow } from '../geometry';

export type Item =
  | { type: 'note'; noteId: string }
  | { type: 'arrow'; dir: 'up' | 'down' }
  | { type: 'break' }
  | { type: 'section'; text: string };

export type HeaderField = 'part' | 'title' | 'subtitle' | 'composer' | 'tempoStyle';

export type SheetDoc = {
  part: string; title: string; subtitle: string; composer: string; tempoStyle: string;
  tilesPerRow: TilesPerRow; size: number; paper: Paper; orientation: Orient;
  items: Item[];
};

export function defaultDoc(): SheetDoc {
  return {
    part: '', title: '', subtitle: '', composer: '', tempoStyle: '',
    tilesPerRow: 'auto', size: 64, paper: 'A4', orientation: 'portrait',
    items: [],
  };
}

export type Action =
  | { type: 'insertNote'; noteId: string }
  | { type: 'insertArrow'; dir: 'up' | 'down' }
  | { type: 'sharpenLast' }
  | { type: 'flattenLast' }
  | { type: 'insertBreak' }
  | { type: 'insertSection'; text: string }
  | { type: 'deleteLast' }
  | { type: 'removeAt'; index: number }
  | { type: 'setHeader'; field: HeaderField; value: string }
  | { type: 'setLayout'; patch: Partial<Pick<SheetDoc, 'tilesPerRow' | 'size' | 'paper' | 'orientation'>> };

function shiftLastNote(items: Item[], delta: number): Item[] {
  const last = items.at(-1);
  if (!last || last.type !== 'note') return items;
  const next = semitone(last.noteId, delta);
  if (!noteById(next)) return items;
  return [...items.slice(0, -1), { type: 'note', noteId: next }];
}

export function reduce(doc: SheetDoc, action: Action): SheetDoc {
  switch (action.type) {
    case 'insertNote':    return { ...doc, items: [...doc.items, { type: 'note', noteId: action.noteId }] };
    case 'insertArrow':   return { ...doc, items: [...doc.items, { type: 'arrow', dir: action.dir }] };
    case 'sharpenLast':   return { ...doc, items: shiftLastNote(doc.items, 1) };
    case 'flattenLast':   return { ...doc, items: shiftLastNote(doc.items, -1) };
    case 'insertBreak':   return { ...doc, items: [...doc.items, { type: 'break' }] };
    case 'insertSection': return { ...doc, items: [...doc.items, { type: 'section', text: action.text }] };
    case 'deleteLast':    return { ...doc, items: doc.items.slice(0, -1) };
    case 'removeAt':      return { ...doc, items: doc.items.filter((_, i) => i !== action.index) };
    case 'setHeader':     return { ...doc, [action.field]: action.value };
    case 'setLayout':     return { ...doc, ...action.patch };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/designer/sheetModel.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/designer/sheetModel.ts src/designer/sheetModel.test.ts
git commit -m "feat: add sheet document model and pure reducer"
```

---

### Task 11: Flow layout into rows (`src/designer/flow.ts`)

**Files:**
- Create: `src/designer/flow.ts`
- Test: `src/designer/flow.test.ts`

**Interfaces:**
- Consumes: `Item` from `sheetModel.ts`, `resolveCols`/`pageBox` from `geometry.ts`.
- Produces:
  - `type Row = { kind: 'section'; text: string; index: number } | { kind: 'tiles'; cells: { item: Item; index: number }[] }`
  - `flowRows(items: Item[], cols: number): Row[]` — wraps note/arrow items into rows of at most `cols`; `break` starts a new row; `section` is its own full-width row. Each cell carries the item's original index (for delete/replace).

- [ ] **Step 1: Write the failing test**

`src/designer/flow.test.ts`:
```ts
import { flowRows } from './flow';
import type { Item } from './sheetModel';

const items: Item[] = [
  { type: 'section', text: 'Verse' },
  { type: 'note', noteId: 'C' }, { type: 'note', noteId: 'E' }, { type: 'note', noteId: 'G' },
  { type: 'break' },
  { type: 'note', noteId: 'A' },
];

test('wraps tiles at the column count', () => {
  const rows = flowRows(items, 2);
  // section | [C E] | [G] | break -> new row | [A]
  expect(rows[0]).toMatchObject({ kind: 'section', text: 'Verse' });
  expect(rows[1]).toMatchObject({ kind: 'tiles' });
  expect(rows[1].kind === 'tiles' && rows[1].cells.map(c => c.index)).toEqual([1, 2]);
  expect(rows[2].kind === 'tiles' && rows[2].cells.map(c => c.index)).toEqual([3]);
  expect(rows[3].kind === 'tiles' && rows[3].cells.map(c => c.index)).toEqual([5]);
});

test('break forces a new row even when under the column limit', () => {
  const rows = flowRows(items, 10);
  const tileRows = rows.filter(r => r.kind === 'tiles');
  expect(tileRows).toHaveLength(2); // [C E G] then [A]
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/designer/flow.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/designer/flow.ts`**

```ts
import type { Item } from './sheetModel';

export type Cell = { item: Item; index: number };
export type Row =
  | { kind: 'section'; text: string; index: number }
  | { kind: 'tiles'; cells: Cell[] };

export function flowRows(items: Item[], cols: number): Row[] {
  const max = Math.max(1, cols);
  const rows: Row[] = [];
  let cur: Cell[] = [];
  const flush = () => { if (cur.length) { rows.push({ kind: 'tiles', cells: cur }); cur = []; } };

  items.forEach((item, index) => {
    if (item.type === 'section') { flush(); rows.push({ kind: 'section', text: item.text, index }); return; }
    if (item.type === 'break')   { flush(); return; }
    cur.push({ item, index });
    if (cur.length >= max) flush();
  });
  flush();
  return rows;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/designer/flow.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/designer/flow.ts src/designer/flow.test.ts
git commit -m "feat: add flow layout that wraps items into rows"
```

---

### Task 12: Keyboard input hook (`src/designer/useKeyboard.ts`)

**Files:**
- Create: `src/designer/useKeyboard.ts`
- Test: `src/designer/keymap.test.ts`

**Interfaces:**
- Produces:
  - `keyToAction(e: { key: string }): Action | { type: 'newSection' } | null` — pure mapping used by the hook and tested directly.
  - `useKeyboard(dispatch, opts)` — attaches a `keydown` listener (component wires this; not unit-tested).
- Mapping: `A`–`G` (any case) → `insertNote` (natural); `#`/`s` → `sharpenLast`; `b`/`-` → `flattenLast`; `ArrowUp`/`ArrowDown` → `insertArrow up/down`; `Enter` → `insertBreak`; `Backspace` → `deleteLast`; `[` → `newSection` sentinel.

- [ ] **Step 1: Write the failing test**

`src/designer/keymap.test.ts`:
```ts
import { keyToAction } from './useKeyboard';

test('letters map to natural notes (case-insensitive)', () => {
  expect(keyToAction({ key: 'c' })).toEqual({ type: 'insertNote', noteId: 'C' });
  expect(keyToAction({ key: 'G' })).toEqual({ type: 'insertNote', noteId: 'G' });
});

test('accidentals, arrows, break, delete, section', () => {
  expect(keyToAction({ key: '#' })).toEqual({ type: 'sharpenLast' });
  expect(keyToAction({ key: 's' })).toEqual({ type: 'sharpenLast' });
  expect(keyToAction({ key: 'b' })).toEqual({ type: 'flattenLast' });
  expect(keyToAction({ key: '-' })).toEqual({ type: 'flattenLast' });
  expect(keyToAction({ key: 'ArrowUp' })).toEqual({ type: 'insertArrow', dir: 'up' });
  expect(keyToAction({ key: 'ArrowDown' })).toEqual({ type: 'insertArrow', dir: 'down' });
  expect(keyToAction({ key: 'Enter' })).toEqual({ type: 'insertBreak' });
  expect(keyToAction({ key: 'Backspace' })).toEqual({ type: 'deleteLast' });
  expect(keyToAction({ key: '[' })).toEqual({ type: 'newSection' });
});

test('unmapped keys return null', () => {
  expect(keyToAction({ key: 'z' })).toBeNull();
  expect(keyToAction({ key: 'h' })).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/designer/keymap.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/designer/useKeyboard.ts`**

```ts
import { useEffect } from 'react';
import type { Action } from './sheetModel';

const NOTE_LETTERS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
export type KeyResult = Action | { type: 'newSection' };

export function keyToAction(e: { key: string }): KeyResult | null {
  const k = e.key;
  const upper = k.toUpperCase();
  // 'b' is flat, not the note B — accidental keys win.
  if (k === '#' || k === 's' || k === 'S') return { type: 'sharpenLast' };
  if (k === 'b' || k === '-') return { type: 'flattenLast' };
  if (NOTE_LETTERS.has(upper) && k.length === 1) return { type: 'insertNote', noteId: upper };
  if (k === 'ArrowUp') return { type: 'insertArrow', dir: 'up' };
  if (k === 'ArrowDown') return { type: 'insertArrow', dir: 'down' };
  if (k === 'Enter') return { type: 'insertBreak' };
  if (k === 'Backspace') return { type: 'deleteLast' };
  if (k === '[') return { type: 'newSection' };
  return null;
}

export function useKeyboard(handle: (r: KeyResult) => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      const r = keyToAction(e);
      if (r) { e.preventDefault(); handle(r); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handle, enabled]);
}
```
Note: because `b`/`B` is reserved for flat (per the spec keyboard map), the note B is inserted via the palette tap or by typing then sharpening A; this matches the agreed map. Document this in the on-screen shortcut hint.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/designer/keymap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/designer/useKeyboard.ts src/designer/keymap.test.ts
git commit -m "feat: add keyboard key-to-action mapping for the designer"
```

---

### Task 13: Designer canvas + header (`src/designer/DesignerCanvas.tsx`, `HeaderZone.tsx`)

**Files:**
- Create: `src/designer/HeaderZone.tsx`, `src/designer/DesignerCanvas.tsx`
- Test: `src/designer/DesignerCanvas.test.tsx`

**Interfaces:**
- Consumes: `SheetDoc`, `flowRows`, `Tile`, `noteById`, `SYMBOLS`, `sheetDimsMm`/`pageBox`/`resolveCols`/`PAD`.
- Produces:
  - `HeaderZone({ doc, editable, onHeader })` — renders part (top-left) / title+subtitle (center) / composer "RH" (top-right) / tempoStyle "LH" (left, under part). When `editable`, fields are inputs; otherwise spans (empty fields hidden).
  - `DesignerCanvas({ doc, onRemove })` — one `.sheet` containing the header and the flowed rows; clicking a tile calls `onRemove(index)`.

- [ ] **Step 1: Write the failing test**

`src/designer/DesignerCanvas.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignerCanvas } from './DesignerCanvas';
import { defaultDoc } from './sheetModel';

test('renders header text and flowed tiles; clicking a tile removes it', async () => {
  const doc = { ...defaultDoc(), title: 'My Song', tilesPerRow: 4 as const,
    items: [{ type: 'note', noteId: 'C' } as const, { type: 'arrow', dir: 'up' } as const] };
  const onRemove = vi.fn();
  render(<DesignerCanvas doc={doc} onRemove={onRemove} />);
  expect(screen.getByText('My Song')).toBeInTheDocument();
  expect(screen.getByText('↑')).toBeInTheDocument();
  await userEvent.click(screen.getByText('↑'));
  expect(onRemove).toHaveBeenCalledWith(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/designer/DesignerCanvas.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/designer/HeaderZone.tsx`**

```tsx
import type { SheetDoc, HeaderField } from './sheetModel';

export function HeaderZone({ doc, editable, onHeader }: {
  doc: SheetDoc; editable: boolean; onHeader: (f: HeaderField, v: string) => void;
}) {
  const field = (f: HeaderField, placeholder: string, cls: string) =>
    editable
      ? <input className={`${cls} bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-slate-500`}
               placeholder={placeholder} value={doc[f]} onChange={e => onHeader(f, e.target.value)} />
      : (doc[f] ? <span className={cls}>{doc[f]}</span> : null);

  return (
    <header className="sheet-header mb-4">
      <div className="header-top grid grid-cols-3 items-start gap-2">
        <div className="header-left text-sm text-slate-600">
          {field('part', 'Part / instrument', 'header-part font-semibold block')}
          {field('tempoStyle', 'LH: tempo · style', 'header-tempo block mt-1')}
        </div>
        <div className="header-center text-center">
          {field('title', 'Song title', 'header-title text-2xl font-bold block')}
          {field('subtitle', 'Subtitle', 'header-subtitle text-sm text-slate-500 block')}
        </div>
        <div className="header-right text-right text-sm text-slate-600">
          {field('composer', 'RH: composer', 'header-composer block')}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Implement `src/designer/DesignerCanvas.tsx`**

```tsx
import { Tile } from '../Tile';
import { noteById, SYMBOLS } from '../notes';
import { sheetDimsMm, pageBox, resolveCols, PAD } from '../geometry';
import { flowRows } from './flow';
import { HeaderZone } from './HeaderZone';
import type { SheetDoc, HeaderField } from './sheetModel';

const arrowSym = (dir: 'up' | 'down') => SYMBOLS.find(s => s.id === (dir === 'up' ? 'arrowUp' : 'arrowDown'))!;

export function DesignerCanvas({ doc, onRemove, editable = false, onHeader = () => {} }: {
  doc: SheetDoc; onRemove: (index: number) => void; editable?: boolean; onHeader?: (f: HeaderField, v: string) => void;
}) {
  const dims = sheetDimsMm(doc.paper, doc.orientation);
  const { w: pageW } = pageBox(doc.paper, doc.orientation);
  const cols = resolveCols(doc.tilesPerRow, doc.size, 6, pageW);
  const rows = flowRows(doc.items, cols);

  return (
    <div className="sheets block">
      <div className="sheet bg-white mx-auto" style={{ width: dims.w, padding: PAD, boxShadow: '0 2px 18px rgba(20,18,40,.12)' }}>
        <HeaderZone doc={doc} editable={editable} onHeader={onHeader} />
        <div className="sheet-body flex flex-col gap-1.5">
          {rows.map((row, ri) =>
            row.kind === 'section'
              ? <div key={ri} className="row-section font-semibold text-slate-700 mt-2">{row.text}</div>
              : (
                <div key={ri} className="row-tiles flex flex-wrap" style={{ gap: 6 }}>
                  {row.cells.map(cell =>
                    cell.item.type === 'note'
                      ? <Tile key={cell.index} kind="note" note={noteById(cell.item.noteId)!} size={doc.size} onClick={() => onRemove(cell.index)} />
                      : <Tile key={cell.index} kind="arrow" sym={arrowSym(cell.item.dir)} size={doc.size} onClick={() => onRemove(cell.index)} />
                  )}
                </div>
              ))}
          {doc.items.length === 0 && <div className="empty text-slate-400 text-sm">Tap notes below or type A–G to begin.</div>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/designer/DesignerCanvas.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/designer/HeaderZone.tsx src/designer/DesignerCanvas.tsx src/designer/DesignerCanvas.test.tsx
git commit -m "feat: add designer canvas and editable header zone"
```

---

### Task 14: Palette (`src/designer/Palette.tsx`)

**Files:**
- Create: `src/designer/Palette.tsx`
- Test: `src/designer/Palette.test.tsx`

**Interfaces:**
- Consumes: `NOTES`, `SYMBOLS`.
- Produces: `Palette({ onAction })` where `onAction(r: KeyResult)` reuses the same `KeyResult` union as the keyboard (so palette taps and keystrokes share one dispatch path). Buttons: 12 notes, sharp, flat, ↑, ↓, line break, section.

- [ ] **Step 1: Write the failing test**

`src/designer/Palette.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Palette } from './Palette';

test('tapping a note button dispatches insertNote', async () => {
  const onAction = vi.fn();
  render(<Palette onAction={onAction} />);
  await userEvent.click(screen.getByRole('button', { name: 'C' }));
  expect(onAction).toHaveBeenCalledWith({ type: 'insertNote', noteId: 'C' });
});

test('tapping sharp and line-break dispatch the right actions', async () => {
  const onAction = vi.fn();
  render(<Palette onAction={onAction} />);
  await userEvent.click(screen.getByRole('button', { name: /sharp/i }));
  await userEvent.click(screen.getByRole('button', { name: /line break/i }));
  expect(onAction).toHaveBeenCalledWith({ type: 'sharpenLast' });
  expect(onAction).toHaveBeenCalledWith({ type: 'insertBreak' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/designer/Palette.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/designer/Palette.tsx`**

```tsx
import { NOTES } from '../notes';
import type { KeyResult } from './useKeyboard';

export function Palette({ onAction }: { onAction: (r: KeyResult) => void }) {
  return (
    <div className="palette no-print grid gap-2">
      <div className="palette-notes grid grid-cols-6 gap-1.5">
        {NOTES.map(n => (
          <button key={n.id} className="palette-note rounded-lg py-2 text-white font-semibold text-sm"
                  style={{ background: n.hex }} aria-label={n.id}
                  onClick={() => onAction({ type: 'insertNote', noteId: n.id })}>
            {n.main}
          </button>
        ))}
      </div>
      <div className="palette-symbols grid grid-cols-3 gap-1.5">
        <button className="palette-sharp rounded-lg py-2 border text-sm" aria-label="Sharp" onClick={() => onAction({ type: 'sharpenLast' })}>♯ Sharp</button>
        <button className="palette-flat rounded-lg py-2 border text-sm" aria-label="Flat" onClick={() => onAction({ type: 'flattenLast' })}>♭ Flat</button>
        <button className="palette-up rounded-lg py-2 border text-sm" aria-label="Up arrow" onClick={() => onAction({ type: 'insertArrow', dir: 'up' })}>↑ Up</button>
        <button className="palette-down rounded-lg py-2 border text-sm" aria-label="Down arrow" onClick={() => onAction({ type: 'insertArrow', dir: 'down' })}>↓ Down</button>
        <button className="palette-break rounded-lg py-2 border text-sm" aria-label="Line break" onClick={() => onAction({ type: 'insertBreak' })}>⏎ Line break</button>
        <button className="palette-section rounded-lg py-2 border text-sm" aria-label="Section" onClick={() => onAction({ type: 'newSection' })}>＋ Section</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/designer/Palette.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/designer/Palette.tsx src/designer/Palette.test.tsx
git commit -m "feat: add mobile-first note/symbol palette"
```

---

### Task 15: Designer mode wiring + save/load + export (`src/designer/DesignerMode.tsx`)

**Files:**
- Create: `src/designer/DesignerMode.tsx`, `src/designer/DesignerControls.tsx`
- Modify: `src/App.tsx` (render `<DesignerMode />` for the designer tab)
- Test: `src/designer/DesignerMode.test.tsx`

**Interfaces:**
- Consumes: `reduce`/`defaultDoc`, `DesignerCanvas`, `Palette`, `useKeyboard`/`keyToAction`, `designStore`, export functions.
- Produces: `DesignerMode()` — owns `doc` via `useReducer(reduce, defaultDoc())`, a single `handle(r: KeyResult)` that turns palette taps and key results into dispatches (resolving the `newSection` sentinel by prompting for section text), keyboard listener via `useKeyboard`, a `tilesPerRow`/size/paper/orientation control row (`DesignerControls`), save/load/delete designs (`designStore`), and PDF/PNG/WebP/Print export off the rendered `.sheet`.

- [ ] **Step 1: Write the failing test**

`src/designer/DesignerMode.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignerMode } from './DesignerMode';

test('typing a note letter adds a tile to the canvas', async () => {
  render(<DesignerMode />);
  await userEvent.keyboard('c');
  expect(document.querySelector('.row-tiles .tile')).toBeTruthy();
});

test('palette tap then tiles-per-row control re-wraps', async () => {
  render(<DesignerMode />);
  await userEvent.click(screen.getByRole('button', { name: 'C' }));
  await userEvent.click(screen.getByRole('button', { name: 'E' }));
  const tpr = screen.getByLabelText(/tiles per row/i);
  await userEvent.clear(tpr); await userEvent.type(tpr, '1');
  expect(document.querySelectorAll('.row-tiles')).toHaveLength(2); // 1 per row
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/designer/DesignerMode.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/designer/DesignerControls.tsx`**

A control strip with: **Tiles per row** (`Auto`/number, same pattern as the generator, `id="dTilesPerRow"`, label text "Tiles per row"), tile **size** segmented (e.g. 40/52/64/80), **paper** + **orientation** toggles, and a **shortcuts hint** line (`A–G note · # sharp · b flat · ↑↓ arrow · Enter break · [ section`). Each control calls `dispatch({ type: 'setLayout', patch: {...} })`.

- [ ] **Step 4: Implement `src/designer/DesignerMode.tsx`**

```tsx
import { useReducer, useRef, useState } from 'react';
import { reduce, defaultDoc } from './sheetModel';
import { DesignerCanvas } from './DesignerCanvas';
import { Palette } from './Palette';
import { DesignerControls } from './DesignerControls';
import { useKeyboard, type KeyResult } from './useKeyboard';
import { designStore } from '../storage';
import { exportPdf } from '../export/pdf';
import { exportRaster } from '../export/raster';

export function DesignerMode() {
  const [doc, dispatch] = useReducer(reduce, undefined, defaultDoc);
  const stageRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');

  const handle = (r: KeyResult) => {
    if (r.type === 'newSection') {
      const text = window.prompt('Section title');
      if (text) dispatch({ type: 'insertSection', text });
      return;
    }
    dispatch(r);
  };
  useKeyboard(handle, true);

  const sheetEl = () => stageRef.current?.querySelector('.sheet') as HTMLElement | null;
  const baseName = () => doc.title?.trim() || 'CRF Sheet';
  const onExport = {
    pdf: () => { const el = sheetEl(); if (el) exportPdf([el], doc.paper, doc.orientation, baseName()); },
    png: () => { const el = sheetEl(); if (el) exportRaster(el, 'image/png', baseName()); },
    webp: () => { const el = sheetEl(); if (el) exportRaster(el, 'image/webp', baseName()); },
    print: () => window.print(),
  };
  const onSave = () => name.trim() && designStore.save(name.trim(), doc);
  const onLoad = () => { const d = designStore.load(name.trim()); if (d) dispatch({ type: 'setLayout', patch: {} }), loadDoc(d); };
  // loadDoc replaces the whole doc: add a 'load' action OR reset via reducer.

  return (
    <div className="designer-mode grid md:grid-cols-[360px_1fr] min-h-[calc(100vh-49px)]">
      <aside className="designer-panel no-print border-r border-slate-200 bg-white p-4 flex flex-col gap-4 overflow-y-auto">
        <DesignerControls doc={doc} dispatch={dispatch} />
        <Palette onAction={handle} />
        <div className="designer-saveload grid gap-2">
          <input className="border rounded-lg px-2 py-1 text-sm" placeholder="Design name" value={name} onChange={e => setName(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-save rounded-lg border px-3 py-1 text-sm" onClick={onSave}>Save</button>
            <button className="btn-load rounded-lg border px-3 py-1 text-sm" onClick={onLoad}>Load</button>
          </div>
        </div>
        <div className="designer-export grid grid-cols-2 gap-2">
          <button className="btn-pdf rounded-lg border px-3 py-1 text-sm" onClick={onExport.pdf}>PDF</button>
          <button className="btn-png rounded-lg border px-3 py-1 text-sm" onClick={onExport.png}>PNG</button>
          <button className="btn-webp rounded-lg border px-3 py-1 text-sm" onClick={onExport.webp}>WebP</button>
          <button className="btn-print rounded-lg border px-3 py-1 text-sm" onClick={onExport.print}>Print</button>
        </div>
      </aside>
      <main className="stage overflow-auto p-4 md:p-8" ref={stageRef}>
        <DesignerCanvas doc={doc} editable onHeader={(f, v) => dispatch({ type: 'setHeader', field: f, value: v })} onRemove={(i) => dispatch({ type: 'removeAt', index: i })} />
      </main>
    </div>
  );
}
```
Add a `{ type: 'load'; doc: SheetDoc }` action to `sheetModel.ts` `Action` union and `reduce` (`case 'load': return action.doc;`), then implement `onLoad` as `const d = designStore.load(name.trim()); if (d) dispatch({ type: 'load', doc: d as SheetDoc });` and delete the placeholder `loadDoc` note above. (Update `sheetModel.test.ts` with a `load` case test.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/designer/DesignerMode.test.tsx src/designer/sheetModel.test.ts`
Expected: PASS.

- [ ] **Step 6: Manual verification**

Run `npm run dev`. Type `c e g`, press Enter, tap `Section`, tap a few notes, set Tiles per row, fill in title/part/composer/tempo. Save, reload the page, Load by name. Export PNG/WebP/PDF and Print-preview. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/designer/DesignerMode.tsx src/designer/DesignerControls.tsx src/designer/DesignerMode.test.tsx src/designer/sheetModel.ts src/designer/sheetModel.test.ts src/App.tsx
git commit -m "feat: wire Sheet Designer mode with save/load and export"
```

---

### Task 16: Responsive polish + full-suite verification

**Files:**
- Modify: `src/App.tsx`, `src/index.css`, panel components as needed.
- Test: full suite.

**Interfaces:** none new.

- [ ] **Step 1: Mobile-first audit**

On a narrow viewport (`npm run dev`, devtools ~390px): both modes are single-column, the panel/palette sit above the preview and are tap-friendly, the sheet preview scrolls. At `md:` the two-column layout appears. Fix any overflow with Tailwind responsive classes; keep semantic class names.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS (all task suites green).

- [ ] **Step 3: Typecheck + build**

Run: `npm run build`
Expected: `tsc` + Vite build succeed with no type errors.

- [ ] **Step 4: Manual cross-mode check**

Confirm tab switching preserves each mode's purpose, the shared palette colors match between modes, and print hides panels (`.no-print`) in both modes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "polish: responsive layout pass and full-suite verification"
```

---

## Self-Review

**1. Spec coverage**

| Spec requirement | Task |
|---|---|
| Port current tile-generator functionality | 7, 8, 9 |
| Note tiles (12-note CRF palette, verbatim) | 2, 4 |
| Up/down arrow symbols (pitch-direction, inline tiles) | 2, 4, 10, 13, 14 |
| Line breaks | 10, 11, 14 |
| Section titles | 10, 11, 13, 14 |
| Page title + subtitle | 10, 13 |
| RH heading (composer) / LH heading (tempo·style) | 10, 13 |
| Part/instrument name top-left aligned with title | 13 |
| Simple palette-driven UI, mobile-first | 14, 15, 16 |
| Desktop keyboard shortcuts (A–G, sharp/flat, up/down) | 12, 15 |
| Tiles-per-row on BOTH interfaces, default auto | 3, 7, 9 (generator), 10, 11, 15 (designer) |
| Save (localStorage) | 5, 9, 15 |
| PNG + WebP export | 6, 9, 15 |
| PDF + Print export | 6, 9, 15 |
| Two full modes in one app | 1, 9, 15 |

No uncovered requirements.

**2. Placeholder scan:** Task 15 Step 4 intentionally flags and removes its own `loadDoc` placeholder in the same step by introducing the `load` action — resolved within the task, not left open. No other TODO/TBD/"handle edge cases" placeholders; all code steps contain concrete code.

**3. Type consistency:** `KeyResult` (Task 12) is the shared union consumed by `Palette` (14) and `DesignerMode` (15). `Action`/`reduce`/`SheetDoc` (Task 10) are used consistently in 11, 13, 15 (including the added `load` action). `SheetPlan`/`buildSheets`/`GeneratorState` (Task 7) match their use in Task 8/9. `resolveCols`/`pageBox`/`PAD` signatures (Task 3) match all call sites. `Note`/`Sym` (Task 2) match `Tile` (Task 4) and canvases.
