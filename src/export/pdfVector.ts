import { jsPDF } from 'jspdf';
import { MM, PAD, pageBox, resolveCols, type Paper, type Orient } from '../geometry';
import { noteById, displayNote } from '../notes';
import { flowRows } from '../designer/flow';
import { hexToCmyk, CMYK_BLACK, CMYK_WHITE, type Cmyk } from './cmyk';
import type { SheetDoc } from '../designer/sheetModel';
import type { SheetPlan } from '../generator/useGeneratorState';

// Print-first PDF: drawn as VECTOR with DeviceCMYK colors (text/lines as pure
// K black, tiles as converted CMYK), rather than an embedded RGB raster.

type PdfCell =
  | { t: 'note'; cmyk: Cmyk; main: string; sub: string }
  | { t: 'arrow'; dir: 'up' | 'down' }
  | { t: 'pause' }
  | { t: 'blank' };
type PdfRow = { t: 'section'; text: string } | { t: 'tiles'; size: number; gap: number; cells: PdfCell[] };
type PdfHeader = { part: string; tempoStyle: string; title: string; subtitle: string; composer: string };
export type PdfPage = { header?: PdfHeader; rows: PdfRow[] };

const ARROW_CMYK = hexToCmyk('#64748b');
const PAUSE_CMYK = hexToCmyk('#a8a29e');
// Helvetica (jsPDF's built-in) lacks ♯/♭ glyphs — use ASCII for print safety.
const ascii = (s: string) => s.replace(/♯/g, '#').replace(/♭/g, 'b');
const mm = (px: number) => px / MM;
const ptOf = (mmVal: number) => mmVal * (72 / 25.4);

function buildSheetPdf(pages: PdfPage[], paper: Paper, orient: Orient): jsPDF {
  const doc = new jsPDF({ orientation: orient, unit: 'mm', format: paper.toLowerCase(), compress: false });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pad = mm(PAD);

  const fill = (c: Cmyk) => doc.setFillColor(c[0], c[1], c[2], c[3]);
  const textColor = (c: Cmyk) => doc.setTextColor(c[0], c[1], c[2], c[3]);

  const outlined = (str: string, cx: number, cy: number, pt: number) => {
    doc.setFontSize(pt);
    const o = Math.max(0.12, pt * 0.012);
    textColor(CMYK_BLACK);
    for (const [dx, dy] of [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, o], [-o, o], [o, -o]]) {
      doc.text(str, cx + dx, cy + dy, { align: 'center', baseline: 'middle' });
    }
    textColor(CMYK_WHITE);
    doc.text(str, cx, cy, { align: 'center', baseline: 'middle' });
  };

  const drawTile = (x: number, y: number, s: number, cmyk: Cmyk, main: string, sub: string) => {
    fill(cmyk);
    doc.roundedRect(x, y, s, s, s * 0.12, s * 0.12, 'F');
    doc.setFont('helvetica', 'bold');
    const cx = x + s / 2;
    if (sub) {
      outlined(main, cx, y + s * 0.42, ptOf(s) * 0.4);
      outlined(sub, cx, y + s * 0.72, ptOf(s) * 0.22);
    } else {
      outlined(main, cx, y + s / 2, ptOf(s) * 0.5);
    }
  };

  const drawArrow = (x: number, y: number, s: number, dir: 'up' | 'down') => {
    fill(ARROW_CMYK);
    doc.roundedRect(x, y, s, s, s * 0.12, s * 0.12, 'F');
    doc.setDrawColor(CMYK_WHITE[0], CMYK_WHITE[1], CMYK_WHITE[2], CMYK_WHITE[3]);
    doc.setLineWidth(Math.max(0.4, s * 0.06));
    const cx = x + s / 2, top = y + s * 0.28, bot = y + s * 0.72, hw = s * 0.18;
    doc.line(cx, top, cx, bot);
    if (dir === 'up') { doc.line(cx, top, cx - hw, top + hw); doc.line(cx, top, cx + hw, top + hw); }
    else { doc.line(cx, bot, cx - hw, bot - hw); doc.line(cx, bot, cx + hw, bot - hw); }
  };

  // A paw print drawn in white: one large pad and four toe beans (matches the on-screen tile).
  const drawPause = (x: number, y: number, s: number) => {
    fill(PAUSE_CMYK);
    doc.roundedRect(x, y, s, s, s * 0.12, s * 0.12, 'F');
    fill(CMYK_WHITE);
    const cx = x + s / 2;
    doc.ellipse(cx, y + s * 0.66, s * 0.2, s * 0.16, 'F');
    for (const [ox, oy] of [[-0.25, -0.04], [-0.083, -0.187], [0.083, -0.187], [0.25, -0.04]]) {
      doc.circle(cx + ox * s, y + s / 2 + oy * s, s * 0.088, 'F');
    }
  };

  const drawBlank = (x: number, y: number, s: number) => {
    doc.setDrawColor(0, 0, 0, 0.45);
    doc.setLineWidth(Math.max(0.3, s * 0.03));
    doc.setLineDashPattern([s * 0.08, s * 0.06], 0);
    doc.roundedRect(x, y, s, s, s * 0.12, s * 0.12, 'S');
    doc.setLineDashPattern([], 0);
  };

  pages.forEach((page, pi) => {
    if (pi > 0) doc.addPage(paper.toLowerCase(), orient);
    let y = pad;

    if (page.header) {
      const h = page.header;
      doc.setFont('helvetica', 'normal');
      textColor(CMYK_BLACK);
      if (h.part) { doc.setFontSize(9); doc.text(h.part, pad, y + 3); }
      if (h.tempoStyle) { doc.setFontSize(8); doc.text(h.tempoStyle, pad, y + 7.5); }
      if (h.composer) { doc.setFontSize(9); doc.text(h.composer, pageW - pad, y + 3, { align: 'right' }); }
      if (h.title) { doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(h.title, pageW / 2, y + 4, { align: 'center' }); }
      if (h.subtitle) { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(h.subtitle, pageW / 2, y + 9.5, { align: 'center' }); }
      y += 16;
    }

    for (const row of page.rows) {
      if (row.t === 'section') {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); textColor(CMYK_BLACK);
        y += 5;
        if (y > pageH - pad) { doc.addPage(paper.toLowerCase(), orient); y = pad; }
        doc.text(row.text, pad, y);
        y += 2;
        continue;
      }
      const s = mm(row.size), gap = mm(row.gap);
      if (y + s > pageH - pad) { doc.addPage(paper.toLowerCase(), orient); y = pad; }
      let x = pad;
      for (const cell of row.cells) {
        if (x + s > pageW - pad + 0.5) break; // safety, rows are pre-wrapped to fit
        if (cell.t === 'note') drawTile(x, y, s, cell.cmyk, cell.main, cell.sub);
        else if (cell.t === 'arrow') drawArrow(x, y, s, cell.dir);
        else if (cell.t === 'pause') drawPause(x, y, s);
        else drawBlank(x, y, s);
        x += s + gap;
      }
      y += s + gap;
    }
  });

  return doc;
}

export function exportVectorPdf(pages: PdfPage[], paper: Paper, orient: Orient, filename: string): void {
  buildSheetPdf(pages, paper, orient).save(`${filename}.pdf`);
}

// For tests: returns the raw (uncompressed) PDF string so CMYK operators and
// text can be asserted.
export function buildSheetPdfString(pages: PdfPage[], paper: Paper, orient: Orient): string {
  return buildSheetPdf(pages, paper, orient).output();
}

// --- Model builders ---------------------------------------------------------

export function docToPages(doc: SheetDoc, blanks?: Set<number>): PdfPage[] {
  const { w: pageW } = pageBox(doc.paper, doc.orientation);
  const cols = resolveCols(doc.tilesPerRow, doc.size, 6, pageW);
  const rows = flowRows(doc.items, cols).map<PdfRow>(row =>
    row.kind === 'section'
      ? { t: 'section', text: ascii(row.text) }
      : {
          t: 'tiles', size: doc.size, gap: 6,
          cells: row.cells.map<PdfCell>(cell => {
            const item = cell.item;
            if (item.type === 'arrow') return { t: 'arrow', dir: item.dir };
            if (item.type === 'pause') return { t: 'pause' };
            if (blanks?.has(cell.index)) return { t: 'blank' };
            const n = noteById(item.noteId)!;
            const d = displayNote(n, doc.accidentalStyle);
            return { t: 'note', cmyk: hexToCmyk(n.hex), main: ascii(d.main), sub: ascii(d.sub) };
          }),
        });
  const header: PdfHeader = { part: doc.part, tempoStyle: doc.tempoStyle, title: doc.title, subtitle: doc.subtitle, composer: doc.composer };
  return [{ header, rows }];
}

/** Returns null if any sheet is grid-paper (those fall back to the raster path). */
export function plansToPages(plans: SheetPlan[]): PdfPage[] | null {
  if (plans.some(p => p.kind !== 'tiles')) return null;
  return plans.map<PdfPage>(plan => {
    const p = plan as Extract<SheetPlan, { kind: 'tiles' }>;
    return {
      rows: p.rows.map<PdfRow>(r => {
        const n = noteById(r.noteId)!;
        const d = displayNote(n, 'sharp');
        const cell: PdfCell = { t: 'note', cmyk: hexToCmyk(n.hex), main: ascii(d.main), sub: ascii(d.sub) };
        return { t: 'tiles', size: p.size, gap: p.gap, cells: Array.from({ length: p.cols }, () => cell) };
      }),
    };
  });
}
