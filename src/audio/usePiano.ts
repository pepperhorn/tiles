import { useCallback, useRef, useState } from 'react';

export type PlayEvent = { midi: number | null; dur: number; index?: number };
export type PianoStatus = 'idle' | 'loading' | 'ready' | 'error';

type Engine = { ctx: AudioContext; player: { start: (o: { note: number; time: number; duration: number; velocity?: number }) => void; stop: () => void } };

/**
 * Lazy piano via smplr's Soundfont (the small per-note samples, not the big
 * multi-velocity grand). The AudioContext + samples load on first play (which
 * must come from a user gesture). smplr is dynamically imported so it stays out
 * of the main bundle.
 */
export function usePiano() {
  const engineRef = useRef<Engine | null>(null);
  const timers = useRef<number[]>([]);
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

  // Schedules the audio and (optionally) drives a visual cursor: onStep is
  // called with each event's `index` as it begins, then null when finished.
  const playSequence = useCallback(async (events: PlayEvent[], onStep?: (index: number | null) => void) => {
    const { ctx, player } = await ensure();
    if (ctx.state === 'suspended') await ctx.resume();
    player.stop();
    clearTimers();
    let t = ctx.currentTime + 0.06;
    for (const ev of events) {
      if (ev.midi != null) player.start({ note: ev.midi, time: t, duration: ev.dur * 0.9, velocity: 92 });
      if (onStep) {
        const at = Math.max(0, (t - ctx.currentTime) * 1000);
        timers.current.push(window.setTimeout(() => onStep(ev.index ?? null), at));
      }
      t += ev.dur;
    }
    if (onStep) {
      const end = Math.max(0, (t - ctx.currentTime) * 1000);
      timers.current.push(window.setTimeout(() => onStep(null), end));
    }
  }, [ensure]);

  const stop = useCallback(() => { engineRef.current?.player.stop(); clearTimers(); }, []);

  return { status, playNote, playSequence, stop };
}
