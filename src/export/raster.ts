import html2canvas from 'html2canvas-pro';

export type RasterType = 'image/png' | 'image/webp';

export function extFor(type: RasterType): string {
  return type === 'image/webp' ? 'webp' : 'png';
}

async function canvasOf(el: HTMLElement): Promise<HTMLCanvasElement> {
  if (document.fonts?.ready) await document.fonts.ready;
  const shadow = el.style.boxShadow;
  el.style.boxShadow = 'none';
  try {
    return await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
  } finally {
    el.style.boxShadow = shadow;
  }
}

export async function blobFromElement(el: HTMLElement, type: RasterType): Promise<Blob> {
  const canvas = await canvasOf(el);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, 0.95));
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export async function exportRaster(el: HTMLElement, type: RasterType, baseName: string): Promise<void> {
  const blob = await blobFromElement(el, type);
  downloadBlob(blob, `${baseName}.${extFor(type)}`);
}
