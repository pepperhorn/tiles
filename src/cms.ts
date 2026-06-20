import { encodeSheet, encodeQuiz, type QuizPreset } from './quiz/encode';
import type { SheetDoc } from './designer/sheetModel';

// Email receipts post a row to the crf-cms `tiles` collection; a Directus flow
// then emails the stored edit/quiz links. Inert unless VITE_CMS_URL is set.
const CMS_URL = (import.meta.env as Record<string, string | undefined>).VITE_CMS_URL;
export const cmsEnabled = !!CMS_URL;

export async function emailReceipt(opts: { email: string; doc: SheetDoc; preset?: QuizPreset }): Promise<void> {
  if (!CMS_URL) throw new Error('Email is not configured.');
  const base = `${window.location.origin}${window.location.pathname}`;
  const edit_url = `${base}#edit=${encodeSheet(opts.doc)}`;
  const quiz_url = opts.preset ? `${base}#quiz=${encodeQuiz({ doc: opts.doc, quiz: opts.preset })}` : '';
  const res = await fetch(`${CMS_URL.replace(/\/$/, '')}/items/tiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: opts.email.trim(),
      kind: opts.preset ? 'quiz' : 'design',
      title: opts.doc.title?.trim() || 'CRF Sheet',
      edit_url,
      quiz_url,
      sheet_json: opts.doc,
      quiz_preset: opts.preset ?? null,
    }),
  });
  if (!res.ok) throw new Error(`Email failed (${res.status})`);
}
