# Dots System — React App Design

**Date:** 2026-06-20
**Status:** Approved (design); ready for implementation planning

## Summary

Rebuild the existing single-file "Note Tile Sheets" demo (`latest-note-tile-sheets.html`)
as a React app, preserving all current functionality and adding a new **Sheet Designer**
for composing song pages out of the colored note-tiles ("dots").

The app has two top-level modes, switched by tabs:

1. **Tile Generator** — a faithful port of the current demo: printable sheets of cut-out
   note-tiles.
2. **Sheet Designer** — new: compose a song sheet using note-tiles + pitch-direction
   arrows + text headings, with a flowing (text-like) editor.

Both modes share the note palette, colors, the `Tile` component, export, and a new
**tiles-per-row** control.

## Stack

- **Vite + React + TypeScript + Tailwind CSS**
- **Poppins** via `@fontsource/poppins` (primary UI font).
- **Vitest + React Testing Library** for tests.
- Pure layout/keyboard/model logic kept framework-free so it is unit-testable.
- Existing export libraries reused: **jsPDF** + **html2canvas** (already used by the demo).

Per house conventions, every element carries a semantic contextual class name alongside
Tailwind utilities (e.g. `className="tile-note flex flex-col ..."`).

## Architecture

```
src/
  notes.ts            // CRF 12-note palette (ported verbatim) + SYMBOLS (arrows)
  geometry.ts         // paper sizes, cols/rows, tiles-per-row resolution (pure)
  Tile.tsx            // one tile (note OR arrow) — shared by both modes
  generator/          // MODE 1 — full port of the demo
    GeneratorPanel.tsx
    GeneratorSheets.tsx
    useGeneratorState.ts
  designer/           // MODE 2 — new
    sheetModel.ts     // SheetDoc type + reducer (pure, tested)
    Palette.tsx
    DesignerCanvas.tsx
    HeaderZone.tsx
    useKeyboard.ts
  export/             // shared
    pdf.ts            // jsPDF + html2canvas
    raster.ts         // PNG + WebP via canvas.toBlob
    print.css
  storage.ts          // localStorage: generator templates + designer docs (separate stores)
  App.tsx             // tab shell (Tile Generator | Sheet Designer)
```

### Design-for-isolation notes

- `geometry.ts`, `sheetModel.ts`, `storage.ts` are pure modules with no React/DOM deps —
  fully unit-testable.
- `Tile.tsx` renders one tile from a `Note` or `Symbol` and is the single source of tile
  visuals for both modes (and therefore for export).
- Each mode owns its own state hook; `App.tsx` only routes between them.

## Shared data: notes & symbols (`notes.ts`)

The 12 notes are ported exactly from the demo:

```ts
type Note = { id: string; main: string; sub: string; hex: string };
// C #f86e6e, C#/Db #f58841, D #ffbc57, D#/Eb #b8a334, E #fff56d,
// F #b3f888, F#/Gb #93d154, G #6bc6a0, G#/Ab #7ee8df, A #88a7f8,
// Bb #cc97e8, B #e277b1
```

New symbols (pitch-direction-change markers, standalone inline tiles, same footprint as a
note, neutral slate fill, white glyph in the standard note-text style):

```ts
type Symbol = { id: 'arrowUp' | 'arrowDown'; glyph: '↑' | '↓'; hex: string };
```

Note-text SVG/CSS style follows the house standard (white fill, dark stroke, paint-order
stroke) for any letter/glyph rendered over a colored dot.

## Mode 1 — Tile Generator (port)

A faithful port of the current demo. Preserves:

- Sheet type: **Tiles** / **Grid paper**.
- Page: A4 / A3 / Letter / Legal; Portrait / Landscape.
- Tile size: XS–XXL (40–160 px).
- Amount per note: **By rows** / **By full pages**, set-all + apply-to-all.
- Sheet options: cut guides toggle, cutting margin (px/side).
- Notes & counts list: per-note on/off + count, select all/none/reset.
- Grid paper: number of sheets, tile clearance.
- Templates: save / load / delete (localStorage).
- Export: Download PDF, Print, **+ new PNG / WebP**.
- Live geometry hints (columns/page, cells, totals).

**New:** a **Tiles per row** field — `Auto` (current width-based column count, the default)
or a fixed `N` that forces `N` columns. Lives in `geometry.ts` and is shared with the
Sheet Designer.

## Mode 2 — Sheet Designer (new)

### Document model (`sheetModel.ts`)

```ts
type Item =
  | { type: 'note';  noteId: string }
  | { type: 'arrow'; dir: 'up' | 'down' }
  | { type: 'break' }                  // force a new row
  | { type: 'section'; text: string }; // full-width section title

type SheetDoc = {
  // header fields (each individually editable / toggleable)
  part: string;        // top-left, aligned with title
  title: string;       // centered
  subtitle: string;    // centered, under title
  composer: string;    // RH heading — composer info (top-right)
  tempoStyle: string;  // LH heading — tempo & style info (top-left, under part)
  // layout
  tilesPerRow: 'auto' | number;        // default 'auto'
  size: number;        // tile px size
  paper: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  // body
  items: Item[];
};
```

The model is updated through a **pure reducer** with actions:
`insertNote`, `insertArrow`, `sharpenLast`, `flattenLast`, `insertBreak`,
`insertSection`, `deleteLast`, `setHeaderField`, `setLayout`, `replaceItem`,
`removeItem`. The reducer is the primary TDD target.

`sharpenLast` / `flattenLast` transform the most recently inserted **note** item into its
sharp/flat enharmonic equivalent (e.g. C → C#, D → Db) using the palette's enharmonic map;
no-op if the last item is not a note or has no such neighbor.

### Header zone (`HeaderZone.tsx`)

```
Part: Violin                Song Title               RH: composer info
                              Subtitle
LH: tempo · style info
```

Each field is inline-editable; empty fields are hidden in export/print.

### Body / canvas (`DesignerCanvas.tsx`)

- Notes and arrows flow left → right and **wrap** at `tilesPerRow`
  (or auto-fit to page width when `'auto'`).
- `break` starts a new row; `section` renders as a full-width label spanning the row.
- Tapping a placed tile lets you delete/replace it.
- Rendered sheet uses the same `.sheet` page-box conventions as the generator so export
  and print are consistent.

### Palette (`Palette.tsx`) — mobile-first

A tap grid of: the 12 colored notes, a **sharp/flat** toggle (modifies the next/last note),
**↑ / ↓** arrows, **line break**, and **section**. Tapping appends to the flow. This is the
primary input on mobile.

### Keyboard shortcuts (`useKeyboard.ts`) — desktop enhancement

| Key | Action |
|-----|--------|
| `A`–`G` | insert that natural note |
| `#` or `s` | sharpen the last note |
| `b` or `-` | flatten the last note |
| `↑` / `↓` | insert up / down arrow |
| `Enter` | insert line break |
| `Backspace` | delete last item |
| `[` | start a new section title (focuses a text input) |

Shortcuts are active only when the canvas/editor has focus and no text field is being
edited.

## Export & persistence (shared, `export/` + `storage.ts`)

- **Save / Load**: localStorage. Two separate namespaced stores — generator templates
  (existing key preserved) and designer documents.
- **Export** (driven off the rendered sheet DOM, same approach as the demo):
  - **PNG** and **WebP** via `html2canvas` → `canvas.toBlob(type)`.
  - **PDF** via jsPDF + html2canvas (ported from the demo, multi-page).
  - **Print** via print stylesheet (margins none, background graphics on).

## Responsive / mobile-first

- Single-column layout on small screens; palette and controls are tap-friendly.
- The two-column "panel + preview" layout appears at desktop widths.
- Dev server runs with `--host 0.0.0.0` per house convention.

## Testing strategy

TDD on the pure cores first:

- `geometry.ts` — tiles-per-row resolution, columns/rows-per-page math, paper geometry.
- `sheetModel.ts` — reducer actions incl. sharpen/flatten enharmonics, break, delete.
- `storage.ts` — save/load round-trip for both stores; graceful failure when storage
  unavailable.

Components get light smoke tests (renders, palette tap appends an item, keyboard insert).

## Out of scope (YAGNI for now)

- Drag-to-reorder of placed tiles (delete/replace only in v1).
- Multi-page Sheet Designer documents (single logical sheet that paginates on export is
  acceptable; explicit multi-page authoring is deferred).
- Cloud sync / accounts (localStorage only).
- Free-canvas placement (flowing editor was chosen).

## Open assumptions (flagged, low-risk)

- Stack = Vite + React + TS + Tailwind (matches house conventions).
- Keyboard map as tabled above (easily adjusted).
- Arrows are neutral slate tiles with a white glyph.
