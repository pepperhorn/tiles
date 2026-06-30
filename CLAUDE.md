# CLAUDE.md

Note·Tiles — a React + TypeScript + Vite app for building colourful note-tile
sheets (Sheet Designer, Tile Generator, Quiz). State is a `SheetDoc` reducer with
undo/redo; rendering is shared so the on-screen sheet and exports stay identical.

## Design system — required for every new component

This app has a deliberate **neo-brutalist** visual language. **Any new component,
button, or control MUST follow `docs/DESIGN.md`** and reuse the existing style
families in `src/index.css` — square corners, `var(--ink)` borders, hard offset
shadows (`--shadow` / `--shadow-sm`), token colours, and the standard hover/active
press.

When adding UI:

1. Read `docs/DESIGN.md` first and pick the matching button/input/overlay family.
2. Add your element's class to that family's selector list in `index.css` (or nest
   it inside an already-styled container, e.g. `.designer-toolbar`) — **do not**
   ship one-off Tailwind like `rounded-lg border shadow-sm`, which looks foreign
   next to the brutalist controls.
3. Run the new-component checklist at the bottom of `docs/DESIGN.md`.
4. If a genuinely new pattern is needed, add it to `index.css` as a named family
   **and document it in `docs/DESIGN.md`** so the next addition can reuse it.

## Working in this repo

- `npm test` (Vitest) · `npm run lint` (ESLint) · `npm run build` (tsc + Vite).
- Keep changes covered by tests; the suite must stay green before a PR.
- Tokens and the brutalist style blocks live in `src/index.css` (`:root` + labelled
  sections). The architecture/feature spec is in
  `docs/superpowers/specs/2026-06-20-dots-system-react-app-design.md`.
- Data formats (tiles JSON + share-link URL encoding) are documented in `docs/FORMATS.md`.
