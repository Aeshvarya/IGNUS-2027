# IGNUS ’27 · The Isekai Shift

The website for IGNUS '27, the annual fest of IIT Jodhpur. This repo is **frontend only**: a static site,
with a single seam (`src/lib/api`) where the backend gets mapped in later.

## Run it

Requires **Node 22.23+** (see `.nvmrc`).

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # static site → dist/
npm run preview   # serve dist/ locally
```

While `npm run dev` is running, the original design prototype is at `http://localhost:4321/handoff.html`.

## Stack

- **[Astro 7](https://astro.build)**, static output: every page is pre-rendered HTML, so any CDN can serve it.
  The router keeps one live 3D canvas across page navigations.
- **[three.js](https://threejs.org)**: the world, in `src/world/`. Loaded lazily after first paint.
- **[GSAP](https://gsap.com)** and **[Lenis](https://lenis.darkroom.engineering)**: motion and smooth scroll, on one shared clock.
- Fonts are self-hosted (fontsource), so there are no runtime CDN dependencies.

## Where things live

```
src/
  pages/            routes (index = the immersive home)
  layouts/Base.astro  <head>, HUD, persistent world canvas, loader
  components/       Hud (top bar + pause menu), …
  content/          EDIT ME: events/*.md, pronites/passes/sponsors/team/faq .json (placeholders for now)
  content.config.ts schemas for the content files (the build fails if a field is wrong)
  config/site.ts    EDIT ME: fest dates, socials, nav, avatars, categories
  lib/api/          backend seam: register / pass links, future API calls
  runtime/          client glue: clock, scroll → story position, page controllers, menu, Lite mode
  world/            the 3D world (ordinary realm, the Shift, post-processing, camera paths)
  styles/           tokens.css (design tokens), base, hud, ui, home
public/             logos, the knowledge-tree model, favicon
design/handoff/     the original design as handed over (reference only, do not edit)
```

## Editing content (no code needed)

- **Events:** one Markdown file per event in `src/content/events/`. The file name becomes the URL
  (`battle-of-bands.md` → `/events/battle-of-bands/`). Copy an existing file and change the fields at the top.
- **Pronites, passes, sponsors, team, FAQ:** the JSON files in `src/content/`.
- **Dates, socials, contact:** `src/config/site.ts`.

`npm run build` checks every content file against `src/content.config.ts` and tells you exactly which field is wrong.

## Connecting the backend

All register / pass / API links go through `src/lib/api/index.ts`. Configure them with build-time environment variables:

| Variable | Effect |
|---|---|
| `PUBLIC_API_BASE_URL` | Base URL of the IGNUS backend. When set, Register and pass buttons point at backend routes. |
| `PUBLIC_REGISTER_URL` | Fallback external registration link (e.g. a form), used when there is no backend. |
| `PUBLIC_PASSES_URL` | Fallback external link for buying passes. |
| `SITE_URL` | The public domain, used for canonical and social-share URLs. |

## Branches

Work happens on feature branches (currently `feat/fest-site-v1`). `main` only changes through reviewed merges.
