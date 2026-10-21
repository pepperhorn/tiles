import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // packages/* run their own suites (npm test in the package directory).
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts', exclude: [...configDefaults.exclude, 'packages/**'] },
});
