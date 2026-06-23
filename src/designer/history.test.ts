import { historyReducer, initHistory } from './history';
import { defaultDoc } from './sheetModel';

test('undo and redo step through edits', () => {
  let h = initHistory(defaultDoc());
  h = historyReducer(h, { type: 'insertNote', noteId: 'C' });
  h = historyReducer(h, { type: 'insertNote', noteId: 'E' });
  expect(h.present.items).toHaveLength(2);

  h = historyReducer(h, { type: 'undo' });
  expect(h.present.items).toEqual([{ type: 'note', noteId: 'C' }]);

  h = historyReducer(h, { type: 'undo' });
  expect(h.present.items).toEqual([]);

  h = historyReducer(h, { type: 'redo' });
  expect(h.present.items).toEqual([{ type: 'note', noteId: 'C' }]);
});

test('undo/redo are no-ops at the ends of history', () => {
  const base = initHistory(defaultDoc());
  expect(historyReducer(base, { type: 'undo' })).toBe(base);
  expect(historyReducer(base, { type: 'redo' })).toBe(base);
});

test('a fresh edit clears the redo stack', () => {
  let h = initHistory(defaultDoc());
  h = historyReducer(h, { type: 'insertNote', noteId: 'C' });
  h = historyReducer(h, { type: 'undo' });
  expect(h.future).toHaveLength(1);
  h = historyReducer(h, { type: 'insertNote', noteId: 'G' });
  expect(h.future).toHaveLength(0);
  expect(h.present.items).toEqual([{ type: 'note', noteId: 'G' }]);
});

test('no-op edits are not recorded in history', () => {
  let h = initHistory(defaultDoc());
  // sharpenLast with no notes present is a no-op — must not create an undo step.
  h = historyReducer(h, { type: 'sharpenLast' });
  expect(h.past).toHaveLength(0);
  expect(historyReducer(h, { type: 'undo' })).toBe(h);
});
