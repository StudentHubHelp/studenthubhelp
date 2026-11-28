/* Progressive, reduced-motion-aware enhancement for the 12 city pages and city hub. */
(() => {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !('IntersectionObserver' in window)) return;

  const selector = [
    '.city-page .area-card',
    '.city-page .listing-card',
    '.city-page .stat',
    '.city-page .guide-card',
    '.city-page .map-card',
    '.city-page .quick-answer',
    '.city-page .finder-cta',
    '.city-page .service-section',
    '.city-hub .city-card',
    '.city-hub .need',
    '.city-hub .guide-item',
    '.city-hub .state-block',
    '.city-hub .comparison',
    '.city-hub .needs',
    '.city-hub .guide',
    '.city-hub .faq'
  ].join(',');

  const targets = [...document.querySelectorAll(selector)];
  if (!targets.length) return;

  const animateCount = (stat) => {
    const number = stat.querySelector('b');
    if (!number || number.dataset.counted) return;
    const raw = number.textContent.trim();
    const match = raw.match(/^([^\d]*)([\d,]+)([^\d]*)$/);
    if (!match) return;
    const target = Number(match[2].replace(/,/g, ''));
    if (!Number.isFinite(target) || target < 0 || target > 1000000) return;

    number.dataset.counted = 'true';
    const prefix = match[1];
    const suffix = match[3];
    const start = performance.now();
    const duration = 700;
    const frame = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const value = Math.round(target * (1 - Math.pow(1 - progress, 3)));
      number.textContent = prefix + value.toLocaleString('en-IN') + suffix;
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      element.classList.add('sh-visible');
      if (element.classList.contains('stat')) animateCount(element);
      obs.unobserve(element);
    });
  }, { threshold: 0.10, rootMargin: '0px 0px -24px 0px' });

  targets.forEach((element, index) => {
    element.style.setProperty('--sh-reveal-delay', (index % 5) * 55 + 'ms');
    observer.observe(element);
  });

  document.documentElement.classList.add('sh-motion-ready');
})();
