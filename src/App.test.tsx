import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

test('renders both mode tabs', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /tile generator/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /sheet designer/i })).toBeInTheDocument();
});

test('the header tools toggle shows and hides the designer panel', async () => {
  render(<App />);
  // Designer is the default mode; the toggle lives in the header.
  const toggle = screen.getByRole('button', { name: 'Hide tools' });
  expect(document.querySelector('.designer-panel.flex')).toBeTruthy();
  await userEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Show tools' })).toBeInTheDocument();
  expect(document.querySelector('.designer-panel.hidden')).toBeTruthy();
});

test('the tools toggle is hidden outside the designer', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /tile generator/i }));
  expect(screen.queryByRole('button', { name: /tools/i })).not.toBeInTheDocument();
});
