import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import type { Paper, Orient } from '../geometry';

export async function exportPdf(sheets: HTMLElement[], paper: Paper, orient: Orient, filename: string): Promise<void> {
  if (sheets.length === 0) return;
  if (document.fonts?.ready) await document.fonts.ready;
  const fmt = paper.toLowerCase();
  const doc = new jsPDF({ orientation: orient, unit: 'mm', format: fmt });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let i = 0; i < sheets.length; i++) {
    const el = sheets[i];
    const shadow = el.style.boxShadow; el.style.boxShadow = 'none';
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    el.style.boxShadow = shadow;
    let w = pageW, h = pageW * (canvas.height / canvas.width);
    if (h > pageH + 0.5) { h = pageH; w = pageH * (canvas.width / canvas.height); }
    if (i > 0) doc.addPage(fmt, orient);
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h, undefined, 'FAST');
  }
  doc.save(`${filename}.pdf`);
}
