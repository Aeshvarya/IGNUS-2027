import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HANDOFF = fileURLToPath(new URL('../design/handoff/ignus-isekai-shift.html', import.meta.url));

/**
 * Dev-only Vite plugin: serves the original handoff page, untouched, at /handoff.html
 * so the build can be compared side by side with the reference. The handoff file was
 * written for a host that adds the document shell, so only the doctype and viewport are
 * added. Its relative logos/ and models/ paths resolve to public/.
 * Nothing from design/ ends up in the production build.
 */
export function handoffPreview() {
  return {
    name: 'ignus-handoff-preview',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/handoff.html', (_req, res) => {
        const shell = '<!doctype html>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n';
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(shell + readFileSync(HANDOFF, 'utf8'));
      });
    },
  };
}
