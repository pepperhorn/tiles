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
