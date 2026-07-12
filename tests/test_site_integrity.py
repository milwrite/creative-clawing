#!/usr/bin/env python3
"""Cross-page integrity checks for the published static site."""

import json
import re
from pathlib import Path
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parent.parent


def read(path):
    return path.read_text(encoding="utf-8", errors="replace")


def manifest():
    return json.loads(read(ROOT / "data" / "manifest-v2.json"))


def test_manifest_covers_every_work_and_blog_file():
    data = manifest()
    manifest_artifacts = {entry["id"] for entry in data["artifacts"]}
    gallery_artifacts = {
        path.stem for path in (ROOT / "gallery").glob("*.html")
        if path.stem != "index"
    }
    manifest_blogs = {entry["id"] for entry in data["microblogs"]}
    blog_files = {path.stem for path in (ROOT / "microblog").glob("entry-*.html")}

    assert manifest_artifacts == gallery_artifacts
    assert manifest_blogs == blog_files
    assert data["summary"]["totalArtifacts"] == len(gallery_artifacts)
    assert data["summary"]["totalMicroblogs"] == len(blog_files)


def test_every_artifact_has_metadata_wrapper_and_thumbnail():
    missing = []
    for artifact in manifest()["artifacts"]:
        artifact_id = artifact["id"]
        for field in ("originAgent", "originConfidence", "origin_date", "contributors",
                      "description", "category", "tags"):
            if not artifact.get(field):
                missing.append(f"{artifact_id}.{field}")
        if not (ROOT / "artifacts" / f"{artifact_id}.html").is_file():
            missing.append(f"{artifact_id}.wrapper")
        if not (ROOT / "thumbnails" / f"{artifact_id}.webp").is_file():
            missing.append(f"{artifact_id}.thumbnail")

    assert not missing, "Incomplete artifact records: " + ", ".join(missing)


def test_every_blog_artifact_reference_exists():
    data = manifest()
    artifact_ids = {entry["id"] for entry in data["artifacts"]}
    missing = {
        blog["id"]: sorted(set(blog.get("linkedArtifacts", [])) - artifact_ids)
        for blog in data["microblogs"]
        if set(blog.get("linkedArtifacts", [])) - artifact_ids
    }
    assert not missing


def test_static_internal_links_resolve():
    broken = []
    attr_pattern = re.compile(r"\b(?:href|src)=(['\"])(.*?)\1", re.IGNORECASE)
    for path in ROOT.rglob("*.html"):
        if any(part in {".git", "node_modules", "output"} for part in path.parts):
            continue
        for _, raw_value in attr_pattern.findall(read(path)):
            if (
                not raw_value
                or raw_value.startswith(("#", "//", "http://", "https://", "mailto:", "data:", "javascript:"))
                or "${" in raw_value
            ):
                continue
            value = unquote(raw_value.split("#", 1)[0].split("?", 1)[0])
            if not value:
                continue
            target = ROOT / value.lstrip("/") if value.startswith("/") else path.parent / value
            target = target.resolve()
            if target.is_dir():
                target = target / "index.html"
            if not target.exists():
                broken.append(f"{path.relative_to(ROOT)} -> {raw_value}")

    assert not broken, "Broken internal links:\n" + "\n".join(broken)


def test_module_artifacts_keep_same_origin_inside_sandboxed_iframes():
    module_ids = {
        path.stem
        for path in (ROOT / "gallery").glob("*.html")
        if re.search(r"<script[^>]+type=(['\"])module\1", read(path), re.IGNORECASE)
    }
    offenders = []
    iframe_pattern = re.compile(r"<iframe\b[^>]*>", re.IGNORECASE)
    src_pattern = re.compile(r"\bsrc=(['\"])(.*?)\1", re.IGNORECASE)
    sandbox_pattern = re.compile(r"\bsandbox=(['\"])(.*?)\1", re.IGNORECASE)

    for path in ROOT.rglob("*.html"):
        for iframe in iframe_pattern.findall(read(path)):
            source_match = src_pattern.search(iframe)
            if not source_match:
                continue
            source = source_match.group(2).split("?", 1)[0]
            artifact_id = Path(source).stem
            if artifact_id not in module_ids:
                continue
            sandbox_match = sandbox_pattern.search(iframe)
            if sandbox_match and "allow-same-origin" not in sandbox_match.group(2).split():
                offenders.append(f"{path.relative_to(ROOT)} -> {artifact_id}")

    assert not offenders, "Module iframe sandbox blocks imports: " + ", ".join(offenders)


def test_contributor_profiles_use_canonical_stats_and_static_thumbnails():
    profile_expectations = {
        "petrarch.html": "stats.Petrarch || stats.petrarch",
        "quimbot.html": "stats.Quimbot || stats.quimbot",
    }
    for filename, stats_lookup in profile_expectations.items():
        text = read(ROOT / filename)
        assert stats_lookup in text
        assert "thumbnails/${a.id}.webp" in text
        assert "<iframe src=\"gallery/${a.id}" not in text
        assert '<details class="menu-group" open>' not in text

    moonshot = read(ROOT / "kmoonshot.html")
    assert "thumbnails/${a.id}.webp" in moonshot
    assert "<iframe src=\"gallery/${a.id}" not in moonshot
    assert '<details class="menu-group" open>' not in moonshot


def test_homepage_contributor_counts_use_singular_labels():
    text = read(ROOT / "index.html")
    assert "artifact${c.artifacts === 1 ? '' : 's'}" in text
    assert "microblog${c.microblogs === 1 ? '' : 's'}" in text
    assert "linked sketch${c.linkedArtifacts.size === 1 ? '' : 'es'}" in text
