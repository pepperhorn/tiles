import { useRef, useState } from 'react';
import { useGeneratorState } from './useGeneratorState';
import { GeneratorSheets } from './GeneratorSheets';
import { GeneratorPanel } from './GeneratorPanel';
import { withExportReady } from '../export/fit';
import { usePageRule } from '../export/usePageRule';

export function GeneratorMode() {
  const { state, set, setState, buildResult } = useGeneratorState();
  const stageRef = useRef<HTMLDivElement>(null);
  const [exportMsg, setExportMsg] = useState('');
  const sheetEls = () => Array.from(stageRef.current?.querySelectorAll('.sheet') ?? []) as HTMLElement[];

  usePageRule(state.paper, state.orientation);

  // Reset the preview's fit-to-width zoom so exports capture at natural resolution.
  const exporting = (fn: () => Promise<void> | void) => withExportReady(stageRef.current, fn);
  // PNG and WebP differ only by MIME type; both rasterise every sheet in turn,
  // pausing briefly between downloads so the browser doesn't drop files.
  const rasterExportAll = (type: 'image/png' | 'image/webp') => exporting(async () => {
    try {
      const { exportRaster } = await import('../export/raster');
      const sheets = sheetEls();
      const base = 'CRF Note Tiles';
      for (let i = 0; i < sheets.length; i++) {
        const name = sheets.length === 1 ? base : `${base}-${i + 1}`;
        await exportRaster(sheets[i], type, name);
        if (i < sheets.length - 1) await new Promise(r => setTimeout(r, 300));
      }
      setExportMsg('');
    } catch (err) {
      setExportMsg('Export failed: ' + String(err));
      console.error(err);
    }
  });
  const onExport = {
    pdf: async () => {
      const { exportVectorPdf, plansToPages } = await import('../export/pdfVector');
      const pages = plansToPages(buildResult.sheets);
      if (pages) {
        // Vector CMYK path for tile sheets (print-first).
        try {
          exportVectorPdf(pages, state.paper, state.orientation, 'CRF Note Tiles');
          setExportMsg('');
        } catch (err) { setExportMsg('Export failed: ' + String(err)); console.error(err); }
        return;
      }
      // Grid-paper sheets fall back to the raster path.
      void exporting(async () => {
        try {
          const { exportPdf } = await import('../export/pdf');
          await exportPdf(sheetEls(), state.paper, state.orientation, 'CRF Note Tiles');
          setExportMsg('');
        } catch (err) { setExportMsg('Export failed: ' + String(err)); console.error(err); }
      });
    },
    png: () => rasterExportAll('image/png'),
    webp: () => rasterExportAll('image/webp'),
    print: () => exporting(() => window.print()),
  };

  return (
    // Mobile/tablet: preview on top (fits width, scrolls), tabbed tools panel
    // capped at 45% height below. Desktop (lg+): tools sidebar left + preview right.
    <div className="generator-mode flex flex-col lg:grid lg:grid-cols-[340px_1fr] h-full lg:h-full">
      <main className="stage order-1 lg:order-2 flex-1 lg:flex-none min-h-0 overflow-auto p-4 lg:p-8 border-b border-slate-200 lg:border-b-0" ref={stageRef}>
        <GeneratorSheets sheets={buildResult.sheets} paper={state.paper} orientation={state.orientation} />
      </main>
      <GeneratorPanel state={state} set={set} setState={setState} totalTiles={buildResult.totalTiles} sheetCount={buildResult.sheets.length} onExport={onExport} exportMsg={exportMsg} />
    </div>
  );
}
