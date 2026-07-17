import { useCallback, useEffect, useRef, useState } from 'react';
import type { SheetDoc } from './sheetModel';
import { fetchLibraryList, fetchLibraryDoc, type LibraryEntry } from '../library';

// "Subtitle · G major · 100 bpm" — only the parts a song actually has.
function metaLine(e: LibraryEntry): string {
  const key = e.keyRoot ? `${e.keyRoot} ${e.keyQuality ?? ''}`.trim() : null;
  return [e.subtitle, key, e.bpm != null ? `${e.bpm} bpm` : null].filter(Boolean).join(' · ');
}

/**
 * Browse-and-pick overlay for the shared song library (crf-admin `tiles`
 * collection). Fetches the published-song metadata list once on open,
 * filters it client-side, and fetches the picked song's full document.
 * Read-only: nothing is written back to the library.
 */
export function LibraryOverlay({ onLoad, onClose }: {
  onLoad: (doc: SheetDoc) => void;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [listError, setListError] = useState(false);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pickError, setPickError] = useState(false);

  // Guards every promise callback below so a fetchList/pick that resolves
  // after unmount (or after the user has already cancelled) never calls
  // setState or onLoad on a gone/abandoned overlay.
  const cancelled = useRef(false);
  useEffect(() => () => { cancelled.current = true; }, []);

  // Split so the effect's own body never calls setState synchronously (only
  // from the resolved/rejected promise callbacks): the mount effect fetches
  // directly since entries/listError already start at their reset values;
  // retry (triggered from a click, not an effect) resets them first.
  const fetchList = useCallback(() => {
    fetchLibraryList()
      .then(list => { if (!cancelled.current) setEntries(list); })
      .catch(() => { if (!cancelled.current) setListError(true); });
  }, []);
  useEffect(() => { fetchList(); }, [fetchList]);
  const retry = () => {
    setListError(false);
    setEntries(null);
    fetchList();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const shown = (entries ?? []).filter(e =>
    !q || e.title.toLowerCase().includes(q) || (e.subtitle ?? '').toLowerCase().includes(q));

  const pick = (id: string) => {
    setBusyId(id);
    setPickError(false);
    fetchLibraryDoc(id)
      .then(doc => { if (!cancelled.current) { onLoad(doc); onClose(); } })
      .catch(() => { if (!cancelled.current) { setPickError(true); setBusyId(null); } });
  };

  return (
    <div
      className="library-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/30 p-4"
      onClick={onClose}
    >
      <div
        className="overlay-card overlay-pop w-full max-w-md bg-white p-4"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Library"
      >
        <span className="overlay-label block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Library</span>
        <input
          type="search"
          className="library-search overlay-input w-full px-2 py-1.5 text-sm"
          placeholder="Search songs…"
          aria-label="Search songs"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        <div className="library-list mt-3 grid max-h-[50vh] gap-1.5 overflow-y-auto">
          {entries === null && !listError && (
            <p className="library-loading text-sm text-slate-500">Loading library…</p>
          )}
          {listError && (
            <div className="library-error grid gap-2">
              <p className="text-sm text-red-500" role="alert">Couldn't reach the library.</p>
              <button type="button" className="overlay-clear justify-self-start px-4 py-2 text-sm" onClick={retry}>Retry</button>
            </div>
          )}
          {entries !== null && shown.length === 0 && !listError && (
            <p className="library-empty text-sm text-slate-500">
              {q ? 'No matches.' : 'Library is empty.'}
            </p>
          )}
          {shown.map(e => {
            const meta = metaLine(e);
            return (
              <button
                key={e.id}
                type="button"
                className="library-row px-3 py-2 text-left"
                disabled={busyId !== null}
                onClick={() => pick(e.id)}
              >
                <span className="library-row-title block text-sm font-semibold text-slate-900">
                  {e.title}{busyId === e.id ? ' …' : ''}
                </span>
                {meta && (
                  <span className="library-row-meta block text-xs text-slate-500">{meta}</span>
                )}
              </button>
            );
          })}
          {pickError && (
            <p className="library-pick-error text-sm text-red-500" role="alert">Couldn't load this song.</p>
          )}
        </div>
        <div className="overlay-actions mt-4 flex justify-end">
          <button type="button" className="overlay-clear px-4 py-2 text-sm" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
