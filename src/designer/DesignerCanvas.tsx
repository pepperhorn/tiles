import { Tile } from '../Tile';
import { noteById, SYMBOLS } from '../notes';
import { sheetDimsMm, pageBox, resolveCols, PAD } from '../geometry';
import { flowRows } from './flow';
import { HeaderZone } from './HeaderZone';
import type { SheetDoc, HeaderField } from './sheetModel';

const arrowSym = (dir: 'up' | 'down') => SYMBOLS.find(s => s.id === (dir === 'up' ? 'arrowUp' : 'arrowDown'))!;

export function DesignerCanvas({ doc, onRemove, editable = false, onHeader = () => {} }: {
  doc: SheetDoc; onRemove: (index: number) => void; editable?: boolean; onHeader?: (f: HeaderField, v: string) => void;
}) {
  const dims = sheetDimsMm(doc.paper, doc.orientation);
  const { w: pageW } = pageBox(doc.paper, doc.orientation);
  const cols = resolveCols(doc.tilesPerRow, doc.size, 6, pageW);
  const rows = flowRows(doc.items, cols);

  return (
    <div className="sheets block">
      <div className="sheet bg-white mx-auto" style={{ width: dims.w, padding: PAD, boxShadow: '0 2px 18px rgba(20,18,40,.12)' }}>
        <HeaderZone doc={doc} editable={editable} onHeader={onHeader} />
        <div className="sheet-body flex flex-col gap-1.5">
          {rows.map((row, ri) =>
            row.kind === 'section'
              ? <div key={ri} className="row-section font-semibold text-slate-700 mt-2">{row.text}</div>
              : (
                <div key={ri} className="row-tiles flex flex-wrap" style={{ gap: 6 }}>
                  {row.cells.map(cell =>
                    cell.item.type === 'note'
                      ? <Tile key={cell.index} kind="note" note={noteById(cell.item.noteId)!} size={doc.size} onClick={() => onRemove(cell.index)} />
                      : <Tile key={cell.index} kind="arrow" sym={arrowSym(cell.item.dir)} size={doc.size} onClick={() => onRemove(cell.index)} />
                  )}
                </div>
              ))}
          {doc.items.length === 0 && <div className="empty text-slate-400 text-sm">Tap notes below or type A–G to begin.</div>}
        </div>
      </div>
    </div>
  );
}
