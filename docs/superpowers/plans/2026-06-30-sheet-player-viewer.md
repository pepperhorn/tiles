# Sheet Player (view + playback) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a view-and-playback-only `SheetPlayer` (loadable from a tiles JSON file or a `#view=` URL), make BPM a saved song property editable in the designer, and give both viewers live tempo + accessibility tile-size controls.

**Architecture:** BPM joins `SheetDoc` (default 120) and rides existing autosave/URL serialization for free. A new read-only `SheetPlayer` composes the existing render primitives (`SheetSurface`/`sheetLayout`/`innerTile`) and audio (`usePiano`), which gains metronome/count-in/loop options scheduled on its existing AudioContext clock. Two small shared controls (`TempoControl`, `TileSizeControl`) are reused by `SheetPlayer` and `QuizViewer`; both apply tempo/size as view-time overrides that never mutate the doc.

**Tech Stack:** React 19 + TypeScript + Vite, Vitest + @testing-library/react (jsdom), smplr (Soundfont, lazy).

## Global Constraints

- Design system: neo-brutalist. New controls MUST reuse existing families in `src/index.css` (square corners, `var(--ink)` borders, hard offset shadows, token colours) — no one-off Tailwind like `rounded-lg border shadow-sm`. Follow `docs/DESIGN.md`.
- Every element gets a contextual class name alongside Tailwind utilities (e.g. `player-transport`, `btn-play`, `input-tempo`).
- Primary sans-serif font is Poppins (already loaded globally).
- BPM clamp range: **20–300**, integer.
- Tile size scale (label→px), reusing the editor's existing values: `xs 40 · s 52 · m 64 · l 80 · xl 96 · xxl 112`.
- Count-in = one bar = **4 beats** (4/4 assumed; no time-signature model).
- Test commands: `npx vitest run <path>` for one file; `npm test` for the suite. Lint: `npm run lint`. Build: `npm run build`.
- Commit after every task with the messages shown.

---

### Task 1: BPM on the SheetDoc model + history

**Files:**
- Modify: `src/designer/sheetModel.ts`
- Modify: `src/designer/history.ts:23-31` (the `changed()` function)
- Test: `src/designer/sheetModel.test.ts`, `src/designer/history.test.ts`

**Interfaces:**
- Produces: `SheetDoc.bpm: number`; action `{ type: 'setBpm'; bpm: number }`; `defaultDoc().bpm === 120`. The reducer clamps/rounds to 20–300.

- [ ] **Step 1: Write the failing tests**

Append to `src/designer/sheetModel.test.ts`:

```ts
test('defaultDoc has a 120 bpm', () => {
  expect(defaultDoc().bpm).toBe(120);
});

test('setBpm sets the tempo, clamped to 20–300 and rounded', () => {
  expect(reduce(defaultDoc(), { type: 'setBpm', bpm: 96 }).bpm).toBe(96);
  expect(reduce(defaultDoc(), { type: 'setBpm', bpm: 5 }).bpm).toBe(20);
  expect(reduce(defaultDoc(), { type: 'setBpm', bpm: 999 }).bpm).toBe(300);
  expect(reduce(defaultDoc(), { type: 'setBpm', bpm: 90.7 }).bpm).toBe(91);
});
```

Append to `src/designer/history.test.ts`:

```ts
test('a bpm change is an undoable step', () => {
  let h = initHistory(defaultDoc());
  h = historyReducer(h, { type: 'setBpm', bpm: 90 });
  expect(h.present.bpm).toBe(90);
  expect(h.past).toHaveLength(1);
  h = historyReducer(h, { type: 'undo' });
  expect(h.present.bpm).toBe(120);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/designer/sheetModel.test.ts src/designer/history.test.ts`
Expected: FAIL — `bpm` missing on type/default, `setBpm` not handled.

- [ ] **Step 3: Implement the model changes**

In `src/designer/sheetModel.ts`, add `bpm` to the `SheetDoc` type (after `accidentalStyle`):

```ts
  accidentalStyle: AccidentalStyle;
  bpm: number;
  items: Item[];
```

Add `bpm: 120` to the `defaultDoc()` return (after `accidentalStyle: 'sharp',`):

```ts
    accidentalStyle: 'sharp',
    bpm: 120,
    items: [],
```

Add the action to the `Action` union (after the `setLayout` line):

```ts
  | { type: 'setBpm'; bpm: number }
```

Add the reducer case (after the `setLayout` case in `reduce()`):

```ts
    case 'setBpm':        return { ...doc, bpm: Math.min(300, Math.max(20, Math.round(action.bpm))) };
```

In `src/designer/history.ts`, extend `changed()` — add `bpm` to the comparison chain (after the `accidentalStyle` term):

```ts
    || a.accidentalStyle !== b.accidentalStyle
    || a.bpm !== b.bpm
    || a.songKey !== b.songKey;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/designer/sheetModel.test.ts src/designer/history.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/designer/sheetModel.ts src/designer/history.ts src/designer/sheetModel.test.ts src/designer/history.test.ts
git commit -m "feat: add saved bpm to SheetDoc with setBpm action"
```

---

### Task 2: BPM input in the designer toolbar

**Files:**
- Modify: `src/designer/DesignerControls.tsx`
- Test: `src/designer/DesignerControls.test.tsx` (create)

**Interfaces:**
- Consumes: `{ type: 'setBpm'; bpm }` (Task 1), `SheetDoc.bpm`.

- [ ] **Step 1: Write the failing test**

Create `src/designer/DesignerControls.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignerControls } from './DesignerControls';
import { defaultDoc } from './sheetModel';

test('the BPM input shows the doc tempo and dispatches setBpm', async () => {
  const dispatch = vi.fn();
  render(<DesignerControls doc={{ ...defaultDoc(), bpm: 120 }} dispatch={dispatch} view="a4" onView={() => {}} />);
  const input = screen.getByLabelText(/bpm/i) as HTMLInputElement;
  expect(input.value).toBe('120');
  await userEvent.clear(input);
  await userEvent.type(input, '90');
  expect(dispatch).toHaveBeenLastCalledWith({ type: 'setBpm', bpm: 90 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/designer/DesignerControls.test.tsx`
Expected: FAIL — no element labelled "BPM".

- [ ] **Step 3: Add the BPM control**

In `src/designer/DesignerControls.tsx`, insert a new group immediately before the `control-transpose` group (after the `{sep}` that precedes it):

```tsx
      {sep}
      <div className="control-bpm flex items-center gap-2">
        <label className="text-sm font-medium text-slate-600 whitespace-nowrap" htmlFor="dBpm">BPM</label>
        <input
          id="dBpm"
          className="input-bpm px-2 py-1 text-sm w-20"
          type="number"
          min={20}
          max={300}
          value={doc.bpm}
          aria-label="BPM"
          onChange={e => dispatch({ type: 'setBpm', bpm: Number(e.target.value) })}
        />
      </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/designer/DesignerControls.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/designer/DesignerControls.tsx src/designer/DesignerControls.test.tsx
git commit -m "feat: add BPM input to the designer toolbar"
```

---

### Task 3: `#view=` URL decoding

**Files:**
- Modify: `src/quiz/encode.ts`
- Test: `src/quiz/encode.test.ts`

**Interfaces:**
- Produces: `readViewFromHash(hash: string): SheetDoc | null`. Encode side reuses existing `encodeSheet(doc)`.

- [ ] **Step 1: Write the failing tests**

Append to `src/quiz/encode.test.ts` (and add `readViewFromHash` to the import on line 1):

```ts
test('readViewFromHash loads a sheet from #view=', () => {
  const enc = encodeSheet(quiz().doc);
  expect(readViewFromHash(`#view=${enc}`)?.title).toBe('Twinkle ♯');
});

test('readViewFromHash returns null for an unrelated hash', () => {
  expect(readViewFromHash('#nope')).toBeNull();
});
```

Update the import line:

```ts
import { encodeQuiz, decodeQuiz, readQuizFromHash, encodeSheet, readEditFromHash, readViewFromHash } from './encode';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/quiz/encode.test.ts`
Expected: FAIL — `readViewFromHash` is not exported.

- [ ] **Step 3: Implement `readViewFromHash`**

In `src/quiz/encode.ts`, after `readEditFromHash` (line ~47), add:

```ts
/** Reads `#view=<base64url>` (a full sheet) from a URL hash; null if absent/invalid. */
export function readViewFromHash(hash: string): SheetDoc | null {
  const m = /[#&]view=([^&]+)/.exec(hash);
  if (!m) return null;
  try {
    return parseSheetJson(fromBase64Url(decodeURIComponent(m[1])));
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/quiz/encode.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/quiz/encode.ts src/quiz/encode.test.ts
git commit -m "feat: decode #view= sheet links"
```

---

### Task 4: Shared viewer controls (tile-size scale + TempoControl + TileSizeControl)

**Files:**
- Create: `src/viewer/sizes.ts`
- Create: `src/viewer/TileSizeControl.tsx`
- Create: `src/viewer/TempoControl.tsx`
- Test: `src/viewer/sizes.test.ts`, `src/viewer/TileSizeControl.test.tsx`, `src/viewer/TempoControl.test.tsx`

**Interfaces:**
- Produces:
  - `TILE_SIZE_SCALE: { label: string; px: number }[]` (6 steps, xs→xxl).
  - `nearestSizeLabel(px: number): string` — label of the closest scale step.
  - `<TileSizeControl sizePx: number; onSize: (px: number) => void />`.
  - `<TempoControl bpm: number; onBpm: (bpm: number) => void />`.

- [ ] **Step 1: Write the failing tests**

Create `src/viewer/sizes.test.ts`:

```ts
import { TILE_SIZE_SCALE, nearestSizeLabel } from './sizes';

test('the scale runs xs→xxl over the editor px values', () => {
  expect(TILE_SIZE_SCALE.map(s => s.label)).toEqual(['xs', 's', 'm', 'l', 'xl', 'xxl']);
  expect(TILE_SIZE_SCALE.map(s => s.px)).toEqual([40, 52, 64, 80, 96, 112]);
});

test('nearestSizeLabel snaps to the closest step', () => {
  expect(nearestSizeLabel(64)).toBe('m');
  expect(nearestSizeLabel(70)).toBe('m');
  expect(nearestSizeLabel(100)).toBe('xl');
  expect(nearestSizeLabel(999)).toBe('xxl');
});
```

Create `src/viewer/TileSizeControl.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TileSizeControl } from './TileSizeControl';

test('marks the active step and emits the chosen px', async () => {
  const onSize = vi.fn();
  render(<TileSizeControl sizePx={64} onSize={onSize} />);
  expect(screen.getByRole('button', { name: 'm' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'xxl' }));
  expect(onSize).toHaveBeenCalledWith(112);
});
```

Create `src/viewer/TempoControl.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { TempoControl } from './TempoControl';

test('shows current bpm and exposes a 20–300 range', () => {
  render(<TempoControl bpm={120} onBpm={() => {}} />);
  const slider = screen.getByLabelText(/tempo/i) as HTMLInputElement;
  expect(slider.value).toBe('120');
  expect(slider.min).toBe('20');
  expect(slider.max).toBe('300');
  expect(screen.getByText(/120 bpm/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/viewer/`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Implement the modules**

Create `src/viewer/sizes.ts`:

```ts
// Named tile-size steps for the accessibility size control, reusing the px
// values the editor offers. Shared by the SheetPlayer and the QuizViewer.
export const TILE_SIZE_SCALE: { label: string; px: number }[] = [
  { label: 'xs', px: 40 },
  { label: 's', px: 52 },
  { label: 'm', px: 64 },
  { label: 'l', px: 80 },
  { label: 'xl', px: 96 },
  { label: 'xxl', px: 112 },
];

/** Label of the scale step whose px is closest to `px`. */
export function nearestSizeLabel(px: number): string {
  return TILE_SIZE_SCALE.reduce((best, s) =>
    Math.abs(s.px - px) < Math.abs(best.px - px) ? s : best, TILE_SIZE_SCALE[0]).label;
}
```

Create `src/viewer/TileSizeControl.tsx`:

```tsx
import { TILE_SIZE_SCALE, nearestSizeLabel } from './sizes';

/** Accessibility tile-size selector (xs→xxl). Presentational: parent owns state. */
export function TileSizeControl({ sizePx, onSize }: { sizePx: number; onSize: (px: number) => void }) {
  const active = nearestSizeLabel(sizePx);
  return (
    <div className="viewer-size flex flex-col gap-1.5">
      <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400">Tile size</span>
      <div className="size-options flex flex-wrap gap-1" role="group" aria-label="Tile size">
        {TILE_SIZE_SCALE.map(s => (
          <button
            key={s.label}
            className="btn-tile-size px-2 py-1 text-xs uppercase"
            aria-pressed={active === s.label}
            onClick={() => onSize(s.px)}
          >{s.label}</button>
        ))}
      </div>
    </div>
  );
}
```

Create `src/viewer/TempoControl.tsx`:

```tsx
/** Live tempo (BPM) slider. Presentational: parent owns state. Clamps 20–300. */
export function TempoControl({ bpm, onBpm }: { bpm: number; onBpm: (bpm: number) => void }) {
  return (
    <div className="viewer-tempo flex flex-col gap-1.5">
      <div className="tempo-head flex items-center justify-between">
        <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400">Tempo</span>
        <span className="tempo-val text-xs font-semibold text-slate-600">{bpm} BPM</span>
      </div>
      <input
        className="input-tempo w-full"
        type="range" min={20} max={300} step={1}
        value={bpm}
        aria-label="Tempo (BPM)"
        onChange={e => onBpm(Math.min(300, Math.max(20, Number(e.target.value))))}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/viewer/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/viewer/
git commit -m "feat: shared viewer tempo + tile-size controls"
```

---

### Task 5: Metronome / count-in / loop in `usePiano.playSequence`

**Files:**
- Modify: `src/audio/usePiano.ts`

**Interfaces:**
- Produces: `playSequence(events, onStep?, opts?: { metronome?: boolean; countInBeats?: number; beatDur?: number; loop?: boolean }): Promise<void>`. Backward compatible — the existing two-arg call in `QuizViewer` is unchanged in behaviour (no count-in, no metronome, no loop).
- Note: the repo has no unit tests for `usePiano` (it depends on a live AudioContext + lazily-imported smplr). This task's wiring is verified through the mocked-`usePiano` component tests in Tasks 6–7 (which assert the `opts` passed to `playSequence`) plus manual playback. Keep the change additive and defaulted-off so it cannot regress existing callers.

- [ ] **Step 1: Add a click synth helper**

In `src/audio/usePiano.ts`, add a module-level helper above `export function usePiano()`:

```ts
// A short percussive metronome tick synthesised on the shared AudioContext — no
// extra sample to load. Scheduled at an absolute ctx time so it stays on the
// same clock as the notes and never drifts.
function scheduleClick(ctx: AudioContext, time: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 1600;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.35, time + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.05);
}
```

- [ ] **Step 2: Add a looping ref**

Inside `usePiano()`, next to `const timers = useRef<number[]>([]);`, add:

```ts
  const looping = useRef(false);
```

- [ ] **Step 3: Replace `playSequence` with the options-aware version**

Replace the whole `playSequence` `useCallback` (currently lines ~47-65) with:

```ts
  // Schedules notes and (optionally) a metronome click track + one-bar count-in,
  // and drives a visual cursor via onStep. With `loop`, the body re-arms on the
  // same clock until `stop()`. All timing rides ctx.currentTime so audio and the
  // cursor stay in lockstep. Defaults reproduce the original behaviour.
  const playSequence = useCallback(async (
    events: PlayEvent[],
    onStep?: (index: number | null) => void,
    opts: { metronome?: boolean; countInBeats?: number; beatDur?: number; loop?: boolean } = {},
  ) => {
    const { ctx, player } = await ensure();
    if (ctx.state === 'suspended') await ctx.resume();
    player.stop();
    clearTimers();
    looping.current = !!opts.loop;
    const beatDur = opts.beatDur ?? events[0]?.dur ?? 0.5;
    const countIn = Math.max(0, opts.countInBeats ?? 0);

    // Schedule one pass; returns its end time. `withCountIn` adds the lead-in clicks.
    const runOnce = (startAt: number, withCountIn: boolean): number => {
      let t = startAt;
      if (withCountIn) for (let i = 0; i < countIn; i++) { scheduleClick(ctx, t); t += beatDur; }
      for (const ev of events) {
        if (ev.midi != null) player.start({ note: ev.midi, time: t, duration: ev.dur * 0.9, velocity: 92 });
        if (opts.metronome) scheduleClick(ctx, t);
        if (onStep) {
          const at = Math.max(0, (t - ctx.currentTime) * 1000);
          timers.current.push(window.setTimeout(() => onStep(ev.index ?? null), at));
        }
        t += ev.dur;
      }
      return t;
    };

    let end = runOnce(ctx.currentTime + 0.06, countIn > 0);
    const arm = () => {
      const ms = Math.max(0, (end - ctx.currentTime) * 1000);
      timers.current.push(window.setTimeout(() => {
        if (looping.current) { end = runOnce(ctx.currentTime + 0.06, false); arm(); }
        else if (onStep) onStep(null);
      }, ms));
    };
    arm();
  }, [ensure]);
```

- [ ] **Step 4: Stop also cancels looping**

Replace the `stop` callback with:

```ts
  const stop = useCallback(() => { looping.current = false; engineRef.current?.player.stop(); clearTimers(); }, []);
```

- [ ] **Step 5: Typecheck + run the existing audio-dependent suite**

Run: `npm run build && npx vitest run src/audio/`
Expected: PASS (typecheck clean; existing tests unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/audio/usePiano.ts
git commit -m "feat: metronome, count-in, and loop options for playSequence"
```

---

### Task 6: `SheetPlayer` component

**Files:**
- Create: `src/player/SheetPlayer.tsx`
- Test: `src/player/SheetPlayer.test.tsx`

**Interfaces:**
- Consumes: `itemsToPlayback` (`src/audio/pitch.ts`), `SheetSurface`, `sheetLayout`, `innerTile`, `TILE_GAP` (`src/geometry`), `usePiano`, `parseSheetJson` (`src/designer/json`), `TempoControl`, `TileSizeControl`, `SheetDoc`/`defaultDoc`.
- Produces: `export function SheetPlayer({ source: SheetDoc; embed?: boolean })`.

- [ ] **Step 1: Write the failing test**

Create `src/player/SheetPlayer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SheetPlayer } from './SheetPlayer';
import { defaultDoc } from '../designer/sheetModel';

const playSequence = vi.hoisted(() => vi.fn());
vi.mock('../audio/usePiano', () => ({
  usePiano: () => ({ status: 'idle', playNote: vi.fn(), playSequence, stop: vi.fn() }),
}));

const doc = () => ({ ...defaultDoc(), bpm: 120, items: [
  { type: 'note' as const, noteId: 'C' }, { type: 'note' as const, noteId: 'E' }, { type: 'note' as const, noteId: 'G' },
] });

test('renders read-only tiles with transport controls but no edit controls', () => {
  render(<SheetPlayer source={doc()} />);
  for (const name of [/play/i, /stop/i, /loop/i, /metronome/i, /count-in/i]) {
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  }
  expect(screen.getByLabelText(/tempo/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'xxl' })).toBeInTheDocument();
  // No editing affordances from the designer.
  expect(screen.queryByLabelText(/tiles per row/i)).not.toBeInTheDocument();
  expect(document.querySelectorAll('.tile').length).toBeGreaterThan(0);
});

test('the tile-size control resizes the rendered tiles', async () => {
  render(<SheetPlayer source={doc()} />);
  expect((document.querySelector('.tile') as HTMLElement).style.width).toBe('64px');
  await userEvent.click(screen.getByRole('button', { name: 'xxl' }));
  expect((document.querySelector('.tile') as HTMLElement).style.width).toBe('112px');
});

test('Play hands playSequence the tempo-derived beat duration and 4-beat count-in', async () => {
  render(<SheetPlayer source={doc()} />);
  await userEvent.click(screen.getByRole('button', { name: /count-in/i }));
  await userEvent.click(screen.getByRole('button', { name: /^play/i }));
  const opts = playSequence.mock.calls.at(-1)![2];
  expect(opts.beatDur).toBeCloseTo(0.5); // 60 / 120
  expect(opts.countInBeats).toBe(4);
});

test('Load JSON loads a sheet into the empty player', async () => {
  render(<SheetPlayer source={{ ...defaultDoc(), items: [] }} />);
  expect(screen.getByText(/no song/i)).toBeInTheDocument();
  const json = JSON.stringify({ ...defaultDoc(), items: [{ type: 'note', noteId: 'D' }] });
  const file = new File([json], 'song.json', { type: 'application/json' });
  await userEvent.upload(screen.getByLabelText(/load json/i), file);
  expect(await screen.findByText(/no song/i, {}, { timeout: 1000 }).catch(() => null)).toBeNull();
  expect(document.querySelectorAll('.tile').length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/player/SheetPlayer.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `SheetPlayer`**

Create `src/player/SheetPlayer.tsx`:

```tsx
import { useMemo, useRef, useState } from 'react';
import type { SheetDoc } from '../designer/sheetModel';
import { parseSheetJson } from '../designer/json';
import { sheetLayout } from '../designer/layout';
import { SheetSurface } from '../designer/SheetSurface';
import { innerTile } from '../designer/tileRender';
import { itemsToPlayback } from '../audio/pitch';
import { usePiano } from '../audio/usePiano';
import { TILE_GAP } from '../geometry';
import { TempoControl } from '../viewer/TempoControl';
import { TileSizeControl } from '../viewer/TileSizeControl';

/**
 * View-and-playback-only sheet surface: renders a sheet read-only and plays it
 * back (with metronome, one-bar count-in, and loop). Tempo and tile size are
 * live view-time overrides seeded from the doc; neither mutates the source.
 */
export function SheetPlayer({ source, embed = false }: { source: SheetDoc; embed?: boolean }) {
  const [loaded, setLoaded] = useState<SheetDoc | null>(null);
  const active = loaded ?? source;

  // View-time overrides, re-seeded whenever the active doc changes (render-phase
  // reset pattern, as QuizViewer uses for its quizKey).
  const [seed, setSeed] = useState<SheetDoc>(active);
  const [bpm, setBpm] = useState(active.bpm);
  const [sizePx, setSizePx] = useState(active.size);
  if (seed !== active) { setSeed(active); setBpm(active.bpm); setSizePx(active.size); }

  const [loop, setLoop] = useState(false);
  const [metronome, setMetronome] = useState(false);
  const [countIn, setCountIn] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const piano = usePiano();

  const renderDoc = useMemo(() => ({ ...active, size: sizePx }), [active, sizePx]);
  const { rows } = sheetLayout(renderDoc);

  const play = () => {
    const beatDur = 60 / bpm;
    const events = itemsToPlayback(active.items).map(s => ({ midi: s.midi, dur: beatDur, index: s.index }));
    void piano.playSequence(events, setPlayingIndex, { metronome, countInBeats: countIn ? 4 : 0, beatDur, loop });
  };
  const stop = () => { piano.stop(); setPlayingIndex(null); };

  const onUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { try { setLoaded(parseSheetJson(String(reader.result))); setMsg('Loaded JSON.'); } catch { setMsg('Invalid sheet JSON.'); } };
    reader.onerror = () => setMsg('Could not read file.');
    reader.readAsText(file);
  };

  const sheet = (
    <SheetSurface doc={renderDoc}>
      <div className="sheet-body flex flex-col gap-1.5">
        {rows.map((row, ri) =>
          row.kind === 'section'
            ? <div key={ri} className="row-section font-semibold text-slate-700 mt-2">{row.text}</div>
            : (
              <div key={ri} className="row-tiles flex flex-wrap" style={{ gap: TILE_GAP }}>
                {row.cells.map(cell => (
                  <div key={cell.index} className={`tile-slot ${playingIndex === cell.index ? 'is-playing' : ''}`}>
                    {innerTile(cell.item, renderDoc.size, renderDoc.accidentalStyle)}
                  </div>
                ))}
              </div>
            ))}
        {active.items.length === 0 && <div className="empty text-slate-400 text-sm">No song loaded.</div>}
      </div>
    </SheetSurface>
  );

  const controls = (
    <div className="player-controls flex flex-col gap-4">
      <div className="group group-load grid gap-2 border-b border-slate-200 pb-4">
        <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400">Sheet</span>
        <div className="config-source text-xs text-slate-500">{active.title?.trim() || (loaded ? 'uploaded JSON' : 'shared sheet')}</div>
        <button className="btn-load-json px-3 py-1 text-sm" onClick={() => fileRef.current?.click()}>Load JSON…</button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Load JSON"
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
        {msg && <div className="config-msg text-xs text-slate-500 break-all">{msg}</div>}
      </div>

      <div className="group group-transport player-transport grid gap-2">
        <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400">Playback</span>
        <div className="transport-actions grid grid-cols-2 gap-2">
          <button className="btn-play px-3 py-2 text-sm font-semibold" onClick={play}>▶ Play</button>
          <button className="btn-stop px-3 py-2 text-sm font-semibold" onClick={stop}>■ Stop</button>
          <button className="btn-loop px-3 py-2 text-sm" aria-pressed={loop} onClick={() => setLoop(v => !v)}>⟳ Loop</button>
          <button className="btn-metronome px-3 py-2 text-sm" aria-pressed={metronome} onClick={() => setMetronome(v => !v)}>🎵 Metronome</button>
          <button className="btn-countin px-3 py-2 text-sm col-span-2" aria-pressed={countIn} onClick={() => setCountIn(v => !v)}>Count-in (1 bar)</button>
        </div>
        {piano.status === 'loading' && <p className="text-xs text-slate-400">Loading piano…</p>}
        {piano.status === 'error' && <p className="text-xs text-red-500">Audio unavailable.</p>}
      </div>

      <TempoControl bpm={bpm} onBpm={setBpm} />
      <TileSizeControl sizePx={sizePx} onSize={setSizePx} />
    </div>
  );

  return (
    <div className={`sheet-player flex flex-col lg:grid lg:grid-cols-[320px_1fr] ${embed ? 'h-[100dvh]' : 'h-full'} lg:h-full`}>
      <main className="stage order-1 lg:order-2 flex-1 lg:flex-none min-h-0 overflow-auto p-4 lg:p-8 border-b border-slate-200 lg:border-b-0">
        {sheet}
      </main>
      <aside className="player-panel no-print order-2 lg:order-1 basis-[45%] lg:basis-auto shrink-0 lg:shrink min-h-0 overflow-y-auto bg-white lg:border-r lg:border-slate-200 p-5">
        {controls}
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/player/SheetPlayer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/player/SheetPlayer.tsx src/player/SheetPlayer.test.tsx
git commit -m "feat: read-only SheetPlayer with transport, tempo, and size controls"
```

---

### Task 7: Tempo + size controls in `QuizViewer`

**Files:**
- Modify: `src/quiz/QuizViewer.tsx`
- Test: `src/quiz/QuizViewer.test.tsx` (create)

**Interfaces:**
- Consumes: `TempoControl`, `TileSizeControl` (Task 4).
- Behaviour change: playback tempo now comes from a local `bpm` (default `source.bpm`); rendering uses a `renderDoc` whose `size` is the local override. Item indices, blanks, and grading are unchanged.

- [ ] **Step 1: Write the failing test**

Create `src/quiz/QuizViewer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizViewer } from './QuizViewer';
import { defaultDoc } from '../designer/sheetModel';

vi.mock('../audio/usePiano', () => ({
  usePiano: () => ({ status: 'idle', playNote: vi.fn(), playSequence: vi.fn(), stop: vi.fn() }),
}));

const source = () => ({ ...defaultDoc(), bpm: 120, items: [
  { type: 'note' as const, noteId: 'C' }, { type: 'note' as const, noteId: 'E' },
  { type: 'note' as const, noteId: 'G' }, { type: 'note' as const, noteId: 'C' },
] });

test('the quiz viewer exposes tempo and tile-size controls', () => {
  render(<QuizViewer source={source()} preset={{ knownPct: 0.6, seed: 1 }} />);
  expect(screen.getByLabelText(/tempo/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'xxl' })).toBeInTheDocument();
});

test('the size control resizes the rendered blank cells', async () => {
  render(<QuizViewer source={source()} preset={{ knownPct: 0.5, seed: 1 }} />);
  await userEvent.click(screen.getByRole('button', { name: 'xxl' }));
  const cell = document.querySelector('.quiz-cell') as HTMLElement;
  expect(cell.style.width).toBe('112px');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/quiz/QuizViewer.test.tsx`
Expected: FAIL — no tempo/size controls.

- [ ] **Step 3: Wire tempo + size into `QuizViewer`**

In `src/quiz/QuizViewer.tsx`:

(a) Add imports at the top:

```tsx
import { TempoControl } from '../viewer/TempoControl';
import { TileSizeControl } from '../viewer/TileSizeControl';
```

(b) Remove the module constant `const NOTE_DUR = 0.5;` (replaced by tempo state below).

(c) After `const piano = usePiano();` (line ~38), add the override state and a derived render doc:

```tsx
  const [bpm, setBpm] = useState(source.bpm);
  const [sizePx, setSizePx] = useState(source.size);
  // Re-seed overrides when the underlying song changes (alongside the quizKey reset).
```

In the existing `quizKey` reset block, also reset the overrides:

```tsx
  if (quizKey.s !== source || quizKey.b !== blanks) {
    setQuizKey({ s: source, b: blanks });
    setAnswers({});
    setVerdicts(null);
    setSelected(null);
    setBpm(source.bpm);
    setSizePx(source.size);
  }
```

After `const { rows } = sheetLayout(source);`, change rendering to use a sized doc:

```tsx
  const renderDoc = { ...source, size: sizePx };
  const { rows } = sheetLayout(renderDoc);
```

(Delete the original `const { rows } = sheetLayout(source);` line so `rows` is declared once.)

(d) Replace `NOTE_DUR` usage in `playSong` with the tempo-derived duration:

```tsx
  const playSong = (withAnswers: boolean) => {
    const beatDur = 60 / bpm;
    const overrides = withAnswers ? answers : {};
    const placed = itemsToPitches(source.items, overrides);
    const events = placed.map(p => {
      const muted = withAnswers && blankSet.has(p.index) && answers[p.index] === undefined;
      return { midi: muted ? null : p.midi, dur: beatDur, index: p.index };
    });
    void piano.playSequence(events, setPlayingIndex);
  };
```

(e) In the `sheet` JSX, render through `renderDoc` instead of `source` so the size override applies. Change the `SheetSurface` open tag and the two size references:

```tsx
  const sheet = (
    <SheetSurface doc={renderDoc}>
```

```tsx
                      return <div key={cell.index} className={`tile-slot ${playing ? 'is-playing' : ''}`}>{innerTile(item, renderDoc.size, renderDoc.accidentalStyle)}</div>;
```

```tsx
                        style={{ width: renderDoc.size, height: renderDoc.size, boxSizing: 'border-box', boxShadow: ring, border: given ? 'none' : '2px dashed #94a3b8', borderRadius: 0 }}
```

```tsx
                        {given ? <Tile kind="note" note={noteById(given)!} size={renderDoc.size} accidental={renderDoc.accidentalStyle} /> : null}
```

(f) Add the two controls into the `controls` block — insert after the `group-audio` div and before `group-pick`:

```tsx
      <TempoControl bpm={bpm} onBpm={setBpm} />
      <TileSizeControl sizePx={sizePx} onSize={setSizePx} />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/quiz/QuizViewer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/quiz/QuizViewer.tsx src/quiz/QuizViewer.test.tsx
git commit -m "feat: tempo + tile-size controls in the quiz viewer"
```

---

### Task 8: `#view` embed route in `App`

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `readViewFromHash` (Task 3), `SheetPlayer` (Task 6), `encodeSheet` (for the test only).

- [ ] **Step 1: Write the failing test**

Append to `src/App.test.tsx`:

```tsx
import { encodeSheet } from './quiz/encode';
import { defaultDoc } from './designer/sheetModel';

test('a #view= link renders only the player, no mode tabs', async () => {
  window.location.hash = `#view=${encodeSheet({ ...defaultDoc(), items: [{ type: 'note', noteId: 'C' }] })}`;
  render(<App />);
  expect(await screen.findByRole('button', { name: /^play/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /sheet designer/i })).not.toBeInTheDocument();
  window.location.hash = '';
});
```

(Add the two imports to the existing import block if not already present.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — the designer tab still renders; no Play button.

- [ ] **Step 3: Wire the route**

In `src/App.tsx`:

(a) Add `readViewFromHash` to the encode import (line 3):

```tsx
import { readQuizFromHash, readEditFromHash, readViewFromHash, DEFAULT_PRESET, type QuizPreset } from './quiz/encode';
```

(b) Add the lazy import next to the other lazy components (after the `QuizViewer` line ~14):

```tsx
const SheetPlayer = lazy(() => import('./player/SheetPlayer').then(m => ({ default: m.SheetPlayer })));
```

(c) Add the embed branch — immediately before the existing `embedQuiz` block (line ~65):

```tsx
  // View mode: #view=<base64url> (or bare #view) renders only the standalone
  // read-only player. A bare #view with no/invalid payload opens it empty so a
  // local JSON file can be loaded.
  const viewActive = /[#&]view\b/.test(window.location.hash);
  const viewDoc = useMemo(() => readViewFromHash(window.location.hash) ?? defaultDoc(), []);
  if (viewActive) return (
    <Suspense fallback={<ModeFallback />}>
      <SheetPlayer source={viewDoc} embed />
    </Suspense>
  );
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: render the SheetPlayer for #view links"
```

---

### Task 9: Brutalist styling + docs + full green check

**Files:**
- Modify: `src/index.css`
- Modify: `docs/DESIGN.md`

**Interfaces:** none (styling + docs only).

- [ ] **Step 1: Add the new control selectors to existing families**

In `src/index.css`:

(a) Segmented toggle family — add the new toggle/size buttons to the selector list at `.btn-size, .btn-paper, .btn-orient, ...` (line ~345) and to its `[aria-pressed='true']` list (line ~353):

```css
.btn-size, .btn-paper, .btn-orient, .btn-type, .btn-mode, .btn-inputmode, .btn-inputmode-switch, .btn-view,
.btn-tile-size, .btn-loop, .btn-metronome, .btn-countin,
.palette-acc-toggle, .palette-autoupdown {
```

```css
.btn-size[aria-pressed='true'], .btn-paper[aria-pressed='true'],
.btn-orient[aria-pressed='true'], .btn-type[aria-pressed='true'],
.btn-mode[aria-pressed='true'], .btn-inputmode[aria-pressed='true'], .btn-view[aria-pressed='true'],
.btn-tile-size[aria-pressed='true'], .btn-loop[aria-pressed='true'],
.btn-metronome[aria-pressed='true'], .btn-countin[aria-pressed='true'],
.palette-acc-toggle[aria-pressed='true'],
.palette-autoupdown[aria-pressed='true'] { background: var(--accent); }
```

(b) Input family — add `.input-bpm` to the `.input-name, .input-tpr, ...` list (line ~401):

```css
.input-name, .input-tpr, .input-bpm, .input-email, .num, .tpl-name-input, .tpl-select, .overlay-input {
```

(`.btn-play` and `.btn-stop` are already in the Tier-1 outline family; `.input-tempo` is already in the slider family — no change needed for those.)

- [ ] **Step 2: Document the surface in DESIGN.md**

Add a short note to `docs/DESIGN.md` under the relevant controls section (no new pattern — record reuse):

```markdown
### Viewer controls (SheetPlayer / QuizViewer)

The read-only viewers reuse existing families: transport Play/Stop use the Tier-1
outline button family (`.btn-play` / `.btn-stop`); Loop/Metronome/Count-in and the
`xs–xxl` tile-size buttons use the segmented-toggle family (`aria-pressed` fills
`--accent`); the BPM number input uses the input family (`.input-bpm`); the tempo
slider uses the range-slider family (`.input-tempo`). No new pattern was introduced.
```

- [ ] **Step 3: Run the full suite, lint, and build**

Run: `npm test && npm run lint && npm run build`
Expected: all PASS — green suite, no lint errors, successful tsc + Vite build.

- [ ] **Step 4: Commit**

```bash
git add src/index.css docs/DESIGN.md
git commit -m "style: brutalist families for viewer controls + DESIGN.md note"
```

---

### Task 10: Document the tiles JSON format + URL encoding spec

**Files:**
- Create: `docs/FORMATS.md`
- Modify: `CLAUDE.md` (add one pointer line under "Working in this repo")

**Interfaces:** none (documentation only). This task reflects the model as it stands *after* Task 1 (so it includes `bpm`) and Task 3 (so it includes `#view=`).

- [ ] **Step 1: Write the format reference**

Create `docs/FORMATS.md`:

```markdown
# Note·Tiles data formats

Two interchange formats describe a sheet: the **tiles JSON** file (download/upload)
and the **URL hash** encoding (share/embed links). Both carry the same core
artifact — a `SheetDoc`.

## Tiles JSON

A tiles JSON file is a `SheetDoc` object (see `src/designer/sheetModel.ts`). On
**export** (`serializeDoc`, `src/designer/json.ts`) a derived, read-only `midi`
array is appended for convenience; on **import** (`parseSheetJson`) the `midi`
field is stripped and any missing fields are filled from `defaultDoc()`, so older
or partial files still load.

### SheetDoc fields

| Field | Type | Notes |
|-------|------|-------|
| `part` | string | Header: part label (e.g. "LH"). |
| `title` | string | Song title. |
| `subtitle` | string | Header subtitle. |
| `composer` | string | Header composer. |
| `tempoStyle` | string | Free-text tempo/style (e.g. "Allegro"). Not the numeric BPM. |
| `songKey` | `{ root: string \| null; quality: 'major' \| 'minor' \| null }` | `root` is a note id; `null` = no key set. |
| `tilesPerRow` | `number \| 'auto'` | Wrap width; `'auto'` fits to page. |
| `size` | number | Tile size in px. |
| `paper` | `'A4' \| 'A3' \| 'Letter' \| 'Legal'` | Page size. |
| `orientation` | `'portrait' \| 'landscape'` | Page orientation. |
| `accidentalStyle` | `'sharp' \| 'flat'` | How accidentals are spelled. |
| `bpm` | number | Playback tempo, 20–300. Defaults to 120 on files without it. |
| `items` | `Item[]` | The sheet content, in order (see below). |

### Item types

Each entry in `items` is one of:

| `type` | Shape | Meaning |
|--------|-------|---------|
| `note` | `{ type: 'note'; noteId: string }` | A pitch-class tile. Octave is derived at playback, not stored. |
| `arrow` | `{ type: 'arrow'; dir: 'up' \| 'down' }` | Sets the melodic run direction for following notes. |
| `pause` | `{ type: 'pause' }` | A rest (sounds as silence during playback). |
| `break` | `{ type: 'break' }` | Forces a new row; no sound. |
| `section` | `{ type: 'section'; text: string }` | A labelled section header; no sound. |

`noteId` values come from the tile set (`src/notes.ts`); accidentals use an `s`
suffix internally (e.g. `Cs` = C♯).

### Derived `midi` (export only)

`serializeDoc` adds `midi: { index, midi, name }[]` — the playable melody with
concrete octaves resolved (same logic as playback). It is informational and is
discarded on import; it never round-trips into the model.

### Minimal example

```json
{
  "part": "", "title": "Scale", "subtitle": "", "composer": "", "tempoStyle": "",
  "songKey": { "root": null, "quality": null },
  "tilesPerRow": "auto", "size": 64, "paper": "A4", "orientation": "portrait",
  "accidentalStyle": "sharp", "bpm": 120,
  "items": [
    { "type": "note", "noteId": "C" },
    { "type": "note", "noteId": "D" },
    { "type": "pause" },
    { "type": "note", "noteId": "E" }
  ]
}
```

## URL hash encoding

Share/embed links carry a sheet in the URL **hash fragment**, base64url-encoded
(see `src/quiz/encode.ts`). Encoding: JSON → UTF-8 bytes → base64 →
URL-safe (`+`→`-`, `/`→`_`, trailing `=` stripped). Because the payload lives in
the hash, it never reaches the server; there is no length limit beyond the
browser's URL cap, so very large sheets make very long links.

| Hash key | Payload (decoded JSON) | Opens | Producer / consumer |
|----------|------------------------|-------|---------------------|
| `#edit=` | a `SheetDoc` | the designer, seeded with the sheet | `encodeSheet` / `readEditFromHash` |
| `#view=` | a `SheetDoc` | the read-only `SheetPlayer` (full-screen) | `encodeSheet` / `readViewFromHash` |
| `#quiz=` | `{ doc: SheetDoc, quiz: { knownPct, seed } }` | the standalone quiz player | `encodeQuiz` / `readQuizFromHash` |

Notes:
- `#edit=` and `#view=` share the **same payload** (a bare `SheetDoc`); only the
  surface that opens differs.
- A bare `#view` with no/invalid payload opens the player empty so a local JSON
  file can be loaded.
- `#quiz=` also accepts a bare `SheetDoc` (no `quiz` addon), which decodes with the
  default difficulty preset.
- The `quiz` addon stores difficulty *parameters* (`knownPct`, `seed`), not fixed
  blanks, so a taker can adjust difficulty from the shared starting point.

### Link shape

```
https://<host>/<path>#view=<base64url(JSON.stringify(sheetDoc))>
```
```

- [ ] **Step 2: Add a pointer from CLAUDE.md**

In `CLAUDE.md`, under "## Working in this repo", add a bullet:

```markdown
- Data formats (tiles JSON + share-link URL encoding) are documented in `docs/FORMATS.md`.
```

- [ ] **Step 3: Verify the doc matches the code**

Run: `npx vitest run src/quiz/encode.test.ts src/designer/json.test.ts`
Expected: PASS (the tests that exercise the documented encode/parse paths stay green; the doc is consistent with them).

- [ ] **Step 4: Commit**

```bash
git add docs/FORMATS.md CLAUDE.md
git commit -m "docs: document tiles JSON and URL hash encoding formats"
```

---

## Self-Review

**Spec coverage:**
- BPM saved on the song → Task 1 (model + history), Task 2 (designer input). Defaults on old files/links automatically via `defaultDoc()` (verified by Task 1 default test + existing `parseSheetJson` behaviour). ✓
- Tempo-aware playback in both viewers → Task 6 (`SheetPlayer` `beatDur = 60/bpm`), Task 7 (`QuizViewer` replaces `NOTE_DUR`). ✓
- Live tempo control in both viewers → `TempoControl` (Task 4), wired in Tasks 6 & 7. ✓
- Accessibility xs→xxl tile-size control in both viewers → `TileSizeControl` + `TILE_SIZE_SCALE` (Task 4), wired in Tasks 6 & 7; overrides via `renderDoc`. ✓
- Metronome + 1-bar count-in + loop → Task 5 (`playSequence` opts), surfaced by `SheetPlayer` (Task 6). ✓
- `#view=` URL payload + bare `#view` loader → Task 3 (`readViewFromHash`), Task 8 (App route), Task 6 (Load JSON empty state). ✓
- Read-only render reusing primitives → Task 6 (asserted: no editor controls, tiles present). ✓
- Design-system compliance → Task 9 (selectors added to existing families + DESIGN.md note). ✓
- Tiles JSON format + URL encoding documented in markdown → Task 10 (`docs/FORMATS.md` + CLAUDE.md pointer), reflecting `bpm` (Task 1) and `#view=` (Task 3). ✓
- Tests for each piece → present in Tasks 1–8. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `setBpm`/`bpm` consistent across Tasks 1–2, 6–8. `playSequence(events, onStep?, opts?)` defined in Task 5 and called with that exact shape in Tasks 6–7. `TileSizeControl({sizePx,onSize})` / `TempoControl({bpm,onBpm})` defined in Task 4 and used with those props in Tasks 6–7. `readViewFromHash` defined in Task 3, consumed in Task 8. `renderDoc` size override consistent in Tasks 6–7. ✓
