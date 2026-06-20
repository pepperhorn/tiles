import { render, screen } from '@testing-library/react';
import App from './App';

test('renders both mode tabs', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /tile generator/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /sheet designer/i })).toBeInTheDocument();
});
