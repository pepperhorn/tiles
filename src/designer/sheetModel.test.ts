import { defaultDoc, reduce, formatKey } from './sheetModel';

test('insertNote appends a note item', () => {
  const d = reduce(defaultDoc(), { type: 'insertNote', noteId: 'C' });
  expect(d.items).toEqual([{ type: 'note', noteId: 'C' }]);
});

test('sharpenLast/flattenLast transform the last note only', () => {
  let d = reduce(defaultDoc(), { type: 'insertNote', noteId: 'C' });
  d = reduce(d, { type: 'sharpenLast' });
  expect(d.items.at(-1)).toEqual({ type: 'note', noteId: 'Cs' });
  d = reduce(d, { type: 'flattenLast' });
  expect(d.items.at(-1)).toEqual({ type: 'note', noteId: 'C' });
});

test('sharpenLast is a no-op when last item is not a note', () => {
  let d = reduce(defaultDoc(), { type: 'insertArrow', dir: 'up' });
  d = reduce(d, { type: 'sharpenLast' });
  expect(d.items).toEqual([{ type: 'arrow', dir: 'up' }]);
});

test('insertBreak, insertSection, deleteLast, removeAt', () => {
  let d = defaultDoc();
  d = reduce(d, { type: 'insertSection', text: 'Verse 1' });
  d = reduce(d, { type: 'insertNote', noteId: 'G' });
  d = reduce(d, { type: 'insertBreak' });
  expect(d.items).toEqual([
    { type: 'section', text: 'Verse 1' },
    { type: 'note', noteId: 'G' },
    { type: 'break' },
  ]);
  d = reduce(d, { type: 'deleteLast' });
  expect(d.items.at(-1)).toEqual({ type: 'note', noteId: 'G' });
  d = reduce(d, { type: 'removeAt', index: 0 });
  expect(d.items).toEqual([{ type: 'note', noteId: 'G' }]);
});

test('insertPause appends a pause item', () => {
  const d = reduce(defaultDoc(), { type: 'insertPause' });
  expect(d.items).toEqual([{ type: 'pause' }]);
});

test('toggleArrow flips the direction of the arrow at an index', () => {
  let d = defaultDoc();
  d = reduce(d, { type: 'insertNote', noteId: 'C' });
  d = reduce(d, { type: 'insertArrow', dir: 'up' });
  d = reduce(d, { type: 'toggleArrow', index: 1 });
  expect(d.items[1]).toEqual({ type: 'arrow', dir: 'down' });
  d = reduce(d, { type: 'toggleArrow', index: 1 });
  expect(d.items[1]).toEqual({ type: 'arrow', dir: 'up' });
  // No-op when the targeted item is not an arrow.
  expect(reduce(d, { type: 'toggleArrow', index: 0 }).items[0]).toEqual({ type: 'note', noteId: 'C' });
});

test('moveItem reorders items (e.g. arrow before note)', () => {
  let d = defaultDoc();
  d = reduce(d, { type: 'insertNote', noteId: 'C' });
  d = reduce(d, { type: 'insertNote', noteId: 'E' });
  d = reduce(d, { type: 'insertArrow', dir: 'up' });
  // move the arrow (index 2) to the front (index 0)
  d = reduce(d, { type: 'moveItem', from: 2, to: 0 });
  expect(d.items).toEqual([
    { type: 'arrow', dir: 'up' },
    { type: 'note', noteId: 'C' },
    { type: 'note', noteId: 'E' },
  ]);
});

test('moveItem is a no-op for out-of-range or equal indices', () => {
  const d = reduce(defaultDoc(), { type: 'insertNote', noteId: 'C' });
  expect(reduce(d, { type: 'moveItem', from: 0, to: 0 }).items).toEqual(d.items);
  expect(reduce(d, { type: 'moveItem', from: 0, to: 5 }).items).toEqual(d.items);
  expect(reduce(d, { type: 'moveItem', from: -1, to: 0 }).items).toEqual(d.items);
});

test('setHeader and setLayout patch the doc', () => {
  let d = reduce(defaultDoc(), { type: 'setHeader', field: 'title', value: 'My Song' });
  expect(d.title).toBe('My Song');
  d = reduce(d, { type: 'setLayout', patch: { tilesPerRow: 6 } });
  expect(d.tilesPerRow).toBe(6);
  d = reduce(d, { type: 'setLayout', patch: { accidentalStyle: 'flat' } });
  expect(d.accidentalStyle).toBe('flat');
});

test('setKey sets the song key', () => {
  const d = reduce(defaultDoc(), { type: 'setKey', key: { root: 'G', quality: 'minor' } });
  expect(d.songKey).toEqual({ root: 'G', quality: 'minor' });
});

test('default doc has no key set', () => {
  expect(defaultDoc().songKey).toEqual({ root: null, quality: null });
});

test('formatKey spells the root per accidental style and appends quality', () => {
  expect(formatKey({ root: 'C', quality: 'major' }, 'sharp')).toBe('C major');
  expect(formatKey({ root: 'Bb', quality: 'minor' }, 'sharp')).toBe('A♯ minor');
  expect(formatKey({ root: 'Bb', quality: 'minor' }, 'flat')).toBe('B♭ minor');
  // No quality → just the root; no root → empty (hidden).
  expect(formatKey({ root: 'F', quality: null }, 'sharp')).toBe('F');
  expect(formatKey({ root: null, quality: null }, 'sharp')).toBe('');
});

test('load replaces the whole document', () => {
  const base = defaultDoc();
  const loaded = { ...defaultDoc(), title: 'My Song', items: [{ type: 'note' as const, noteId: 'C' }] };
  const result = reduce(base, { type: 'load', doc: loaded });
  expect(result).toEqual(loaded);
});
