import { TILE_SIZE_SCALE, nearestSizeLabel } from './sizes';

test('the scale runs xs→xxl over the editor px values', () => {
  expect(TILE_SIZE_SCALE.map(s => s.label)).toEqual(['xs', 's', 'm', 'l', 'xl', 'xxl']);
  expect(TILE_SIZE_SCALE.map(s => s.px)).toEqual([40, 52, 64, 80, 96, 112]);
});

test('nearestSizeLabel snaps to the closest step', () => {
  expect(nearestSizeLabel(64)).toBe('m');
  expect(nearestSizeLabel(70)).toBe('m');
  expect(nearestSizeLabel(100)).toBe('xl');
  expect(nearestSizeLabel(999)).toBe('xxl');
});
