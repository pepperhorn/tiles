import { useEffect, useRef } from 'react';
import type { HeaderField } from './sheetModel';

const LABELS: Record<HeaderField, string> = {
  part: 'Part / instrument',
  tempoStyle: 'LH: tempo · style',
  title: 'Title',
  subtitle: 'Subtitle',
  composer: 'RH: composer',
};

export function HeaderEditOverlay({ field, value, onChange, onClose }: {
  field: HeaderField; value: string; onChange: (v: string) => void; onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, [field]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="header-edit-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/30 p-4"
      onClick={onClose}
    >
      <div
        className="overlay-card overlay-pop w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <label className="overlay-label block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
          {LABELS[field]}
        </label>
        <input
          ref={inputRef}
          className="overlay-input w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-900"
          value={value}
          placeholder={LABELS[field]}
          onChange={e => onChange(e.target.value)}
        />
        <div className="overlay-actions mt-3 flex justify-end">
          <button
            type="button"
            className="overlay-done rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
