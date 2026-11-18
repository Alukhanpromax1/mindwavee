import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Resolve everything from this file's folder (the repository root), so `dist/` is always
// created next to package.json — no matter which working directory the build runs from.
const ROOT = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: ROOT,
  // Relative base so the build works on Vercel, GitHub Pages sub-paths, or any static host.
  base: './',
  publicDir: resolve(ROOT, 'public'),
  build: {
    outDir: resolve(ROOT, 'dist'),
    emptyOutDir: true,
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
