import { NOTES } from '../notes';
import type { KeyResult } from './useKeyboard';

export function Palette({ onAction }: { onAction: (r: KeyResult) => void }) {
  return (
    <div className="palette no-print grid gap-2">
      <div className="palette-notes grid grid-cols-6 gap-1.5">
        {NOTES.map(n => (
          <button key={n.id} className="palette-note rounded-lg py-2 text-white font-semibold text-sm"
                  style={{ background: n.hex }} aria-label={n.id}
                  onClick={() => onAction({ type: 'insertNote', noteId: n.id })}>
            {n.main}
          </button>
        ))}
      </div>
      <div className="palette-symbols grid grid-cols-3 gap-1.5">
        <button className="palette-sharp rounded-lg py-2 border text-sm" aria-label="Sharp" onClick={() => onAction({ type: 'sharpenLast' })}>♯ Sharp</button>
        <button className="palette-flat rounded-lg py-2 border text-sm" aria-label="Flat" onClick={() => onAction({ type: 'flattenLast' })}>♭ Flat</button>
        <button className="palette-up rounded-lg py-2 border text-sm" aria-label="Up arrow" onClick={() => onAction({ type: 'insertArrow', dir: 'up' })}>↑ Up</button>
        <button className="palette-down rounded-lg py-2 border text-sm" aria-label="Down arrow" onClick={() => onAction({ type: 'insertArrow', dir: 'down' })}>↓ Down</button>
        <button className="palette-break rounded-lg py-2 border text-sm" aria-label="Line break" onClick={() => onAction({ type: 'insertBreak' })}>⏎ Line break</button>
        <button className="palette-section rounded-lg py-2 border text-sm" aria-label="Section" onClick={() => onAction({ type: 'newSection' })}>＋ Section</button>
      </div>
    </div>
  );
}
