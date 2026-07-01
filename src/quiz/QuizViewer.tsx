import { useMemo, useState, type ReactNode } from 'react';
import { Tile } from '../Tile';
import { NOTES, noteById, displayNote } from '../notes';
import { TILE_GAP } from '../geometry';
import { sheetLayout } from '../designer/layout';
import { SheetSurface } from '../designer/SheetSurface';
import { innerTile } from '../designer/tileRender';
import { usePiano } from '../audio/usePiano';
import { itemsToPitches } from '../audio/pitch';
import { gradeAnswer } from './grade';
import { chooseBlanks } from './blanks';
import type { QuizPreset } from './encode';
import type { SheetDoc } from '../designer/sheetModel';
import { TempoControl } from '../viewer/TempoControl';
import { TileSizeControl } from '../viewer/TileSizeControl';

type Verdict = 'correct' | 'retry';

/**
 * Self-contained, embeddable quiz player. Given the full song (`source`, the
 * answer key) and the fixed `blanks`, a user fills the blanks, hears the song
 * (with or without their answers), and submits for assessment.
 */
export function QuizViewer({ source, preset, onPreset, embed = false, configSlot }: {
  source: SheetDoc; preset: QuizPreset; onPreset?: (p: QuizPreset) => void; embed?: boolean; configSlot?: ReactNode;
}) {
  // Blanks are derived from the addon preset (difficulty), not stored fixed —
  // so a quiz-taker can make it simpler or harder.
  const blanks = useMemo(
    () => [...chooseBlanks(source.items, preset.knownPct, preset.seed)],
    [source.items, preset.knownPct, preset.seed],
  );
  const blankSet = useMemo(() => new Set(blanks), [blanks]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [verdicts, setVerdicts] = useState<Record<number, Verdict> | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const piano = usePiano();
  const [bpm, setBpm] = useState(source.bpm);
  const [sizePx, setSizePx] = useState(source.size);

  // View-time tempo/size re-seed only when the *source doc* changes — NOT when
  // the difficulty preset (blanks) changes — so adjusting difficulty keeps the
  // taker's chosen tempo/tile-size instead of snapping them back to the default.
  const [viewSeed, setViewSeed] = useState<SheetDoc>(source);
  if (viewSeed !== source) {
    setViewSeed(source);
    setBpm(source.bpm);
    setSizePx(source.size);
  }

  // Changing the quiz (different source or blank set) clears prior answers —
  // adjusted during render rather than in an effect (React-recommended pattern).
  const [quizKey, setQuizKey] = useState<{ s: SheetDoc; b: number[] }>({ s: source, b: blanks });
  if (quizKey.s !== source || quizKey.b !== blanks) {
    setQuizKey({ s: source, b: blanks });
    setAnswers({});
    setVerdicts(null);
    setSelected(null);
  }

  const renderDoc = useMemo(() => ({ ...source, size: sizePx }), [source, sizePx]);
  const { rows } = useMemo(() => sheetLayout(renderDoc), [renderDoc]);

  const answerNoteId = (index: number) => {
    const it = source.items[index];
    return it && it.type === 'note' ? it.noteId : '';
  };

  const fill = (noteId: string) => {
    if (selected == null) return;
    if (playingIndex !== null) stopAudio(); // entering an answer stops playback
    const next = { ...answers, [selected]: noteId };
    setAnswers(next);
    setVerdicts(null); // editing invalidates a prior grade
    // Hear the entered note in melodic context.
    const placed = itemsToPitches(source.items, next).find(p => p.index === selected);
    if (placed) void piano.playNote(placed.midi);
  };

  const playSong = (withAnswers: boolean) => {
    const beatDur = 60 / bpm;
    const overrides = withAnswers ? answers : {};
    const placed = itemsToPitches(source.items, overrides);
    const events = placed.map(p => {
      // "Song" plays the FULL melody incl. blanks — an auditory cue to the
      // answers. "With my answers" mutes only blanks the user hasn't filled.
      const muted = withAnswers && blankSet.has(p.index) && answers[p.index] === undefined;
      return { midi: muted ? null : p.midi, dur: beatDur, index: p.index };
    });
    void piano.playSequence(events, setPlayingIndex);
  };
  const stopAudio = () => { piano.stop(); setPlayingIndex(null); };

  const submit = () => {
    const v: Record<number, Verdict> = {};
    for (const i of blanks) {
      v[i] = gradeAnswer(answers[i], answerNoteId(i)) ? 'correct' : 'retry';
    }
    setVerdicts(v);
    setSelected(null);
  };

  const reset = () => { setAnswers({}); setVerdicts(null); setSelected(null); };

  const correctCount = verdicts ? Object.values(verdicts).filter(v => v === 'correct').length : 0;
  const total = blanks.length;
  const pct = total ? Math.round((correctCount / total) * 100) : 0;

  const sheet = (
    <SheetSurface doc={renderDoc}>
        <div className="sheet-body flex flex-col gap-1.5">
          {rows.map((row, ri) =>
            row.kind === 'section'
              ? <div key={ri} className="row-section font-semibold text-slate-700 mt-2">{row.text}</div>
              : (
                <div key={ri} className="row-tiles flex flex-wrap" style={{ gap: TILE_GAP }}>
                  {row.cells.map(cell => {
                    const item = cell.item;
                    const playing = playingIndex === cell.index;
                    // Everything except a blanked-out note draws as a normal tile.
                    if (item.type !== 'note' || !blankSet.has(cell.index)) {
                      return <div key={cell.index} className={`tile-slot ${playing ? 'is-playing' : ''}`}>{innerTile(item, renderDoc.size, renderDoc.accidentalStyle)}</div>;
                    }
                    // Blank cell — fillable.
                    const given = answers[cell.index];
                    const verdict = verdicts?.[cell.index];
                    const isSel = selected === cell.index;
                    const ring = verdict === 'correct' ? '0 0 0 3px #16a34a'
                      : verdict === 'retry' ? '0 0 0 3px #d97706'
                      : isSel ? '0 0 0 3px var(--ink)' : 'none';
                    return (
                      <button
                        key={cell.index}
                        className={`tile-slot quiz-cell ${isSel ? 'quiz-cell-selected' : ''} ${playing ? 'is-playing' : ''}`}
                        style={{ width: renderDoc.size, height: renderDoc.size, boxSizing: 'border-box', boxShadow: ring, border: given ? 'none' : '2px dashed #94a3b8', borderRadius: 0 }}
                        aria-label={`Blank ${cell.index}${given ? `, answered ${given}` : ''}`}
                        onClick={() => { setSelected(cell.index); setVerdicts(null); }}
                      >
                        {given ? <Tile kind="note" note={noteById(given)!} size={renderDoc.size} accidental={renderDoc.accidentalStyle} /> : null}
                      </button>
                    );
                  })}
                </div>
              ))}
          {source.items.length === 0 && <div className="empty text-slate-400 text-sm">No song loaded.</div>}
        </div>
    </SheetSurface>
  );

  const controls = (
    <div className="quiz-viewer-controls flex flex-col gap-4">
      {configSlot}
      {onPreset && (
        <div className="group group-difficulty">
          <div className="diff-head flex items-center justify-between">
            <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400">Difficulty</span>
            <button className="btn-diff-shuffle text-xs" onClick={() => onPreset({ ...preset, seed: preset.seed + 1 })}>⟳ Shuffle</button>
          </div>
          <input
            className="diff-slider w-full mt-2"
            type="range" min={25} max={90} step={5}
            value={Math.round(preset.knownPct * 100)}
            aria-label="Difficulty (percent shown)"
            onChange={e => onPreset({ ...preset, knownPct: Number(e.target.value) / 100 })}
          />
          <div className="diff-legend flex justify-between text-[11px] text-slate-400 mt-1">
            <span>harder</span><span>easier</span>
          </div>
        </div>
      )}
      <div className="group group-audio">
        <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Listen</span>
        <div className="audio-actions grid grid-cols-2 gap-2">
          <button className="btn-play-song px-3 py-2 text-sm font-semibold" onClick={() => playSong(false)}>▶ Song</button>
          <button className="btn-play-answers px-3 py-2 text-sm font-semibold" onClick={() => playSong(true)}>▶ With my answers</button>
          <button className="btn-stop px-3 py-2 text-sm col-span-2" onClick={stopAudio}>■ Stop</button>
        </div>
        {piano.status === 'loading' && <p className="text-xs text-slate-400 mt-1">Loading piano…</p>}
        {piano.status === 'error' && <p className="text-xs text-red-500 mt-1">Audio unavailable.</p>}
      </div>

      <TempoControl bpm={bpm} onBpm={setBpm} />
      <TileSizeControl sizePx={sizePx} onSize={setSizePx} />

      <div className="group group-pick">
        <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
          {selected == null ? 'Tap a blank, then a note' : 'Pick the note'}
        </span>
        <div className="pick-notes grid grid-cols-6 gap-1.5">
          {NOTES.map(n => {
            const d = displayNote(n, source.accidentalStyle);
            return (
              <button
                key={n.id}
                className="pick-note flex aspect-square flex-col items-center justify-center text-white font-extrabold leading-none hover:brightness-95 active:brightness-90 disabled:opacity-40"
                style={{ background: n.hex, textShadow: '1px 1px 0 rgba(0,0,0,.5), -1px 1px 0 rgba(0,0,0,.5), 1px -1px 0 rgba(0,0,0,.5), -1px -1px 0 rgba(0,0,0,.5)' }}
                disabled={selected == null}
                aria-label={n.id}
                onClick={() => fill(n.id)}
              >
                <span className="text-2xl">{d.main}</span>
                {d.sub && <span className="text-xs font-bold opacity-95 mt-0.5">{d.sub}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="group group-grade grid gap-2">
        <button className="btn-submit py-2 text-sm" onClick={submit}>
          Submit for assessment
        </button>
        <button className="btn-reset py-2 text-sm" onClick={reset}>
          Clear answers
        </button>
        {verdicts && (
          <div className="quiz-score p-3 text-center">
            <div className="score-pct text-2xl font-extrabold text-slate-900">{pct}%</div>
            <div className="score-detail text-xs text-slate-500">{correctCount} of {total} correct</div>
            {correctCount < total && <div className="score-fix text-xs text-amber-600 mt-1">Try again on the highlighted cells.</div>}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`quiz-viewer flex flex-col lg:grid lg:grid-cols-[320px_1fr] ${embed ? 'h-[100dvh]' : 'h-full'} lg:h-full`}>
      <main className="stage order-1 lg:order-2 flex-1 lg:flex-none min-h-0 overflow-auto p-4 lg:p-8 border-b border-slate-200 lg:border-b-0">
        {sheet}
      </main>
      <aside className="quiz-viewer-panel no-print order-2 lg:order-1 basis-[45%] lg:basis-auto shrink-0 lg:shrink min-h-0 overflow-y-auto bg-white lg:border-r lg:border-slate-200 p-5">
        {controls}
      </aside>
    </div>
  );
}
