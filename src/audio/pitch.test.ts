import { itemsToPitches, midiToItems, midiNoteName } from './pitch';
import type { Item } from '../designer/sheetModel';

const note = (id: string): Item => ({ type: 'note', noteId: id });
const arrow = (dir: 'up' | 'down'): Item => ({ type: 'arrow', dir });

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
