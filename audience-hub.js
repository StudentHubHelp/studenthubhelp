/* StudentHubHelp — audience knowledge hub modal */
(function(){
  /* Homepage hero mobile-only visual correction. Kept here so no
     existing homepage structure, search logic, or database code changes. */
  const heroMobileStyle=document.createElement('style');
  heroMobileStyle.id='shh-hero-mobile-fix';
  heroMobileStyle.textContent=`
    @media (max-width:600px){
      /* Keep the complete banner visible on narrow screens. */
      .hero > .container.hero-grid{
        min-height:clamp(560px,78svh,720px) !important;
        height:clamp(560px,78svh,720px) !important;
      }
      .hero-visual{
        height:100% !important;
        min-height:100% !important;
        background:#06162b !important;
      }
      .carousel-card img{
        object-fit:contain !important;
        object-position:center center !important;
        background:#06162b !important;
      }

      /* Keep headline/description inside the visible mobile banner area. */
      .carousel-overlay{
        left:14px !important;
        right:14px !important;
        top:78px !important;
        width:auto !important;
        max-width:none !important;
      }
      .carousel-overlay small{
        padding:5px 8px !important;
        margin-bottom:8px !important;
        font-size:8px !important;
      }
      .carousel-overlay h3{
        max-width:100% !important;
        font-size:clamp(24px,8vw,35px) !important;
        line-height:1.06 !important;
        letter-spacing:-.7px !important;
      }
      .carousel-overlay h3::after{
        margin-top:9px !important;
        max-width:100% !important;
        font-size:11px !important;
        line-height:1.4 !important;
      }

      /* Search stays functional, but moves into the bottom footer band. */
      .hero-grid > div:first-child .hero-search-wrap{
        left:12px !important;
        right:12px !important;
        bottom:64px !important;
        width:auto !important;
        max-width:none !important;
      }
      .hero-grid > div:first-child .hero-search{
        height:44px !important;
        min-height:44px !important;
        padding:5px !important;
        gap:5px !important;
        border-radius:15px !important;
      }
      .hero-grid > div:first-child .hero-search input{
        min-width:0 !important;
        padding:8px 5px !important;
        font-size:12px !important;
      }
      .hero-grid > div:first-child .search-leading{
        width:27px !important;
        flex-basis:27px !important;
        font-size:15px !important;
      }
      .hero-grid > div:first-child .search-status{display:none !important}
      .hero-grid > div:first-child .search-btn{
        height:34px !important;
        min-height:34px !important;
        padding:0 13px !important;
        border-radius:10px !important;
        font-size:11px !important;
      }
      .hero-grid > div:first-child .search-helper{display:none !important}

      /* Compact category cards at the very bottom. */
      .carousel-dots{
        left:8px !important;
        right:8px !important;
        bottom:8px !important;
        gap:5px !important;
      }
      .carousel-dots .carousel-dot{
        min-height:49px !important;
        height:49px !important;
        border-radius:12px !important;
        padding:4px 2px !important;
        gap:2px !important;
      }
      .carousel-dots .carousel-dot::before{
        width:23px !important;
        height:23px !important;
        flex-basis:23px !important;
        font-size:13px !important;
      }
      .carousel-dots .carousel-dot::after{
        font-size:7px !important;
      }

      /* Hide the old quick search row only; main search remains unchanged. */
      .hero-grid > div:first-child .quick-searches{display:none !important}
    }
  `;
  document.head.appendChild(heroMobileStyle);

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
