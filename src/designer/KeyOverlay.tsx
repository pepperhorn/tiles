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
        <span className="overlay-label block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Key</span>
        <div className="key-fields flex gap-2">
          <select
            className="select-key-root flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-900"
            aria-label="Key root"
            value={songKey.root ?? ''}
            onChange={e => setKey({ root: e.target.value || null })}
          >
            <option value="">— root</option>
            {NOTES.map(n => (
              <option key={n.id} value={n.id}>{displayNote(n, doc.accidentalStyle).main}</option>
            ))}
          </select>
          <select
            className="select-key-quality flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-900"
            aria-label="Key quality"
            value={songKey.quality ?? ''}
            onChange={e => setKey({ quality: (e.target.value || null) as KeyQuality | null })}
          >
            <option value="">— major/minor</option>
            {QUALITIES.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
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
