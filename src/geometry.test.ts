import { pageBox, autoCols, resolveCols, rowsPerPage, sheetDimsMm, cssPageName } from './geometry';

test('A4 portrait page box matches demo geometry', () => {
  const { w, h } = pageBox('A4', 'portrait');
  expect(Math.round(w)).toBe(794);   // 210mm @96dpi
  expect(Math.round(h)).toBe(1123);  // 297mm @96dpi
});

test('autoCols matches demo: MD 80px tiles, 4px gap on A4 portrait', () => {
  const { w } = pageBox('A4', 'portrait');
  expect(autoCols(80, 4, w)).toBe(9);
});

test('resolveCols honors a fixed tiles-per-row, else auto', () => {
  const { w } = pageBox('A4', 'portrait');
  expect(resolveCols(5, 80, 4, w)).toBe(5);
  expect(resolveCols('auto', 80, 4, w)).toBe(autoCols(80, 4, w));
  expect(resolveCols(0, 80, 4, w)).toBe(1); // never below 1
});

test('rowsPerPage is at least 1', () => {
  const { h } = pageBox('A4', 'portrait');
  expect(rowsPerPage(80, 4, h)).toBeGreaterThanOrEqual(1);
});

test('sheet dims and css page name', () => {
  expect(sheetDimsMm('A4', 'landscape')).toEqual({ w: '297mm', h: '210mm' });
  expect(cssPageName('Letter')).toBe('letter');
});
