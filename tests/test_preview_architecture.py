#!/usr/bin/env python3
"""Preview architecture checks for fast card rendering."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PREVIEW_DIR = ROOT / "assets" / "previews"


def artifact_ids():
    manifest = json.loads((ROOT / "data" / "manifest-v2.json").read_text(encoding="utf-8"))
    return sorted(
        artifact["id"]
        for artifact in manifest.get("artifacts", [])
        if artifact.get("id") != "index"
    )


def test_preview_assets_exist_for_every_gallery_artifact():
    missing = [
        artifact_id
        for artifact_id in artifact_ids()
        if not (PREVIEW_DIR / f"{artifact_id}.jpg").is_file()
    ]

    assert not missing, "missing preview assets: " + ", ".join(missing)


def test_card_pages_render_static_previews_before_iframe_hydration():
    for page_name in ("index.html", "gallery.html", "microblogs.html"):
        text = (ROOT / page_name).read_text(encoding="utf-8")

        assert "scripts/preview-cards.js" in text
        assert "CCPreviews.imageHTML" in text
        assert "data-preview-id" in text


def test_shared_preview_hydrator_limits_live_iframes():
    text = (ROOT / "scripts" / "preview-cards.js").read_text(encoding="utf-8")

    assert "createHydrator" in text
    assert "maxLive" in text
    assert "requestIdleCallback" in text
