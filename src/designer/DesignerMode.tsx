import { useReducer, useRef, useState } from 'react';
import { reduce, defaultDoc } from './sheetModel';
import type { SheetDoc } from './sheetModel';
import { DesignerCanvas } from './DesignerCanvas';
import { Palette } from './Palette';
import { DesignerControls } from './DesignerControls';
import { useKeyboard, type KeyResult } from './useKeyboard';
import { designStore } from '../storage';
import { exportPdf } from '../export/pdf';
import { exportRaster } from '../export/raster';

export function DesignerMode() {
  const [doc, dispatch] = useReducer(reduce, undefined, defaultDoc);
  const stageRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');

  const handle = (r: KeyResult) => {
    if (r.type === 'newSection') {
      const text = window.prompt('Section title');
      if (text) dispatch({ type: 'insertSection', text });
      return;
    }
    dispatch(r);
  };
  useKeyboard(handle, true);

  const sheetEl = () => stageRef.current?.querySelector('.sheet') as HTMLElement | null;
  const baseName = () => doc.title?.trim() || 'CRF Sheet';
  const onExport = {
    pdf: () => { const el = sheetEl(); if (el) exportPdf([el], doc.paper, doc.orientation, baseName()); },
    png: () => { const el = sheetEl(); if (el) exportRaster(el, 'image/png', baseName()); },
    webp: () => { const el = sheetEl(); if (el) exportRaster(el, 'image/webp', baseName()); },
    print: () => window.print(),
  };
  const onSave = () => name.trim() && designStore.save(name.trim(), doc);
  const onLoad = () => {
    const d = designStore.load(name.trim());
    if (d) dispatch({ type: 'load', doc: d as SheetDoc });
  };

  return (
    <div className="designer-mode grid md:grid-cols-[360px_1fr] min-h-[calc(100vh-49px)]">
      <aside className="designer-panel no-print border-r border-slate-200 bg-white p-4 flex flex-col gap-4 overflow-y-auto">
        <DesignerControls doc={doc} dispatch={dispatch} />
        <Palette onAction={handle} />
        <div className="designer-saveload grid gap-2">
          <input className="input-name border rounded-lg px-2 py-1 text-sm" placeholder="Design name" value={name} onChange={e => setName(e.target.value)} />
          <div className="saveload-actions flex gap-2">
            <button className="btn-save rounded-lg border px-3 py-1 text-sm" onClick={onSave}>Save</button>
            <button className="btn-load rounded-lg border px-3 py-1 text-sm" onClick={onLoad}>Load</button>
          </div>
        </div>
        <div className="designer-export grid grid-cols-2 gap-2">
          <button className="btn-pdf rounded-lg border px-3 py-1 text-sm" onClick={onExport.pdf}>PDF</button>
          <button className="btn-png rounded-lg border px-3 py-1 text-sm" onClick={onExport.png}>PNG</button>
          <button className="btn-webp rounded-lg border px-3 py-1 text-sm" onClick={onExport.webp}>WebP</button>
          <button className="btn-print rounded-lg border px-3 py-1 text-sm" onClick={onExport.print}>Print</button>
        </div>
      </aside>
      <main className="stage overflow-auto p-4 md:p-8" ref={stageRef}>
        <DesignerCanvas doc={doc} editable onHeader={(f, v) => dispatch({ type: 'setHeader', field: f, value: v })} onRemove={(i) => dispatch({ type: 'removeAt', index: i })} />
      </main>
    </div>
  );
}
