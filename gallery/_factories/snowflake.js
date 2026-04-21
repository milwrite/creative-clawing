export function mountSnowflake({
  canvas,
  sliderB,
  sliderC,
  sliderSpeed,
  valueB,
  valueC,
  valueSpeed,
  stepCount,
  preset,
  resetButton,
}) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const isMobile = ('ontouchstart' in window) || window.innerWidth < 600;
  const size = isMobile ? 201 : 401;
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);

  const PRESETS = {
    dendrite: { b: 0.35, c: 0.001 },
    stellar: { b: 0.50, c: 0.003 },
    plate: { b: 0.70, c: 0.05 },
    sector: { b: 0.60, c: 0.02 },
    fern: { b: 0.40, c: 0.005 },
  };

  let width = 0;
  let height = 0;
  let grid;
  let frozen;
  let frozenStep;
  let stepNum = 0;
  let paramB = 0;
  let paramC = 0;
  let stepsPerFrame = 10;
  let done = false;
  let imgData = null;
  let rafId = 0;

  function hexNeighbors(r, c) {
    if (r & 1) return [[r - 1, c], [r - 1, c + 1], [r, c - 1], [r, c + 1], [r + 1, c], [r + 1, c + 1]];
    return [[r - 1, c - 1], [r - 1, c], [r, c - 1], [r, c + 1], [r + 1, c - 1], [r + 1, c]];
  }

  function init() {
    grid = new Float64Array(size * size);
    frozen = new Uint8Array(size * size);
    frozenStep = new Uint16Array(size * size);
    stepNum = 0;
    done = false;

    paramB = parseFloat(sliderB.value);
    paramC = parseFloat(sliderC.value);
    stepsPerFrame = parseInt(sliderSpeed.value, 10);
    valueB.textContent = paramB.toFixed(2);
    valueC.textContent = paramC.toFixed(3);
    valueSpeed.textContent = String(stepsPerFrame);
    stepCount.textContent = 'step 0';

    grid.fill(paramB);
    const centerIndex = cy * size + cx;
    grid[centerIndex] = 1.0;
    frozen[centerIndex] = 1;
    frozenStep[centerIndex] = 0;
  }

  function step() {
    if (done) return;
    const receptive = new Uint8Array(size * size);

    for (let r = 1; r < size - 1; r += 1) {
      for (let c = 1; c < size - 1; c += 1) {
        const i = r * size + c;
        if (frozen[i]) {
          receptive[i] = 1;
          continue;
        }
        const neighbors = hexNeighbors(r, c);
        for (let k = 0; k < 6; k += 1) {
          const [nr, nc] = neighbors[k];
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && frozen[nr * size + nc]) {
            receptive[i] = 1;
            break;
          }
        }
      }
    }

    const newGrid = new Float64Array(size * size);
    for (let r = 1; r < size - 1; r += 1) {
      for (let c = 1; c < size - 1; c += 1) {
        const i = r * size + c;
        if (receptive[i]) {
          newGrid[i] = grid[i] + paramC;
          continue;
        }
        const neighbors = hexNeighbors(r, c);
        let sum = 0;
        let count = 0;
        for (let k = 0; k < 6; k += 1) {
          const [nr, nc] = neighbors[k];
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            if (!receptive[nr * size + nc]) sum += grid[nr * size + nc];
            count += 1;
          }
        }
        newGrid[i] = (grid[i] + sum / Math.max(count, 1)) / 2;
      }
    }

    for (let r = 1; r < size - 1; r += 1) {
      for (let c = 1; c < size - 1; c += 1) {
        const i = r * size + c;
        if (!frozen[i] && newGrid[i] >= 1.0) {
          frozen[i] = 1;
          frozenStep[i] = stepNum;
        }
      }
    }

    const margin = 5;
    for (let r = 0; r < size; r += 1) {
      if (frozen[r * size + margin] || frozen[r * size + (size - 1 - margin)]) {
        done = true;
        break;
      }
    }
    if (!done) {
      for (let c = 0; c < size; c += 1) {
        if (frozen[margin * size + c] || frozen[(size - 1 - margin) * size + c]) {
          done = true;
          break;
        }
      }
    }

    grid = newGrid;
    stepNum += 1;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    if (!width || !height) return;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    imgData = null;
  }

  function iceColor(age, maxStep) {
    const t = maxStep > 0 ? age / maxStep : 0;
    const r = Math.floor(40 + 215 * t * t);
    const g = Math.floor(80 + 175 * t);
    const b = Math.floor(140 + 115 * t);
    return [Math.min(r, 255), Math.min(g, 255), Math.min(b, 255)];
  }

  function render() {
    const cellSize = Math.min(width / size, height / size) * dpr;
    const imgW = canvas.width;
    const imgH = canvas.height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#040810';
    ctx.fillRect(0, 0, imgW, imgH);

    if (!imgData || imgData.width !== imgW || imgData.height !== imgH) {
      imgData = ctx.createImageData(imgW, imgH);
    }
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 4;
      data[i + 1] = 8;
      data[i + 2] = 16;
      data[i + 3] = 255;
    }

    const maxStep = Math.max(stepNum, 1);
    const offX = (imgW - size * cellSize) / 2;
    const offY = (imgH - size * cellSize) / 2;

    for (let r = 0; r < size; r += 1) {
      const rowOff = (r & 1) ? cellSize * 0.5 : 0;
      for (let c = 0; c < size; c += 1) {
        const i = r * size + c;
        let cr;
        let cg;
        let cb;
        if (frozen[i]) {
          [cr, cg, cb] = iceColor(frozenStep[i], maxStep);
        } else {
          const vapor = grid[i];
          if (vapor <= 0.01) continue;
          const intensity = Math.min(vapor / paramB, 1) * 0.15;
          cr = Math.floor(4 + 20 * intensity);
          cg = Math.floor(8 + 30 * intensity);
          cb = Math.floor(16 + 50 * intensity);
        }

        const px = Math.floor(offX + c * cellSize + rowOff);
        const py = Math.floor(offY + r * cellSize);
        const sz = Math.max(1, Math.ceil(cellSize));

        for (let dy = 0; dy < sz && (py + dy) < imgH; dy += 1) {
          if (py + dy < 0) continue;
          for (let dx = 0; dx < sz && (px + dx) < imgW; dx += 1) {
            if (px + dx < 0) continue;
            const pi = ((py + dy) * imgW + (px + dx)) * 4;
            data[pi] = cr;
            data[pi + 1] = cg;
            data[pi + 2] = cb;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stepCount.textContent = `step ${stepNum}`;
  }

  function frame() {
    for (let i = 0; i < stepsPerFrame; i += 1) step();
    render();
    rafId = window.requestAnimationFrame(frame);
  }

  function applyPreset() {
    const next = PRESETS[preset.value];
    if (!next) return;
    sliderB.value = String(next.b);
    sliderC.value = String(next.c);
    init();
  }

  function onBInput() {
    paramB = parseFloat(sliderB.value);
    valueB.textContent = paramB.toFixed(2);
  }

  function onCInput() {
    paramC = parseFloat(sliderC.value);
    valueC.textContent = paramC.toFixed(3);
  }

  function onSpeedInput() {
    stepsPerFrame = parseInt(sliderSpeed.value, 10);
    valueSpeed.textContent = String(stepsPerFrame);
  }

  function onOrientationChange() {
    window.requestAnimationFrame(resize);
  }

  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  window.addEventListener('orientationchange', onOrientationChange);
  sliderB.addEventListener('input', onBInput);
  sliderC.addEventListener('input', onCInput);
  sliderSpeed.addEventListener('input', onSpeedInput);
  preset.addEventListener('change', applyPreset);
  resetButton.addEventListener('click', init);

  window.requestAnimationFrame(() => {
    resize();
    init();
    if (window.self !== window.top) {
      for (let i = 0; i < 800; i += 1) step();
    }
    frame();
  });

  return () => {
    window.cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    window.visualViewport?.removeEventListener('resize', resize);
    window.removeEventListener('orientationchange', onOrientationChange);
    sliderB.removeEventListener('input', onBInput);
    sliderC.removeEventListener('input', onCInput);
    sliderSpeed.removeEventListener('input', onSpeedInput);
    preset.removeEventListener('change', applyPreset);
    resetButton.removeEventListener('click', init);
  };
}
