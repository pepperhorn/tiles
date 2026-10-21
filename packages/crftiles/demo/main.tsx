// crftiles demo: the embed with a real sheet (Amazing Grace, from crf-admin sheets.tiles_doc) in several chrome
// presets and container widths, on a page with hostile global CSS. `npm run dev` in packages/crftiles.
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Demo } from './Demo';

createRoot(document.getElementById('root')!).render(<StrictMode><Demo /></StrictMode>);
