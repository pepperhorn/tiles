import { useMemo, useState, type ReactNode } from 'react';
import { Tile } from '../Tile';
import { NOTES, noteById, displayNote, SYMBOLS } from '../notes';
import { sheetDimsMm, pageBox, resolveCols, PAD } from '../geometry';
import { flowRows } from '../designer/flow';
import { HeaderZone } from '../designer/HeaderZone';
import { useFitWidth } from '../useFitWidth';
import { usePiano } from '../audio/usePiano';
import { itemsToPitches } from '../audio/pitch';
import { gradeAnswer } from './grade';
import { chooseBlanks } from './blanks';
import type { QuizPreset } from './encode';
import type { SheetDoc } from '../designer/sheetModel';

const arrowSym = (dir: 'up' | 'down') => SYMBOLS.find(s => s.id === (dir === 'up' ? 'arrowUp' : 'arrowDown'))!;
const NOTE_DUR = 0.5;

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

  // Changing the quiz (different source or blank set) clears prior answers —
  // adjusted during render rather than in an effect (React-recommended pattern).
  const [quizKey, setQuizKey] = useState<{ s: SheetDoc; b: number[] }>({ s: source, b: blanks });
  if (quizKey.s !== source || quizKey.b !== blanks) {
    setQuizKey({ s: source, b: blanks });
    setAnswers({});
    setVerdicts(null);
    setSelected(null);
  }

  const dims = sheetDimsMm(source.paper, source.orientation);
  const { w: pageW } = pageBox(source.paper, source.orientation);
  const cols = resolveCols(source.tilesPerRow, source.size, 6, pageW);
  const rows = flowRows(source.items, cols);
  const fitRef = useFitWidth(pageW);

  const answerNoteId = (index: number) => {
    const it = source.items[index];
    return it && it.type === 'note' ? it.noteId : '';
  };

  const fill = (noteId: string) => {
    if (selected == null) return;
    const next = { ...answers, [selected]: noteId };
    setAnswers(next);
    setVerdicts(null); // editing invalidates a prior grade
    // Hear the entered note in melodic context.
    const placed = itemsToPitches(source.items, next).find(p => p.index === selected);
    if (placed) void piano.playNote(placed.midi);
  };

  const playSong = (withAnswers: boolean) => {
    const overrides = withAnswers ? answers : {};
    const placed = itemsToPitches(source.items, overrides);
    const events = placed.map(p => {
      // "Song" plays the FULL melody incl. blanks — an auditory cue to the
      // answers. "With my answers" mutes only blanks the user hasn't filled.
      const muted = withAnswers && blankSet.has(p.index) && answers[p.index] === undefined;
      return { midi: muted ? null : p.midi, dur: NOTE_DUR, index: p.index };
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
    <div className="sheets block" ref={fitRef}>
      <div className="sheet bg-white mx-auto" style={{ width: dims.w, padding: PAD, boxShadow: '7px 7px 0 var(--ink)' }}>
        <HeaderZone doc={source} editable={false} />
        <div className="sheet-body flex flex-col gap-1.5">
          {rows.map((row, ri) =>
            row.kind === 'section'
              ? <div key={ri} className="row-section font-semibold text-slate-700 mt-2">{row.text}</div>
              : (
                <div key={ri} className="row-tiles flex flex-wrap" style={{ gap: 6 }}>
                  {row.cells.map(cell => {
                    const item = cell.item;
                    const playing = playingIndex === cell.index;
                    if (item.type === 'arrow') {
                      return <div key={cell.index} className={`tile-slot ${playing ? 'is-playing' : ''}`}><Tile kind="arrow" sym={arrowSym(item.dir)} size={source.size} /></div>;
                    }
                    if (!blankSet.has(cell.index)) {
                      return <div key={cell.index} className={`tile-slot ${playing ? 'is-playing' : ''}`}><Tile kind="note" note={noteById(item.noteId)!} size={source.size} accidental={source.accidentalStyle} /></div>;
                    }
                    // Blank cell — fillable.
                    const given = answers[cell.index];
                    const verdict = verdicts?.[cell.index];
                    const isSel = selected === cell.index;
                    const ring = verdict === 'correct' ? '0 0 0 3px #16a34a'
                      : verdict === 'retry' ? '0 0 0 3px #d97706'
                      : isSel ? '0 0 0 3px #0f172a' : 'none';
                    return (
                      <button
                        key={cell.index}
                        className={`tile-slot quiz-cell rounded-lg ${isSel ? 'quiz-cell-selected' : ''} ${playing ? 'is-playing' : ''}`}
                        style={{ width: source.size, height: source.size, boxSizing: 'border-box', boxShadow: ring, border: given ? 'none' : '2px dashed #94a3b8', borderRadius: 8 }}
                        aria-label={`Blank ${cell.index}${given ? `, answered ${given}` : ''}`}
                        onClick={() => { setSelected(cell.index); setVerdicts(null); }}
                      >
                        {given ? <Tile kind="note" note={noteById(given)!} size={source.size} accidental={source.accidentalStyle} /> : null}
                      </button>
                    );
                  })}
                </div>
              ))}
          {source.items.length === 0 && <div className="empty text-slate-400 text-sm">No song loaded.</div>}
        </div>
      </div>
    </div>
  );

  const controls = (
    <div className="quiz-viewer-controls flex flex-col gap-4">
      {configSlot}
      {onPreset && (
        <div className="group group-difficulty">
          <div className="diff-head flex items-center justify-between">
            <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400">Difficulty</span>
            <button className="btn-shuffle text-xs font-semibold text-blue-600 hover:underline" onClick={() => onPreset({ ...preset, seed: preset.seed + 1 })}>⟳ Shuffle</button>
          </div>
          <input
            className="diff-slider w-full mt-2 accent-slate-900"
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
          <button className="btn-play-song rounded-lg border px-3 py-2 text-sm font-semibold" onClick={() => playSong(false)}>▶ Song</button>
          <button className="btn-play-answers rounded-lg border px-3 py-2 text-sm font-semibold" onClick={() => playSong(true)}>▶ With my answers</button>
          <button className="btn-stop rounded-lg border px-3 py-2 text-sm col-span-2" onClick={stopAudio}>■ Stop</button>
        </div>
        {piano.status === 'loading' && <p className="text-xs text-slate-400 mt-1">Loading piano…</p>}
        {piano.status === 'error' && <p className="text-xs text-red-500 mt-1">Audio unavailable.</p>}
      </div>

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
                className="pick-note flex aspect-square flex-col items-center justify-center rounded-lg text-white font-extrabold leading-none border border-black/15 shadow-sm transition hover:brightness-95 active:brightness-90 disabled:opacity-40"
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
        <button className="btn-submit rounded-xl bg-emerald-700 py-2 text-sm font-bold text-white hover:bg-emerald-800" onClick={submit}>
          Submit for assessment
        </button>
        <button className="btn-reset rounded-lg border py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" onClick={reset}>
          Clear answers
        </button>
        {verdicts && (
          <div className="quiz-score rounded-lg bg-slate-50 p-3 text-center">
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
