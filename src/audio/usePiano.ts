import { useCallback, useEffect, useRef, useState } from 'react';

export type PlayEvent = { midi: number | null; dur: number; index?: number };
export type PianoStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Where the piano samples come from. smplr's Soundfont fetches one
 * `<kit>/<instrument>-<ogg|mp3>.js` file (MIDI.js format); by default from
 * https://gleitz.github.io/midi-js-soundfonts/. `instrumentUrl` (a full URL to
 * that file) or `baseUrl` (a directory laid out like gleitz's repo) let a host
 * self-host it, e.g. to satisfy a strict CSP `connect-src`.
 */
export type SoundfontSource = {
  /** General MIDI soundfont instrument name. Default `acoustic_grand_piano`. */
  instrument?: string;
  /** Soundfont kit. Default `MusyngKite`. */
  kit?: string;
  /** Directory holding `<kit>/<instrument>-<ogg|mp3>.js`. */
  baseUrl?: string;
  /** Full URL of the instrument file; wins over the other fields. */
  instrumentUrl?: string;
};

export type PianoOptions = {
  /** `false` never creates an AudioContext or loads samples: playback only drives the cursor. Default `true`. */
  audio?: boolean;
  soundfont?: SoundfontSource;
};

const DEFAULT_INSTRUMENT = 'acoustic_grand_piano';
const DEFAULT_KIT = 'MusyngKite';

/** smplr options for a SoundfontSource (only resolves `baseUrl` itself; the rest is smplr's own default). */
export function soundfontOptions(src: SoundfontSource = {}): { instrument?: string; kit?: string; instrumentUrl?: string } {
  const instrument = src.instrument ?? DEFAULT_INSTRUMENT;
  const kit = src.kit ?? DEFAULT_KIT;
  if (src.instrumentUrl) return { instrumentUrl: src.instrumentUrl };
  if (src.baseUrl) {
    const ogg = typeof Audio !== 'undefined' && new Audio().canPlayType('audio/ogg; codecs="vorbis"') !== '';
    return { instrumentUrl: `${src.baseUrl.replace(/\/$/, '')}/${kit}/${instrument}-${ogg ? 'ogg' : 'mp3'}.js` };
  }
  return { instrument, kit };
}

// A clock-only engine for `audio: false`: same scheduling, no sound.
function silentEngine(): Engine {
  const ctx = {
    state: 'running',
    get currentTime() { return performance.now() / 1000; },
    resume: async () => {},
  } as unknown as AudioContext;
  return { ctx, player: { start: () => {}, stop: () => {} }, silent: true };
}

type Engine = { silent?: boolean; ctx: AudioContext; player: { start: (o: { note: number; time: number; duration: number; velocity?: number }) => void; stop: () => void } };

// A short percussive metronome tick synthesised on the shared AudioContext — no
// extra sample to load. Scheduled at an absolute ctx time so it stays on the
// same clock as the notes and never drifts.
function scheduleClick(ctx: AudioContext, time: number): OscillatorNode {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 1600;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.35, time + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.05);
  return osc;
}

/**
 * Lazy piano via smplr's Soundfont (the small per-note samples, not the big
 * multi-velocity grand). The AudioContext + samples load on first play (which
 * must come from a user gesture). smplr is dynamically imported so it stays out
 * of the main bundle.
 */
export function usePiano(options: PianoOptions = {}) {
  // Read at load time (first play), so a changed option applies to the next engine only.
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });
  const engineRef = useRef<Engine | null>(null);
  const timers = useRef<number[]>([]);
  const clicks = useRef<OscillatorNode[]>([]);
  const looping = useRef(false);
  // Bumped by stop() and by each new playSequence; a play started before an
  // await must bail if the token moved on while it was suspended.
  const playToken = useRef(0);
  const [status, setStatus] = useState<PianoStatus>('idle');

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  // Silence any already-scheduled metronome/count-in clicks (stop() only knows
  // about smplr notes, not these raw oscillators). Calling stop() now also kills
  // clicks scheduled for the future (their start time is later than now).
  const clearClicks = () => {
    clicks.current.forEach(o => { try { o.stop(); } catch { /* already stopped */ } });
    clicks.current = [];
  };

  const ensure = useCallback(async (): Promise<Engine> => {
    const wantSilent = optionsRef.current.audio === false;
    if (engineRef.current && !!engineRef.current.silent === wantSilent) return engineRef.current;
    engineRef.current?.player.stop(); // switching between silent and audible engines
    if (wantSilent) {
      engineRef.current = silentEngine();
      setStatus('ready');
      return engineRef.current;
    }
    setStatus('loading');
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const { Soundfont } = await import('smplr');
      const player = new Soundfont(ctx, soundfontOptions(optionsRef.current.soundfont));
      await player.load;
      engineRef.current = { ctx, player: player as unknown as Engine['player'] };
      setStatus('ready');
      return engineRef.current;
    } catch (err) {
      setStatus('error');
      throw err;
    }
  }, []);

  const playNote = useCallback(async (midi: number, dur = 0.6) => {
    const { ctx, player, silent } = await ensure();
    if (silent) return;
    if (ctx.state === 'suspended') await ctx.resume();
    player.start({ note: midi, time: ctx.currentTime + 0.02, duration: dur * 0.9, velocity: 95 });
  }, [ensure]);

  // Schedules notes and (optionally) a metronome click track + one-bar count-in,
  // and drives a visual cursor via onStep. With `loop`, the body re-arms on the
  // same clock until `stop()`. All timing rides ctx.currentTime so audio and the
  // cursor stay in lockstep. Defaults reproduce the original behaviour.
  const playSequence = useCallback(async (
    events: PlayEvent[],
    onStep?: (index: number | null) => void,
    opts: { metronome?: boolean; countInBeats?: number; beatDur?: number; loop?: boolean } = {},
  ) => {
    const token = ++playToken.current;
    const { ctx, player, silent } = await ensure();
    if (playToken.current !== token) return; // stop()/another play fired during the load await
    if (ctx.state === 'suspended') await ctx.resume();
    if (playToken.current !== token) return; // ...or during the resume await
    player.stop();
    clearTimers();
    clearClicks();
    looping.current = !!opts.loop;
    const beatDur = opts.beatDur ?? events[0]?.dur ?? 0.5;
    const countIn = Math.max(0, opts.countInBeats ?? 0);

    // Schedule one pass; returns its end time. `withCountIn` adds the lead-in clicks.
    const runOnce = (startAt: number, withCountIn: boolean): number => {
      let t = startAt;
      if (withCountIn) for (let i = 0; i < countIn; i++) { if (!silent) clicks.current.push(scheduleClick(ctx, t)); t += beatDur; }
      for (const ev of events) {
        if (ev.midi != null) player.start({ note: ev.midi, time: t, duration: ev.dur * 0.9, velocity: 92 });
        if (opts.metronome && !silent) clicks.current.push(scheduleClick(ctx, t));
        if (onStep) {
          const at = Math.max(0, (t - ctx.currentTime) * 1000);
          timers.current.push(window.setTimeout(() => onStep(ev.index ?? null), at));
        }
        t += ev.dur;
      }
      return t;
    };

    let end = runOnce(ctx.currentTime + 0.06, countIn > 0);
    const arm = () => {
      const ms = Math.max(0, (end - ctx.currentTime) * 1000);
      timers.current.push(window.setTimeout(() => {
        if (looping.current) { end = runOnce(ctx.currentTime + 0.06, false); arm(); }
        else if (onStep) onStep(null);
      }, ms));
    };
    arm();
  }, [ensure]);

  const stop = useCallback(() => {
    playToken.current++; // invalidate any play still awaiting its soundfont load
    looping.current = false;
    engineRef.current?.player.stop();
    clearTimers();
    clearClicks();
  }, []);

  // Stop playback (and tear down the loop/timers) when the consumer unmounts,
  // so a viewer closed mid-loop doesn't keep re-arming and generating audio.
  useEffect(() => stop, [stop]);

  return { status, playNote, playSequence, stop };
}
