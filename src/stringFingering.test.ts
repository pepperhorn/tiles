import { tileAnnotations } from './stringFingering';
import type { Item } from './designer/sheetModel';

test('violin mode maps notes to fingering labels with keyboard note names', () => {
  const items: Item[] = [
    { type: 'note', noteId: 'E' },
    { type: 'note', noteId: 'Fs' },
    { type: 'note', noteId: 'G' },
  ];
  expect(tileAnnotations(items, 'violin', 'sharp')).toEqual({
    0: { main: 'D1', sub: 'E4', midi: 64 },
    1: { main: 'D2', sub: 'F♯4', midi: 66 },
    2: { main: 'D3', sub: 'G4', midi: 67 },
  });
});

test('cello mode chooses reachable cello placements for the same tile melody', () => {
  const items: Item[] = [
    { type: 'note', noteId: 'C' },
    { type: 'note', noteId: 'D' },
  ];
  expect(tileAnnotations(items, 'cello', 'sharp')).toEqual({
    0: { main: 'G4', sub: 'C3', midi: 48 },
    1: { main: 'D0', sub: 'D3', midi: 50 },
  });
});

test('instrument position filters constrain fingered placements while preserving open strings', () => {
  expect(tileAnnotations([{ type: 'note', noteId: 'E' }], 'violin', 'sharp', undefined, {
    violin: [2],
    cello: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4],
  })).toEqual({
    0: { main: '(2)G4', sub: 'E4', midi: 64 },
  });

  expect(tileAnnotations([{ type: 'note', noteId: 'C' }], 'cello', 'sharp', undefined, {
    violin: [1, 2, 3, 4],
    cello: [0.5],
  })).toEqual({
    0: { main: '(1/2)GH4', sub: 'C3', midi: 48 },
  });
});

test('Bb and Eb modes transpose written tile labels without changing the source items', () => {
  const items: Item[] = [
    { type: 'note', noteId: 'C' },
    { type: 'note', noteId: 'E' },
  ];
  expect(tileAnnotations(items, 'bb', 'sharp')).toEqual({
    0: { main: 'D', sub: '', noteId: 'D' },
    1: { main: 'F♯', sub: 'G♭', noteId: 'Fs' },
  });
  expect(tileAnnotations(items, 'eb', 'flat')).toEqual({
    0: { main: 'A', sub: '', noteId: 'A' },
    1: { main: 'D♭', sub: 'C♯', noteId: 'Cs' },
  });
});

test('pitch mode leaves note tiles unannotated', () => {
  expect(tileAnnotations([{ type: 'note', noteId: 'C' }], 'pitch', 'sharp')).toEqual({});
});
