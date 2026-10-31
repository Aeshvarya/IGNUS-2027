# IGNUS ’27 · The Isekai Shift

The website for IGNUS '27, the annual fest of IIT Jodhpur.

## Getting started

Requires Node 20.19+ (22 recommended, see `.nvmrc`).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the build locally
```

The original design prototype runs at `http://localhost:5173/handoff.html` while the dev server is up.

## Stack

- [Vite](https://vite.dev): dev server and bundler
- [three.js](https://threejs.org) r160: the 3D world (pinned to the version the handoff was built on)
- Plain HTML, CSS and ES modules. No UI framework yet.

## Layout

```
design/handoff/     the design as handed over (reference only, do not edit)
public/logos/       wordmark SVGs
public/models/      knowledge-tree.glb
src/main.js         entry point
src/styles/         tokens.css (design tokens), base.css
index.html          page shell
```

## Roadmap

1. **Setup** ✔
2. **Base design**: build the handoff in this codebase, faithfully
3. **Next level**: take it further from there
