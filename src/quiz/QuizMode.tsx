import { useMemo, useRef, useState } from 'react';
import type { SheetDoc } from '../designer/sheetModel';
import { QuizCanvas } from './QuizCanvas';
import { chooseBlanks, noteIndexes } from './blanks';
import { exportVectorPdf, docToPages } from '../export/pdfVector';
import { exportRaster } from '../export/raster';
import { withExportReady } from '../export/fit';
import { usePageRule } from '../export/usePageRule';
import { usePiano } from '../audio/usePiano';
import { itemsToPitches } from '../audio/pitch';

export function QuizMode({ doc }: { doc: SheetDoc }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [knownPct, setKnownPct] = useState(0.6); // 0.25 – 0.90
  const [seed, setSeed] = useState(1);
  const [exportMsg, setExportMsg] = useState('');
  const piano = usePiano();

  usePageRule(doc.paper, doc.orientation);

  const noteCount = useMemo(() => noteIndexes(doc.items).length, [doc.items]);
  const unknownCount = Math.max(0, Math.round(noteCount * (1 - knownPct)));
  const knownCount = noteCount - unknownCount;
  const unknown = useMemo(() => chooseBlanks(doc.items, knownPct, seed), [doc.items, knownPct, seed]);

  const sheetEl = () => stageRef.current?.querySelector('.sheet') as HTMLElement | null;
  const baseName = () => `${doc.title?.trim() || 'CRF Sheet'} — Quiz`;
  const exporting = (fn: () => Promise<void> | void) => withExportReady(stageRef.current, fn);
  const onExport = {
    pdf: () => {
      try {
        exportVectorPdf(docToPages(doc, unknown), doc.paper, doc.orientation, baseName());
        setExportMsg('');
      } catch (err) { setExportMsg('Export failed: ' + String(err)); console.error(err); }
    },
    png: () => exporting(async () => {
      try {
        const el = sheetEl();
        if (el) await exportRaster(el, 'image/png', baseName());
        setExportMsg('');
      } catch (err) { setExportMsg('Export failed: ' + String(err)); console.error(err); }
    }),
    webp: () => exporting(async () => {
      try {
        const el = sheetEl();
        if (el) await exportRaster(el, 'image/webp', baseName());
        setExportMsg('');
      } catch (err) { setExportMsg('Export failed: ' + String(err)); console.error(err); }
    }),
    print: () => window.print(),
  };

  return (
    // Mobile/tablet: quiz preview on top (fits width, scrolls), controls panel
    // capped at 45% height below. Desktop (lg+): controls sidebar + preview.
    <div className="quiz-mode flex flex-col lg:grid lg:grid-cols-[340px_1fr] h-full lg:h-full">
      <main className="stage order-1 lg:order-2 flex-1 lg:flex-none min-h-0 overflow-auto p-4 lg:p-8 border-b border-slate-200 lg:border-b-0" ref={stageRef}>
        <QuizCanvas doc={doc} unknown={unknown} />
      </main>

      <aside className="quiz-panel no-print order-2 lg:order-1 basis-[45%] lg:basis-auto shrink-0 lg:shrink min-h-0 overflow-y-auto bg-white lg:border-r lg:border-slate-200 p-5 flex flex-col gap-4">
        <div className="group group-mix">
          <div className="mix-head flex items-baseline justify-between">
            <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400">Known / unknown mix</span>
            <span className="mix-pct text-sm font-semibold text-slate-700">{Math.round(knownPct * 100)}% known</span>
          </div>
          <input
            className="mix-slider w-full mt-3 accent-slate-900"
            type="range" min={25} max={90} step={5}
            value={Math.round(knownPct * 100)}
            aria-label="Percent known"
            onChange={e => setKnownPct(Number(e.target.value) / 100)}
          />
          <div className="mix-legend flex justify-between text-[11px] text-slate-400 mt-1">
            <span>more blanks</span><span>more shown</span>
          </div>
          <div className="mix-stat text-xs text-slate-500 mt-2">
            {noteCount === 0
              ? 'No notes yet — design a song first.'
              : `${knownCount} shown · ${unknownCount} blank · ${noteCount} notes`}
          </div>
        </div>

        <button
          className="btn-shuffle rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => setSeed(s => s + 1)}
        >
          ⟳ Shuffle blanks
        </button>

        <div className="group group-audio grid grid-cols-2 gap-2">
          <button className="btn-play rounded-lg border px-3 py-2 text-sm font-semibold" onClick={() => piano.playSequence(itemsToPitches(doc.items).map(p => ({ midi: p.midi, dur: 0.5 })))}>▶ Play song</button>
          <button className="btn-stop rounded-lg border px-3 py-2 text-sm" onClick={piano.stop}>■ Stop</button>
        </div>

        <div className="group group-export grid grid-cols-2 gap-2">
          <button className="btn-pdf rounded-lg border px-3 py-1 text-sm" onClick={onExport.pdf}>PDF</button>
          <button className="btn-png rounded-lg border px-3 py-1 text-sm" onClick={onExport.png}>PNG</button>
          <button className="btn-webp rounded-lg border px-3 py-1 text-sm" onClick={onExport.webp}>WebP</button>
          <button className="btn-print rounded-lg border px-3 py-1 text-sm" onClick={onExport.print}>Print</button>
          {exportMsg && <p className="quiz-export-msg col-span-2 text-xs text-red-500 mt-1" role="alert">{exportMsg}</p>}
        </div>
      </aside>
    </div>
  );
}
