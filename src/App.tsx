import { useReducer, useState } from 'react';
import { GeneratorMode } from './generator/GeneratorMode';
import { DesignerMode } from './designer/DesignerMode';
import { QuizMode } from './quiz/QuizMode';
import { reduce, defaultDoc } from './designer/sheetModel';

type Mode = 'designer' | 'generator' | 'quiz';

export default function App() {
  const [mode, setMode] = useState<Mode>('designer');
  // Shared between the Designer and the Quiz so a quiz reflects the current design.
  const [doc, dispatch] = useReducer(reduce, undefined, defaultDoc);

  const tab = (id: Mode, label: string) => (
    <button
      className={`tab-${id} rounded-lg px-4 py-2 text-sm font-semibold ${mode === id ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
      aria-pressed={mode === id}
      onClick={() => setMode(id)}
    >{label}</button>
  );

  return (
    <div className="app-shell min-h-screen bg-slate-100 text-slate-900">
      <nav className="app-tabs flex gap-1 border-b border-slate-200 bg-white px-4 py-2">
        {tab('designer', 'Sheet Designer')}
        {tab('generator', 'Tile Generator')}
        {tab('quiz', 'Quiz')}
      </nav>
      <main className="app-body">
        {mode === 'designer' && <DesignerMode doc={doc} dispatch={dispatch} />}
        {mode === 'generator' && <GeneratorMode />}
        {mode === 'quiz' && <QuizMode doc={doc} />}
      </main>
    </div>
  );
}
