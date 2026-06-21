import { parseMidiNotes, extractMelody, midiFileToMelody } from './midiFile';

// Minimal SMF encoder used only by these tests, to verify the reader.
function vlq(n: number): number[] {
  const out = [n & 0x7f];
  n >>= 7;
  while (n > 0) { out.unshift((n & 0x7f) | 0x80); n >>= 7; }
  return out;
}

/** Build a format-0 MIDI file: each entry is one note, played back to back. */
function buildMidi(notes: Array<{ midi: number; dur?: number }>, gap = 0): ArrayBuffer {
  const track: number[] = [];
  for (const { midi, dur = 240 } of notes) {
    track.push(...vlq(gap), 0x90, midi, 0x40); // note on
    track.push(...vlq(dur), 0x80, midi, 0x40); // note off after dur ticks
  }
  track.push(0x00, 0xff, 0x2f, 0x00);          // end of track
  const len = track.length;
  return new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0, // MThd, format 0, 1 track, 480 tpqn
    0x4d, 0x54, 0x72, 0x6b, (len >> 24) & 255, (len >> 16) & 255, (len >> 8) & 255, len & 255, // MTrk
    ...track,
  ]).buffer;
}

test('rejects a buffer that is not a MIDI file', () => {
  expect(() => parseMidiNotes(new Uint8Array([1, 2, 3, 4]).buffer)).toThrow(/Not a MIDI file/);
});

test('reads notes in order with their start ticks', () => {
  const notes = parseMidiNotes(buildMidi([{ midi: 60 }, { midi: 64 }, { midi: 67 }]));
  expect(notes.map(n => n.midi)).toEqual([60, 64, 67]);
  expect(notes[0].startTick).toBe(0);
  expect(notes[1].startTick).toBe(240);
  expect(notes.every(n => n.durTicks > 0)).toBe(true);
});

test('handles note-on with velocity 0 as a note-off', () => {
  const track = [
    0x00, 0x90, 60, 0x40,        // note on C4
    ...vlq(240), 0x90, 60, 0x00, // "note on" vel 0 == note off
    0x00, 0xff, 0x2f, 0x00,
  ];
  const len = track.length;
  const buf = new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0,
    0x4d, 0x54, 0x72, 0x6b, 0, 0, (len >> 8) & 255, len & 255,
    ...track,
  ]).buffer;
  expect(parseMidiNotes(buf).map(n => n.midi)).toEqual([60]);
});

test('extractMelody keeps the top voice of each chord', () => {
  // Two notes starting on the same tick (a chord) collapse to the higher one.
  const track = [
    0x00, 0x90, 60, 0x40,   // C4 on @0
    0x00, 0x90, 67, 0x40,   // G4 on @0
    ...vlq(240), 0x80, 60, 0x40,
    0x00, 0x80, 67, 0x40,
    0x00, 0xff, 0x2f, 0x00,
  ];
  const len = track.length;
  const buf = new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0,
    0x4d, 0x54, 0x72, 0x6b, 0, 0, (len >> 8) & 255, len & 255,
    ...track,
  ]).buffer;
  expect(extractMelody(parseMidiNotes(buf))).toEqual([67]);
});

test('midiFileToMelody returns a flat list of MIDI numbers', () => {
  expect(midiFileToMelody(buildMidi([{ midi: 62 }, { midi: 65 }, { midi: 69 }]))).toEqual([62, 65, 69]);
});

test('a truncated track keeps the notes parsed so far instead of throwing', () => {
  // Valid header + MTrk whose declared length overruns the buffer, cut off mid-track
  // after one complete note. The reader should return that note, not crash.
  const buf = new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0,
    0x4d, 0x54, 0x72, 0x6b, 0, 0, 0xff, 0xff,  // bogus huge track length
    0x00, 0x90, 60, 0x40,                       // note on C4
    0x81, 0x70, 0x80, 60, 0x40,                 // note off — last complete event
    0x00, 0x90, 64,                             // truncated: next note-on cut short
  ]).buffer;
  expect(() => parseMidiNotes(buf)).not.toThrow();
  expect(parseMidiNotes(buf).map(n => n.midi)).toEqual([60]);
});
