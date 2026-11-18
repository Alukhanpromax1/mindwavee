import { defineConfig } from 'vite';

// Relative base so the build works on Vercel, GitHub Pages sub-paths, or any static host.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // keep three.js in its own long-cacheable chunk
        manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined),
      },
    },
  },
  server: { host: true },
});
