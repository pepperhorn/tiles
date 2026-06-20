import { pcOf } from '../audio/pitch';

/**
 * Grade a submitted note against the answer by PITCH CLASS, so enharmonic
 * spellings (e.g. C♯ vs D♭) are treated as equal — a student is never
 * penalized for the accidental spelling, only the pitch.
 */
export function gradeAnswer(given: string | undefined, answer: string): boolean {
  if (given === undefined) return false;
  const a = pcOf(given);
  return a >= 0 && a === pcOf(answer);
}
