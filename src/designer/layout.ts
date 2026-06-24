import type { CSSProperties } from 'react';
import { pageBox, resolveCols, PAD, TILE_GAP } from '../geometry';
import { flowRows, type Row } from './flow';
import type { SheetDoc } from './sheetModel';

export const SHEET_SHADOW = '7px 7px 0 var(--ink)';

/**
 * Single source of truth for how a song doc flows onto a page — the column count
 * and row wrapping. Shared by every on-screen canvas AND the PDF export so the
 * preview and the print can never drift apart. (Page dimensions are a trivial
 * lookup callers do directly via sheetDimsMm; this owns the flow logic only.)
 */
export function sheetLayout(doc: SheetDoc): { cols: number; rows: Row[] } {
  const { w: pageW } = pageBox(doc.paper, doc.orientation);
  const cols = resolveCols(doc.tilesPerRow, doc.size, TILE_GAP, pageW);
  const rows = flowRows(doc.items, cols);
  return { cols, rows };
}

/**
 * The white sheet box: page-sized, hard offset shadow, plus a hairline top/left
 * to complete the frame (the offset shadow only covers bottom/right). One
 * definition so the designer, quiz and generator previews all frame identically.
 */
export function sheetBoxStyle(width: string): CSSProperties {
  return {
    width,
    padding: PAD,
    boxShadow: SHEET_SHADOW,
    borderTop: '1px solid var(--ink)',
    borderLeft: '1px solid var(--ink)',
  };
}
