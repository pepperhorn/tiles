import { useMemo, useRef, useState } from 'react';
import type { SheetDoc } from '../designer/sheetModel';
import { parseSheetJson } from '../designer/json';
import { LibraryOverlay } from '../designer/LibraryOverlay';
import { TempoControl } from '../viewer/TempoControl';
import { TileSizeControl } from '../viewer/TileSizeControl';
import { tileAnnotations } from '../stringFingering';
import { PlayerSheet } from './PlayerSheet';
import { PlayerTransport } from './PlayerTransport';
import { useSheetPlayback } from './useSheetPlayback';

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

  const [msg, setMsg] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const renderDoc = useMemo(() => ({ ...active, size: sizePx }), [active, sizePx]);
  const annotations = useMemo(
    () => tileAnnotations(renderDoc.items, renderDoc.displayMode, renderDoc.accidentalStyle, undefined, renderDoc.fingeringPositions),
    [renderDoc.items, renderDoc.displayMode, renderDoc.accidentalStyle, renderDoc.fingeringPositions],
  );

  const playback = useSheetPlayback(active, bpm, annotations);

  const onUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { try { setLoaded(parseSheetJson(String(reader.result))); setMsg('Loaded JSON.'); } catch { setMsg('Invalid sheet JSON.'); } };
    reader.onerror = () => setMsg('Could not read file.');
    reader.readAsText(file);
  };

  const sheet = <PlayerSheet doc={renderDoc} annotations={annotations} playingIndex={playback.playingIndex} />;

  const controls = (
    <div className="player-controls flex flex-col gap-4">
      <div className="group group-load grid gap-2 border-b border-slate-200 pb-4">
        <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400">Sheet</span>
        <div className="config-source text-xs text-slate-500">{active.title?.trim() || (loaded ? 'uploaded JSON' : 'shared sheet')}</div>
        <button className="btn-load-json px-3 py-1 text-sm" onClick={() => fileRef.current?.click()}>Load JSON…</button>
        <button className="btn-library px-3 py-1 text-sm" onClick={() => setLibraryOpen(true)}>Library…</button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Load JSON"
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
        {msg && <div className="config-msg text-xs text-slate-500 break-all">{msg}</div>}
      </div>

      <PlayerTransport playback={playback} />

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
      {libraryOpen && (
        <LibraryOverlay
          onLoad={(d) => { setLoaded(d); setMsg('Loaded from library.'); }}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </div>
  );
}
