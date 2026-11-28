/* Progressive, reduced-motion-aware enhancement for city pages and the city hub. */
(() => {
  const motionOff = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (motionOff || !('IntersectionObserver' in window)) return;
  const targets = [...document.querySelectorAll('.city-page .area-card,.city-page .listing-card,.city-page .stat,.city-hub .city-card')];
  if (!targets.length) return;
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('sh-visible');
      if (el.classList.contains('stat')) {
        const number = el.querySelector('b');
        if (number && !number.dataset.counted) {
          const raw = number.textContent.trim();
          const target = Number(raw.replace(/,/g, ''));
          if (Number.isFinite(target) && target >= 0 && target <= 1000000 && /^\d[\d,]*$/.test(raw)) {
            number.dataset.counted = 'true';
            const start = performance.now();
            const duration = 650;
            const frame = now => {
              const progress = Math.min(1, (now - start) / duration);
              number.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3))).toLocaleString('en-IN');
              if (progress < 1) requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
          }
        }
      }
      obs.unobserve(el);
    });
  }, { threshold: 0.12 });
  targets.forEach((el, index) => {
    el.style.setProperty('--sh-reveal-delay', (index % 5) * 60 + 'ms');
    observer.observe(el);
  });
  document.documentElement.classList.add('sh-motion-ready');
})();
