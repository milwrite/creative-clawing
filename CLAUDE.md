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

## Adding a new artifact

1. Create `gallery/X.html` (self-contained canvas sketch)
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
