# Device testing checklist

The CI smoke test covers every page in Lite mode. Real frame rates can only be judged on
real hardware, so run this on the devices below before launch, and again after any change
to `src/world/`.

## Devices (minimum set)

| Device class | Example | Expected tier |
| --- | --- | --- |
| Cheap Android (2–4 GB RAM, Mali/Adreno 5xx–6xx) | Redmi 9/10, Realme C-series | `low` or `lite` |
| Mid-range Android | Galaxy A5x, Redmi Note 12/13 | `medium` |
| iPhone (3+ years old) | iPhone 11/12 | `high` |
| Laptop, integrated GPU | Intel Iris Xe, Ryzen 5 iGPU | `high` |
| Desktop / gaming laptop GPU | RTX / Radeon dGPU, Apple M-series | `ultra` |

## For each device

1. Open the site. Note the time until the loader circle finishes.
2. Open the console (or remote-debug a phone) and run `__ignus.stats()`. Record `tier` and `degraded`.
   `degraded` lists what the governor had to switch off; an empty list means the tier fits.
3. Scroll the whole home page slowly, then quickly. Check:
   - the crossing (wormhole) plays without stutter
   - the realm flip, avatar crests, choosing an avatar (paint wave)
   - no text is hard to read over the 3D scene
4. Open Events → filter → an event → back. The rift wipe and camera flight should feel smooth.
5. Menu → Lite mode on: the page should switch to posters instantly. Turn it off again.
6. Rotate the phone and resize the browser: nothing should overflow sideways.

## Forcing a tier

Add `?quality=ultra|high|medium|low|lite` to any URL (remembered for the browser tab). Use it to
compare tiers on one device, or to check what weaker phones will see.

`?governor=off` keeps quality fixed even when frames are slow (useful when recording video).

## What to report

Device, browser, tier, `degraded` list, and any step that stuttered or looked wrong. If a device
class keeps degrading several steps, its tier mapping in `src/runtime/quality.js` should be lowered.
