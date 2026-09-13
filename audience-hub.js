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
