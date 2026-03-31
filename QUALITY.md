# Quality Standards — Gallery Artifacts

Pre-ship checklist for every `gallery/*.html` file. Enforced by `tests/lint_gallery.py` and the `lint-gallery.yml` CI workflow.

## Errors (must pass)

| Check | Rule |
|-------|------|
| `iframe-hide-pattern` | CSS-first `display:none!important` on all control selectors |
| `standalone-class` | `classList.add('standalone')` via `window.self===window.top` |
| `standalone-revert` | `html.standalone` revert rules re-show controls in standalone mode |
| `lang-attr` | `<html lang="en">` |
| `title-element` | Non-empty `<title>` in `<head>` |
| `charset` | `<meta charset="utf-8">` |
| `viewport-meta` | `width=device-width, initial-scale=1, viewport-fit=cover` |
| `dvh-height` | `100dvh` on html/body for iOS address bar |
| `overflow-hidden` | `overflow:hidden` on body |
| `back-link` | Back-to-gallery link present (`.back-btn` or similar) |
| `no-external-deps` | No CDN scripts or stylesheets |

## Warnings (should fix)

| Check | Rule |
|-------|------|
| `touch-action-none` | `touch-action:none` on canvas (prevents pull-to-refresh) |
| `safe-area-insets` | `env(safe-area-inset-*)` on fixed UI for notched devices |
| `user-scalable-no` | `user-scalable=no` in viewport for interactive canvas |
| `back-link-href` | Back link uses `./` (relative to gallery/) |
| `resize-handler` | Window resize handler for canvas sizing |
| `raf-not-setinterval` | Animation loops use `requestAnimationFrame`, not fast `setInterval` |
| `legacy-iframe-scripts` | No redundant JS iframe detection (CSS-first pattern handles it) |
| `mobile-standalone-scope` | Mobile media queries scoped to `html.standalone` |
| `doctype` | `<!DOCTYPE html>` declaration present |

## Info (suggestions)

| Check | Rule |
|-------|------|
| `hidpi-support` | `devicePixelRatio` handling for crisp HiDPI rendering |
| `reduced-motion` | `prefers-reduced-motion` respect for accessibility |
| `pointer-events` | Pointer events instead of mouse-only (works for touch too) |

## Canonical iframe control-hiding pattern

```html
<style>.back-btn,#back,#info,#ui,.panel,.controls{display:none!important}</style>
<script>if(window.self===window.top)document.documentElement.classList.add('standalone')</script>
<style>html.standalone .back-btn,html.standalone #back,html.standalone #info,html.standalone #ui,html.standalone .panel,html.standalone .controls{display:revert!important}</style>
```

Include **all** control selectors used in the file. Do **not** add separate JS iframe-detection scripts — the CSS handles it.

## Running the linter

```bash
python3 tests/lint_gallery.py                    # all files
python3 tests/lint_gallery.py gallery/X.html     # single file
python3 tests/lint_gallery.py --summary          # one-line-per-file
python3 tests/lint_gallery.py --json             # machine-readable
```

Exit code 0 = pass (errors only; warnings are non-blocking).
