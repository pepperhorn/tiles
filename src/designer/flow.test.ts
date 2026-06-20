import { flowRows } from './flow';
import type { Item } from './sheetModel';

const items: Item[] = [
  { type: 'section', text: 'Verse' },
  { type: 'note', noteId: 'C' }, { type: 'note', noteId: 'E' }, { type: 'note', noteId: 'G' },
  { type: 'break' },
  { type: 'note', noteId: 'A' },
];

test('wraps tiles at the column count', () => {
  const rows = flowRows(items, 2);
  // section | [C E] | [G] | break -> new row | [A]
  expect(rows[0]).toMatchObject({ kind: 'section', text: 'Verse' });
  expect(rows[1]).toMatchObject({ kind: 'tiles' });
  expect(rows[1].kind === 'tiles' && rows[1].cells.map(c => c.index)).toEqual([1, 2]);
  expect(rows[2].kind === 'tiles' && rows[2].cells.map(c => c.index)).toEqual([3]);
  expect(rows[3].kind === 'tiles' && rows[3].cells.map(c => c.index)).toEqual([5]);
});

test('break forces a new row even when under the column limit', () => {
  const rows = flowRows(items, 10);
  const tileRows = rows.filter(r => r.kind === 'tiles');
  expect(tileRows).toHaveLength(2); // [C E G] then [A]
});
