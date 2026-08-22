import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Charts are now hand-rolled SVG, so recharts is gone entirely.
          // jszip/html-to-image stay split: both are only needed on demand
          // (zip upload, image export) rather than on first paint.
          'vendor-files': ['jszip', 'html-to-image'],

          // Split for CACHING, not for size — the bytes are the same either
          // way. Everything below used to sit inside the entry chunk, so
          // shipping a one-line copy change invalidated half a megabyte that
          // had not changed, and every returning visitor re-downloaded React.
          // These two move on their own release schedule, not ours.
          'vendor-react': ['react', 'react-dom', 'react-dom/client'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
