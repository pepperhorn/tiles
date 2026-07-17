import { serializeDoc, parseSheetJson, parseSheetValue, deriveMidi } from './json';
import { defaultDoc } from './sheetModel';

test('serialize then parse round-trips a doc', () => {
  const doc = { ...defaultDoc(), title: 'Song', items: [{ type: 'note' as const, noteId: 'C' }] };
  expect(parseSheetJson(serializeDoc(doc))).toEqual(doc);
});

test('export embeds a derived midi array; parse strips it back out', () => {
  const doc = { ...defaultDoc(), items: [{ type: 'note' as const, noteId: 'C' }, { type: 'note' as const, noteId: 'E' }] };
  const json = JSON.parse(serializeDoc(doc));
  expect(json.midi).toEqual([
    { index: 0, midi: 60, name: 'C4' },
    { index: 1, midi: 64, name: 'E4' },
  ]);
  // The annotation is export-only — it must not survive back into the model.
  expect('midi' in parseSheetJson(serializeDoc(doc))).toBe(false);
});

test('deriveMidi names accidentals with the tile spelling', () => {
  const doc = { ...defaultDoc(), items: [{ type: 'note' as const, noteId: 'Cs' }, { type: 'note' as const, noteId: 'Bb' }] };
  // C#4 (61), then the nearest B♭ drops to B♭3 (58) — spelled with the tile's flat.
  expect(deriveMidi(doc).map(m => m.name)).toEqual(['C#4', 'Bb3']);
});

test('parse fills missing fields from defaults', () => {
  const partial = JSON.stringify({ items: [], title: 'X' });
  const doc = parseSheetJson(partial);
  expect(doc.accidentalStyle).toBe('sharp'); // supplied by defaults
  expect(doc.title).toBe('X');
});

test('parse clamps and rounds an out-of-range bpm to the 20–300 invariant', () => {
  expect(parseSheetJson(JSON.stringify({ items: [], bpm: 9999 })).bpm).toBe(300);
  expect(parseSheetJson(JSON.stringify({ items: [], bpm: 1 })).bpm).toBe(20);
  expect(parseSheetJson(JSON.stringify({ items: [], bpm: 128.7 })).bpm).toBe(129);
  // A file with no bpm at all still lands on the default, not NaN.
  expect(parseSheetJson(JSON.stringify({ items: [] })).bpm).toBe(120);
  // A non-numeric bpm (Number('fast') === NaN) falls back to the default rather
  // than letting NaN survive the clamp and reach beatDur = 60/bpm.
  expect(parseSheetJson(JSON.stringify({ items: [], bpm: 'fast' })).bpm).toBe(120);
});

test('parse rejects structurally invalid json', () => {
  expect(() => parseSheetJson('{"nope":true}')).toThrow();
  expect(() => parseSheetJson('not json at all')).toThrow();
});

describe('parseSheetValue', () => {
  test('accepts an already-parsed object and backfills defaults', () => {
    const doc = parseSheetValue({ title: 'Lib song', items: [{ type: 'note', noteId: 'G' }] });
    expect(doc.title).toBe('Lib song');
    expect(doc.items).toEqual([{ type: 'note', noteId: 'G' }]);
    expect(doc.paper).toBe('A4'); // backfilled from defaultDoc()
    expect(doc.bpm).toBe(120);
  });

  test('strips the derived midi annotation and clamps bpm', () => {
    const doc = parseSheetValue({ items: [], midi: [{ index: 0, midi: 60, name: 'C4' }], bpm: 999 });
    expect('midi' in doc).toBe(false);
    expect(doc.bpm).toBe(300);
  });

  test('rejects values without an items array', () => {
    expect(() => parseSheetValue(null)).toThrow(/items array/);
    expect(() => parseSheetValue('a string')).toThrow(/items array/);
    expect(() => parseSheetValue({ title: 'no items' })).toThrow(/items array/);
  });
});
