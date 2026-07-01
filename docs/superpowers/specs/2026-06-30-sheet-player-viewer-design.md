# Sheet Player (view + playback only) — design

**Date:** 2026-06-30
**Status:** Approved design, pending spec review

## Goal

Add a **view-and-playback-only** surface for Note·Tiles sheets: it renders a sheet
read-only (no edit controls) and plays it back, with transport controls. It can be
loaded two ways — from a local tiles JSON file, or from a sheet encoded in the URL
hash. As part of this, tempo (BPM) becomes a **saved property of the song**, editable
in the Sheet Designer. Both viewers — the new `SheetPlayer` and the existing
`QuizViewer` — gain a live tempo (BPM) control and, for accessibility, a named
tile-size control (xs → xxl). These are view-time overrides that do not modify the
saved song.

## Non-goals

- No editing of the sheet from the player (no note entry, no layout/header edits).
- No quiz/blanking behaviour — that already exists in `QuizViewer`.
- No time-signature model. The beat grid stays synthetic (one note/rest = one beat);
  the count-in assumes 4/4. A real meter model is out of scope (YAGNI).
- No short-link/server storage — the payload lives in the URL hash, as today.

## Background (current state)

- Items are a flat sequence: `note | arrow | pause | break | section`
  (`src/designer/sheetModel.ts`). Notes carry pitch class only; octave is derived at
  playback (`src/audio/pitch.ts`).
- There is **no tempo or time signature** in the model. `tempoStyle` is a free-text
  header string. Existing playback uses a fixed `NOTE_DUR = 0.5s` per note.
- `itemsToPlayback(items)` (`src/audio/pitch.ts:149`) already yields the full melody
  with pauses as rests (`midi: null`) — the right source for a plain player.
- Sheet render is factored into reusable pieces: `SheetSurface`, `sheetLayout`,
  `innerTile` (used today by `QuizViewer`).
- Audio is `usePiano()` (`src/audio/usePiano.ts`): lazy smplr Soundfont, `playSequence`
  schedules notes on an `AudioContext` clock and drives an `onStep` cursor callback.
- Share/URL encoding (`src/quiz/encode.ts`): base64url of whole-doc JSON.
  `#edit=` carries a full `SheetDoc` (`readEditFromHash`); `#quiz=` carries
  `{ doc, quiz }`. `parseSheetJson` fills missing fields from `defaultDoc()`, so new
  doc fields default automatically on old files and links.

## Design

### 1. BPM as a saved song property

- **`sheetModel.ts`**
  - Add `bpm: number` to `SheetDoc`.
  - `defaultDoc()` sets `bpm: 120`.
  - Add action `{ type: 'setBpm'; bpm: number }`; reducer clamps to **20–300**
    (`Math.min(300, Math.max(20, Math.round(bpm)))`).
- **`history.ts`** — add `bpm` to the `changed()` field comparison so BPM edits create
  undo steps (and re-tapping the same value is a no-op step, matching `setKey`/header
  behaviour where relevant).
- **`json.ts` / `encode.ts`** — **no change required.** `parseSheetJson` already does
  `{ ...defaultDoc(), ...rest }`, so old JSON and old `#edit=`/`#quiz=` links load at
  `bpm: 120`. `encodeSheet`/`encodeQuiz` serialize the whole doc, so BPM rides along
  share links for free.

### 2. Designer — edit & save BPM

- **`DesignerControls.tsx`** — add a `control-bpm` group with a number `input-bpm`
  (style/family matching the existing `input-tpr` "Tiles per row" field), placed next
  to Transpose. `min={20} max={300}`, value `doc.bpm`, dispatching
  `{ type: 'setBpm', bpm }` on change. Distinct from the free-text `tempoStyle` header.
- Autosave (localStorage) and share links persist BPM through the existing paths.

### 3. Tempo-aware playback (one source of truth)

- Beat duration derives from BPM: `beatDur = 60 / bpm`; one playback step = one beat.
- Both viewers (`SheetPlayer` and `QuizViewer`) get a **live tempo override** seeded
  from `doc.bpm` and an on-screen BPM control; the override drives all playback
  (notes + metronome + count-in) but does **not** mutate the saved doc.
- **`QuizViewer.tsx`** — replace the fixed `NOTE_DUR = 0.5` with `60 / bpm` from its
  local tempo state (default `source.bpm`), and add a BPM control to its left panel.

### 3b. Accessibility — live tile-size override in the viewers

Larger tiles aid low-vision / motor accessibility. Both viewers expose a **named tile
size control (xs → xxl)**, mirroring the editor's size buttons but labelled, as a live
render-size override seeded from `doc.size`.

- **Shared scale** — add a named scale reusing the editor's existing px values
  (`[40, 52, 64, 80, 96, 112]`):

  | label | xs | s  | m  | l  | xl | xxl |
  |-------|----|----|----|----|----|-----|
  | px    | 40 | 52 | 64 | 80 | 96 | 112 |

  Defined once as `TILE_SIZE_SCALE` (label→px) in a shared module
  (`src/viewer/sizes.ts`). The editor keeps its current numeric buttons (unchanged);
  only the viewers use the labelled control.
- **Override, not an edit:** each viewer holds `const [sizePx, setSizePx] =
  useState(source.size)` (re-seeded when `source` changes). Rendering uses a derived
  `renderDoc = { ...activeDoc, size: sizePx }`; item indices are unchanged, so grading
  and answers in `QuizViewer` are unaffected. The saved doc is not modified.
- The selected label is the nearest scale step to `sizePx`; the control sets `sizePx`
  to the chosen step's px.

### 3c. Shared viewer controls

To avoid duplication between `SheetPlayer` and `QuizViewer`, factor two small,
self-contained controls into `src/viewer/`:

- `TempoControl` — `{ bpm, onBpm }`, a range slider + numeric (20–300) labelled with
  current BPM. Class family `viewer-tempo` / `input-tempo`.
- `TileSizeControl` — `{ sizePx, onSize }`, a row of labelled buttons from
  `TILE_SIZE_SCALE` (`aria-pressed` on the active step). Class family `viewer-size` /
  `btn-tile-size`.

Both are presentational (state lives in each viewer). They follow the brutalist control
families in `src/index.css`.

### 4. `SheetPlayer` component (`src/player/SheetPlayer.tsx`)

Props: `{ source: SheetDoc; embed?: boolean }`. `SheetPlayer` owns the loaded-doc
state itself (`const [loaded, setLoaded] = useState<SheetDoc | null>(null)`; the active
doc is `loaded ?? source`) and renders its own "Load JSON…" picker and empty state —
there is no separate wrapper component.

- **Local view state** (overrides, re-seeded when `source` changes, render-phase reset
  pattern as `QuizViewer` uses for `quizKey`): `bpm` (default `source.bpm`) and `sizePx`
  (default `source.size`). Neither mutates the doc.
- **Render:** `renderDoc = { ...activeDoc, size: sizePx }`; read-only sheet via
  `SheetSurface` + `sheetLayout(renderDoc).rows` +
  `innerTile(item, renderDoc.size, renderDoc.accidentalStyle)`. Section rows render as
  labels. No interactive cells, no edit affordances. Reuses the `is-playing` tile
  highlight for the moving cursor. (`activeDoc = loaded ?? source` — see props above.)
- **Transport bar** (`player-transport`):
  - `btn-play` ▶ Play — plays `itemsToPlayback(activeDoc.items)` at `beatDur = 60 / bpm`.
  - `btn-stop` ■ Stop.
  - `btn-loop` ⟳ Loop (toggle, `aria-pressed`).
  - `btn-metronome` 🎵 Metronome (toggle).
  - `btn-countin` Count-in / "1 bar" (toggle).
  - `<TempoControl bpm onBpm>` (§3c) — live tempo, seeded from `source.bpm`.
  - `<TileSizeControl sizePx onSize>` (§3b/§3c) — xs→xxl, seeded from `source.size`.
- **Audio status:** show "Loading piano…" / "Audio unavailable." like `QuizViewer`.

### 5. `usePiano.playSequence` — metronome + count-in (backward compatible)

Extend the signature with an options object (all optional; defaults preserve today's
behaviour, so `QuizViewer`'s existing call is unaffected):

```
playSequence(events, onStep?, opts?: {
  metronome?: boolean;     // click on each beat
  countInBeats?: number;   // clicks before the first note (0 = none)
  beatDur?: number;        // seconds per beat for the click grid; default = first event dur
  loop?: boolean;          // restart the body when finished
})
```

- **Click synth:** a short percussive tick generated on the existing `ctx` (oscillator
  + fast gain envelope, ~40ms) — no new sample to load. A small private helper inside
  `usePiano`.
- **Count-in:** schedule `countInBeats` clicks at `beatDur` spacing before the first
  note; the melody starts after the count-in. Plays **once** before the first pass.
- **Loop:** when `loop` is true, on the end-of-sequence boundary re-schedule the body
  (without the count-in) and continue the `onStep` cursor. `stop()` clears it.
- One bar = **4 beats** (4/4 assumed). The `SheetPlayer` passes `countInBeats = 4` when
  the count-in toggle is on, else `0`.

Implementation note: clicks and notes are scheduled on the same `AudioContext` timeline
so they cannot drift; the existing `timers`/`clearTimers` mechanism drives the visual
cursor and the loop boundary.

### 6. URL payload + route

- **`encode.ts`** — add `readViewFromHash(hash): SheetDoc | null` mirroring
  `readEditFromHash`, matching `/[#&]view=([^&]+)/` and decoding the same `SheetDoc`
  payload (reuse `encodeSheet` for producing links). A bare `#view` with no payload is
  not matched here; route activation is handled in `App.tsx`.
- **`App.tsx`** — add an embed branch (before the normal app shell, alongside the
  `#quiz=` branch): if `window.location.hash` contains a `view` key
  (`/[#&]view\b/`), render only `<SheetPlayer source={viewDoc} embed />` full-screen
  with no tabs/chrome. `viewDoc = readViewFromHash(hash) ?? defaultDoc()` (bare `#view`
  → empty player → "Load JSON…" loader).
- `SheetPlayer`'s **"Load JSON…"** picker (reusing `parseSheetJson` + `FileReader`, as
  `QuizViewerTab` does) is available even after a URL load, so a local file can override
  the view (`loaded` takes precedence over `source`).
- Code-split the player like the other embed surfaces (`lazy(() => import(...))`).

## Design-system compliance

Per `CLAUDE.md` + `docs/DESIGN.md`: all new controls (transport buttons, tempo input,
load button) reuse existing brutalist families in `src/index.css` (square corners,
`var(--ink)` borders, hard offset shadows, token colours). Add the new selectors to the
matching family lists rather than shipping one-off Tailwind. Every element gets a
contextual class name (`player-transport`, `btn-play`, `input-tempo`, …) alongside
utilities. Run the new-component checklist at the bottom of `docs/DESIGN.md`.

## Testing (TDD)

- **Model** (`sheetModel.test.ts`): `defaultDoc().bpm === 120`; `setBpm` clamps to
  20–300 and rounds; old JSON without `bpm` loads at 120 via `parseSheetJson`.
- **History** (`history` tests): a `setBpm` change is undoable.
- **Designer** (`DesignerControls`/`DesignerMode` tests): BPM input renders, shows
  `doc.bpm`, and dispatches `setBpm` on change.
- **Encode** (`encode.test.ts`): `readViewFromHash` round-trips a doc through
  `encodeSheet` and returns null on garbage / absent key.
- **Player** (`SheetPlayer.test.tsx`): renders tiles with **no** edit controls; shows
  the five transport controls + tempo control reflecting `source.bpm` + the xs→xxl size
  control reflecting `source.size`; changing the size control changes the rendered tile
  size; "Load JSON…" parses a file into the view. Audio is mocked (as in existing
  audio-touching tests).
- **Quiz viewer** (`QuizViewer` tests): BPM control adjusts playback tempo; tile-size
  control changes rendered tile size without affecting blanks/grading.
- **Shared controls** (`viewer` tests): `TileSizeControl` marks the nearest scale step
  active and emits the chosen px; `TempoControl` clamps 20–300.
- **playSequence**: count-in adds `countInBeats` clicks before the first note; metronome
  off by default keeps the existing call behaviour unchanged (regression guard for
  `QuizViewer`).

## Files touched

- `src/designer/sheetModel.ts` — `bpm` field, `defaultDoc`, `setBpm` action + reducer.
- `src/designer/history.ts` — `bpm` in `changed()`.
- `src/designer/DesignerControls.tsx` — BPM input.
- `src/audio/usePiano.ts` — click synth + `playSequence` options (metronome/count-in/loop).
- `src/quiz/QuizViewer.tsx` — local tempo + size overrides; BPM + tile-size controls; render via `renderDoc`.
- `src/quiz/encode.ts` — `readViewFromHash`.
- `src/viewer/sizes.ts` — **new** `TILE_SIZE_SCALE` (label→px).
- `src/viewer/TempoControl.tsx`, `src/viewer/TileSizeControl.tsx` — **new** shared controls.
- `src/player/SheetPlayer.tsx` — **new** component.
- `src/App.tsx` — `#view` embed branch + lazy import.
- `src/index.css` / `docs/DESIGN.md` — new control selectors / doc any new pattern.
- Tests alongside each.

## Open questions / assumptions

- Count-in fixed at 4 beats (4/4). Revisit only if a real meter model is added.
- Viewer tempo is a live override and is **not** written back to the saved doc.
```
