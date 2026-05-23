#!/usr/bin/env node
// Re-capture specific sketches that the main pipeline can't develop enough.
// Renders them standalone (no iframe wrap) so the page takes its top-level
// path; some progressive renderers gate behaviour on `window.self===window.top`
// and only produce content there.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const GALLERY_DIR = path.join(ROOT, 'gallery');
const THUMBS_DIR = path.join(ROOT, 'thumbnails');
const PORT = 8911;
const VIEWPORT = { width: 1280, height: 800 };
const THUMB = { width: 800, height: 500 };
const WAIT_MS = 12000;

const names = process.argv.slice(2);
if (!names.length) {
  console.error('usage: regen_stragglers.js name1 name2 ...');
  process.exit(1);
}

function startServer() {
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || !fs.statSync(fp).isFile()) {
        res.writeHead(404); res.end(); return;
      }
      const ext = path.extname(fp).toLowerCase();
      const ct = ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' })[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': ct });
      fs.createReadStream(fp).pipe(res);
    });
    s.listen(PORT, () => resolve(s));
  });
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch();
  for (const name of names) {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();
    try {
      await page.goto(`http://localhost:${PORT}/gallery/${name}.html`, { waitUntil: 'load', timeout: 20000 });
      // Some sketches need synthetic interaction to seed (click anywhere)
      await page.mouse.click(VIEWPORT.width/2, VIEWPORT.height/2);
      await page.waitForTimeout(WAIT_MS);
      const dataUrl = await page.evaluate(async (target) => {
        const canvases = Array.from(document.querySelectorAll('canvas'));
        if (!canvases.length) return null;
        let best = canvases[0];
        for (const c of canvases) if ((c.width * c.height) > (best.width * best.height)) best = c;
        const t = document.createElement('canvas');
        t.width = target.w; t.height = target.h;
        const ctx2d = t.getContext('2d');
        ctx2d.fillStyle = '#0a0a0a'; ctx2d.fillRect(0, 0, target.w, target.h);
        const srcRatio = best.width / best.height;
        const dstRatio = target.w / target.h;
        let sx = 0, sy = 0, sw = best.width, sh = best.height;
        if (srcRatio > dstRatio) { sw = best.height * dstRatio; sx = (best.width - sw) / 2; }
        else                     { sh = best.width / dstRatio; sy = (best.height - sh) / 2; }
        ctx2d.drawImage(best, sx, sy, sw, sh, 0, 0, target.w, target.h);
        return t.toDataURL('image/webp', 0.78);
      }, { w: THUMB.width, h: THUMB.height });
      if (dataUrl) {
        const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const out = path.join(THUMBS_DIR, `${name}.webp`);
        fs.writeFileSync(out, Buffer.from(b64, 'base64'));
        console.log(`  ✓ ${name.padEnd(22)} ${(fs.statSync(out).size/1024).toFixed(1)}KB`);
      } else {
        console.log(`  ✗ ${name.padEnd(22)} no-data`);
      }
    } catch (e) {
      console.log(`  ✗ ${name.padEnd(22)} ${e.message.slice(0, 80)}`);
    }
    await ctx.close();
  }
  await browser.close();
  server.close();
})();
