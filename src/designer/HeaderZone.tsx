import type { SheetDoc, HeaderField } from './sheetModel';

export function HeaderZone({ doc, editable, onEditField = () => {} }: {
  doc: SheetDoc; editable: boolean; onEditField?: (f: HeaderField) => void;
}) {
  // Display text. When editable, tapping opens an overlay editor (preview text
  // stays full-size and tappable even when the sheet is scaled down).
  const display = (f: HeaderField, placeholder: string, cls: string, align: string) => {
    const val = doc[f];
    if (editable) {
      return (
        <button
          type="button"
          className={`${cls} header-field block w-full ${align} break-words cursor-pointer rounded px-1 py-0.5 -mx-1 leading-snug outline-none hover:bg-slate-100/70 focus:bg-slate-100 ${val ? '' : 'is-empty text-slate-600'}`}
          onClick={() => onEditField(f)}
          aria-label={`Edit ${placeholder}`}
        >
          {val || placeholder}
        </button>
      );
    }
    return val ? <span className={`${cls} block ${align} break-words`}>{val}</span> : null;
  };

  return (
    <header className="sheet-header mb-4">
      <div className="header-top grid grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)_minmax(0,1fr)] items-start gap-3">
        <div className="header-left min-w-0 text-sm text-slate-600">
          {display('part', 'Part / instrument', 'header-part font-semibold', 'text-left')}
          {display('tempoStyle', 'LH: tempo · style', 'header-tempo mt-1', 'text-left')}
        </div>
        <div className="header-center min-w-0">
          {display('title', 'Song title', 'header-title text-2xl font-bold', 'text-center')}
          {display('subtitle', 'Subtitle', 'header-subtitle text-sm text-slate-500', 'text-center')}
        </div>
        <div className="header-right min-w-0 text-sm text-slate-600">
          {display('composer', 'RH: composer', 'header-composer', 'text-right')}
        </div>
      </div>
    </header>
  );
}
