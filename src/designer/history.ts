import { reduce, type Action, type SheetDoc } from './sheetModel';

// Undo/redo wrapper around the sheet reducer. The present document is what the
// app renders; `past`/`future` hold prior/undone snapshots. Plain edits push the
// old present onto `past` and clear `future`; `undo`/`redo` move between them.

export type HistoryAction = Action | { type: 'undo' } | { type: 'redo' };
export type History = { past: SheetDoc[]; present: SheetDoc; future: SheetDoc[] };

// Cap retained history so a long session can't grow localStorage/memory unbounded.
const LIMIT = 100;

export function initHistory(present: SheetDoc): History {
  return { past: [], present, future: [] };
}

// Did an action actually change the document? The reducer always returns a fresh
// object, but a no-op (e.g. sharpen when the last item isn't a note) keeps the
// same `items` array reference and identical scalars — we skip recording those so
// undo doesn't need extra presses to step past dead states.
function changed(a: SheetDoc, b: SheetDoc): boolean {
  return a.items !== b.items
    || a.part !== b.part || a.title !== b.title || a.subtitle !== b.subtitle
    || a.composer !== b.composer || a.tempoStyle !== b.tempoStyle
    || a.tilesPerRow !== b.tilesPerRow || a.size !== b.size
    || a.paper !== b.paper || a.orientation !== b.orientation
    || a.accidentalStyle !== b.accidentalStyle
    || a.songKey !== b.songKey;
}

export function historyReducer(state: History, action: HistoryAction): History {
  switch (action.type) {
    case 'undo': {
      if (!state.past.length) return state;
      const present = state.past[state.past.length - 1];
      return { past: state.past.slice(0, -1), present, future: [state.present, ...state.future] };
    }
    case 'redo': {
      if (!state.future.length) return state;
      const present = state.future[0];
      return { past: [...state.past, state.present], present, future: state.future.slice(1) };
    }
    default: {
      const present = reduce(state.present, action);
      if (!changed(state.present, present)) return state;
      const past = [...state.past, state.present];
      if (past.length > LIMIT) past.shift();
      return { past, present, future: [] };
    }
  }
}
