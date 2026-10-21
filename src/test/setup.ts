import '@testing-library/jest-dom/vitest';

// jsdom lacks ResizeObserver, used by useFitWidth.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverMock as unknown as typeof ResizeObserver);

// Node >= 25 ships a global `localStorage` that shadows jsdom's and, without
// --localstorage-file, has no working methods. Give tests an in-memory Storage.
if (typeof globalThis.localStorage?.clear !== 'function') {
  const data = new Map<string, string>();
  const storage: Storage = {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: k => data.get(String(k)) ?? null,
    key: i => [...data.keys()][i] ?? null,
    removeItem: k => { data.delete(String(k)); },
    setItem: (k, v) => { data.set(String(k), String(v)); },
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
}
