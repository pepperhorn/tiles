import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LibraryOverlay } from './LibraryOverlay';
import { defaultDoc } from './sheetModel';

const fetchLibraryList = vi.hoisted(() => vi.fn());
const fetchLibraryDoc = vi.hoisted(() => vi.fn());
vi.mock('../library', () => ({ fetchLibraryList, fetchLibraryDoc }));

const entries = [
  { id: 'a1', title: 'Alouette', subtitle: 'French folk', keyRoot: 'G', keyQuality: 'major' as const, bpm: 100 },
  { id: 'b2', title: 'Barcarolle', subtitle: null, keyRoot: null, keyQuality: null, bpm: null },
];

beforeEach(() => {
  fetchLibraryList.mockReset().mockResolvedValue(entries);
  fetchLibraryDoc.mockReset().mockResolvedValue({ ...defaultDoc(), title: 'Alouette', items: [{ type: 'note', noteId: 'G' }] });
});

test('lists songs with their metadata once loaded', async () => {
  render(<LibraryOverlay onLoad={vi.fn()} onClose={vi.fn()} />);
  expect(screen.getByText(/loading library/i)).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /alouette/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /barcarolle/i })).toBeInTheDocument();
  expect(screen.getByText(/french folk · g major · 100 bpm/i)).toBeInTheDocument();
});

test('search filters by title and subtitle', async () => {
  render(<LibraryOverlay onLoad={vi.fn()} onClose={vi.fn()} />);
  await screen.findByRole('button', { name: /alouette/i });
  await userEvent.type(screen.getByRole('searchbox', { name: /search/i }), 'french');
  expect(screen.getByRole('button', { name: /alouette/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /barcarolle/i })).not.toBeInTheDocument();
  await userEvent.clear(screen.getByRole('searchbox', { name: /search/i }));
  await userEvent.type(screen.getByRole('searchbox', { name: /search/i }), 'zzz');
  expect(screen.getByText(/no matches/i)).toBeInTheDocument();
});

test('an empty library with no search query shows dedicated empty copy', async () => {
  fetchLibraryList.mockResolvedValue([]);
  render(<LibraryOverlay onLoad={vi.fn()} onClose={vi.fn()} />);
  expect(await screen.findByText(/library is empty/i)).toBeInTheDocument();
  expect(screen.queryByText(/no matches/i)).not.toBeInTheDocument();
});

test('picking a song loads the parsed doc and closes', async () => {
  const onLoad = vi.fn();
  const onClose = vi.fn();
  render(<LibraryOverlay onLoad={onLoad} onClose={onClose} />);
  await userEvent.click(await screen.findByRole('button', { name: /alouette/i }));
  await waitFor(() => expect(onLoad).toHaveBeenCalled());
  expect(fetchLibraryDoc).toHaveBeenCalledWith('a1');
  expect(onLoad.mock.calls[0][0].title).toBe('Alouette');
  expect(onClose).toHaveBeenCalled();
});

test('a pick resolving after unmount does not call onLoad', async () => {
  let resolvePick!: (doc: unknown) => void;
  fetchLibraryDoc.mockReturnValue(new Promise(resolve => { resolvePick = resolve; }));
  const onLoad = vi.fn();
  const { unmount } = render(<LibraryOverlay onLoad={onLoad} onClose={vi.fn()} />);
  await userEvent.click(await screen.findByRole('button', { name: /alouette/i }));
  unmount();
  await act(async () => {
    resolvePick({ ...defaultDoc(), title: 'Alouette', items: [{ type: 'note', noteId: 'G' }] });
    await Promise.resolve();
  });
  expect(onLoad).not.toHaveBeenCalled();
});

test('a failed list fetch shows the error state and retry refetches', async () => {
  fetchLibraryList.mockRejectedValueOnce(new Error('boom'));
  render(<LibraryOverlay onLoad={vi.fn()} onClose={vi.fn()} />);
  expect(await screen.findByText(/couldn't reach the library/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /retry/i }));
  expect(await screen.findByRole('button', { name: /alouette/i })).toBeInTheDocument();
});

test('a failed doc fetch shows an inline error and keeps the overlay open', async () => {
  fetchLibraryDoc.mockRejectedValue(new Error('bad row'));
  const onClose = vi.fn();
  render(<LibraryOverlay onLoad={vi.fn()} onClose={onClose} />);
  await userEvent.click(await screen.findByRole('button', { name: /alouette/i }));
  expect(await screen.findByText(/couldn't load this song/i)).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});

test('Escape closes the overlay', async () => {
  const onClose = vi.fn();
  render(<LibraryOverlay onLoad={vi.fn()} onClose={onClose} />);
  await userEvent.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalled();
});
