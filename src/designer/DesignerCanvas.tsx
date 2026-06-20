import { useState, type ReactNode } from 'react';
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

type TileItem = Extract<Item, { type: 'note' | 'arrow' }>;

const arrowSym = (dir: 'up' | 'down') => SYMBOLS.find(s => s.id === (dir === 'up' ? 'arrowUp' : 'arrowDown'))!;

function innerTile(item: TileItem, size: number, accidental: SheetDoc['accidentalStyle'], onClick?: () => void) {
  return item.type === 'note'
    ? <Tile kind="note" note={noteById(item.noteId)!} size={size} accidental={accidental} onClick={onClick} />
    : <Tile kind="arrow" sym={arrowSym(item.dir)} size={size} onClick={onClick} />;
}

// A draggable + droppable tile slot (only rendered inside a DndContext).
function DragSlot({ index, isOver, isPlaying, children }: { index: number; isOver: boolean; isPlaying: boolean; children: ReactNode }) {
  const { setNodeRef: dragRef, listeners, attributes, isDragging } = useDraggable({ id: index });
  const { setNodeRef: dropRef } = useDroppable({ id: index });
  const setRef = (n: HTMLDivElement | null) => { dragRef(n); dropRef(n); };
  return (
    <div
      ref={setRef}
      {...attributes}
      {...listeners}
      className={`tile-slot cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-40' : ''} ${isOver ? 'ring-2 ring-slate-900 rounded-lg' : ''} ${isPlaying ? 'is-playing' : ''}`}
    >
      {children}
    </div>
  );
}

// A section row that is also a drop target while dragging.
function DropSection({ index, text, isOver }: { index: number; text: string; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: index });
  return (
    <div ref={setNodeRef} className={`row-section font-semibold text-slate-700 mt-2 ${isOver ? 'ring-2 ring-slate-900 rounded-md' : ''}`}>{text}</div>
  );
}

export function DesignerCanvas({ doc, onRemove, editable = false, onEditField, onMove, playingIndex = null }: {
  doc: SheetDoc;
  onRemove: (index: number) => void;
  editable?: boolean;
  onEditField?: (f: HeaderField) => void;
  onMove?: (from: number, to: number) => void;
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

  const body = (
    <div className="sheet-body flex flex-col gap-1.5">
      {rows.map((row, ri) =>
        row.kind === 'section'
          ? (dnd
              ? <DropSection key={ri} index={row.index} text={row.text} isOver={overIndex === row.index} />
              : <div key={ri} className="row-section font-semibold text-slate-700 mt-2">{row.text}</div>)
          : (
            <div key={ri} className="row-tiles flex flex-wrap" style={{ gap: 6 }}>
              {row.cells.map(cell =>
                dnd
                  ? <DragSlot key={cell.index} index={cell.index} isOver={overIndex === cell.index} isPlaying={playingIndex === cell.index}>
                      {innerTile(cell.item, doc.size, doc.accidentalStyle, () => onRemove(cell.index))}
                    </DragSlot>
                  : <div key={cell.index} className={`tile-slot ${playingIndex === cell.index ? 'is-playing' : ''}`}>
                      {innerTile(cell.item, doc.size, doc.accidentalStyle, () => onRemove(cell.index))}
                    </div>
              )}
            </div>
          ))}
      {doc.items.length === 0 && <div className="empty text-slate-400 text-sm">Tap notes below or type A–G to begin.</div>}
    </div>
  );

  const activeItem = activeIndex != null ? doc.items[activeIndex] : undefined;

  return (
    <div className="sheets block" ref={fitRef}>
      <div className="sheet bg-white mx-auto" style={{ width: dims.w, padding: PAD, boxShadow: '7px 7px 0 var(--ink)' }}>
        <HeaderZone doc={doc} editable={editable} onEditField={onEditField} />
        {dnd ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={reset}>
            {body}
            <DragOverlay>
              {activeItem && (activeItem.type === 'note' || activeItem.type === 'arrow')
                ? innerTile(activeItem, doc.size, doc.accidentalStyle)
                : null}
            </DragOverlay>
          </DndContext>
        ) : body}
      </div>
    </div>
  );
}
