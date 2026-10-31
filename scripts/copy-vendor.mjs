/** Copies runtime data files from node_modules into public/ (git-ignored), so nothing loads from third-party CDNs. */
import { cpSync, mkdirSync } from 'node:fs';
mkdirSync('public/gpu', { recursive: true });
cpSync('node_modules/detect-gpu/dist/benchmarks', 'public/gpu', { recursive: true });
console.log('vendor: copied detect-gpu benchmarks → public/gpu/');
