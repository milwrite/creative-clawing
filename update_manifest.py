#!/usr/bin/env python3
"""
update_manifest.py — Single Source of Truth maintenance script
Reads git log, updates manifest-v2.json, regenerates feed.json and manifest.json.

Usage:
  python3 update_manifest.py [--dry-run] [--since COMMIT_SHA]

Options:
  --dry-run    Print proposed changes without writing files
  --since SHA  Process only commits after this SHA (default: full history)
  --all        Reprocess all HTML files, not just new ones
"""

import json
import os
import re
import sys
import subprocess
import argparse
from pathlib import Path
from datetime import datetime, timezone

REPO = Path(__file__).parent
DATA = REPO / "data"
GALLERY = REPO / "gallery"
ARTIFACTS = REPO / "artifacts"
MICROBLOG = REPO / "microblog"

MANIFEST_V2 = DATA / "manifest-v2.json"
FEED_JSON    = DATA / "feed.json"
MANIFEST_JSON = DATA / "manifest.json"
COMMIT_STATS  = DATA / "commit-stats.json"
OVERRIDES     = DATA / "overrides.json"

# Commit subject prefixes → category labels
CATEGORY_PREFIXES = {
    "artifact:": "artifact",
    "gallery:":  "artifact",
    "mobile:":   "mobile",
    "fix(gallery)": "fix",
    "fix:":      "fix",
    "docs:":     "docs",
    "blog:":     "blog",
    "microblog": "blog",
    "refactor:": "refactor",
    "style:":    "style",
    "chore:":    "chore",
    "perf:":     "perf",
}

# Canonical agent name mapping (commit author → agent)
AGENT_ALIASES = {
    "quimbot":   "Quimbot",
    "openclaw":  "Quimbot",   # openclaw@example.com / OpenClaw Agent = Quimbot
    "petrarch":  "Petrarch",
    "milwrite":  "Petrarch",  # milwrite = repo owner; commits attributed to Petrarch
    "zach":      "Petrarch",
    "milwright": "Petrarch",
}

# milwrite is never a contributor — all milwrite commits resolve to Petrarch
EXCLUDE_CONTRIBUTORS = {"milwrite", "Unknown"}

def run(cmd, cwd=REPO):
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    return result.stdout.strip()

def git_log(since=None):
    """Return list of commit dicts from git log."""
    fmt = "%H\x1f%ae\x1f%an\x1f%ci\x1f%s"
    cmd = ["git", "log", f"--pretty=format:{fmt}"]
    if since:
        cmd.append(f"{since}..HEAD")
    output = run(cmd)
    commits = []
    for line in output.splitlines():
        parts = line.split("\x1f", 4)
        if len(parts) == 5:
            sha, email, name, date, subject = parts
            commits.append({
                "sha": sha[:8],
                "sha_full": sha,
                "email": email.lower(),
                "name": name,
                "date": date[:10],
                "subject": subject,
            })
    return commits

def detect_agent(commit):
    """Resolve commit author to canonical agent name."""
    for key, agent in AGENT_ALIASES.items():
        if key in commit["email"].lower() or key in commit["name"].lower():
            return agent
    # Fall back: check subject for [Agent] prefix
    m = re.match(r"^\[(\w+)\]", commit["subject"])
    if m:
        name = m.group(1).lower()
        return AGENT_ALIASES.get(name, m.group(1).capitalize())
    return "Unknown"

def categorize_commit(subject):
    """Map commit subject to one or more category labels."""
    sl = subject.lower()
    categories = []
    for prefix, cat in CATEGORY_PREFIXES.items():
        if sl.startswith(prefix.lower()) or f"({prefix.rstrip(':').lower()})" in sl:
            if cat not in categories:
                categories.append(cat)
    if not categories:
        categories.append("other")
    return categories

def files_in_commit(sha_full):
    """Return list of files changed in a commit."""
    out = run(["git", "show", "--name-only", "--pretty=format:", sha_full])
    return [f.strip() for f in out.splitlines() if f.strip()]

def extract_title_from_html(path):
    """Extract <title> text from an HTML file."""
    try:
        content = path.read_text(errors="replace")
        m = re.search(r"<title[^>]*>([^<]+)</title>", content, re.IGNORECASE)
        if m:
            # Strip "· Creative Clawing" suffix if present
            title = m.group(1).strip()
            title = re.sub(r"\s*·\s*Creative Clawing.*$", "", title)
            return title
    except Exception:
        pass
    return None

def extract_originAgent_from_html(path):
    """Look for // originAgent: Quimbot style comment in HTML."""
    try:
        content = path.read_text(errors="replace")
        m = re.search(r"originAgent\s*[:=]\s*['\"]?(\w+)", content, re.IGNORECASE)
        if m:
            name = m.group(1).lower()
            return AGENT_ALIASES.get(name, m.group(1).capitalize()), "confirmed"
    except Exception:
        pass
    return None, None

def id_from_path(path):
    """Derive artifact/microblog id from filename."""
    return path.stem.lower()

def load_json(path):
    if path.exists():
        return json.loads(path.read_text())
    return {}

def save_json(path, data, dry_run=False):
    content = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    if dry_run:
        print(f"[dry-run] Would write {path.name} ({len(content)} bytes)")
    else:
        path.write_text(content)
        print(f"  ✓ Wrote {path.name}")

# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--since", default=None, help="Only process commits after this SHA")
    parser.add_argument("--all", dest="reprocess_all", action="store_true",
                        help="Reprocess all HTML files, not just git-detected new ones")
    args = parser.parse_args()

    dry = args.dry_run
    if dry:
        print("[DRY RUN — no files will be written]\n")

    # Load existing data
    v2 = load_json(MANIFEST_V2)
    artifacts_list   = v2.get("artifacts", [])
    microblogs_list  = v2.get("microblogs", [])
    overrides        = load_json(OVERRIDES)
    commit_stats     = load_json(COMMIT_STATS)

    # Index existing entries by id
    artifact_idx  = {e["id"]: e for e in artifacts_list}
    microblog_idx = {e["id"]: e for e in microblogs_list}

    # ── 1. Process git log ────────────────────────────────────────────────────
    print(f"Reading git log{f' since {args.since}' if args.since else ''}…")
    commits = git_log(args.since)
    print(f"  {len(commits)} commits found")

    new_artifacts  = set()   # ids of newly detected gallery files
    new_microblogs = set()   # ids of newly detected microblog files

    commit_agent_map = {}    # sha → agent (for optimization attribution)

    for commit in commits:
        agent   = detect_agent(commit)
        cats    = categorize_commit(commit["subject"])
        commit_agent_map[commit["sha"]] = agent

        # ── Update commit-stats ───────────────────────────────────────────────
        agent_key = agent.lower()
        if agent_key not in commit_stats:
            commit_stats[agent_key] = {
                "totalCommits": 0,
                "dailyCounts": {},
                "categoryCounts": {},
                "commits": [],
            }
        cs = commit_stats[agent_key]

        # Only add if sha not already present
        existing_shas = {c["sha"] for c in cs.get("commits", [])}
        if commit["sha"] not in existing_shas:
            cs["totalCommits"] = cs.get("totalCommits", 0) + 1
            cs["dailyCounts"][commit["date"]] = cs["dailyCounts"].get(commit["date"], 0) + 1
            for cat in cats:
                cs["categoryCounts"][cat] = cs["categoryCounts"].get(cat, 0) + 1
            cs.setdefault("commits", []).insert(0, {
                "sha": commit["sha"],
                "date": commit["date"],
                "subject": commit["subject"],
                "categories": cats,
            })

        # ── Scan files touched in this commit ────────────────────────────────
        if not args.reprocess_all:
            changed_files = files_in_commit(commit["sha_full"])
        else:
            changed_files = []

        for f in changed_files:
            p = Path(f)
            if p.suffix == ".html":
                if p.parts[0] == "gallery":
                    new_artifacts.add(p.stem.lower())
                elif p.parts[0] == "microblog":
                    new_microblogs.add(p.stem.lower())

    # ── 2. If --all, scan all HTML files directly ─────────────────────────────
    if args.reprocess_all:
        for f in GALLERY.glob("*.html"):
            new_artifacts.add(id_from_path(f))
        for f in MICROBLOG.glob("*.html"):
            new_microblogs.add(id_from_path(f))

    # ── 3. Update manifest-v2 artifact entries ────────────────────────────────
    art_overrides = overrides.get("artifactOrigins", {})
    contrib_overrides = overrides.get("artifactContributors", {})
    blog_overrides = overrides.get("blogOrigins", {})

    def resolve_origin(id_, git_agent, overrides_map, confidence_map=None):
        if id_ in overrides_map:
            return overrides_map[id_], "confirmed"
        html_agent, html_conf = extract_originAgent_from_html(GALLERY / f"{id_}.html")
        if html_agent:
            return html_agent, html_conf
        return git_agent, "reported"

    processed_artifacts = 0
    for art_id in sorted(new_artifacts):
        gallery_path = GALLERY / f"{art_id}.html"
        if not gallery_path.exists():
            continue  # file deleted

        title = extract_title_from_html(gallery_path)
        if not title:
            title = art_id.capitalize()

        # Find the creating commit (last in log = oldest)
        origin_agent = "Unknown"
        for c in reversed(commits):
            cfiles = files_in_commit(c["sha_full"])
            if any(f.endswith(f"gallery/{art_id}.html") for f in cfiles):
                origin_agent = detect_agent(c)
                break

        final_origin, origin_conf = resolve_origin(art_id, origin_agent, art_overrides)

        # Build contributors list
        contributing_agents = set()
        for c in commits:
            cfiles = files_in_commit(c["sha_full"])
            if any(f.endswith(f"gallery/{art_id}.html") or
                   f.endswith(f"artifacts/{art_id}.html") for f in cfiles):
                contributing_agents.add(detect_agent(c))
        # Apply manual overrides
        for extra in contrib_overrides.get(art_id, []):
            contributing_agents.add(extra)

        # Sort contributors: origin first
        contributors = [final_origin] + sorted(contributing_agents - {final_origin})

        # Collect optimizations from commits
        optimizations = []
        opt_prefixes = ("mobile:", "fix:", "fix(gallery)", "fix(gallery):")
        for c in commits:
            subj_lower = c["subject"].lower()
            if any(subj_lower.startswith(p) for p in opt_prefixes):
                cfiles = files_in_commit(c["sha_full"])
                if any(f.endswith(f"gallery/{art_id}.html") or
                       f.endswith(f"artifacts/{art_id}.html") for f in cfiles):
                    opt_agent = commit_agent_map.get(c["sha"], "Unknown")
                    already = any(o["sha"] == c["sha"] for o in optimizations)
                    if not already:
                        optimizations.append({
                            "sha": c["sha"],
                            "subject": c["subject"],
                            "agent": opt_agent,
                            "confidence": "confirmed",
                        })

        existing = artifact_idx.get(art_id, {})
        # Merge: keep existing fields, update detected ones
        entry = {
            "id": art_id,
            "title": existing.get("title") or title,
            "type": "artifact",
            "url": f"gallery/{art_id}.html",
            "page": f"artifacts/{art_id}.html",
            "originAgent": existing.get("originAgent") or final_origin,
            "originConfidence": existing.get("originConfidence") or origin_conf,
            "contributors": existing.get("contributors") or contributors,
            "optimizations": existing.get("optimizations") or optimizations,
        }
        # Preserve optional rich fields if already present
        for field in ("description", "category", "tags", "interactive", "animated",
                      "mobile_optimized", "inspiration", "year_referenced"):
            if field in existing:
                entry[field] = existing[field]
            elif field in ("mobile_optimized", "interactive", "animated"):
                entry.setdefault(field, False)

        artifact_idx[art_id] = entry
        processed_artifacts += 1

    print(f"  Processed {processed_artifacts} artifact entries")

    # ── 4. Update microblog entries ───────────────────────────────────────────
    processed_blogs = 0
    for blog_id in sorted(new_microblogs):
        blog_path = MICROBLOG / f"{blog_id}.html"
        if not blog_path.exists():
            continue

        title = extract_title_from_html(blog_path)
        if not title:
            title = blog_id.replace("-", " ").capitalize()

        origin_agent = "Unknown"
        for c in reversed(commits):
            cfiles = files_in_commit(c["sha_full"])
            if any(f.endswith(f"microblog/{blog_id}.html") for f in cfiles):
                origin_agent = detect_agent(c)
                break

        bo = overrides.get("blogOrigins", {})
        final_origin = bo.get(blog_id, origin_agent)
        origin_conf = "confirmed" if blog_id in bo else "reported"

        existing = microblog_idx.get(blog_id, {})
        entry = {
            "id": blog_id,
            "title": existing.get("title") or title,
            "type": "microblog",
            "url": f"microblog/{blog_id}.html",
            "originAgent": existing.get("originAgent") or final_origin,
            "originConfidence": existing.get("originConfidence") or origin_conf,
        }
        for field in ("description", "tags", "artifact_ref"):
            if field in existing:
                entry[field] = existing[field]

        microblog_idx[blog_id] = entry
        processed_blogs += 1

    print(f"  Processed {processed_blogs} microblog entries")

    # ── 5. Rebuild sorted lists ───────────────────────────────────────────────
    artifacts_out  = sorted(artifact_idx.values(),  key=lambda e: e["id"])
    microblogs_out = sorted(microblog_idx.values(), key=lambda e: e["id"])

    summary = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "totalArtifacts": len(artifacts_out),
        "totalMicroblogs": len(microblogs_out),
        "agents": list({
            a for e in artifacts_out
            for a in e.get("contributors", [])
        }),
    }

    new_v2 = {
        "artifacts": artifacts_out,
        "microblogs": microblogs_out,
        "summary": summary,
    }

    # ── 6. Generate feed.json ─────────────────────────────────────────────────
    def slim(e):
        return {k: e[k] for k in ("id", "title", "type", "url", "page")
                if k in e}

    feed_artifacts  = [slim(e) for e in artifacts_out]
    feed_microblogs = [slim(e) for e in microblogs_out]
    new_feed = {
        "artifacts":  feed_artifacts,
        "microblogs": feed_microblogs,
        "feed": feed_artifacts + feed_microblogs,
    }

    # ── 7. Generate manifest.json (legacy format) ─────────────────────────────
    old_manifest = load_json(MANIFEST_JSON)
    new_manifest = {
        "agents": old_manifest.get("agents", ["Quimbot", "Petrarch"]),
        "attributionModel": old_manifest.get("attributionModel", "git-log-exhaustive"),
        "generated": summary["generated"],
        "artifacts": artifacts_out,
        "microblogs": microblogs_out,
    }

    # ── 8. Write all files ────────────────────────────────────────────────────
    print("\nWriting output files…")
    save_json(MANIFEST_V2,   new_v2,        dry)
    save_json(FEED_JSON,     new_feed,      dry)
    save_json(MANIFEST_JSON, new_manifest,  dry)
    save_json(COMMIT_STATS,  commit_stats,  dry)

    print(f"\nDone. {len(artifacts_out)} artifacts · {len(microblogs_out)} microblogs")
    if dry:
        print("[dry-run: no files were modified]")

if __name__ == "__main__":
    main()
