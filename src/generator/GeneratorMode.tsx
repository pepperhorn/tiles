import { useRef } from 'react';
import { useGeneratorState } from './useGeneratorState';
import { GeneratorSheets } from './GeneratorSheets';
import { GeneratorPanel } from './GeneratorPanel';
import { exportPdf } from '../export/pdf';
import { exportRaster } from '../export/raster';

export function GeneratorMode() {
  const { state, set, setState, buildResult } = useGeneratorState();
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetEls = () => Array.from(stageRef.current?.querySelectorAll('.sheet') ?? []) as HTMLElement[];

  const onExport = {
    pdf: () => exportPdf(sheetEls(), state.paper, state.orientation, 'CRF Note Tiles'),
    png: () => sheetEls()[0] && exportRaster(sheetEls()[0], 'image/png', 'CRF Note Tiles'),
    webp: () => sheetEls()[0] && exportRaster(sheetEls()[0], 'image/webp', 'CRF Note Tiles'),
    print: () => window.print(),
  };

  return (
    <div className="generator-mode grid md:grid-cols-[340px_1fr] min-h-[calc(100vh-49px)]">
      <GeneratorPanel state={state} set={set} setState={setState} totalTiles={buildResult.totalTiles} onExport={onExport} />
      <main className="stage overflow-auto p-6 md:p-8" ref={stageRef}>
        <GeneratorSheets sheets={buildResult.sheets} paper={state.paper} orientation={state.orientation} />
      </main>
    </div>
  );
}
