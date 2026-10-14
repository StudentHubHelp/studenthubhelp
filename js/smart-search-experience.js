(() => {
  'use strict';
  const ROOT = 'https://idurlccrarznnnqixxsd.supabase.co';
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdXJsY2NyYXJ6bm5ucWl4eHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5ODY3NTgsImV4cCI6MjEwMzU2Mjc1OH0.pq_rza98twL-SETqm_6TGNzsPCkVJxwjocFUeLB1yMA';
  const CATS = [
    {key:'hostel',table:'hostels',label:'Hostel / PG',icon:'🏠'},
    {key:'tiffin',table:'tiffins',label:'Tiffin / Mess',icon:'🍱'},
    {key:'library',table:'libraries',label:'Library',icon:'📚'},
    {key:'cafe',table:'cafes',label:'Cafe',icon:'☕'},
    {key:'bookstore',table:'bookstores',label:'Bookstore',icon:'📖'}
  ];
  const CHIPS = [
    {label:'CLC',query:'CLC ke paas hostel'},
    {label:'Vibrant Coaching',query:'Vibrant coaching ke paas hostel'},
    {label:'Piprali Road',query:'Piprali Road hostel'},
    {label:'Nawalgarh Road',query:'Nawalgarh Road hostel'},
    {label:'Girls Hostel',query:'girls hostel'},
    {label:'Tiffin',query:'tiffin'},
    {label:'Near me',query:'near me',nearby:true}
  ];
  const norm = v => String(v ?? '').toLocaleLowerCase('en-IN').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const get = (r, keys) => { for (const k of keys) if (r?.[k] != null && String(r[k]).trim()) return String(r[k]).trim(); return ''; };
  const nameOf = r => get(r,['name','property_name','service_name','title','business_name']);
  const areaOf = r => get(r,['area','locality','neighborhood','service_area','landmark','address','full_address']);
  const cityOf = r => get(r,['city','district']);
  const statusOf = r => get(r,['status','listing_status','approval_status']).toLowerCase();
  const isPublic = r => ['active','published','approved','live'].includes(statusOf(r)) || r?.is_active === true || r?.active === true;
  let rowsPromise;
  function loadRows() {
    if (rowsPromise) return rowsPromise;
    rowsPromise = (async () => {
      if (!window.supabase?.createClient) return [];
      const db = window.__SHH_SMART_SEARCH_DB__ || (window.__SHH_SMART_SEARCH_DB__ = window.supabase.createClient(ROOT, ANON, {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}));
      const batches = await Promise.all(CATS.map(async c => {
        try {
          const {data,error} = await db.from(c.table).select('*').limit(500);
          if (error) { console.warn('[Smart Search] Could not load '+c.table, error.message); return []; }
          return (Array.isArray(data)?data:[]).filter(isPublic).map(r=>({...r,__smartCategory:c.key,__smartCategoryLabel:c.label,__smartIcon:c.icon}));
        } catch (e) { console.warn('[Smart Search] '+c.table+' unavailable'); return []; }
      }));
      return batches.flat();
    })();
    return rowsPromise;
  }
  function chipsMarkup() {
    return '<span class="shh-home-chip-label">Try:</span>' + CHIPS.map(c=>'<button type="button" class="shh-home-chip" data-query="'+esc(c.query)+'"'+(c.nearby?' data-nearby="1"':'')+'>'+esc(c.label)+'</button>').join('');
  }
  function attach() {
    const section = document.getElementById('homepageGlobalSearch');
    const form = section?.querySelector('form.homepage-global-search');
    const input = form?.querySelector('input[name="q"]');
    const searchBox = form?.querySelector('.homepage-search-box');
    const hint = form?.querySelector('.homepage-search-hint');
    if (!section || !form || !input || !searchBox || !hint || section.dataset.smartSearchReady === '1') return;
    section.dataset.smartSearchReady = '1';
    const style = document.createElement('style');
    style.id = 'shh-smart-search-style';
    style.textContent = `
      #homepageGlobalSearch .homepage-global-search{position:relative}
      #homepageGlobalSearch .homepage-search-box{position:relative;z-index:2;overflow:visible}
      #homepageGlobalSearch .shh-home-suggestions{position:absolute;top:calc(100% + 7px);left:0;right:0;z-index:1000;max-height:min(390px,58vh);overflow:auto;background:#fff;border:1px solid #e1e7f0;border-radius:14px;box-shadow:0 18px 44px rgba(7,26,51,.20);text-align:left}
      #homepageGlobalSearch .shh-home-suggestions[hidden]{display:none}
      #homepageGlobalSearch .shh-home-suggestion{display:flex;align-items:center;gap:10px;width:100%;padding:11px 13px;border:0;border-bottom:1px solid #edf0f4;background:#fff;text-align:left;cursor:pointer;color:#15243b}
      #homepageGlobalSearch .shh-home-suggestion:hover,#homepageGlobalSearch .shh-home-suggestion:focus-visible{background:#f4f7fb}
      #homepageGlobalSearch .shh-home-suggestion-icon{display:grid;place-items:center;width:34px;height:34px;flex:0 0 34px;border-radius:10px;background:#f2f5fa}
      #homepageGlobalSearch .shh-home-suggestion-main{min-width:0;flex:1}
      #homepageGlobalSearch .shh-home-suggestion-title{display:block;font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #homepageGlobalSearch .shh-home-suggestion-sub{display:block;margin-top:3px;color:#697586;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #homepageGlobalSearch .shh-home-suggestion-type{color:#315d95;font-size:10px;font-weight:800;white-space:nowrap}
      #homepageGlobalSearch .homepage-search-hint{display:flex;justify-content:center;align-items:center;gap:6px;flex-wrap:wrap;margin-top:9px;color:#555;font-size:10px;font-weight:600}
      #homepageGlobalSearch .shh-home-chip{border:1px solid #e5d6dc;background:#fff;color:#70394d;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:800;cursor:pointer;transition:background .15s,border-color .15s}
      #homepageGlobalSearch .shh-home-chip:hover{background:#fff0f5;border-color:#df9ab0}
      #homepageGlobalSearch .shh-home-chip-label{font-weight:800;color:#5d5260}
      @media(max-width:600px){#homepageGlobalSearch .homepage-search-hint{font-size:10px;gap:5px}#homepageGlobalSearch .shh-home-chip{padding:5px 8px;font-size:10px}#homepageGlobalSearch .shh-home-suggestion{padding:10px}#homepageGlobalSearch .shh-home-suggestion-title{font-size:12px}}
    `;
    document.head.appendChild(style);
    hint.innerHTML = chipsMarkup();
    const dropdown = document.createElement('div');
    dropdown.className = 'shh-home-suggestions';
    dropdown.id = 'shhHomeSearchSuggestions';
    dropdown.setAttribute('role','listbox');
    dropdown.hidden = true;
    searchBox.appendChild(dropdown);
    input.setAttribute('role','combobox');
    input.setAttribute('aria-autocomplete','list');
    input.setAttribute('aria-controls',dropdown.id);
    input.setAttribute('aria-expanded','false');
    let timer = null, request = 0, activeIndex = -1, currentItems = [];
    const close = () => { dropdown.hidden = true; dropdown.innerHTML=''; currentItems=[]; activeIndex=-1; input.setAttribute('aria-expanded','false'); };
    const go = q => { const query=String(q||'').trim(); if(query) window.location.href='global-search.html?q='+encodeURIComponent(query); };
    const goNearMe = () => {
      if (!navigator.geolocation) { window.alert('Location is not available in this browser. Please search by city or area.'); return; }
      navigator.geolocation.getCurrentPosition(pos => {
        try { sessionStorage.setItem('shhSmartSearchCoords', JSON.stringify({lat:pos.coords.latitude,lng:pos.coords.longitude,at:Date.now()})); }
        catch (e) { window.alert('Could not keep your location for this search. Please search by city or area.'); return; }
        go('near me');
      }, () => window.alert('Location permission was not granted. Please search by city or area instead.'), {enableHighAccuracy:false,timeout:8000,maximumAge:300000});
    };
    function render(items) {
      currentItems = items.slice(0,7);
      activeIndex=-1;
      dropdown.innerHTML = currentItems.map((x,i)=>'<button type="button" role="option" aria-selected="false" class="shh-home-suggestion" data-index="'+i+'"'+(x.nearby?' data-nearby="1"':'')+'><span class="shh-home-suggestion-icon">'+esc(x.icon||'⌕')+'</span><span class="shh-home-suggestion-main"><span class="shh-home-suggestion-title">'+esc(x.title)+'</span><span class="shh-home-suggestion-sub">'+esc(x.sub||'Search matching listings')+'</span></span><span class="shh-home-suggestion-type">'+esc(x.kind||'Search')+'</span></button>').join('');
      dropdown.hidden = currentItems.length===0;
      input.setAttribute('aria-expanded',String(currentItems.length>0));
      dropdown.querySelectorAll('.shh-home-suggestion').forEach(btn=>btn.addEventListener('click',()=>{const item=currentItems[Number(btn.dataset.index)];if(item?.nearby)goNearMe();else go(item?.query);}));
    }
    async function suggest(q, seq) {
      const n=norm(q);
      const items=[];
      if (n.length<2) { close(); return; }
      const add=(x)=>{ if(x?.title && !items.some(y=>norm(y.title)===norm(x.title)&&y.kind===x.kind)) items.push(x); };
      try {
        const rows=await loadRows();
        if (seq!==request || norm(input.value)!==n) return;
        const matches=rows.map(r=>{
          const name=nameOf(r),area=areaOf(r),city=cityOf(r);
          const hay=norm([name,area,city,r.nearby_coaching,r.landmark,r.description,r.category,r.type].filter(Boolean).join(' '));
          const exact=hay.includes(n), words=n.split(' ').filter(Boolean);
          const hits=words.filter(w=>hay.includes(w)).length;
          return {r,name,area,city,score:(exact?100:0)+hits*12+(norm(name).startsWith(n)?18:0)};
        }).filter(x=>x.name&&x.score>0).sort((a,b)=>b.score-a.score);
        matches.slice(0,5).forEach(x=>add({title:x.name,query:x.name,sub:[x.area,x.city].filter(Boolean).join(' · ')||'Active StudentHubHelp listing',kind:x.r.__smartCategoryLabel,icon:x.r.__smartIcon}));
        const staticSuggestions=[
          {match:['clc','career line'],title:'CLC coaching area',query:'CLC ke paas hostel',sub:'Search hostels and PGs near CLC',kind:'Landmark',icon:'📍'},
          {match:['vibrant'],title:'Vibrant Coaching area',query:'Vibrant coaching ke paas hostel',sub:'Search around Vibrant Coaching',kind:'Landmark',icon:'📍'},
          {match:['piprali'],title:'Piprali Road, Sikar',query:'Piprali Road hostel',sub:'Search listings on Piprali Road',kind:'Area',icon:'🛣️'},
          {match:['nawalgarh'],title:'Nawalgarh Road, Sikar',query:'Nawalgarh Road hostel',sub:'Search listings on Nawalgarh Road',kind:'Area',icon:'🛣️'},
          {match:['hostel','pg','room','single room','girls','boys','हॉस्टल','कमरा'],title:'Hostels & PGs',query:q,sub:'Search accommodation using your full query',kind:'Category',icon:'🏠'},
          {match:['tiffin','mess','टिफिन','मेस'],title:'Tiffin & Mess',query:q,sub:'Search food services using your full query',kind:'Category',icon:'🍱'},
          {match:['library','study room','लाइब्रेरी'],title:'Libraries',query:q,sub:'Search libraries using your full query',kind:'Category',icon:'📚'},
          {match:['cafe','coffee','कैफे'],title:'Cafes',query:q,sub:'Search cafes using your full query',kind:'Category',icon:'☕'},
          {match:['bookstore','book store','books','किताब'],title:'Bookstores',query:q,sub:'Search bookstores using your full query',kind:'Category',icon:'📖'}
        ];
        staticSuggestions.filter(x=>x.match.some(k=>n.includes(norm(k)))).forEach(x=>add(x));
        add({title:'Search for “'+q.trim()+'”',query:q,sub:'Use full Hindi / Hinglish query and filters',kind:'Smart Search',icon:'✦'});
        render(items);
      } catch(e) {
        if (seq===request) render([{title:'Search for “'+q.trim()+'”',query:q,sub:'Search live listings with your full query',kind:'Smart Search',icon:'✦'}]);
      }
    }
    input.addEventListener('input',()=>{
      clearTimeout(timer);
      const q=input.value.trim(),seq=++request;
      if(!q){close();return;}
      timer=setTimeout(()=>suggest(q,seq),180);
    });
    input.addEventListener('keydown',e=>{
      if(dropdown.hidden) { if(e.key==='Enter'){e.preventDefault();go(input.value);} return; }
      const buttons=[...dropdown.querySelectorAll('.shh-home-suggestion')];
      if(e.key==='ArrowDown'){e.preventDefault();activeIndex=Math.min(buttons.length-1,activeIndex+1);}
      else if(e.key==='ArrowUp'){e.preventDefault();activeIndex=Math.max(0,activeIndex-1);}
      else if(e.key==='Escape'){close();return;}
      else if(e.key==='Enter'){e.preventDefault();if(activeIndex>=0&&currentItems[activeIndex])go(currentItems[activeIndex].query);else go(input.value);return;}
      else return;
      buttons.forEach((b,i)=>{b.classList.toggle('active',i===activeIndex);b.setAttribute('aria-selected',String(i===activeIndex));});
      buttons[activeIndex]?.scrollIntoView({block:'nearest'});
    });
    form.addEventListener('submit',e=>{e.preventDefault();go(input.value);});
    hint.addEventListener('click',e=>{const b=e.target.closest('[data-query]');if(!b)return;if(b.dataset.nearby)goNearMe();else go(b.dataset.query);});
    document.addEventListener('click',e=>{if(!section.contains(e.target))close();});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',attach,{once:true}); else attach();
})();