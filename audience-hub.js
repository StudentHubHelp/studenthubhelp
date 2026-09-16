/* StudentHubHelp — audience knowledge hub modal */
(function(){
  const guides=[
    {key:'student',title:'For Students',url:'student-guide.html',kicker:'STUDENT GUIDE',subtitle:'A practical guide to choosing accommodation, food, study spaces and everyday student services.'},
    {key:'parent',title:'For Parents',url:'parent-guide.html',kicker:'PARENT GUIDE',subtitle:'A practical, evidence-minded checklist for evaluating student accommodation and local services.'},
    {key:'owner',title:'For Property Owners',url:'property-owner-guide.html',kicker:'PROPERTY OWNER GUIDE',subtitle:'How to build accurate, useful and trustworthy listings that students can understand and compare.'}
  ];
  const cards=document.querySelectorAll('.audience-card');
  if(!cards.length)return;
  const backdrop=document.createElement('div');
  backdrop.className='shh-guide-backdrop';
  backdrop.setAttribute('aria-hidden','true');
  backdrop.innerHTML='<div class="shh-guide-modal" role="dialog" aria-modal="true" aria-label="Audience guide"><div class="shh-guide-top"><div><div class="shh-guide-kicker"></div><div class="shh-guide-title"></div><p class="shh-guide-subtitle"></p></div><button class="shh-guide-close" type="button" aria-label="Close guide">×</button></div><div class="shh-guide-body"><div class="shh-guide-loading">Loading the guide…</div></div></div>';
  document.body.appendChild(backdrop);
  const modal=backdrop.querySelector('.shh-guide-modal'), body=backdrop.querySelector('.shh-guide-body');
  let lastFocus=null;
  function openGuide(i){
    const g=guides[i]; if(!g)return;
    lastFocus=document.activeElement;
    backdrop.querySelector('.shh-guide-kicker').textContent=g.kicker;
    backdrop.querySelector('.shh-guide-title').textContent=g.title;
    backdrop.querySelector('.shh-guide-subtitle').textContent=g.subtitle;
    body.innerHTML='<div class="shh-guide-loading">Loading the guide…</div>';
    backdrop.classList.add('is-open'); backdrop.setAttribute('aria-hidden','false'); document.body.classList.add('shh-guide-lock');
    fetch(g.url,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('Guide unavailable');return r.text()}).then(html=>{
      const doc=new DOMParser().parseFromString(html,'text/html');
      const content=doc.querySelector('#guide-content');
      body.innerHTML=content?content.innerHTML:'<div class="shh-guide-loading">This guide could not be loaded. <a href="'+g.url+'">Open the full guide →</a></div>';
      const first=body.querySelector('a,button,summary,input'); if(first)first.focus();
    }).catch(()=>{body.innerHTML='<div class="shh-guide-loading">The guide is available as a full page. <br><br><a href="'+g.url+'">Open the full guide →</a></div>';});
    backdrop.querySelector('.shh-guide-close').focus();
  }
  function closeGuide(){backdrop.classList.remove('is-open');backdrop.setAttribute('aria-hidden','true');document.body.classList.remove('shh-guide-lock');if(lastFocus&&lastFocus.focus)lastFocus.focus()}
  cards.forEach((card,i)=>{
    card.setAttribute('role','button');card.setAttribute('tabindex','0');card.setAttribute('aria-label',guides[i].title+' — open guide');
    card.addEventListener('click',e=>{if(e.target.closest('a'))return;openGuide(i)});
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openGuide(i)}});
  });
  backdrop.querySelector('.shh-guide-close').addEventListener('click',closeGuide);
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeGuide()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&backdrop.classList.contains('is-open'))closeGuide()});
})();

/* =========================================================
   StudentHubHelp — MOBILE HERO PRESENTATION FIX
   Injected only for the homepage Hero. Search/data logic is untouched.
========================================================= */
(function(){
  if(!document.querySelector('.hero-visual')) return;
  const style=document.createElement('style');
  style.id='shh-mobile-hero-presentation-fix';
  style.textContent=`
    @media (max-width:767px){
      .hero > .container.hero-grid{
        min-height:660px !important;
        height:660px !important;
        overflow:hidden !important;
      }

      .hero-visual{
        height:660px !important;
        min-height:660px !important;
        aspect-ratio:auto !important;
        border-radius:18px !important;
        background:#06162b !important;
      }

      /* Show the complete banner artwork instead of portrait-cropping it. */
      .carousel-card img{
        object-fit:contain !important;
        object-position:center center !important;
        background:#06162b !important;
      }

      .carousel-overlay{
        left:18px !important;
        top:54px !important;
        width:calc(100% - 36px) !important;
        max-width:none !important;
      }

      .carousel-overlay small{
        margin-bottom:8px !important;
        padding:5px 9px !important;
        font-size:9px !important;
      }

      .carousel-overlay h3{
        max-width:96% !important;
        font-size:clamp(27px,8.2vw,36px) !important;
        line-height:1.04 !important;
        letter-spacing:-.7px !important;
      }

      .carousel-overlay h3::after{
        max-width:96% !important;
        margin-top:10px !important;
        font-size:12px !important;
        line-height:1.42 !important;
      }

      /* Search sits as a compact footer band, about the final 9% of Hero. */
      .hero-grid > div:first-child .hero-search-wrap{
        left:18px !important;
        right:18px !important;
        bottom:86px !important;
        width:auto !important;
        max-width:none !important;
        margin:0 !important;
      }

      .hero-grid > div:first-child .hero-search{
        width:100% !important;
        height:56px !important;
        min-height:56px !important;
        display:flex !important;
        align-items:center !important;
        gap:4px !important;
        padding:4px !important;
        border-radius:16px !important;
        box-shadow:0 16px 42px rgba(0,0,0,.35) !important;
      }

      .hero-grid > div:first-child .hero-search input{
        min-width:0 !important;
        min-height:46px !important;
        height:46px !important;
        flex:1 1 auto !important;
        padding:9px 6px !important;
        font-size:13px !important;
        border:0 !important;
        background:transparent !important;
      }

      .hero-grid > div:first-child .search-leading{
        width:28px !important;
        flex:0 0 28px !important;
        font-size:15px !important;
      }

      .hero-grid > div:first-child .search-status{
        width:16px !important;
        min-width:16px !important;
        flex:0 0 16px !important;
      }

      .hero-grid > div:first-child .search-btn{
        min-height:46px !important;
        height:46px !important;
        flex:0 0 92px !important;
        padding:0 10px !important;
        border-radius:12px !important;
        font-size:13px !important;
      }

      .hero-grid > div:first-child .search-helper{
        display:none !important;
      }

      .carousel-dots{
        left:10px !important;
        right:10px !important;
        bottom:8px !important;
        gap:5px !important;
        grid-template-columns:repeat(5,minmax(0,1fr)) !important;
      }

      .carousel-dots .carousel-dot{
        min-height:66px !important;
        height:66px !important;
        border-radius:13px !important;
        padding:6px 3px !important;
        gap:3px !important;
      }

      .carousel-dots .carousel-dot::before{
        width:28px !important;
        height:28px !important;
        flex-basis:28px !important;
        font-size:15px !important;
      }

      .carousel-dots .carousel-dot::after{
        font-size:8px !important;
        line-height:1.05 !important;
        white-space:nowrap !important;
      }

      /* Let the CSS 2.5s animation be the visible source of the header highlight. */
      .brand-categories span[data-category-index].active-cat{
        color:inherit !important;
        text-shadow:none !important;
        transform:none !important;
      }

      .brand-categories span[data-category-index]{
        opacity:1 !important;
      }
    }
  `;
  document.head.appendChild(style);
})();
