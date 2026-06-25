#!/usr/bin/env python3
"""Preview architecture checks for instant card posters and live hydration."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def artifact_ids():
    manifest = json.loads((ROOT / "data" / "manifest-v2.json").read_text(encoding="utf-8"))
    return sorted(
        artifact["id"]
        for artifact in manifest.get("artifacts", [])
        if artifact.get("id") != "index"
    )


def page_texts():
    return {
        page_name: (ROOT / page_name).read_text(encoding="utf-8")
        for page_name in ("index.html", "gallery.html", "microblogs.html")
    }


def test_no_card_image_preview_assets_or_helpers():
    assert not (ROOT / "assets" / "previews").exists()
    assert not (ROOT / "tools" / "generate_previews.py").exists()
    assert not (ROOT / "tools" / "preview_harness.html").exists()

    combined = "\n".join(page_texts().values()) + (ROOT / "scripts" / "preview-cards.js").read_text(encoding="utf-8")
    forbidden = [
        "cc-preview-img",
        "imageHTML",
        "ensureImage",
        "previewSrc",
        "assets/previews",
        ".jpg",
    ]
    for token in forbidden:
        assert token not in combined


def test_card_pages_mount_instant_posters_and_live_iframe_previews():
    pages = page_texts()
    for page_name, text in pages.items():
        assert "scripts/preview-cards.js?v=20260625-instant-posters" in text
        assert "cc-preview-frame" in text
        assert "data-preview-id" in text
        assert "<img" not in text

    assert "CCPreviews.createHydrator" in pages["index.html"]
    assert "CCPreviews.createHydrator" in pages["gallery.html"]
    assert "CCPreviews.paintAll" in pages["microblogs.html"]
    assert "CCPreviews.mountFrame" in pages["microblogs.html"]


def test_live_preview_helper_builds_sandboxed_iframes():
    text = (ROOT / "scripts" / "preview-cards.js").read_text(encoding="utf-8")

    assert "cc-preview-iframe" in text
    assert "cc-preview-poster" in text
    assert "iframe.loading = 'eager'" in text
    assert "sandbox', 'allow-scripts allow-same-origin'" in text
    assert "mountFrame" in text
    assert "mountAll" in text
    assert "createHydrator" in text


def test_every_manifest_artifact_has_gallery_html_source():
    missing = [
        artifact_id
        for artifact_id in artifact_ids()
        if not (ROOT / "gallery" / f"{artifact_id}.html").is_file()
    ]

    assert not missing, "missing gallery sources: " + ", ".join(missing)
