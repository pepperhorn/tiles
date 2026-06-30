import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TileSizeControl } from './TileSizeControl';

test('marks the active step and emits the chosen px', async () => {
  const onSize = vi.fn();
  render(<TileSizeControl sizePx={64} onSize={onSize} />);
  expect(screen.getByRole('button', { name: 'm' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'xxl' }));
  expect(onSize).toHaveBeenCalledWith(112);
});
