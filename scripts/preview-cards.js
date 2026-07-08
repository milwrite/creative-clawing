(function () {
  const READY_PULSES = 2;
  const READY_PULSE_MS = 70;
  const SETTLE_RESIZE_MS = 220;
  const PREVIEW_VERSION = '20260708-loading-fix';
  const readyTimers = new WeakMap();
  const posterTimers = new WeakMap();

  function idFromGallerySrc(src) {
    const match = String(src || '').match(/(?:^|\/)gallery\/([^/?#]+)\.html/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function versionedPreviewSrc(src) {
    const value = String(src || '');
    if (!/(?:^|\/)gallery\/[^?#]+\.html(?:[?#]|$)/.test(value)) return value;
    if (/[?&]v=/.test(value)) return value;
    const hashIndex = value.indexOf('#');
    const base = hashIndex === -1 ? value : value.slice(0, hashIndex);
    const hash = hashIndex === -1 ? '' : value.slice(hashIndex);
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}v=${PREVIEW_VERSION}${hash}`;
  }

  function previewIdFor(frame) {
    const src = frame && (frame.dataset.src || frame.dataset.iframeSrc);
    const id = frame && (frame.dataset.previewId || idFromGallerySrc(src));
    if (id && frame) frame.dataset.previewId = id;
    return id || 'creative-clawing';
  }

  function hashId(value) {
    let hash = 2166136261;
    const text = String(value || '');
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function colorSet(seed) {
    const palettes = [
      ['#d7f29b', '#62d3ff', '#ff8fb3'],
      ['#f8d66d', '#7de0c5', '#b7a7ff'],
      ['#ffb86b', '#8ee6ff', '#e9ff8f'],
      ['#aef3d5', '#f497c0', '#90b4ff'],
      ['#f0ff79', '#5ff1d5', '#ff7a90'],
    ];
    return palettes[seed % palettes.length];
  }

  function withAlpha(hex, alpha) {
    const value = hex.replace('#', '');
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function fitPosterCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const parent = canvas.parentElement;
    const width = Math.max(1, Math.round(rect.width || (parent && parent.clientWidth) || 320));
    const height = Math.max(1, Math.round(rect.height || (parent && parent.clientHeight) || 180));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width, height };
  }

  function paintPosterCanvas(canvas, id) {
    if (!canvas || !canvas.isConnected) return;
    const seed = hashId(id);
    const rand = seededRandom(seed);
    const palette = colorSet(seed);
    const fitted = fitPosterCanvas(canvas);
    if (!fitted) return;
    const { ctx, width, height } = fitted;
    const mode = seed % 5;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#050607';
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, withAlpha(palette[0], 0.22));
    gradient.addColorStop(0.46, 'rgba(255,255,255,0.02)');
    gradient.addColorStop(1, withAlpha(palette[1], 0.18));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = 'lighter';
    if (mode === 0) {
      for (let i = 0; i < 46; i++) {
        const x = rand() * width;
        const y = rand() * height;
        const len = 18 + rand() * Math.min(width, height) * 0.24;
        const angle = rand() * Math.PI * 2;
        ctx.strokeStyle = withAlpha(palette[i % palette.length], 0.22 + rand() * 0.25);
        ctx.lineWidth = 0.7 + rand() * 1.7;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        ctx.stroke();
      }
    } else if (mode === 1) {
      const step = Math.max(12, Math.min(width, height) / 9);
      for (let y = -step; y < height + step; y += step) {
        ctx.strokeStyle = withAlpha(palette[Math.floor(rand() * palette.length)], 0.16);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (let x = -step; x < width + step; x += step / 2) {
          const wave = Math.sin(x * 0.025 + y * 0.016 + rand() * 1.2) * step * 0.35;
          if (x <= -step) ctx.moveTo(x, y + wave);
          else ctx.lineTo(x, y + wave);
        }
        ctx.stroke();
      }
    } else if (mode === 2) {
      const cols = 16;
      const rows = Math.max(7, Math.round(cols * height / Math.max(width, 1)));
      const cellW = width / cols;
      const cellH = height / rows;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (rand() < 0.42) continue;
          ctx.fillStyle = withAlpha(palette[(x + y + seed) % palette.length], 0.12 + rand() * 0.28);
          ctx.fillRect(x * cellW, y * cellH, Math.ceil(cellW) - 1, Math.ceil(cellH) - 1);
        }
      }
    } else if (mode === 3) {
      for (let i = 0; i < 15; i++) {
        const radius = (0.08 + rand() * 0.52) * Math.min(width, height);
        const x = rand() * width;
        const y = rand() * height;
        ctx.strokeStyle = withAlpha(palette[i % palette.length], 0.14 + rand() * 0.18);
        ctx.lineWidth = 1 + rand() * 2.8;
        ctx.beginPath();
        ctx.arc(x, y, radius, rand() * Math.PI, rand() * Math.PI + Math.PI * (0.65 + rand()));
        ctx.stroke();
      }
    } else {
      const points = Array.from({ length: 36 }, () => [rand() * width, rand() * height]);
      ctx.strokeStyle = withAlpha(palette[1], 0.2);
      ctx.lineWidth = 0.8;
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i][0] - points[j][0];
          const dy = points[i][1] - points[j][1];
          const dist = Math.hypot(dx, dy);
          if (dist < Math.min(width, height) * 0.26) {
            ctx.globalAlpha = Math.max(0, 0.28 - dist / Math.min(width, height));
            ctx.beginPath();
            ctx.moveTo(points[i][0], points[i][1]);
            ctx.lineTo(points[j][0], points[j][1]);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      points.forEach((point, index) => {
        ctx.fillStyle = withAlpha(palette[index % palette.length], 0.58);
        ctx.beginPath();
        ctx.arc(point[0], point[1], 1.2 + rand() * 2.4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.globalCompositeOperation = 'source-over';
    const shade = ctx.createLinearGradient(0, 0, 0, height);
    shade.addColorStop(0, 'rgba(0,0,0,0.08)');
    shade.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);
  }

  function queuePosterPaint(frame, canvas, id) {
    clearTimeout(posterTimers.get(frame));
    requestAnimationFrame(() => paintPosterCanvas(canvas, id));
    posterTimers.set(frame, setTimeout(() => paintPosterCanvas(canvas, id), 180));
  }

  function drawPoster(frame) {
    if (!frame) return null;
    const id = previewIdFor(frame);
    let canvas = frame.querySelector('.cc-preview-poster');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'cc-preview-poster';
      canvas.setAttribute('aria-hidden', 'true');
      frame.insertBefore(canvas, frame.firstChild);
    }
    queuePosterPaint(frame, canvas, id);
    return canvas;
  }

  function paintAll(root, selector) {
    const scope = root || document;
    const frames = Array.from(scope.querySelectorAll(selector || '.cc-preview-frame[data-src], .cc-preview-frame[data-iframe-src]'));
    frames.forEach(drawPoster);
    return frames.length;
  }

  function requestIdle(fn, timeout) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(fn, { timeout: timeout || 300 });
    } else {
      setTimeout(fn, Math.min(timeout || 180, 180));
    }
  }

  function setFrameTimer(frame, fn, delay) {
    const timer = setTimeout(() => {
      const timers = readyTimers.get(frame);
      if (timers) timers.delete(timer);
      fn();
    }, delay);
    let timers = readyTimers.get(frame);
    if (!timers) {
      timers = new Set();
      readyTimers.set(frame, timers);
    }
    timers.add(timer);
    return timer;
  }

  function clearReadyTimers(frame) {
    const timers = readyTimers.get(frame);
    if (!timers) return;
    timers.forEach(clearTimeout);
    readyTimers.delete(frame);
  }

  function dispatchFrameResize(iframe) {
    try { iframe.contentWindow.dispatchEvent(new Event('resize')); } catch (_) {}
  }

  function revealWhenReady(frame, iframe, attempt) {
    const nextAttempt = attempt || 0;
    if (!frame.isConnected || !iframe.isConnected) return;
    dispatchFrameResize(iframe);
    if (nextAttempt >= READY_PULSES) {
      iframe.classList.add('if-ready');
      frame.classList.add('is-ready');
      frame.classList.remove('is-loading');
      return;
    }
    setFrameTimer(frame, () => revealWhenReady(frame, iframe, nextAttempt + 1), READY_PULSE_MS);
  }

  function buildIframe(frame) {
    const src = frame.dataset.src || frame.dataset.iframeSrc;
    if (!src) return null;
    const id = previewIdFor(frame);

    const iframe = document.createElement('iframe');
    iframe.className = 'cc-preview-iframe';
    iframe.title = frame.dataset.title || frame.dataset.iframeTitle || id || 'artifact preview';
    iframe.src = versionedPreviewSrc(src);
    iframe.loading = 'eager';
    if ('fetchPriority' in iframe) iframe.fetchPriority = 'high';
    iframe.tabIndex = -1;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.addEventListener('load', () => {
      frame.classList.add('is-loaded');
      requestAnimationFrame(() => revealWhenReady(frame, iframe, 0));
      setFrameTimer(frame, () => dispatchFrameResize(iframe), SETTLE_RESIZE_MS);
    }, { once: true });
    return iframe;
  }

  function mountFrame(frame) {
    if (!frame || frame.querySelector('.cc-preview-iframe')) return null;
    drawPoster(frame);
    const iframe = buildIframe(frame);
    if (!iframe) return null;
    clearReadyTimers(frame);
    frame.classList.remove('is-loaded', 'is-ready');
    frame.classList.add('is-loading');
    frame.appendChild(iframe);
    return iframe;
  }

  function unmountFrame(frame) {
    const iframe = frame && frame.querySelector('.cc-preview-iframe');
    if (!iframe) return;
    clearReadyTimers(frame);
    iframe.src = 'about:blank';
    iframe.remove();
    frame.classList.remove('is-loading', 'is-loaded', 'is-ready');
  }

  function mountAll(root, selector) {
    const scope = root || document;
    const frames = Array.from(scope.querySelectorAll(selector || '.cc-preview-frame[data-src], .cc-preview-frame[data-iframe-src]'));
    frames.forEach(mountFrame);
    return frames.length;
  }

  function createHydrator(options) {
    const config = Object.assign({
      selector: '.cc-preview-frame[data-src], .cc-preview-frame[data-iframe-src]',
      batchSize: 6,
      idleTimeout: 80,
      onMount: null,
    }, options || {});

    const pending = new Set();
    let drainScheduled = false;

    function drain() {
      drainScheduled = false;
      let mounted = 0;
      for (const frame of pending) {
        if (mounted >= config.batchSize) break;
        pending.delete(frame);
        if (!frame.isConnected || frame.querySelector('.cc-preview-iframe')) continue;
        const iframe = mountFrame(frame);
        if (iframe) {
          mounted++;
          if (typeof config.onMount === 'function') config.onMount(frame, iframe);
        }
      }
      if (pending.size) scheduleDrain();
    }

    function scheduleDrain() {
      if (drainScheduled) return;
      drainScheduled = true;
      requestIdle(drain, config.idleTimeout);
    }

    function observe(root) {
      const scope = root || document;
      pending.clear();
      paintAll(scope, config.selector);
      scope.querySelectorAll(config.selector).forEach((frame) => {
        if (!frame.querySelector('.cc-preview-iframe')) pending.add(frame);
      });
      scheduleDrain();
    }

    function hydrateNow(root) {
      return mountAll(root || document, config.selector);
    }

    return {
      observe,
      hydrateNow,
      mountFrame,
      unmountFrame,
      pendingCount: () => pending.size,
    };
  }

  window.CCPreviews = {
    drawPoster,
    paintAll,
    buildIframe,
    mountFrame,
    mountAll,
    unmountFrame,
    createHydrator,
  };
})();
