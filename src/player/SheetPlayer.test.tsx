import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SheetPlayer } from './SheetPlayer';
import { defaultDoc } from '../designer/sheetModel';

const playSequence = vi.hoisted(() => vi.fn());
vi.mock('../audio/usePiano', () => ({
  usePiano: () => ({ status: 'idle', playNote: vi.fn(), playSequence, stop: vi.fn() }),
}));

const doc = () => ({ ...defaultDoc(), bpm: 120, items: [
  { type: 'note' as const, noteId: 'C' }, { type: 'note' as const, noteId: 'E' }, { type: 'note' as const, noteId: 'G' },
] });

test('renders read-only tiles with transport controls but no edit controls', () => {
  render(<SheetPlayer source={doc()} />);
  for (const name of [/play/i, /stop/i, /loop/i, /metronome/i, /count-in/i]) {
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  }
  expect(screen.getByLabelText(/tempo/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'xxl' })).toBeInTheDocument();
  // No editing affordances from the designer.
  expect(screen.queryByLabelText(/tiles per row/i)).not.toBeInTheDocument();
  expect(document.querySelectorAll('.tile').length).toBeGreaterThan(0);
});

test('the tile-size control resizes the rendered tiles', async () => {
  render(<SheetPlayer source={doc()} />);
  expect((document.querySelector('.tile') as HTMLElement).style.width).toBe('64px');
  await userEvent.click(screen.getByRole('button', { name: 'xxl' }));
  expect((document.querySelector('.tile') as HTMLElement).style.width).toBe('112px');
});

test('Play hands playSequence the tempo-derived beat duration and 4-beat count-in', async () => {
  render(<SheetPlayer source={doc()} />);
  await userEvent.click(screen.getByRole('button', { name: /count-in/i }));
  await userEvent.click(screen.getByRole('button', { name: /^play/i }));
  const opts = playSequence.mock.calls.at(-1)![2];
  expect(opts.beatDur).toBeCloseTo(0.5); // 60 / 120
  expect(opts.countInBeats).toBe(4);
});

test('Load JSON loads a sheet into the empty player', async () => {
  render(<SheetPlayer source={{ ...defaultDoc(), items: [] }} />);
  expect(screen.getByText(/no song/i)).toBeInTheDocument();
  const json = JSON.stringify({ ...defaultDoc(), items: [{ type: 'note', noteId: 'D' }] });
  const file = new File([json], 'song.json', { type: 'application/json' });
  await userEvent.upload(screen.getByLabelText(/load json/i), file);
  await waitFor(() => expect(document.querySelectorAll('.tile').length).toBeGreaterThan(0));
  expect(screen.queryByText(/no song/i)).not.toBeInTheDocument();
});
