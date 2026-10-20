import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { SheetDoc } from '../../../src/designer/sheetModel';
import { parseSheetJson, parseSheetValue } from '../../../src/designer/json';
import type { SoundfontSource } from '../../../src/audio/usePiano';
import { tileAnnotations } from '../../../src/stringFingering';
import { NOTES } from '../../../src/notes';
import { TILE_SIZE_SCALE } from '../../../src/viewer/sizes';
import { TempoControl } from '../../../src/viewer/TempoControl';
import { TileSizeControl } from '../../../src/viewer/TileSizeControl';
import { PlayerSheet } from '../../../src/player/PlayerSheet';
import { PlayerTransport } from '../../../src/player/PlayerTransport';
import { useSheetPlayback } from '../../../src/player/useSheetPlayback';
import { resolveChrome, type ChromePreset, type CrfTilesControls } from './chrome';
import { ROOT_CLASS } from './meta';

/** Named tile sizes (xs 40px, s 52, m 64, l 80, xl 96, xxl 112), as the tile-size buttons offer. */
export type TileSizeLabel = 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl';

export type CrfTilesReadyInfo = { doc: SheetDoc };

export type CrfTilesProps = {
  /** The sheet: a SheetDoc object or tiles JSON text. Validated like a file import (parseSheetJson). Wins over `src`. */
  doc?: SheetDoc | string;
  /** URL of a tiles JSON file, fetched on the client. */
  src?: string;
  /** Extra `fetch` options for `src` (headers, credentials, …). */
  fetchOptions?: RequestInit;
  /** `player` (default): view + playback. `static`: read-only, no transport, never loads audio. */
  mode?: 'player' | 'static';
  /** UI around the sheet. Default `full`. */
  chrome?: ChromePreset;
  /** Turn single controls on or off over the chrome preset. */
  controls?: CrfTilesControls;
  /** Initial tempo override (20–300). Defaults to the sheet's own bpm. */
  bpm?: number;
  /** Initial tile size override, in px or as a size label. Defaults to the sheet's own size. */
  tileSize?: number | TileSizeLabel;
  /** Any CSS height (e.g. `480px`, `60vh`). The sheet then scrolls inside. Default: natural height. */
  height?: string;
  className?: string;
  /** Accessible name of the region. Default `Note tiles: <title>`. */
  ariaLabel?: string;
  /** `false`: Play still runs the tile cursor, silently; no AudioContext, no sample download. Default `true`. */
  audio?: boolean;
  /** Where the piano samples load from (see README, CSP). Default: smplr's gleitz.github.io MusyngKite piano. */
  soundfont?: SoundfontSource;
  /** Called once a sheet is parsed and rendered (again for each new sheet). */
  onReady?: (info: CrfTilesReadyInfo) => void;
  /** Called when the sheet can't be fetched or isn't a valid tiles doc. */
  onError?: (error: Error) => void;
};

type LoadState = { status: 'idle' } | { status: 'loading' } | { status: 'ready'; doc: SheetDoc } | { status: 'error'; error: Error };

const toError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

/**
 * A sheet passed as an object is keyed by its JSON, so a host re-rendering with a new object of the same content
 * (e.g. an inline `JSON.parse`) doesn't reset the view. Either way the text is parsed like a JSON file import.
 */
function docText(doc: CrfTilesProps['doc']): { text: string } | { error: Error } | null {
  if (doc == null) return null;
  if (typeof doc === 'string') return { text: doc };
  try { return { text: JSON.stringify(doc) }; } catch (e) { return { error: toError(e) }; }
}

function sizeToPx(size: number | TileSizeLabel | undefined): number | undefined {
  if (size == null) return undefined;
  if (typeof size === 'number') return Number.isFinite(size) && size > 0 ? size : undefined;
  return TILE_SIZE_SCALE.find(s => s.label === size)?.px;
}

const clampBpm = (bpm: number) => Math.min(300, Math.max(20, Math.round(bpm)));

/** Resolves `doc` (synchronously) or `src` (fetched) into a SheetDoc or an error. */
function useSheet(doc: CrfTilesProps['doc'], src: string | undefined, fetchOptions: RequestInit | undefined): LoadState {
  const input = useMemo(() => docText(doc), [doc]);
  const text = input && 'text' in input ? input.text : null;
  const inputError = input && 'error' in input ? input.error : null;
  const hasDoc = input != null;
  const fromText = useMemo<LoadState | null>(() => {
    if (text == null) return null;
    try { return { status: 'ready', doc: parseSheetJson(text) }; } catch (e) { return { status: 'error', error: toError(e) }; }
  }, [text]);
  const fromDoc = inputError ? { status: 'error' as const, error: inputError } : fromText;

  const [fetched, setFetched] = useState<{ src: string; state: LoadState } | null>(null);
  const optionsRef = useRef(fetchOptions);
  useEffect(() => { optionsRef.current = fetchOptions; });
  useEffect(() => {
    if (hasDoc || !src) return;
    const ctrl = new AbortController();
    fetch(src, { ...optionsRef.current, signal: ctrl.signal })
      .then(async res => {
        if (!res.ok) throw new Error(`Sheet request failed (${res.status})`);
        return parseSheetJson(await res.text());
      })
      .then(d => setFetched({ src, state: { status: 'ready', doc: d } }))
      .catch(e => { if (!ctrl.signal.aborted) setFetched({ src, state: { status: 'error', error: toError(e) } }); });
    return () => ctrl.abort();
  }, [hasDoc, src]);

  if (fromDoc) return fromDoc;
  if (!src) return { status: 'idle' };
  return fetched?.src === src ? fetched.state : { status: 'loading' };
}

/**
 * The read-only Note·Tiles sheet viewer/player as an embeddable component. Renders the sheet fit to its container's
 * width, with optional transport, tempo and tile-size controls. Tempo and tile size are view-time overrides; the
 * sheet itself is never modified. Import `crftiles/style.css` once.
 */
export function CrfTiles({
  doc, src, fetchOptions, mode = 'player', chrome = 'full', controls, bpm: bpmProp, tileSize, height, className,
  ariaLabel, audio = true, soundfont, onReady, onError,
}: CrfTilesProps) {
  const state = useSheet(doc, src, fetchOptions);
  const sheet = state.status === 'ready' ? state.doc : null;
  const playable = mode !== 'static';
  const ui = resolveChrome(chrome, controls, playable);

  // View-time overrides, re-seeded when the sheet or the initial-value props change (render-phase reset, as in the
  // app's SheetPlayer).
  const seedKey = { sheet, bpmProp, tileSize };
  const [seed, setSeed] = useState(seedKey);
  const initialBpm = clampBpm(bpmProp ?? sheet?.bpm ?? 120);
  const initialSize = sizeToPx(tileSize) ?? sheet?.size ?? 64;
  const [bpm, setBpm] = useState(initialBpm);
  const [sizePx, setSizePx] = useState(initialSize);
  if (seed.sheet !== sheet || seed.bpmProp !== bpmProp || seed.tileSize !== tileSize) {
    setSeed(seedKey); setBpm(initialBpm); setSizePx(initialSize);
  }

  const active = sheet ?? EMPTY;
  const renderDoc = useMemo(() => ({ ...active, size: sizePx }), [active, sizePx]);
  const annotations = useMemo(
    () => tileAnnotations(renderDoc.items, renderDoc.displayMode, renderDoc.accidentalStyle, undefined, renderDoc.fingeringPositions),
    [renderDoc.items, renderDoc.displayMode, renderDoc.accidentalStyle, renderDoc.fingeringPositions],
  );
  const playback = useSheetPlayback(active, bpm, annotations, { audio, soundfont });

  // Stop playback when the sheet changes or the embed becomes static.
  const { stop } = playback;
  const stopRef = useRef(stop);
  useEffect(() => { stopRef.current = stop; });
  useEffect(() => () => stopRef.current(), [sheet, playable]);

  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  useEffect(() => { onReadyRef.current = onReady; onErrorRef.current = onError; });
  const error = state.status === 'error' ? state.error : null;
  useEffect(() => { if (sheet) onReadyRef.current?.({ doc: sheet }); }, [sheet]);
  useEffect(() => { if (error) onErrorRef.current?.(error); }, [error]);

  const style: CSSProperties | undefined = height ? { height } : undefined;
  const title = sheet?.title?.trim();

  return (
    <div
      className={[ROOT_CLASS, className].filter(Boolean).join(' ')}
      role="region"
      aria-label={ariaLabel ?? (title ? `Note tiles: ${title}` : 'Note tiles')}
      aria-busy={state.status === 'loading' || undefined}
      data-chrome={chrome}
      data-mode={mode}
      data-height={height ? 'fixed' : 'natural'}
      style={style}
    >
      {ui.bar && sheet && (
        <div className="crftiles-bar">
          {ui.transport && <PlayerTransport playback={playback} compact={!ui.transportExtras} label={false} />}
          {ui.tempo && <div className="crftiles-bar-item crftiles-tempo"><TempoControl bpm={bpm} onBpm={setBpm} /></div>}
          {ui.tileSize && <div className="crftiles-bar-item crftiles-size"><TileSizeControl sizePx={sizePx} onSize={setSizePx} /></div>}
        </div>
      )}
      {chrome !== 'none' && ui.bar && sheet && <div className="crftiles-spectrum spectrum" aria-hidden="true">{SPECTRUM}</div>}
      <div className="crftiles-stage">
        {sheet && <PlayerSheet doc={renderDoc} annotations={annotations} playingIndex={playback.playingIndex} emptyText="This sheet has no tiles." />}
        {state.status === 'loading' && <p className="crftiles-loading">Loading sheet…</p>}
        {state.status === 'idle' && <p className="crftiles-empty">No sheet.</p>}
        {error && <p className="crftiles-error" role="alert">Could not load this sheet. {error.message}</p>}
      </div>
    </div>
  );
}

const EMPTY: SheetDoc = parseSheetValue({ items: [] });
const SPECTRUM = NOTES.map(n => <i key={n.id} style={{ background: n.hex }} />);
