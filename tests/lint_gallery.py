#!/usr/bin/env python3
"""
gallery lint — catches two classes of iframe preview bugs:

  1. UPPER-LEFT CORNER / TINY CANVAS
     canvas.width = innerWidth set synchronously at script parse time, before
     the iframe has its final layout dimensions. Fix: defer to requestAnimationFrame.

  2. BLANK PREVIEW
     Artifacts whose only content comes from user interaction (no auto-seed on load).
     These show a solid-black card in the homepage lane until the user clicks.
     Fix: detect `window.self !== window.top` and pre-fill / fast-forward state.

  3. MISSING IFRAME DETECTION
     gallery/X.html must hide its controls when running inside an iframe.
     The canonical pattern: `window.self !== window.top` or body classList 'in-iframe'.

Run:  python3 tests/lint_gallery.py
Exit: 0 = clean, 1 = issues found
"""

import pathlib, sys, re

GALLERY = pathlib.Path(__file__).parent.parent / "gallery"
SKIP = {"index.html"}

issues = []

def warn(fname, code, msg):
    issues.append(f"  [{code}] {fname}: {msg}")

for p in sorted(GALLERY.glob("*.html")):
    if p.name in SKIP:
        continue
    txt = p.read_text(encoding="utf-8", errors="replace")
    name = p.name

    # ── 1. UPPER-LEFT / TINY CANVAS ─────────────────────────────────────
    # Flag: canvas.width = innerWidth (or W=c.width=innerWidth etc.) at top-level
    # (i.e. not inside a function definition that is only called from rAF)
    uses_inner_wh = bool(
        re.search(r'(canvas|c)\.width\s*=\s*innerWidth', txt) or
        re.search(r'\bW\s*=\s*\S*\.width\s*=\s*innerWidth', txt)
    )
    has_raf_defer = bool(
        re.search(r'requestAnimationFrame\s*\(\s*\(\s*\)\s*=>', txt) or
        re.search(r'requestAnimationFrame\s*\(function', txt) or
        'ResizeObserver' in txt
    )
    if uses_inner_wh and not has_raf_defer:
        warn(name, "TINY_CANVAS",
             "canvas sized with innerWidth/H synchronously — wrap initial resize() call in requestAnimationFrame(()=>{…})")

    # ── 2. BLANK PREVIEW (user-input-only content) ───────────────────────
    # Heuristic: uses innerWidth (full-viewport canvas), has no auto-seed/fill,
    # and does NOT already detect the iframe context to do a warmup fill.
    is_interactive_only = bool(
        re.search(r'(pointerdown|mousedown|click|touchstart)', txt) and
        not re.search(r'(initSim|initCells|seed\s*\(|spawnParticle|autofill|previewFill|Math\.random\(\))', txt)
    )
    # If it already has an iframe branch for warmup content, that's fine
    has_iframe_warmup = bool(
        re.search(r'window\.self\s*!==?\s*window\.top', txt) and
        re.search(r'(fill|seed|init|spawn|warmup)', txt, re.IGNORECASE)
    )
    if is_interactive_only and not has_iframe_warmup:
        warn(name, "BLANK_PREVIEW",
             "artifact may render blank in iframe card (user-driven only) — add iframe warmup fill")

    # ── 3. MISSING IFRAME DETECTION ──────────────────────────────────────
    has_iframe_detect = bool(
        re.search(r'window\.self\s*!==?\s*window\.top', txt) or
        'in-iframe' in txt
    )
    if not has_iframe_detect:
        warn(name, "NO_IFRAME_DETECT",
             "missing iframe detection — controls may bleed into card thumbnails")

# ── report ────────────────────────────────────────────────────────────────
if issues:
    print(f"gallery lint: {len(issues)} issue(s) found\n")
    for line in issues:
        print(line)
    sys.exit(1)
else:
    total = sum(1 for p in GALLERY.glob("*.html") if p.name not in SKIP)
    print(f"gallery lint: {total} files clean ✓")
    sys.exit(0)
