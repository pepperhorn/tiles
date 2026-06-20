export type Cmyk = [number, number, number, number];

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** RGB hex (#rgb or #rrggbb) → CMYK in 0..1 (jsPDF's CMYK channel range). */
export function hexToCmyk(hex: string): Cmyk {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return [0, 0, 0, 1];
  return [r3((1 - r - k) / (1 - k)), r3((1 - g - k) / (1 - k)), r3((1 - b - k) / (1 - k)), r3(k)];
}

export const CMYK_BLACK: Cmyk = [0, 0, 0, 1];
export const CMYK_WHITE: Cmyk = [0, 0, 0, 0];
