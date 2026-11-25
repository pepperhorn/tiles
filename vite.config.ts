import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'umami-analytics',
      apply: 'build',
      transformIndexHtml() {
        if (mode !== 'production') return [];
        return [{
          tag: 'script',
          attrs: {
            defer: true,
            src: 'https://analytics.pepperhorn.com/script.js',
            'data-website-id': '0e9a22a7-7d7d-4a0e-a748-0b86970c174c',
          },
          injectTo: 'head',
        }];
      },
    },
  ],
  server: { host: '0.0.0.0' },
}));
