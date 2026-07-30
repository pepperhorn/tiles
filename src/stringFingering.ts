import { displayNote, noteById, semitone, type AccidentalStyle } from './notes';
import { itemsToPitches } from './audio/pitch';
import type { Item } from './designer/sheetModel';

export type StringInstrumentId = 'violin' | 'cello';
export type TransposedPitchMode = 'bb' | 'eb';
export type TileDisplayMode = 'pitch' | TransposedPitchMode | StringInstrumentId;
export type TileAnnotation = { main: string; sub: string; noteId?: string; midi?: number };
export type FingeringPositions = Record<StringInstrumentId, number[]>;

type FingerLevel = 'L' | 'H';
type StringNote = { string: number; finger: number; level?: FingerLevel; position?: number };
type Instrument = {
  id: StringInstrumentId;
  label: string;
  tuning: string[];
  openMidi: number[];
  maxPosition: number;
  naturalFingerMidi: Record<string, Record<number, number[]>>;
};
type Placement = { note: StringNote; midi: number; position: number; string: number };
type Carried = { position: number; string: number };

const VIOLIN_FINGER_MIDI: Instrument['naturalFingerMidi'] = {
  G: { 1: [57, 59, 60, 62], 2: [58, 60, 62, 64], 3: [60, 62, 64, 65], 4: [62, 64, 66, 67] },
  D: { 1: [64, 66, 67, 69], 2: [65, 67, 69, 71], 3: [67, 69, 71, 72], 4: [69, 71, 72, 74] },
  A: { 1: [71, 73, 74, 76], 2: [72, 74, 76, 77], 3: [74, 76, 77, 79], 4: [76, 77, 79, 81] },
  E: { 1: [78, 80, 81, 83], 2: [79, 81, 83, 85], 3: [81, 83, 85, 86], 4: [83, 85, 86, 88] },
};

const CELLO_FINGER_MIDI: Instrument['naturalFingerMidi'] = {
  C: { 0.5: [37, 38, 39, 40], 1: [38, 39, 40, 41], 1.5: [39, 40, 41, 42], 2: [40, 41, 42, 43], 2.5: [41, 42, 43, 44], 3: [42, 43, 44, 45], 3.5: [43, 44, 45, 46], 4: [44, 45, 46, 47] },
  G: { 0.5: [44, 45, 46, 47], 1: [45, 46, 47, 48], 1.5: [46, 47, 48, 49], 2: [47, 48, 49, 50], 2.5: [48, 49, 50, 51], 3: [49, 50, 51, 52], 3.5: [50, 51, 52, 53], 4: [51, 52, 53, 54] },
  D: { 0.5: [51, 52, 53, 54], 1: [52, 53, 54, 55], 1.5: [53, 54, 55, 56], 2: [54, 55, 56, 57], 2.5: [55, 56, 57, 58], 3: [56, 57, 58, 59], 3.5: [57, 58, 59, 60], 4: [58, 59, 60, 61] },
  A: { 0.5: [58, 59, 60, 61], 1: [59, 60, 61, 62], 1.5: [60, 61, 62, 63], 2: [61, 62, 63, 64], 2.5: [62, 63, 64, 65], 3: [63, 64, 65, 66], 3.5: [64, 65, 66, 67], 4: [65, 66, 67, 68] },
};

export const INSTRUMENTS: Record<StringInstrumentId, Instrument> = {
  violin: {
    id: 'violin',
    label: 'Violin',
    tuning: ['E', 'A', 'D', 'G'],
    openMidi: [76, 69, 62, 55],
    maxPosition: 4,
    naturalFingerMidi: VIOLIN_FINGER_MIDI,
  },
  cello: {
    id: 'cello',
    label: 'Cello',
    tuning: ['A', 'D', 'G', 'C'],
    openMidi: [57, 50, 43, 36],
    maxPosition: 4,
    naturalFingerMidi: CELLO_FINGER_MIDI,
  },
};

const SHIFT_COST = 10;
const CROSS_COST = 2;
const OPEN_BONUS = 3;
const LEVEL_PENALTY = 1;
const TARGET_COST = 1.5;
const indexCache = new Map<StringInstrumentId, Placement[]>();
const WRITTEN_PITCH_SHIFT: Record<TransposedPitchMode, number> = {
  bb: 2,
  eb: -3,
};

export const AVAILABLE_FINGERING_POSITIONS: FingeringPositions = {
  violin: [1, 2, 3, 4],
  cello: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4],
};

export const DEFAULT_FINGERING_POSITIONS: FingeringPositions = {
  violin: [...AVAILABLE_FINGERING_POSITIONS.violin],
  cello: [...AVAILABLE_FINGERING_POSITIONS.cello],
};

export function positionLabel(position: number): string {
  if (position === 0.5) return 'H';
  if (position === 1) return '1st';
  return String(position);
}

function noteToMidi(note: StringNote, instrument: Instrument): number | null {
  const letter = instrument.tuning[note.string - 1];
  if (!letter) return null;
  if (note.finger === 0) return instrument.openMidi[note.string - 1] ?? null;
  const position = note.position ?? 1;
  const base = instrument.naturalFingerMidi[letter]?.[position]?.[note.finger - 1];
  if (base === undefined) return null;
  return base + (note.level === 'L' ? -1 : note.level === 'H' ? 1 : 0);
}

function buildPlacements(instrument: Instrument): Placement[] {
  const out: Placement[] = [];
  const add = (midi: number | null, note: StringNote, position: number, string: number) => {
    if (midi !== null) out.push({ note, midi, position, string });
  };
  for (let string = 1; string <= instrument.tuning.length; string++) {
    add(instrument.openMidi[string - 1] ?? null, { string, finger: 0 }, 1, string);
  }
  instrument.tuning.forEach((letter, s) => {
    const table = instrument.naturalFingerMidi[letter];
    if (!table) return;
    for (const posKey of Object.keys(table)) {
      const position = Number(posKey);
      for (let finger = 1; finger <= 4; finger++) {
        for (const level of [undefined, 'L', 'H'] as const) {
          const note: StringNote = { string: s + 1, finger };
          if (level) note.level = level;
          if (position !== 1) note.position = position;
          add(noteToMidi(note, instrument), note, position, s + 1);
        }
      }
    }
  });
  return out;
}

function placementsFor(instrument: Instrument): Placement[] {
  const cached = indexCache.get(instrument.id);
  if (cached) return cached;
  const built = buildPlacements(instrument);
  indexCache.set(instrument.id, built);
  return built;
}

const pc = (midi: number) => ((midi % 12) + 12) % 12;

function score(p: Placement, carried: Carried, targetMidi: number): number {
  let c = TARGET_COST * Math.abs(p.midi - targetMidi);
  c += SHIFT_COST * Math.abs(p.position - carried.position);
  if (p.string !== carried.string) c += CROSS_COST;
  if (p.note.finger === 0) c -= OPEN_BONUS;
  if (p.note.level) c += LEVEL_PENALTY;
  c += p.position * 0.1;
  return c;
}

function choosePlacement(targetMidi: number, carried: Carried, instrument: Instrument, enabledPositions?: readonly number[]): Placement | null {
  const enabled = new Set(enabledPositions ?? DEFAULT_FINGERING_POSITIONS[instrument.id]);
  const candidates = placementsFor(instrument).filter(p =>
    pc(p.midi) === pc(targetMidi) &&
    (p.note.finger === 0 || enabled.has(p.position))
  );
  if (!candidates.length) return null;
  return candidates.reduce((best, p) => score(p, carried, targetMidi) < score(best, carried, targetMidi) ? p : best, candidates[0]);
}

function keyboardNoteName(noteId: string, midi: number, style: AccidentalStyle): string {
  const note = noteById(noteId);
  const name = note ? displayNote(note, style).main : noteId.replace('s', '#');
  return `${name}${Math.floor(midi / 12) - 1}`;
}

export function formatFingering(note: StringNote, instrument: Instrument): string {
  const letter = instrument.tuning[note.string - 1] ?? '?';
  const core = `${letter}${note.level ?? ''}${note.finger}`;
  const pos = note.position === 0.5 ? '1/2' : note.position;
  return note.position && note.position !== 1 ? `(${pos})${core}` : core;
}

export function transposeMidiForDisplayMode(mode: TileDisplayMode | undefined, midi: number): number {
  return mode === 'cello' ? midi - 12 : midi;
}

function isTransposedPitchMode(mode: TileDisplayMode | undefined): mode is TransposedPitchMode {
  return mode === 'bb' || mode === 'eb';
}

export function tileAnnotations(
  items: Item[],
  mode: TileDisplayMode | undefined,
  accidentalStyle: AccidentalStyle,
  overrides?: Record<number, string>,
  fingeringPositions?: FingeringPositions,
): Record<number, TileAnnotation> {
  if (!mode || mode === 'pitch') return {};
  if (isTransposedPitchMode(mode)) {
    const out: Record<number, TileAnnotation> = {};
    items.forEach((item, index) => {
      if (item.type !== 'note') return;
      const noteId = semitone(item.noteId, WRITTEN_PITCH_SHIFT[mode]);
      const note = noteById(noteId);
      if (!note) return;
      out[index] = { ...displayNote(note, accidentalStyle), noteId };
    });
    return out;
  }
  const instrument = INSTRUMENTS[mode];
  if (!instrument) return {};
  const out: Record<number, TileAnnotation> = {};
  let carried: Carried = { position: 1, string: 1 };
  for (const placed of itemsToPitches(items, overrides)) {
    const targetMidi = transposeMidiForDisplayMode(mode, placed.midi);
    const p = choosePlacement(targetMidi, carried, instrument, fingeringPositions?.[mode]);
    if (!p) continue;
    out[placed.index] = {
      main: formatFingering(p.note, instrument),
      sub: keyboardNoteName(placed.noteId, p.midi, accidentalStyle),
      midi: p.midi,
    };
    carried = { position: p.position, string: p.string };
  }
  return out;
}
