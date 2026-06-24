import { useLayoutEffect, useRef } from 'react';

/**
 * Scales a fixed-width preview down so its WIDTH fits the parent's content box,
 * leaving vertical overflow to scroll. Uses CSS `zoom` (affects layout, so no
 * leftover whitespace) and never upscales past 1. Applied imperatively to avoid
 * re-render churn; export code can temporarily reset it via withExportReady.
 */
export function useFitWidth(naturalW: number) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent || !naturalW) return;
    const compute = () => {
      const cs = getComputedStyle(parent);
      const pl = parseFloat(cs.paddingLeft) || 0;
      const pr = parseFloat(cs.paddingRight) || 0;
      const availW = parent.clientWidth - pl - pr;
      if (availW <= 0) return; // jsdom / not yet laid out
      const scale = Math.min(availW / naturalW, 1);
      el.style.zoom = String(scale > 0 && Number.isFinite(scale) ? scale : 1);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(parent);
    window.addEventListener('resize', compute);
    return () => { ro.disconnect(); window.removeEventListener('resize', compute); };
  }, [naturalW]);
  return ref;
}
