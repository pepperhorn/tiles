import { serializeDoc, parseSheetJson } from './json';
import { defaultDoc } from './sheetModel';

test('serialize then parse round-trips a doc', () => {
  const doc = { ...defaultDoc(), title: 'Song', items: [{ type: 'note' as const, noteId: 'C' }] };
  expect(parseSheetJson(serializeDoc(doc))).toEqual(doc);
});

test('parse fills missing fields from defaults', () => {
  const partial = JSON.stringify({ items: [], title: 'X' });
  const doc = parseSheetJson(partial);
  expect(doc.accidentalStyle).toBe('sharp'); // supplied by defaults
  expect(doc.title).toBe('X');
});

test('parse rejects structurally invalid json', () => {
  expect(() => parseSheetJson('{"nope":true}')).toThrow();
  expect(() => parseSheetJson('not json at all')).toThrow();
});
