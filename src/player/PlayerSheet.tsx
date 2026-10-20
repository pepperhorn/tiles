import { useMemo } from 'react';
import type { SheetDoc } from '../designer/sheetModel';
import { sheetLayout } from '../designer/layout';
import { SheetSurface } from '../designer/SheetSurface';
import { innerTile } from '../designer/tileRender';
import { TILE_GAP } from '../geometry';
import type { TileAnnotation } from '../stringFingering';

/** The read-only sheet: the shared page shell with its flowed tile rows and the playing-tile glow. */
export function PlayerSheet({ doc, annotations, playingIndex, emptyText = 'No song loaded.' }: {
  doc: SheetDoc;
  annotations: Record<number, TileAnnotation>;
  playingIndex: number | null;
  emptyText?: string;
}) {
  const { rows } = useMemo(() => sheetLayout(doc), [doc]);
  return (
    <SheetSurface doc={doc}>
      <div className="sheet-body flex flex-col gap-1.5">
        {rows.map((row, ri) =>
          row.kind === 'section'
            ? <div key={ri} className="row-section font-semibold text-slate-700 mt-2">{row.text}</div>
            : (
              <div key={ri} className="row-tiles flex flex-wrap" style={{ gap: TILE_GAP }}>
                {row.cells.map(cell => (
                  <div key={cell.index} className={`tile-slot ${playingIndex === cell.index ? 'is-playing' : ''}`}>
                    {innerTile(cell.item, doc.size, doc.accidentalStyle, undefined, annotations[cell.index])}
                  </div>
                ))}
              </div>
            ))}
        {doc.items.length === 0 && <div className="empty text-slate-400 text-sm">{emptyText}</div>}
      </div>
    </SheetSurface>
  );
}
