import { reduce, defaultDoc } from './sheetModel';
test('transpose shifts all notes by semitones, wrapping', () => {
  const doc = { ...defaultDoc(), items: [{ type: 'note' as const, noteId: 'C' }, { type: 'arrow' as const, dir: 'up' as const }, { type: 'note' as const, noteId: 'B' }] };
  const up = reduce(doc, { type: 'transpose', delta: 2 });
  expect(up.items.map(i => i.type === 'note' ? i.noteId : i.type)).toEqual(['D', 'arrow', 'Cs']);
});
