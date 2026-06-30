import type { SheetDoc } from './sheetModel';
import type { Action } from './sheetModel';
import type { Paper, Orient, TilesPerRow } from '../geometry';

const SIZES = [40, 52, 64, 80, 96, 112];
const PAPERS: Paper[] = ['A4', 'A3', 'Letter', 'Legal'];
const ORIENTS: Orient[] = ['portrait', 'landscape'];

export function DesignerControls({ doc, dispatch, view, onView }: {
  doc: SheetDoc;
  dispatch: (a: Action) => void;
  view: 'mobile' | 'a4';
  onView: (v: 'mobile' | 'a4') => void;
}) {
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
      <div className="control-view flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600">View</span>
        <div className="view-options inline-flex gap-1" role="group" aria-label="Editing view">
          <button className="btn-view px-2.5 py-1 text-xs" aria-pressed={view === 'mobile'} onClick={() => onView('mobile')}>Mobile</button>
          <button className="btn-view px-2.5 py-1 text-xs" aria-pressed={view === 'a4'} onClick={() => onView('a4')}>A4</button>
        </div>
      </div>
      {sep}
      <div className="control-tpr flex items-center gap-2">
        <label className="text-sm font-medium text-slate-600 whitespace-nowrap" htmlFor="dTilesPerRow">Tiles per row</label>
        <input
          id="dTilesPerRow"
          className="input-tpr px-2 py-1 text-sm w-20"
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
              className="btn-size px-2 py-1 text-xs"
              aria-pressed={doc.size === s}
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
              className="btn-paper px-2 py-1 text-xs"
              aria-pressed={doc.paper === p}
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
              className="btn-orient px-2 py-1 text-xs capitalize"
              aria-pressed={doc.orientation === o}
              onClick={() => setLayout({ orientation: o })}
            >{o}</button>
          ))}
        </div>
      </div>
      {sep}
      <div className="control-bpm flex items-center gap-2">
        <label className="text-sm font-medium text-slate-600 whitespace-nowrap" htmlFor="dBpm">BPM</label>
        <input
          id="dBpm"
          className="input-bpm px-2 py-1 text-sm w-20"
          type="number"
          min={20}
          max={300}
          value={doc.bpm}
          aria-label="BPM"
          onChange={e => dispatch({ type: 'setBpm', bpm: Number(e.target.value) })}
        />
      </div>
      {sep}
      <div className="control-transpose flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Transpose</span>
        <div className="transpose-options flex gap-1">
          <button className="btn-transpose-down px-2 py-1 text-xs" aria-label="Transpose down a semitone" onClick={() => dispatch({ type: 'transpose', delta: -1 })}>− semitone</button>
          <button className="btn-transpose-up px-2 py-1 text-xs" aria-label="Transpose up a semitone" onClick={() => dispatch({ type: 'transpose', delta: 1 })}>+ semitone</button>
        </div>
      </div>
      <p className="shortcuts-hint basis-full text-xs text-slate-400">A–G note · # sharp · b flat · ↑↓ arrow · Enter break · [ section</p>
    </div>
  );
}
