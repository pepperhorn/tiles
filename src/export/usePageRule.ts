import { useEffect } from 'react';
import type { Paper, Orient } from '../geometry';
import { cssPageName } from '../geometry';

export function usePageRule(paper: Paper, orient: Orient): void {
  useEffect(() => {
    const id = 'dots-page-rule';
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = `@page { size: ${cssPageName(paper)} ${orient}; margin: 0 }`;
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [paper, orient]);
}
