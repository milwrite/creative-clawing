export function mountMohr({ canvas, modeLabel }) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let width = 0;
  let height = 0;
  let modeIdx = 0;
  let t = 0;
  let rafId = 0;

  const verts4 = [];
  for (let i = 0; i < 16; i += 1) {
    verts4.push([
      (i & 1) ? 1 : -1,
      (i & 2) ? 1 : -1,
      (i & 4) ? 1 : -1,
      (i & 8) ? 1 : -1,
    ]);
  }

  const edges = [];
  for (let i = 0; i < 16; i += 1) {
    for (let j = i + 1; j < 16; j += 1) {
      const diff = i ^ j;
      if (diff && (diff & (diff - 1)) === 0) edges.push([i, j]);
    }
  }

  const MODES = [
    { planes: [['XZ', 0.0031], ['YW', 0.0047]], name: 'slow drift' },
    { planes: [['XW', 0.0055], ['YZ', 0.0039]], name: 'crossing planes' },
    { planes: [['XZ', 0.0088], ['XW', 0.0061]], name: 'coupled spin' },
    { planes: [['YW', 0.0029], ['ZW', 0.0073]], name: 'w-axis wander' },
  ];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width || window.innerWidth;
    height = rect.height || window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }

  function rot4(v, plane, angle) {
    const [x, y, z, w] = v;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    switch (plane) {
      case 'XY': return [x * c - y * s, x * s + y * c, z, w];
      case 'XZ': return [x * c - z * s, y, x * s + z * c, w];
      case 'XW': return [x * c - w * s, y, z, x * s + w * c];
      case 'YZ': return [x, y * c - z * s, y * s + z * c, w];
      case 'YW': return [x, y * c - w * s, z, y * s + w * c];
      case 'ZW': return [x, y, z * c - w * s, z * s + w * c];
      default: return v;
    }
  }

  function proj4to3(v, d4 = 2.8) {
    const [x, y, z, w] = v;
    const s = d4 / (d4 - w);
    return [x * s, y * s, z * s];
  }

  function proj3to2(v, d3 = 3.5) {
    const [x, y, z] = v;
    const s = d3 / (d3 - z);
    return [x * s, y * s, s];
  }

  function draw() {
    t += 1;
    const mode = MODES[modeIdx];
    const rotated = verts4.map((v) => {
      let r = v;
      for (const [plane, speed] of mode.planes) r = rot4(r, plane, t * speed);
      return r;
    });

    const scale = Math.min(width, height) * 0.32 * dpr;
    const cx = (width / 2) * dpr;
    const cy = (height / 2) * dpr;

    const pts2d = rotated.map((v) => {
      const v3 = proj4to3(v);
      const [px, py, ps] = proj3to2(v3);
      return { x: cx + px * scale, y: cy + py * scale, s: ps };
    });

    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const [a, b] of edges) {
      const pa = pts2d[a];
      const pb = pts2d[b];
      const avgS = (pa.s + pb.s) * 0.5;
      const alpha = Math.min(0.9, Math.max(0.08, (avgS - 0.5) * 0.7));
      const lw = Math.max(0.4 * dpr, (avgS - 0.4) * 1.1 * dpr);
      const bright = Math.round(140 + avgS * 55);
      ctx.strokeStyle = `rgba(${bright},${bright - 4},${bright - 10},${alpha})`;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }

    for (const p of pts2d) {
      const r = Math.max(1 * dpr, (p.s - 0.4) * 2.2 * dpr);
      const bright = Math.round(120 + p.s * 60);
      ctx.fillStyle = `rgba(${bright},${bright - 6},${bright - 14},${Math.min(0.85, (p.s - 0.5) * 1.2)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    rafId = window.requestAnimationFrame(draw);
  }

  function cycleMode() {
    modeIdx = (modeIdx + 1) % MODES.length;
    modeLabel.textContent = MODES[modeIdx].name;
  }

  function onTouchEnd(event) {
    event.preventDefault();
    cycleMode();
  }

  const delayedResize = () => { window.setTimeout(resize, 50); };
  const delayedOrientationResize = () => { window.setTimeout(resize, 200); };

  canvas.addEventListener('click', cycleMode);
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  window.addEventListener('resize', delayedResize);
  window.visualViewport?.addEventListener('resize', delayedResize);
  window.addEventListener('orientationchange', delayedOrientationResize);

  modeLabel.textContent = MODES[modeIdx].name;

  window.requestAnimationFrame(() => {
    resize();
    draw();
    window.setTimeout(resize, 200);
  });

  return () => {
    window.cancelAnimationFrame(rafId);
    canvas.removeEventListener('click', cycleMode);
    canvas.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('resize', delayedResize);
    window.visualViewport?.removeEventListener('resize', delayedResize);
    window.removeEventListener('orientationchange', delayedOrientationResize);
  };
}
