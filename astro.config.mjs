// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { handoffPreview } from './scripts/handoff-preview.mjs';

// Set SITE_URL in the hosting environment to the real domain (used for canonical, OG and sitemap URLs).
const site = process.env.SITE_URL || 'http://localhost:4321';
if (!process.env.SITE_URL && process.argv.includes('build')) {
  console.warn('\n[ignus] SITE_URL is not set: canonical, social-share and sitemap URLs will point at localhost.\n');
}

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
  // Static pages are tiny: prefetch on hover so navigation (and the camera flight) starts instantly.
  prefetch: {
    prefetchAll: true,
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
