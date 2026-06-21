/**
 * A tiny, dependency-free Standard MIDI File (SMF) reader — just enough to pull a
 * melody out of a .mid for import into a tile sheet. It walks every track, collects
 * note on/off pairs as absolute-tick events, then flattens them into a single
 * monophonic line (top voice of any chord). We only need pitch order, so tempo,
 * division and timing are read past but not interpreted.
 */

export type MidiNoteEvent = { midi: number; startTick: number; durTicks: number };

class Reader {
  private view: DataView;
  pos = 0;
  constructor(buf: ArrayBuffer) { this.view = new DataView(buf); }
  get byteLength(): number { return this.view.byteLength; }
  get eof(): boolean { return this.pos >= this.view.byteLength; }
  u8(): number { return this.view.getUint8(this.pos++); }
  u16(): number { const v = this.view.getUint16(this.pos); this.pos += 2; return v; }
  u32(): number { const v = this.view.getUint32(this.pos); this.pos += 4; return v; }
  str(n: number): string {
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(this.u8());
    return s;
  }
  /** Variable-length quantity (7 bits per byte, high bit = continue). */
  vlq(): number {
    let v = 0;
    for (;;) {
      const b = this.u8();
      v = (v << 7) | (b & 0x7f);
      if (!(b & 0x80)) return v;
    }
  }
}

/** Parse all note events from every track of a MIDI file, in tick order. */
export function parseMidiNotes(buf: ArrayBuffer): MidiNoteEvent[] {
  const r = new Reader(buf);
  if (r.str(4) !== 'MThd') throw new Error('Not a MIDI file (missing MThd header)');
  r.u32();              // header length (6)
  r.u16();              // format
  const ntracks = r.u16();
  r.u16();              // division (ticks/quarter or SMPTE) — unused for ordering

  const notes: MidiNoteEvent[] = [];
  for (let t = 0; t < ntracks && !r.eof; t++) {
    if (r.str(4) !== 'MTrk') break;
    // Clamp the declared length to what's actually present; a corrupt length
    // shouldn't send reads past the buffer.
    const end = Math.min(r.pos + r.u32(), r.byteLength);
    let tick = 0;
    let status = 0;
    const open = new Map<number, number>(); // (channel<<8 | note) -> startTick

    // A malformed event can still run a read off the end mid-track; if so, keep
    // whatever notes parsed cleanly so far rather than failing the whole import.
    try {
      while (r.pos < end) {
        tick += r.vlq();
        let b = r.u8();
        if (b < 0x80) { r.pos--; b = status; }   // running status: reuse last
        else if (b < 0xf0) status = b;            // channel message sets running status
        else status = 0;                          // system/meta cancels it

        const hi = b & 0xf0;
        const ch = b & 0x0f;
        if (hi === 0x90) {                         // note on (vel 0 == note off)
          const note = r.u8(), vel = r.u8();
          const key = (ch << 8) | note;
          if (vel > 0) open.set(key, tick);
          else closeNote(notes, open, key, note, tick);
        } else if (hi === 0x80) {                  // note off
          const note = r.u8(); r.u8();
          closeNote(notes, open, (ch << 8) | note, note, tick);
        } else if (hi === 0xa0 || hi === 0xb0 || hi === 0xe0) {
          r.u8(); r.u8();                          // 2-byte channel messages
        } else if (hi === 0xc0 || hi === 0xd0) {
          r.u8();                                  // 1-byte channel messages
        } else if (b === 0xff) {                   // meta event
          r.u8();                                  // type
          r.pos += r.vlq();                        // skip data
        } else if (b === 0xf0 || b === 0xf7) {     // sysex
          r.pos += r.vlq();
        } else {
          break;                                   // unknown — bail this track
        }
      }
    } catch {
      break;                                       // truncated/corrupt — stop, keep what we have
    }
    r.pos = end;                                 // realign to the next chunk
  }

  // Earliest first; within a chord, highest pitch first (melody = top voice).
  notes.sort((a, b) => a.startTick - b.startTick || b.midi - a.midi);
  return notes;
}

function closeNote(notes: MidiNoteEvent[], open: Map<number, number>, key: number, midi: number, tick: number): void {
  const start = open.get(key);
  if (start === undefined) return;
  notes.push({ midi, startTick: start, durTicks: tick - start });
  open.delete(key);
}

/**
 * Reduce parsed note events to a single melodic line of MIDI numbers: one note per
 * distinct start tick (the highest, since `parseMidiNotes` sorts chords top-first),
 * dropping zero-length notes.
 */
export function extractMelody(notes: MidiNoteEvent[]): number[] {
  const melody: number[] = [];
  let lastStart = -1;
  for (const n of notes) {
    if (n.durTicks <= 0) continue;
    if (n.startTick === lastStart) continue;     // keep only the top of each chord
    melody.push(n.midi);
    lastStart = n.startTick;
  }
  return melody;
}

/** Convenience: a MIDI file buffer straight to its melody as MIDI note numbers. */
export function midiFileToMelody(buf: ArrayBuffer): number[] {
  return extractMelody(parseMidiNotes(buf));
}
