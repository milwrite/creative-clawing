export function mountMonteCarlo({ canvas, piValue, piError }) {
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let side = 0;
  let ox = 0;
  let oy = 0;
  let inside = 0;
  let total = 0;
  let frame = 0;
  let rafId = 0;
  let buffer;
  let bufferCtx;

  function drawFrame() {
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox, oy, side, side);

    ctx.beginPath();
    ctx.arc(ox + side / 2, oy + side / 2, side / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(126,232,250,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.drawImage(buffer, 0, 0);
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    side = Math.min(width, height) * 0.82;
    ox = (width - side) / 2;
    oy = (height - side) / 2;
    buffer = document.createElement('canvas');
    buffer.width = width;
    buffer.height = height;
    bufferCtx = buffer.getContext('2d');
    inside = 0;
    total = 0;
    frame = 0;
    piValue.textContent = '–';
    piError.textContent = 'waiting…';
    drawFrame();
  }

  function addPoints(count) {
    if (!bufferCtx) return;
    const radius = side / 2;
    const cx = ox + radius;
    const cy = oy + radius;
    for (let i = 0; i < count; i += 1) {
      const px = Math.random() * side + ox;
      const py = Math.random() * side + oy;
      const dx = px - cx;
      const dy = py - cy;
      const isIn = dx * dx + dy * dy <= radius * radius;
      if (isIn) inside += 1;
      total += 1;
      bufferCtx.fillStyle = isIn ? 'rgba(126,232,250,0.55)' : 'rgba(255,90,90,0.35)';
      bufferCtx.fillRect(px - 0.6, py - 0.6, 1.2, 1.2);
    }
  }

  function updateHUD() {
    if (total === 0) return;
    const approx = (4 * inside) / total;
    const err = Math.abs(approx - Math.PI);
    piValue.textContent = approx.toFixed(6);
    piError.textContent = `n=${total.toLocaleString()}   error=${err.toFixed(6)}   inside=${inside.toLocaleString()}`;
  }

  function loop() {
    const batch = total < 2000 ? 200 : total < 20000 ? 80 : total < 200000 ? 30 : 12;
    addPoints(batch);
    drawFrame();
    frame += 1;
    if (frame % 4 === 0) updateHUD();
    rafId = window.requestAnimationFrame(loop);
  }

  function onResetTouch(event) {
    event.preventDefault();
    resize();
  }

  function onOrientationChange() {
    window.requestAnimationFrame(resize);
  }

  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  window.addEventListener('orientationchange', onOrientationChange);
  window.addEventListener('click', resize);
  window.addEventListener('touchend', onResetTouch, { passive: false });

  window.requestAnimationFrame(() => {
    resize();
    loop();
  });

  return () => {
    window.cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    window.visualViewport?.removeEventListener('resize', resize);
    window.removeEventListener('orientationchange', onOrientationChange);
    window.removeEventListener('click', resize);
    window.removeEventListener('touchend', onResetTouch);
  };
}
