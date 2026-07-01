import { defaultDoc, type SheetDoc } from './sheetModel';
import { itemsToPitches, midiNoteName } from '../audio/pitch';

/** A derived MIDI note in a JSON export: which item it came from, its pitch and name. */
export type ExportedMidiNote = { index: number; midi: number; name: string };

/**
 * The playable melody implied by a sheet, as MIDI note numbers. Tiles store pitch
 * class only; the concrete octave is derived here (same logic that drives playback),
 * so the export carries everything a tool needs to render the song to MIDI.
 */
export function deriveMidi(doc: SheetDoc): ExportedMidiNote[] {
  return itemsToPitches(doc.items).map(p => ({
    index: p.index,
    midi: p.midi,
    name: midiNoteName(p.noteId, p.midi),
  }));
}

// The exported JSON is the SheetDoc plus a derived, read-only `midi` array for easy
// conversion to MIDI. It's recomputed on every export and stripped on import, so it
// never drifts out of sync with `items` or pollutes the in-memory document.
export function serializeDoc(doc: SheetDoc): string {
  return JSON.stringify({ ...doc, midi: deriveMidi(doc) }, null, 2);
}

// Parse a sheet-JSON string back into a SheetDoc. Missing fields are filled
// from defaultDoc() so older/partial dumps still load; an object without an
// `items` array is rejected as not-a-sheet. The derived `midi` annotation (if
// present) is discarded — it's an export-only convenience, not part of the model.
export function parseSheetJson(text: string): SheetDoc {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) {
    throw new Error('Not a valid sheet JSON (missing items array)');
  }
  const rest = { ...parsed };
  delete rest.midi;
  const doc = { ...defaultDoc(), ...rest } as SheetDoc;
  // Clamp bpm to the same 20–300 invariant the setBpm reducer enforces, so a
  // hand-edited file or crafted #view=/#edit= link can't push an out-of-range
  // tempo into playback (beatDur = 60/bpm) or the designer input.
  doc.bpm = Math.min(300, Math.max(20, Math.round(doc.bpm ?? 120)));
  return doc;
}
