# Library Overlay — load songs from the crf-admin tiles collection

**Date:** 2026-07-17
**Status:** Approved

## Goal

Let users load a song from the shared library (the `tiles` collection in the
crf-admin Directus instance) into either the Sheet Designer (editor) or the
SheetPlayer (viewer-only component), via a "Library" button that opens a
browse/search overlay. **Read-only** — no saving back to the library.

## Source data (crf-admin `tiles` collection)

- 285 published items. Relevant fields:
  - `id` (uuid), `status` (`published`/`draft`/`archived`), `title`, `subtitle`,
    `key_root`, `key_quality` (`major`/`minor`), `bpm`
  - `sheetdoc_json` (json) — **the full tiles document verbatim (source of
    truth)**; shape matches the app's `SheetDoc` exactly (verified against a
    live item).
- Base URL: `https://admin.creativeranges.org` (Directus REST,
  `GET /items/tiles`).
- Access: requires the Public role to have read permission on `tiles`
  (manual step, see Deployment below). Unauthenticated requests currently 403.

## Approach (chosen)

Metadata list + fetch-on-pick:

1. On overlay open, fetch one lightweight list of all published songs
   (`id,title,subtitle,key_root,key_quality,bpm`, `sort=title`, `limit=-1`,
   `filter[status][_eq]=published`).
2. Client-side search filter (title/subtitle) — instant, no pagination UI.
3. On pick, fetch that item's `sheetdoc_json` and load it.

Rejected alternatives: fetch-everything-up-front (~1–2 MB payload, grows with
library); server-driven search/pagination (overkill at 285 items, easy upgrade
later if the library grows 100×).

## Components

### `src/library.ts` (new)

API module, sibling of `cms.ts`, same style (plain `fetch`, `import.meta.env`).

- `LIBRARY_URL`: `import.meta.env.VITE_LIBRARY_URL` with default
  `https://admin.creativeranges.org`.
- `export type LibraryEntry = { id: string; title: string; subtitle: string | null; keyRoot: string | null; keyQuality: 'major' | 'minor' | null; bpm: number | null }`
- `fetchLibraryList(): Promise<LibraryEntry[]>` — GET
  `/items/tiles?fields=id,title,subtitle,key_root,key_quality,bpm&filter[status][_eq]=published&sort=title&limit=-1`.
  Throws on non-OK / malformed response.
- `fetchLibraryDoc(id: string): Promise<SheetDoc>` — GET
  `/items/tiles/<id>?fields=sheetdoc_json`, then validate the payload with the
  same logic as JSON import: extract the object-level parsing from
  `parseSheetJson` in `src/designer/json.ts` into an exported
  `parseSheetValue(value: unknown): SheetDoc` (with `parseSheetJson` becoming
  `parseSheetValue(JSON.parse(text))`) and call that, so malformed docs are
  rejected/backfilled exactly like a JSON import (bpm clamped 20–300, missing fields backfilled from
  `defaultDoc()`, rejects anything without an `items` array).

### `src/designer/LibraryOverlay.tsx` (new)

Follows the existing overlay family exactly (see `ConfirmOverlay`/`KeyOverlay`):

- Backdrop: `library-overlay fixed inset-0 z-50 flex items-end sm:items-center
  justify-center bg-slate-900/30 p-4`, click closes; Escape closes.
- Card: `overlay-card overlay-pop w-full max-w-md bg-white p-4`,
  `role="dialog" aria-modal="true"`, click stops propagation.
- Contents:
  - `.overlay-label` heading ("Library").
  - `.overlay-input` search box (`library-search`), client-side filter on
    title + subtitle, autofocused.
  - Scrollable list (`library-list`, `max-h-*` + `overflow-y-auto`) of song
    rows (`library-row` buttons): song title, plus a muted meta line
    (subtitle · key · bpm — omit missing parts).
  - Inline states in the card: "Loading library…", error message
    ("Couldn't reach the library") with a retry button, "No matches" when the
    filter empties the list.
- Props: `{ onLoad(doc: SheetDoc): void; onClose(): void }`. Clicking a row
  fetches the doc (row shows a busy state; errors show inline), calls
  `onLoad(doc)`, then closes.
- `.library-row` is a genuinely new pattern (list-row button): add it as a
  named family in `src/index.css` (square corners, `--ink` border treatment
  consistent with the design system, hover/active press) **and document it in
  `docs/DESIGN.md`**. `.library-search` joins the `.overlay-input` selector
  list.

### Editor wiring — `src/designer/DesignerMode.tsx`

- `.btn-library` "Library" button in the Notes `.designer-toolbar`
  (auto-styled Tier-1 outline by the existing `.designer-toolbar` rules).
- Opens `LibraryOverlay`; on pick: `dispatch({ type: 'load', doc })` —
  undoable via history, same as Import JSON, so no destructive-action confirm.

### Viewer wiring — `src/player/SheetPlayer.tsx`

- `.btn-library` button next to the existing "Load JSON…" (`.btn-load-json`)
  in the Sheet group (`group-load`).
- On pick: `setLoaded(doc)`; source name shows the song title.

## Error handling

- Fetch failures / non-OK responses / malformed JSON → inline error state in
  the overlay with retry; never crashes the host component.
- `sheetdoc_json` that fails `parseSheetJson` validation → treated as a fetch
  error for that row ("Couldn't load this song").

## Testing (Vitest)

- `library.test.ts` (mocked `fetch`): list URL includes published filter +
  field list; response mapped to `LibraryEntry[]`; non-OK throws; doc fetch
  parses/backfills via the sheet JSON parser and rejects docs without `items`.
- `LibraryOverlay.test.tsx`: renders rows from a mocked list; search filters;
  clicking a row calls `onLoad` with the parsed doc and closes; error state
  renders with retry.

## Deployment note (manual, one-time)

In Directus Studio (crf-admin) → Settings → Access Policies → **Public** →
add **Read** on `tiles` with:

- Item permissions (filter): `status equals published`
- Field permissions (whitelist): `id, title, subtitle, key_root, key_quality,
  bpm, sheetdoc_json`

Until this is done the overlay will show its error state (403).

## Out of scope

- Saving/updating library items from the app.
- Composer / m2m fields in the list row (can be added later).
- Pagination / server-side search.
