import { CHROMATIC } from '../notes';
import type { Item } from '../designer/sheetModel';

// Playback register: C3 (MIDI 48) .. C6 (MIDI 84) — three octaves around middle C.
// A wide window so a run rarely reaches an edge; when it does, `place` saturates
// (holds the top/bottom octave) rather than wrapping, so the line plateaus
// instead of jumping an octave the wrong way.
const LOW = 48;
const HIGH = 84;
// If unsure, the first note starts between C4 (60) and B4 (71) — low-middle of the
// window, leaving the most headroom for an ascending line.
const FIRST_LO = 60;

export type Placed = { index: number; midi: number; noteId: string };

/** Pitch class 0..11 (C=0) for a note id, or -1 if unknown. */
export function pcOf(noteId: string): number {
  return CHROMATIC.indexOf(noteId);
}

/**
 * Absolute MIDI number for a tile note id at a given octave (MIDI 60 = C4), or
 * NaN if the id is unknown. Used for octave-aware entry from the on-screen
 * keyboard, where the clicked key carries a real octave the pitch-class tile
 * model otherwise discards.
 */
export function noteIdToMidi(noteId: string, octave: number): number {
  const pc = pcOf(noteId);
  return pc < 0 ? NaN : (octave + 1) * 12 + pc;
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

/**
 * Recompute the auto up/down arrows for a whole melody: drop every existing
 * arrow, then re-insert one ↑/↓ immediately before each note that starts a new
 * chromatic run — the same rule applied incrementally as notes are typed
 * (`DesignerMode`). Run this after a drag-drop reorder so arrows are refreshed:
 * added where a new turn appears, and trimmed where they no longer mark one (no
 * orphans). Non-note items (pauses, sections, breaks) are kept in place and, as
 * when typing, don't break a run between the notes on either side.
 */
export function autoArrowItems(items: Item[]): Item[] {
  const out: Item[] = [];
  const notes: string[] = []; // note ids seen so far, in melodic order
  for (const it of items) {
    if (it.type === 'arrow') continue; // re-derived below — drop stale ones
    if (it.type === 'note') {
      const prev = notes.at(-1);
      if (prev !== undefined) {
        const newDir = chromaDir(prev, it.noteId);
        const runDir = notes.length >= 2 ? chromaDir(notes[notes.length - 2], prev) : 0;
        if (newDir !== 0 && newDir !== runDir) {
          out.push({ type: 'arrow', dir: newDir === 1 ? 'up' : 'down' });
        }
      }
      notes.push(it.noteId);
    }
    out.push(it);
  }
  return out;
}

function place(pc: number, prev: number | null, dir: 0 | 1 | -1): number {
  if (prev == null) {
    // First note: nearest octave landing in C4..B4 (FIRST_LO % 12 === 0).
    return FIRST_LO + pc;
  }
  // Every in-window pitch of this class, ascending (each class has ≥1 in range).
  const cands: number[] = [];
  for (let m = pc + Math.ceil((LOW - pc) / 12) * 12; m <= HIGH; m += 12) cands.push(m);

  if (dir === 1) {
    // Lowest pitch above prev; if none in range, saturate at the top octave.
    return cands.find(m => m > prev) ?? cands[cands.length - 1];
  }
  if (dir === -1) {
    // Highest pitch below prev; if none in range, saturate at the bottom octave.
    const below = cands.filter(m => m < prev);
    return below.length ? below[below.length - 1] : cands[0];
  }
  // Nearest adjacent; tie breaks downward.
  return cands.reduce((best, m) =>
    Math.abs(m - prev) < Math.abs(best - prev) ? m : best, cands[0]);
}

const mod12 = (m: number) => ((m % 12) + 12) % 12;

/**
 * Place one note under a *persistent* run direction. `runDir` carries across
 * notes until an arrow changes it (so a whole ascending/descending run keeps
 * going), and `freshArrow` is true only for the note immediately after an arrow.
 * A repeated pitch class holds its octave — a repeat inside a run must not leap —
 * unless an arrow was just given, which is the only way to climb e.g. C4→C5.
 */
function placedMidi(pc: number, prev: number | null, runDir: 0 | 1 | -1, freshArrow: boolean): number {
  if (prev == null) return place(pc, prev, runDir); // first note: register-normalised
  if (pc === mod12(prev)) return freshArrow ? place(pc, prev, runDir) : prev;
  return place(pc, prev, runDir);
}

/**
 * Assign concrete pitches to the note items in melodic order. An arrow sets the
 * run direction (↑/↓), which *persists* for every following note until the next
 * arrow flips it; with no arrow yet, each note picks the octave nearest the
 * previous one. `overrides` replaces a note id at a given item index (used to
 * hear a student's submitted answer in context).
 */
export function itemsToPitches(items: Item[], overrides?: Record<number, string>): Placed[] {
  const out: Placed[] = [];
  let prev: number | null = null;
  let runDir: 0 | 1 | -1 = 0;
  let fresh = false; // an arrow applies to the very next note, then runDir persists
  items.forEach((it, index) => {
    if (it.type === 'arrow') { runDir = it.dir === 'up' ? 1 : -1; fresh = true; return; }
    if (it.type !== 'note') return; // breaks/sections don't sound
    const noteId = overrides?.[index] ?? it.noteId;
    const pc = pcOf(noteId);
    if (pc < 0) { fresh = false; return; }
    const midi = placedMidi(pc, prev, runDir, fresh);
    out.push({ index, midi, noteId });
    prev = midi;
    fresh = false;
  });
  return out;
}

export type PlayStep = { index: number; midi: number | null };

/**
 * Playback steps in melodic order, including pause tiles as rests (midi null).
 * Notes follow the same octave placement as `itemsToPitches`; a pause holds the
 * previous note and the run direction so an arrow still applies to the note
 * after it.
 */
export function itemsToPlayback(items: Item[]): PlayStep[] {
  const out: PlayStep[] = [];
  let prev: number | null = null;
  let runDir: 0 | 1 | -1 = 0;
  let fresh = false;
  items.forEach((it, index) => {
    if (it.type === 'arrow') { runDir = it.dir === 'up' ? 1 : -1; fresh = true; return; }
    if (it.type === 'pause') { out.push({ index, midi: null }); return; }
    if (it.type !== 'note') return; // breaks/sections don't sound
    const pc = pcOf(it.noteId);
    if (pc < 0) { fresh = false; return; }
    const midi = placedMidi(pc, prev, runDir, fresh);
    out.push({ index, midi });
    prev = midi;
    fresh = false;
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
 * up/down contour. Tiles carry pitch class only and playback spans just C3..C6, so
 * the absolute octave can't survive and leaps wider than that range get wrapped —
 * but within reach the contour is preserved. Mirrors `itemsToPitches`: the run
 * direction persists, so an arrow is emitted only when the *inherited* direction
 * would miss the melody's move AND an arrow actually achieves it (a forced arrow
 * can otherwise wrap the wrong way at the edge of the range) — an arrow never
 * plays against the note it precedes.
 */
export function midiToItems(midis: number[]): Item[] {
  const items: Item[] = [];
  let prevPlaced: number | null = null;
  let prevTarget: number | null = null;
  let runDir: 0 | 1 | -1 = 0;
  for (const target of midis) {
    const pc = ((Math.round(target) % 12) + 12) % 12;
    const noteId = CHROMATIC[pc];
    let fresh = false;
    if (prevPlaced != null && prevTarget != null) {
      const desired = Math.sign(target - prevTarget) as -1 | 0 | 1;
      if (desired !== 0 &&
          Math.sign(placedMidi(pc, prevPlaced, runDir, false) - prevPlaced) !== desired &&
          Math.sign(placedMidi(pc, prevPlaced, desired, true) - prevPlaced) === desired) {
        items.push({ type: 'arrow', dir: desired === 1 ? 'up' : 'down' });
        runDir = desired;
        fresh = true;
      }
    }
    items.push({ type: 'note', noteId });
    prevPlaced = placedMidi(pc, prevPlaced, runDir, fresh);
    prevTarget = target;
  }
  return items;
}
