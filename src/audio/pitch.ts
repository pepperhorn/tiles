import { CHROMATIC } from '../notes';
import type { Item } from '../designer/sheetModel';

// Playback range: G3 (MIDI 55) .. G5 (MIDI 79) — either side of the treble clef.
const LOW = 55;
const HIGH = 79;
// If unsure, the first note starts between C4 (60) and B4 (71).
const FIRST_LO = 60;

export type Placed = { index: number; midi: number; noteId: string };

/** Pitch class 0..11 (C=0) for a note id, or -1 if unknown. */
export function pcOf(noteId: string): number {
  return CHROMATIC.indexOf(noteId);
}

function place(pc: number, prev: number | null, dir: 0 | 1 | -1): number {
  if (prev == null) {
    // First note: nearest octave landing in C4..B4 (FIRST_LO % 12 === 0).
    return FIRST_LO + pc;
  }
  // Candidate pitches for this pitch class, a couple octaves around the range.
  const cands: number[] = [];
  for (let m = pc; m <= HIGH + 12; m += 12) cands.push(m);
  for (let m = pc - 12; m >= LOW - 12; m -= 12) cands.unshift(m);

  let chosen: number;
  if (dir === 1) {
    const up = cands.filter(m => m > prev);
    chosen = up.length ? up[0] : cands[cands.length - 1];
  } else if (dir === -1) {
    const down = cands.filter(m => m < prev);
    chosen = down.length ? down[down.length - 1] : cands[0];
  } else {
    // Nearest adjacent; tie breaks downward.
    chosen = cands.reduce((best, m) =>
      Math.abs(m - prev) < Math.abs(best - prev) ? m : best, cands[0]);
  }
  while (chosen < LOW) chosen += 12;
  while (chosen > HIGH) chosen -= 12;
  return chosen;
}

/**
 * Assign concrete pitches to the note items in melodic order. Arrow items set
 * the direction (↑/↓) for the next note; otherwise each note picks the octave
 * nearest the previous note. `overrides` replaces a note id at a given item
 * index (used to hear a student's submitted answer in context).
 */
export function itemsToPitches(items: Item[], overrides?: Record<number, string>): Placed[] {
  const out: Placed[] = [];
  let prev: number | null = null;
  let dir: 0 | 1 | -1 = 0;
  items.forEach((it, index) => {
    if (it.type === 'arrow') { dir = it.dir === 'up' ? 1 : -1; return; }
    if (it.type !== 'note') return; // breaks/sections don't sound
    const noteId = overrides?.[index] ?? it.noteId;
    const pc = pcOf(noteId);
    if (pc < 0) { dir = 0; return; }
    const midi = place(pc, prev, dir);
    out.push({ index, midi, noteId });
    prev = midi;
    dir = 0;
  });
  return out;
}
