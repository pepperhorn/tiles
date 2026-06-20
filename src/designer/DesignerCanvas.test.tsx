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

test('tiles are draggable affordances when onMove is provided', () => {
  const doc = { ...defaultDoc(), tilesPerRow: 10 as const, items: [
    { type: 'note', noteId: 'C' } as const,
    { type: 'note', noteId: 'E' } as const,
    { type: 'arrow', dir: 'up' } as const,
  ] };
  const { container } = render(<DesignerCanvas doc={doc} onRemove={() => {}} onMove={() => {}} />);
  const slots = container.querySelectorAll('.tile-slot');
  expect(slots).toHaveLength(3);
  // dnd-kit marks each draggable with an aria role description
  expect(slots[0].getAttribute('aria-roledescription')).toBe('draggable');
});

test('no drag affordance when onMove is not provided', () => {
  const doc = { ...defaultDoc(), items: [{ type: 'note', noteId: 'C' } as const] };
  const { container } = render(<DesignerCanvas doc={doc} onRemove={() => {}} />);
  const slot = container.querySelector('.tile-slot')!;
  expect(slot.getAttribute('aria-roledescription')).toBeNull();
});
