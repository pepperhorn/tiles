import { buildSheets, defaultGeneratorState } from './useGeneratorState';

test('rows mode emits one row per requested count, wrapping across pages', () => {
  const s = { ...defaultGeneratorState(), type: 'tiles' as const, mode: 'rows' as const };
  // default: every note on, count 2 -> 24 rows
  const { sheets } = buildSheets(s);
  const tileSheets = sheets.filter(x => x.kind === 'tiles');
  const totalRows = tileSheets.reduce((n, x) => n + (x.kind === 'tiles' ? x.rows.length : 0), 0);
  expect(totalRows).toBe(24);
});

test('fixed tilesPerRow overrides auto column count', () => {
  const s = { ...defaultGeneratorState(), tilesPerRow: 3 };
  const { sheets } = buildSheets(s);
  const first = sheets.find(x => x.kind === 'tiles');
  expect(first && first.kind === 'tiles' && first.cols).toBe(3);
});

test('grid mode emits N gridpaper sheets', () => {
  const s = { ...defaultGeneratorState(), type: 'grid' as const, gridPages: 4 };
  const { sheets } = buildSheets(s);
  expect(sheets.filter(x => x.kind === 'gridpaper')).toHaveLength(4);
});
