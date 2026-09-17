(() => {
  'use strict';

  const initHomepageGlobalSearch = () => {
    const isHome = window.location.pathname === '/studenthubhelp/' || window.location.pathname.endsWith('/studenthubhelp/index.html');
    if (!isHome || document.getElementById('homepageGlobalSearch')) return;

    const heroSection = document.querySelector('.hero-upgraded');
    const heroWrap = heroSection?.querySelector('.hero-banner-wrap');
    if (!heroSection || !heroWrap) return;

    const searchWrap = document.createElement('div');
    searchWrap.id = 'homepageGlobalSearch';
    searchWrap.innerHTML = `
      <form class="homepage-global-search" role="search" action="global-search.html" method="get" novalidate>
        <span class="homepage-global-search-icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          name="q"
          autocomplete="off"
          aria-label="Search StudentHubHelp"
          placeholder="Search hostels, PGs, tiffin, libraries, cafes or bookstores..."
        />
        <button type="submit" aria-label="Search StudentHubHelp">Search <span aria-hidden="true">→</span></button>
      </form>
      <div class="homepage-global-search-hint">Search by property, area, city or student service</div>
    `;

    heroWrap.insertAdjacentElement('afterend', searchWrap);

    const style = document.createElement('style');
    style.id = 'homepage-global-search-style';
    style.textContent = `
      #homepageGlobalSearch{
        position:relative;
        z-index:30;
        width:min(920px,calc(100% - 32px));
        margin:-34px auto 0;
        text-align:center;
        pointer-events:none;
      }
      #homepageGlobalSearch .homepage-global-search{
        pointer-events:auto;
        display:grid;
        grid-template-columns:46px minmax(0,1fr) auto;
        align-items:center;
        min-height:68px;
        padding:7px;
        background:rgba(255,255,255,.98);
        border:1px solid rgba(212,175,55,.48);
        border-radius:18px;
        box-shadow:0 18px 45px rgba(27,42,74,.16),0 3px 12px rgba(27,42,74,.08);
      }
      #homepageGlobalSearch .homepage-global-search-icon{
        display:grid;
        place-items:center;
        width:46px;
        height:52px;
        color:#9A7B2C;
        font-size:27px;
        line-height:1;
      }
      #homepageGlobalSearch input{
        width:100%;
        height:52px;
        min-width:0;
        border:0;
        outline:0;
        background:transparent;
        color:#1B2A4A;
        font-size:14px;
        font-weight:600;
        padding:0 10px;
      }
      #homepageGlobalSearch input::placeholder{color:#7a7f87;font-weight:500}
      #homepageGlobalSearch input:focus{box-shadow:inset 0 -2px 0 rgba(212,175,55,.55)}
      #homepageGlobalSearch button{
        height:52px;
        min-width:122px;
        border:1px solid #D4AF37;
        border-radius:13px;
        padding:0 18px;
        background:linear-gradient(135deg,#1B2A4A,#243b63);
        color:#F3E5AB;
        font-size:12px;
        font-weight:800;
        letter-spacing:.2px;
        cursor:pointer;
        box-shadow:0 8px 20px rgba(27,42,74,.16);
        transition:transform .2s ease,box-shadow .2s ease,background .2s ease;
      }
      #homepageGlobalSearch button:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(27,42,74,.22);background:#D4AF37;color:#1B2A4A}
      #homepageGlobalSearch .homepage-global-search-hint{
        margin-top:7px;
        color:#7b7467;
        font-size:10px;
        font-weight:700;
        letter-spacing:.2px;
      }
      @media(max-width:600px){
        #homepageGlobalSearch{width:calc(100% - 24px);margin:-25px auto 0}
        #homepageGlobalSearch .homepage-global-search{grid-template-columns:36px minmax(0,1fr);min-height:58px;padding:5px;border-radius:15px}
        #homepageGlobalSearch .homepage-global-search-icon{width:36px;height:46px;font-size:23px}
        #homepageGlobalSearch input{height:46px;padding:0 7px;font-size:12px}
        #homepageGlobalSearch button{grid-column:1/-1;height:43px;min-width:0;margin-top:4px;border-radius:10px;font-size:11px}
        #homepageGlobalSearch .homepage-global-search-hint{font-size:9px;margin-top:5px}
      }
    `;
    document.head.appendChild(style);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomepageGlobalSearch, { once:true });
  } else {
    initHomepageGlobalSearch();
  }
})();
