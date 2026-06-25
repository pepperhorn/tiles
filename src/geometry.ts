export type Paper = 'A4' | 'A3' | 'Letter' | 'Legal';
export type Orient = 'portrait' | 'landscape';
export type TilesPerRow = 'auto' | number;

export const MM = 96 / 25.4;      // px per mm @96dpi
export const PAD = 8 * MM;        // page margin, matches demo --pad
export const TILE_GAP = 6;        // px between tiles in a flowed song row (sheet + export)

export const PAPERS: Record<Paper, { short: number; long: number }> = {
  A4:     { short: 210,   long: 297 },
  A3:     { short: 297,   long: 420 },
  Letter: { short: 215.9, long: 279.4 },
  Legal:  { short: 215.9, long: 355.6 },
};

const CSS_PAGE: Record<Paper, string> = { A4: 'A4', A3: 'A3', Letter: 'letter', Legal: 'legal' };
export function cssPageName(paper: Paper): string { return CSS_PAGE[paper]; }

export function pageBox(paper: Paper, orient: Orient): { w: number; h: number } {
  const p = PAPERS[paper];
  return orient === 'landscape'
    ? { w: p.long * MM,  h: p.short * MM }
    : { w: p.short * MM, h: p.long * MM };
}

export function sheetDimsMm(paper: Paper, orient: Orient): { w: string; h: string } {
  const p = PAPERS[paper];
  const w = orient === 'landscape' ? p.long  : p.short;
  const h = orient === 'landscape' ? p.short : p.long;
  return { w: `${w}mm`, h: `${h}mm` };
}

export function autoCols(size: number, gap: number, pageW: number): number {
  const inner = pageW - PAD * 2;
  return Math.max(1, Math.floor((inner + gap) / (size + gap)));
}

export function resolveCols(tpr: TilesPerRow, size: number, gap: number, pageW: number): number {
  if (tpr === 'auto') return autoCols(size, gap, pageW);
  return Math.max(1, Math.floor(tpr));
}

export function rowsPerPage(size: number, gap: number, pageH: number): number {
  const inner = pageH - PAD * 2;
  return Math.max(1, Math.floor((inner + gap) / (size + gap)));
}
