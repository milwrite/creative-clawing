(function () {
  const READY_PULSES = 2;
  const READY_PULSE_MS = 70;
  const SETTLE_RESIZE_MS = 220;
  const readyTimers = new WeakMap();

  function idFromGallerySrc(src) {
    const match = String(src || '').match(/(?:^|\/)gallery\/([^/?#]+)\.html/);
    return match ? decodeURIComponent(match[1]) : '';
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
    const id = frame.dataset.previewId || idFromGallerySrc(src);
    if (id) frame.dataset.previewId = id;

    const iframe = document.createElement('iframe');
    iframe.className = 'cc-preview-iframe';
    iframe.title = frame.dataset.title || frame.dataset.iframeTitle || id || 'artifact preview';
    iframe.src = src;
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
      root: null,
      rootMargin: '420px',
      batchSize: 8,
      idleTimeout: 180,
      eject: false,
    }, options || {});

    const pending = new Set();
    let observer = null;
    let drainScheduled = false;

    function drain() {
      drainScheduled = false;
      let mounted = 0;
      for (const frame of pending) {
        if (mounted >= config.batchSize) break;
        pending.delete(frame);
        if (!frame.isConnected || frame.querySelector('.cc-preview-iframe')) continue;
        if (mountFrame(frame)) mounted++;
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
      if (observer) observer.disconnect();
      pending.clear();
      if (!('IntersectionObserver' in window)) {
        mountAll(scope, config.selector);
        return;
      }
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const frame = entry.target;
          if (entry.isIntersecting) {
            if (!frame.querySelector('.cc-preview-iframe')) {
              pending.add(frame);
              scheduleDrain();
            }
          } else {
            pending.delete(frame);
            if (config.eject) unmountFrame(frame);
          }
        });
      }, { root: config.root, rootMargin: config.rootMargin });

      scope.querySelectorAll(config.selector).forEach((frame) => {
        observer.observe(frame);
      });
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
    buildIframe,
    mountFrame,
    mountAll,
    unmountFrame,
    createHydrator,
  };
})();
