import { createStore } from './storage';

beforeEach(() => localStorage.clear());

test('save/load/list/remove round-trip', () => {
  const s = createStore<{ a: number }>('test_key_v1');
  expect(s.list()).toEqual([]);
  expect(s.save('one', { a: 1 })).toBe(true);
  expect(s.load('one')).toEqual({ a: 1 });
  expect(s.list()).toEqual(['one']);
  expect(s.remove('one')).toBe(true);
  expect(s.load('one')).toBeUndefined();
});

test('load of missing name is undefined', () => {
  const s = createStore('test_key_v1');
  expect(s.load('nope')).toBeUndefined();
});
