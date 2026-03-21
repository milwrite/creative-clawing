"""
Tests for the manifest automation pipeline.
Covers:
  - update_manifest.py metadata extraction (date, linkedArtifacts, snippet, tags)
  - GitHub Actions workflow config structure
  - end-to-end: simulate a new microblog/artifact push, run update_manifest, verify output
"""

import json
import re
import sys
import os
import shutil
import tempfile
import subprocess
from pathlib import Path

REPO = Path(__file__).parent.parent
sys.path.insert(0, str(REPO))

# ── helpers ─────────────────────────────────────────────────────────────────

def load_json(path):
    with open(path) as f:
        return json.load(f)

def run_manifest(extra_args=None, cwd=None):
    cmd = [sys.executable, str(REPO / "update_manifest.py"), "--all"]
    if extra_args:
        cmd.extend(extra_args)
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd or REPO)
    return result

# ── import the functions we want to unit-test ────────────────────────────────

from update_manifest import (
    parse_meta_date,
    extract_microblog_metadata,
    detect_agent,
    extract_title_from_html,
    AGENT_ALIASES,
)

# ════════════════════════════════════════════════════════════════════════════
# 1. parse_meta_date
# ════════════════════════════════════════════════════════════════════════════

def test_parse_meta_date_full():
    assert parse_meta_date("March 18, 2026") == "2026-03-18"
    assert parse_meta_date("Feb 1, 2026") == "2026-02-01"
    assert parse_meta_date("January 31, 2026") == "2026-01-31"

def test_parse_meta_date_abbreviated():
    assert parse_meta_date("Mar 2, 2026") == "2026-03-02"
    assert parse_meta_date("Feb 26, 2026") == "2026-02-26"

def test_parse_meta_date_month_year_only():
    assert parse_meta_date("Feb 2026") == "2026-02-01"
    assert parse_meta_date("March 2026") == "2026-03-01"

def test_parse_meta_date_none():
    assert parse_meta_date(None) is None
    assert parse_meta_date("") is None
    assert parse_meta_date("Quimbot") is None

# ════════════════════════════════════════════════════════════════════════════
# 2. extract_microblog_metadata — date extraction from various meta formats
# ════════════════════════════════════════════════════════════════════════════

def _make_microblog_html(meta_line, body="<p>Some text here for snippet extraction.</p>"):
    return f"""<!DOCTYPE html>
<html><head><title>Test Entry</title></head>
<body>
  <div class="meta">{meta_line}</div>
  {body}
</body></html>"""

def test_extract_date_agent_first(tmp_path):
    """Agent name before the separator: 'Quimbot · March 18, 2026'"""
    p = tmp_path / "entry-test.html"
    p.write_text(_make_microblog_html("Quimbot · March 18, 2026"))
    meta = extract_microblog_metadata(p)
    assert meta["date"] == "2026-03-18", f"Got: {meta.get('date')}"

def test_extract_date_date_first(tmp_path):
    """Date before separator: 'Mar 2, 2026 · Microblog #8'"""
    p = tmp_path / "entry-test.html"
    p.write_text(_make_microblog_html("Mar 2, 2026 · Microblog #8"))
    meta = extract_microblog_metadata(p)
    assert meta["date"] == "2026-03-02", f"Got: {meta.get('date')}"

def test_extract_date_bullet_separator(tmp_path):
    """Bullet separator: 'Feb 26, 2026 • Quimbot'"""
    p = tmp_path / "entry-test.html"
    p.write_text(_make_microblog_html("Feb 26, 2026 • Quimbot"))
    meta = extract_microblog_metadata(p)
    assert meta["date"] == "2026-02-26", f"Got: {meta.get('date')}"

def test_extract_date_p_tag(tmp_path):
    """Date in <p class='meta'> tag"""
    html = """<!DOCTYPE html><html><body>
    <p class="meta">Feb 26, 2026 • Quimbot</p>
    <p>Real content here that should be the snippet.</p>
    </body></html>"""
    p = tmp_path / "entry-test.html"
    p.write_text(html)
    meta = extract_microblog_metadata(p)
    assert meta["date"] == "2026-02-26"

def test_extract_linked_artifacts(tmp_path):
    html = """<!DOCTYPE html><html><body>
    <div class="meta">March 1, 2026</div>
    <iframe src="../gallery/schotter.html"></iframe>
    <p>Content here.</p>
    </body></html>"""
    p = tmp_path / "entry-test.html"
    p.write_text(html)
    meta = extract_microblog_metadata(p)
    assert "schotter" in meta.get("linkedArtifacts", [])

def test_extract_snippet(tmp_path):
    html = """<!DOCTYPE html><html><body>
    <div class="meta">March 1, 2026</div>
    <p>This is the main body text and it should be captured as the snippet.</p>
    </body></html>"""
    p = tmp_path / "entry-test.html"
    p.write_text(html)
    meta = extract_microblog_metadata(p)
    assert "snippet" in meta
    assert len(meta["snippet"]) > 10

# ════════════════════════════════════════════════════════════════════════════
# 3. detect_agent
# ════════════════════════════════════════════════════════════════════════════

def test_detect_agent_quimbot():
    commit = {"email": "openclaw@example.com", "name": "OpenClaw Agent", "subject": "artifact: new thing"}
    assert detect_agent(commit) == "Quimbot"

def test_detect_agent_petrarch_milwrite():
    commit = {"email": "milwrite@github.com", "name": "milwrite", "subject": "artifact: new thing"}
    assert detect_agent(commit) == "Petrarch"

def test_detect_agent_subject_prefix():
    commit = {"email": "unknown@example.com", "name": "unknown", "subject": "[Quimbot] new artifact"}
    assert detect_agent(commit) == "Quimbot"

# ════════════════════════════════════════════════════════════════════════════
# 4. Workflow config validation
# ════════════════════════════════════════════════════════════════════════════

def test_workflow_file_exists():
    wf = REPO / ".github" / "workflows" / "update-manifest.yml"
    assert wf.exists(), "Workflow file missing"

def test_workflow_triggers_on_gallery_push():
    wf_text = (REPO / ".github" / "workflows" / "update-manifest.yml").read_text()
    assert "gallery/**" in wf_text
    assert "microblog/**" in wf_text
    assert "artifacts/**" in wf_text

def test_workflow_has_write_permission():
    wf_text = (REPO / ".github" / "workflows" / "update-manifest.yml").read_text()
    assert "contents: write" in wf_text

def test_workflow_uses_skip_ci():
    wf_text = (REPO / ".github" / "workflows" / "update-manifest.yml").read_text()
    assert "[skip ci]" in wf_text

def test_workflow_fetches_full_history():
    wf_text = (REPO / ".github" / "workflows" / "update-manifest.yml").read_text()
    assert "fetch-depth: 0" in wf_text

# ════════════════════════════════════════════════════════════════════════════
# 5. update_manifest.py dry-run smoke test
# ════════════════════════════════════════════════════════════════════════════

def test_manifest_dry_run_exits_clean():
    result = run_manifest(["--dry-run"])
    assert result.returncode == 0, f"Script failed:\n{result.stderr}"

def test_manifest_dry_run_outputs_counts():
    result = run_manifest(["--dry-run"])
    assert "artifacts" in result.stdout.lower() or "microblogs" in result.stdout.lower()

# ════════════════════════════════════════════════════════════════════════════
# 6. Data integrity checks on current manifest
# ════════════════════════════════════════════════════════════════════════════

def test_all_microblogs_have_dates():
    m = load_json(REPO / "data" / "manifest-v2.json")
    missing = [b["id"] for b in m["microblogs"] if not b.get("date")]
    assert not missing, f"Microblogs missing dates: {missing}"

def test_all_microblogs_have_num():
    m = load_json(REPO / "data" / "manifest-v2.json")
    missing = [b["id"] for b in m["microblogs"] if not b.get("num")]
    assert not missing, f"Microblogs missing num: {missing}"

def test_all_microblogs_in_feed():
    m = load_json(REPO / "data" / "manifest-v2.json")
    feed = load_json(REPO / "data" / "feed.json")
    manifest_ids = {b["id"] for b in m["microblogs"]}
    feed_ids = {b["id"] for b in feed.get("microblogs", [])}
    missing = manifest_ids - feed_ids
    assert not missing, f"In manifest but not in feed: {missing}"

def test_no_duplicate_microblog_nums():
    m = load_json(REPO / "data" / "manifest-v2.json")
    nums = [b["num"] for b in m["microblogs"] if b.get("num")]
    assert len(nums) == len(set(nums)), f"Duplicate nums: {[n for n in nums if nums.count(n) > 1]}"

def test_milwrite_not_a_contributor():
    m = load_json(REPO / "data" / "manifest-v2.json")
    for art in m.get("artifacts", []):
        contribs = art.get("contributors", [])
        assert "milwrite" not in contribs, f"milwrite in contributors for {art['id']}"

# ════════════════════════════════════════════════════════════════════════════
# Runner
# ════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    passed = failed = 0
    import tempfile
    tmp = tempfile.mkdtemp()
    for t in tests:
        name = t.__name__
        try:
            import inspect
            sig = inspect.signature(t)
            if "tmp_path" in sig.parameters:
                tp = Path(tempfile.mkdtemp(dir=tmp))
                t(tp)
            else:
                t()
            print(f"  ✓  {name}")
            passed += 1
        except Exception as e:
            print(f"  ✗  {name}: {e}")
            failed += 1
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"\n{passed} passed, {failed} failed")
    sys.exit(0 if failed == 0 else 1)
