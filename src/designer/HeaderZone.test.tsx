import { render, screen } from '@testing-library/react';
import { HeaderZone } from './HeaderZone';
import { defaultDoc } from './sheetModel';

test('cello mode shows the 8vb instrument note under the part line', () => {
  render(<HeaderZone doc={{ ...defaultDoc(), displayMode: 'cello' }} editable={false} />);
  expect(screen.getByText('Cello 8vb')).toBeInTheDocument();
});

test('pitch mode does not show an instrument transposition note', () => {
  render(<HeaderZone doc={defaultDoc()} editable={false} />);
  expect(screen.queryByText('Cello 8vb')).not.toBeInTheDocument();
});
