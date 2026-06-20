import { buildSheetPdfString, docToPages, plansToPages } from './pdfVector';
import { hexToCmyk } from './cmyk';
import { defaultDoc } from '../designer/sheetModel';
import type { SheetPlan } from '../generator/useGeneratorState';

test('hexToCmyk converts pure colors', () => {
  expect(hexToCmyk('#000000')).toEqual([0, 0, 0, 1]);
  expect(hexToCmyk('#ffffff')).toEqual([0, 0, 0, 0]);
  expect(hexToCmyk('#ff0000')).toEqual([0, 1, 1, 0]);
});

test('designer PDF uses CMYK fills (k operator) and embeds the title', () => {
  const doc = { ...defaultDoc(), title: 'PrintMe', items: [{ type: 'note' as const, noteId: 'C' }] };
  const pdf = buildSheetPdfString(docToPages(doc), 'A4', 'portrait');
  expect(pdf).toMatch(/[\d.]+ [\d.]+ [\d.]+ [\d.]+ k\b/); // DeviceCMYK nonstroke fill
  expect(pdf).not.toMatch(/[\d.]+ [\d.]+ [\d.]+ rg\b/);    // no DeviceRGB fills
  expect(pdf).toContain('PrintMe');
});

test('generator tile plans build vector pages; grid paper does not', () => {
  const tiles: SheetPlan = { kind: 'tiles', cols: 2, rows: [{ noteId: 'C' }], size: 80, gap: 4, guides: false };
  expect(plansToPages([tiles])).not.toBeNull();
  const grid: SheetPlan = { kind: 'gridpaper', size: 80, clearance: 4 };
  expect(plansToPages([grid])).toBeNull();
});
