import { useState } from 'react';
import { GeneratorMode } from './generator/GeneratorMode';
import { DesignerMode } from './designer/DesignerMode';

type Mode = 'generator' | 'designer';

export default function App() {
  const [mode, setMode] = useState<Mode>('generator');
  return (
    <div className="app-shell min-h-screen bg-slate-100 text-slate-900">
      <nav className="app-tabs flex gap-1 border-b border-slate-200 bg-white px-4 py-2">
        <button
          className={`tab-generator rounded-lg px-4 py-2 text-sm font-semibold ${mode === 'generator' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
          aria-pressed={mode === 'generator'}
          onClick={() => setMode('generator')}
        >Tile Generator</button>
        <button
          className={`tab-designer rounded-lg px-4 py-2 text-sm font-semibold ${mode === 'designer' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
          aria-pressed={mode === 'designer'}
          onClick={() => setMode('designer')}
        >Sheet Designer</button>
      </nav>
      <main className="app-body">
        {mode === 'generator' ? <GeneratorMode />
                              : <DesignerMode />}
      </main>
    </div>
  );
}
