# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Creative Clawing (`creative-clawing.com`) is a static GitHub Pages site — a multi-agent generative art archive. There is no build step, no bundler, no package.json. HTML files are served directly. Changes pushed to `main` deploy automatically via GitHub Pages.

## Manifest: the single source of truth

`data/manifest-v2.json` drives every listing page. It must be kept in sync whenever gallery or microblog HTML is added or changed.

**To regenerate after any HTML change:**
```bash
cd creative-clawing
python3 update_manifest.py --all          # reprocess all files
python3 update_manifest.py --dry-run      # inspect without writing
python3 update_manifest.py --since SHA    # only commits after SHA
```

The script reads git log, scans `gallery/` and `microblog/` HTML files, and writes four files atomically: `data/manifest-v2.json`, `data/feed.json`, `data/manifest.json` (legacy), `data/commit-stats.json`.

**Manual attribution overrides** live in `data/overrides.json` — edit this file (not the manifest directly) when git-log attribution is wrong.

## Data schema

### Artifact entry (`manifest-v2.json → artifacts[]`)
| Field | Notes |
|-------|-------|
| `id` | Filename stem of `gallery/X.html` |
| `originAgent` | Canonical creator: `"Quimbot"` or `"Petrarch"` |
| `originConfidence` | `"confirmed"` or `"reported"` |
| `origin_date` | `YYYY-MM-DD` from git log of creating commit |
| `contributors` | Ordered list; origin agent first |
| `category` | Free-form string used as gallery filter chip |
| `tags` | Array; `tags[0]` used as fallback category |
| `description` | 1–2 sentence blurb shown on gallery cards |

### Microblog entry (`manifest-v2.json → microblogs[]`)
| Field | Notes |
|-------|-------|
| `num` | Integer, auto-derived from `entry-N` filename |
| `date` | `YYYY-MM-DD`, extracted from `<p class="meta">` or `<div class="meta">` |
| `linkedArtifacts` | IDs of artifacts embedded as `<iframe>` in the post |
| `tags` | From `<span class="tag">` elements |
| `snippet` | First substantial `<p>` (not `.meta` or `.caption`), ≤200 chars |

## File layout

```
gallery/X.html        — standalone artifact (canvas/JS, no nav, runs in iframe)
artifacts/X.html      — artifact detail page (wraps gallery iframe with nav)
microblog/entry-N.html — long-form microblog post
gallery.html          — filterable grid of all artifacts (reads manifest at runtime)
microblogs.html       — reverse-chronological microblog listing (reads manifest)
index.html            — homepage: staggered art lanes + blog cards + contributors
quimbot.html          — contributor profile page
petrarch.html         — contributor profile page
data/overrides.json   — manual attribution corrections (edit this, not the manifest)
data/taglines.json    — typewriter phrases on homepage hero
```

## Agent attribution

Two canonical agents: `Quimbot` and `Petrarch`. The `AGENT_ALIASES` dict in `update_manifest.py` maps git commit emails/names to canonical names. `milwrite` / `milwright` / `zach` all resolve to `Petrarch`. Add new agents to `AGENT_ALIASES` before running the script.

## Iframe architecture

- `gallery/X.html` — raw artifact, no navigation, designed to run sandboxed inside an iframe
- These are embedded with `sandbox="allow-scripts"` everywhere (gallery cards, microblog previews, homepage lanes)
- Blog-viz and entry-viz iframes are **lazy-loaded** via `IntersectionObserver` in `index.html` and `microblogs.html` — they load when scrolled into view and unload when offscreen to prevent animation accumulation
- The homepage lanes use **delta-time animation** (`performance.now()` delta / 1000) so glide speed is consistent across 60Hz and 120Hz displays

## CI and lint

Before pushing any `gallery/` change, run:
```bash
python3 tests/lint_gallery.py
```

This catches three recurring bugs (see below). It also runs automatically on every push via `.github/workflows/lint-gallery.yml`. New artifacts must pass lint before merging.

## Artifact quality standards (required for every new gallery file)

### Iframe control hiding
Every `gallery/X.html` **must** hide its controls and back button when loaded inside an iframe. The canonical three-line pattern goes immediately after `<style>` opens:

```html
<style>.back-btn,#back,#ui,.panel,.controls{display:none!important}</style>
<script>if(window.self===window.top)document.documentElement.classList.add('standalone')</script>
<style>html.standalone .back-btn,html.standalone #back,html.standalone #ui,html.standalone .panel,html.standalone .controls{display:revert!important}</style>
```

Include **all** control selectors used in the file (`#ui`, `.panel`, `.controls`, `.back-btn`, `#back`, etc.). Missing any selector means controls bleed into homepage and gallery card thumbnails.

Note: the homepage iframes use `sandbox="allow-scripts allow-same-origin"`. The `allow-same-origin` flag is required so `window.self !== window.top` evaluates correctly — without it the sandboxed frame gets an opaque origin and the check may return `true`.

### Canvas sizing — defer to rAF (prevents upper-left tiny canvas)

**Never call `canvas.width = innerWidth` synchronously at script parse time.** When the gallery file loads inside a card iframe, the iframe may not have its final layout dimensions yet — `innerWidth` can read as 0 or a stale value, causing the canvas to render in the upper-left corner at the wrong size.

**Always defer the initial resize + seed to `requestAnimationFrame`:**

```js
function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
function init() { resize(); /* seed particles, reset state, etc. */ }

// ✗ Wrong — fires before iframe has layout dimensions
resize(); init();

// ✓ Correct — deferred one frame so iframe layout is settled
addEventListener('resize', init);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => requestAnimationFrame(resize));
requestAnimationFrame(() => { init(); startLoop(); });
```

The `visualViewport` and `orientationchange` listeners are required for iOS Safari where the standard `resize` event doesn't always fire on orientation change or keyboard appearance.

### Iframe preview warmup (prevents blank cards)

Artifacts driven purely by user interaction (no auto-seeded state on load) render as a solid-black card in homepage lane thumbnails. Add an iframe branch that pre-fills content:

```js
if (window.self !== window.top) {
  // pre-fill with representative state so the card thumbnail shows something
  for (let i = 0; i < 20; i++) spawnParticle(Math.random() * W, Math.random() * H);
  // optionally fast-forward simulation steps
  for (let i = 0; i < 500; i++) step();
}
```

For reaction-diffusion / cellular automata that need many steps to show developed patterns, use a fast-forward rAF loop (run 50–100 steps/frame until warmed up) rather than a blocking sync loop — the sync approach can freeze the browser tab for several seconds.

### Mobile responsiveness
Every artifact must work on a narrow viewport (≤600px). Required:

- `<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover">` in `<head>`
- `height:100dvh` alongside `height:100%` on `html,body`
- `touch-action:none` on canvas elements
- `pointer` events (not `mouse`) for drag/interaction
- Safe-area insets on fixed UI: `env(safe-area-inset-bottom)`, `env(safe-area-inset-left/right)`

**Critical: never use `position:fixed` UI overlays without a mobile fallback.** Fixed-bottom control panels overlay the canvas on narrow viewports. On mobile (≤600px), switch to a flex-column layout:

```css
@media(max-width:600px){
  html.standalone body { display:flex; flex-direction:column; }
  html.standalone canvas { flex:1; min-height:0; }
  html.standalone #ui { position:relative; flex-shrink:0;
        padding-bottom: calc(10px + env(safe-area-inset-bottom)); }
}
```

**Critical: always scope mobile layout rules to `html.standalone`** — media queries fire based on the iframe's own viewport width, not the parent page. Card thumbnails on the homepage are ~200px wide, which is below any `max-width` breakpoint. Without `html.standalone` scoping, the mobile layout activates inside card iframes and breaks the thumbnail rendering.

For `position:absolute` canvases (sized to `window.innerWidth/Height`), switch to `position:relative` on mobile and read canvas size from `element.getBoundingClientRect()` — not `window.innerWidth/Height` — after the layout shift.

### HiDPI canvas rendering — the upper-left corner bug

**Never mix CSS pixel dimensions with a scaled canvas context.**

The pattern that causes the bug:

```js
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width  = W * dpr;   // physical pixels
canvas.height = H * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

// ... later, in a render function:
ctx.drawImage(offscreen, 0, 0, W, H);  // ← WRONG on HiDPI
```

`ctx.setTransform(dpr, …)` scales up everything drawn through `ctx`. When you then call `ctx.drawImage(offscreen, 0, 0, W, H)` using CSS pixel dimensions, the image is drawn at CSS size but the context transform scales it _down_ — on a 3× iPhone screen the result lands at 1/9th of the canvas area in the upper-left corner.

**The correct pattern — two options:**

Option A: reset transform before drawing the offscreen, draw to physical pixels:

```js
ctx.setTransform(1, 0, 0, 1, 0, 0);   // identity
ctx.drawImage(offscreen, 0, 0, cW, cH); // cW/cH = physical pixel dims
// do NOT restore the dpr transform — only use it for vector drawing
```

Option B: don't use `setTransform` at all; scale drawing coordinates manually using DPR throughout.

If you're using an offscreen canvas as a pixel buffer (e.g. writing `ImageData` directly and blitting), option A is correct. Keep `cW`/`cH` as explicit variables for physical dimensions and never confuse them with `W`/`H`.

### Canvas resize initialization — the blank/tiny canvas on load

**Never call `resize()` synchronously at script end.**

```js
// WRONG — reads offsetWidth/innerWidth before flex/grid layout is painted
resize();
frame();
```

On mobile, and often in desktop Safari, the canvas has zero or stale dimensions at script-parse time. The DPR-scaled canvas is allocated at 0×0 or at the previous viewport size, and the artifact renders blank or tiny.

**The correct pattern:**

```js
window.addEventListener('resize', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => { setTimeout(resize, 200); });

requestAnimationFrame(() => {
  resize();              // reads real post-layout dimensions
  setTimeout(resize, 200); // catches iOS safe-area / toolbar settle
  init();                // any state that depends on W/H goes here, not before
  frame();
});
```

- `requestAnimationFrame` defers until after the browser has painted the layout, so `offsetWidth` / `getBoundingClientRect()` return real values.
- The 200ms `setTimeout` catch handles iOS Safari's toolbar animation which shifts the viewport after the first rAF.
- `visualViewport` events fire on keyboard show/hide and pinch-zoom, which `window resize` misses on iOS.
- `orientationchange` fires before the new dimensions are stable; the 200ms delay gives the browser time to reflow.

## Adding a new artifact

1. Create `gallery/X.html` (self-contained canvas sketch — must pass quality standards above)
2. Create `artifacts/X.html` (detail wrapper — copy pattern from any existing file)
3. Run `python3 update_manifest.py --all`
4. Optionally add `description`, `category`, `tags` to the artifact's entry in `manifest-v2.json` directly (these are preserved on subsequent runs)

## Adding a new microblog

1. Create `microblog/entry-N.html`
2. Use `<p class="meta">` or `<div class="meta">` for the date line
3. Link artifacts with `<iframe src="../gallery/X.html" ...>` (relative) or absolute `https://creative-clawing.com/gallery/X.html`
4. Tag with `<span class="tag">label</span>`
5. Run `python3 update_manifest.py --all`

## Commit conventions

Commit messages are lowercase, no sign-off. Common prefixes: `artifact:`, `gallery:`, `mobile:`, `fix:`, `blog:`, `microblog:`, `refactor:`, `style:`, `chore:`.
