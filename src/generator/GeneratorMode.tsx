import { useRef, useState } from 'react';
import { useGeneratorState } from './useGeneratorState';
import { GeneratorSheets } from './GeneratorSheets';
import { GeneratorPanel } from './GeneratorPanel';
import { exportPdf } from '../export/pdf';
import { exportRaster } from '../export/raster';
import { usePageRule } from '../export/usePageRule';

export function GeneratorMode() {
  const { state, set, setState, buildResult } = useGeneratorState();
  const stageRef = useRef<HTMLDivElement>(null);
  const [exportMsg, setExportMsg] = useState('');
  const sheetEls = () => Array.from(stageRef.current?.querySelectorAll('.sheet') ?? []) as HTMLElement[];

  usePageRule(state.paper, state.orientation);

  const onExport = {
    pdf: async () => {
      try {
        await exportPdf(sheetEls(), state.paper, state.orientation, 'CRF Note Tiles');
        setExportMsg('');
      } catch (err) {
        setExportMsg('Export failed: ' + String(err));
        console.error(err);
      }
    },
    png: async () => {
      try {
        const sheets = sheetEls();
        const base = 'CRF Note Tiles';
        for (let i = 0; i < sheets.length; i++) {
          const name = sheets.length === 1 ? base : `${base}-${i + 1}`;
          await exportRaster(sheets[i], 'image/png', name);
        }
        setExportMsg('');
      } catch (err) {
        setExportMsg('Export failed: ' + String(err));
        console.error(err);
      }
    },
    webp: async () => {
      try {
        const sheets = sheetEls();
        const base = 'CRF Note Tiles';
        for (let i = 0; i < sheets.length; i++) {
          const name = sheets.length === 1 ? base : `${base}-${i + 1}`;
          await exportRaster(sheets[i], 'image/webp', name);
        }
        setExportMsg('');
      } catch (err) {
        setExportMsg('Export failed: ' + String(err));
        console.error(err);
      }
    },
    print: () => window.print(),
  };

  return (
    <div className="generator-mode grid md:grid-cols-[340px_1fr] min-h-[calc(100vh-49px)]">
      <GeneratorPanel state={state} set={set} setState={setState} totalTiles={buildResult.totalTiles} sheetCount={buildResult.sheets.length} onExport={onExport} exportMsg={exportMsg} />
      <main className="stage overflow-auto p-6 md:p-8" ref={stageRef}>
        <GeneratorSheets sheets={buildResult.sheets} paper={state.paper} orientation={state.orientation} />
      </main>
    </div>
  );
}
