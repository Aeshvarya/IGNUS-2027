// @ts-check
import { defineConfig } from 'astro/config';
import { handoffPreview } from './scripts/handoff-preview.mjs';

// Set SITE_URL in the hosting environment once the domain is known (used for canonical + OG URLs).
const site = process.env.SITE_URL || 'https://ignus.iitj.ac.in';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  devToolbar: { enabled: false },
  vite: {
    plugins: [handoffPreview()],
    build: {
      target: 'es2022',
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 900,
    },
  },
});
