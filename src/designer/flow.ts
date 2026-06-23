import type { Item } from './sheetModel';

export type TileItem = Extract<Item, { type: 'note' | 'arrow' | 'pause' }>;
export type Cell = { item: TileItem; index: number };
export type Row =
  | { kind: 'section'; text: string; index: number }
  | { kind: 'tiles'; cells: Cell[] };

export function flowRows(items: Item[], cols: number): Row[] {
  const max = Math.max(1, cols);
  const rows: Row[] = [];
  let cur: Cell[] = [];
  const flush = () => { if (cur.length) { rows.push({ kind: 'tiles', cells: cur }); cur = []; } };

  items.forEach((item, index) => {
    if (item.type === 'section') { flush(); rows.push({ kind: 'section', text: item.text, index }); return; }
    if (item.type === 'break')   { flush(); return; }
    cur.push({ item: item as TileItem, index });
    if (cur.length >= max) flush();
  });
  flush();
  return rows;
}
