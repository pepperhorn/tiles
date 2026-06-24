import { semitone, noteById, displayNote, type AccidentalStyle } from '../notes';
import type { Paper, Orient, TilesPerRow } from '../geometry';

export type Item =
  | { type: 'note'; noteId: string }
  | { type: 'arrow'; dir: 'up' | 'down' }
  | { type: 'pause' }
  | { type: 'break' }
  | { type: 'section'; text: string };

export type HeaderField = 'part' | 'title' | 'subtitle' | 'composer' | 'tempoStyle';

// Musical key of a sheet. `root` is a note id (same set as the tiles) or null
// for "no key set"; `quality` is major/minor or null. Default is no key so
// versions of the same song aren't all silently lumped together as C.
export type KeyQuality = 'major' | 'minor';
export type SongKey = { root: string | null; quality: KeyQuality | null };

export type SheetDoc = {
  part: string; title: string; subtitle: string; composer: string; tempoStyle: string;
  songKey: SongKey;
  tilesPerRow: TilesPerRow; size: number; paper: Paper; orientation: Orient;
  accidentalStyle: AccidentalStyle;
  items: Item[];
};

export function defaultDoc(): SheetDoc {
  return {
    part: '', title: '', subtitle: '', composer: '', tempoStyle: '',
    songKey: { root: null, quality: null },
    tilesPerRow: 'auto', size: 64, paper: 'A4', orientation: 'portrait',
    accidentalStyle: 'sharp',
    items: [],
  };
}

// Human-readable key label, e.g. "C major", "A♯ minor", or "F" (quality unset).
// The root is spelled to match the sheet's sharp/flat preference. Returns '' when
// no root is set, so callers can hide the field entirely.
export function formatKey(key: SongKey | undefined, style: AccidentalStyle): string {
  if (!key?.root) return '';
  const note = noteById(key.root);
  if (!note) return '';
  const root = displayNote(note, style).main;
  return key.quality ? `${root} ${key.quality}` : root;
}

export type Action =
  | { type: 'insertNote'; noteId: string }
  | { type: 'insertArrow'; dir: 'up' | 'down' }
  | { type: 'toggleArrow'; index: number }
  | { type: 'insertPause' }
  | { type: 'sharpenLast' }
  | { type: 'flattenLast' }
  | { type: 'insertBreak' }
  | { type: 'insertSection'; text: string }
  | { type: 'setSection'; index: number; text: string }
  | { type: 'deleteLast' }
  | { type: 'removeAt'; index: number }
  | { type: 'moveItem'; from: number; to: number }
  | { type: 'setHeader'; field: HeaderField; value: string }
  | { type: 'setKey'; key: SongKey }
  | { type: 'setLayout'; patch: Partial<Pick<SheetDoc, 'tilesPerRow' | 'size' | 'paper' | 'orientation' | 'accidentalStyle'>> }
  | { type: 'transpose'; delta: number }
  | { type: 'load'; doc: SheetDoc };

function moveItem(items: Item[], from: number, to: number): Item[] {
  if (from === to) return items;
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function shiftLastNote(items: Item[], delta: number): Item[] {
  const last = items.at(-1);
  if (!last || last.type !== 'note') return items;
  const next = semitone(last.noteId, delta);
  if (!noteById(next)) return items;
  return [...items.slice(0, -1), { type: 'note', noteId: next }];
}

export function reduce(doc: SheetDoc, action: Action): SheetDoc {
  switch (action.type) {
    case 'insertNote':    return { ...doc, items: [...doc.items, { type: 'note', noteId: action.noteId }] };
    case 'insertArrow':   return { ...doc, items: [...doc.items, { type: 'arrow', dir: action.dir }] };
    case 'toggleArrow':   return { ...doc, items: doc.items.map((it, i) => i === action.index && it.type === 'arrow' ? { ...it, dir: it.dir === 'up' ? 'down' : 'up' } : it) };
    case 'insertPause':   return { ...doc, items: [...doc.items, { type: 'pause' }] };
    case 'sharpenLast':   return { ...doc, items: shiftLastNote(doc.items, 1) };
    case 'flattenLast':   return { ...doc, items: shiftLastNote(doc.items, -1) };
    case 'insertBreak':   return { ...doc, items: [...doc.items, { type: 'break' }] };
    case 'insertSection': return { ...doc, items: [...doc.items, { type: 'section', text: action.text }] };
    case 'setSection':    return { ...doc, items: doc.items.map((it, i) => i === action.index && it.type === 'section' ? { ...it, text: action.text } : it) };
    case 'deleteLast':    return { ...doc, items: doc.items.slice(0, -1) };
    case 'removeAt':      return { ...doc, items: doc.items.filter((_, i) => i !== action.index) };
    case 'moveItem':      return { ...doc, items: moveItem(doc.items, action.from, action.to) };
    case 'setHeader':     return { ...doc, [action.field]: action.value };
    case 'setKey': {
      // No-op when the key is unchanged so re-tapping a selection doesn't record
      // a redundant undo step (history.changed compares songKey by reference).
      const k = action.key, cur = doc.songKey;
      if (cur && cur.root === k.root && cur.quality === k.quality) return doc;
      return { ...doc, songKey: k };
    }
    case 'setLayout':     return { ...doc, ...action.patch };
    case 'transpose': {
      const items = doc.items.map(it => it.type === 'note' ? { ...it, noteId: semitone(it.noteId, action.delta) } : it);
      // A set key root rides along with the notes so the key stays correct.
      const root = doc.songKey?.root ?? null;
      const songKey = root ? { ...doc.songKey, root: semitone(root, action.delta) } : doc.songKey;
      return { ...doc, items, songKey };
    }
    case 'load':          return action.doc;
  }
}
