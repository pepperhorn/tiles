import { useEffect, useRef } from 'react';

/** Shared modal text editor used for header fields and section titles. */
export function EditOverlay({ label, value, placeholder, onChange, onClose }: {
  label: string; value: string; placeholder?: string; onChange: (v: string) => void; onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

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
        className="overlay-card overlay-pop w-full max-w-md bg-white p-4"
        onClick={e => e.stopPropagation()}
      >
        <label className="overlay-label block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{label}</label>
        <input
          ref={inputRef}
          className="overlay-input w-full px-3 py-2 text-base outline-none"
          value={value}
          placeholder={placeholder ?? label}
          autoCapitalize="sentences"
          onChange={e => onChange(e.target.value)}
        />
        <div className="overlay-actions mt-3 flex justify-end">
          <button
            type="button"
            className="overlay-done px-4 py-2 text-sm"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
