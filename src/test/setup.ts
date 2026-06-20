import '@testing-library/jest-dom/vitest';

// jsdom lacks ResizeObserver, used by useFitWidth.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverMock as unknown as typeof ResizeObserver);
