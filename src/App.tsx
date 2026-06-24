import { lazy, Suspense, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { DesignerMode } from './designer/DesignerMode';
import { readQuizFromHash, readEditFromHash, DEFAULT_PRESET, type QuizPreset } from './quiz/encode';
import { defaultDoc, type SheetDoc } from './designer/sheetModel';
import { historyReducer, initHistory } from './designer/history';
import { autosaveSlot } from './storage';
import { NOTES } from './notes';

// Designer is the default tab, so it loads eagerly. The other tabs (and the
// embed-only quiz player) are code-split so their JS — and the heavy export
// stack they pull — only loads when the user actually opens them.
const GeneratorMode = lazy(() => import('./generator/GeneratorMode').then(m => ({ default: m.GeneratorMode })));
const QuizMode = lazy(() => import('./quiz/QuizMode').then(m => ({ default: m.QuizMode })));
const QuizViewer = lazy(() => import('./quiz/QuizViewer').then(m => ({ default: m.QuizViewer })));
const QuizViewerTab = lazy(() => import('./quiz/QuizViewerTab').then(m => ({ default: m.QuizViewerTab })));

const ModeFallback = () => (
  <div className="mode-loading h-full grid place-items-center text-sm text-slate-400">loading…</div>
);

type Mode = 'designer' | 'generator' | 'quiz' | 'viewer';

// Recover the last auto-saved working document (if any), tolerating older/partial dumps.
function restoreAutosave(): SheetDoc | null {
  const saved = autosaveSlot.load() as Partial<SheetDoc> | undefined;
  if (!saved || !Array.isArray(saved.items)) return null;
  return { ...defaultDoc(), ...saved };
}

export default function App() {
  const [mode, setMode] = useState<Mode>('designer');
  // Show/hide the designer's tools panel. Lives here so the toggle can sit in
  // the app header (far right) rather than floating over the sheet.
  const [toolsOpen, setToolsOpen] = useState(true);
  // A shared sheet doc with undo/redo; an #edit= link seeds it (receipts reopen a
  // design), otherwise the last auto-saved session is restored.
  const editDoc = useMemo(() => readEditFromHash(window.location.hash), []);
  const [history, dispatch] = useReducer(historyReducer, undefined, () => initHistory(editDoc ?? restoreAutosave() ?? defaultDoc()));
  const doc = history.present;

  // Auto-save the working document to localStorage every 10s (crash recovery).
  const docRef = useRef(doc);
  useEffect(() => { docRef.current = doc; }, [doc]);
  useEffect(() => {
    const id = window.setInterval(() => { autosaveSlot.save(docRef.current); }, 10000);
    return () => clearInterval(id);
  }, []);

  // Embed mode: #quiz=<base64url> renders only the standalone quiz player, whose
  // difficulty preset the taker can adjust.
  const embedQuiz = useMemo(() => readQuizFromHash(window.location.hash), []);
  const [embedPreset, setEmbedPreset] = useState<QuizPreset>(() => embedQuiz?.quiz ?? DEFAULT_PRESET);
  if (embedQuiz) return (
    <Suspense fallback={<ModeFallback />}>
      <QuizViewer source={embedQuiz.doc} preset={embedPreset} onPreset={setEmbedPreset} embed />
    </Suspense>
  );

  const tab = (id: Mode, label: string) => (
    <button
      className={`tab-${id} brut-tab`}
      aria-pressed={mode === id}
      onClick={() => setMode(id)}
    >{label}</button>
  );

  return (
    <div className="app-shell h-[100dvh] flex flex-col overflow-hidden text-slate-900">
      <header className="app-bar shrink-0">
        <div className="app-bar-row flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
          <div className="brand flex items-baseline gap-2">
            <span className="brand-mark">Note<span className="brand-dot">·</span>Tiles</span>
            <span className="brand-sub">sheet studio</span>
          </div>
          <nav className="app-tabs flex flex-wrap gap-2">
            {tab('designer', 'Sheet Designer')}
            {tab('generator', 'Tile Generator')}
            {tab('quiz', 'Quiz')}
            {tab('viewer', 'Quiz Viewer')}
          </nav>
          {mode === 'designer' && (
            <button
              className="btn-toggle-tools no-print ml-auto"
              aria-pressed={toolsOpen}
              aria-label={toolsOpen ? 'Hide tools' : 'Show tools'}
              title={toolsOpen ? 'Hide tools' : 'Show tools'}
              onClick={() => setToolsOpen(o => !o)}
            >
              {/* White-outline wrench on the C-colour tile */}
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </button>
          )}
        </div>
        <div className="spectrum" aria-hidden="true">
          {NOTES.map(n => <i key={n.id} style={{ background: n.hex }} />)}
        </div>
      </header>
      <main className="app-body flex-1 min-h-0">
        <Suspense fallback={<ModeFallback />}>
          {mode === 'designer' && (
            <DesignerMode
              doc={doc}
              dispatch={dispatch}
              onUndo={() => dispatch({ type: 'undo' })}
              onRedo={() => dispatch({ type: 'redo' })}
              canUndo={history.past.length > 0}
              canRedo={history.future.length > 0}
              toolsOpen={toolsOpen}
            />
          )}
          {mode === 'generator' && <GeneratorMode />}
          {mode === 'quiz' && <QuizMode doc={doc} />}
          {mode === 'viewer' && <QuizViewerTab doc={doc} />}
        </Suspense>
      </main>
    </div>
  );
}
