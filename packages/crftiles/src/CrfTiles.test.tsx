import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fixture from '../fixtures/amazing-grace.tiles.json';
import CrfTilesDefault, { CrfTiles, parseSheetJson, version, type SheetDoc } from './index';

const playSequence = vi.hoisted(() => vi.fn());
const pianoOptions = vi.hoisted(() => [] as unknown[]);
vi.mock('../../../src/audio/usePiano', () => ({
  usePiano: (options: unknown) => { pianoOptions.push(options); return { status: 'idle', playNote: vi.fn(), playSequence, stop: vi.fn() }; },
}));

const sheet = fixture as unknown as SheetDoc;
const tiles = () => document.querySelectorAll('.tile');
const noteTiles = sheet.items.filter(i => i.type === 'note' || i.type === 'pause' || i.type === 'arrow').length;

beforeEach(() => { playSequence.mockClear(); pianoOptions.length = 0; });

test('renders a real sheet from a SheetDoc object, inside the scoped root', async () => {
  const onReady = vi.fn();
  const { container } = render(<CrfTiles doc={sheet} onReady={onReady} />);
  const root = container.firstElementChild as HTMLElement;
  expect(root).toHaveClass('crftiles');
  expect(root).toHaveAttribute('role', 'region');
  expect(root).toHaveAccessibleName('Note tiles: Amazing Grace');
  expect(tiles()).toHaveLength(noteTiles);
  expect(screen.getByText('Amazing Grace')).toBeInTheDocument();
  await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
  expect(onReady.mock.calls[0][0].doc.title).toBe('Amazing Grace');
});

test('renders from a tiles JSON string', () => {
  render(<CrfTiles doc={JSON.stringify(sheet)} />);
  expect(tiles()).toHaveLength(noteTiles);
  expect(screen.getByRole('button', { name: /^play/i })).toBeInTheDocument();
});

test('full chrome shows transport, tempo and tile size; Play uses the bpm override', async () => {
  render(<CrfTiles doc={sheet} bpm={60} />);
  for (const name of [/^play/i, /^stop/i, /loop/i, /metronome/i, /count-in/i, 'xxl']) {
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  }
  expect((screen.getByLabelText(/tempo/i) as HTMLInputElement).value).toBe('60');
  await userEvent.click(screen.getByRole('button', { name: /^play/i }));
  expect(playSequence.mock.calls.at(-1)![2].beatDur).toBeCloseTo(1);
});

test('static mode has no transport or tempo and never plays', () => {
  render(<CrfTiles doc={sheet} mode="static" />);
  expect(screen.queryByRole('button', { name: /^play/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^stop/i })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/tempo/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'm' })).toBeInTheDocument(); // tile size stays (accessibility)
  expect(tiles()).toHaveLength(noteTiles);
});

test('minimal chrome is Play/Stop only; none is the bare sheet; controls override the preset', () => {
  const { unmount } = render(<CrfTiles doc={sheet} chrome="minimal" />);
  expect(screen.getByRole('button', { name: /^play/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /loop/i })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/tempo/i)).not.toBeInTheDocument();
  unmount();
  const { unmount: u2 } = render(<CrfTiles doc={sheet} chrome="none" />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  u2();
  render(<CrfTiles doc={sheet} chrome="none" controls={{ tileSize: true }} />);
  expect(screen.getByRole('button', { name: 'xxl' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^play/i })).not.toBeInTheDocument();
});

test('tileSize sets the initial tile size (label or px)', () => {
  const { rerender } = render(<CrfTiles doc={sheet} tileSize="xxl" />);
  expect((tiles()[0] as HTMLElement).style.width).toBe('112px');
  rerender(<CrfTiles doc={sheet} tileSize={40} />);
  expect((tiles()[0] as HTMLElement).style.width).toBe('40px');
});

test('an invalid doc calls onError and shows an alert', async () => {
  const onError = vi.fn();
  const onReady = vi.fn();
  render(<CrfTiles doc={'{"title":"no items"}'} onError={onError} onReady={onReady} />);
  await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  expect(screen.getByRole('alert')).toHaveTextContent(/could not load/i);
  expect(onReady).not.toHaveBeenCalled();
  expect(tiles()).toHaveLength(0);
});

test('malformed JSON text calls onError', async () => {
  const onError = vi.fn();
  render(<CrfTiles doc="{not json" onError={onError} />);
  await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
});

test('src fetches tiles JSON; a failed fetch calls onError', async () => {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => url.endsWith("ok.json") && init?.signal
    ? new Response(JSON.stringify(sheet), { status: 200 })
    : new Response('nope', { status: 404 }));
  vi.stubGlobal('fetch', fetchMock);
  try {
    const onReady = vi.fn();
    const { unmount } = render(<CrfTiles src="/sheets/ok.json" onReady={onReady} fetchOptions={{ credentials: 'omit' }} />);
    expect(screen.getByText(/loading sheet/i)).toBeInTheDocument();
    await waitFor(() => expect(tiles()).toHaveLength(noteTiles));
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'omit' });
    unmount();
    const onError = vi.fn();
    render(<CrfTiles src="/sheets/missing.json" onError={onError} />);
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0][0].message).toMatch(/404/);
  } finally {
    vi.unstubAllGlobals();
  }
});

test('audio and soundfont options reach the piano', () => {
  render(<CrfTiles doc={sheet} audio={false} soundfont={{ baseUrl: 'https://cdn.example/sf' }} />);
  expect(pianoOptions.at(-1)).toEqual({ audio: false, soundfont: { baseUrl: 'https://cdn.example/sf' } });
});

test('className, height and the exports', () => {
  const { container } = render(<CrfTiles doc={sheet} className="host-embed" height="420px" ariaLabel="Song" />);
  const root = container.firstElementChild as HTMLElement;
  expect(root).toHaveClass('crftiles', 'host-embed');
  expect(root.style.height).toBe('420px');
  expect(root).toHaveAttribute('data-height', 'fixed');
  expect(root).toHaveAccessibleName('Song');
  expect(CrfTilesDefault).toBe(CrfTiles);
  expect(version).toBe('0.1.1');
  expect(parseSheetJson(JSON.stringify(sheet)).items).toHaveLength(sheet.items.length);
});
