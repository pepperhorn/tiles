import type { ReactNode } from 'react';
import { sheetDimsMm, pageBox } from '../geometry';
import { useFitWidth } from '../useFitWidth';
import { HeaderZone } from './HeaderZone';
import { sheetBoxStyle } from './layout';
import type { SheetDoc, HeaderField } from './sheetModel';

/**
 * The shared sheet shell: a fit-to-width `.sheets` wrapper around one white
 * `.sheet` page with its header. Each canvas supplies its own body as children
 * (the designer's drag layer, the quiz blanks, etc.), so the frame, padding,
 * shadow and fit behaviour live in exactly one place.
 */
export function SheetSurface({ doc, editable = false, onEditField, className = '', children }: {
  doc: SheetDoc;
  editable?: boolean;
  onEditField?: (f: HeaderField) => void;
  className?: string;
  children: ReactNode;
}) {
  const dims = sheetDimsMm(doc.paper, doc.orientation);
  const { w: pageW } = pageBox(doc.paper, doc.orientation);
  const fitRef = useFitWidth(pageW);
  return (
    <div className="sheets block" ref={fitRef}>
      <div className={`sheet bg-white mx-auto ${className}`.trim()} style={sheetBoxStyle(dims.w)}>
        <HeaderZone doc={doc} editable={editable} onEditField={onEditField} />
        {children}
      </div>
    </div>
  );
}
