import { gradeAnswer } from './grade';

test('a matching pitch class is correct', () => {
  expect(gradeAnswer('C', 'C')).toBe(true);
  expect(gradeAnswer('Cs', 'Cs')).toBe(true); // C♯/D♭ share one tile/pitch class
});

test('a different pitch class is not correct', () => {
  expect(gradeAnswer('C', 'Cs')).toBe(false);
});

test('an unanswered blank is not correct', () => {
  expect(gradeAnswer(undefined, 'C')).toBe(false);
});
