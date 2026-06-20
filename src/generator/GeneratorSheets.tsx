import { Tile } from '../Tile';
import { noteById } from '../notes';
import { sheetDimsMm, pageBox, PAD, type Paper, type Orient } from '../geometry';
import { GridPaper } from './GridPaper';
import { useFitWidth } from '../useFitWidth';
import type { SheetPlan } from './useGeneratorState';

export function GeneratorSheets({ sheets, paper, orientation }: { sheets: SheetPlan[]; paper: Paper; orientation: Orient }) {
  const dims = sheetDimsMm(paper, orientation);
  const { w: pageW, h: pageH } = pageBox(paper, orientation);
  const fitRef = useFitWidth(pageW);
  if (sheets.length === 0) {
    return <div className="empty text-slate-500 text-center mt-20">No tiles yet — switch on a note and give it a count.</div>;
  }
  return (
    <div className="sheets block" ref={fitRef}>
      {sheets.map((plan, i) => (
        <div key={i} className={`sheet bg-white mx-auto mb-6 ${plan.kind === 'tiles' && plan.guides ? 'guides' : ''}`}
             style={{ width: dims.w, padding: PAD, boxShadow: '7px 7px 0 var(--ink)' }}>
          {plan.kind === 'gridpaper'
            ? <GridPaper size={plan.size} clearance={plan.clearance} pageW={pageW} pageH={pageH} />
            : (
              <div className="grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${plan.cols}, ${plan.size}px)`, gap: plan.gap, justifyContent: 'start', alignContent: 'start' }}>
                {plan.rows.flatMap((row, r) =>
                  Array.from({ length: plan.cols }, (_, k) => (
                    <Tile key={`${r}-${k}`} kind="note" note={noteById(row.noteId)!} size={plan.size} />
                  )))}
              </div>
            )}
        </div>
      ))}
    </div>
  );
}
