# Library Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Library" button in the Sheet Designer toolbar and the SheetPlayer sidebar that opens an overlay listing the 285 published songs in the crf-admin Directus `tiles` collection, with client-side search; picking a song loads its `sheetdoc_json` into the editor (undoable) or the viewer. Read-only — no saving back.

**Architecture:** A small fetch module (`src/library.ts`, sibling of `cms.ts`) does two Directus REST calls: a lightweight metadata list on overlay open, then the full `sheetdoc_json` on pick, validated through the same parser as JSON import. One shared overlay component (`src/designer/LibraryOverlay.tsx`) follows the existing `.overlay-card` family; both hosts wire it with a `.btn-library` Tier-1 button.

**Tech Stack:** React 19 + TypeScript + Vite, Vitest + Testing Library, plain `fetch`, Directus REST (`GET /items/tiles`).

**Spec:** `docs/superpowers/specs/2026-07-17-library-overlay-design.md`

## Global Constraints

- Design system: square corners, `var(--ink)` borders, hard offset shadows; every new class joins a named family in `src/index.css` and is documented in `docs/DESIGN.md` (see the checklist at the bottom of DESIGN.md). No one-off Tailwind like `rounded-lg border shadow-sm`.
- Every element gets a contextual class name alongside Tailwind utilities (e.g. `library-row`, `library-search`).
- Library base URL: `import.meta.env.VITE_LIBRARY_URL`, default `https://admin.creativeranges.org` (trailing slash stripped).
- Directus fields (snake_case on the wire): `id, title, subtitle, key_root, key_quality, bpm, sheetdoc_json, status`. Only `status=published` items are listed.
- `sheetdoc_json` is the full SheetDoc verbatim; always validate through `parseSheetValue` (Task 1) — never trust it raw.
- Suite must stay green: `npm test`, `npm run lint`, `npm run build`.
- **Deployment note (manual, not a code task):** the Public role in crf-admin Directus needs Read on `tiles` (filter `status = published`, field whitelist `id,title,subtitle,key_root,key_quality,bpm,sheetdoc_json`). Until then the overlay shows its error state (403). Do not attempt this from code.

---

### Task 1: Extract `parseSheetValue` from `parseSheetJson`

The library fetch returns an already-parsed JSON object, but all import validation (items-array check, defaultDoc backfill, bpm clamp) lives in `parseSheetJson(text: string)`. Extract the object-level half so both paths share it.

**Files:**
- Modify: `src/designer/json.ts:27-47`
- Test: `src/designer/json.test.ts` (append)

**Interfaces:**
- Produces: `export function parseSheetValue(value: unknown): SheetDoc` — validates/backfills a parsed value; throws `Error('Not a valid sheet JSON (missing items array)')` on non-objects or missing `items` array. `parseSheetJson(text)` becomes `parseSheetValue(JSON.parse(text))` (behaviour unchanged).

- [ ] **Step 1: Write the failing test** — append to `src/designer/json.test.ts`:

```ts
describe('parseSheetValue', () => {
  test('accepts an already-parsed object and backfills defaults', () => {
    const doc = parseSheetValue({ title: 'Lib song', items: [{ type: 'note', noteId: 'G' }] });
    expect(doc.title).toBe('Lib song');
    expect(doc.items).toEqual([{ type: 'note', noteId: 'G' }]);
    expect(doc.paper).toBe('A4'); // backfilled from defaultDoc()
    expect(doc.bpm).toBe(120);
  });

  test('strips the derived midi annotation and clamps bpm', () => {
    const doc = parseSheetValue({ items: [], midi: [{ index: 0, midi: 60, name: 'C4' }], bpm: 999 });
    expect('midi' in doc).toBe(false);
    expect(doc.bpm).toBe(300);
  });

  test('rejects values without an items array', () => {
    expect(() => parseSheetValue(null)).toThrow(/items array/);
    expect(() => parseSheetValue('a string')).toThrow(/items array/);
    expect(() => parseSheetValue({ title: 'no items' })).toThrow(/items array/);
  });
});
```

Add `parseSheetValue` to the existing import from `./json` at the top of the test file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/designer/json.test.ts`
Expected: FAIL — `parseSheetValue` is not exported.

- [ ] **Step 3: Implement** — in `src/designer/json.ts`, replace the body of `parseSheetJson` (lines 31-47) with:

```ts
// Validate an already-parsed value (JSON.parse output, or a document fetched
// from the library API) into a SheetDoc. Missing fields are filled from
// defaultDoc() so older/partial dumps still load; an object without an
// `items` array is rejected as not-a-sheet. The derived `midi` annotation (if
// present) is discarded — it's an export-only convenience, not part of the model.
export function parseSheetValue(value: unknown): SheetDoc {
  const parsed = value as { items?: unknown; midi?: unknown } | null;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) {
    throw new Error('Not a valid sheet JSON (missing items array)');
  }
  const rest = { ...parsed };
  delete rest.midi;
  const doc = { ...defaultDoc(), ...rest } as SheetDoc;
  // Clamp bpm to the same 20–300 invariant the setBpm reducer enforces, so a
  // hand-edited file or crafted #view=/#edit= link can't push an out-of-range
  // tempo into playback (beatDur = 60/bpm) or the designer input. Coerce first:
  // a non-numeric bpm (e.g. "fast") is NaN, which survives Math.max/round, so
  // fall back to the default rather than letting NaN reach beatDur.
  const b = Math.round(Number(doc.bpm));
  doc.bpm = Number.isFinite(b) ? Math.min(300, Math.max(20, b)) : 120;
  return doc;
}

// Parse a sheet-JSON string back into a SheetDoc.
export function parseSheetJson(text: string): SheetDoc {
  return parseSheetValue(JSON.parse(text));
}
```

(Keep the existing doc comment on `parseSheetJson` merged into the new `parseSheetValue` comment as shown; delete the old body.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/designer/json.test.ts`
Expected: PASS (all existing `parseSheetJson` tests still green — behaviour is unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/designer/json.ts src/designer/json.test.ts
git commit -m "refactor: extract parseSheetValue for non-string sheet sources"
```

---

### Task 2: `src/library.ts` — Directus fetch module

**Files:**
- Create: `src/library.ts`
- Test: `src/library.test.ts`

**Interfaces:**
- Consumes: `parseSheetValue` from `./designer/json` (Task 1).
- Produces:
  - `export type LibraryEntry = { id: string; title: string; subtitle: string | null; keyRoot: string | null; keyQuality: 'major' | 'minor' | null; bpm: number | null }`
  - `export async function fetchLibraryList(): Promise<LibraryEntry[]>` — throws on non-OK / malformed response.
  - `export async function fetchLibraryDoc(id: string): Promise<SheetDoc>` — throws on non-OK response or invalid `sheetdoc_json`.

- [ ] **Step 1: Write the failing test** — create `src/library.test.ts`:

```ts
import { fetchLibraryList, fetchLibraryDoc } from './library';
import { defaultDoc } from './designer/sheetModel';

const ok = (data: unknown) => ({ ok: true, status: 200, json: async () => ({ data }) }) as Response;
const fail = (status: number) => ({ ok: false, status, json: async () => ({}) }) as Response;

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => fetchMock.mockReset());

describe('fetchLibraryList', () => {
  test('requests published items with the metadata field list and maps rows', async () => {
    fetchMock.mockResolvedValue(ok([
      { id: 'a1', title: 'Song A', subtitle: 'Sub', key_root: 'G', key_quality: 'major', bpm: 100 },
      { id: 'b2', title: 'Song B', subtitle: null, key_root: null, key_quality: null, bpm: null },
    ]));
    const list = await fetchLibraryList();
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/items/tiles?');
    expect(url).toContain('filter[status][_eq]=published');
    expect(url).toContain('fields=id,title,subtitle,key_root,key_quality,bpm');
    expect(url).toContain('sort=title');
    expect(url).toContain('limit=-1');
    expect(list).toEqual([
      { id: 'a1', title: 'Song A', subtitle: 'Sub', keyRoot: 'G', keyQuality: 'major', bpm: 100 },
      { id: 'b2', title: 'Song B', subtitle: null, keyRoot: null, keyQuality: null, bpm: null },
    ]);
  });

  test('throws on a non-OK response', async () => {
    fetchMock.mockResolvedValue(fail(403));
    await expect(fetchLibraryList()).rejects.toThrow(/403/);
  });

  test('throws on a malformed response body', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ nope: true }) } as Response);
    await expect(fetchLibraryList()).rejects.toThrow(/malformed/i);
  });
});

describe('fetchLibraryDoc', () => {
  test('fetches sheetdoc_json by id and validates it like a JSON import', async () => {
    fetchMock.mockResolvedValue(ok({
      sheetdoc_json: { ...defaultDoc(), title: 'Tafelmusik', bpm: 999, items: [{ type: 'note', noteId: 'G' }] },
    }));
    const doc = await fetchLibraryDoc('a1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/items/tiles/a1?fields=sheetdoc_json');
    expect(doc.title).toBe('Tafelmusik');
    expect(doc.bpm).toBe(300); // clamped by parseSheetValue
    expect(doc.items).toHaveLength(1);
  });

  test('rejects a sheetdoc_json without an items array', async () => {
    fetchMock.mockResolvedValue(ok({ sheetdoc_json: { title: 'broken' } }));
    await expect(fetchLibraryDoc('a1')).rejects.toThrow(/items array/);
  });

  test('throws on a non-OK response', async () => {
    fetchMock.mockResolvedValue(fail(404));
    await expect(fetchLibraryDoc('missing')).rejects.toThrow(/404/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/library.test.ts`
Expected: FAIL — cannot resolve `./library`.

- [ ] **Step 3: Implement** — create `src/library.ts`:

```ts
import { parseSheetValue } from './designer/json';
import type { SheetDoc } from './designer/sheetModel';

// The song library lives in the crf-admin Directus `tiles` collection
// (read-only from the app; the Public role exposes published items). The
// base URL can be overridden at build time via VITE_LIBRARY_URL.
const LIBRARY_URL = (
  (import.meta.env as Record<string, string | undefined>).VITE_LIBRARY_URL
  ?? 'https://admin.creativeranges.org'
).replace(/\/$/, '');

/** One published song's metadata, as shown in the library overlay list. */
export type LibraryEntry = {
  id: string;
  title: string;
  subtitle: string | null;
  keyRoot: string | null;
  keyQuality: 'major' | 'minor' | null;
  bpm: number | null;
};

// Lightweight metadata list (no documents): one request for the whole library,
// searched client-side in the overlay. Sorted server-side by title.
export async function fetchLibraryList(): Promise<LibraryEntry[]> {
  const url = `${LIBRARY_URL}/items/tiles`
    + '?fields=id,title,subtitle,key_root,key_quality,bpm'
    + '&filter[status][_eq]=published&sort=title&limit=-1';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Library request failed (${res.status})`);
  const body: unknown = await res.json();
  const data = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) throw new Error('Malformed library response');
  return data.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    title: String(row.title ?? ''),
    subtitle: row.subtitle == null ? null : String(row.subtitle),
    keyRoot: row.key_root == null ? null : String(row.key_root),
    keyQuality: row.key_quality === 'major' || row.key_quality === 'minor' ? row.key_quality : null,
    bpm: typeof row.bpm === 'number' ? row.bpm : null,
  }));
}

// Fetch one song's full document. `sheetdoc_json` is stored verbatim as the
// source of truth, but it still goes through parseSheetValue so a malformed
// row is rejected/backfilled exactly like a JSON file import.
export async function fetchLibraryDoc(id: string): Promise<SheetDoc> {
  const res = await fetch(`${LIBRARY_URL}/items/tiles/${encodeURIComponent(id)}?fields=sheetdoc_json`);
  if (!res.ok) throw new Error(`Library request failed (${res.status})`);
  const body: unknown = await res.json();
  return parseSheetValue((body as { data?: { sheetdoc_json?: unknown } } | null)?.data?.sheetdoc_json);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/library.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/library.ts src/library.test.ts
git commit -m "feat: library fetch module for the crf-admin tiles collection"
```

---

### Task 3: `LibraryOverlay` component + styles + DESIGN.md

**Files:**
- Create: `src/designer/LibraryOverlay.tsx`
- Modify: `src/index.css` (add `.library-search` to the input family at :404; add a new "Library row" family block after the overlay-action block ending at :429)
- Modify: `docs/DESIGN.md` (add the new family to the table)
- Test: `src/designer/LibraryOverlay.test.tsx`

**Interfaces:**
- Consumes: `fetchLibraryList`, `fetchLibraryDoc`, `LibraryEntry` from `../library` (Task 2); `SheetDoc` from `./sheetModel`.
- Produces: `export function LibraryOverlay({ onLoad, onClose }: { onLoad: (doc: SheetDoc) => void; onClose: () => void })` — fetches the list on mount; on row pick fetches the doc, calls `onLoad(doc)` then `onClose()`. Escape and backdrop click call `onClose()`.

- [ ] **Step 1: Write the failing test** — create `src/designer/LibraryOverlay.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LibraryOverlay } from './LibraryOverlay';
import { defaultDoc } from './sheetModel';

const fetchLibraryList = vi.hoisted(() => vi.fn());
const fetchLibraryDoc = vi.hoisted(() => vi.fn());
vi.mock('../library', () => ({ fetchLibraryList, fetchLibraryDoc }));

const entries = [
  { id: 'a1', title: 'Alouette', subtitle: 'French folk', keyRoot: 'G', keyQuality: 'major' as const, bpm: 100 },
  { id: 'b2', title: 'Barcarolle', subtitle: null, keyRoot: null, keyQuality: null, bpm: null },
];

beforeEach(() => {
  fetchLibraryList.mockReset().mockResolvedValue(entries);
  fetchLibraryDoc.mockReset().mockResolvedValue({ ...defaultDoc(), title: 'Alouette', items: [{ type: 'note', noteId: 'G' }] });
});

test('lists songs with their metadata once loaded', async () => {
  render(<LibraryOverlay onLoad={vi.fn()} onClose={vi.fn()} />);
  expect(screen.getByText(/loading library/i)).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /alouette/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /barcarolle/i })).toBeInTheDocument();
  expect(screen.getByText(/french folk · g major · 100 bpm/i)).toBeInTheDocument();
});

test('search filters by title and subtitle', async () => {
  render(<LibraryOverlay onLoad={vi.fn()} onClose={vi.fn()} />);
  await screen.findByRole('button', { name: /alouette/i });
  await userEvent.type(screen.getByRole('searchbox', { name: /search/i }), 'french');
  expect(screen.getByRole('button', { name: /alouette/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /barcarolle/i })).not.toBeInTheDocument();
  await userEvent.clear(screen.getByRole('searchbox', { name: /search/i }));
  await userEvent.type(screen.getByRole('searchbox', { name: /search/i }), 'zzz');
  expect(screen.getByText(/no matches/i)).toBeInTheDocument();
});

test('picking a song loads the parsed doc and closes', async () => {
  const onLoad = vi.fn();
  const onClose = vi.fn();
  render(<LibraryOverlay onLoad={onLoad} onClose={onClose} />);
  await userEvent.click(await screen.findByRole('button', { name: /alouette/i }));
  await waitFor(() => expect(onLoad).toHaveBeenCalled());
  expect(fetchLibraryDoc).toHaveBeenCalledWith('a1');
  expect(onLoad.mock.calls[0][0].title).toBe('Alouette');
  expect(onClose).toHaveBeenCalled();
});

test('a failed list fetch shows the error state and retry refetches', async () => {
  fetchLibraryList.mockRejectedValueOnce(new Error('boom'));
  render(<LibraryOverlay onLoad={vi.fn()} onClose={vi.fn()} />);
  expect(await screen.findByText(/couldn't reach the library/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /retry/i }));
  expect(await screen.findByRole('button', { name: /alouette/i })).toBeInTheDocument();
});

test('a failed doc fetch shows an inline error and keeps the overlay open', async () => {
  fetchLibraryDoc.mockRejectedValue(new Error('bad row'));
  const onClose = vi.fn();
  render(<LibraryOverlay onLoad={vi.fn()} onClose={onClose} />);
  await userEvent.click(await screen.findByRole('button', { name: /alouette/i }));
  expect(await screen.findByText(/couldn't load this song/i)).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});

test('Escape closes the overlay', async () => {
  const onClose = vi.fn();
  render(<LibraryOverlay onLoad={vi.fn()} onClose={onClose} />);
  await userEvent.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/designer/LibraryOverlay.test.tsx`
Expected: FAIL — cannot resolve `./LibraryOverlay`.

- [ ] **Step 3: Implement the component** — create `src/designer/LibraryOverlay.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import type { SheetDoc } from './sheetModel';
import { fetchLibraryList, fetchLibraryDoc, type LibraryEntry } from '../library';

// "Subtitle · G major · 100 bpm" — only the parts a song actually has.
function metaLine(e: LibraryEntry): string {
  const key = e.keyRoot ? `${e.keyRoot} ${e.keyQuality ?? ''}`.trim() : null;
  return [e.subtitle, key, e.bpm != null ? `${e.bpm} bpm` : null].filter(Boolean).join(' · ');
}

/**
 * Browse-and-pick overlay for the shared song library (crf-admin `tiles`
 * collection). Fetches the published-song metadata list once on open,
 * filters it client-side, and fetches the picked song's full document.
 * Read-only: nothing is written back to the library.
 */
export function LibraryOverlay({ onLoad, onClose }: {
  onLoad: (doc: SheetDoc) => void;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [listError, setListError] = useState(false);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pickError, setPickError] = useState(false);

  const loadList = useCallback(() => {
    setListError(false);
    setEntries(null);
    fetchLibraryList().then(setEntries).catch(() => setListError(true));
  }, []);
  useEffect(loadList, [loadList]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const shown = (entries ?? []).filter(e =>
    !q || e.title.toLowerCase().includes(q) || (e.subtitle ?? '').toLowerCase().includes(q));

  const pick = (id: string) => {
    setBusyId(id);
    setPickError(false);
    fetchLibraryDoc(id)
      .then(doc => { onLoad(doc); onClose(); })
      .catch(() => { setPickError(true); setBusyId(null); });
  };

  return (
    <div
      className="library-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/30 p-4"
      onClick={onClose}
    >
      <div
        className="overlay-card overlay-pop w-full max-w-md bg-white p-4"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Library"
      >
        <span className="overlay-label block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Library</span>
        <input
          type="search"
          className="library-search overlay-input w-full px-2 py-1.5 text-sm"
          placeholder="Search songs…"
          aria-label="Search songs"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        <div className="library-list mt-3 grid max-h-[50vh] gap-1.5 overflow-y-auto">
          {entries === null && !listError && (
            <p className="library-loading text-sm text-slate-500">Loading library…</p>
          )}
          {listError && (
            <div className="library-error grid gap-2">
              <p className="text-sm text-red-500" role="alert">Couldn't reach the library.</p>
              <button type="button" className="overlay-clear justify-self-start px-4 py-2 text-sm" onClick={loadList}>Retry</button>
            </div>
          )}
          {entries !== null && shown.length === 0 && !listError && (
            <p className="library-empty text-sm text-slate-500">No matches.</p>
          )}
          {shown.map(e => (
            <button
              key={e.id}
              type="button"
              className="library-row px-3 py-2 text-left"
              disabled={busyId !== null}
              onClick={() => pick(e.id)}
            >
              <span className="library-row-title block text-sm font-semibold text-slate-900">
                {e.title}{busyId === e.id ? ' …' : ''}
              </span>
              {metaLine(e) && (
                <span className="library-row-meta block text-xs text-slate-500">{metaLine(e)}</span>
              )}
            </button>
          ))}
          {pickError && (
            <p className="library-pick-error text-sm text-red-500" role="alert">Couldn't load this song.</p>
          )}
        </div>
        <div className="overlay-actions mt-4 flex justify-end">
          <button type="button" className="overlay-clear px-4 py-2 text-sm" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add the styles** — in `src/index.css`:

(a) Add `.library-search` to the input family selector list (line 404):

```css
.input-name, .input-tpr, .input-bpm, .input-email, .num, .tpl-name-input, .tpl-select, .overlay-input, .library-search {
```

(Note: `.library-search` also carries `.overlay-input` in its className, so this is belt-and-braces consistency with how the family list is documented — keep both.)

(b) After the overlay action-button block (the rule ending `.overlay-done:active, .confirm-ok:active, .overlay-clear:active, .confirm-cancel:active { … }` around line 429), add a new labelled family:

```css
/* Library rows: full-width pick targets in the Library overlay. Flat 2px ink
   outline with no resting shadow (a stack of shadowed rows reads as noise);
   hover fills the signature yellow like a selected segmented toggle, active
   uses a small hard press. */
.library-row {
  border: 2px solid var(--ink);
  border-radius: 0;
  background: var(--paper);
  transition: transform .08s ease, background .08s ease, box-shadow .08s ease;
}
.library-row:hover:not(:disabled) { background: var(--accent); box-shadow: var(--shadow-sm); transform: translate(-1px, -1px); }
.library-row:active:not(:disabled) { transform: translate(1px, 1px); box-shadow: none; }
.library-row:disabled { opacity: .55; }
```

- [ ] **Step 5: Document the family** — in `docs/DESIGN.md`, add a row to the "Button & control families" table (after the "Overlay action" row):

```markdown
| **Library row** | `.library-row` | Full-width pick target in the Library overlay: flat 2px ink outline, no resting shadow, hover fills `--accent` with the standard lift, small hard press |
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/designer/LibraryOverlay.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 7: Commit**

```bash
git add src/designer/LibraryOverlay.tsx src/designer/LibraryOverlay.test.tsx src/index.css docs/DESIGN.md
git commit -m "feat: LibraryOverlay — browse and pick songs from the shared library"
```

---

### Task 4: Library button in the Sheet Designer toolbar

**Files:**
- Modify: `src/designer/DesignerMode.tsx` (import + state near line 67, button in the `.designer-toolbar` after the New button at lines 306-311, overlay render next to `ConfirmOverlay` at lines 468-476)
- Modify: `src/index.css` (add `.btn-library` to the three Tier-1 selector lists at :195-220; widen the toolbar fixed-width exception at :264)
- Test: `src/designer/DesignerMode.test.tsx` (append)

**Interfaces:**
- Consumes: `LibraryOverlay` (Task 3). On pick: `dispatch({ type: 'load', doc })` — the existing undoable load action, same as Import JSON.

- [ ] **Step 1: Write the failing test** — append to `src/designer/DesignerMode.test.tsx` (reuse the file's existing render helper/props pattern if one exists; otherwise this standalone block works — check the top of the file for how `DesignerMode` is rendered and copy that setup):

```tsx
const fetchLibraryList = vi.hoisted(() => vi.fn());
const fetchLibraryDoc = vi.hoisted(() => vi.fn());
vi.mock('../library', () => ({ fetchLibraryList, fetchLibraryDoc }));

test('Library button opens the overlay and picking a song dispatches load', async () => {
  fetchLibraryList.mockResolvedValue([
    { id: 'a1', title: 'Alouette', subtitle: null, keyRoot: null, keyQuality: null, bpm: null },
  ]);
  const libDoc = { ...defaultDoc(), title: 'Alouette', items: [{ type: 'note' as const, noteId: 'G' }] };
  fetchLibraryDoc.mockResolvedValue(libDoc);
  const dispatch = vi.fn();
  render(
    <DesignerMode
      doc={defaultDoc()}
      dispatch={dispatch}
      onUndo={() => {}}
      onRedo={() => {}}
      canUndo={false}
      canRedo={false}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: /library/i }));
  await userEvent.click(await screen.findByRole('button', { name: /alouette/i }));
  await waitFor(() =>
    expect(dispatch).toHaveBeenCalledWith({ type: 'load', doc: libDoc }));
  // Overlay closed after the pick.
  expect(screen.queryByRole('dialog', { name: /library/i })).not.toBeInTheDocument();
});
```

(If the existing file already imports `render`, `screen`, `waitFor`, `userEvent`, `defaultDoc`, `DesignerMode`, don't re-import; just add the mock + test. Existing DesignerMode tests may already mock `../audio/usePiano` — leave that in place.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/designer/DesignerMode.test.tsx`
Expected: The new test FAILS — no button named "Library". (All pre-existing tests stay green.)

- [ ] **Step 3: Wire the button** — in `src/designer/DesignerMode.tsx`:

(a) Add the import next to the other overlay imports (after line 10):

```tsx
import { LibraryOverlay } from './LibraryOverlay';
```

(b) Add state next to `confirmNew`/`keyOpen` (line 67-68):

```tsx
const [libraryOpen, setLibraryOpen] = useState(false);
```

(c) In the `.designer-toolbar`, directly after the New button (line 311) and before the first `toolbar-sep`, add:

```tsx
<button
  className="btn-library text-sm font-semibold"
  aria-label="Library"
  title="Load a song from the library"
  onClick={() => setLibraryOpen(true)}
>Library</button>
```

(d) Next to the other overlay renders (after the `confirmNew` block ending line 476), add:

```tsx
{libraryOpen && (
  <LibraryOverlay
    onLoad={(d) => {
      if (playingIndex !== null) stopAudio();
      dispatch({ type: 'load', doc: d });
      setExportMsg('');
    }}
    onClose={() => setLibraryOpen(false)}
  />
)}
```

- [ ] **Step 4: Style the button** — in `src/index.css`:

(a) Add `.btn-library` to all three Tier-1 selector lists (base :195-200, hover :209-214, active :215-220), each time right after `.btn-load-json` — e.g. the base list becomes `…, .btn-shuffle, .btn-reset, .btn-embed, .btn-load-json, .btn-library, .btn-use-current, …` (repeat in the `:hover` and `:active` lists).

(b) The toolbar gives icon buttons a fixed square width; New is the only text-button exception (line 264). Add Library to the exception and update the comment:

```css
/* Glyph / icon buttons are a fixed square so the whole row matches; only the
   text buttons (New, Library) keep flexible width sized to their labels. */
.designer-toolbar button:not(.btn-new-sheet):not(.btn-library) {
  width: 2.5rem;
  padding: 0;
}
```

(c) Padding: verified — `.btn-new-sheet` has no padding utility in its className (`btn-new-sheet text-sm font-semibold`, DesignerMode.tsx:307) and no standalone padding rule in `index.css`; the toolbar height rule (:250-261) sizes it. Library uses the identical className shape (already done in Step 3c) — **no extra CSS beyond (a) and (b)**.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/designer/DesignerMode.test.tsx`
Expected: PASS including the new test.

- [ ] **Step 6: Commit**

```bash
git add src/designer/DesignerMode.tsx src/designer/DesignerMode.test.tsx src/index.css
git commit -m "feat: Library button in the designer toolbar loads songs from the shared library"
```

---

### Task 5: Library button in the SheetPlayer (viewer)

**Files:**
- Modify: `src/player/SheetPlayer.tsx` (import, `libraryOpen` state, button in the `group-load` block at lines 76-83, overlay render at the end of the component root)
- Test: `src/player/SheetPlayer.test.tsx` (append)

**Interfaces:**
- Consumes: `LibraryOverlay` (Task 3). On pick: `setLoaded(doc)` (the existing local override used by Load JSON) + `setMsg('Loaded from library.')`.

- [ ] **Step 1: Write the failing test** — append to `src/player/SheetPlayer.test.tsx`:

```tsx
const fetchLibraryList = vi.hoisted(() => vi.fn());
const fetchLibraryDoc = vi.hoisted(() => vi.fn());
vi.mock('../library', () => ({ fetchLibraryList, fetchLibraryDoc }));

test('Library button loads a picked song into the player', async () => {
  fetchLibraryList.mockResolvedValue([
    { id: 'a1', title: 'Alouette', subtitle: null, keyRoot: null, keyQuality: null, bpm: null },
  ]);
  fetchLibraryDoc.mockResolvedValue({ ...defaultDoc(), title: 'Alouette', items: [{ type: 'note' as const, noteId: 'D' }] });
  render(<SheetPlayer source={{ ...defaultDoc(), items: [] }} />);
  expect(screen.getByText(/no song/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /^library/i }));
  await userEvent.click(await screen.findByRole('button', { name: /alouette/i }));
  await waitFor(() => expect(document.querySelectorAll('.tile').length).toBeGreaterThan(0));
  expect(screen.queryByText(/no song/i)).not.toBeInTheDocument();
  // The source line shows the loaded song's title.
  expect(screen.getByText('Alouette')).toBeInTheDocument();
});
```

(The file already imports `render`, `screen`, `waitFor`, `userEvent`, `SheetPlayer`, `defaultDoc` — only add the mock + test.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/player/SheetPlayer.test.tsx`
Expected: The new test FAILS — no button named "Library". (Pre-existing 4 tests stay green.)

- [ ] **Step 3: Wire the button** — in `src/player/SheetPlayer.tsx`:

(a) Add the import:

```tsx
import { LibraryOverlay } from '../designer/LibraryOverlay';
```

(b) Add state next to `msg` (line 33):

```tsx
const [libraryOpen, setLibraryOpen] = useState(false);
```

(c) In the `group-load` block, directly after the `.btn-load-json` button (line 79), add:

```tsx
<button className="btn-library px-3 py-1 text-sm" onClick={() => setLibraryOpen(true)}>Library…</button>
```

(`.btn-library` was added to the Tier-1 outline family in Task 4, matching its neighbour `.btn-load-json`.)

(d) Render the overlay inside the component's root `<div className="sheet-player …">`, after the `<aside>`:

```tsx
{libraryOpen && (
  <LibraryOverlay
    onLoad={(d) => { setLoaded(d); setMsg('Loaded from library.'); }}
    onClose={() => setLibraryOpen(false)}
  />
)}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/player/SheetPlayer.test.tsx`
Expected: PASS including the new test.

- [ ] **Step 5: Commit**

```bash
git add src/player/SheetPlayer.tsx src/player/SheetPlayer.test.tsx
git commit -m "feat: Library button in the sheet player"
```

---

### Task 6: Full verification pass

**Files:** none new — verification only.

- [ ] **Step 1: Run the whole suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: tsc + Vite build succeed.

- [ ] **Step 4: Fix anything that surfaced, re-run, and commit any fixes**

```bash
git add -A && git commit -m "fix: library overlay lint/build fallout"   # only if fixes were needed
```
