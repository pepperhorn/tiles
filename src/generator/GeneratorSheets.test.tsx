import { render } from '@testing-library/react';
import { GeneratorSheets } from './GeneratorSheets';

test('renders one .sheet element per plan', () => {
  const sheets = [
    { kind: 'tiles' as const, cols: 2, rows: [{ noteId: 'C' }], size: 40, gap: 4, guides: false },
    { kind: 'tiles' as const, cols: 2, rows: [{ noteId: 'G' }], size: 40, gap: 4, guides: false },
  ];
  const { container } = render(<GeneratorSheets sheets={sheets} paper="A4" orientation="portrait" />);
  expect(container.querySelectorAll('.sheet')).toHaveLength(2);
});
