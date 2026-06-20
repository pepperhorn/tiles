import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignerCanvas } from './DesignerCanvas';
import { defaultDoc } from './sheetModel';

test('renders header text and flowed tiles; clicking a tile removes it', async () => {
  const doc = { ...defaultDoc(), title: 'My Song', tilesPerRow: 4 as const,
    items: [{ type: 'note', noteId: 'C' } as const, { type: 'arrow', dir: 'up' } as const] };
  const onRemove = vi.fn();
  render(<DesignerCanvas doc={doc} onRemove={onRemove} />);
  expect(screen.getByText('My Song')).toBeInTheDocument();
  expect(screen.getByText('↑')).toBeInTheDocument();
  await userEvent.click(screen.getByText('↑'));
  expect(onRemove).toHaveBeenCalledWith(1);
});
