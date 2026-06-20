import { useMemo, useReducer, useState } from 'react';
import { GeneratorMode } from './generator/GeneratorMode';
import { DesignerMode } from './designer/DesignerMode';
import { QuizMode } from './quiz/QuizMode';
import { QuizViewer } from './quiz/QuizViewer';
import { QuizViewerTab } from './quiz/QuizViewerTab';
import { readQuizFromHash } from './quiz/encode';
import { reduce, defaultDoc } from './designer/sheetModel';
import { NOTES } from './notes';

type Mode = 'designer' | 'generator' | 'quiz' | 'viewer';

export default function App() {
  const [mode, setMode] = useState<Mode>('designer');
  // Shared between the Designer and the Quiz so a quiz reflects the current design.
  const [doc, dispatch] = useReducer(reduce, undefined, defaultDoc);

  // Embed mode: #quiz=<base64url> renders only the standalone quiz player.
  const embedQuiz = useMemo(() => readQuizFromHash(window.location.hash), []);
  if (embedQuiz) return <QuizViewer source={embedQuiz.doc} blanks={embedQuiz.blanks} embed />;

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
        </div>
        <div className="spectrum" aria-hidden="true">
          {NOTES.map(n => <i key={n.id} style={{ background: n.hex }} />)}
        </div>
      </header>
      <main className="app-body flex-1 min-h-0">
        {mode === 'designer' && <DesignerMode doc={doc} dispatch={dispatch} />}
        {mode === 'generator' && <GeneratorMode />}
        {mode === 'quiz' && <QuizMode doc={doc} />}
        {mode === 'viewer' && <QuizViewerTab doc={doc} />}
      </main>
    </div>
  );
}
