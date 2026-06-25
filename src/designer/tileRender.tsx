import { Tile } from '../Tile';
import { noteById, arrowSym, type AccidentalStyle } from '../notes';
import type { Item } from './sheetModel';

export type TileItem = Extract<Item, { type: 'note' | 'arrow' | 'pause' }>;

/**
 * Render the inner tile for a flowed cell (note / arrow / pause). Shared so the
 * designer, the quiz preview and the quiz player all draw an identical tile.
 */
export function innerTile(item: TileItem, size: number, accidental: AccidentalStyle, onClick?: () => void) {
  if (item.type === 'note') return <Tile kind="note" note={noteById(item.noteId)!} size={size} accidental={accidental} onClick={onClick} />;
  if (item.type === 'pause') return <Tile kind="pause" size={size} onClick={onClick} />;
  return <Tile kind="arrow" sym={arrowSym(item.dir)} size={size} onClick={onClick} />;
}
