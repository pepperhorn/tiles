import { NOTES, displayNote, type AccidentalStyle } from '../notes';
import type { KeyResult } from './useKeyboard';

export function Palette({
  onAction,
  accidentalStyle = 'sharp',
  onAccidentalStyle = () => {},
}: {
  onAction: (r: KeyResult) => void;
  accidentalStyle?: AccidentalStyle;
  onAccidentalStyle?: (style: AccidentalStyle) => void;
}) {
  const toggleBtn = (style: AccidentalStyle, label: string) => (
    <button
      className={`palette-${style}-toggle rounded-lg py-2 text-sm font-semibold border transition ${
        accidentalStyle === style
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
      }`}
      aria-label={`${style === 'sharp' ? 'Sharp' : 'Flat'} spelling`}
      aria-pressed={accidentalStyle === style}
      onClick={() => onAccidentalStyle(style)}
    >
      {label}
    </button>
  );

  return (
    <div className="palette no-print grid gap-2">
      <div className="palette-notes grid grid-cols-6 gap-1.5">
        {NOTES.map(n => {
          const d = displayNote(n, accidentalStyle);
          return (
            <button
              key={n.id}
              className="palette-note flex flex-col items-center justify-center rounded-lg py-2 text-white font-semibold text-sm leading-none border border-black/20 shadow-sm transition hover:brightness-95 active:brightness-90"
              style={{ background: n.hex, textShadow: '0 1px 0 rgba(0,0,0,.30), 0 2px 4px rgba(0,0,0,.45)' }}
              aria-label={n.id}
              onClick={() => onAction({ type: 'insertNote', noteId: n.id })}
            >
              <span className="palette-note-main">{d.main}</span>
              {d.sub && <span className="palette-note-sub text-[0.6em] font-medium opacity-90 mt-0.5">{d.sub}</span>}
            </button>
          );
        })}
      </div>

      <div className="palette-spelling grid gap-1">
        <span className="palette-spelling-label text-[11px] font-semibold uppercase tracking-wide text-slate-400">Note spelling</span>
        <div className="palette-spelling-toggle grid grid-cols-2 gap-1.5">
          {toggleBtn('sharp', '♯ Sharp')}
          {toggleBtn('flat', '♭ Flat')}
        </div>
      </div>

      <div className="palette-symbols grid grid-cols-2 gap-1.5">
        <button className="palette-up rounded-lg py-2 border text-sm" aria-label="Up arrow" onClick={() => onAction({ type: 'insertArrow', dir: 'up' })}>↑ Up</button>
        <button className="palette-down rounded-lg py-2 border text-sm" aria-label="Down arrow" onClick={() => onAction({ type: 'insertArrow', dir: 'down' })}>↓ Down</button>
        <button className="palette-break rounded-lg py-2 border text-sm" aria-label="Line break" onClick={() => onAction({ type: 'insertBreak' })}>⏎ Line break</button>
        <button className="palette-section rounded-lg py-2 border text-sm" aria-label="Section" onClick={() => onAction({ type: 'newSection' })}>＋ Section</button>
      </div>
    </div>
  );
}
