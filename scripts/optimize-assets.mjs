/**
 * Builds web-ready 3D assets from assets/source/ into public/models/.
 *   tree.glb       desktop: meshopt geometry, 2048px WebP textures
 *   tree-lite.glb  phones:  meshopt geometry, ~45% triangles, 1024px WebP textures
 * Run: npm run assets   (re-run whenever a source model changes)
 */
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

const SRC = 'assets/source/knowledge-tree.glb';
const JOBS = [
  { out: 'public/models/tree.glb', args: ['--texture-size', '2048', '--simplify', 'false'] },
  { out: 'public/models/tree-lite.glb', args: ['--texture-size', '1024', '--simplify', 'true', '--simplify-ratio', '0.45', '--simplify-error', '0.002'] },
];

for (const job of JOBS) {
  execFileSync('npx', ['gltf-transform', 'optimize', SRC, job.out, '--compress', 'meshopt', '--texture-compress', 'webp', '--instance', 'false', '--flatten', 'false', ...job.args], { stdio: 'inherit' });
  const kb = (statSync(job.out).size / 1024).toFixed(0);
  console.log(`${job.out}: ${kb} KB`);
}
console.log(`source: ${(statSync(SRC).size / 1024).toFixed(0)} KB`);
