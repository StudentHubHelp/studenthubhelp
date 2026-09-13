(() => {
  'use strict';

  // StudentHubHelp Phase 3 performance layer.
  // Conservative by design: no data, routing, UI or API behavior is changed.
  const applyImageHints = () => {
    document.querySelectorAll('img').forEach((img, index) => {
      const src = img.getAttribute('src') || '';
      const isBranding = /(^|\/)(logo|favicon)/i.test(src) || img.closest('header,nav,.navbar');
      if (!isBranding && index > 1) img.loading = 'lazy';
      img.decoding = 'async';
    });
  };

  const run = () => applyImageHints();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
