import { itemsToPitches, itemsToPlayback, midiToItems, midiNoteName, chromaDir, autoArrowItems } from './pitch';
import type { Item } from '../designer/sheetModel';

const note = (id: string): Item => ({ type: 'note', noteId: id });
const arrow = (dir: 'up' | 'down'): Item => ({ type: 'arrow', dir });

test('chromaDir picks the shortest-path direction between pitch classes', () => {
  expect(chromaDir('C', 'E')).toBe(1);    // up a major third
  expect(chromaDir('C', 'A')).toBe(-1);   // down a minor third (nearer than up a sixth)
  expect(chromaDir('C', 'C')).toBe(0);    // same pitch class
  expect(chromaDir('C', 'Fs')).toBe(1);   // tritone resolves up
  expect(chromaDir('B', 'C')).toBe(1);    // wraps up a semitone
});

test('first note lands between C4 (60) and B4 (71)', () => {
  expect(itemsToPitches([note('C')])[0].midi).toBe(60);
  expect(itemsToPitches([note('B')])[0].midi).toBe(71);
});

test('subsequent notes pick the nearest octave', () => {
  // C(60) then B should drop to 59, not jump up to 71.
  expect(itemsToPitches([note('C'), note('B')]).map(p => p.midi)).toEqual([60, 59]);
});

test('an up arrow forces the next note higher', () => {
  expect(itemsToPitches([note('C'), arrow('up'), note('B')]).map(p => p.midi)).toEqual([60, 71]);
});

test('a down arrow forces the next note lower', () => {
  expect(itemsToPitches([note('B'), arrow('down'), note('C')]).map(p => p.midi)).toEqual([71, 60]);
});

test('all pitches stay within G3 (55) and G5 (79)', () => {
  const items = ['C', 'G', 'C', 'G', 'C', 'G'].flatMap(id => [arrow('up'), note(id)]);
  for (const p of itemsToPitches(items)) {
    expect(p.midi).toBeGreaterThanOrEqual(55);
    expect(p.midi).toBeLessThanOrEqual(79);
  }
});

test('itemsToPlayback yields rests (midi null) for pause tiles, keeping item indexes', () => {
  const steps = itemsToPlayback([note('C'), { type: 'pause' }, note('D')]);
  expect(steps).toEqual([
    { index: 0, midi: 60 },
    { index: 1, midi: null },
    { index: 2, midi: 62 },
  ]);
});

test('a pause does not break an arrow applying to the note after it', () => {
  const steps = itemsToPlayback([note('C'), arrow('up'), { type: 'pause' }, note('B')]);
  expect(steps.map(s => s.midi)).toEqual([60, null, 71]);
});

test('overrides substitute a note id for one cell', () => {
  const placed = itemsToPitches([note('C'), note('D')], { 1: 'E' });
  expect(placed[1].noteId).toBe('E');
});

test('midiNoteName uses the tile spelling and MIDI octave', () => {
  expect(midiNoteName('C', 60)).toBe('C4');
  expect(midiNoteName('Cs', 61)).toBe('C#4');
  expect(midiNoteName('Bb', 70)).toBe('Bb4');
  expect(midiNoteName('G', 55)).toBe('G3');
});

test('midiToItems maps pitch classes to note tiles', () => {
  expect(midiToItems([60, 62, 64]).map(it => it.type === 'note' ? it.noteId : it.type))
    .toEqual(['C', 'D', 'E']);
});

test('midiToItems inserts an up arrow on an upward octave leap', () => {
  // C4(60) up to C5(72): same pitch class, so an arrow is needed to climb.
  expect(midiToItems([60, 72])).toEqual([
    { type: 'note', noteId: 'C' },
    { type: 'arrow', dir: 'up' },
    { type: 'note', noteId: 'C' },
  ]);
});

test('midiToItems round-trips a melody contour through itemsToPitches', () => {
  const melody = [60, 64, 67, 64, 72, 60, 71];
  const placed = itemsToPitches(midiToItems(melody)).map(p => p.midi);
  // Pitch class is preserved exactly...
  expect(placed.map(m => m % 12)).toEqual(melody.map(m => m % 12));
  // ...and so is the up/down direction of every interval.
  const sign = (xs: number[]) => xs.slice(1).map((m, i) => Math.sign(m - xs[i]));
  expect(sign(placed)).toEqual(sign(melody));
});

test('every arrow midiToItems emits plays in the direction it points', () => {
  // Includes leaps the G3..G5 range cannot fully represent — those simply get no
  // (or a wrapped) note, but a contradictory arrow must never be emitted.
  const melody = [57, 68, 55, 79, 60, 79, 58, 72, 50, 81];
  const items = midiToItems(melody);
  const placed = itemsToPitches(items).map(p => p.midi);
  let pi = 0, prev: number | null = null, pending: 1 | -1 | 0 = 0;
  for (const it of items) {
    if (it.type === 'arrow') pending = it.dir === 'up' ? 1 : -1;
    else if (it.type === 'note') {
      const cur = placed[pi++];
      if (pending !== 0 && prev !== null) expect(Math.sign(cur - prev)).toBe(pending);
      prev = cur; pending = 0;
    }
  }
});

test('autoArrowItems marks one arrow at each melodic turn and trims orphans', () => {
  // C E G (up) then E C (down): one ↑ to open the run, one ↓ at the turn. The
  // pre-existing down-arrow after C is an orphan and must be dropped.
  const items: Item[] = [
    note('C'), arrow('down'), note('E'), note('G'), note('E'), note('C'),
  ];
  expect(autoArrowItems(items)).toEqual([
    note('C'), arrow('up'), note('E'), note('G'), arrow('down'), note('E'), note('C'),
  ]);
});

test('autoArrowItems keeps non-note items and ignores them for direction', () => {
  // The pause does not break the C→E run; the arrow sits right before its note.
  expect(autoArrowItems([note('C'), { type: 'pause' }, note('E')])).toEqual([
    note('C'), { type: 'pause' }, arrow('up'), note('E'),
  ]);
});

test('autoArrowItems adds no arrow for a single note or repeated pitch', () => {
  expect(autoArrowItems([note('C')])).toEqual([note('C')]);
  expect(autoArrowItems([note('C'), arrow('up'), note('C')])).toEqual([note('C'), note('C')]);
});
