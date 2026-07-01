import { useMemo, useRef, useState } from 'react';
import type { SheetDoc } from '../designer/sheetModel';
import { parseSheetJson } from '../designer/json';
import { sheetLayout } from '../designer/layout';
import { SheetSurface } from '../designer/SheetSurface';
import { innerTile } from '../designer/tileRender';
import { itemsToPlayback } from '../audio/pitch';
import { usePiano } from '../audio/usePiano';
import { TILE_GAP } from '../geometry';
import { TempoControl } from '../viewer/TempoControl';
import { TileSizeControl } from '../viewer/TileSizeControl';

/**
 * View-and-playback-only sheet surface: renders a sheet read-only and plays it
 * back (with metronome, one-bar count-in, and loop). Tempo and tile size are
 * live view-time overrides seeded from the doc; neither mutates the source.
 */
export function SheetPlayer({ source, embed = false }: { source: SheetDoc; embed?: boolean }) {
  const [loaded, setLoaded] = useState<SheetDoc | null>(null);
  const active = loaded ?? source;

  // View-time overrides, re-seeded whenever the active doc changes (render-phase
  // reset pattern, as QuizViewer uses for its quizKey).
  const [seed, setSeed] = useState<SheetDoc>(active);
  const [bpm, setBpm] = useState(active.bpm);
  const [sizePx, setSizePx] = useState(active.size);
  if (seed !== active) { setSeed(active); setBpm(active.bpm); setSizePx(active.size); }

  const [loop, setLoop] = useState(false);
  const [metronome, setMetronome] = useState(false);
  const [countIn, setCountIn] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const piano = usePiano();

  const renderDoc = useMemo(() => ({ ...active, size: sizePx }), [active, sizePx]);
  const { rows } = useMemo(() => sheetLayout(renderDoc), [renderDoc]);

  const play = () => {
    const beatDur = 60 / bpm;
    const events = itemsToPlayback(active.items).map(s => ({ midi: s.midi, dur: beatDur, index: s.index }));
    void piano.playSequence(events, setPlayingIndex, { metronome, countInBeats: countIn ? 4 : 0, beatDur, loop });
  };
  const stop = () => { piano.stop(); setPlayingIndex(null); };

  const onUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { try { setLoaded(parseSheetJson(String(reader.result))); setMsg('Loaded JSON.'); } catch { setMsg('Invalid sheet JSON.'); } };
    reader.onerror = () => setMsg('Could not read file.');
    reader.readAsText(file);
  };

  const sheet = (
    <SheetSurface doc={renderDoc}>
      <div className="sheet-body flex flex-col gap-1.5">
        {rows.map((row, ri) =>
          row.kind === 'section'
            ? <div key={ri} className="row-section font-semibold text-slate-700 mt-2">{row.text}</div>
            : (
              <div key={ri} className="row-tiles flex flex-wrap" style={{ gap: TILE_GAP }}>
                {row.cells.map(cell => (
                  <div key={cell.index} className={`tile-slot ${playingIndex === cell.index ? 'is-playing' : ''}`}>
                    {innerTile(cell.item, renderDoc.size, renderDoc.accidentalStyle)}
                  </div>
                ))}
              </div>
            ))}
        {active.items.length === 0 && <div className="empty text-slate-400 text-sm">No song loaded.</div>}
      </div>
    </SheetSurface>
  );

  const controls = (
    <div className="player-controls flex flex-col gap-4">
      <div className="group group-load grid gap-2 border-b border-slate-200 pb-4">
        <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400">Sheet</span>
        <div className="config-source text-xs text-slate-500">{active.title?.trim() || (loaded ? 'uploaded JSON' : 'shared sheet')}</div>
        <button className="btn-load-json px-3 py-1 text-sm" onClick={() => fileRef.current?.click()}>Load JSON…</button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Load JSON"
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
        {msg && <div className="config-msg text-xs text-slate-500 break-all">{msg}</div>}
      </div>

      <div className="group group-transport player-transport grid gap-2">
        <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400">Playback</span>
        <div className="transport-actions grid grid-cols-2 gap-2">
          <button className="btn-play px-3 py-2 text-sm font-semibold" aria-label="Play" onClick={play}>▶ Play</button>
          <button className="btn-stop px-3 py-2 text-sm font-semibold" aria-label="Stop" onClick={stop}>■ Stop</button>
          <button className="btn-loop px-3 py-2 text-sm" aria-pressed={loop} onClick={() => setLoop(v => !v)}>⟳ Loop</button>
          <button className="btn-metronome px-3 py-2 text-sm" aria-pressed={metronome} onClick={() => setMetronome(v => !v)}>🎵 Metronome</button>
          <button className="btn-countin px-3 py-2 text-sm col-span-2" aria-pressed={countIn} onClick={() => setCountIn(v => !v)}>Count-in (1 bar)</button>
        </div>
        {piano.status === 'loading' && <p className="text-xs text-slate-400">Loading piano…</p>}
        {piano.status === 'error' && <p className="text-xs text-red-500">Audio unavailable.</p>}
      </div>

      <TempoControl bpm={bpm} onBpm={setBpm} />
      <TileSizeControl sizePx={sizePx} onSize={setSizePx} />
    </div>
  );

  return (
    <div className={`sheet-player flex flex-col lg:grid lg:grid-cols-[320px_1fr] ${embed ? 'h-[100dvh]' : 'h-full'} lg:h-full`}>
      <main className="stage order-1 lg:order-2 flex-1 lg:flex-none min-h-0 overflow-auto p-4 lg:p-8 border-b border-slate-200 lg:border-b-0">
        {sheet}
      </main>
      <aside className="player-panel no-print order-2 lg:order-1 basis-[45%] lg:basis-auto shrink-0 lg:shrink min-h-0 overflow-y-auto bg-white lg:border-r lg:border-slate-200 p-5">
        {controls}
      </aside>
    </div>
  );
}
