import { NOTES, displayNote } from '../notes';
import type { SheetDoc, Action, SongKey, KeyQuality } from './sheetModel';

const QUALITIES: KeyQuality[] = ['major', 'minor'];

// Key picker: a root dropdown (the 12 tile notes, spelled to match the sheet's
// sharp/flat toggle) plus a major/minor quality. Both default to "—" (no key),
// which keeps untitled versions of a song from all reading as C.
export function KeySelect({ doc, dispatch }: { doc: SheetDoc; dispatch: (a: Action) => void }) {
  const { songKey } = doc;
  const setKey = (patch: Partial<SongKey>) =>
    dispatch({ type: 'setKey', key: { ...songKey, ...patch } });

  return (
    <div className="control-key flex items-center gap-2">
      <span className="text-sm font-medium text-slate-600">Key</span>
      <select
        className="select-key-root border rounded px-2 py-1 text-sm"
        aria-label="Key root"
        value={songKey.root ?? ''}
        onChange={e => setKey({ root: e.target.value || null })}
      >
        <option value="">—</option>
        {NOTES.map(n => (
          <option key={n.id} value={n.id}>{displayNote(n, doc.accidentalStyle).main}</option>
        ))}
      </select>
      <select
        className="select-key-quality border rounded px-2 py-1 text-sm"
        aria-label="Key quality"
        value={songKey.quality ?? ''}
        onChange={e => setKey({ quality: (e.target.value || null) as KeyQuality | null })}
      >
        <option value="">—</option>
        {QUALITIES.map(q => (
          <option key={q} value={q}>{q}</option>
        ))}
      </select>
    </div>
  );
}
