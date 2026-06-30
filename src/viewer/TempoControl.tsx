/** Live tempo (BPM) slider. Presentational: parent owns state. Clamps 20–300. */
export function TempoControl({ bpm, onBpm }: { bpm: number; onBpm: (bpm: number) => void }) {
  return (
    <div className="viewer-tempo flex flex-col gap-1.5">
      <div className="tempo-head flex items-center justify-between">
        <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400">Tempo</span>
        <span className="tempo-val text-xs font-semibold text-slate-600">{bpm} BPM</span>
      </div>
      <input
        className="input-tempo w-full"
        type="range" min={20} max={300} step={1}
        value={bpm}
        aria-label="Tempo (BPM)"
        onChange={e => onBpm(Math.min(300, Math.max(20, Number(e.target.value))))}
      />
    </div>
  );
}
