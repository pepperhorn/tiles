import { TILE_SIZE_SCALE, nearestSizeLabel } from './sizes';

/** Accessibility tile-size selector (xs→xxl). Presentational: parent owns state. */
export function TileSizeControl({ sizePx, onSize }: { sizePx: number; onSize: (px: number) => void }) {
  const active = nearestSizeLabel(sizePx);
  return (
    <div className="viewer-size flex flex-col gap-1.5">
      <span className="lbl block text-xs font-semibold uppercase tracking-widest text-slate-400">Tile size</span>
      <div className="size-options flex flex-wrap gap-1" role="group" aria-label="Tile size">
        {TILE_SIZE_SCALE.map(s => (
          <button
            key={s.label}
            className="btn-tile-size px-2 py-1 text-xs uppercase"
            aria-pressed={active === s.label}
            onClick={() => onSize(s.px)}
          >{s.label}</button>
        ))}
      </div>
    </div>
  );
}
