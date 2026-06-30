// Named tile-size steps for the accessibility size control, reusing the px
// values the editor offers. Shared by the SheetPlayer and the QuizViewer.
export const TILE_SIZE_SCALE: { label: string; px: number }[] = [
  { label: 'xs', px: 40 },
  { label: 's', px: 52 },
  { label: 'm', px: 64 },
  { label: 'l', px: 80 },
  { label: 'xl', px: 96 },
  { label: 'xxl', px: 112 },
];

/** Label of the scale step whose px is closest to `px`. */
export function nearestSizeLabel(px: number): string {
  return TILE_SIZE_SCALE.reduce((best, s) =>
    Math.abs(s.px - px) < Math.abs(best.px - px) ? s : best, TILE_SIZE_SCALE[0]).label;
}
