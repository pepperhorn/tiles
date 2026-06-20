import { parseSheetJson } from '../designer/json';
import type { SheetDoc } from '../designer/sheetModel';

// A shareable quiz: the full song (answer key) plus the fixed blank indexes.
export type Quiz = { doc: SheetDoc; blanks: number[] };

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeQuiz(quiz: Quiz): string {
  return toBase64Url(JSON.stringify({ doc: quiz.doc, blanks: quiz.blanks }));
}

export function decodeQuiz(encoded: string): Quiz {
  const parsed = JSON.parse(fromBase64Url(encoded));
  if (!parsed || typeof parsed !== 'object') throw new Error('Bad quiz payload');
  const doc = parseSheetJson(JSON.stringify(parsed.doc ?? parsed));
  const blanks = Array.isArray(parsed.blanks) ? parsed.blanks.filter((n: unknown) => Number.isInteger(n)) : [];
  return { doc, blanks };
}

/** Reads `#quiz=<base64url>` from a URL hash; returns null if absent/invalid. */
export function readQuizFromHash(hash: string): Quiz | null {
  const m = /[#&]quiz=([^&]+)/.exec(hash);
  if (!m) return null;
  try {
    return decodeQuiz(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}
