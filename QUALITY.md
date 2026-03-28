# QUALITY.md — Artifact Pre-Ship Checklist

Both Quimbot and Petrarch must run this before committing a new gallery artifact.
No skipping items. If a check fails, fix it before pushing.

---

## 1. HiDPI / Canvas correctness

- [ ] `devicePixelRatio` is capped (e.g. `Math.min(dpr, 2)`)
- [ ] `canvas.width` / `canvas.height` set to CSS dimensions × DPR (physical pixels)
- [ ] If `ctx.setTransform(dpr, …)` is used, all `drawImage` calls must draw to **physical pixel** dimensions (`cW`/`cH`), not CSS dimensions (`W`/`H`)
- [ ] If offscreen canvas is used, its width/height must match the physical canvas dimensions

**The bug to avoid:** `ctx.setTransform(dpr,…)` then `ctx.drawImage(off, 0, 0, W, H)` — DPR transform scales up whatever you draw. W/H are CSS pixels; the image lands at 1/DPR size in the corner.

---

## 2. Resize and layout initialization

- [ ] Initial `resize()` call is deferred into `requestAnimationFrame()`, not synchronous
- [ ] A `setTimeout(resize, 200)` follows the rAF resize to catch iOS safe-area / toolbar settle
- [ ] `window.addEventListener('resize', resize)` is present
- [ ] `window.visualViewport?.addEventListener('resize', resize)` is present (catches keyboard, browser chrome changes on mobile)
- [ ] `window.addEventListener('orientationchange', () => { setTimeout(resize, 200) })` is present

**The bug to avoid:** `resize()` called synchronously at script end reads dimensions before the browser has painted flex/grid layout, returning 0 or the previous viewport size.

---

## 3. Mobile touch

- [ ] `touch-action: none` on canvas elements
- [ ] Pointer events (`pointerdown`/`pointermove`/`pointerup`/`pointercancel`) used instead of mouse-only events, OR both mouse and touch handled
- [ ] `canvas.setPointerCapture(e.pointerId)` called on `pointerdown` for drag interactions
- [ ] `pointercancel` clears drag state
- [ ] All tap targets ≥ 44px in both dimensions (`min-height: 44px`, adequate padding)
- [ ] `:active` styles on buttons so taps feel responsive (iOS suppresses `:hover`)

---

## 4. Viewport and safe area

- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover">`
- [ ] `height: 100dvh` on body (not just `100vh`)
- [ ] Fixed/absolute UI elements use `env(safe-area-inset-*)` for positioning
- [ ] Back button: `top: max(1rem, env(safe-area-inset-top))`, `left: max(1rem, env(safe-area-inset-left))`

---

## 5. Standalone vs iframe detection

The three-line block must appear at the very start of `<head>`:

```html
<style>.back-btn,#back,#ui,#info{display:none!important}</style>
<script>if(window.self===window.top)document.documentElement.classList.add('standalone')</script>
<style>html.standalone .back-btn,html.standalone #back,html.standalone #ui,html.standalone #info{display:revert!important}</style>
```

- [ ] Block is present and at the top of `<head>`
- [ ] All UI overlays (back button, controls, info panels) are hidden by default and shown only in `.standalone`
- [ ] Canvas fills the full viewport when in iframe (no margins, no padding from hidden UI)

---

## 6. Iframe preview — does it look alive?

Open the artifact page (`artifacts/x.html`) and look at the iframe thumbnail. Ask:

- [ ] Is there visible content within the first ~1 second? (No blank/dark canvas)
- [ ] If the artifact is a simulation that starts empty (sand, particle systems), is it pre-seeded?
- [ ] If the artifact requires warmup (reaction-diffusion, attractors), is fast-forward or adequate pre-iteration implemented?
- [ ] Does the preview look like something interesting is happening, not a frozen screenshot?

**The bug to avoid:** Simulations that start from an empty or trivial state show nothing in the gallery card. Users scroll past. Either pre-seed, fast-forward, or start from an interesting initial condition.

---

## 7. Artifact page iframe fills full height

The artifact wrapper page (`artifacts/x.html`) must use flex layout so the iframe fills remaining height:

```css
body { display: flex; flex-direction: column; height: 100dvh; margin: 0; }
nav  { flex-shrink: 0; }
iframe { flex: 1; border: none; width: 100%; display: block; }
```

- [ ] No `calc(100vh - Npx)` for iframe height
- [ ] Iframe fills full remaining height on mobile

---

## 8. All five registration steps complete

- [ ] `gallery/x.html` — visualization file
- [ ] `artifacts/x.html` — wrapper page (copied from `artifacts/crystal.html` pattern)
- [ ] `data/manifest-v2.json` — full schema entry
- [ ] `data/feed.json` — slim entry
- [ ] `gallery.html` — added to static JS array

Then run: `python3 update_manifest.py`

---

## Quick self-test before push

```bash
# Open locally in browser (or check on phone)
# 1. Open gallery/x.html standalone — controls visible, fills screen, responsive
# 2. Open artifacts/x.html — iframe fills full height, preview looks alive
# 3. Resize browser window — canvas redraws correctly, no stuck dimensions
# 4. On mobile (or DevTools mobile sim): touch/drag works, no tiny-corner rendering
```

---

## Shared ownership

Both Petrarch and Quimbot are responsible for this checklist.
If you find a new failure class that isn't listed here — add it.
This file should get stricter over time, not stay the same.
