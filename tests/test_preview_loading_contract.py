#!/usr/bin/env python3
"""Regression contracts for instant posters plus controlled iframe hydration."""

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def manifest_artifact_ids():
    manifest = json.loads(read("data/manifest-v2.json"))
    return sorted(
        artifact["id"]
        for artifact in manifest.get("artifacts", [])
        if artifact.get("id") != "index"
    )


def test_preview_helper_loads_iframes_immediately_and_reveals_after_resize_pulses():
    text = read("scripts/preview-cards.js")

    assert "iframe.loading = 'eager'" in text
    assert "iframe.loading = 'lazy'" not in text
    assert "const READY_PULSES = 2" in text
    assert "const READY_PULSE_MS = 70" in text
    assert "const PREVIEW_VERSION = '20260712-content-sync'" in text
    assert "function versionedPreviewSrc(src)" in text
    assert "iframe.src = versionedPreviewSrc(src)" in text
    assert "if ('fetchPriority' in iframe) iframe.fetchPriority = 'auto'" in text
    assert "iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin')" in text
    assert "iframe.setAttribute('aria-hidden', 'true')" in text
    assert "iframe.tabIndex = -1" in text
    assert "iframe.contentWindow.dispatchEvent(new Event('resize'))" in text
    assert "requestAnimationFrame(() => revealWhenReady(frame, iframe, 0))" in text
    assert "nextAttempt >= READY_PULSES" in text
    assert "frame.classList.add('is-ready')" in text
    assert "frame.classList.remove('is-loading')" in text


def test_preview_helper_draws_instant_deterministic_posters_before_iframes():
    text = read("scripts/preview-cards.js")

    assert "function drawPoster(frame)" in text
    assert "function paintAll(root, selector)" in text
    assert "function hashId(value)" in text
    assert "function seededRandom(seed)" in text
    assert "function paintPosterCanvas(canvas, id)" in text
    assert "canvas.className = 'cc-preview-poster'" in text
    assert "canvas.setAttribute('aria-hidden', 'true')" in text
    assert "frame.insertBefore(canvas, frame.firstChild)" in text
    assert "getContext('2d', { alpha: true })" in text
    assert "Math.min(window.devicePixelRatio || 1, 2)" in text
    assert "drawPoster(frame);" in text
    assert "paintAll(scope, config.selector);" in text
    assert "drawPoster" in text.split("function mountFrame(frame)", 1)[1].split("function unmountFrame", 1)[0]


def test_preview_helper_lifecycle_is_idempotent_and_cleans_stale_iframes():
    text = read("scripts/preview-cards.js")

    assert "if (!frame || frame.querySelector('.cc-preview-iframe')) return null" in text
    assert "const readyTimers = new WeakMap()" in text
    assert "function clearReadyTimers(frame)" in text
    assert "clearReadyTimers(frame)" in text
    assert "if (!frame.isConnected || !iframe.isConnected) return" in text
    assert "if (!frame.isConnected || frame.querySelector('.cc-preview-iframe')) continue" in text
    assert "frame.classList.add('is-loading')" in text
    assert "iframe.src = 'about:blank'" in text
    assert "frame.classList.remove('is-loading', 'is-loaded', 'is-ready')" in text
    assert "const frames = Array.from(scope.querySelectorAll" in text
    assert "frames.forEach(mountFrame)" in text
    assert "return frames.length" in text
    assert "batchSize: 6" in text
    assert "idleTimeout: 80" in text
    assert "onMount: null" in text
    assert "IntersectionObserver" not in text
    assert "rootMargin" not in text
    assert "eject" not in text


def test_pages_paint_posters_and_hydrate_live_frames_without_image_fallbacks():
    pages = {
        "index.html": read("index.html"),
        "gallery.html": read("gallery.html"),
        "microblogs.html": read("microblogs.html"),
    }
    combined = "\n".join(pages.values())

    for page_name, text in pages.items():
        assert "scripts/preview-cards.js?v=20260712-content-sync" in text, page_name
        assert "cc-preview-frame" in text, page_name
        assert "data-preview-id" in text, page_name
        assert "<img" not in text, page_name

    for forbidden in ("cc-preview-img", "imageHTML", "ensureImage", "previewSrc", "assets/previews"):
        assert forbidden not in combined

    assert "CCPreviews.createHydrator" in pages["index.html"]
    assert "selector: '.artifact-frame[data-src]'" in pages["index.html"]
    assert "batchSize: 6" in pages["index.html"]
    assert "idleTimeout: 60" in pages["index.html"]
    assert "hydratePreviews();" in pages["index.html"]

    assert "CCPreviews.createHydrator" in pages["gallery.html"]
    assert "selector: '.card-preview[data-src]'" in pages["gallery.html"]
    assert "batchSize: 6" in pages["gallery.html"]
    assert "idleTimeout: 60" in pages["gallery.html"]
    assert "attachObserver()" in pages["gallery.html"]

    assert "CCPreviews.createHydrator" in pages["microblogs.html"]
    assert "selector: '.entry-viz[data-iframe-src]'" in pages["microblogs.html"]
    assert "batchSize: 4" in pages["microblogs.html"]
    assert "onMount(frame)" in pages["microblogs.html"]
    assert "entry-viz-overlay" in pages["microblogs.html"]
    assert "new IntersectionObserver" not in pages["microblogs.html"]
    assert "CCPreviews.unmountFrame(e.target)" not in pages["microblogs.html"]
    assert "previewsCanHydrate" not in pages["index.html"] + pages["gallery.html"]
    assert "window.addEventListener('load', hydratePreviews" not in pages["index.html"] + pages["gallery.html"]


def test_artifact_iframes_do_not_use_browser_lazy_loading():
    offenders = []
    for path in ROOT.rglob("*.html"):
        if "node_modules" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        if re.search(r"<iframe[^>]*\sloading=(['\"])lazy\1", text):
            offenders.append(str(path.relative_to(ROOT)))

    assert not offenders, "lazy iframe loading remains in: " + ", ".join(offenders)


def test_static_artifact_iframes_use_loading_fix_cache_key():
    offenders = []
    checked_roots = ["artifacts", "microblog"]
    checked_files = [ROOT / "kmoonshot.html", ROOT / "petrarch.html", ROOT / "quimbot.html"]
    for root_name in checked_roots:
        checked_files.extend((ROOT / root_name).glob("*.html"))

    for path in checked_files:
        text = path.read_text(encoding="utf-8")
        if re.search(r"<iframe[^>]*\bsrc=(['\"])(?:\.\./)?gallery/[^'\"?#]+\.html\1", text):
            offenders.append(str(path.relative_to(ROOT)))

    assert not offenders, "unversioned artifact iframe sources remain in: " + ", ".join(offenders)


def test_preview_css_keeps_reveal_transition_short():
    combined = read("styles/shared.css") + read("index.html")

    assert ".cc-preview-poster" in combined
    assert ".cc-preview-frame.is-ready .cc-preview-poster" in combined
    assert "z-index: 2" in combined
    assert "transition: opacity .12s ease" in combined
    assert "transition: opacity .24s ease" not in combined
    assert "transition: opacity .35s ease" not in combined


def test_service_worker_caches_versioned_gallery_responses_for_reuse_and_fallback():
    text = read("sw.js")

    assert "const CACHE = 'cc-v14'" in text
    assert "'/scripts/preview-cards.js'" in text
    assert "assets/previews" not in text
    assert ".jpg" not in text
    assert "previewSrc" not in text
    assert "cc-preview-img" not in text
    assert "NEVER_CACHE" in text
    assert "url.pathname.startsWith('/gallery/')" in text
    assert "async function fetchAndRemember(request)" in text
    assert "cache.put(request, response.clone())" in text
    assert "const cached = await cache.match(request)" in text
    assert "e.respondWith(fetchAndRemember(e.request))" in text
    assert "fetch(e.request, { cache: 'reload' })" in text
    assert "/data/manifest-v2.json" in text


def test_manifest_artifacts_have_live_gallery_sources():
    missing = []

    for artifact_id in manifest_artifact_ids():
        path = ROOT / "gallery" / f"{artifact_id}.html"
        if not path.is_file():
            missing.append(artifact_id)

    assert not missing, "missing gallery sources: " + ", ".join(missing)


ARTIFACT_WARMUP_CONTRACTS = {
    "astar": (
        "const inIframe = window.self !== window.top",
        "rows<3||cols<3||!grid[1]",
        "setTimeout(autoDemo, 600)",
    ),
    "burningship": (
        "function previewView()",
        "if (window.self !== window.top) previewView()",
        "setTimeout(()=>{if(window.self!==window.top)previewView();resize();},200)",
    ),
    "crystal": (
        "function previewSeed()",
        "if (window.self !== window.top) previewSeed()",
        "requestAnimationFrame(()=>{resize();updateImage();drawDisplay();",
    ),
    "grayscott": (
        "if (window.self !== window.top)",
        "for (let i = 0; i < 180; i++) step();",
        "requestAnimationFrame(frame)",
    ),
    "heat": (
        "function seedPreviewSources()",
        "if (window.self !== window.top) seedPreviewSources()",
        "seedInitialSources()",
        "bctx.createImageData(cols, rows)",
        "ctx.drawImage(buffer, 0, 0, cols, rows, 0, 0, W, H)",
    ),
    "mandelbrot": (
        "DPR = window.self !== window.top ? 1",
        "const batchRows = window.self !== window.top ?",
        "window.__creativeClawingPreview",
    ),
    "matrix": (
        "window.self !== window.top ? Math.random() * (height / fontSize) : 1",
        "for (let i = 0; i < 18; i++) draw();",
        "setInterval(draw,33)",
    ),
    "nbody": (
        "const inIframe = window.self !== window.top",
        "function warmPreview()",
        "loadPreset(inIframe ? 3 : 0)",
    ),
    "sprott": (
        "function warmPreviewTrail(count)",
        "function handleViewportResize()",
        "const drawStep = window.self !== window.top && len > 8000 ? 3 : 1",
    ),
}


def test_loading_sensitive_artifacts_keep_iframe_warmup_paths():
    for artifact_id, required_tokens in ARTIFACT_WARMUP_CONTRACTS.items():
        text = read(f"gallery/{artifact_id}.html")
        for token in required_tokens:
            assert token in text, f"{artifact_id} missing {token!r}"


def test_resize_sensitive_artifacts_defer_first_canvas_sizing():
    for artifact_id in ("crystal", "heat", "nbody"):
        text = read(f"gallery/{artifact_id}.html")
        assert "requestAnimationFrame" in text, artifact_id
        assert "visualViewport" in text, artifact_id
        assert "orientationchange" in text, artifact_id
        assert "ctx.createImageData(W, H)" not in text, artifact_id
        assert not re.search(
            r"(?:window\.)?addEventListener\('resize',\s*resize\);\s*resize\(\);",
            text,
        ), artifact_id
        assert not re.search(
            r"resize\(\);\s*(?:window\.)?addEventListener\('resize',\s*resize\);",
            text,
        ), artifact_id
