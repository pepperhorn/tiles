import { useState } from 'react';
import { NOTES } from '../notes';
import { templateStore } from '../storage';
import { pageBox, resolveCols } from '../geometry';
import { TabBar } from '../components/Tabs';
import { tabPanelClass, type TabDef } from '../components/tabPanel';
import type { GeneratorState } from './useGeneratorState';

type Props = {
  state: GeneratorState;
  set: (patch: Partial<GeneratorState>) => void;
  setState: React.Dispatch<React.SetStateAction<GeneratorState>>;
  totalTiles: number;
  sheetCount: number;
  onExport: { pdf: () => void; png: () => void; webp: () => void; print: () => void };
  exportMsg?: string;
};

const SIZES = [
  { label: 'XS', size: 40 },
  { label: 'SM', size: 60 },
  { label: 'MD', size: 80 },
  { label: 'LG', size: 100 },
  { label: 'XL', size: 120 },
  { label: 'XXL', size: 160 },
];

export function GeneratorPanel({ state, set, setState, totalTiles, sheetCount, onExport, exportMsg }: Props) {
  const [tab, setTab] = useState('setup');
  const [allCount, setAllCount] = useState(2);
  const [tplName, setTplName] = useState('');
  const [tplList, setTplList] = useState<string[]>(() => templateStore.list());
  const [selectedTpl, setSelectedTpl] = useState('');
  const [tplMsg, setTplMsg] = useState('');

  const refreshTplList = () => {
    const list = templateStore.list();
    setTplList(list);
    if (list.length > 0 && !list.includes(selectedTpl)) setSelectedTpl(list[0]);
  };

  const { w: pageW } = pageBox(state.paper, state.orientation);
  const cols = resolveCols(state.tilesPerRow, state.size, state.margin * 2, pageW);

  const tabs: TabDef[] = state.type === 'tiles'
    ? [{ id: 'setup', label: 'Setup' }, { id: 'notes', label: 'Notes' }, { id: 'output', label: 'Output' }]
    : [{ id: 'setup', label: 'Setup' }, { id: 'output', label: 'Output' }];
  const activeTab = tabs.some(t => t.id === tab) ? tab : 'setup';
  const tc = (id: string) => tabPanelClass(activeTab === id);

  return (
    // Mobile/tablet: tabbed panel capped at 45% height with its own scroll.
    // Desktop (lg+): full sidebar with every group shown.
    <aside className="generator-panel no-print order-2 lg:order-1 basis-[45%] lg:basis-auto shrink-0 lg:shrink min-h-0 flex flex-col overflow-hidden lg:overflow-y-auto bg-white lg:border-r lg:border-slate-200" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <TabBar tabs={tabs} active={activeTab} onSelect={setTab} />
      <div className="panel-scroll flex-1 min-h-0 overflow-y-auto lg:overflow-visible p-5 flex flex-col gap-4">

      {/* Sheet type */}
      <div className={`group group-type ${tc('setup')}`}>
        <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Sheet type</span>
        <div className="toggle2 grid grid-cols-2 gap-1">
          {(['tiles', 'grid'] as const).map(t => (
            <button key={t}
              className={`btn-type px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${state.type === t ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
              aria-pressed={state.type === t}
              onClick={() => set({ type: t })}>
              {t === 'tiles' ? 'Tiles' : 'Grid paper'}
            </button>
          ))}
        </div>
      </div>

      {/* Paper */}
      <div className={`group group-paper ${tc('setup')}`}>
        <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Page</span>
        <div className="seg-paper grid grid-cols-4 gap-1 mb-2">
          {(['A4','A3','Letter','Legal'] as const).map(p => (
            <button key={p}
              className={`btn-paper px-2 py-1.5 rounded-lg text-xs font-semibold border transition ${state.paper === p ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
              aria-pressed={state.paper === p}
              onClick={() => set({ paper: p })}>
              {p}
            </button>
          ))}
        </div>
        <div className="seg-orient grid grid-cols-2 gap-1">
          {(['portrait','landscape'] as const).map(o => (
            <button key={o}
              className={`btn-orient px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${state.orientation === o ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
              aria-pressed={state.orientation === o}
              onClick={() => set({ orientation: o })}>
              {o === 'portrait' ? 'Portrait' : 'Landscape'}
            </button>
          ))}
        </div>
      </div>

      {/* Tile size */}
      <div className={`group group-size ${tc('setup')}`}>
        <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Tile size</span>
        <div className="seg-size grid grid-cols-6 gap-1">
          {SIZES.map(s => (
            <button key={s.label}
              className={`btn-size px-1 py-1.5 rounded-lg text-xs font-semibold border transition ${state.size === s.size ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
              aria-pressed={state.size === s.size}
              onClick={() => set({ size: s.size, sizeLabel: s.label })}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="size-hint text-xs text-slate-400 mt-2">
          {state.sizeLabel} · {state.size}×{state.size} px · {cols} columns/page
        </div>
      </div>

      {/* Grid paper section */}
      {state.type === 'grid' && (
        <div className={`group group-grid ${tc('setup')}`}>
          <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Grid paper</span>
          <div className="field field-grid-pages flex items-center justify-between gap-2 mt-2">
            <label htmlFor="gridPages" className="text-sm">Grid sheets</label>
            <input id="gridPages" className="num w-20 border rounded-lg px-2 py-1 text-center text-sm border-slate-200"
              type="number" min={1} max={50}
              value={state.gridPages}
              onChange={e => set({ gridPages: Math.max(1, parseInt(e.target.value) || 1) })} />
          </div>
          <div className="field field-clearance flex items-center justify-between gap-2 mt-2">
            <label htmlFor="clearance" className="text-sm">Tile clearance (px)</label>
            <input id="clearance" className="num w-20 border rounded-lg px-2 py-1 text-center text-sm border-slate-200"
              type="number" min={0} max={40}
              value={state.clearance}
              onChange={e => set({ clearance: Math.max(0, parseInt(e.target.value) || 0) })} />
          </div>
        </div>
      )}

      {/* Amount per note (tiles only) */}
      {state.type === 'tiles' && (
        <div className={`group group-amount ${tc('setup')}`}>
          <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Amount per note</span>
          <div className="seg-mode grid grid-cols-2 gap-1">
            {(['rows','pages'] as const).map(m => (
              <button key={m}
                className={`btn-mode px-2 py-1.5 rounded-lg text-xs font-semibold border transition ${state.mode === m ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
                aria-pressed={state.mode === m}
                onClick={() => set({ mode: m })}>
                {m === 'rows' ? 'By rows' : 'By full pages'}
              </button>
            ))}
          </div>
          <div className="field field-all-count flex items-center justify-between gap-2 mt-2">
            <label htmlFor="allCount" className="text-sm">Set all notes to</label>
            <input id="allCount" className="num w-20 border rounded-lg px-2 py-1 text-center text-sm border-slate-200"
              type="number" min={0} max={999}
              value={allCount}
              onChange={e => setAllCount(Math.max(0, parseInt(e.target.value) || 0))} />
          </div>
          <div className="miniactions flex gap-2 mt-2">
            <button className="btn-apply-all text-xs font-semibold text-blue-600 hover:underline"
              onClick={() => set({ counts: Object.fromEntries(NOTES.map(n => [n.id, allCount])) })}>
              Apply to all
            </button>
          </div>
        </div>
      )}

      {/* Tiles per row — EXACT code from brief (test depends on id/label) */}
      <div className={`group group-tpr ${tc('setup')}`}>
        <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Layout</span>
        <div className="field tpr-field flex items-center justify-between gap-2">
          <label htmlFor="tilesPerRow">Tiles per row</label>
          <input
            id="tilesPerRow" className="num w-20 border rounded-lg px-2 py-1 text-center"
            type="text" inputMode="numeric"
            value={state.tilesPerRow === 'auto' ? '' : String(state.tilesPerRow)}
            placeholder="Auto"
            onChange={e => {
              const v = e.target.value.trim();
              set({ tilesPerRow: v === '' ? 'auto' : Math.max(1, parseInt(v) || 1) });
            }}
          />
        </div>
      </div>

      {/* Sheet options */}
      {state.type === 'tiles' && (
        <div className={`group group-options ${tc('setup')}`}>
          <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Sheet options</span>
          <div className="row-check flex items-center gap-2 text-sm">
            <input type="checkbox" id="optGuides" checked={state.guides}
              onChange={e => set({ guides: e.target.checked })} />
            <label htmlFor="optGuides">Show cut guides</label>
          </div>
          <div className="field field-margin flex items-center justify-between gap-2 mt-2">
            <label htmlFor="optGap" className="text-sm">Cutting margin (px/side)</label>
            <input id="optGap" className="num w-20 border rounded-lg px-2 py-1 text-center text-sm border-slate-200"
              type="number" min={0} max={20}
              value={state.margin}
              onChange={e => set({ margin: Math.max(0, parseInt(e.target.value) || 0) })} />
          </div>
        </div>
      )}

      {/* Notes & counts (tiles only) */}
      {state.type === 'tiles' && (
        <div className={`group group-notes ${tc('notes')}`}>
          <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Notes &amp; counts</span>
          <div className="miniactions flex gap-2 mb-2">
            <button className="btn-sel-all text-xs font-semibold text-blue-600 hover:underline"
              onClick={() => set({ on: Object.fromEntries(NOTES.map(n => [n.id, true])) })}>
              Select all
            </button>
            <button className="btn-sel-none text-xs font-semibold text-blue-600 hover:underline"
              onClick={() => set({ on: Object.fromEntries(NOTES.map(n => [n.id, false])) })}>
              Select none
            </button>
            <button className="btn-reset text-xs font-semibold text-blue-600 hover:underline"
              onClick={() => set({
                counts: Object.fromEntries(NOTES.map(n => [n.id, 2])),
                on: Object.fromEntries(NOTES.map(n => [n.id, true])),
              })}>
              Reset
            </button>
          </div>
          <div className="note-list flex flex-col gap-1">
            {NOTES.map(note => (
              <div key={note.id} className="note-row grid items-center gap-2" style={{ gridTemplateColumns: '18px 22px 1fr 58px' }}>
                <input type="checkbox" className="note-check"
                  checked={state.on[note.id] ?? true}
                  onChange={e => { const checked = e.target.checked; setState(s => ({ ...s, on: { ...s.on, [note.id]: checked } })); }} />
                <span className="note-swatch rounded-sm" style={{ width: 18, height: 18, background: note.hex, display: 'inline-block' }} />
                <span className="note-name text-sm font-semibold">
                  {note.main}{note.sub ? <span className="note-sub text-xs text-slate-400 font-normal"> / {note.sub}</span> : null}
                </span>
                <input className="note-count num w-full border rounded-lg px-1 py-0.5 text-center text-xs border-slate-200"
                  type="number" min={0} max={999}
                  aria-label={`${note.main} count`}
                  value={state.counts[note.id] ?? 2}
                  onChange={e => { const val = Math.max(0, parseInt(e.target.value) || 0); setState(s => ({ ...s, counts: { ...s.counts, [note.id]: val } })); }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Templates */}
      <div className={`group group-templates ${tc('output')}`}>
        <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Templates</span>
        <div className="field field-tpl-save flex items-center gap-2">
          <input id="tplName" className="tpl-name-input flex-1 border rounded-lg px-3 py-1.5 text-sm border-slate-200"
            type="text" placeholder="Name this setup"
            value={tplName}
            onChange={e => setTplName(e.target.value)} />
          <button className="btn-tpl-save text-xs font-semibold text-blue-600 hover:underline"
            onClick={() => {
              if (!tplName.trim()) { setTplMsg('Give the template a name first.'); return; }
              templateStore.save(tplName.trim(), state);
              refreshTplList();
              setTplMsg('Saved!');
            }}>
            Save
          </button>
        </div>
        <div className="field field-tpl-load flex items-center gap-2 mt-2">
          <select className="tpl-select flex-1 border rounded-lg px-2 py-1.5 text-sm border-slate-200 bg-white"
            value={selectedTpl}
            onChange={e => setSelectedTpl(e.target.value)}>
            {tplList.length === 0
              ? <option value="" disabled>No saved templates</option>
              : tplList.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <button className="btn-tpl-load text-xs font-semibold text-blue-600 hover:underline"
            onClick={() => {
              if (!selectedTpl) { setTplMsg('Pick a template to load.'); return; }
              const saved = templateStore.load(selectedTpl);
              if (!saved) { setTplMsg('Template not found.'); return; }
              setState(prev => ({ ...prev, ...saved }));
              setTplName(selectedTpl);
              setTplMsg('Loaded.');
            }}>
            Load
          </button>
          <button className="btn-tpl-del text-xs font-semibold text-red-500 hover:underline"
            onClick={() => {
              if (!selectedTpl) { setTplMsg('Pick a template to delete.'); return; }
              templateStore.remove(selectedTpl);
              refreshTplList();
              setSelectedTpl('');
              setTplMsg('Deleted.');
            }}>
            Delete
          </button>
        </div>
        {tplMsg && <div className="tpl-msg text-xs text-slate-400 mt-1">{tplMsg}</div>}
      </div>

      {/* Export buttons */}
      <div className={`group group-export flex flex-col gap-2 ${tc('output')}`}>
        <button className="btn-download-pdf w-full py-2 rounded-xl bg-emerald-700 text-white font-bold text-sm hover:bg-emerald-800 transition"
          onClick={onExport.pdf}>
          Download PDF
        </button>
        <button className="btn-download-png w-full py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
          onClick={onExport.png}>
          Download PNG
        </button>
        <button className="btn-download-webp w-full py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
          onClick={onExport.webp}>
          Download WebP
        </button>
        <button className="btn-print w-full py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
          onClick={onExport.print}>
          Print instead…
        </button>
      </div>

      {/* Stat */}
      <div className={`stat text-xs text-slate-400 text-center mt-2 ${tc('output')}`}>
        {totalTiles} tiles · {sheetCount} {sheetCount === 1 ? 'sheet' : 'sheets'}
      </div>
      {exportMsg && <div className={`export-msg text-xs text-red-500 text-center mt-1 ${tc('output')}`} role="alert">{exportMsg}</div>}
      </div>
    </aside>
  );
}
