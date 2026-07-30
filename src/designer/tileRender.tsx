import { Tile } from '../Tile';
import { noteById, arrowSym, type AccidentalStyle } from '../notes';
import type { Item } from './sheetModel';
import type { TileAnnotation } from '../stringFingering';

export type TileItem = Extract<Item, { type: 'note' | 'arrow' | 'pause' }>;

/**
 * Render the inner tile for a flowed cell (note / arrow / pause). Shared so the
 * designer, the quiz preview and the quiz player all draw an identical tile.
 */
export function innerTile(item: TileItem, size: number, accidental: AccidentalStyle, onClick?: () => void, annotation?: TileAnnotation) {
  if (item.type === 'note') {
    const note = noteById(annotation?.noteId ?? item.noteId)!;
    return <Tile kind="note" note={note} size={size} accidental={accidental} annotation={annotation} onClick={onClick} />;
  }
  if (item.type === 'pause') return <Tile kind="pause" size={size} onClick={onClick} />;
  return <Tile kind="arrow" sym={arrowSym(item.dir)} size={size} onClick={onClick} />;
}
