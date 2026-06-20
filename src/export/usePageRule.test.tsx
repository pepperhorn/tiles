import { render, act } from '@testing-library/react';
import { useState } from 'react';
import { usePageRule } from './usePageRule';
import type { Paper, Orient } from '../geometry';

function TestComp({ paper, orient }: { paper: Paper; orient: Orient }) {
  usePageRule(paper, orient);
  return null;
}

test('inserts @page rule with correct size and orientation', () => {
  const { unmount } = render(<TestComp paper="A4" orient="portrait" />);
  const el = document.getElementById('dots-page-rule');
  expect(el).not.toBeNull();
  expect(el!.textContent).toContain('size: A4 portrait');
  unmount();
});

test('updates rule when props change', () => {
  function Wrapper() {
    const [paper, setPaper] = useState<Paper>('A4');
    const [orient, setOrient] = useState<Orient>('portrait');
    usePageRule(paper, orient);
    return (
      <button onClick={() => { setPaper('Letter'); setOrient('landscape'); }}>
        change
      </button>
    );
  }
  const { getByRole, unmount } = render(<Wrapper />);
  act(() => { getByRole('button').click(); });
  const el = document.getElementById('dots-page-rule');
  expect(el!.textContent).toContain('size: letter landscape');
  unmount();
});

test('removes the style element on unmount', () => {
  const { unmount } = render(<TestComp paper="A4" orient="portrait" />);
  expect(document.getElementById('dots-page-rule')).not.toBeNull();
  unmount();
  expect(document.getElementById('dots-page-rule')).toBeNull();
});
