import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors,
  useDraggable, useDroppable, closestCenter,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { noteById } from '../notes';
import { TILE_GAP } from '../geometry';
import { sheetLayout } from './layout';
import { SheetSurface } from './SheetSurface';
import { innerTile, type TileItem } from './tileRender';
import type { Item, SheetDoc, HeaderField } from './sheetModel';

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
function DragSlot({ index, isOver, isPlaying, isDropped, dragColor, children }: { index: number; isOver: boolean; isPlaying: boolean; isDropped: boolean; dragColor: string; children: ReactNode }) {
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
      className={`tile-slot cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-40' : ''} ${isPlaying ? 'is-playing' : ''} ${isDropped ? 'just-dropped' : ''}`}
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

// A dashed placeholder you can drop into: empty sections and the blank space at
// the end of a row. Only rendered while dragging; animates in (see .drop-zone).
function DropZone({ insertIndex, size, isOver, dragColor }: { insertIndex: number; size: number; isOver: boolean; dragColor: string }) {
  const { setNodeRef } = useDroppable({ id: `zone:${insertIndex}` });
  const style: CSSProperties = isOver
    ? { width: size, height: size, background: dragColor, borderColor: 'var(--ink)' }
    : { width: size, height: size };
  return <div ref={setNodeRef} style={style} className={`drop-zone ${isOver ? 'is-over' : ''}`} aria-hidden="true" />;
}

// A section is "empty" when no tile follows it before the next section / the end.
function sectionIsEmpty(items: Item[], s: number): boolean {
  for (let i = s + 1; i < items.length; i++) {
    const t = items[i].type;
    if (t === 'section') return true;
    if (t === 'note' || t === 'arrow' || t === 'pause') return false;
  }
  return true;
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
  const { cols, rows } = sheetLayout(doc);

  const dnd = !!onMove;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Drop target id: a tile's item index (number) or a `zone:<insertIndex>` string.
  const [overId, setOverId] = useState<string | number | null>(null);
  // Index a tile just landed on, so it can play a short settle wiggle.
  const [dropped, setDropped] = useState<number | null>(null);
  const dropTimer = useRef<number | null>(null);
  const dragging = dnd && activeIndex !== null;

  // Mouse drags after a small move; touch drags after a short press (so taps and scrolling still work).
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const reset = () => { setActiveIndex(null); setOverId(null); };
  const onDragStart = (e: DragStartEvent) => setActiveIndex(Number(e.active.id));
  const onDragOver = (e: DragOverEvent) => setOverId(e.over ? e.over.id as string | number : null);
  // Flag the landing index so it wiggles, then clear after the animation runs.
  const flagDrop = (to: number) => {
    setDropped(to);
    if (dropTimer.current != null) clearTimeout(dropTimer.current);
    dropTimer.current = window.setTimeout(() => { setDropped(null); dropTimer.current = null; }, 360);
  };
  const onDragEnd = (e: DragEndEvent) => {
    const from = Number(e.active.id);
    const over = e.over?.id;
    if (over != null) {
      if (typeof over === 'string' && over.startsWith('zone:')) {
        // Absolute insertion index → the post-removal target moveItem expects.
        const k = Number(over.slice(5));
        const to = from < k ? k - 1 : k;
        if (to !== from) { onMove!(from, to); flagDrop(to); }
      } else if (Number(over) !== from) {
        onMove!(from, Number(over));
        flagDrop(Number(over));
      }
    }
    reset();
  };
  useEffect(() => () => { if (dropTimer.current != null) clearTimeout(dropTimer.current); }, []);

  // The drop highlight is tinted to the dragged tile's own colour (yellow accent
  // for non-note items: arrows and pauses), so it reads differently from the
  // black brutalist outline/shadow.
  const activeItem = activeIndex != null ? doc.items[activeIndex] : undefined;
  const dragColor = activeItem?.type === 'note'
    ? (noteById(activeItem.noteId)?.hex ?? 'var(--accent)')
    : 'var(--accent)';

  const body = (
    <div className="sheet-body flex w-fit flex-col gap-1.5 mx-auto">
      {rows.map((row, ri) => {
        if (row.kind === 'section') {
          // An empty section gets its own dashed drop target so notes can land in it.
          const showZone = dragging && sectionIsEmpty(doc.items, row.index);
          // While that zone is shown, the header is NOT a droppable — otherwise the
          // header (insert before) and the zone (insert after) compete and a tile
          // can land under the wrong heading.
          const sectionNode = dnd && !showZone
            ? <DropSection index={row.index} text={row.text} isOver={overId === row.index} dragColor={dragColor} onEdit={onEditSection ? () => onEditSection(row.index) : undefined} />
            : <div className="row-section font-semibold text-slate-700 mt-2">{row.text}</div>;
          return (
            <Fragment key={ri}>
              {sectionNode}
              {showZone && (
                <div className="row-tiles flex" style={{ gap: TILE_GAP }}>
                  <DropZone insertIndex={row.index + 1} size={doc.size} isOver={overId === `zone:${row.index + 1}`} dragColor={dragColor} />
                </div>
              )}
            </Fragment>
          );
        }
        const lastIdx = row.cells[row.cells.length - 1].index;
        // A blank-space target at the end of a row that has room (or the last row).
        const endZoneIndex = lastIdx + 1;
        const showEndZone = dragging && (row.cells.length < cols || ri === rows.length - 1);
        return (
          <div key={ri} className="row-tiles flex flex-wrap" style={{ gap: TILE_GAP }}>
            {row.cells.map(cell =>
              dnd
                ? <DragSlot key={cell.index} index={cell.index} isOver={overId === cell.index} isPlaying={playingIndex === cell.index} isDropped={dropped === cell.index} dragColor={dragColor}>
                    <TileButton index={cell.index} item={cell.item} size={doc.size} accidental={doc.accidentalStyle} onRemove={onRemove} onToggleArrow={onToggleArrow} />
                  </DragSlot>
                : <div key={cell.index} className={`tile-slot ${playingIndex === cell.index ? 'is-playing' : ''}`}>
                    {innerTile(cell.item, doc.size, doc.accidentalStyle, () => onRemove(cell.index))}
                  </div>
            )}
            {showEndZone && <DropZone insertIndex={endZoneIndex} size={doc.size} isOver={overId === `zone:${endZoneIndex}`} dragColor={dragColor} />}
          </div>
        );
      })}
      {doc.items.length === 0 && <div className="empty text-slate-600 text-sm">Tap notes below or type A–G to begin.</div>}
    </div>
  );

  return (
    <SheetSurface doc={doc} editable={editable} onEditField={onEditField}>
      {dnd ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={reset}>
          {body}
          {/* No snap-back: the overlay vanishes at the drop point instead of
              animating to the dragged tile's old home; the landed tile wiggles. */}
          <DragOverlay dropAnimation={null}>
            {activeItem && (activeItem.type === 'note' || activeItem.type === 'arrow' || activeItem.type === 'pause')
              ? innerTile(activeItem, doc.size, doc.accidentalStyle)
              : null}
          </DragOverlay>
        </DndContext>
      ) : body}
    </SheetSurface>
  );
}
