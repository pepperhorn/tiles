import { encodeQuiz, decodeQuiz, readQuizFromHash, encodeSheet, readEditFromHash } from './encode';
import { defaultDoc } from '../designer/sheetModel';

const quiz = () => ({
  doc: { ...defaultDoc(), title: 'Twinkle ♯', items: [{ type: 'note' as const, noteId: 'C' }, { type: 'note' as const, noteId: 'G' }] },
  quiz: { knownPct: 0.6, seed: 3 },
});

test('encode/decode round-trips a quiz with its addon preset (incl. unicode)', () => {
  const decoded = decodeQuiz(encodeQuiz(quiz()));
  expect(decoded.doc.title).toBe('Twinkle ♯');
  expect(decoded.doc.items).toHaveLength(2);
  expect(decoded.quiz).toEqual({ knownPct: 0.6, seed: 3 });
});

test('a bare sheet (no quiz addon) decodes with the default preset', () => {
  const enc = encodeSheet(quiz().doc);
  const decoded = decodeQuiz(enc);
  expect(decoded.doc.title).toBe('Twinkle ♯');
  expect(decoded.quiz.knownPct).toBe(0.6);
});

test('readEditFromHash loads a sheet from #edit=', () => {
  const enc = encodeSheet(quiz().doc);
  expect(readEditFromHash(`#edit=${enc}`)?.title).toBe('Twinkle ♯');
});

test('readQuizFromHash extracts a quiz from #quiz=', () => {
  expect(readQuizFromHash(`#quiz=${encodeQuiz(quiz())}`)?.quiz.seed).toBe(3);
});

test('readQuizFromHash returns null for an unrelated hash', () => {
  expect(readQuizFromHash('#nothing-here')).toBeNull();
});
