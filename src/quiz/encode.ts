import { parseSheetJson } from '../designer/json';
import type { SheetDoc } from '../designer/sheetModel';

// The sheet JSON is the core artifact. Quiz params are an OPTIONAL addon preset
// (a difficulty starting point) — take them or leave them. A quiz-taker can
// adjust difficulty from the preset, so we store the params, not fixed blanks.
export type QuizPreset = { knownPct: number; seed: number };
export type Quiz = { doc: SheetDoc; quiz: QuizPreset };

export const DEFAULT_PRESET: QuizPreset = { knownPct: 0.6, seed: 1 };

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

function readPreset(raw: unknown): QuizPreset {
  const q = (raw ?? {}) as Partial<QuizPreset>;
  const knownPct = typeof q.knownPct === 'number' ? Math.min(0.9, Math.max(0.25, q.knownPct)) : DEFAULT_PRESET.knownPct;
  const seed = Number.isInteger(q.seed) ? (q.seed as number) : DEFAULT_PRESET.seed;
  return { knownPct, seed };
}

// --- Sheet (edit) -----------------------------------------------------------

export function encodeSheet(doc: SheetDoc): string {
  return toBase64Url(JSON.stringify(doc));
}

export function readEditFromHash(hash: string): SheetDoc | null {
  const m = /[#&]edit=([^&]+)/.exec(hash);
  if (!m) return null;
  try {
    return parseSheetJson(fromBase64Url(decodeURIComponent(m[1])));
  } catch {
    return null;
  }
}

// --- Quiz (sheet + addon preset) -------------------------------------------

export function encodeQuiz(quiz: Quiz): string {
  return toBase64Url(JSON.stringify({ doc: quiz.doc, quiz: quiz.quiz }));
}

export function decodeQuiz(encoded: string): Quiz {
  const parsed = JSON.parse(fromBase64Url(encoded));
  if (!parsed || typeof parsed !== 'object') throw new Error('Bad quiz payload');
  // Accept a bare sheet too (quiz addon omitted → default preset).
  const doc = parseSheetJson(JSON.stringify(parsed.doc ?? parsed));
  return { doc, quiz: readPreset(parsed.quiz) };
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
