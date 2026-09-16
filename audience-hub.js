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

(function(){
  if(!document.querySelector('.hero-visual')) return;
  const style=document.createElement('style');
  style.id='shh-mobile-hero-presentation-fix';
  style.textContent=`
    @media (max-width:767px){
      .hero > .container.hero-grid{min-height:660px !important;height:660px !important;overflow:hidden !important}
      .hero-visual{height:660px !important;min-height:660px !important;aspect-ratio:auto !important;border-radius:18px !important;background:#06162b !important}
      .carousel-card img{object-fit:contain !important;object-position:center center !important;background:#06162b !important}
      .carousel-overlay{left:18px !important;top:54px !important;width:calc(100% - 36px) !important;max-width:none !important}
      .carousel-overlay small{margin-bottom:8px !important;padding:5px 9px !important;font-size:9px !important}
      .carousel-overlay h3{max-width:96% !important;font-size:clamp(27px,8.2vw,36px) !important;line-height:1.04 !important;letter-spacing:-.7px !important}
      .carousel-overlay h3::after{max-width:96% !important;margin-top:10px !important;font-size:12px !important;line-height:1.42 !important}
      .hero-grid > div:first-child .hero-search-wrap{left:18px !important;right:18px !important;bottom:86px !important;width:auto !important;max-width:none !important;margin:0 !important}
      .hero-grid > div:first-child .hero-search{width:100% !important;height:56px !important;min-height:56px !important;display:flex !important;align-items:center !important;gap:4px !important;padding:4px !important;border-radius:16px !important;box-shadow:0 16px 42px rgba(0,0,0,.35) !important}
      .hero-grid > div:first-child .hero-search input{min-width:0 !important;min-height:46px !important;height:46px !important;flex:1 1 auto !important;padding:9px 6px !important;font-size:13px !important;border:0 !important;background:transparent !important}
      .hero-grid > div:first-child .search-leading{width:28px !important;flex:0 0 28px !important;font-size:15px !important}
      .hero-grid > div:first-child .search-status{width:16px !important;min-width:16px !important;flex:0 0 16px !important}
      .hero-grid > div:first-child .search-btn{min-height:46px !important;height:46px !important;flex:0 0 92px !important;padding:0 10px !important;border-radius:12px !important;font-size:13px !important}
      .hero-grid > div:first-child .search-helper{display:none !important}
      .carousel-dots{left:10px !important;right:10px !important;bottom:8px !important;gap:5px !important;grid-template-columns:repeat(5,minmax(0,1fr)) !important}
      .carousel-dots .carousel-dot{min-height:66px !important;height:66px !important;border-radius:13px !important;padding:6px 3px !important;gap:3px !important}
      .carousel-dots .carousel-dot::before{width:28px !important;height:28px !important;flex-basis:28px !important;font-size:15px !important}
      .carousel-dots .carousel-dot::after{font-size:8px !important;line-height:1.05 !important;white-space:nowrap !important}
    }
  `;
  document.head.appendChild(style);
})();

(function(){
  if(!document.querySelector('.hero-visual')) return;
  const style=document.createElement('style');
  style.id='shh-mobile-hero-final-composition';
  style.textContent=`
    @media (max-width:600px){
      .hero > .container.hero-grid,.hero-visual{height:50vh !important;min-height:0 !important;max-height:50vh !important}
      .hero-visual{position:relative !important;overflow:hidden !important;background:#06162b !important;border-radius:0 0 18px 18px !important}
      .carousel-card,.carousel-card img{width:100% !important;height:100% !important}
      .carousel-card img{object-fit:contain !important;object-position:center top !important;background:#06162b !important}
      .carousel-overlay{left:14px !important;right:14px !important;top:18px !important;width:auto !important;max-width:none !important;z-index:20 !important}
      .carousel-overlay small{margin:0 0 6px !important;padding:4px 8px !important;font-size:7px !important}
      .carousel-overlay h3{max-width:92% !important;font-size:clamp(22px,7vw,30px) !important;line-height:1.03 !important}
      .carousel-overlay h3::after{max-width:88% !important;margin-top:7px !important;font-size:9.5px !important;line-height:1.25 !important}
      .hero-grid > div:first-child .hero-search-wrap{left:12px !important;right:12px !important;bottom:58px !important;width:auto !important;height:9vh !important;max-height:48px !important;min-height:42px !important;z-index:35 !important}
      .hero-grid > div:first-child .hero-search{width:100% !important;height:100% !important;min-height:0 !important;padding:3px !important;display:flex !important;flex-direction:row !important;align-items:center !important;gap:3px !important;border-radius:13px !important;box-shadow:0 11px 28px rgba(0,0,0,.30) !important;background:rgba(255,255,255,.97) !important}
      .hero-grid > div:first-child .hero-search .search-leading{width:24px !important;flex:0 0 24px !important;font-size:14px !important}
      .hero-grid > div:first-child .hero-search input{height:100% !important;min-height:0 !important;padding:0 3px !important;font-size:10.5px !important;line-height:1 !important}
      .hero-grid > div:first-child .hero-search .search-status{display:none !important}
      .hero-grid > div:first-child .hero-search .search-btn{height:100% !important;min-height:0 !important;flex:0 0 70px !important;padding:0 8px !important;border-radius:9px !important;font-size:10px !important}
      .hero-grid > div:first-child .search-helper{display:none !important}
      .carousel-dots{left:7px !important;right:7px !important;bottom:6px !important;gap:3px !important;z-index:45 !important}
      .carousel-dots .carousel-dot{min-height:48px !important;height:48px !important;padding:2px !important;gap:1px !important;border-radius:9px !important}
      .carousel-dots .carousel-dot::before{width:20px !important;height:20px !important;flex-basis:20px !important;font-size:10px !important}
      .carousel-dots .carousel-dot::after{font-size:6.5px !important;white-space:nowrap !important}
    }
  `;
  document.head.appendChild(style);
})();

(function(){
  if(!document.querySelector('.hero-visual')) return;
  const style=document.createElement('style');
  style.id='shh-mobile-hero-half-screen';
  style.textContent=`
    @media (max-width:600px){
      .hero > .container.hero-grid,.hero-visual{height:50vh !important;min-height:50vh !important;max-height:50vh !important}
      .carousel-card img{object-fit:contain !important;object-position:center top !important}
      .carousel-overlay{top:14px !important;left:12px !important;right:12px !important}
      .carousel-overlay h3{font-size:clamp(20px,6.5vw,28px) !important}
      .carousel-overlay h3::after{font-size:9px !important}
      .hero-grid > div:first-child .hero-search-wrap{bottom:57px !important;height:clamp(38px,4.5vh,48px) !important;max-height:48px !important}
      .hero-grid > div:first-child .hero-search{height:100% !important;min-height:0 !important;padding:2px !important;border-radius:11px !important}
      .hero-grid > div:first-child .hero-search input{height:100% !important;min-height:0 !important;font-size:10px !important;padding:0 2px !important}
      .hero-grid > div:first-child .hero-search .search-leading{width:22px !important;flex-basis:22px !important;font-size:13px !important}
      .hero-grid > div:first-child .hero-search .search-btn{height:100% !important;min-height:0 !important;flex-basis:64px !important;font-size:9px !important;padding:0 6px !important;border-radius:8px !important}
      .carousel-dots{bottom:5px !important;left:6px !important;right:6px !important;gap:3px !important}
      .carousel-dots .carousel-dot{height:46px !important;min-height:46px !important;padding:2px !important;border-radius:8px !important}
      .carousel-dots .carousel-dot::before{width:19px !important;height:19px !important;flex-basis:19px !important;font-size:9px !important}
      .carousel-dots .carousel-dot::after{font-size:6px !important}
    }
  `;
  document.head.appendChild(style);
})();

(function(){
  if(!document.querySelector('.stats-grid')) return;
  const style=document.createElement('style');
  style.id='shh-mobile-stats-one-row';
  style.textContent=`
    @media (max-width:600px){
      .stats-wrap .stats-grid{
        display:grid !important;
        grid-template-columns:repeat(5,minmax(0,1fr)) !important;
        gap:4px !important;
        width:100% !important;
      }
      .stats-wrap .stat-card{
        min-width:0 !important;
        width:100% !important;
        padding:10px 3px !important;
        border-radius:12px !important;
      }
      .stats-wrap .stat-number{
        font-size:clamp(20px,6.2vw,30px) !important;
        line-height:1 !important;
        white-space:nowrap !important;
      }
      .stats-wrap .stat-label{
        font-size:clamp(7px,2.15vw,10px) !important;
        line-height:1.08 !important;
        white-space:nowrap !important;
        overflow:hidden !important;
        text-overflow:clip !important;
      }
    }
  `;
  document.head.appendChild(style);
})();
