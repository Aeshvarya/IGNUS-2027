# IGNUS ’27 · The Isekai Shift

The website for IGNUS '27, the annual fest of IIT Jodhpur. This repo is **frontend only**: a static site
built for 10–15k visitors, with one seam (`src/lib/api`) where the backend gets mapped in later.

## Run it

Requires **Node 22.23+** (see `.nvmrc`).

```bash
npm install
npm run dev       # http://localhost:4321  (the original handoff is at /handoff.html)
npm run build     # static site → dist/   (also validates every content file)
npm run preview   # serve dist/ locally
```

| Script | What it does |
| --- | --- |
| `npm run budget` | After a build: fails if the site grows past its performance budget |
| `npm run smoke` | With `preview` running: visits every page on desktop and phone sizes, fails on console errors, sideways overflow or serious accessibility issues |
| `npm run assets` | Rebuilds the web-ready 3D models from `assets/source/` |
| `npm run posters` | With `preview` running: re-renders the Lite-mode posters from the real 3D scene |

## How it is built

- **[Astro 7](https://astro.build), static output.** Every page is pre-rendered HTML that any CDN can serve, so traffic
  spikes (lineup reveals, registration day) cost nothing. The router keeps **one live 3D canvas across pages**, so
  navigating flies the camera to the next page's spot in the world instead of reloading it.
- **[three.js](https://threejs.org) r187** (`src/world/`), loaded only after the page is readable.
- **[GSAP](https://gsap.com) + [Lenis](https://lenis.darkroom.engineering)** on one shared clock for scroll, motion and the world.
- **Device tiers.** `ultra / high / medium / low / lite` are picked per device (GPU benchmark, Data Saver, memory),
  and a runtime governor steps quality down if frames run long. **Lite** shows pre-rendered posters instead of WebGL,
  with every word of content intact. Visitors can switch Lite on or off in the menu.
- Fonts, GPU benchmark data and everything else are self-hosted: no runtime CDN dependencies.

### Budget (checked by `npm run budget`)

| | Size |
| --- | --- |
| Initial HTML + CSS + JS (before any 3D) | ≤ 120 KB gzip (currently ~86 KB) |
| 3D world chunk (lazy) | ≤ 260 KB gzip (currently ~199 KB) |
| Knowledge-tree model | 1.37 MB desktop / 650 KB phones (source: 4.8 MB) |
| Lite-mode poster | ≤ 120 KB each (only the visible one loads) |

## Where things live

```
src/
  pages/              routes: home, events (+ one page per event), schedule, pronites, passes, sponsors, team, faq, 404
  layouts/Base.astro  <head>/SEO, HUD, loader, persistent world canvas, page-transition layer
  components/         Hud (top bar + pause menu), Loader, PageHero, EventCard, Countdown, Footer
  content/            ✏️ EDIT ME: events/*.md and pronites/passes/sponsors/team/faq .json (placeholders now)
  content.config.ts   schemas for the content files
  config/site.ts      ✏️ EDIT ME: fest dates, venue, socials, email, nav, avatars, categories
  lib/api/            backend seam: register / pass links, future API calls
  runtime/            client glue: clock, scroll → story position, page controllers, motion, transitions, tiers
  world/              the 3D world: ordinary realm, the Shift, crossing tunnel, post-processing, camera paths
  audio/              opt-in procedural soundscape (WebAudio, no files)
  styles/             tokens.css (design tokens), base, hud, ui, home, pages
public/               logos, optimised models, posters, OG image, _headers
assets/source/        source 3D model (not shipped)
design/handoff/       the original design as handed over (reference only, do not edit)
docs/                 DEVICE-TESTING.md
```

## Editing content (no code needed)

- **Events:** one Markdown file per event in `src/content/events/`. The file name is the URL
  (`battle-of-bands.md` → `/events/battle-of-bands/`). Copy a file, change the fields at the top, write the brief below.
  `category` is one of `boss`, `side`, `workshop`, `discovery`; `avatars` lists the classes it suits.
- **Pronites:** `src/content/pronites.json`. Leave `artist` as `null` to keep a boss hidden ("Boss locked").
- **Passes, sponsors, team, FAQ:** the other JSON files in `src/content/`. Sponsor logos and team photos go in
  `public/` and are referenced by path (e.g. `"/sponsors/acme.svg"`).
- **Dates, venue, socials, contact email:** `src/config/site.ts`. The countdown, schedule dates and the
  schema.org data all follow `SITE.dates`.

`npm run build` checks every content file against `src/content.config.ts` and says exactly which field is wrong.

## Connecting the backend

All register / pass / API links go through `src/lib/api/index.ts`. Configure with build-time environment variables:

| Variable | Effect |
|---|---|
| `PUBLIC_API_BASE_URL` | Base URL of the IGNUS backend. When set, Register / pass buttons point at backend routes (`/events/:slug/register`, `/passes/:id`). |
| `PUBLIC_REGISTER_URL` | Fallback external registration link (e.g. a form), used when there is no backend. |
| `PUBLIC_PASSES_URL` | Fallback external link for buying passes. |
| `SITE_URL` | **Required for production.** The public domain, used for canonical, social-share and sitemap URLs. |

An event's own `registerUrl` (in its Markdown file) always wins. With nothing configured, buttons read
"Registrations open soon" / "On sale soon". `api()` in the same file is a typed fetch helper for later live data.

## Deploying

The build output (`dist/`) is plain static files. Any static host works:

- **Cloudflare Pages / Netlify:** build command `npm run build`, output `dist`, set `SITE_URL`.
  `public/_headers` (cache + security headers) is picked up automatically.
- **Vercel:** same build settings; port the rules in `public/_headers` to `vercel.json`.
- **College server (nginx/Apache):** serve `dist/` and copy the cache rules from `public/_headers`.
  Put a CDN in front for fest-week traffic.

## QA helpers

- `?quality=ultra|high|medium|low|lite` forces a device tier (remembered for the tab). `?governor=off` stops
  automatic quality drops.
- `__ignus.stats()` in the console: tier, pixel ratio, draw calls and what the governor changed.
- See `docs/DEVICE-TESTING.md` for the pre-launch device checklist.

## Accessibility and readability

All content is real HTML. The 3D canvas is decoration (`aria-hidden`). Text sits on solid or scrimmed panels
(axe colour-contrast checks run in CI). `prefers-reduced-motion` turns off smooth scrolling, camera flights,
flashes and the tunnel. The pause menu (Esc to close) offers Lite mode and sound, which is off by default.

## Branches

Work happens on feature branches (currently `feat/fest-site-v1`); CI runs on every push. `main` only changes
through reviewed merges.
