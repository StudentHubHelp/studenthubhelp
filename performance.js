(() => {
  'use strict';

  // StudentHubHelp Phase 3 performance layer.
  // Conservative by design: no data, routing, UI or API behavior is changed.
  const applyImageHints = () => {
    const images = document.querySelectorAll('img');
    images.forEach((img, index) => {
      // Keep the first visible/branding images eager; defer the rest.
      const isBranding = /(^|\/)(logo|favicon)/i.test(img.getAttribute('src') || '') || img.closest('header,nav,.navbar');
      if (!isBranding && index > 1) img.loading = 'lazy';
      img.decoding = 'async';
      if (!img.getAttribute('width') && !img.getAttribute('height')) {
        img.style.contain = 'paint';
      }
    });
  };

  const applyInteractionHints = () => {
    document.documentElement.style.setProperty('text-rendering', 'optimizeSpeed');
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  };

  const run = () => {
    applyImageHints();
    applyInteractionHints();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
