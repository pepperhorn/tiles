import { useState } from 'react';
import type { SheetDoc } from '../designer/sheetModel';
import { itemsToPlayback } from '../audio/pitch';
import { usePiano, type PianoOptions } from '../audio/usePiano';
import { transposeMidiForDisplayMode, type TileAnnotation } from '../stringFingering';

/**
 * Transport state + play/stop for a read-only sheet: the tempo-derived beat,
 * metronome, one-bar count-in and loop. Shared by the app's SheetPlayer and the
 * embeddable package so both play a sheet identically.
 */
export function useSheetPlayback(doc: SheetDoc, bpm: number, annotations: Record<number, TileAnnotation>, pianoOptions?: PianoOptions) {
  const [loop, setLoop] = useState(false);
  const [metronome, setMetronome] = useState(false);
  const [countIn, setCountIn] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const piano = usePiano(pianoOptions);

  const play = () => {
    const beatDur = 60 / bpm;
    const events = itemsToPlayback(doc.items).map(s => ({
      midi: s.midi == null ? null : (annotations[s.index]?.midi ?? transposeMidiForDisplayMode(doc.displayMode, s.midi)),
      dur: beatDur,
      index: s.index,
    }));
    void Promise.resolve(piano.playSequence(events, setPlayingIndex, { metronome, countInBeats: countIn ? 4 : 0, beatDur, loop }))
      .catch(() => setPlayingIndex(null)); // load failure: status is 'error', shown by the transport
  };
  const stop = () => { piano.stop(); setPlayingIndex(null); };

  return { loop, setLoop, metronome, setMetronome, countIn, setCountIn, playingIndex, play, stop, status: piano.status };
}

export type SheetPlayback = ReturnType<typeof useSheetPlayback>;
