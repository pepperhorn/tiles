import { useMemo, useState } from 'react';
import { NOTES } from '../notes';
import {
  pageBox, resolveCols, rowsPerPage, type Paper, type Orient, type TilesPerRow,
} from '../geometry';

export type GeneratorState = {
  type: 'tiles' | 'grid';
  paper: Paper; orientation: Orient;
  size: number; sizeLabel: string;
  mode: 'rows' | 'pages';
  margin: number; guides: boolean;
  gridPages: number; clearance: number;
  tilesPerRow: TilesPerRow;
  counts: Record<string, number>;
  on: Record<string, boolean>;
};

export function defaultGeneratorState(): GeneratorState {
  const counts: Record<string, number> = {};
  const on: Record<string, boolean> = {};
  NOTES.forEach(n => { counts[n.id] = 2; on[n.id] = true; });
  return {
    type: 'tiles', paper: 'A4', orientation: 'portrait',
    size: 80, sizeLabel: 'MD', mode: 'rows',
    margin: 2, guides: true, gridPages: 1, clearance: 4,
    tilesPerRow: 'auto', counts, on,
  };
}

export type SheetPlan =
  | { kind: 'tiles'; cols: number; rows: { noteId: string }[]; size: number; gap: number; guides: boolean }
  | { kind: 'gridpaper'; size: number; clearance: number };
export type BuildResult = { sheets: SheetPlan[]; totalTiles: number };

export function buildSheets(state: GeneratorState): BuildResult {
  const gap = state.margin * 2;
  const { w: pageW, h: pageH } = pageBox(state.paper, state.orientation);
  const cols = resolveCols(state.tilesPerRow, state.size, gap, pageW);
  const rpp = rowsPerPage(state.size, gap, pageH);
  const sheets: SheetPlan[] = [];
  let totalTiles = 0;

  if (state.type === 'grid') {
    const pages = Math.max(1, state.gridPages || 1);
    for (let p = 0; p < pages; p++) sheets.push({ kind: 'gridpaper', size: state.size, clearance: state.clearance });
    return { sheets, totalTiles: 0 };
  }

  if (state.mode === 'rows') {
    const rowNotes: { noteId: string }[] = [];
    NOTES.forEach(n => {
      if (!state.on[n.id]) return;
      const c = Math.max(0, state.counts[n.id] || 0);
      for (let i = 0; i < c; i++) rowNotes.push({ noteId: n.id });
    });
    for (let i = 0; i < rowNotes.length; i += rpp) {
      const rows = rowNotes.slice(i, i + rpp);
      sheets.push({ kind: 'tiles', cols, rows, size: state.size, gap, guides: state.guides });
      totalTiles += rows.length * cols;
    }
  } else {
    NOTES.forEach(n => {
      if (!state.on[n.id]) return;
      const count = Math.max(0, state.counts[n.id] || 0);
      if (count === 0) return;
      let rowsLeft = count * rpp;
      while (rowsLeft > 0) {
        const rowsHere = Math.min(rpp, rowsLeft);
        const rows = Array.from({ length: rowsHere }, () => ({ noteId: n.id }));
        sheets.push({ kind: 'tiles', cols, rows, size: state.size, gap, guides: state.guides });
        totalTiles += rowsHere * cols;
        rowsLeft -= rowsHere;
      }
    });
  }
  return { sheets, totalTiles };
}

export function useGeneratorState() {
  const [state, setState] = useState<GeneratorState>(defaultGeneratorState);
  const set = (patch: Partial<GeneratorState>) => setState(s => ({ ...s, ...patch }));
  const buildResult = useMemo(() => buildSheets(state), [state]);
  return { state, setState, set, buildResult };
}
