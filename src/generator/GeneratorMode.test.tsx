import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeneratorMode } from './GeneratorMode';

test('changing tiles-per-row to a fixed number re-renders columns', async () => {
  render(<GeneratorMode />);
  const input = screen.getByLabelText(/tiles per row/i);
  await userEvent.clear(input);
  await userEvent.type(input, '4');
  const grid = document.querySelector('.sheet .grid') as HTMLElement;
  expect(grid.style.gridTemplateColumns).toContain('repeat(4');
});

test('select none empties the preview', async () => {
  render(<GeneratorMode />);
  await userEvent.click(screen.getByRole('button', { name: /select none/i }));
  expect(screen.getByText(/no tiles yet/i)).toBeInTheDocument();
});
