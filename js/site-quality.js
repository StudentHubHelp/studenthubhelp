/* StudentHubHelp shared mobile navigation helper.
   Adds a keyboard/touch accessible menu only when a page has navigation
   but does not already provide its own menu control. */
(function () {
  'use strict';
  if (window.__shhMobileNavigationReady) return;
  window.__shhMobileNavigationReady = true;

  const existingToggle = document.querySelector(
    '#mobileMenuToggle,#menuToggle,#menuBtn,.mobile-menu,.menu-btn,[data-mobile-menu-toggle]'
  );
  if (existingToggle) return;

  const header = document.querySelector(
    'header.site-header,header.top,header.topbar,header.site-nav,header,nav.site-nav'
  );
  if (!header) return;

  const nav = header.querySelector(
    'nav.nav-links,nav.navlinks,nav.links,.nav-links,.navlinks,.links'
  );
  if (!nav || !nav.querySelector('a')) return;

  const wrap = nav.parentElement;
  if (!wrap) return;
  wrap.classList.add('shh-mobile-nav-wrap');
  nav.classList.add('shh-mobile-nav');
  if (!nav.id) nav.id = 'shhMobileNavigation';

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'shhMobileMenuToggle';
  button.setAttribute('aria-label', 'Open navigation menu');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', nav.id);
  button.innerHTML = '<span aria-hidden="true">☰</span>';
  wrap.insertBefore(button, nav);

  function closeMenu() {
    nav.classList.remove('shh-open');
    document.body.classList.remove('shh-menu-open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open navigation menu');
    button.innerHTML = '<span aria-hidden="true">☰</span>';
  }

  button.addEventListener('click', function () {
    const open = !nav.classList.contains('shh-open');
    nav.classList.toggle('shh-open', open);
    document.body.classList.toggle('shh-menu-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    button.innerHTML = open
      ? '<span aria-hidden="true">×</span>'
      : '<span aria-hidden="true">☰</span>';
  });

  nav.addEventListener('click', function (event) {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('click', function (event) {
    if (nav.classList.contains('shh-open') &&
        !nav.contains(event.target) &&
        !button.contains(event.target)) closeMenu();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && nav.classList.contains('shh-open')) {
      closeMenu();
      button.focus();
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 767) closeMenu();
  }, { passive: true });
})();
