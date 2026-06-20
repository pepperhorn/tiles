import { keyToAction } from './useKeyboard';

test('letters map to natural notes (case-insensitive)', () => {
  expect(keyToAction({ key: 'c' })).toEqual({ type: 'insertNote', noteId: 'C' });
  expect(keyToAction({ key: 'G' })).toEqual({ type: 'insertNote', noteId: 'G' });
});

test('accidentals, arrows, break, delete, section', () => {
  expect(keyToAction({ key: '#' })).toEqual({ type: 'sharpenLast' });
  expect(keyToAction({ key: 's' })).toEqual({ type: 'sharpenLast' });
  expect(keyToAction({ key: 'b' })).toEqual({ type: 'flattenLast' });
  expect(keyToAction({ key: '-' })).toEqual({ type: 'flattenLast' });
  expect(keyToAction({ key: 'ArrowUp' })).toEqual({ type: 'insertArrow', dir: 'up' });
  expect(keyToAction({ key: 'ArrowDown' })).toEqual({ type: 'insertArrow', dir: 'down' });
  expect(keyToAction({ key: 'Enter' })).toEqual({ type: 'insertBreak' });
  expect(keyToAction({ key: 'Backspace' })).toEqual({ type: 'deleteLast' });
  expect(keyToAction({ key: '[' })).toEqual({ type: 'newSection' });
});

test('unmapped keys return null', () => {
  expect(keyToAction({ key: 'z' })).toBeNull();
  expect(keyToAction({ key: 'h' })).toBeNull();
});
