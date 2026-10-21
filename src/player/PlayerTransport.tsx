import type { SheetPlayback } from './useSheetPlayback';

/** Play/Stop (tier-1 outline) + Loop/Metronome/Count-in (segmented toggles), per docs/DESIGN.md. */
export function PlayerTransport({ playback, compact = false, label = true }: { playback: SheetPlayback; compact?: boolean; label?: boolean }) {
  const p = playback;
  return (
    <div className="group group-transport player-transport grid gap-2">
      {label && <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400">Playback</span>}
      <div className="transport-actions grid grid-cols-2 gap-2">
        <button className="btn-play px-3 py-2 text-sm font-semibold" aria-label="Play" onClick={p.play}>▶ Play</button>
        <button className="btn-stop px-3 py-2 text-sm font-semibold" aria-label="Stop" onClick={p.stop}>■ Stop</button>
        {!compact && <>
          <button className="btn-loop px-3 py-2 text-sm" aria-pressed={p.loop} onClick={() => p.setLoop(v => !v)}>⟳ Loop</button>
          <button className="btn-metronome px-3 py-2 text-sm" aria-pressed={p.metronome} onClick={() => p.setMetronome(v => !v)}>🎵 Metronome</button>
          <button className="btn-countin px-3 py-2 text-sm col-span-2" aria-pressed={p.countIn} onClick={() => p.setCountIn(v => !v)}>Count-in (1 bar)</button>
        </>}
      </div>
      {p.status === 'loading' && <p className="transport-status text-xs text-slate-400">Loading piano…</p>}
      {p.status === 'error' && <p className="transport-status text-xs text-red-500">Audio unavailable.</p>}
    </div>
  );
}
