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

/**
 * Chromatic direction from one pitch class to another by the shortest path:
 * +1 up, -1 down, 0 for the same pitch class. A tritone (6 semitones, equally
 * far either way) is resolved as up. Used to auto-mark where a melodic line
 * turns around. Unknown ids yield 0.
 */
export function chromaDir(fromId: string, toId: string): -1 | 0 | 1 {
  const a = pcOf(fromId), b = pcOf(toId);
  if (a < 0 || b < 0) return 0;
  let d = (((b - a) % 12) + 12) % 12; // 0..11
  if (d === 0) return 0;
  if (d > 6) d -= 12;                 // fold to -5..6 (tritone stays +6 → up)
  return d > 0 ? 1 : -1;
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

export type PlayStep = { index: number; midi: number | null };

/**
 * Playback steps in melodic order, including pause tiles as rests (midi null).
 * Notes follow the same octave placement as `itemsToPitches`; a pause holds the
 * previous note and direction so an arrow still applies to the note after it.
 */
export function itemsToPlayback(items: Item[]): PlayStep[] {
  const out: PlayStep[] = [];
  let prev: number | null = null;
  let dir: 0 | 1 | -1 = 0;
  items.forEach((it, index) => {
    if (it.type === 'arrow') { dir = it.dir === 'up' ? 1 : -1; return; }
    if (it.type === 'pause') { out.push({ index, midi: null }); return; }
    if (it.type !== 'note') return; // breaks/sections don't sound
    const pc = pcOf(it.noteId);
    if (pc < 0) { dir = 0; return; }
    const midi = place(pc, prev, dir);
    out.push({ index, midi });
    prev = midi;
    dir = 0;
  });
  return out;
}

/**
 * Standard MIDI note name for a placed tile, e.g. ('Cs', 61) → "C#4". The octave
 * follows the convention used by `place` (MIDI 60 = middle C = "C4"); the letter
 * keeps the tile's own spelling so a B♭ tile reads "Bb4", not "A#4".
 */
export function midiNoteName(noteId: string, midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return noteId.replace('s', '#') + octave;
}

/**
 * Inverse of `itemsToPitches`: turn a melody (MIDI note numbers in playing order)
 * back into note items, re-inserting ↑/↓ arrows so playback follows the melody's
 * up/down contour. Tiles carry pitch class only and playback spans just G3..G5, so
 * the absolute octave can't survive and leaps wider than that range get wrapped —
 * but within reach the contour is preserved. Any arrow it emits is faithful: it's
 * inserted only when the resulting placement genuinely moves in that direction (a
 * forced arrow can otherwise wrap the wrong way at the edge of the range), so an
 * arrow never plays against the note it precedes.
 */
export function midiToItems(midis: number[]): Item[] {
  const items: Item[] = [];
  let prevPlaced: number | null = null;
  let prevTarget: number | null = null;
  for (const target of midis) {
    const pc = ((Math.round(target) % 12) + 12) % 12;
    const noteId = CHROMATIC[pc];
    let dir: 0 | 1 | -1 = 0;
    if (prevPlaced != null && prevTarget != null) {
      const desired = Math.sign(target - prevTarget) as -1 | 0 | 1;
      // Prefer no arrow; add one only when nearest placement misses the melody's
      // direction AND the arrow actually achieves it (vs. wrapping at the range edge).
      if (desired !== 0 &&
          Math.sign(place(pc, prevPlaced, 0) - prevPlaced) !== desired &&
          Math.sign(place(pc, prevPlaced, desired) - prevPlaced) === desired) {
        dir = desired;
      }
    }
    if (dir === 1) items.push({ type: 'arrow', dir: 'up' });
    else if (dir === -1) items.push({ type: 'arrow', dir: 'down' });
    items.push({ type: 'note', noteId });
    prevPlaced = place(pc, prevPlaced, dir);
    prevTarget = target;
  }
  return items;
}
