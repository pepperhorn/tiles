import { encodeQuiz, decodeQuiz, readQuizFromHash } from './encode';
import { defaultDoc } from '../designer/sheetModel';

const quiz = () => ({
  doc: { ...defaultDoc(), title: 'Twinkle ♯', items: [{ type: 'note' as const, noteId: 'C' }, { type: 'note' as const, noteId: 'G' }] },
  blanks: [1],
});

test('encode/decode round-trips a quiz (including unicode)', () => {
  const q = quiz();
  const decoded = decodeQuiz(encodeQuiz(q));
  expect(decoded.doc.title).toBe('Twinkle ♯');
  expect(decoded.doc.items).toHaveLength(2);
  expect(decoded.blanks).toEqual([1]);
});

test('readQuizFromHash extracts a quiz from a URL hash', () => {
  const enc = encodeQuiz(quiz());
  expect(readQuizFromHash(`#quiz=${enc}`)?.blanks).toEqual([1]);
});

test('readQuizFromHash returns null for an unrelated hash', () => {
  expect(readQuizFromHash('#nothing-here')).toBeNull();
});
