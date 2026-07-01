import { useCallback, useRef, useState } from 'react';

export type PlayEvent = { midi: number | null; dur: number; index?: number };
export type PianoStatus = 'idle' | 'loading' | 'ready' | 'error';

type Engine = { ctx: AudioContext; player: { start: (o: { note: number; time: number; duration: number; velocity?: number }) => void; stop: () => void } };

// A short percussive metronome tick synthesised on the shared AudioContext — no
// extra sample to load. Scheduled at an absolute ctx time so it stays on the
// same clock as the notes and never drifts.
function scheduleClick(ctx: AudioContext, time: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 1600;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.35, time + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.05);
}

/**
 * Lazy piano via smplr's Soundfont (the small per-note samples, not the big
 * multi-velocity grand). The AudioContext + samples load on first play (which
 * must come from a user gesture). smplr is dynamically imported so it stays out
 * of the main bundle.
 */
export function usePiano() {
  const engineRef = useRef<Engine | null>(null);
  const timers = useRef<number[]>([]);
  const looping = useRef(false);
  const [status, setStatus] = useState<PianoStatus>('idle');

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const ensure = useCallback(async (): Promise<Engine> => {
    if (engineRef.current) return engineRef.current;
    setStatus('loading');
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const { Soundfont } = await import('smplr');
      const player = new Soundfont(ctx, { instrument: 'acoustic_grand_piano' });
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
    const { ctx, player } = await ensure();
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
    const { ctx, player } = await ensure();
    if (ctx.state === 'suspended') await ctx.resume();
    player.stop();
    clearTimers();
    looping.current = !!opts.loop;
    const beatDur = opts.beatDur ?? events[0]?.dur ?? 0.5;
    const countIn = Math.max(0, opts.countInBeats ?? 0);

    // Schedule one pass; returns its end time. `withCountIn` adds the lead-in clicks.
    const runOnce = (startAt: number, withCountIn: boolean): number => {
      let t = startAt;
      if (withCountIn) for (let i = 0; i < countIn; i++) { scheduleClick(ctx, t); t += beatDur; }
      for (const ev of events) {
        if (ev.midi != null) player.start({ note: ev.midi, time: t, duration: ev.dur * 0.9, velocity: 92 });
        if (opts.metronome) scheduleClick(ctx, t);
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

  const stop = useCallback(() => { looping.current = false; engineRef.current?.player.stop(); clearTimers(); }, []);

  return { status, playNote, playSequence, stop };
}
