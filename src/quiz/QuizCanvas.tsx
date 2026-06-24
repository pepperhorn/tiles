import { TILE_GAP } from '../geometry';
import { sheetLayout } from '../designer/layout';
import { SheetSurface } from '../designer/SheetSurface';
import { innerTile } from '../designer/tileRender';
import type { SheetDoc } from '../designer/sheetModel';

/** Read-only sheet where the "unknown" note cells are rendered as empty bordered boxes. */
export function QuizCanvas({ doc, unknown, playingIndex = null }: { doc: SheetDoc; unknown: Set<number>; playingIndex?: number | null }) {
  const { rows } = sheetLayout(doc);

  return (
    <SheetSurface doc={doc}>
      <div className="sheet-body flex flex-col gap-1.5">
        {rows.map((row, ri) =>
          row.kind === 'section'
            ? <div key={ri} className="row-section font-semibold text-slate-700 mt-2">{row.text}</div>
            : (
              <div key={ri} className="row-tiles flex flex-wrap" style={{ gap: TILE_GAP }}>
                {row.cells.map(cell => {
                  const item = cell.item;
                  const playing = playingIndex === cell.index;
                  if (item.type === 'note' && unknown.has(cell.index)) {
                    return (
                      <div
                        key={cell.index}
                        className={`tile-slot quiz-blank ${playing ? 'is-playing' : ''}`}
                        style={{ width: doc.size, height: doc.size, border: '2px dashed #94a3b8', boxSizing: 'border-box' }}
                      />
                    );
                  }
                  return (
                    <div key={cell.index} className={`tile-slot ${playing ? 'is-playing' : ''}`}>
                      {innerTile(item, doc.size, doc.accidentalStyle)}
                    </div>
                  );
                })}
              </div>
            ))}
        {doc.items.length === 0 && (
          <div className="empty text-slate-400 text-sm">Design a song in the Sheet Designer tab first.</div>
        )}
      </div>
    </SheetSurface>
  );
}
