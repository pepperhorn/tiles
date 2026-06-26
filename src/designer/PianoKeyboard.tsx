import { NOTES, displayNote, type AccidentalStyle } from '../notes';
import type { KeyResult } from './useKeyboard';

// Compact-view keyboard geometry, lifted verbatim from the chordl library
// (packages/chordl-core svg-constants + keyboard-layout): white 23×65, black
// 13×40, with chordl's compact black-key offsets. Each white key advances by
// WHITE_W; black keys overlay at whiteX + offset.
const WHITE_W = 23, WHITE_H = 65, BLACK_W = 13, BLACK_H = 40;
const WHITE_RY = 3, BLACK_RY = 1;
const BLACK_OFFSET: Record<string, number> = { C: 14.33, D: 18.67, F: 13.25, G: 16.25, A: 19.75 };
const WHITE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const WHITE_WITH_SHARP = new Set(['C', 'D', 'F', 'G', 'A']);
// White letter / its sharp → tile note id (the tiles spell A♯ as id 'Bb').
const WHITE_ID: Record<string, string> = { C: 'C', D: 'D', E: 'E', F: 'F', G: 'G', A: 'A', B: 'B' };
const SHARP_ID: Record<string, string> = { C: 'Cs', D: 'Ds', F: 'Fs', G: 'Gs', A: 'Bb' };

type PKey = { noteId: string; octave: number; isBlack: boolean; x: number; w: number; h: number };

// G3 → E5 spans 13 white keys; it scales to the panel width and matches the
// app's G3..G5 playback range. Octave ticks up each time the run crosses C.
function buildKeys(startNote: typeof WHITE_ORDER[number] = 'G', startOctave = 3, whiteCount = 13): PKey[] {
  const startIndex = WHITE_ORDER.indexOf(startNote);
  const keys: PKey[] = [];
  let whiteX = 0.5;
  let octave = startOctave;
  for (let i = 0; i < whiteCount; i++) {
    const letter = WHITE_ORDER[(startIndex + i) % 7];
    if (i > 0 && letter === 'C') octave++;
    keys.push({ noteId: WHITE_ID[letter], octave, isBlack: false, x: whiteX, w: WHITE_W, h: WHITE_H });
    if (WHITE_WITH_SHARP.has(letter)) {
      keys.push({ noteId: SHARP_ID[letter], octave, isBlack: true, x: whiteX + BLACK_OFFSET[letter], w: BLACK_W, h: BLACK_H });
    }
    whiteX += WHITE_W;
  }
  return keys;
}

const WHITE_COUNT = 13;
const KEYS = buildKeys('G', 3, WHITE_COUNT);
const SVG_W = WHITE_COUNT * WHITE_W + 1; // chordl: size * whiteW + 1
const SVG_H = WHITE_H + 2;
const byId = new Map(NOTES.map(n => [n.id, n]));

function PianoKey({ k, accidentalStyle, onAction }: {
  k: PKey;
  accidentalStyle: AccidentalStyle;
  onAction: (r: KeyResult) => void;
}) {
  const note = byId.get(k.noteId)!;
  const d = displayNote(note, accidentalStyle);
  const cx = k.x + k.w / 2;
  const insert = () => onAction({ type: 'insertNote', noteId: k.noteId });
  return (
    <g
      className={`piano-key ${k.isBlack ? 'is-black' : 'is-white'}`}
      role="button"
      tabIndex={0}
      aria-label={`${note.id}${k.octave}`}
      onClick={insert}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); insert(); } }}
    >
      <rect x={k.x} y={0.5} width={k.w} height={k.h} rx={k.isBlack ? BLACK_RY : WHITE_RY}
            fill={note.hex} stroke="var(--ink)" strokeWidth={k.isBlack ? 1 : 1.2} />
      <text className="piano-key-label" x={cx} y={k.h - (k.isBlack ? 5 : 9)} textAnchor="middle">{d.main}</text>
      {!k.isBlack && <text className="piano-key-oct" x={cx} y={k.h - 2.5} textAnchor="middle">{k.octave}</text>}
    </g>
  );
}

export function PianoKeyboard({
  onAction,
  accidentalStyle = 'sharp',
}: {
  onAction: (r: KeyResult) => void;
  accidentalStyle?: AccidentalStyle;
}) {
  // Black keys render after the white ones so they overlay correctly.
  const white = KEYS.filter(k => !k.isBlack);
  const black = KEYS.filter(k => k.isBlack);
  return (
    <div className="palette no-print grid gap-2">
      <svg
        className="piano-keyboard w-full"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Note keyboard (G3 to E5)"
      >
        {white.map(k => <PianoKey key={`${k.noteId}${k.octave}`} k={k} accidentalStyle={accidentalStyle} onAction={onAction} />)}
        {black.map(k => <PianoKey key={`${k.noteId}${k.octave}`} k={k} accidentalStyle={accidentalStyle} onAction={onAction} />)}
      </svg>

      <button className="palette-section rounded-lg py-2 border text-sm" aria-label="Section" onClick={() => onAction({ type: 'newSection' })}>＋ Section</button>
    </div>
  );
}
