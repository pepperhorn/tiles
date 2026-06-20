import type { SheetDoc, HeaderField } from './sheetModel';

export function HeaderZone({ doc, editable, onHeader }: {
  doc: SheetDoc; editable: boolean; onHeader: (f: HeaderField, v: string) => void;
}) {
  const field = (f: HeaderField, placeholder: string, cls: string) =>
    editable
      ? <input className={`${cls} bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-slate-500`}
               placeholder={placeholder} value={doc[f]} onChange={e => onHeader(f, e.target.value)} />
      : (doc[f] ? <span className={cls}>{doc[f]}</span> : null);

  return (
    <header className="sheet-header mb-4">
      <div className="header-top grid grid-cols-3 items-start gap-2">
        <div className="header-left text-sm text-slate-600">
          {field('part', 'Part / instrument', 'header-part font-semibold block')}
          {field('tempoStyle', 'LH: tempo · style', 'header-tempo block mt-1')}
        </div>
        <div className="header-center text-center">
          {field('title', 'Song title', 'header-title text-2xl font-bold block')}
          {field('subtitle', 'Subtitle', 'header-subtitle text-sm text-slate-500 block')}
        </div>
        <div className="header-right text-right text-sm text-slate-600">
          {field('composer', 'RH: composer', 'header-composer block')}
        </div>
      </div>
    </header>
  );
}
