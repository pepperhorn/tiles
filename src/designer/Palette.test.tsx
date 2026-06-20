import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Palette } from './Palette';

test('tapping a note button dispatches insertNote', async () => {
  const onAction = vi.fn();
  render(<Palette onAction={onAction} />);
  await userEvent.click(screen.getByRole('button', { name: 'C' }));
  expect(onAction).toHaveBeenCalledWith({ type: 'insertNote', noteId: 'C' });
});

test('tapping sharp and line-break dispatch the right actions', async () => {
  const onAction = vi.fn();
  render(<Palette onAction={onAction} />);
  await userEvent.click(screen.getByRole('button', { name: /sharp/i }));
  await userEvent.click(screen.getByRole('button', { name: /line break/i }));
  expect(onAction).toHaveBeenCalledWith({ type: 'sharpenLast' });
  expect(onAction).toHaveBeenCalledWith({ type: 'insertBreak' });
});
