#!/usr/bin/env python3
"""Generate static artifact previews for fast card rendering."""

import argparse
import asyncio
import contextlib
import json
import os
import socket
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote

from playwright.async_api import async_playwright


ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "data" / "manifest-v2.json"
PREVIEW_DIR = ROOT / "assets" / "previews"
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        return


def free_port():
    with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def start_server(port):
    handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(ROOT), **kwargs)
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def manifest_artifacts():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    return [
        artifact
        for artifact in manifest.get("artifacts", [])
        if artifact.get("id") and artifact.get("id") != "index"
    ]


def is_low_information(path):
    try:
        from PIL import Image, ImageStat
    except Exception:
        return False

    with Image.open(path) as image:
        sample = image.convert("L").resize((48, 36))
        stat = ImageStat.Stat(sample)
        mean = stat.mean[0]
        variance = stat.var[0]
    return mean < 7 or variance < 12


async def warm_frame(frame):
    await frame.add_style_tag(content="""
      .back,.back-btn,#back,#ui,.panel,.controls,#label,#hint,#params,#info,#seed,#epoch,
      .label,.toolbar,.hud,button,input,select,textarea{display:none!important}
      html,body{overflow:hidden!important}
    """)
    await frame.evaluate("""
      () => {
        document.documentElement.classList.add('in-iframe');
        window.dispatchEvent(new Event('resize'));
        if (window.visualViewport) window.visualViewport.dispatchEvent(new Event('resize'));
        const canvases = Array.from(document.querySelectorAll('canvas'));
        for (const canvas of canvases) {
          const rect = canvas.getBoundingClientRect();
          if (!rect.width || !rect.height) continue;
          const points = [
            [0.50, 0.50], [0.30, 0.34], [0.70, 0.66],
            [0.22, 0.72], [0.82, 0.24], [0.58, 0.18]
          ];
          for (const [px, py] of points) {
            const x = rect.left + rect.width * px;
            const y = rect.top + rect.height * py;
            const base = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse' };
            canvas.dispatchEvent(new PointerEvent('pointermove', base));
            canvas.dispatchEvent(new PointerEvent('pointerdown', base));
            canvas.dispatchEvent(new PointerEvent('pointerup', base));
            canvas.dispatchEvent(new MouseEvent('click', base));
          }
        }
      }
    """)


async def capture_one(browser, base_url, artifact, wait_ms, retries, screenshot_timeout_ms, width, height):
    artifact_id = artifact["id"]
    title = artifact.get("title") or artifact_id
    output = PREVIEW_DIR / f"{artifact_id}.jpg"
    page = await browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
    page.set_default_timeout(5000)
    try:
        harness_url = f"{base_url}/tools/preview_harness.html?id={quote(artifact_id)}"
        await page.goto(harness_url, wait_until="domcontentloaded", timeout=4000)
        for _ in range(30):
            if any(f"/gallery/{artifact_id}.html" in item.url for item in page.frames):
                break
            await page.wait_for_timeout(100)
        await page.wait_for_timeout(wait_ms)
        await page.screenshot(path=str(output), type="jpeg", quality=82, timeout=screenshot_timeout_ms)

        attempt = 0
        while attempt < retries and is_low_information(output):
            attempt += 1
            await page.wait_for_timeout(wait_ms + (attempt * 700))
            await page.screenshot(path=str(output), type="jpeg", quality=86, timeout=screenshot_timeout_ms)
        return {"id": artifact_id, "title": title, "path": str(output), "low_info": is_low_information(output)}
    except Exception as exc:
        return {"id": artifact_id, "title": title, "error": str(exc)}
    finally:
        await page.close()


async def run(args):
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    artifacts = manifest_artifacts()
    if args.ids:
        wanted = set(args.ids)
        artifacts = [artifact for artifact in artifacts if artifact["id"] in wanted]
    if args.missing:
        artifacts = [artifact for artifact in artifacts if not (PREVIEW_DIR / f"{artifact['id']}.jpg").exists()]

    if not artifacts:
        print("No previews to generate.")
        return 0

    port = free_port()
    server = start_server(port)
    base_url = f"http://127.0.0.1:{port}"
    chrome_path = str(CHROME) if CHROME.exists() else None
    failures = []
    low_info = []

    async with async_playwright() as playwright:
      launch_options = {
          "headless": True,
          "args": ["--disable-dev-shm-usage", "--disable-background-timer-throttling"],
      }
      if chrome_path:
          launch_options["executable_path"] = chrome_path
      browser = await playwright.chromium.launch(**launch_options)
      semaphore = asyncio.Semaphore(args.concurrency)
      done = 0

      async def guarded(artifact):
          async with semaphore:
              try:
                  return await asyncio.wait_for(
                      capture_one(
                          browser,
                          base_url,
                          artifact,
                          args.wait_ms,
                          args.retries,
                          args.screenshot_timeout_ms,
                          args.width,
                          args.height,
                      ),
                      timeout=args.timeout_ms / 1000,
                  )
              except asyncio.TimeoutError:
                  return {"id": artifact["id"], "title": artifact.get("title") or artifact["id"], "error": "preview capture timed out"}

      for task in asyncio.as_completed([guarded(artifact) for artifact in artifacts]):
          result = await task
          done += 1
          if result.get("error"):
              failures.append(result)
              print(f"[{done:>3}/{len(artifacts)}] fail {result['id']}: {result['error']}", flush=True)
          else:
              if result.get("low_info"):
                  low_info.append(result)
                  marker = "low"
              else:
                  marker = "ok "
              print(f"[{done:>3}/{len(artifacts)}] {marker} {result['id']}", flush=True)

      await browser.close()
    server.shutdown()

    if low_info:
        print("\nLow-information previews:")
        for result in low_info:
            print(f"  {result['id']}")
    if failures:
        print("\nFailures:")
        for result in failures:
            print(f"  {result['id']}: {result['error']}")
        return 1
    return 0 if not args.strict_low_info or not low_info else 1


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ids", nargs="*", help="artifact ids to render; default is all manifest artifacts")
    parser.add_argument("--missing", action="store_true", help="only render previews that do not exist")
    parser.add_argument("--wait-ms", type=int, default=1000, help="paint wait per artifact")
    parser.add_argument("--retries", type=int, default=2, help="extra capture attempts for dark or flat previews")
    parser.add_argument("--timeout-ms", type=int, default=12000, help="overall timeout per artifact")
    parser.add_argument("--screenshot-timeout-ms", type=int, default=15000, help="timeout for the screenshot operation")
    parser.add_argument("--width", type=int, default=480, help="preview viewport width")
    parser.add_argument("--height", type=int, default=360, help="preview viewport height")
    parser.add_argument("--concurrency", type=int, default=max(1, min(4, (os.cpu_count() or 2) // 2)), help="parallel Chrome pages")
    parser.add_argument("--strict-low-info", action="store_true", help="exit non-zero when any preview remains dark or flat")
    return parser.parse_args()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run(parse_args())))
