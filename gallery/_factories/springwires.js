export function mountSpringWires({ canvas }) {
  const ctx = canvas.getContext('2d');
  const isTouch = window.matchMedia('(pointer:coarse)').matches;
  const damping = 0.985;
  const gravity = 0.08;
  const springRest = 110;
  const springK = 0.04;
  const nodeRadius = 8;
  const springIters = isTouch ? 3 : 5;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let nodes = [];
  let edges = [];
  let dragging = null;
  let dragOffX = 0;
  let dragOffY = 0;
  let mouseX = 0;
  let mouseY = 0;
  let lastTapAt = 0;
  let rafId = 0;
  let resizeTimer = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeGrid() {
    nodes = [];
    edges = [];
    const spacingX = isTouch ? 160 : 130;
    const spacingY = isTouch ? 145 : 120;
    const cols = Math.max(2, Math.floor(width / (isTouch ? 170 : 140)));
    const rows = Math.max(2, Math.floor(height / (isTouch ? 160 : 130)));
    const padX = (width - (cols - 1) * spacingX) / 2;
    const padY = (height - (rows - 1) * spacingY) / 2;

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const jx = (Math.random() - 0.5) * 20;
        const jy = (Math.random() - 0.5) * 20;
        const x = padX + c * spacingX + jx;
        const y = padY + r * spacingY + jy;
        nodes.push({ x, y, px: x, py: y, pinned: r === 0, hue: (c / cols) * 300 });
      }
    }

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const i = r * cols + c;
        if (c < cols - 1) edges.push([i, i + 1]);
        if (r < rows - 1) edges.push([i, i + cols]);
        if (c < cols - 1 && r < rows - 1) {
          edges.push([i, i + cols + 1]);
          edges.push([i + 1, i + cols]);
        }
      }
    }
  }

  function step() {
    for (const n of nodes) {
      if (n.pinned) continue;
      const vx = (n.x - n.px) * damping;
      const vy = (n.y - n.py) * damping;
      n.px = n.x;
      n.py = n.y;
      n.x += vx;
      n.y += vy + gravity;
      if (n.y > height - 5) {
        n.y = height - 5;
        n.py = n.y + vy * 0.3;
      }
      if (n.x < 5) {
        n.x = 5;
        n.px = n.x + vx * 0.3;
      }
      if (n.x > width - 5) {
        n.x = width - 5;
        n.px = n.x + vx * 0.3;
      }
    }

    for (let iter = 0; iter < springIters; iter += 1) {
      for (const [ai, bi] of edges) {
        const a = nodes[ai];
        const b = nodes[bi];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const delta = (dist - springRest) * springK;
        const fx = (dx / dist) * delta;
        const fy = (dy / dist) * delta;
        if (!a.pinned) {
          a.x += fx;
          a.y += fy;
        }
        if (!b.pinned) {
          b.x -= fx;
          b.y -= fy;
        }
      }
    }

    if (dragging !== null) {
      const n = nodes[dragging];
      n.x = mouseX + dragOffX;
      n.y = mouseY + dragOffY;
      n.px = n.x;
      n.py = n.y;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const timeHue = performance.now() * 0.02;

    for (const [ai, bi] of edges) {
      const a = nodes[ai];
      const b = nodes[bi];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const stretch = Math.max(0, dist / springRest - 1);
      const hue = ((a.hue + b.hue) / 2 + timeHue) % 360;
      const alpha = Math.max(0.15, 0.7 - stretch * 1.5);
      const lw = Math.max(0.5, 1.8 - stretch * 2);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `hsla(${hue},80%,60%,${alpha * 0.3})`;
      ctx.lineWidth = lw * 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `hsla(${hue},85%,70%,${alpha})`;
      ctx.lineWidth = lw;
      ctx.stroke();
    }

    for (const n of nodes) {
      const hue = (n.hue + timeHue) % 360;
      ctx.beginPath();
      ctx.arc(n.x, n.y, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = n.pinned ? `hsla(${hue},60%,90%,0.95)` : `hsla(${hue},80%,65%,0.9)`;
      ctx.shadowColor = `hsla(${hue},90%,60%,0.7)`;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
      if (n.pinned) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fill();
      }
    }
  }

  function loop() {
    step();
    draw();
    rafId = window.requestAnimationFrame(loop);
  }

  function nodeAt(x, y) {
    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      if (Math.hypot(n.x - x, n.y - y) < nodeRadius * 2) return i;
    }
    return -1;
  }

  function scheduleRebuild(delay) {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resize();
      makeGrid();
    }, delay);
  }

  function onPointerDown(event) {
    event.preventDefault();
    mouseX = event.clientX;
    mouseY = event.clientY;
    const idx = nodeAt(event.clientX, event.clientY);
    if (idx >= 0) {
      dragging = idx;
      dragOffX = nodes[idx].x - event.clientX;
      dragOffY = nodes[idx].y - event.clientY;
      canvas.setPointerCapture(event.pointerId);
    }
  }

  function onPointerMove(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
  }

  function onPointerUp(event) {
    const wasDragging = dragging !== null;
    dragging = null;
    if (!wasDragging) {
      const idx = nodeAt(event.clientX, event.clientY);
      if (idx >= 0) nodes[idx].pinned = !nodes[idx].pinned;
    }
    const now = performance.now();
    if (now - lastTapAt < 280) {
      const nx = event.clientX;
      const ny = event.clientY;
      const newIdx = nodes.length;
      nodes.push({ x: nx, y: ny, px: nx + Math.random() * 2 - 1, py: ny - 5, pinned: false, hue: Math.random() * 360 });
      const dists = nodes.slice(0, -1).map((n, i) => ({ i, d: Math.hypot(n.x - nx, n.y - ny) }));
      dists.sort((a, b) => a.d - b.d);
      for (let k = 0; k < Math.min(3, dists.length); k += 1) edges.push([newIdx, dists[k].i]);
    }
    lastTapAt = now;
  }

  function clearDragging() {
    dragging = null;
  }

  const onResize = () => scheduleRebuild(120);
  const onOrientationChange = () => scheduleRebuild(200);

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onOrientationChange);
  window.visualViewport?.addEventListener('resize', onResize);
  canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', clearDragging);

  window.requestAnimationFrame(() => {
    resize();
    window.setTimeout(() => {
      resize();
      makeGrid();
    }, 200);
    makeGrid();
  });
  loop();

  return () => {
    window.cancelAnimationFrame(rafId);
    window.clearTimeout(resizeTimer);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onOrientationChange);
    window.visualViewport?.removeEventListener('resize', onResize);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', clearDragging);
  };
}
