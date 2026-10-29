(() => {
  'use strict';

  const applyImageHints = () => {
    // Keep the visible homepage hero out of the generic index-based lazy-load rule.
    // Otherwise the first hero banner can be changed back to lazy after HTML parsing.
    const hero = document.getElementById('heroCarousel');
    const heroImages = hero ? Array.from(hero.querySelectorAll('img')) : [];
    const activeHeroImage =
      (hero && hero.querySelector('.hero-slide.active img')) || heroImages[0];

    heroImages.forEach((img) => {
      img.decoding = 'async';
      if (img === activeHeroImage) {
        img.loading = 'eager';
        img.setAttribute('fetchpriority', 'high');
      } else {
        img.loading = 'lazy';
        img.setAttribute('fetchpriority', 'low');
      }
    });

    document.querySelectorAll('img').forEach((img, index) => {
      if (hero && hero.contains(img)) return;

      const src = img.getAttribute('src') || '';
      const isBranding =
        /(^|\/)(logo|favicon)/i.test(src) ||
        Boolean(img.closest('header,nav,.navbar'));

      // Preserve branding and existing image dimensions; defer only non-critical images.
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
      </div>`).join('');
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
    if (window.__studentHubHelpHeroTimer) clearInterval(window.__studentHubHelpHeroTimer);
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
    if (!document.querySelector('.hero-banner-box')) return;
    if (document.getElementById('studenthubhelp-finder-hero-text-white')) return;
    const style = document.createElement('style');
    style.id = 'studenthubhelp-finder-hero-text-white';
    style.textContent = '.hero-banner-box h1,.hero-banner-box h1 span,.hero-banner-box p{color:#fff!important;opacity:1!important}';
    document.head.appendChild(style);
  };

  const upgradeHero = () => {
    const hero = document.querySelector('.hero');
    const carousel = document.getElementById('heroCarousel');
    if (!hero || !carousel) return;
    const heroBannerSources = ['hostelherobanner.jpg','tiffinherobanner.jpg','libraryherobanner.jpg','cafeherobanner.jpg','bookstoreherobanner.jpg'];
    const cards = Array.from(carousel.querySelectorAll('.carousel-card'));
    cards.forEach((card,index)=>{
      const img=card.querySelector('img');
      if(!img||!heroBannerSources[index])return;
      img.src=heroBannerSources[index];img.removeAttribute('srcset');img.setAttribute('decoding','async');
      if(index===0){img.setAttribute('fetchpriority','high');img.setAttribute('loading','eager')}else img.setAttribute('loading','lazy');
      card.querySelectorAll('.carousel-overlay').forEach(overlay=>{overlay.setAttribute('hidden','hidden');overlay.setAttribute('aria-hidden','true')});
    });
    hero.querySelectorAll('.hero-text').forEach(text=>{text.setAttribute('hidden','hidden');text.setAttribute('aria-hidden','true')});
    const searchWrap=document.getElementById('heroSearchWrap');const searchHome=searchWrap?.parentElement;if(!searchWrap||!searchHome)return;
    const placeholder=document.createComment('studenthubhelp-hero-search-position');
    if(!placeholder.parentNode)searchHome.insertBefore(placeholder,searchWrap);
    const mobileQuery=window.matchMedia('(max-width:600px)');
    const syncMobileSearch=()=>{
      if(mobileQuery.matches){if(searchWrap.parentElement!==carousel)carousel.appendChild(searchWrap);searchWrap.classList.add('hero-search-mobile-overlay');searchWrap.querySelectorAll('.search-helper').forEach(helper=>{helper.setAttribute('hidden','hidden');helper.setAttribute('aria-hidden','true')});}
      else{if(placeholder.parentNode&&searchWrap.parentElement!==placeholder.parentNode)placeholder.parentNode.insertBefore(searchWrap,placeholder.nextSibling);searchWrap.classList.remove('hero-search-mobile-overlay');searchWrap.querySelectorAll('.search-helper').forEach(helper=>{helper.removeAttribute('hidden');helper.removeAttribute('aria-hidden')});}
    };
    const style=document.createElement('style');style.id='studenthubhelp-hero-banner-upgrade';style.textContent=`
      .hero .hero-text[hidden],.hero .carousel-overlay[hidden],.hero .search-helper[hidden]{display:none!important}
      @media(max-width:600px){#heroCarousel .hero-search-mobile-overlay{position:absolute;left:5%;right:5%;bottom:6%;width:auto;max-width:none;margin:0;z-index:60}#heroCarousel .hero-search-mobile-overlay .hero-search{width:100%;max-width:none;height:205px;min-height:205px;display:grid;grid-template-columns:34px minmax(0,1fr) 22px;grid-template-rows:147px 48px;gap:0;padding:6px;border-radius:15px;box-shadow:0 18px 45px rgba(0,0,0,.38)}#heroCarousel .hero-search-mobile-overlay .hero-search .search-leading{grid-column:1;grid-row:1;width:34px;min-height:0;height:52px;align-self:center;flex:none}#heroCarousel .hero-search-mobile-overlay .hero-search input{grid-column:2;grid-row:1;width:100%;min-height:0;height:52px;align-self:center;padding:11px 9px;font-size:13px}#heroCarousel .hero-search-mobile-overlay .hero-search .search-status{grid-column:3;grid-row:1;align-self:center}#heroCarousel .hero-search-mobile-overlay .hero-search .search-btn{grid-column:1/-1;grid-row:2;width:100%;min-height:48px;height:48px;padding:0 14px;border-radius:10px;font-size:12px}}
    `;document.head.appendChild(style);syncMobileSearch();
    if(typeof mobileQuery.addEventListener==='function')mobileQuery.addEventListener('change',syncMobileSearch);else if(typeof mobileQuery.addListener==='function')mobileQuery.addListener(syncMobileSearch);
  };

  const run=()=>{applyImageHints();upgradeFinderHeroText();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
