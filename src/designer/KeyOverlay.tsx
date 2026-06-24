import { useEffect } from 'react';
import { NOTES, displayNote } from '../notes';
import type { SheetDoc, Action, SongKey, KeyQuality } from './sheetModel';

const QUALITIES: KeyQuality[] = ['major', 'minor'];

/**
 * Popup for the song's key, kept off the main panel so it stays out of the way
 * when unset. Root lists the 12 tile notes spelled to match the sheet's ♯/♭
 * toggle; quality is major/minor. "Clear" returns to no key.
 */
export function KeyOverlay({ doc, dispatch, onClose }: {
  doc: SheetDoc; dispatch: (a: Action) => void; onClose: () => void;
}) {
  // Tolerate a doc missing songKey entirely (older saved designs), matching
  // formatKey's `SongKey | undefined` contract.
  const songKey: SongKey = doc.songKey ?? { root: null, quality: null };
  const setKey = (patch: Partial<SongKey>) =>
    dispatch({ type: 'setKey', key: { ...songKey, ...patch } });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="key-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/30 p-4"
      onClick={onClose}
    >
      <div
        className="overlay-card overlay-pop w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Themed pickers (not native <select>) so the popup stays on-brand. */}
        <span className="overlay-label block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Root</span>
        <div className="key-root-grid grid grid-cols-6 gap-1.5" role="group" aria-label="Key root">
          {NOTES.map(n => {
            const sel = songKey.root === n.id;
            return (
              <button
                key={n.id}
                type="button"
                aria-pressed={sel}
                className="pick-note flex aspect-square items-center justify-center text-sm font-bold text-slate-900"
                style={{ background: sel ? 'var(--accent)' : '#fff' }}
                onClick={() => setKey({ root: sel ? null : n.id })}
              >{displayNote(n, doc.accidentalStyle).main}</button>
            );
          })}
        </div>
        <span className="overlay-label mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Quality</span>
        <div className="key-quality flex gap-2" role="group" aria-label="Key quality">
          {QUALITIES.map(q => {
            const sel = songKey.quality === q;
            return (
              <button
                key={q}
                type="button"
                aria-pressed={sel}
                className={`btn-mode flex-1 border px-3 py-2 text-sm font-semibold capitalize ${sel ? 'text-slate-900 border-slate-900' : 'text-slate-600'}`}
                style={sel ? { background: 'var(--accent)' } : undefined}
                onClick={() => setKey({ quality: sel ? null : q })}
              >{q}</button>
            );
          })}
        </div>
        <span className="overlay-label mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Transpose</span>
        <div className="key-transpose flex gap-2" role="group" aria-label="Transpose">
          <button
            type="button"
            className="btn-transpose-down flex-1 px-3 py-2 text-sm font-semibold"
            aria-label="Transpose down a semitone"
            onClick={() => dispatch({ type: 'transpose', delta: -1 })}
          >− semitone</button>
          <button
            type="button"
            className="btn-transpose-up flex-1 px-3 py-2 text-sm font-semibold"
            aria-label="Transpose up a semitone"
            onClick={() => dispatch({ type: 'transpose', delta: 1 })}
          >+ semitone</button>
        </div>
        <div className="overlay-actions mt-3 flex justify-between">
          <button
            type="button"
            className="overlay-clear rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
            onClick={() => dispatch({ type: 'setKey', key: { root: null, quality: null } })}
          >
            Clear
          </button>
          <button
            type="button"
            className="overlay-done rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
