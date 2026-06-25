import { useEffect, useRef } from 'react';
import type { Action } from './sheetModel';

const NOTE_LETTERS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
export type KeyResult = Action | { type: 'newSection' };

export function keyToAction(e: { key: string }): KeyResult | null {
  const k = e.key;
  const upper = k.toUpperCase();
  // 'b' is flat, not the note B — accidental keys win.
  if (k === '#' || k === 's' || k === 'S') return { type: 'sharpenLast' };
  if (k === 'b' || k === '-') return { type: 'flattenLast' };
  if (NOTE_LETTERS.has(upper) && k.length === 1) return { type: 'insertNote', noteId: upper };
  if (k === 'ArrowUp') return { type: 'insertArrow', dir: 'up' };
  if (k === 'ArrowDown') return { type: 'insertArrow', dir: 'down' };
  if (k === 'Enter') return { type: 'insertBreak' };
  if (k === 'Backspace') return { type: 'deleteLast' };
  if (k === '[') return { type: 'newSection' };
  return null;
}

export function useKeyboard(handle: (r: KeyResult) => void, enabled: boolean) {
  // Keep the latest handler in a ref so the window listener binds exactly once
  // (toggling only with `enabled`) instead of tearing down and re-adding on
  // every edit — handle is a fresh closure each render by design.
  const handleRef = useRef(handle);
  useEffect(() => { handleRef.current = handle; });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      const r = keyToAction(e);
      if (r) { e.preventDefault(); handleRef.current(r); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
