import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizViewer } from './QuizViewer';
import { defaultDoc } from '../designer/sheetModel';

vi.mock('../audio/usePiano', () => ({
  usePiano: () => ({ status: 'idle', playNote: vi.fn(), playSequence: vi.fn(), stop: vi.fn() }),
}));

const source = () => ({ ...defaultDoc(), bpm: 120, items: [
  { type: 'note' as const, noteId: 'C' }, { type: 'note' as const, noteId: 'E' },
  { type: 'note' as const, noteId: 'G' }, { type: 'note' as const, noteId: 'C' },
] });

test('the quiz viewer exposes tempo and tile-size controls', () => {
  render(<QuizViewer source={source()} preset={{ knownPct: 0.6, seed: 1 }} />);
  expect(screen.getByLabelText(/tempo/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'xxl' })).toBeInTheDocument();
});

test('the size control resizes the rendered blank cells', async () => {
  render(<QuizViewer source={source()} preset={{ knownPct: 0.5, seed: 1 }} />);
  await userEvent.click(screen.getByRole('button', { name: 'xxl' }));
  const cell = document.querySelector('.quiz-cell') as HTMLElement;
  expect(cell.style.width).toBe('112px');
});
