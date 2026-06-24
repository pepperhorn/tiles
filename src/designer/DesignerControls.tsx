import type { SheetDoc } from './sheetModel';
import type { Action } from './sheetModel';
import type { Paper, Orient, TilesPerRow } from '../geometry';

const SIZES = [40, 52, 64, 80, 96, 112];
const PAPERS: Paper[] = ['A4', 'A3', 'Letter', 'Legal'];
const ORIENTS: Orient[] = ['portrait', 'landscape'];

export function DesignerControls({ doc, dispatch }: { doc: SheetDoc; dispatch: (a: Action) => void }) {
  const setLayout = (patch: Partial<Pick<SheetDoc, 'tilesPerRow' | 'size' | 'paper' | 'orientation'>>) =>
    dispatch({ type: 'setLayout', patch });

  const handleTpr = (val: string) => {
    if (val.trim() === '') { setLayout({ tilesPerRow: 'auto' }); return; }
    const n = parseInt(val, 10);
    const tpr: TilesPerRow = Number.isFinite(n) ? Math.max(1, n) : 'auto';
    setLayout({ tilesPerRow: tpr });
  };

  const sep = <span className="control-sep h-5 w-px self-center bg-slate-300" aria-hidden="true" />;

  return (
    <div className="designer-controls no-print flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="control-tpr flex items-center gap-2">
        <label className="text-sm font-medium text-slate-600 whitespace-nowrap" htmlFor="dTilesPerRow">Tiles per row</label>
        <input
          id="dTilesPerRow"
          className="input-tpr border rounded px-2 py-1 text-sm w-20"
          type="number"
          min={1}
          placeholder="auto"
          value={doc.tilesPerRow === 'auto' ? '' : doc.tilesPerRow}
          onChange={e => handleTpr(e.target.value)}
        />
      </div>
      {sep}
      <div className="control-size flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Size</span>
        <div className="size-options flex gap-1">
          {SIZES.map(s => (
            <button
              key={s}
              className={`btn-size rounded px-2 py-1 text-xs border ${doc.size === s ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-600'}`}
              onClick={() => setLayout({ size: s })}
            >{s}</button>
          ))}
        </div>
      </div>
      {sep}
      <div className="control-paper flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Paper</span>
        <div className="paper-options flex gap-1">
          {PAPERS.map(p => (
            <button
              key={p}
              className={`btn-paper rounded px-2 py-1 text-xs border ${doc.paper === p ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-600'}`}
              onClick={() => setLayout({ paper: p })}
            >{p}</button>
          ))}
        </div>
      </div>
      {sep}
      <div className="control-orient flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Orientation</span>
        <div className="orient-options flex gap-1">
          {ORIENTS.map(o => (
            <button
              key={o}
              className={`btn-orient rounded px-2 py-1 text-xs border capitalize ${doc.orientation === o ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-600'}`}
              onClick={() => setLayout({ orientation: o })}
            >{o}</button>
          ))}
        </div>
      </div>
      {sep}
      <div className="control-transpose flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Transpose</span>
        <div className="transpose-options flex gap-1">
          <button className="btn-transpose-down rounded px-2 py-1 text-xs border text-slate-600" aria-label="Transpose down a semitone" onClick={() => dispatch({ type: 'transpose', delta: -1 })}>− semitone</button>
          <button className="btn-transpose-up rounded px-2 py-1 text-xs border text-slate-600" aria-label="Transpose up a semitone" onClick={() => dispatch({ type: 'transpose', delta: 1 })}>+ semitone</button>
        </div>
      </div>
      <p className="shortcuts-hint basis-full text-xs text-slate-400">A–G note · # sharp · b flat · ↑↓ arrow · Enter break · [ section</p>
    </div>
  );
}
