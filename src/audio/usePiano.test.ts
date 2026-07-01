import { renderHook, act } from '@testing-library/react';
import { usePiano } from './usePiano';

// smplr's Soundfont is dynamically imported inside the hook; mock it so `load`
// resolves instantly and note starts/stops land on spies we can assert against.
const { startSpy, stopSpy } = vi.hoisted(() => ({ startSpy: vi.fn(), stopSpy: vi.fn() }));
vi.mock('smplr', () => ({
  Soundfont: class {
    load = Promise.resolve();
    start = startSpy;
    stop = stopSpy;
  },
}));

// Minimal fake AudioContext: a fixed clock and oscillator/gain factories that
// record calls. currentTime stays 0 so scheduled times are deterministic.
type FakeOsc = { frequency: { value: number }; connect: () => { connect: () => void }; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
const contexts: Array<{ createOscillator: ReturnType<typeof vi.fn>; oscs: FakeOsc[] }> = [];

class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  oscs: FakeOsc[] = [];
  resume = vi.fn(async () => {});
  createGain = vi.fn(() => ({ gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => ({ connect: () => {} }) }));
  createOscillator = vi.fn((): FakeOsc => {
    const osc: FakeOsc = { frequency: { value: 0 }, connect: () => ({ connect: () => {} }), start: vi.fn(), stop: vi.fn() };
    this.oscs.push(osc);
    return osc;
  });
  constructor() { contexts.push(this); }
}

const lastCtx = () => contexts[contexts.length - 1];

beforeEach(() => {
  startSpy.mockClear();
  stopSpy.mockClear();
  contexts.length = 0;
  vi.stubGlobal('AudioContext', FakeAudioContext);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test('metronome schedules one click per event', async () => {
  const { result } = renderHook(() => usePiano());
  await act(async () => {
    await result.current.playSequence(
      [{ midi: 60, dur: 0.5 }, { midi: 62, dur: 0.5 }],
      undefined,
      { metronome: true, beatDur: 0.5 },
    );
  });
  // 2 notes played + one metronome oscillator per note (no count-in).
  expect(startSpy).toHaveBeenCalledTimes(2);
  expect(lastCtx().createOscillator).toHaveBeenCalledTimes(2);
});

test('count-in delays the first note by one bar and clicks the beats', async () => {
  const { result } = renderHook(() => usePiano());
  await act(async () => {
    await result.current.playSequence(
      [{ midi: 60, dur: 0.5 }],
      undefined,
      { countInBeats: 4, beatDur: 0.5 },
    );
  });
  // Start offset 0.06 + 4 beats * 0.5s = 2.06s before the first note sounds.
  const noteCall = startSpy.mock.calls.find(c => c[0].note === 60);
  expect(noteCall?.[0].time).toBeCloseTo(2.06, 5);
  // Four count-in clicks (one oscillator each), no metronome on the note itself.
  expect(lastCtx().createOscillator).toHaveBeenCalledTimes(4);
});

test('loop re-arms for another pass and stop() halts it', async () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => usePiano());
  await act(async () => {
    await result.current.playSequence([{ midi: 60, dur: 0.5 }], undefined, { loop: true, beatDur: 0.5 });
  });
  expect(startSpy).toHaveBeenCalledTimes(1); // first pass

  // end = 0.06 + 0.5 = 0.56s → re-arm timer fires ~560ms; advance past it.
  await act(async () => { vi.advanceTimersByTime(700); });
  expect(startSpy).toHaveBeenCalledTimes(2); // second pass scheduled by the loop

  act(() => { result.current.stop(); });
  await act(async () => { vi.advanceTimersByTime(2000); });
  expect(startSpy).toHaveBeenCalledTimes(2); // no further passes after stop
});

test('stop() during the load await cancels playback that had not started', async () => {
  const { result } = renderHook(() => usePiano());
  await act(async () => {
    const playing = result.current.playSequence([{ midi: 60, dur: 0.5 }]);
    result.current.stop(); // pressed while the soundfont is still loading
    await playing;
  });
  // The play resolved past its await, saw the token bumped, and bailed.
  expect(startSpy).not.toHaveBeenCalled();
});
