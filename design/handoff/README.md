# Design handoff

The base design for IGNUS '27, as it was handed over. **Do not edit these files.**
They are the reference the build is checked against.

| File | What it is |
| --- | --- |
| `ignus-isekai-shift.html` | Single-page prototype: a scroll-driven three.js world (the "berm" → portal crossing → "the Shift") under a scrolling quest log. Loads three r160 from a CDN. |
| `../../public/logos/*.svg` | Wordmarks: mono (header), date (hero), title (after the crossing) |
| `../../public/models/knowledge-tree.glb` | The knowledge-tree monument |

Run `npm run dev` and open `/handoff.html` to view the prototype unchanged (a dev-only plugin in
`scripts/handoff-preview.mjs` serves it). The production site ports it into `src/world/` and `src/pages/index.astro`.
