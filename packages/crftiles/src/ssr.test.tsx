// @vitest-environment node
import { renderToString } from 'react-dom/server';
import fixture from '../fixtures/amazing-grace.tiles.json';

test('imports and server-renders without a DOM (SSR-safe)', async () => {
  expect(typeof window).toBe('undefined');
  const { CrfTiles } = await import('./index');
  const html = renderToString(<CrfTiles doc={JSON.stringify(fixture)} />);
  expect(html).toContain('class="crftiles"');
  expect(html).toContain('Amazing Grace');
  expect(html).toContain('tile');
});
