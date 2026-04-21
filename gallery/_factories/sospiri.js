export function mountSospiri({ canvas }) {
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let dpr = 1;
  let px = null;
  let py = null;
  let maxParticles = 220;
  let breathPhase = 0;
  let lastT = 0;
  let rafId = 0;

  const breathPeriod = 6.0;
  const particles = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const area = width * height;
    maxParticles = Math.max(120, Math.min(280, Math.round(area / 7000)));
  }

  function lerpColor(t) {
    const clamped = Math.max(0, Math.min(1, t));
    let r;
    let g;
    let b;
    if (clamped < 0.25) {
      const s = clamped / 0.25;
      r = 180 - s * 140;
      g = 140 - s * 110;
      b = 60 + s * 120;
    } else if (clamped < 0.6) {
      const s = (clamped - 0.25) / 0.35;
      r = 40 + s * 100;
      g = 30 - s * 10;
      b = 180 + s * 40;
    } else {
      const s = (clamped - 0.6) / 0.4;
      r = 140 + s * 100;
      g = 20 + s * 130;
      b = 220 - s * 40;
    }
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
  }

  function spawn() {
    return {
      x: width / 2 + (Math.random() - 0.5) * width * 0.3,
      y: height + 5,
      phaseOffset: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.3,
      baseSpeed: 0.15 + Math.random() * 0.25,
      ceiling: 0.08 + Math.random() * 0.15,
      radius: 1.2 + Math.random() * 2.5,
      age: 0,
      waveAmp: 8 + Math.random() * 20,
      waveFreq: 0.5 + Math.random() * 1.5,
      maxAge: 7 + Math.random() * 3,
    };
  }

  function loop(timestamp) {
    if (!lastT) lastT = timestamp;
    const dt = Math.min((timestamp - lastT) / 1000, 0.05);
    lastT = timestamp;

    breathPhase += (dt / breathPeriod) * Math.PI * 2;
    const breathMul = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(breathPhase));
    const spawnCount = Math.floor((2 + 6 * breathMul) * dt * 60);
    for (let i = 0; i < spawnCount && particles.length < maxParticles; i += 1) particles.push(spawn());

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.age += dt;
      const hf = 1 - p.y / height;
      const cp = Math.max(0, hf / (1 - p.ceiling));
      const af = 1 - cp * cp;
      p.y -= p.baseSpeed * breathMul * Math.max(0.02, af) * 60 * dt;
      p.x += (Math.sin(p.age * p.waveFreq + p.phaseOffset) * p.waveAmp * 0.02 + p.drift) * dt * 60;

      if (px != null) {
        const dx = px - p.x;
        const dy = py - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        const pull = Math.min(1, 120 / dist) * 0.08;
        p.x += dx * pull * dt;
        p.y += dy * pull * dt;
      }

      let alpha = 1;
      if (p.age < 1) alpha *= p.age;
      if (cp > 0.7) alpha *= 1 - (cp - 0.7) / 0.3;
      if (p.age > p.maxAge - 2) alpha *= (p.maxAge - p.age) / 2;

      if (p.age > p.maxAge || alpha <= 0.01) {
        particles.splice(i, 1);
        continue;
      }
      p._a = Math.max(0, Math.min(1, alpha));
      p._hf = hf;
    }

    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#080812');
    bg.addColorStop(0.7, '#0a0a18');
    bg.addColorStop(1, '#12100a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width / 2, height * 1.05, 0, width / 2, height * 1.05, height * 0.6);
    glow.addColorStop(0, 'rgba(160,120,50,0.08)');
    glow.addColorStop(0.5, 'rgba(100,60,30,0.03)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    particles.sort((a, b) => b.radius - a.radius);
    for (const p of particles) {
      const col = lerpColor(p._hf);
      const alpha = p._a * 0.75;
      const glowRadius = p.radius * 4;
      const gd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
      gd.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${alpha * 0.5})`);
      gd.addColorStop(0.4, `rgba(${col.r},${col.g},${col.b},${alpha * 0.15})`);
      gd.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0)`);
      ctx.fillStyle = gd;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    rafId = window.requestAnimationFrame(loop);
  }

  function onPointerMove(event) {
    px = event.clientX;
    py = event.clientY;
  }

  function clearPointer() {
    px = null;
    py = null;
  }

  function onTouch(event) {
    if (event.touches[0]) {
      px = event.touches[0].clientX;
      py = event.touches[0].clientY;
    }
  }

  const delayedResize = () => resize();
  const delayedOrientationResize = () => window.setTimeout(resize, 140);

  window.addEventListener('resize', delayedResize);
  window.addEventListener('orientationchange', delayedOrientationResize);
  window.visualViewport?.addEventListener('resize', delayedResize);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseleave', clearPointer);
  window.addEventListener('touchstart', onTouch, { passive: true });
  window.addEventListener('touchmove', onTouch, { passive: true });
  window.addEventListener('touchend', clearPointer, { passive: true });
  window.addEventListener('touchcancel', clearPointer, { passive: true });

  window.requestAnimationFrame(() => {
    resize();
    window.setTimeout(resize, 200);
    window.requestAnimationFrame(loop);
  });

  return () => {
    window.cancelAnimationFrame(rafId);
    window.removeEventListener('resize', delayedResize);
    window.removeEventListener('orientationchange', delayedOrientationResize);
    window.visualViewport?.removeEventListener('resize', delayedResize);
    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('mouseleave', clearPointer);
    window.removeEventListener('touchstart', onTouch);
    window.removeEventListener('touchmove', onTouch);
    window.removeEventListener('touchend', clearPointer);
    window.removeEventListener('touchcancel', clearPointer);
  };
}
