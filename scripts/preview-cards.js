(function () {
  const PREVIEW_BASE = '/assets/previews/';
  const PREVIEW_EXT = '.jpg';

  function escapeAttr(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function idFromGallerySrc(src) {
    const match = String(src || '').match(/(?:^|\/)gallery\/([^/?#]+)\.html/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function previewSrc(id) {
    return PREVIEW_BASE + encodeURIComponent(id) + PREVIEW_EXT;
  }

  function imageHTML(id, title, loading) {
    const safeId = escapeAttr(id);
    return `<img class="cc-preview-img" src="${previewSrc(id)}" alt="" decoding="async" loading="${loading || 'eager'}" draggable="false" data-preview-img="${safeId}" aria-hidden="true">`;
  }

  function ensureImage(frame) {
    if (!frame || frame.querySelector('.cc-preview-img')) return;
    const src = frame.dataset.src || frame.dataset.iframeSrc || '';
    const id = frame.dataset.previewId || idFromGallerySrc(src);
    if (!id) return;
    frame.dataset.previewId = id;
    const img = document.createElement('img');
    img.className = 'cc-preview-img';
    img.src = previewSrc(id);
    img.alt = '';
    img.decoding = 'async';
    img.loading = frame.dataset.previewLoading || 'eager';
    img.draggable = false;
    img.dataset.previewImg = id;
    img.setAttribute('aria-hidden', 'true');
    frame.insertBefore(img, frame.firstChild);
  }

  function requestIdle(fn, timeout) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(fn, { timeout: timeout || 300 });
    } else {
      setTimeout(fn, Math.min(timeout || 180, 180));
    }
  }

  function revealWhenPainted(iframe, attempt) {
    const nextAttempt = attempt || 0;
    try { iframe.contentWindow.dispatchEvent(new Event('resize')); } catch (_) {}
    if (nextAttempt >= 3) {
      iframe.classList.add('if-ready');
      return;
    }
    setTimeout(() => revealWhenPainted(iframe, nextAttempt + 1), 120);
  }

  function buildIframe(frame) {
    const src = frame.dataset.src || frame.dataset.iframeSrc;
    if (!src) return null;
    const iframe = document.createElement('iframe');
    iframe.className = 'cc-preview-iframe';
    iframe.title = frame.dataset.title || frame.dataset.iframeTitle || '';
    iframe.src = src;
    iframe.loading = 'eager';
    iframe.tabIndex = -1;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.addEventListener('load', () => {
      setTimeout(() => revealWhenPainted(iframe, 0), 80);
      setTimeout(() => {
        try { iframe.contentWindow.dispatchEvent(new Event('resize')); } catch (_) {}
      }, 400);
    }, { once: true });
    return iframe;
  }

  function createHydrator(options) {
    const config = Object.assign({
      selector: '.cc-preview-frame[data-src], .cc-preview-frame[data-iframe-src]',
      root: null,
      rootMargin: '360px',
      maxLive: 18,
      batchSize: 4,
      idleTimeout: 260,
      eject: true,
    }, options || {});

    const live = new Set();
    const pending = new Set();
    let drainScheduled = false;
    let observer = null;

    function inject(frame) {
      ensureImage(frame);
      if (frame.querySelector('.cc-preview-iframe')) return;
      if (live.size >= config.maxLive) {
        pending.add(frame);
        return;
      }
      pending.delete(frame);
      const iframe = buildIframe(frame);
      if (!iframe) return;
      frame.appendChild(iframe);
      live.add(frame);
    }

    function drain() {
      drainScheduled = false;
      let loaded = 0;
      for (const frame of pending) {
        if (live.size >= config.maxLive || loaded >= config.batchSize) break;
        pending.delete(frame);
        inject(frame);
        loaded++;
      }
      if (pending.size && live.size < config.maxLive) scheduleDrain();
    }

    function scheduleDrain() {
      if (drainScheduled) return;
      drainScheduled = true;
      requestIdle(drain, config.idleTimeout);
    }

    function eject(frame) {
      const iframe = frame.querySelector('.cc-preview-iframe');
      if (!iframe) return;
      iframe.src = 'about:blank';
      iframe.remove();
      live.delete(frame);
      scheduleDrain();
    }

    function observe(root) {
      const scope = root || document;
      if (observer) observer.disconnect();
      live.clear();
      pending.clear();
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const frame = entry.target;
          ensureImage(frame);
          if (entry.isIntersecting) {
            pending.add(frame);
            scheduleDrain();
          } else {
            pending.delete(frame);
            if (config.eject) eject(frame);
          }
        });
      }, { root: config.root, rootMargin: config.rootMargin });

      scope.querySelectorAll(config.selector).forEach((frame) => {
        ensureImage(frame);
        observer.observe(frame);
      });
    }

    function hydrateNow(root) {
      const scope = root || document;
      scope.querySelectorAll(config.selector).forEach(inject);
      scheduleDrain();
    }

    return {
      observe,
      hydrateNow,
      inject,
      eject,
      liveCount: () => live.size,
      pendingCount: () => pending.size,
    };
  }

  window.CCPreviews = {
    imageHTML,
    previewSrc,
    ensureImage,
    buildIframe,
    createHydrator,
  };
})();
