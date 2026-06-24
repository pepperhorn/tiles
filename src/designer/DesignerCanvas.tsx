import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors,
  useDraggable, useDroppable, closestCenter,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { Tile } from '../Tile';
import { noteById, SYMBOLS } from '../notes';
import { sheetDimsMm, pageBox, resolveCols, PAD } from '../geometry';
import { flowRows } from './flow';
import { HeaderZone } from './HeaderZone';
import { useFitWidth } from '../useFitWidth';
import type { Item, SheetDoc, HeaderField } from './sheetModel';

type TileItem = Extract<Item, { type: 'note' | 'arrow' | 'pause' }>;

const arrowSym = (dir: 'up' | 'down') => SYMBOLS.find(s => s.id === (dir === 'up' ? 'arrowUp' : 'arrowDown'))!;

function innerTile(item: TileItem, size: number, accidental: SheetDoc['accidentalStyle'], onClick?: () => void) {
  if (item.type === 'note') return <Tile kind="note" note={noteById(item.noteId)!} size={size} accidental={accidental} onClick={onClick} />;
  if (item.type === 'pause') return <Tile kind="pause" size={size} onClick={onClick} />;
  return <Tile kind="arrow" sym={arrowSym(item.dir)} size={size} onClick={onClick} />;
}

// Wraps a tile with tap handling: notes/pauses remove on tap; arrows (when a
// toggle handler is supplied) flip direction on a single tap and delete on a
// double tap. The double-tap timer lives in a ref read only inside the handler.
function TileButton({ index, item, size, accidental, onRemove, onToggleArrow }: {
  index: number; item: TileItem; size: number; accidental: SheetDoc['accidentalStyle'];
  onRemove: (index: number) => void; onToggleArrow?: (index: number) => void;
}) {
  const pending = useRef<number | null>(null);
  // Don't let a pending single-tap toggle fire after this tile unmounts (e.g. a
  // neighbour was deleted within the 260ms window, shifting indexes).
  useEffect(() => () => { if (pending.current != null) clearTimeout(pending.current); }, []);
  const onClick = () => {
    if (!onToggleArrow || item.type !== 'arrow') { onRemove(index); return; }
    if (pending.current != null) {
      clearTimeout(pending.current); pending.current = null;
      onRemove(index);
      return;
    }
    pending.current = window.setTimeout(() => { pending.current = null; onToggleArrow(index); }, 260);
  };
  // display:contents wrapper carries the click without adding a layout box; the
  // surrounding slot already shows the grab cursor.
  return <span className="contents" onClick={onClick}>{innerTile(item, size, accidental)}</span>;
}

// A draggable + droppable tile slot (only rendered inside a DndContext).
function DragSlot({ index, isOver, isPlaying, dragColor, children }: { index: number; isOver: boolean; isPlaying: boolean; dragColor: string; children: ReactNode }) {
  const { setNodeRef: dragRef, listeners, attributes, isDragging } = useDraggable({ id: index });
  const { setNodeRef: dropRef } = useDroppable({ id: index });
  const setRef = (n: HTMLDivElement | null) => { dragRef(n); dropRef(n); };
  // Drop highlight: a colour ring tinted to the dragged tile (yellow for
  // non-notes) plus a dashed ink frame — deliberately unlike the solid black
  // brutalist outline so the drop target stands out.
  const overStyle = isOver
    ? { boxShadow: `0 0 0 4px ${dragColor}`, outline: '2px dashed var(--ink)', outlineOffset: '4px' }
    : undefined;
  return (
    <div
      ref={setRef}
      {...attributes}
      {...listeners}
      style={overStyle}
      className={`tile-slot cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-40' : ''} ${isPlaying ? 'is-playing' : ''}`}
    >
      {children}
    </div>
  );
}

// A section row that is also a drop target while dragging.
function DropSection({ index, text, isOver, dragColor, onEdit }: { index: number; text: string; isOver: boolean; dragColor: string; onEdit?: () => void }) {
  const { setNodeRef } = useDroppable({ id: index });
  const overStyle = isOver
    ? { boxShadow: `0 0 0 3px ${dragColor}`, outline: '2px dashed var(--ink)', outlineOffset: '3px' }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={overStyle}
      className={`row-section font-semibold text-slate-700 mt-2 ${onEdit ? 'cursor-pointer hover:bg-slate-100/70 rounded px-1 -mx-1' : ''}`}
      onClick={onEdit}
    >{text || <span className="text-slate-600">Section…</span>}</div>
  );
}

export function DesignerCanvas({ doc, onRemove, editable = false, onEditField, onEditSection, onMove, onToggleArrow, playingIndex = null }: {
  doc: SheetDoc;
  onRemove: (index: number) => void;
  editable?: boolean;
  onEditField?: (f: HeaderField) => void;
  onEditSection?: (index: number) => void;
  onMove?: (from: number, to: number) => void;
  onToggleArrow?: (index: number) => void;
  playingIndex?: number | null;
}) {
  const dims = sheetDimsMm(doc.paper, doc.orientation);
  const { w: pageW } = pageBox(doc.paper, doc.orientation);
  const cols = resolveCols(doc.tilesPerRow, doc.size, 6, pageW);
  const rows = flowRows(doc.items, cols);
  const fitRef = useFitWidth(pageW);

  const dnd = !!onMove;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Mouse drags after a small move; touch drags after a short press (so taps and scrolling still work).
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const reset = () => { setActiveIndex(null); setOverIndex(null); };
  const onDragStart = (e: DragStartEvent) => setActiveIndex(Number(e.active.id));
  const onDragOver = (e: DragOverEvent) => setOverIndex(e.over ? Number(e.over.id) : null);
  const onDragEnd = (e: DragEndEvent) => {
    const from = Number(e.active.id);
    const to = e.over != null ? Number(e.over.id) : null;
    if (to != null && from !== to) onMove!(from, to);
    reset();
  };

  // The drop highlight is tinted to the dragged tile's own colour (yellow accent
  // for non-note items: arrows and pauses), so it reads differently from the
  // black brutalist outline/shadow.
  const activeItem = activeIndex != null ? doc.items[activeIndex] : undefined;
  const dragColor = activeItem?.type === 'note'
    ? (noteById(activeItem.noteId)?.hex ?? 'var(--accent)')
    : 'var(--accent)';

  const body = (
    <div className="sheet-body flex w-fit flex-col gap-1.5 mx-auto">
      {rows.map((row, ri) =>
        row.kind === 'section'
          ? (dnd
              ? <DropSection key={ri} index={row.index} text={row.text} isOver={overIndex === row.index} dragColor={dragColor} onEdit={onEditSection ? () => onEditSection(row.index) : undefined} />
              : <div key={ri} className="row-section font-semibold text-slate-700 mt-2">{row.text}</div>)
          : (
            <div key={ri} className="row-tiles flex flex-wrap" style={{ gap: 6 }}>
              {row.cells.map(cell =>
                dnd
                  ? <DragSlot key={cell.index} index={cell.index} isOver={overIndex === cell.index} isPlaying={playingIndex === cell.index} dragColor={dragColor}>
                      <TileButton index={cell.index} item={cell.item} size={doc.size} accidental={doc.accidentalStyle} onRemove={onRemove} onToggleArrow={onToggleArrow} />
                    </DragSlot>
                  : <div key={cell.index} className={`tile-slot ${playingIndex === cell.index ? 'is-playing' : ''}`}>
                      {innerTile(cell.item, doc.size, doc.accidentalStyle, () => onRemove(cell.index))}
                    </div>
              )}
            </div>
          ))}
      {doc.items.length === 0 && <div className="empty text-slate-600 text-sm">Tap notes below or type A–G to begin.</div>}
    </div>
  );

  return (
    <div className="sheets block" ref={fitRef}>
      <div className="sheet bg-white mx-auto" style={{ width: dims.w, padding: PAD, boxShadow: '7px 7px 0 var(--ink)', borderTop: '1px solid var(--ink)', borderLeft: '1px solid var(--ink)' }}>
        <HeaderZone doc={doc} editable={editable} onEditField={onEditField} />
        {dnd ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={reset}>
            {body}
            <DragOverlay>
              {activeItem && (activeItem.type === 'note' || activeItem.type === 'arrow' || activeItem.type === 'pause')
                ? innerTile(activeItem, doc.size, doc.accidentalStyle)
                : null}
            </DragOverlay>
          </DndContext>
        ) : body}
      </div>
    </div>
  );
}
