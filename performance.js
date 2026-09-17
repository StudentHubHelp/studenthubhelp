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

  const repairHomepageHero = () => {
    const hero = document.querySelector('.hero-upgraded');
    const carousel = document.getElementById('heroCarousel');
    if (!hero || !carousel) return;

    const sources = [
      ['hostelherobanner.jpg', 'Student hostel and PG services'],
      ['tiffinherobanner.jpg', 'Student tiffin and mess services'],
      ['libraryherobanner.jpg', 'Student library and study spaces'],
      ['cafeherobanner.jpg', 'Student friendly cafes'],
      ['bookstoreherobanner.jpg', 'Student book stores and study essentials']
    ];

    carousel.innerHTML = sources.map(([src, alt], index) => `
      <div class="hero-slide${index === 0 ? ' active' : ''}" data-category-index="${index}">
        <img src="${src}" alt="${alt}" ${index === 0 ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'} decoding="async">
      </div>
    `).join('');

    const slides = Array.from(carousel.querySelectorAll('.hero-slide'));
    const tickerItems = Array.from(document.querySelectorAll('#headerCategoryTicker .cat-item'));
    let index = 0;

    const show = (nextIndex) => {
      if (!slides.length) return;
      index = (nextIndex + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
      tickerItems.forEach((item, i) => item.classList.toggle('active-cat', i === index));
    };

    show(0);

    if (window.__studentHubHelpHeroTimer) {
      clearInterval(window.__studentHubHelpHeroTimer);
    }
    window.__studentHubHelpHeroTimer = setInterval(() => show(index + 1), 2500);

    tickerItems.forEach((item, itemIndex) => {
      if (item.dataset.heroRepairBound === 'true') return;
      item.dataset.heroRepairBound = 'true';
      item.addEventListener('click', () => {
        show(itemIndex);
        clearInterval(window.__studentHubHelpHeroTimer);
        window.__studentHubHelpHeroTimer = setInterval(() => show(index + 1), 2500);
      });
    });
  };

  const upgradeFinderHeroText = () => {
    // Finder-only visual override. No other page uses .hero-banner-box.
    if (!document.querySelector('.hero-banner-box')) return;
    if (document.getElementById('studenthubhelp-finder-hero-text-white')) return;

    const style = document.createElement('style');
    style.id = 'studenthubhelp-finder-hero-text-white';
    style.textContent = `
      .hero-banner-box h1,
      .hero-banner-box h1 span,
      .hero-banner-box p{
        color:#fff !important;
        opacity:1 !important;
      }
    `;
    document.head.appendChild(style);
  };

  const upgradeFooter = () => {
    const oldFooter = document.querySelector('footer');
    if (!oldFooter || oldFooter.dataset.footerV2 === 'true') return;

    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.dataset.footerV2 = 'true';
    footer.innerHTML = `
      <div class="container footer-shell">
        <div class="footer-grid footer-grid-v2">
          <section class="footer-brand-panel">
            <div class="footer-brand">
              <img src="logo.png" alt="StudentHubHelp logo" loading="lazy" decoding="async">
              <div><strong>StudentHubHelp</strong><span>Student Discovery Platform · India</span></div>
            </div>
            <p class="footer-desc">A student-focused local discovery platform for exploring hostels, PGs, tiffin and mess services, libraries, cafes and bookstores across India.</p>
            <div class="footer-trust-line"><span>✓ Student-focused</span><span>✓ Local discovery</span><span>✓ India-wide</span></div>
            <div class="footer-socials" aria-label="Social and sharing links">
              <a class="footer-social" href="https://www.instagram.com/studenthubhelp/" target="_blank" rel="noopener noreferrer" aria-label="StudentHubHelp on Instagram"><span class="social-icon">◎</span><span>Instagram</span></a>
              <a class="footer-social" href="https://wa.me/919929718264" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp StudentHubHelp at +91 9929718264"><span class="social-icon">◉</span><span>+91 9929718264</span></a>
              <button class="footer-social" type="button" data-share-studenthubhelp aria-label="Share StudentHubHelp"><span class="social-icon">↗</span><span>Share</span></button>
            </div>
          </section>

          <section class="footer-column"><h4>Explore</h4><div class="footer-links">
            <a href="index.html">Home</a><a href="pg-finder.html">Hostels &amp; PG</a><a href="tiffin-finder.html">Tiffin &amp; Mess</a><a href="library-finder.html">Libraries</a><a href="cafe-finder.html">Cafes</a><a href="bookstore-finder.html">Bookstores</a>
          </div></section>

          <section class="footer-column"><h4>StudentHubHelp</h4><div class="footer-links">
            <a href="about.html">About Us</a><a href="student-helplines-safety.html">Student Helplines &amp; Safety</a><a href="global-search.html">Search</a><a href="add-listing.html">Add Listing</a><a href="partner.html">Partner Program</a><a href="privacy-policy.html">Privacy Policy</a><a href="terms-and-conditions.html">Terms &amp; Conditions</a><a href="contact-us.html">Contact Us</a>
          </div></section>

          <section class="footer-column"><h4>Quick Discovery</h4><div class="footer-links">
            <a href="global-search.html">Find a Service</a><a href="pg-finder.html">Find Accommodation</a><a href="tiffin-finder.html">Find Food</a><a href="library-finder.html">Find Study Spaces</a><a href="about.html#faq">FAQs</a>${(window.location.pathname === '/studenthubhelp/' || window.location.pathname.endsWith('/studenthubhelp/index.html')) ? '<a href="404.html">404 Page</a><a href="thank-you.html">Thank You</a>' : ''}
          </div></section>

          <section class="footer-column footer-contact"><h4>Director &amp; Support</h4>
            <div class="director-name">SATPAL SWAMI</div><div class="director-role">Founder · StudentHubHelp</div>
            <div class="director-info">
              <a href="tel:+919929718264"><span>☎</span><span>+91 9929718264</span></a>
              <a href="mailto:satpalswami22742@gmail.com"><span>✉</span><span>satpalswami22742@gmail.com</span></a>
              <a href="https://studenthubhelp.github.io/studenthubhelp/admin/"><span>⌘</span><span>Admin Login</span></a>
            </div>
          </section>
        </div>
        <div class="footer-bottom"><div>© 2026 StudentHubHelp. All rights reserved.</div><div>Built for students · Discover locally, study confidently.</div></div>
      </div>`;

    oldFooter.replaceWith(footer);

    const style = document.createElement('style');
    style.id = 'studenthubhelp-footer-v2-style';
    style.textContent = `
      .site-footer{position:relative;overflow:hidden;background:radial-gradient(circle at 8% 0%,rgba(214,168,79,.08),transparent 28%),linear-gradient(180deg,#071a33 0%,#06162b 100%);border-top:1px solid rgba(214,168,79,.18);color:#fff}
      .site-footer::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(255,255,255,.018),transparent)}
      .footer-shell{position:relative;z-index:1;padding:52px 0 20px}
      .footer-grid-v2{display:grid;grid-template-columns:minmax(260px,1.55fr) repeat(3,minmax(145px,.85fr)) minmax(210px,1.05fr);gap:30px;align-items:start}
      .footer-brand-panel{min-width:0;padding-right:10px}.footer-brand{display:flex;align-items:center;gap:12px;min-width:0}.footer-brand img{width:48px;height:48px;flex:0 0 48px;object-fit:contain;border-radius:13px;background:#fff;padding:3px;box-shadow:0 10px 28px rgba(0,0,0,.22)}
      .footer-brand strong{display:block;font-size:17px;line-height:1.2;color:#fff}.footer-brand span{display:block;margin-top:3px;color:#8fa4bd;font-size:10px;font-weight:600}
      .site-footer .footer-desc{max-width:390px;margin:16px 0 14px;color:#aebed2;font-size:11px;line-height:1.7}.footer-trust-line{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:17px}.footer-trust-line span{padding:5px 8px;border:1px solid rgba(255,255,255,.09);border-radius:999px;background:rgba(255,255,255,.035);color:#9fb0c4;font-size:9px;font-weight:700}
      .site-footer h4{margin:2px 0 14px;color:#f0d48a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.9px}.site-footer .footer-links{display:grid;gap:5px}.site-footer .footer-links a{display:block;width:fit-content;max-width:100%;padding:5px 0;color:#aebed2;font-size:11px;line-height:1.45;transition:color .2s ease,transform .2s ease}.site-footer .footer-links a:hover{color:#fff;transform:translateX(3px)}
      .site-footer .footer-contact{min-width:0}.site-footer .director-name{font-size:16px;font-weight:800;letter-spacing:.2px;color:#fff}.site-footer .director-role{margin-top:3px;color:#8498b2;font-size:9px;font-weight:600}.site-footer .director-info{display:grid;gap:9px;margin-top:16px}.site-footer .director-info a{display:flex;align-items:flex-start;gap:8px;min-width:0;color:#aebed2;font-size:10px;line-height:1.45}.site-footer .director-info a span:first-child{width:17px;flex:0 0 17px;color:#d6a84f;text-align:center}.site-footer .director-info a span:last-child{overflow-wrap:anywhere}.site-footer .director-info a:hover{color:#fff}
      .footer-socials{display:flex;flex-wrap:wrap;gap:8px}.footer-social{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:34px;padding:7px 11px;border:1px solid rgba(214,168,79,.20);border-radius:10px;background:rgba(255,255,255,.035);color:#d8e1ec;font-size:10px;font-weight:700;cursor:pointer;transition:transform .2s ease,border-color .2s ease,background .2s ease,color .2s ease}.footer-social:hover{transform:translateY(-2px);border-color:rgba(214,168,79,.55);background:rgba(214,168,79,.08);color:#fff}.footer-social .social-icon{font-size:14px;line-height:1;color:#f0d48a}
      .footer-bottom{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:38px;padding-top:17px;border-top:1px solid rgba(255,255,255,.08);color:#71839c;font-size:9px}
      @media(max-width:1050px){.footer-grid-v2{grid-template-columns:1.35fr repeat(2,1fr);gap:28px}.footer-brand-panel{grid-column:1/-1;max-width:760px;padding-right:0}}
      @media(max-width:720px){.footer-shell{padding:38px 0 16px}.footer-grid-v2{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 18px}.footer-brand-panel{grid-column:1/-1}.site-footer h4{margin-bottom:10px}.footer-bottom{align-items:flex-start;flex-direction:column;gap:5px;margin-top:28px}}
      @media(max-width:480px){.footer-shell{width:min(100% - 24px,1180px)}.footer-grid-v2{grid-template-columns:1fr;gap:22px}.footer-brand-panel{grid-column:auto}.footer-column{padding-top:3px}.site-footer .footer-links{gap:2px}.site-footer .footer-links a{padding:4px 0;font-size:10.5px}.footer-socials{gap:7px}.footer-social{flex:1 1 auto;min-width:0;padding-inline:9px}.footer-bottom{font-size:8.5px}}
    `;
    document.head.appendChild(style);

    const shareButton = footer.querySelector('[data-share-studenthubhelp]');
    shareButton?.addEventListener('click', () => {
      const data = {
        title: 'StudentHubHelp',
        text: 'Discover student-friendly hostels, PGs, tiffin, libraries, cafes and bookstores across India.',
        url: 'https://studenthubhelp.github.io/studenthubhelp/'
      };
      if (navigator.share) {
        navigator.share(data).catch(() => {});
      } else {
        window.open('https://wa.me/?text=' + encodeURIComponent(data.text + ' ' + data.url), '_blank', 'noopener,noreferrer');
      }
    });
  };

  const upgradeHero = () => {
    const hero = document.querySelector('.hero');
    const carousel = document.getElementById('heroCarousel');
    if (!hero || !carousel) return;

    const heroBannerSources = [
      'hostelherobanner.jpg',
      'tiffinherobanner.jpg',
      'libraryherobanner.jpg',
      'cafeherobanner.jpg',
      'bookstoreherobanner.jpg'
    ];

    const cards = Array.from(carousel.querySelectorAll('.carousel-card'));
    cards.forEach((card, index) => {
      const img = card.querySelector('img');
      if (!img || !heroBannerSources[index]) return;
      img.src = heroBannerSources[index];
      img.removeAttribute('srcset');
      img.setAttribute('decoding', 'async');
      if (index === 0) {
        img.setAttribute('fetchpriority', 'high');
        img.setAttribute('loading', 'eager');
      } else {
        img.setAttribute('loading', 'lazy');
      }
      card.querySelectorAll('.carousel-overlay').forEach((overlay) => {
        overlay.setAttribute('hidden', 'hidden');
        overlay.setAttribute('aria-hidden', 'true');
      });
    });

    hero.querySelectorAll('.hero-text').forEach((text) => {
      text.setAttribute('hidden', 'hidden');
      text.setAttribute('aria-hidden', 'true');
    });

    const searchWrap = document.getElementById('heroSearchWrap');
    const searchHome = searchWrap?.parentElement;
    if (!searchWrap || !searchHome) return;

    const placeholder = document.createComment('studenthubhelp-hero-search-position');
    if (!placeholder.parentNode) searchHome.insertBefore(placeholder, searchWrap);

    const mobileQuery = window.matchMedia('(max-width: 600px)');
    const syncMobileSearch = () => {
      if (mobileQuery.matches) {
        if (searchWrap.parentElement !== carousel) carousel.appendChild(searchWrap);
        searchWrap.classList.add('hero-search-mobile-overlay');
        searchWrap.querySelectorAll('.search-helper').forEach((helper) => {
          helper.setAttribute('hidden', 'hidden');
          helper.setAttribute('aria-hidden', 'true');
        });
      } else {
        if (placeholder.parentNode && searchWrap.parentElement !== placeholder.parentNode) {
          placeholder.parentNode.insertBefore(searchWrap, placeholder.nextSibling);
        }
        searchWrap.classList.remove('hero-search-mobile-overlay');
        searchWrap.querySelectorAll('.search-helper').forEach((helper) => {
          helper.removeAttribute('hidden');
          helper.removeAttribute('aria-hidden');
        });
      }
    };

    const style = document.createElement('style');
    style.id = 'studenthubhelp-hero-banner-upgrade';
    style.textContent = `
      .hero .hero-text[hidden],
      .hero .carousel-overlay[hidden],
      .hero .search-helper[hidden]{display:none !important}
      @media (max-width:600px){
        #heroCarousel .hero-search-mobile-overlay{
          position:absolute;
          left:5%;
          right:5%;
          bottom:6%;
          width:auto;
          max-width:none;
          margin:0;
          z-index:60;
        }
        #heroCarousel .hero-search-mobile-overlay .hero-search{
          width:100%;
          max-width:none;
          height:205px;
          min-height:205px;
          display:grid;
          grid-template-columns:34px minmax(0,1fr) 22px;
          grid-template-rows:147px 48px;
          gap:0;
          padding:6px;
          border-radius:15px;
          box-shadow:0 18px 45px rgba(0,0,0,.38);
        }
        #heroCarousel .hero-search-mobile-overlay .hero-search .search-leading{
          grid-column:1;
          grid-row:1;
          width:34px;
          min-height:0;
          height:52px;
          align-self:center;
          flex:none;
        }
        #heroCarousel .hero-search-mobile-overlay .hero-search input{
          grid-column:2;
          grid-row:1;
          width:100%;
          min-height:0;
          height:52px;
          align-self:center;
          padding:11px 9px;
          font-size:13px;
        }
        #heroCarousel .hero-search-mobile-overlay .hero-search .search-status{
          grid-column:3;
          grid-row:1;
          align-self:center;
        }
        #heroCarousel .hero-search-mobile-overlay .hero-search .search-btn{
          grid-column:1 / -1;
          grid-row:2;
          width:100%;
          min-height:48px;
          height:48px;
          padding:0 14px;
          border-radius:10px;
          font-size:12px;
        }
      }
    `;
    document.head.appendChild(style);

    syncMobileSearch();
    if (typeof mobileQuery.addEventListener === 'function') {
      mobileQuery.addEventListener('change', syncMobileSearch);
    } else if (typeof mobileQuery.addListener === 'function') {
      mobileQuery.addListener(syncMobileSearch);
    }
  };

  const run = () => {
    applyImageHints();
    repairHomepageHero();
    upgradeFinderHeroText();
    upgradeFooter();
    upgradeHero();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
