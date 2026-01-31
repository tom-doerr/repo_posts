(() => {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  const cards = Array.from(document.querySelectorAll('article.post'));
  if (!cards.length) return;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const MAX_RX = 10;   // deg
  const MAX_RY = 14;   // deg
  const WARP_MS = 240; // keep tiny so it feels snappy

  for (const card of cards) {
    let raf = 0;
    let last = null;

    const applyTilt = () => {
      raf = 0;
      if (!last) return;
      const e = last;
      // Ignore touch drags; the effect feels bad without hover intent.
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const r = card.getBoundingClientRect();
      if (!r.width || !r.height) return;

      const px = (e.clientX - r.left) / r.width;   // 0..1
      const py = (e.clientY - r.top) / r.height;   // 0..1
      const rx = clamp((0.5 - py) * MAX_RX * 2, -MAX_RX, MAX_RX);
      const ry = clamp((px - 0.5) * MAX_RY * 2, -MAX_RY, MAX_RY);

      card.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      card.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      card.classList.add('is-tilting');
    };

    const resetTilt = () => {
      last = null;
      card.classList.remove('is-tilting', 'is-pressed');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    };

    card.addEventListener('pointermove', (e) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(applyTilt);
    });
    card.addEventListener('pointerleave', resetTilt);
    card.addEventListener('pointercancel', resetTilt);
    card.addEventListener('pointerdown', () => card.classList.add('is-pressed'));
    card.addEventListener('pointerup', () => card.classList.remove('is-pressed'));

    // Warp on internal navigation clicks (stretched-link / image link).
    card.addEventListener('click', (e) => {
      if (reduce) return;
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href) return;

      let url;
      try { url = new URL(href, location.href); } catch (_) { return; }
      if (url.origin !== location.origin) return;
      // Don't fight explicit new-tab behavior.
      const target = (a.getAttribute('target') || '').toLowerCase();
      if (target === '_blank') return;

      e.preventDefault();

      const sgn = Math.random() < 0.5 ? -1 : 1;
      const warpRy = sgn * (14 + Math.random() * 12);
      const warpRx = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6);
      card.style.setProperty('--warp-ry', warpRy.toFixed(1) + 'deg');
      card.style.setProperty('--warp-rx', warpRx.toFixed(1) + 'deg');
      card.classList.add('warp-out');

      window.setTimeout(() => { location.href = url.href; }, WARP_MS);
    }, true);
  }
})();
