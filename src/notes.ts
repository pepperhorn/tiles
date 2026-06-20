export type Note = { id: string; main: string; sub: string; hex: string };
export type Sym = { id: 'arrowUp' | 'arrowDown'; glyph: '↑' | '↓'; hex: string };

export const NOTES: Note[] = [
  { id: 'C',  main: 'C',        sub: '',        hex: '#f86e6e' },
  { id: 'Cs', main: 'C♯',  sub: 'D♭', hex: '#f58841' },
  { id: 'D',  main: 'D',        sub: '',        hex: '#ffbc57' },
  { id: 'Ds', main: 'D♯',  sub: 'E♭', hex: '#b8a334' },
  { id: 'E',  main: 'E',        sub: '',        hex: '#fff56d' },
  { id: 'F',  main: 'F',        sub: '',        hex: '#b3f888' },
  { id: 'Fs', main: 'F♯',  sub: 'G♭', hex: '#93d154' },
  { id: 'G',  main: 'G',        sub: '',        hex: '#6bc6a0' },
  { id: 'Gs', main: 'G♯',  sub: 'A♭', hex: '#7ee8df' },
  { id: 'A',  main: 'A',        sub: '',        hex: '#88a7f8' },
  { id: 'Bb', main: 'B♭',  sub: '',        hex: '#cc97e8' },
  { id: 'B',  main: 'B',        sub: '',        hex: '#e277b1' },
];

export const SYMBOLS: Sym[] = [
  { id: 'arrowUp',   glyph: '↑', hex: '#64748b' },
  { id: 'arrowDown', glyph: '↓', hex: '#64748b' },
];

// Chromatic order (semitone steps) for sharpen/flatten.
export const CHROMATIC = NOTES.map(n => n.id);

const byId = new Map(NOTES.map(n => [n.id, n]));
export function noteById(id: string): Note | undefined { return byId.get(id); }

export function semitone(id: string, delta: number): string {
  const i = CHROMATIC.indexOf(id);
  if (i < 0) return id;
  const n = CHROMATIC.length;
  return CHROMATIC[((i + delta) % n + n) % n];
}
