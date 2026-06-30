import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { encodeSheet } from './quiz/encode';
import { defaultDoc } from './designer/sheetModel';

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

test('the mode-drawer toggle collapses and reveals the tabs', async () => {
  // The compiled Tailwind CSS isn't loaded in jsdom, so assert the drawer state
  // (aria-expanded + the nav's hidden/flex class) rather than computed visibility.
  render(<App />);
  const drawer = screen.getByRole('button', { name: /switch mode/i });
  const nav = document.querySelector('.app-tabs') as HTMLElement;
  expect(drawer).toHaveAttribute('aria-expanded', 'true');
  expect(nav.className).toContain('flex');
  await userEvent.click(drawer); // collapse
  expect(drawer).toHaveAttribute('aria-expanded', 'false');
  expect(nav.className).toContain('hidden');
  await userEvent.click(drawer); // reveal
  expect(drawer).toHaveAttribute('aria-expanded', 'true');
});

test('a #view= link renders only the player, no mode tabs', async () => {
  window.location.hash = `#view=${encodeSheet({ ...defaultDoc(), items: [{ type: 'note', noteId: 'C' }] })}`;
  try {
    render(<App />);
    expect(await screen.findByRole('button', { name: /^play/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sheet designer/i })).not.toBeInTheDocument();
  } finally {
    window.location.hash = '';
  }
});
