import type { Item } from '../designer/sheetModel';

// Seeded PRNG so a blank selection is stable until the user reshuffles.
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(arr: number[], seed: number): number[] {
  const a = [...arr];
  const rnd = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Item indexes that are notes (the only quizzable cells). */
export function noteIndexes(items: Item[]): number[] {
  return items.map((it, i) => (it.type === 'note' ? i : -1)).filter(i => i >= 0);
}

/** Choose which note cells are blank for a given % known (0.25–0.90) and seed. */
export function chooseBlanks(items: Item[], knownPct: number, seed: number): Set<number> {
  const notes = noteIndexes(items);
  const unknownCount = Math.max(0, Math.round(notes.length * (1 - knownPct)));
  return new Set(seededShuffle(notes, seed).slice(0, unknownCount));
}
