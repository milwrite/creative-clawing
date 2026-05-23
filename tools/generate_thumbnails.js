#!/usr/bin/env node
// Generate static thumbnails for every gallery/X.html sketch.
//
// Standard pattern (CodePen, Shadertoy, OpenProcessing): static thumbnail in
// the grid, live iframe only on the detail page. Live iframes in the grid kill
// CPU and show blank cards on slower devices.
//
// Critical: most sketches have a warmup branch that ONLY runs in iframe
// context (`if (window.self !== window.top) { seed/spawn/fastforward }`).
// We have to load each sketch INSIDE an iframe so that branch fires —
// otherwise the canvas captures empty.
//
// We also verify pixel coverage and retry with longer wait + synthetic clicks
// if the first capture is mostly blank.
//
// Usage:
//   node tools/generate_thumbnails.js                  # all sketches
//   node tools/generate_thumbnails.js mohr snowflake   # only these
//   node tools/generate_thumbnails.js --force          # overwrite all
//   node tools/generate_thumbnails.js --missing        # only those without a .webp
//

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const GALLERY_DIR = path.join(ROOT, 'gallery');
const THUMBS_DIR = path.join(ROOT, 'thumbnails');
const PORT = 8910;
const VIEWPORT = { width: 1400, height: 900 };
const IFRAME_SIZE = { width: 1280, height: 800 };
const THUMB = { width: 800, height: 500 };
const MIN_COVERAGE = 0.15;     // pixel-variance score (0..1); below this = essentially flat
const WARMUP_MS = 5000;
const SLOW_MS = 9000;          // for progressive/slow-developing sketches
const VERY_SLOW_MS = 18000;    // hexagonal CA, slow attractors that need many seconds
const RETRY_MS = 12000;
const MAX_RETRIES = 1;

// Sketches that develop slowly (reaction-diffusion, CA, progressive samplers,
// L-systems, point clouds) — longer initial warmup avoids the retry penalty.
const SLOW_SKETCHES = new Set([
  'grayscott', 'fitzhughnagumo', 'turing', 'ising',
  'cyclicca', 'wolfram', 'brainsbrain', 'life', 'slime',
  'dadras', 'aizawa', 'rossler', 'thomas', 'sprott',
  'percolation', 'schelling',
  'mandelbrot', 'fourier', 'lissajous', 'lsystem', 'mondrian',
  'nbody', 'scandrift', 'tenprint', 'domainwarp',
]);
const VERY_SLOW_SKETCHES = new Set([
  'snowflake',     // Reiter CA — needs ~15s for visible dendrite
  'sospiri',       // sparse particles slowly emerging
  'audiomountain', // audio-driven but no audio in headless → builds slowly
  'aura', 'quadwalk', 'langton', 'logistic', 'lotkavolterra',
]);

const flags = new Set(process.argv.slice(2).filter(a => a.startsWith('--')));
const filter = new Set(process.argv.slice(2).filter(a => !a.startsWith('--')));
const FORCE = flags.has('--force');
const MISSING_ONLY = flags.has('--missing');

fs.mkdirSync(THUMBS_DIR, { recursive: true });

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://x');
      let p = decodeURIComponent(url.pathname);
      // Synthetic /__wrap?name=X endpoint returns an iframe wrapper. Same-origin
      // with the sketch URL so contentDocument is accessible.
      if (p === '/__wrap') {
        const name = (url.searchParams.get('name') || '').replace(/[^A-Za-z0-9_-]/g, '');
        const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#0a0a0a;overflow:hidden;width:100%;height:100%}
iframe{display:block;border:0;background:#0a0a0a;width:${IFRAME_SIZE.width}px;height:${IFRAME_SIZE.height}px}
</style></head><body><iframe id="preview" src="/gallery/${name}.html"></iframe></body></html>`;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html); return;
      }
      if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || !fs.statSync(fp).isFile()) {
        res.writeHead(404); res.end('not found'); return;
      }
      const ext = path.extname(fp).toLowerCase();
      const ct = ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' })[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': ct });
      fs.createReadStream(fp).pipe(res);
    });
    server.listen(PORT, () => resolve(server));
  });
}

// Inside an iframe context, find the largest canvas, sample it for pixel
// coverage, and return both the coverage and the canvas-to-webp dataURL.
const captureInIframe = async ({ targetW, targetH }) => {
  const iframe = document.getElementById('preview');
  const doc = iframe.contentDocument;
  if (!doc) return { coverage: 0, dataUrl: null, reason: 'no-doc' };
  const canvases = Array.from(doc.querySelectorAll('canvas'));
  if (!canvases.length) return { coverage: 0, dataUrl: null, reason: 'no-canvas' };
  let best = canvases[0];
  for (const c of canvases) if ((c.width * c.height) > (best.width * best.height)) best = c;
  if (best.width < 4 || best.height < 4) return { coverage: 0, dataUrl: null, reason: 'tiny-canvas' };

  // Quality metric: standard deviation of pixel brightness across a sampled
  // grid. Flat canvases (single colour) score ~0; even sparse line art on
  // black scores well above the threshold. Robust across light/dark themes
  // and works for both 2D and bitmap-blitted content.
  let coverage = 0;
  // Detect WebGL/WebGPU canvases — getContext('2d') returns null on them
  // because a context type was already attached. drawImage of a WebGL canvas
  // typically returns a cleared buffer (preserveDrawingBuffer:false), so we
  // return null here and let the caller use Playwright's element screenshot
  // path instead (which goes through the compositor and works for WebGL).
  const probe = best.getContext('2d', { willReadFrequently: true });
  if (!probe) {
    return { coverage: 0, dataUrl: null, reason: 'non-2d-canvas' };
  }
  try {
    const srcCtx = probe;
    if (srcCtx) {
      // Sample a grid of ~150x150 pixels (independent of canvas size)
      const sw = Math.min(best.width, 300);
      const sh = Math.min(best.height, 300);
      const img = srcCtx.getImageData(
        Math.floor((best.width - sw) / 2),
        Math.floor((best.height - sh) / 2),
        sw, sh
      );
      let sum = 0, sumSq = 0;
      const total = img.data.length / 4;
      for (let i = 0; i < img.data.length; i += 4) {
        const b = img.data[i] + img.data[i+1] + img.data[i+2];
        sum += b; sumSq += b * b;
      }
      const mean = sum / total;
      const variance = (sumSq / total) - (mean * mean);
      const stdDev = Math.sqrt(Math.max(0, variance));
      // Normalize to roughly 0..1 — stdDev of 30 (on 0..765 brightness scale)
      // is plenty of visible variation; stdDev of 0 is dead flat.
      coverage = Math.min(1, stdDev / 50);
    }
  } catch(e) { /* WebGL canvases throw on getImageData — treat as opaque */ coverage = 1; }

  // Composite onto target-size canvas with cover-fit
  const target = document.createElement('canvas');
  target.width = targetW; target.height = targetH;
  const ctx = target.getContext('2d');
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, targetW, targetH);
  const srcRatio = best.width / best.height;
  const dstRatio = targetW / targetH;
  let sx = 0, sy = 0, sw = best.width, sh = best.height;
  if (srcRatio > dstRatio) { sw = best.height * dstRatio; sx = (best.width - sw) / 2; }
  else                     { sh = best.width / dstRatio; sy = (best.height - sh) / 2; }
  try {
    ctx.drawImage(best, sx, sy, sw, sh, 0, 0, targetW, targetH);
  } catch(e) {
    return { coverage, dataUrl: null, reason: 'drawimage-failed: ' + e.message };
  }
  return { coverage, dataUrl: target.toDataURL('image/webp', 0.78) };
};

async function processOne(browser, name) {
  const out = path.join(THUMBS_DIR, `${name}.webp`);
  if (MISSING_ONLY && fs.existsSync(out)) return { status: 'skip-exists' };

  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  // Navigate to the server-side wrapper so wrapper + iframe share an origin.
  let result;
  try {
    await page.goto(`http://localhost:${PORT}/__wrap?name=${encodeURIComponent(name)}`, { waitUntil: 'load', timeout: 20000 });
    // Wait for iframe to load
    await page.waitForFunction(() => {
      const f = document.getElementById('preview');
      return f && f.contentDocument && f.contentDocument.readyState === 'complete';
    }, null, { timeout: 15000 });

    // Trigger any defined warmup hook IMMEDIATELY (some kick off progressive
    // renders that need their full wait budget to develop).
    await page.evaluate(() => {
      const f = document.getElementById('preview');
      try {
        if (f.contentWindow && typeof f.contentWindow.__creativeClawingPreview === 'function') {
          f.contentWindow.__creativeClawingPreview();
        }
      } catch(e) {}
    }).catch(()=>{});

    let coverage = 0, dataUrl = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const base = VERY_SLOW_SKETCHES.has(name) ? VERY_SLOW_MS
                 : SLOW_SKETCHES.has(name) ? SLOW_MS
                 : WARMUP_MS;
      const wait = attempt === 0 ? base : RETRY_MS;
      await page.waitForTimeout(wait);

      // PRIMARY: read the 2D canvas directly. Cheap, accurate, lets us crop
      // to the canvas exactly so any sketch UI bleeding outside is excluded.
      result = await page.evaluate(captureInIframe, { targetW: THUMB.width, targetH: THUMB.height });
      coverage = result.coverage || 0;
      dataUrl = result.dataUrl;

      // FALLBACK: if primary failed (WebGL canvas → null) or the captured
      // content looks blank, take an element screenshot through Chrome's
      // compositor. This correctly captures WebGL/WebGPU output.
      if (!dataUrl || coverage < MIN_COVERAGE) {
        const buf = await page.locator('#preview').screenshot({ type: 'png', timeout: 8000 }).catch(() => null);
        if (buf) {
          const b64 = buf.toString('base64');
          const scaled = await page.evaluate(async ({ srcB64, w, h }) => {
            const img = new Image();
            img.src = 'data:image/png;base64,' + srcB64;
            await img.decode();
            const t = document.createElement('canvas');
            t.width = w; t.height = h;
            const ctx = t.getContext('2d');
            ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, w, h);
            const srcRatio = img.width / img.height;
            const dstRatio = w / h;
            let sx = 0, sy = 0, sw = img.width, sh = img.height;
            if (srcRatio > dstRatio) { sw = img.height * dstRatio; sx = (img.width - sw) / 2; }
            else                     { sh = img.width / dstRatio; sy = (img.height - sh) / 2; }
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
            const data = ctx.getImageData(0, 0, w, h).data;
            let sum = 0, sumSq = 0; const total = data.length / 4;
            for (let i = 0; i < data.length; i += 4) {
              const b = data[i] + data[i+1] + data[i+2];
              sum += b; sumSq += b * b;
            }
            const mean = sum / total;
            const stdDev = Math.sqrt(Math.max(0, (sumSq / total) - mean * mean));
            return { dataUrl: t.toDataURL('image/webp', 0.78), coverage: Math.min(1, stdDev / 50) };
          }, { srcB64: b64, w: THUMB.width, h: THUMB.height });
          if (scaled.coverage > coverage) {
            dataUrl = scaled.dataUrl;
            coverage = scaled.coverage;
          }
        }
      }

      if (coverage >= MIN_COVERAGE && dataUrl) break;

      if (attempt < MAX_RETRIES) {
        // Try to nudge with synthetic interactions: click + drag in the iframe
        await page.evaluate(() => {
          const f = document.getElementById('preview');
          const win = f.contentWindow;
          const doc = f.contentDocument;
          if (!doc) return;
          const target = doc.querySelector('canvas') || doc.body;
          const rect = target.getBoundingClientRect();
          // Dispatch synthetic pointer + click events
          ['pointerdown','pointermove','pointerup','click'].forEach((type, i) => {
            const ev = new win.PointerEvent(type, {
              bubbles: true, cancelable: true,
              clientX: rect.width/2 + (i*30), clientY: rect.height/2 + (i*20),
              pointerType: 'mouse', button: 0, buttons: type === 'pointerdown' ? 1 : 0,
            });
            target.dispatchEvent(ev);
          });
        }).catch(()=>{});
      }
    }

    if (!dataUrl) {
      result = { status: `fail (${result?.reason || 'no-data'})`, coverage };
    } else {
      const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(out, Buffer.from(b64, 'base64'));
      const bytes = fs.statSync(out).size;
      result = {
        status: coverage >= MIN_COVERAGE
          ? `${(bytes/1024).toFixed(1)}KB cov=${(coverage*100).toFixed(1)}%`
          : `LOW-COV ${(bytes/1024).toFixed(1)}KB cov=${(coverage*100).toFixed(1)}%`,
        coverage,
        lowCoverage: coverage < MIN_COVERAGE,
      };
    }
  } catch (e) {
    result = { status: `ERR ${e.message.slice(0, 80)}`, error: true };
  }
  await ctx.close();
  return result;
}

(async () => {
  const files = fs.readdirSync(GALLERY_DIR)
    .filter(f => f.endsWith('.html') && f !== 'index.html')
    .map(f => f.replace(/\.html$/, ''))
    .filter(n => !filter.size || filter.has(n))
    .filter(n => !MISSING_ONLY || !fs.existsSync(path.join(THUMBS_DIR, `${n}.webp`)))
    .sort();
  console.log(`thumbnails: ${files.length} sketches → ${THUMBS_DIR}`);

  const server = await startServer();
  // SwiftShader gives software WebGL in headless when there's no GPU — without
  // these flags WebGL sketches like domainwarp render as a "broken image" placeholder.
  const browser = await chromium.launch({
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
    ],
  });

  const lowCov = [];
  let ok = 0, fail = 0;
  const BATCH = 3;  // 3 contexts in parallel, each with own iframe
  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(n => processOne(browser, n)));
    for (let j = 0; j < batch.length; j++) {
      const r = results[j];
      const tag = r.error || (r.status||'').startsWith('fail') ? '✗' : (r.lowCoverage ? '?' : '✓');
      console.log(`  ${tag} ${batch[j].padEnd(22)} ${r.status}`);
      if (r.lowCoverage) lowCov.push(batch[j]);
      if (tag === '✓') ok++; else if (tag === '✗') fail++;
    }
  }

  await browser.close();
  server.close();
  console.log(`\ndone: ${ok} ok, ${fail} failed${lowCov.length ? `, ${lowCov.length} low-coverage` : ''}`);
  if (lowCov.length) console.log(`low coverage (likely need manual review): ${lowCov.join(' ')}`);
})();
