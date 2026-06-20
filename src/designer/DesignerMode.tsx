import { useReducer, useRef, useState } from 'react';
import { reduce, defaultDoc } from './sheetModel';
import type { SheetDoc } from './sheetModel';
import { DesignerCanvas } from './DesignerCanvas';
import { Palette } from './Palette';
import { DesignerControls } from './DesignerControls';
import { useKeyboard, type KeyResult } from './useKeyboard';
import { designStore } from '../storage';
import { exportPdf } from '../export/pdf';
import { exportRaster, downloadBlob } from '../export/raster';
import { usePageRule } from '../export/usePageRule';
import { serializeDoc, parseSheetJson } from './json';

export function DesignerMode() {
  const [doc, dispatch] = useReducer(reduce, undefined, defaultDoc);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [exportMsg, setExportMsg] = useState('');

  const handle = (r: KeyResult) => {
    if (r.type === 'newSection') {
      const text = window.prompt('Section title');
      if (text) dispatch({ type: 'insertSection', text });
      return;
    }
    dispatch(r);
  };
  useKeyboard(handle, true);

  usePageRule(doc.paper, doc.orientation);

  const sheetEl = () => stageRef.current?.querySelector('.sheet') as HTMLElement | null;
  const baseName = () => doc.title?.trim() || 'CRF Sheet';
  const onExport = {
    pdf: async () => {
      try {
        const el = sheetEl();
        if (el) await exportPdf([el], doc.paper, doc.orientation, baseName());
        setExportMsg('');
      } catch (err) {
        setExportMsg('Export failed: ' + String(err));
        console.error(err);
      }
    },
    png: async () => {
      try {
        const el = sheetEl();
        if (el) await exportRaster(el, 'image/png', baseName());
        setExportMsg('');
      } catch (err) {
        setExportMsg('Export failed: ' + String(err));
        console.error(err);
      }
    },
    webp: async () => {
      try {
        const el = sheetEl();
        if (el) await exportRaster(el, 'image/webp', baseName());
        setExportMsg('');
      } catch (err) {
        setExportMsg('Export failed: ' + String(err));
        console.error(err);
      }
    },
    print: () => window.print(),
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
    // Mobile: single column, ordered preview → palette → controls → save → export.
    // Desktop (md+): two columns — left panel (controls, palette, save, export) + preview right.
    <div className="designer-mode flex flex-col md:grid md:grid-cols-[360px_1fr] min-h-[calc(100vh-49px)]">
      <main className="stage order-1 md:order-2 overflow-auto p-4 md:p-8 max-h-[55vh] md:max-h-none border-b border-slate-200 md:border-b-0" ref={stageRef}>
        <DesignerCanvas
          doc={doc}
          editable
          onHeader={(f, v) => dispatch({ type: 'setHeader', field: f, value: v })}
          onRemove={(i) => dispatch({ type: 'removeAt', index: i })}
          onMove={(from, to) => dispatch({ type: 'moveItem', from, to })}
        />
      </main>

      {/* `contents` on mobile lets these blocks order around the preview; a real panel column on desktop. */}
      <div className="designer-panel no-print contents md:order-1 md:flex md:flex-col md:gap-4 md:border-r md:border-slate-200 md:bg-white md:p-4 md:overflow-y-auto">
        <div className="panel-palette order-2 md:order-2 bg-white p-4 md:p-0">
          <Palette
            onAction={handle}
            accidentalStyle={doc.accidentalStyle}
            onAccidentalStyle={(accidentalStyle) => dispatch({ type: 'setLayout', patch: { accidentalStyle } })}
          />
        </div>
        <div className="panel-controls order-3 md:order-1 border-t border-slate-200 md:border-t-0 p-4 md:p-0">
          <DesignerControls doc={doc} dispatch={dispatch} />
        </div>
        <div className="designer-saveload order-4 md:order-3 grid gap-2 border-t border-slate-200 md:border-t-0 p-4 md:p-0">
          <input className="input-name border rounded-lg px-2 py-1 text-sm" placeholder="Design name" value={name} onChange={e => setName(e.target.value)} />
          <div className="saveload-actions flex gap-2">
            <button className="btn-save rounded-lg border px-3 py-1 text-sm" onClick={onSave}>Save</button>
            <button className="btn-load rounded-lg border px-3 py-1 text-sm" onClick={onLoad}>Load</button>
          </div>
          <div className="jsonio-actions flex gap-2">
            <button className="btn-export-json rounded-lg border px-3 py-1 text-sm" onClick={onExportJson}>Export JSON</button>
            <button className="btn-import-json rounded-lg border px-3 py-1 text-sm" onClick={() => fileInputRef.current?.click()}>Import JSON</button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="import-json-input hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onImportJson(f); e.target.value = ''; }}
            />
          </div>
        </div>
        <div className="designer-export order-5 md:order-4 grid grid-cols-2 gap-2 border-t border-slate-200 md:border-t-0 p-4 md:p-0">
          <button className="btn-pdf rounded-lg border px-3 py-1 text-sm" onClick={onExport.pdf}>PDF</button>
          <button className="btn-png rounded-lg border px-3 py-1 text-sm" onClick={onExport.png}>PNG</button>
          <button className="btn-webp rounded-lg border px-3 py-1 text-sm" onClick={onExport.webp}>WebP</button>
          <button className="btn-print rounded-lg border px-3 py-1 text-sm" onClick={onExport.print}>Print</button>
          {exportMsg && <p className="designer-export-msg col-span-2 text-xs text-red-500 mt-1" role="alert">{exportMsg}</p>}
        </div>
      </div>
    </div>
  );
}
