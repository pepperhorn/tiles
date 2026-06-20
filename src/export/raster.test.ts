import { extFor } from './raster';

test('extFor maps mime types to extensions', () => {
  expect(extFor('image/png')).toBe('png');
  expect(extFor('image/webp')).toBe('webp');
});
