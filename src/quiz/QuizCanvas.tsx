import { Tile } from '../Tile';
import { noteById, SYMBOLS } from '../notes';
import { sheetDimsMm, pageBox, resolveCols, PAD } from '../geometry';
import { flowRows } from '../designer/flow';
import { HeaderZone } from '../designer/HeaderZone';
import { useFitWidth } from '../useFitWidth';
import type { SheetDoc } from '../designer/sheetModel';

const arrowSym = (dir: 'up' | 'down') => SYMBOLS.find(s => s.id === (dir === 'up' ? 'arrowUp' : 'arrowDown'))!;

/** Read-only sheet where the "unknown" note cells are rendered as empty bordered boxes. */
export function QuizCanvas({ doc, unknown, playingIndex = null }: { doc: SheetDoc; unknown: Set<number>; playingIndex?: number | null }) {
  const dims = sheetDimsMm(doc.paper, doc.orientation);
  const { w: pageW } = pageBox(doc.paper, doc.orientation);
  const cols = resolveCols(doc.tilesPerRow, doc.size, 6, pageW);
  const rows = flowRows(doc.items, cols);
  const fitRef = useFitWidth(pageW);

  return (
    <div className="sheets block" ref={fitRef}>
      <div className="sheet bg-white mx-auto" style={{ width: dims.w, padding: PAD, boxShadow: '7px 7px 0 var(--ink)' }}>
        <HeaderZone doc={doc} editable={false} />
        <div className="sheet-body flex flex-col gap-1.5">
          {rows.map((row, ri) =>
            row.kind === 'section'
              ? <div key={ri} className="row-section font-semibold text-slate-700 mt-2">{row.text}</div>
              : (
                <div key={ri} className="row-tiles flex flex-wrap" style={{ gap: 6 }}>
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
                        {item.type === 'note'
                          ? <Tile kind="note" note={noteById(item.noteId)!} size={doc.size} accidental={doc.accidentalStyle} />
                          : item.type === 'pause'
                            ? <Tile kind="pause" size={doc.size} />
                            : <Tile kind="arrow" sym={arrowSym(item.dir)} size={doc.size} />}
                      </div>
                    );
                  })}
                </div>
              ))}
          {doc.items.length === 0 && (
            <div className="empty text-slate-400 text-sm">Design a song in the Sheet Designer tab first.</div>
          )}
        </div>
      </div>
    </div>
  );
}
