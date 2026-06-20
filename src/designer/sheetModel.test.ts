import { defaultDoc, reduce } from './sheetModel';

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

test('setHeader and setLayout patch the doc', () => {
  let d = reduce(defaultDoc(), { type: 'setHeader', field: 'title', value: 'My Song' });
  expect(d.title).toBe('My Song');
  d = reduce(d, { type: 'setLayout', patch: { tilesPerRow: 6 } });
  expect(d.tilesPerRow).toBe(6);
});

test('load replaces the whole document', () => {
  const base = defaultDoc();
  const loaded = { ...defaultDoc(), title: 'My Song', items: [{ type: 'note' as const, noteId: 'C' }] };
  const result = reduce(base, { type: 'load', doc: loaded });
  expect(result).toEqual(loaded);
});
