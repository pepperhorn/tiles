import { NOTES, displayNote, type AccidentalStyle } from '../notes';
import { NoteText } from '../Tile';
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
              className="palette-note flex aspect-square flex-col items-center justify-center overflow-hidden text-white leading-none transition hover:brightness-95 active:brightness-90"
              style={{ background: n.hex, textShadow: '0 1px 0 rgba(0,0,0,.22), 0 2px 4px rgba(0,0,0,.38)' }}
              aria-label={n.id}
              onClick={() => onAction({ type: 'insertNote', noteId: n.id })}
            >
              {/* Accidental tiles carry a 2nd line (enharmonic sub); shrink the
                  main name so both lines fit the square instead of stretching it. */}
              <span className={`palette-note-main ${d.sub ? 'has-sub' : ''}`}><NoteText text={d.main} /></span>
              {d.sub && <span className="palette-note-sub opacity-95 mt-0.5"><NoteText text={d.sub} /></span>}
            </button>
          );
        })}
      </div>

      <button className="palette-section rounded-lg py-2 border text-sm" aria-label="Section" onClick={() => onAction({ type: 'newSection' })}>＋ Section</button>
    </div>
  );
}
