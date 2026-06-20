import { useRef, useState } from 'react';
import type { SheetDoc, HeaderField, Action } from './sheetModel';
import { DesignerCanvas } from './DesignerCanvas';
import { Palette } from './Palette';
import { DesignerControls } from './DesignerControls';
import { HeaderEditOverlay } from './HeaderEditOverlay';
import { useKeyboard, type KeyResult } from './useKeyboard';
import { TabBar } from '../components/Tabs';
import { tabPanelClass, type TabDef } from '../components/tabPanel';
import { designStore } from '../storage';
import { exportVectorPdf, docToPages } from '../export/pdfVector';
import { exportRaster, downloadBlob } from '../export/raster';
import { withExportReady } from '../export/fit';
import { usePageRule } from '../export/usePageRule';
import { serializeDoc, parseSheetJson } from './json';
import { usePiano } from '../audio/usePiano';
import { itemsToPitches } from '../audio/pitch';

const TABS: TabDef[] = [
  { id: 'notes', label: 'Notes' },
  { id: 'layout', label: 'Layout' },
  { id: 'file', label: 'Save & export' },
];

export function DesignerMode({ doc, dispatch }: { doc: SheetDoc; dispatch: (action: Action) => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [exportMsg, setExportMsg] = useState('');
  const [tab, setTab] = useState('notes');
  const [editingField, setEditingField] = useState<HeaderField | null>(null);
  const [speaker, setSpeaker] = useState(false);
  const piano = usePiano();
  const playSheet = () => piano.playSequence(itemsToPitches(doc.items).map(p => ({ midi: p.midi, dur: 0.5 })));

  const handle = (r: KeyResult) => {
    if (r.type === 'newSection') {
      const text = window.prompt('Section title');
      if (text) dispatch({ type: 'insertSection', text });
      return;
    }
    dispatch(r);
    // Speaker on: sound each note as it's added (palette tap or keyboard).
    if (speaker && r.type === 'insertNote') {
      const placed = itemsToPitches([...doc.items, { type: 'note', noteId: r.noteId }]).at(-1);
      if (placed) void piano.playNote(placed.midi);
    }
  };
  useKeyboard(handle, true);

  usePageRule(doc.paper, doc.orientation);

  const sheetEl = () => stageRef.current?.querySelector('.sheet') as HTMLElement | null;
  const baseName = () => doc.title?.trim() || 'CRF Sheet';
  // Reset the preview's fit-to-width zoom so exports capture at natural resolution.
  const exporting = (fn: () => Promise<void> | void) => withExportReady(stageRef.current, fn);
  const onExport = {
    pdf: () => {
      try {
        exportVectorPdf(docToPages(doc), doc.paper, doc.orientation, baseName());
        setExportMsg('');
      } catch (err) {
        setExportMsg('Export failed: ' + String(err));
        console.error(err);
      }
    },
    png: () => exporting(async () => {
      try {
        const el = sheetEl();
        if (el) await exportRaster(el, 'image/png', baseName());
        setExportMsg('');
      } catch (err) {
        setExportMsg('Export failed: ' + String(err));
        console.error(err);
      }
    }),
    webp: () => exporting(async () => {
      try {
        const el = sheetEl();
        if (el) await exportRaster(el, 'image/webp', baseName());
        setExportMsg('');
      } catch (err) {
        setExportMsg('Export failed: ' + String(err));
        console.error(err);
      }
    }),
    print: () => exporting(() => window.print()),
  };
  const onSave = () => name.trim() && designStore.save(name.trim(), doc);
  const onLoad = () => {
    const d = designStore.load(name.trim());
    if (d) dispatch({ type: 'load', doc: d as SheetDoc });
  };

  const onExportJson = () => {
    try {
      const blob = new Blob([serializeDoc(doc)], { type: 'application/json' });
      downloadBlob(blob, `${baseName()}.json`);
      setExportMsg('');
    } catch (err) {
      setExportMsg('Export failed: ' + String(err));
      console.error(err);
    }
  };
  const onImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        dispatch({ type: 'load', doc: parseSheetJson(String(reader.result)) });
        setExportMsg('');
      } catch (err) {
        setExportMsg('Import failed: ' + String(err));
        console.error(err);
      }
    };
    reader.onerror = () => setExportMsg('Could not read file.');
    reader.readAsText(file);
  };

  return (
    // Mobile/tablet: preview on top (fits width, scrolls), tools a tabbed panel
    // capped at 45% height below. Desktop (lg+): tools sidebar + preview.
    <div className="designer-mode flex flex-col lg:grid lg:grid-cols-[360px_1fr] h-full lg:h-full">
      <main className="stage order-1 lg:order-2 flex-1 lg:flex-none min-h-0 overflow-auto p-4 lg:p-8 border-b border-slate-200 lg:border-b-0" ref={stageRef}>
        <DesignerCanvas
          doc={doc}
          editable
          onEditField={setEditingField}
          onRemove={(i) => dispatch({ type: 'removeAt', index: i })}
          onMove={(from, to) => dispatch({ type: 'moveItem', from, to })}
        />
      </main>

      <div className="designer-panel no-print order-2 lg:order-1 basis-[45%] lg:basis-auto shrink-0 lg:shrink min-h-0 flex flex-col overflow-hidden lg:overflow-y-auto bg-white lg:border-r lg:border-slate-200">
        <TabBar tabs={TABS} active={tab} onSelect={setTab} />
        <div className="panel-scroll flex-1 min-h-0 overflow-y-auto lg:overflow-visible lg:flex lg:flex-col lg:gap-4 lg:p-4">
          <div className={`panel-notes ${tabPanelClass(tab === 'notes')} p-4 lg:p-0`}>
            <div className="designer-audio mb-3 flex items-center gap-2">
              <button
                className={`btn-speaker rounded-lg border p-2 ${speaker ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-600'}`}
                aria-pressed={speaker}
                aria-label="Sound notes as you add them"
                title="Sound notes as you add them"
                onClick={() => setSpeaker(s => !s)}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
                  {speaker
                    ? <path d="M17 9a4 4 0 0 1 0 6" />
                    : <path d="m17 9 4 6M21 9l-4 6" />}
                </svg>
              </button>
              <button className="btn-play rounded-lg border p-2 text-slate-700" aria-label="Play" title="Play" onClick={playSheet}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z" /></svg>
              </button>
              <button className="btn-stop rounded-lg border p-2 text-slate-700" aria-label="Stop" title="Stop" onClick={piano.stop}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5" /></svg>
              </button>
              {piano.status === 'loading' && <span className="text-xs text-slate-400">loading piano…</span>}
              {piano.status === 'error' && <span className="text-xs text-red-500">audio unavailable</span>}
            </div>
            <Palette
              onAction={handle}
              accidentalStyle={doc.accidentalStyle}
              onAccidentalStyle={(accidentalStyle) => dispatch({ type: 'setLayout', patch: { accidentalStyle } })}
            />
          </div>

          <div className={`panel-layout ${tabPanelClass(tab === 'layout')} p-4 lg:p-0`}>
            <DesignerControls doc={doc} dispatch={dispatch} />
          </div>

          <div className={`panel-file ${tabPanelClass(tab === 'file')} p-4 lg:p-0 grid gap-3`}>
            <div className="designer-saveload grid gap-2">
              <input className="input-name border rounded-lg px-2 py-1 text-sm" placeholder="Design name" value={name} onChange={e => setName(e.target.value)} />
              <div className="saveload-actions flex gap-2">
                <button className="btn-save flex-1 rounded-lg border px-3 py-1 text-sm" onClick={onSave}>Save</button>
                <button className="btn-load flex-1 rounded-lg border px-3 py-1 text-sm" onClick={onLoad}>Load</button>
              </div>
              <div className="jsonio-actions flex gap-2">
                <button className="btn-export-json flex-1 rounded-lg border px-3 py-1 text-sm" onClick={onExportJson}>Export JSON</button>
                <button className="btn-import-json flex-1 rounded-lg border px-3 py-1 text-sm" onClick={() => fileInputRef.current?.click()}>Import JSON</button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="import-json-input hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) onImportJson(f); e.target.value = ''; }}
                />
              </div>
            </div>
            <div className="designer-export grid grid-cols-2 gap-2">
              <button className="btn-pdf rounded-lg border px-3 py-1 text-sm" onClick={onExport.pdf}>PDF</button>
              <button className="btn-png rounded-lg border px-3 py-1 text-sm" onClick={onExport.png}>PNG</button>
              <button className="btn-webp rounded-lg border px-3 py-1 text-sm" onClick={onExport.webp}>WebP</button>
              <button className="btn-print rounded-lg border px-3 py-1 text-sm" onClick={onExport.print}>Print</button>
              {exportMsg && <p className="designer-export-msg col-span-2 text-xs text-red-500 mt-1" role="alert">{exportMsg}</p>}
            </div>
          </div>
        </div>
      </div>

      {editingField && (
        <HeaderEditOverlay
          field={editingField}
          value={doc[editingField]}
          onChange={(v) => dispatch({ type: 'setHeader', field: editingField, value: v })}
          onClose={() => setEditingField(null)}
        />
      )}
    </div>
  );
}
