import { useRef, useState } from 'react';
import type { SheetDoc } from '../designer/sheetModel';
import { parseSheetJson } from '../designer/json';
import { noteIndexes } from './blanks';
import { encodeQuiz, DEFAULT_PRESET, type QuizPreset } from './encode';
import { QuizViewer } from './QuizViewer';

/** In-app wrapper: a designer loads/configures a quiz and tests it, or copies an embed link. */
export function QuizViewerTab({ doc }: { doc: SheetDoc }) {
  const [loaded, setLoaded] = useState<SheetDoc | null>(null);
  const [preset, setPreset] = useState<QuizPreset>(DEFAULT_PRESET);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const source = loaded ?? doc;

  const onUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try { setLoaded(parseSheetJson(String(reader.result))); setMsg('Loaded JSON.'); }
      catch { setMsg('Invalid sheet JSON.'); }
    };
    reader.onerror = () => setMsg('Could not read file.');
    reader.readAsText(file);
  };

  const copyLink = async () => {
    const enc = encodeQuiz({ doc: source, quiz: preset });
    const url = `${window.location.origin}${window.location.pathname}#quiz=${enc}`;
    try { await navigator.clipboard.writeText(url); setMsg('Embed link copied to clipboard.'); }
    catch { setMsg(url); }
  };

  const config = (
    <div className="group group-quiz-config grid gap-2 border-b border-slate-200 pb-4 mb-1">
      <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400">Quiz setup</span>
      <div className="config-source text-xs text-slate-500">
        Source: {loaded ? (loaded.title?.trim() || 'uploaded JSON') : 'current design'} · {noteIndexes(source.items).length} notes
      </div>
      <div className="config-load flex gap-2">
        <button className="btn-load-json flex-1 rounded-lg border px-3 py-1 text-sm" onClick={() => fileRef.current?.click()}>Load JSON…</button>
        {loaded && <button className="btn-use-current flex-1 rounded-lg border px-3 py-1 text-sm" onClick={() => setLoaded(null)}>Use current</button>}
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
      </div>
      <button className="btn-embed rounded-lg border px-3 py-1 text-sm font-semibold" onClick={copyLink}>Copy embed link</button>
      {msg && <div className="config-msg text-xs text-slate-500 break-all">{msg}</div>}
    </div>
  );

  return <QuizViewer source={source} preset={preset} onPreset={setPreset} configSlot={config} />;
}
