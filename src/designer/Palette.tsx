import { NOTES, displayNote, type AccidentalStyle } from '../notes';
import type { KeyResult } from './useKeyboard';

export function Palette({
  onAction,
  accidentalStyle = 'sharp',
}: {
  onAction: (r: KeyResult) => void;
  accidentalStyle?: AccidentalStyle;
}) {
  return (
    <div className="palette no-print grid gap-2">
      <div className="palette-notes grid grid-cols-6 gap-1.5">
        {NOTES.map(n => {
          const d = displayNote(n, accidentalStyle);
          return (
            <button
              key={n.id}
              className="palette-note flex aspect-square flex-col items-center justify-center rounded-lg text-white font-extrabold leading-none border border-black/15 shadow-sm transition hover:brightness-95 active:brightness-90"
              style={{ background: n.hex, textShadow: '1px 1px 0 rgba(0,0,0,.5), -1px 1px 0 rgba(0,0,0,.5), 1px -1px 0 rgba(0,0,0,.5), -1px -1px 0 rgba(0,0,0,.5), 0 2px 3px rgba(0,0,0,.35)' }}
              aria-label={n.id}
              onClick={() => onAction({ type: 'insertNote', noteId: n.id })}
            >
              <span className="palette-note-main text-2xl">{d.main}</span>
              {d.sub && <span className="palette-note-sub text-xs font-bold opacity-95 mt-0.5">{d.sub}</span>}
            </button>
          );
        })}
      </div>

      <button className="palette-section rounded-lg py-2 border text-sm" aria-label="Section" onClick={() => onAction({ type: 'newSection' })}>＋ Section</button>
    </div>
  );
}
