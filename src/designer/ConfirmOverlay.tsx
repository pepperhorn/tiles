import { useEffect } from 'react';

/** A small modal asking the user to confirm a destructive action. */
export function ConfirmOverlay({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }: {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, onConfirm]);

  return (
    <div
      className="confirm-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/30 p-4"
      onClick={onCancel}
    >
      <div
        className="overlay-card overlay-pop w-full max-w-md bg-white p-4"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className="confirm-title text-base font-semibold text-slate-900">{title}</h2>
        {message && <p className="confirm-message mt-1 text-sm text-slate-500">{message}</p>}
        <div className="overlay-actions mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="confirm-cancel px-4 py-2 text-sm"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="confirm-ok px-4 py-2 text-sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
