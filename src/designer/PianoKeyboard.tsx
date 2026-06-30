import { useMemo, useState } from 'react';
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

// Label font sizes (kept in sync with .piano-key-label / .is-black in index.css)
// so the accidental's tuck offset scales with the glyph.
const LABEL_FS = 8, LABEL_FS_BLACK = 6;

/** A key's note name, peeling a trailing ♯/♭ into its own <tspan> tucked tight
 *  against the letter — mirrors <NoteText>/.note-accidental on the tiles. */
function KeyLabel({ text, x, y, fontSize }: { text: string; x: number; y: number; fontSize: number }) {
  const acc = text.slice(-1);
  const hasAcc = acc === '♯' || acc === '♭';
  return (
    <text className="piano-key-label" x={x} y={y} textAnchor="middle">
      {hasAcc ? text.slice(0, -1) : text}
      {hasAcc && <tspan className="piano-key-acc" dx={-0.18 * fontSize}>{acc}</tspan>}
    </text>
  );
}

// The keyboard scales to the panel width, so fewer white keys → wider, easier-to-
// tap keys (mobile portrait defaults to a narrow span). The run starts at a given
// white key; octave ticks up each time it crosses C. The octave is an input aid —
// it points auto arrows at the entered pitch — never shown on the key or stored.
function buildKeys(startNote: typeof WHITE_ORDER[number], startOctave: number, whiteCount: number): PKey[] {
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

// Adjustable span: keep the range centred on F4 (so 13 keys = G3–E5, 9 = B3–C5)
// and grow/shrink symmetrically. Defaults: narrow on mobile portrait, wide else.
const KEYS_MIN = 7, KEYS_MAX = 15, KEYS_WIDE = 13, KEYS_MOBILE = 9;
const WHITE_PER_OCTAVE = 7;
const F4_WHITE = 4 * WHITE_PER_OCTAVE + WHITE_ORDER.indexOf('F'); // white-key number of F4

function rangeStart(whiteCount: number): { startNote: typeof WHITE_ORDER[number]; startOctave: number } {
  const startWhite = F4_WHITE - Math.floor((whiteCount - 1) / 2);
  const idx = ((startWhite % WHITE_PER_OCTAVE) + WHITE_PER_OCTAVE) % WHITE_PER_OCTAVE;
  return { startNote: WHITE_ORDER[idx], startOctave: Math.floor(startWhite / WHITE_PER_OCTAVE) };
}

function defaultWhiteCount(): number {
  // matchMedia is absent under jsdom — fall back to the wide default in tests.
  const mq = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(max-width: 768px) and (orientation: portrait)');
  return mq && mq.matches ? KEYS_MOBILE : KEYS_WIDE;
}

const byId = new Map(NOTES.map(n => [n.id, n]));

function PianoKey({ k, accidentalStyle, onAction }: {
  k: PKey;
  accidentalStyle: AccidentalStyle;
  onAction: (r: KeyResult) => void;
}) {
  const note = byId.get(k.noteId)!;
  const d = displayNote(note, accidentalStyle);
  const cx = k.x + k.w / 2;
  // Pass the key's real octave so auto up/down arrows can follow the entered
  // pitch (e.g. E4→C5 reads as a leap up, not a chromatic step down).
  const insert = () => onAction({ type: 'insertNote', noteId: k.noteId, octave: k.octave });
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
      <KeyLabel text={d.main} x={cx} y={k.h - (k.isBlack ? 5 : 7)} fontSize={k.isBlack ? LABEL_FS_BLACK : LABEL_FS} />
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
  const [whiteCount, setWhiteCount] = useState(defaultWhiteCount);
  const { keys, svgW, svgH } = useMemo(() => {
    const { startNote, startOctave } = rangeStart(whiteCount);
    return { keys: buildKeys(startNote, startOctave, whiteCount), svgW: whiteCount * WHITE_W + 1, svgH: WHITE_H + 2 };
  }, [whiteCount]);
  // Black keys render after the white ones so they overlay correctly.
  const white = keys.filter(k => !k.isBlack);
  const black = keys.filter(k => k.isBlack);

  return (
    <div className="palette no-print grid gap-2">
      <svg
        className="piano-keyboard w-full"
        viewBox={`0 0 ${svgW} ${svgH}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Note keyboard"
      >
        {white.map(k => <PianoKey key={`${k.noteId}${k.octave}`} k={k} accidentalStyle={accidentalStyle} onAction={onAction} />)}
        {black.map(k => <PianoKey key={`${k.noteId}${k.octave}`} k={k} accidentalStyle={accidentalStyle} onAction={onAction} />)}
      </svg>

      <div className="keys-range flex items-center gap-2">
        <label className="keys-range-label text-sm font-medium text-slate-600 whitespace-nowrap" htmlFor="keyCount">Keys</label>
        <input
          id="keyCount"
          className="keys-slider min-w-0 flex-1"
          type="range"
          min={KEYS_MIN}
          max={KEYS_MAX}
          step={1}
          value={whiteCount}
          aria-label="Number of keys"
          onChange={e => setWhiteCount(Number(e.target.value))}
        />
        <span className="keys-range-value w-6 shrink-0 text-right text-sm tabular-nums text-slate-500">{whiteCount}</span>
      </div>

      <button className="palette-section rounded-lg py-2 border text-sm" aria-label="Section" onClick={() => onAction({ type: 'newSection' })}>＋ Section</button>
    </div>
  );
}
