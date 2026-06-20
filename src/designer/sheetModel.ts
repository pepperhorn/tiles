import { semitone, noteById } from '../notes';
import type { Paper, Orient, TilesPerRow } from '../geometry';

export type Item =
  | { type: 'note'; noteId: string }
  | { type: 'arrow'; dir: 'up' | 'down' }
  | { type: 'break' }
  | { type: 'section'; text: string };

export type HeaderField = 'part' | 'title' | 'subtitle' | 'composer' | 'tempoStyle';

export type SheetDoc = {
  part: string; title: string; subtitle: string; composer: string; tempoStyle: string;
  tilesPerRow: TilesPerRow; size: number; paper: Paper; orientation: Orient;
  items: Item[];
};

export function defaultDoc(): SheetDoc {
  return {
    part: '', title: '', subtitle: '', composer: '', tempoStyle: '',
    tilesPerRow: 'auto', size: 64, paper: 'A4', orientation: 'portrait',
    items: [],
  };
}

export type Action =
  | { type: 'insertNote'; noteId: string }
  | { type: 'insertArrow'; dir: 'up' | 'down' }
  | { type: 'sharpenLast' }
  | { type: 'flattenLast' }
  | { type: 'insertBreak' }
  | { type: 'insertSection'; text: string }
  | { type: 'deleteLast' }
  | { type: 'removeAt'; index: number }
  | { type: 'setHeader'; field: HeaderField; value: string }
  | { type: 'setLayout'; patch: Partial<Pick<SheetDoc, 'tilesPerRow' | 'size' | 'paper' | 'orientation'>> }
  | { type: 'load'; doc: SheetDoc };

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
    case 'sharpenLast':   return { ...doc, items: shiftLastNote(doc.items, 1) };
    case 'flattenLast':   return { ...doc, items: shiftLastNote(doc.items, -1) };
    case 'insertBreak':   return { ...doc, items: [...doc.items, { type: 'break' }] };
    case 'insertSection': return { ...doc, items: [...doc.items, { type: 'section', text: action.text }] };
    case 'deleteLast':    return { ...doc, items: doc.items.slice(0, -1) };
    case 'removeAt':      return { ...doc, items: doc.items.filter((_, i) => i !== action.index) };
    case 'setHeader':     return { ...doc, [action.field]: action.value };
    case 'setLayout':     return { ...doc, ...action.patch };
    case 'load':          return action.doc;
  }
}
