import { useRef, useState } from 'react';
import type { SheetDoc, HeaderField, Action, Item } from './sheetModel';
import { DesignerCanvas } from './DesignerCanvas';
import { Palette } from './Palette';
import { DesignerControls } from './DesignerControls';
import { KeyOverlay } from './KeyOverlay';
import { HeaderEditOverlay } from './HeaderEditOverlay';
import { EditOverlay } from './EditOverlay';
import { ConfirmOverlay } from './ConfirmOverlay';
import { useKeyboard, type KeyResult } from './useKeyboard';
import { TabBar } from '../components/Tabs';
import { tabPanelClass, type TabDef } from '../components/tabPanel';
import { designStore } from '../storage';
import { downloadBlob } from '../export/download';
import { withExportReady } from '../export/fit';
import { usePageRule } from '../export/usePageRule';
import { serializeDoc, parseSheetJson } from './json';
import { usePiano } from '../audio/usePiano';
import { itemsToPitches, itemsToPlayback, midiToItems, chromaDir } from '../audio/pitch';
import { defaultDoc } from './sheetModel';
import { midiFileToMelody } from '../audio/midiFile';
import { ucfirst } from '../text';
import { formatKey } from './sheetModel';
import { cmsEnabled, emailReceipt } from '../cms';
import { PawIcon } from '../Tile';

const TABS: TabDef[] = [
  { id: 'notes', label: 'Notes' },
  { id: 'layout', label: 'Layout' },
  { id: 'file', label: 'Save & export' },
];

export function DesignerMode({ doc, dispatch, onUndo, onRedo, canUndo, canRedo, toolsOpen = true }: {
  doc: SheetDoc;
  dispatch: (action: Action) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // The show/hide-tools toggle lives in the app header now; the panel just
  // follows this flag. Defaults open so the standalone test harness still
  // renders the tools.
  toolsOpen?: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const midiInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [exportMsg, setExportMsg] = useState('');
  const [tab, setTab] = useState('notes');
  const [editingField, setEditingField] = useState<HeaderField | null>(null);
  const [sectionEdit, setSectionEdit] = useState<number | null>(null);
  const [speaker, setSpeaker] = useState(true);
  const [autoUpDown, setAutoUpDown] = useState(true);
  const [tempo, setTempo] = useState(120);
  const [confirmNew, setConfirmNew] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const piano = usePiano();
  const playSheet = () => piano.playSequence(
    // 60 / bpm seconds per tile (each tile is one beat); pauses sound as rests.
    itemsToPlayback(doc.items).map(p => ({ midi: p.midi, dur: 60 / tempo, index: p.index })),
    setPlayingIndex,
  );
  const stopAudio = () => { piano.stop(); setPlayingIndex(null); };

  const handle = (r: KeyResult) => {
    // Editing during playback stops it (the glow cursor would go stale).
    if (playingIndex !== null) stopAudio();
    if (r.type === 'newSection') {
      // Insert an empty section then edit it in the overlay (same as header fields).
      const idx = doc.items.length;
      dispatch({ type: 'insertSection', text: '' });
      setSectionEdit(idx);
      return;
    }
    if (r.type === 'insertNote') {
      // Auto up/down: mark only where the melodic line changes chromatic
      // direction — one ↑ at the start of an ascending run, one ↓ at the start
      // of a descending run — instead of an arrow between every note. Tap an
      // arrow on the sheet to flip it, double-tap to delete.
      const items = [...doc.items];
      if (autoUpDown) {
        const notes = doc.items.filter((it): it is Extract<Item, { type: 'note' }> => it.type === 'note');
        const prev = notes.at(-1);
        if (prev) {
          const newDir = chromaDir(prev.noteId, r.noteId);
          const runDir = notes.length >= 2 ? chromaDir(notes.at(-2)!.noteId, prev.noteId) : 0;
          if (newDir !== 0 && newDir !== runDir) {
            const dir = newDir === 1 ? 'up' : 'down';
            dispatch({ type: 'insertArrow', dir });
            items.push({ type: 'arrow', dir });
          }
        }
      }
      dispatch(r);
      items.push({ type: 'note', noteId: r.noteId });
      // Speaker on: sound the note as it's added (palette tap or keyboard).
      if (speaker) {
        const placed = itemsToPitches(items).at(-1);
        if (placed) void piano.playNote(placed.midi).catch(() => {});
      }
      return;
    }
    dispatch(r);
  };
  useKeyboard(handle, true);

  usePageRule(doc.paper, doc.orientation);

  const sheetEl = () => stageRef.current?.querySelector('.sheet') as HTMLElement | null;
  const baseName = () => doc.title?.trim() || 'CRF Sheet';
  // Reset the preview's fit-to-width zoom so exports capture at natural resolution.
  const exporting = (fn: () => Promise<void> | void) => withExportReady(stageRef.current, fn);
  const onExport = {
    pdf: async () => {
      try {
        const { exportVectorPdf, docToPages } = await import('../export/pdfVector');
        exportVectorPdf(docToPages(doc), doc.paper, doc.orientation, baseName());
        setExportMsg('');
      } catch (err) {
        setExportMsg('Export failed: ' + String(err));
        console.error(err);
      }
    },
    png: () => exporting(async () => {
      try {
        const el = sheetEl();
        if (el) {
          const { exportRaster } = await import('../export/raster');
          await exportRaster(el, 'image/png', baseName());
        }
        setExportMsg('');
      } catch (err) {
        setExportMsg('Export failed: ' + String(err));
        console.error(err);
      }
    }),
    webp: () => exporting(async () => {
      try {
        const el = sheetEl();
        if (el) {
          const { exportRaster } = await import('../export/raster');
          await exportRaster(el, 'image/webp', baseName());
        }
        setExportMsg('');
      } catch (err) {
        setExportMsg('Export failed: ' + String(err));
        console.error(err);
      }
    }),
    print: () => exporting(() => window.print()),
  };
  const onEmail = async () => {
    if (!email.trim()) { setExportMsg('Enter an email first.'); return; }
    try {
      await emailReceipt({ email, doc });
      setExportMsg(`Edit link sent to ${email.trim()}.`);
    } catch (err) {
      setExportMsg(String(err instanceof Error ? err.message : err));
    }
  };
  const onNewSheet = () => {
    if (playingIndex !== null) stopAudio();
    dispatch({ type: 'load', doc: defaultDoc() });
    setName('');
    setExportMsg('');
    setConfirmNew(false);
  };
  const onSave = () => name.trim() && designStore.save(name.trim(), doc);
  const onLoad = () => {
    const d = designStore.load(name.trim());
    // Backfill defaults so designs saved before a field existed (e.g. songKey)
    // load cleanly — same tolerance as autosave restore and JSON import.
    if (d) dispatch({ type: 'load', doc: { ...defaultDoc(), ...(d as Partial<SheetDoc>) } });
  };

  const onExportJson = () => {
    try {
      const blob = new Blob([serializeDoc(doc)], { type: 'application/json' });
      downloadBlob(blob, `${baseName()}.json`);
      setExportMsg('');
    } catch (err) {
      setExportMsg('Export failed: ' + String(err));
      console.error(err);
    }
  };
  const onImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        dispatch({ type: 'load', doc: parseSheetJson(String(reader.result)) });
        setExportMsg('');
      } catch (err) {
        setExportMsg('Import failed: ' + String(err));
        console.error(err);
      }
    };
    reader.onerror = () => setExportMsg('Could not read file.');
    reader.readAsText(file);
  };
  const onImportMidi = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const melody = midiFileToMelody(reader.result as ArrayBuffer);
        if (!melody.length) { setExportMsg('No notes found in that MIDI file.'); return; }
        dispatch({
          type: 'load',
          doc: { ...defaultDoc(), title: file.name.replace(/\.midi?$/i, ''), items: midiToItems(melody) },
        });
        setExportMsg('');
      } catch (err) {
        setExportMsg('Import failed: ' + String(err));
        console.error(err);
      }
    };
    reader.onerror = () => setExportMsg('Could not read file.');
    reader.readAsArrayBuffer(file);
  };

  return (
    // Mobile/tablet: preview on top (fits width, scrolls), tools a tabbed panel
    // capped at 45% height below. Desktop (lg+): tools sidebar + preview.
    <div className={`designer-mode relative flex flex-col lg:grid h-full lg:h-full ${toolsOpen ? 'lg:grid-cols-[360px_1fr]' : 'lg:grid-cols-[1fr]'}`}>
      <main className="stage order-1 lg:order-2 flex-1 lg:flex-none min-h-0 overflow-auto p-4 lg:p-8 border-b border-slate-200 lg:border-b-0" ref={stageRef}>
        <DesignerCanvas
          doc={doc}
          editable
          onEditField={setEditingField}
          onEditSection={setSectionEdit}
          onRemove={(i) => dispatch({ type: 'removeAt', index: i })}
          onMove={(from, to) => dispatch({ type: 'moveItem', from, to })}
          onToggleArrow={(i) => dispatch({ type: 'toggleArrow', index: i })}
          playingIndex={playingIndex}
        />
      </main>

      <div className={`designer-panel no-print order-2 lg:order-1 basis-[45%] lg:basis-auto shrink-0 lg:shrink min-h-0 flex-col overflow-hidden lg:overflow-y-auto bg-white lg:border-r lg:border-slate-200 ${toolsOpen ? 'flex' : 'hidden'}`}>
        <TabBar tabs={TABS} active={tab} onSelect={setTab} />
        <div className="panel-scroll flex-1 min-h-0 overflow-y-auto lg:overflow-visible lg:flex lg:flex-col lg:gap-4 lg:p-4">
          <div className={`panel-notes ${tabPanelClass(tab === 'notes')} p-4 lg:p-0`}>
            <div className="designer-toolbar mb-3 flex flex-wrap items-center gap-2">
              <button
                className="btn-new-sheet rounded-lg border px-2.5 py-2 text-sm font-semibold text-slate-700"
                aria-label="New sheet"
                title="New sheet"
                onClick={() => setConfirmNew(true)}
              >New</button>

              <span className="toolbar-sep mx-0.5 self-stretch w-px bg-slate-300" aria-hidden="true" />

              <button
                className="btn-undo rounded-lg border p-2 text-slate-700"
                aria-label="Undo"
                title="Undo"
                disabled={!canUndo}
                onClick={onUndo}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-1" />
                </svg>
              </button>
              <button
                className="btn-redo rounded-lg border p-2 text-slate-700"
                aria-label="Redo"
                title="Redo"
                disabled={!canRedo}
                onClick={onRedo}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 14 5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h1" />
                </svg>
              </button>

              <span className="toolbar-sep mx-0.5 self-stretch w-px bg-slate-300" aria-hidden="true" />

              <button
                className={`btn-speaker rounded-lg border p-2 ${speaker ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-600'}`}
                aria-pressed={speaker}
                aria-label="Sound notes as you add them"
                title="Sound notes as you add them"
                onClick={() => setSpeaker(s => !s)}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
                  {speaker ? <path d="M17 9a4 4 0 0 1 0 6" /> : <path d="m17 9 4 6M21 9l-4 6" />}
                </svg>
              </button>
              <button className="btn-play rounded-lg border p-2 text-slate-700" aria-label="Play" title="Play" onClick={playSheet}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z" /></svg>
              </button>
              <button className="btn-stop rounded-lg border p-2 text-slate-700" aria-label="Stop" title="Stop" onClick={stopAudio}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5" /></svg>
              </button>

              <span className="toolbar-sep mx-0.5 self-stretch w-px bg-slate-300" aria-hidden="true" />

              <button
                className={`palette-sharp-toggle rounded-lg border px-2.5 py-2 text-sm font-semibold ${doc.accidentalStyle === 'sharp' ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-600'}`}
                aria-pressed={doc.accidentalStyle === 'sharp'} aria-label="Sharp spelling"
                onClick={() => dispatch({ type: 'setLayout', patch: { accidentalStyle: 'sharp' } })}
              >♯</button>
              <button
                className={`palette-flat-toggle rounded-lg border px-2.5 py-2 text-sm font-semibold ${doc.accidentalStyle === 'flat' ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-600'}`}
                aria-pressed={doc.accidentalStyle === 'flat'} aria-label="Flat spelling"
                onClick={() => dispatch({ type: 'setLayout', patch: { accidentalStyle: 'flat' } })}
              >♭</button>

              <span className="toolbar-sep mx-0.5 self-stretch w-px bg-slate-300" aria-hidden="true" />

              <button className="palette-up rounded-lg border px-2.5 py-2 text-sm text-slate-700" aria-label="Up arrow" onClick={() => handle({ type: 'insertArrow', dir: 'up' })}>↑</button>
              <button className="palette-down rounded-lg border px-2.5 py-2 text-sm text-slate-700" aria-label="Down arrow" onClick={() => handle({ type: 'insertArrow', dir: 'down' })}>↓</button>
              <button
                className={`palette-autoupdown rounded-lg border px-2.5 py-2 text-sm font-semibold ${autoUpDown ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-600'}`}
                aria-pressed={autoUpDown}
                aria-label="Auto up/down arrows"
                title="Auto-insert arrows between notes — tap an arrow to flip, double-tap to delete"
                onClick={() => setAutoUpDown(a => !a)}
              >↕</button>
              <button className="palette-pause inline-flex items-center justify-center rounded-lg border px-2 py-2.5 text-slate-700" aria-label="Pause" title="Pause (rest)" onClick={() => handle({ type: 'insertPause' })}>
                <PawIcon size={16} />
              </button>
              <button className="palette-break rounded-lg border px-2.5 py-2 text-sm text-slate-700" aria-label="Line break" onClick={() => handle({ type: 'insertBreak' })}>⏎</button>

              {piano.status === 'loading' && <span className="text-xs text-slate-400">loading piano…</span>}
              {piano.status === 'error' && <span className="text-xs text-red-500">audio unavailable</span>}
            </div>
            <div className="designer-tempo mb-3 flex items-center gap-2">
              <button
                type="button"
                className="btn-key flex shrink-0 items-center gap-1.5 px-1 py-1.5 text-sm"
                aria-label="Key"
                onClick={() => setKeyOpen(true)}
              >
                <span className="font-medium text-slate-600">Key</span>
                {(() => {
                  const label = formatKey(doc.songKey, doc.accidentalStyle);
                  return <span className={label ? 'font-semibold text-slate-900' : 'text-slate-400'}>{label || 'choose'}</span>;
                })()}
              </button>
              <span className="tempo-sep h-5 w-px bg-slate-300" aria-hidden="true" />
              <label className="text-sm font-medium text-slate-600 whitespace-nowrap" htmlFor="dTempo">Tempo</label>
              <input
                id="dTempo"
                className="input-tempo min-w-0 flex-1 accent-slate-900"
                type="range"
                min={60}
                max={240}
                step={5}
                value={tempo}
                onChange={e => setTempo(Number(e.target.value))}
              />
              <span className="tempo-value w-16 shrink-0 whitespace-nowrap text-right text-sm tabular-nums text-slate-500">{tempo} bpm</span>
            </div>
            <Palette onAction={handle} accidentalStyle={doc.accidentalStyle} />
          </div>

          <div className={`panel-layout ${tabPanelClass(tab === 'layout')} p-4 lg:p-0`}>
            <DesignerControls doc={doc} dispatch={dispatch} />
          </div>

          <div className={`panel-file ${tabPanelClass(tab === 'file')} p-4 lg:p-0 grid gap-3`}>
            <div className="designer-saveload grid gap-2">
              <input className="input-name border rounded-lg px-2 py-1 text-sm" placeholder="Design name" value={name} autoCapitalize="sentences" onChange={e => setName(ucfirst(e.target.value))} />
              <div className="saveload-actions flex gap-2">
                <button className="btn-save flex-1 rounded-lg border px-3 py-1 text-sm" onClick={onSave}>Save</button>
                <button className="btn-load flex-1 rounded-lg border px-3 py-1 text-sm" onClick={onLoad}>Load</button>
              </div>
              <div className="jsonio-actions flex gap-2">
                <button className="btn-export-json flex-1 rounded-lg border px-3 py-1 text-sm" onClick={onExportJson}>Export JSON</button>
                <button className="btn-import-json flex-1 rounded-lg border px-3 py-1 text-sm" onClick={() => fileInputRef.current?.click()}>Import JSON</button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="import-json-input hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) onImportJson(f); e.target.value = ''; }}
                />
              </div>
              <div className="midiio-actions flex gap-2">
                <button className="btn-import-midi flex-1 rounded-lg border px-3 py-1 text-sm" onClick={() => midiInputRef.current?.click()}>Import MIDI</button>
                <input
                  ref={midiInputRef}
                  type="file"
                  accept="audio/midi,audio/x-midi,.mid,.midi"
                  className="import-midi-input hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) onImportMidi(f); e.target.value = ''; }}
                />
              </div>
            </div>
            <div className="designer-export grid grid-cols-2 gap-2">
              <button className="btn-pdf rounded-lg border px-3 py-1 text-sm" onClick={onExport.pdf}>PDF</button>
              <button className="btn-png rounded-lg border px-3 py-1 text-sm" onClick={onExport.png}>PNG</button>
              <button className="btn-webp rounded-lg border px-3 py-1 text-sm" onClick={onExport.webp}>WebP</button>
              <button className="btn-print rounded-lg border px-3 py-1 text-sm" onClick={onExport.print}>Print</button>
              {exportMsg && <p className="designer-export-msg col-span-2 text-xs text-red-500 mt-1" role="alert">{exportMsg}</p>}
            </div>
            {cmsEnabled && (
              <div className="designer-email grid gap-2 border-t border-slate-200 pt-3">
                <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400">Email me a copy</span>
                <input className="input-email border rounded-lg px-2 py-1 text-sm" type="email" inputMode="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                <button className="btn-email rounded-lg border px-3 py-1 text-sm" onClick={onEmail}>Send edit link</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmNew && (
        <ConfirmOverlay
          title="Start a new sheet?"
          message="This clears the current sheet. Save or export it first if you want to keep it."
          confirmLabel="New sheet"
          onConfirm={onNewSheet}
          onCancel={() => setConfirmNew(false)}
        />
      )}

      {keyOpen && (
        <KeyOverlay doc={doc} dispatch={dispatch} onClose={() => setKeyOpen(false)} />
      )}

      {editingField && (
        <HeaderEditOverlay
          key={editingField}
          field={editingField}
          value={doc[editingField]}
          onChange={(v) => dispatch({ type: 'setHeader', field: editingField, value: v })}
          onClose={() => setEditingField(null)}
        />
      )}

      {sectionEdit !== null && doc.items[sectionEdit]?.type === 'section' && (
        <EditOverlay
          key={sectionEdit}
          label="Section title"
          value={(doc.items[sectionEdit] as Extract<Item, { type: 'section' }>).text}
          onChange={(v) => dispatch({ type: 'setSection', index: sectionEdit, text: ucfirst(v) })}
          onClose={() => {
            const it = doc.items[sectionEdit];
            if (it && it.type === 'section' && !it.text.trim()) dispatch({ type: 'removeAt', index: sectionEdit });
            setSectionEdit(null);
          }}
        />
      )}
    </div>
  );
}
