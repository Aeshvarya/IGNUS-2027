# Design handoff

The base design for IGNUS '27, as it was handed over. **Do not edit these files.**
They are the reference the build is checked against.

| File | What it is |
| --- | --- |
| `ignus-isekai-shift.html` | Single-page prototype: a scroll-driven three.js world (the "berm" → portal crossing → "the Shift") under a scrolling quest log. Loads three r160 from a CDN. |
| `../../public/logos/wordmark-mono.svg` | Header wordmark (1566 × 553) |
| `../../public/logos/wordmark-date.svg` | Hero wordmark with the 2027 date (1721 × 677) |
| `../../public/logos/wordmark-title.svg` | "IGNUS: Isekai Shift" title lockup shown after the crossing (1558 × 768) |
| `../../public/models/knowledge-tree.glb` | The knowledge-tree monument (gltfpack, quantized; 1 mesh, 3 JPEG textures, ~4.8 MB) |

The logos and model live in `public/` once, so both the prototype and the build use the same files.

## Viewing the prototype

Run `npm run dev` and open `/handoff.html`. A dev-only plugin in `vite.config.js` serves this file
unchanged, adding only the doctype and viewport the original host supplied.

## Page structure (story position `u`, 0 → 6)

0. **Hero**: wordmark, "The Isekai Shift / अतींद्रिय भावांतर", scroll cue
1. **Prologue** (`#theme`): "For four days, academic gravity switches off." Magic-circle definition
2. **Rift start** (`#rift`): Coleridge quote, sync %
3. **The crossing**: camera flies through the portal; the UI and the world flip to the Shift
4. **Character select** (`#avatars`): five avatars; the choice sets `--accent` across UI and world
5. **Quest log** (`#quests`): hovering a quest highlights its 3D marker
6. **Final level** (`#register`): register CTA, back through the berm
