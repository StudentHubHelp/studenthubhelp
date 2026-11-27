(function(){
  'use strict';
  const page = location.pathname.split('/').pop().toLowerCase();
  const config = {
    'pg-finder.html': {label:'Hostel / PG', icon:'fa-house', fields:['name','property_id','city','area','address','phone','category','gender','room_type','sharing','price','rent','facilities','nearby','rating']},
    'tiffin-finder.html': {label:'Tiffin / Mess', icon:'fa-utensils', fields:['name','property_id','city','area','address','phone','category','food_type','meal_type','price','monthly_price','facilities','timing','rating','verified']},
    'library-finder.html': {label:'Library', icon:'fa-book-open', fields:['name','property_id','city','area','address','phone','category','price','monthly_price','facilities','timing','seats','rating','verified']},
    'cafe-finder.html': {label:'Cafe', icon:'fa-mug-hot', fields:['name','property_id','city','area','address','phone','category','price','price_range','facilities','timing','rating','verified']},
    'bookstore-finder.html': {label:'Book Store', icon:'fa-book', fields:['name','property_id','city','area','address','phone','category','book_type','specialization','price','price_range','facilities','timing','rating','verified']}
  }[page];
  if(!config) return;

  const ready=()=>{
    const input=document.getElementById('searchInput');
    const btn=document.getElementById('searchBtn');
    const box=document.querySelector('.search-box');
    if(!input||!box) return;
    if(!window.StudentHubLocationRegistry){
      const registryScript=document.createElement('script');
      registryScript.src='/js/location-intelligence-registry.js';
      registryScript.onload=()=>ready();
      registryScript.onerror=()=>console.warn('StudentHubHelp location registry could not load');
      document.head.appendChild(registryScript);
      return;
    }
    if(!window.StudentHubSearchEngine){
      const s=document.createElement('script');
      s.src='/search-phase5-natural-language.js';
      s.onload=()=>ready();
      s.onerror=()=>console.warn('StudentHubHelp unified search engine could not load');
      document.head.appendChild(s);
      return;
    }

    const style=document.createElement('style');
    style.id='finder-power-search-style';
    style.textContent=`
      .finder-power-panel{position:relative;margin-top:10px;width:min(940px,100%);z-index:100}
      .finder-power-filters{display:flex;flex-wrap:wrap;gap:7px;padding:9px;border:1px solid #e6eaf0;border-radius:14px;background:#fff;box-shadow:0 12px 35px rgba(7,26,51,.10)}
      .finder-power-filters input,.finder-power-filters select{min-height:36px;border:1px solid #e6eaf0;border-radius:9px;padding:0 9px;background:#fff;color:#162033;font-size:10px;font-weight:700;outline:0}
      .finder-power-filters input:focus,.finder-power-filters select:focus{border-color:#d7a63d;box-shadow:0 0 0 3px rgba(215,166,61,.12)}
      .finder-power-toggle{border:1px solid rgba(242,200,102,.35);background:rgba(7,26,51,.92);color:#f2c866;border-radius:9px;min-height:36px;padding:0 11px;font-size:10px;font-weight:900}
      .finder-power-clear{border:1px solid #e6eaf0;background:#f8fafc;color:#162033;border-radius:9px;min-height:36px;padding:0 11px;font-size:10px;font-weight:900}
      .finder-power-suggest{position:absolute;left:0;right:0;top:calc(100% + 7px);display:none;max-height:340px;overflow:auto;border:1px solid #e6eaf0;border-radius:14px;background:#fff;box-shadow:0 22px 60px rgba(7,26,51,.18);padding:6px}
      .finder-power-suggest.show{display:block}
      .finder-power-result{display:flex;align-items:center;gap:10px;width:100%;padding:10px;border:0;border-radius:10px;background:#fff;text-align:left;color:#162033}
      .finder-power-result:hover,.finder-power-result.active{background:#f5f7fb}
      .finder-power-result i{width:28px;height:28px;display:grid;place-items:center;border-radius:8px;background:#fff7df;color:#a27409}
      .finder-power-result strong{display:block;font-size:11px;line-height:1.25}.finder-power-result small{display:block;color:#667085;font-size:9px;margin-top:2px}
      .finder-power-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;width:100%;font-size:9px;color:#667085;padding:2px 3px 4px}
      .finder-power-badge{padding:4px 7px;border-radius:999px;background:#eff6ff;color:#2563eb;font-weight:900}
      .finder-power-badge.gold{background:#fff7df;color:#9a6a00}.finder-power-badge.green{background:#eaf8f0;color:#16834b}
      @media(max-width:720px){.finder-power-filters{display:grid;grid-template-columns:1fr 1fr}.finder-power-filters input,.finder-power-filters select,.finder-power-toggle,.finder-power-clear{width:100%}.finder-power-panel{width:100%}}
    `;
    style.textContent += `
      /* Keep autocomplete dropdown above the hero and prevent parent clipping */
      .hero-banner-wrap{position:relative!important;z-index:30!important;overflow:visible!important}
      .hero-banner-box{overflow:visible!important}
      .hero-content{position:relative!important;z-index:31!important;overflow:visible!important}
      .search-box{z-index:33!important}
      .finder-power-panel{position:relative!important;z-index:35!important;overflow:visible!important}
      .finder-power-suggest{position:absolute!important;z-index:9999!important;left:0!important;right:0!important;top:calc(100% + 8px)!important;max-height:min(360px,55vh)!important;overflow-y:auto!important;overscroll-behavior:contain!important}
      .finder-power-chips{position:relative;z-index:32}
      /* Premium, Dribbble-inspired search polish shared by all finder pages */
      .search-box{position:relative!important;isolation:isolate!important;display:flex!important;align-items:center!important;gap:12px!important;width:min(100%,900px)!important;min-height:76px!important;padding:9px!important;border:1px solid rgba(255,255,255,.78)!important;border-radius:24px!important;background:rgba(255,255,255,.97)!important;box-shadow:0 22px 65px rgba(5,20,45,.22),0 2px 8px rgba(5,20,45,.06)!important;backdrop-filter:blur(18px)!important;transition:box-shadow .22s ease,border-color .22s ease!important}
      .search-box:focus-within{border-color:#e5bd65!important;box-shadow:0 24px 70px rgba(5,20,45,.25),0 0 0 4px rgba(229,189,101,.18)!important}
      /* The search action already has its own icon; hide the redundant leading icon on every finder viewport. */
      .search-box .search-icon{display:none!important}
      .search-box #searchInput{min-width:0!important;flex:1!important;height:54px!important;border:0!important;outline:0!important;background:transparent!important;color:#12243c!important;font-size:15px!important;font-weight:600!important;box-shadow:none!important}
      .search-box #searchInput::placeholder{color:#8995a7!important;font-weight:500!important}
      .search-box .search-btn{min-height:54px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:9px!important;padding:0 24px!important;border:0!important;border-radius:17px!important;background:linear-gradient(135deg,#102b4b,#071a33)!important;color:#fff!important;font-size:13px!important;font-weight:800!important;box-shadow:0 8px 20px rgba(7,26,51,.2)!important;transition:transform .2s ease,box-shadow .2s ease!important}
      .search-box .search-btn:hover{transform:translateY(-1px)!important;box-shadow:0 12px 26px rgba(7,26,51,.28)!important}
      .finder-power-chips{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:15px 0 2px;width:min(100%,900px);color:rgba(255,255,255,.8)}
      .finder-power-chips-label{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.76);margin-right:3px}
      .finder-power-chip{display:inline-flex;align-items:center;gap:7px;min-height:34px;padding:7px 12px;border:1px solid rgba(255,255,255,.25);border-radius:999px;background:rgba(255,255,255,.10);color:#fff;font-size:11px;font-weight:700;cursor:pointer;backdrop-filter:blur(8px);transition:all .18s ease}
      .finder-power-chip:hover,.finder-power-chip:focus-visible{background:#fff;color:#102a43;border-color:#fff;transform:translateY(-1px);outline:none}
      .finder-power-panel{margin-top:12px!important}
      .finder-power-filters{border-radius:18px!important;padding:12px!important;box-shadow:0 18px 44px rgba(7,26,51,.12)!important}
      .finder-power-filters input,.finder-power-filters select{min-height:42px!important;border-radius:12px!important;font-size:12px!important}
      .finder-power-toggle,.finder-power-clear{min-height:42px!important;border-radius:12px!important;font-size:11px!important}
      .finder-power-suggest{border-radius:18px!important;padding:8px!important}
      .finder-power-result{min-height:60px!important;padding:12px!important;border-radius:13px!important}
      .finder-power-result strong{font-size:12px!important}.finder-power-result small{font-size:10px!important}
      @media(max-width:720px){.search-box{display:flex!important;flex-direction:row!important;align-items:center!important;flex-wrap:nowrap!important;min-height:62px!important;padding:6px!important;gap:8px!important;border-radius:18px!important}.search-box .search-icon{display:none!important}.search-box #searchInput{display:block!important;flex:1 1 auto!important;width:0!important;min-width:0!important;height:44px!important;font-size:13px!important;padding:0 8px!important;line-height:1.3!important}.search-box .search-btn{display:inline-flex!important;flex:0 0 46px!important;align-items:center!important;justify-content:center!important;min-height:44px!important;height:44px!important;width:46px!important;min-width:46px!important;padding:0!important;border-radius:13px!important;font-size:0!important;gap:0!important}.search-box .search-btn i{display:inline-block!important;font-size:16px!important}.finder-power-chips{gap:6px!important;margin-top:12px!important}.finder-power-chips-label{width:100%;font-size:10px}.finder-power-chip{min-height:32px;padding:7px 10px;font-size:10px}}
      .finder-power-nearby-row{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:0 0 9px}
      .finder-power-nearby{min-height:40px;padding:0 14px;border:1px solid rgba(22,131,75,.24);border-radius:12px;background:#eefaf3;color:#126c3e;font-size:11px;font-weight:900;cursor:pointer;transition:background .18s,border-color .18s}
      .finder-power-nearby:hover{background:#e1f5e9;border-color:#9bd5b2}
      .finder-power-nearby[aria-pressed="true"]{background:#126c3e;color:#fff;border-color:#126c3e}
      .finder-power-nearby:disabled{opacity:.65;cursor:wait}
      .finder-power-nearby-status{font-size:10px;font-weight:700;color:#667085}
      .finder-power-nearby-status[data-state="error"]{color:#b42318}
      .shh-nearby-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px}
      .shh-nearby-distance{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;background:#eaf8f0;color:#137447;font-size:10px;font-weight:900}
      .shh-nearby-directions{color:#315d95;font-size:10px;font-weight:900;text-decoration:none}
      .shh-nearby-directions:hover{text-decoration:underline}
      @media(max-width:720px){.finder-power-nearby-row{align-items:stretch}.finder-power-nearby{width:100%;min-height:42px}.finder-power-nearby-status{width:100%}}
      @media(prefers-reduced-motion:reduce){.finder-power-chip,.search-box,.search-box .search-btn,.finder-power-nearby{transition:none!important}}
    `;
    document.head.appendChild(style);

    const panel=document.createElement('div'); panel.className='finder-power-panel';
    panel.innerHTML=`
      <div class="finder-power-nearby-row">
        <button type="button" class="finder-power-nearby" id="finderPowerNearby" aria-pressed="false"><i class="fa-solid fa-location-crosshairs"></i> Use My Location · 5 km</button>
        <span class="finder-power-nearby-status" id="finderPowerNearbyStatus" role="status" aria-live="polite"></span>
      </div>
      <div class="finder-power-filters" id="finderPowerFilters">
        <button type="button" class="finder-power-toggle" id="finderPowerToggle"><i class="fa-solid fa-sliders"></i> Smart Filters</button>
        <input id="finderPowerCity" placeholder="City" aria-label="Filter by city">
        <input id="finderPowerArea" placeholder="Area / locality" aria-label="Filter by area">
        <input id="finderPowerMin" type="number" min="0" placeholder="Min price" aria-label="Minimum price">
        <input id="finderPowerMax" type="number" min="0" placeholder="Maximum price" aria-label="Maximum price">
        <select id="finderPowerRating" aria-label="Minimum rating"><option value="">Any rating</option><option value="4.5">4.5+ ★</option><option value="4">4+ ★</option><option value="3">3+ ★</option></select>
        <label style="display:flex;align-items:center;gap:6px;padding:0 4px;font-size:10px;font-weight:800;color:#162033"><input id="finderPowerVerified" type="checkbox"> Verified only</label>
        <button type="button" class="finder-power-clear" id="finderPowerClear">Clear</button>
      </div>
      <div class="finder-power-suggest" id="finderPowerSuggest" role="listbox"></div>`;
    box.parentNode.insertBefore(panel,box.nextSibling);

    const popularByPage={
      'pg-finder.html':['Boys hostel in Sikar','Girls PG in Kota','Hostel near Allen'],
      'tiffin-finder.html':['Veg tiffin in Sikar','Monthly tiffin in Kota','Home-style food'],
      'library-finder.html':['Library in Jaipur','WiFi study library','Reading room near college'],
      'cafe-finder.html':['Cafe in Jaipur','Cafe with WiFi','Cafe near college'],
      'bookstore-finder.html':['Bookstore in Sikar','Competitive exam books','Stationery shop in Kota']
    };
    const chips=document.createElement('div');
    chips.className='finder-power-chips';
    chips.setAttribute('aria-label','Popular search suggestions');
    const chipsLabel=document.createElement('span');
    chipsLabel.className='finder-power-chips-label';
    chipsLabel.textContent='Try searching';
    chips.appendChild(chipsLabel);
    (popularByPage[page]||[]).forEach(query=>{
      const chip=document.createElement('button');
      chip.type='button'; chip.className='finder-power-chip';
      chip.innerHTML='<i class="fa-solid fa-arrow-trend-up" aria-hidden="true"></i> ';
      chip.appendChild(document.createTextNode(query));
      chip.addEventListener('click',()=>{
        input.value=query;
        suggest.classList.remove('show');
        render();
        input.focus();
      });
      chips.appendChild(chip);
    });
    box.parentNode.insertBefore(chips,panel);
    const matchNote=document.createElement('div');
    matchNote.id='finderPowerMatchNote';
    matchNote.hidden=true;
    matchNote.setAttribute('role','status');
    matchNote.style.cssText='margin:10px 0 14px;padding:10px 12px;border:1px solid #e6eaf0;border-radius:10px;background:#f8fafc;color:#667085;font-size:10px;font-weight:800;';
    const grid=document.getElementById('listingGrid');
    if(grid && grid.parentNode) grid.parentNode.insertBefore(matchNote,grid);
    const filters=panel.querySelector('#finderPowerFilters');
    const suggest=panel.querySelector('#finderPowerSuggest');
    filters.style.display='none';

    const state={city:'',area:'',min:null,max:null,rating:null,verified:false,active:0,nearby:false,coords:null};
    const nearby=window.StudentHubNearbySearch;
    const nearbyButton=document.getElementById('finderPowerNearby');
    const nearbyStatus=document.getElementById('finderPowerNearbyStatus');
    const setNearbyStatus=(message,type)=>{if(!nearbyStatus)return;nearbyStatus.textContent=message||'';nearbyStatus.dataset.state=type||'info';};
    const syncNearbyButton=()=>{if(!nearbyButton)return;nearbyButton.setAttribute('aria-pressed',String(state.nearby));nearbyButton.innerHTML=state.nearby?'<i class="fa-solid fa-location-dot"></i> Nearby On · Clear':'<i class="fa-solid fa-location-crosshairs"></i> Use My Location · 5 km';};
    const val=id=>String(document.getElementById(id)?.value||'').trim();
    const norm=v=>String(v??'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
    const numberFrom=v=>{const n=Number(String(v??'').replace(/[^0-9.]/g,''));return Number.isFinite(n)?n:null};
    const searchable=r=>config.fields.map(k=>r?.[k]).concat(Object.values(r||{})).filter(v=>v!==null&&v!==undefined).join(' ');
    const score=(r,q)=>{
      if(!q) return 0;
      const n=norm(q), fields=config.fields.map(k=>norm(r?.[k])); let s=0;
      fields.forEach((v,i)=>{if(!v)return; if(v===n)s+=100-i; else if(v.startsWith(n))s+=55-i; else if(v.includes(n))s+=25-i});
      const tokens=n.split(/\s+/).filter(Boolean); tokens.forEach(t=>{if(searchable(r).toLowerCase().includes(t))s+=8});
      return s;
    };
    const passes=r=>{
      const hay=norm(searchable(r));
      if(state.city && !norm(r.city).includes(norm(state.city)) && !hay.includes(norm(state.city))) return false;
      if(state.area && !norm(r.area).includes(norm(state.area)) && !hay.includes(norm(state.area))) return false;
      const price=numberFrom(r.price ?? r.monthly_price ?? r.rent ?? r.price_range);
      if(state.min!==null && (price===null || price<state.min)) return false;
      if(state.max!==null && (price===null || price>state.max)) return false;
      const rating=numberFrom(r.rating);
      if(state.rating!==null && (rating===null || rating<state.rating)) return false;
      if(state.verified && !(r.verified===true || norm(r.verified)==='true')) return false;
      return true;
    };
    const originalRecords=()=>Array.isArray(allRecords)?allRecords:[];
    const render=()=>{
      const source=originalRecords();
      const query=input.value.trim();
      const categoryKey=page==='pg-finder.html'?'hostel':page.replace('-finder.html','');
      let ranked=window.StudentHubSearchEngine.rankRows(source,query,categoryKey);
      ranked=ranked.filter(passes);
      if(state.nearby && state.coords && nearby){
        ranked=nearby.filterWithinRadius(ranked,state.coords,nearby.defaultRadiusKm);
      }

      const backupRecords=allRecords;
      const backupValue=input.value;

      // renderRecords() has its own legacy literal-text filter. Temporarily clear
      // the input so it renders the already-ranked unified result set instead of
      // applying the natural-language query a second time.
      allRecords=ranked;
      input.value='';
      try{ renderRecords(); } finally {
        input.value=backupValue;
        allRecords=backupRecords;
      }
      if(state.nearby && nearby && grid){
        grid.querySelectorAll('.card').forEach((card,index)=>{
          const record=ranked[index];
          if(!record || record.__nearbyDistanceKm==null)return;
          const metaNode=document.createElement('div');
          metaNode.className='shh-nearby-meta';
          const distanceNode=document.createElement('span');
          distanceNode.className='shh-nearby-distance';
          distanceNode.textContent='📍 '+nearby.formatDistance(record.__nearbyDistanceKm)+' away';
          metaNode.appendChild(distanceNode);
          const directions=nearby.directionsUrl(record);
          if(directions){
            const link=document.createElement('a');
            link.className='shh-nearby-directions';
            link.href=directions;
            link.target='_blank';
            link.rel='noopener noreferrer';
            link.textContent='Directions ↗';
            metaNode.appendChild(link);
          }
          (card.querySelector('.card-body')||card).appendChild(metaNode);
        });
      }

      const meta=document.getElementById('resultText');
      const note=document.getElementById('finderPowerMatchNote');
      const tier=ranked[0]?.__matchTier||'';
      if(meta && state.nearby){
        meta.textContent=query
          ? `Showing ${ranked.length} matching listing${ranked.length===1?'':'s'} within 5 km for "${query}"`
          : `Showing ${ranked.length} listing${ranked.length===1?'':'s'} within 5 km, nearest first`;
      }else if(meta && query){
        if(tier==='exact'){
          meta.textContent=`Showing ${ranked.length} exact result${ranked.length===1?'':'s'} for "${query}"`;
        }else if(tier==='nearby'){
          meta.textContent=`No exact match for "${query}". Showing ${ranked.length} nearby / related option${ranked.length===1?'':'s'} — exact location not confirmed.`;
        }else{
          meta.textContent=`No exact match for "${query}". Showing ${ranked.length} broader option${ranked.length===1?'':'s'} — exact location not confirmed.`;
        }
      }
      if(note){
        note.hidden=!state.nearby;
        note.textContent=state.nearby
          ? (ranked.length ? 'Nearby search is active: results are within 5 km, sorted by straight-line distance.' : 'No active listings with valid coordinates were found within 5 km. Try another location or use the regular search.')
          : '';
      }
      return ranked;
    };
    const escapeText=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    const suggestions=()=>{
      const q=norm(input.value); if(!q){suggest.classList.remove('show');suggest.innerHTML='';return;}
      const categoryKey=page==='pg-finder.html'?'hostel':page.replace('-finder.html','');
      const ranked=window.StudentHubSearchEngine.rankRows(originalRecords(),q,categoryKey).map((r,i)=>({r,i,s:r.__unifiedScore||0})).slice(0,8);
      suggest.innerHTML=ranked.length?ranked.map((x,i)=>{
        const r=x.r,name=String(r.name||r.title||config.label),area=String(r.area||r.city||r.address||'');
        return `<button type="button" class="finder-power-result" data-index="${i}"><i class="fa-solid ${config.icon}"></i><span><strong>${escapeText(name)}</strong><small>${escapeText(area)}${r.property_id?' • ID #'+escapeText(r.property_id):''}</small></span></button>`;
      }).join(''):`<div class="finder-power-meta">No matching suggestions</div>`;
      suggest._rows=ranked; suggest.classList.add('show'); state.active=0;
    };

    if(nearbyButton){
      nearbyButton.addEventListener('click',async()=>{
        if(state.nearby){
          state.nearby=false;
          state.coords=null;
          nearby?.clearStoredLocation();
          setNearbyStatus('Nearby filter cleared. Regular category search restored.','info');
          syncNearbyButton();
          render();
          return;
        }
        if(!nearby){setNearbyStatus('Nearby search could not load. Please refresh and try again.','error');return;}
        nearbyButton.disabled=true;
        setNearbyStatus('Detecting your current location…','loading');
        try{
          state.coords=await nearby.getCurrentLocation();
          state.nearby=true;
          setNearbyStatus('Location detected. Showing results within 5 km.','success');
          syncNearbyButton();
          render();
        }catch(error){
          setNearbyStatus(error?.message||'Unable to detect your location.','error');
        }finally{
          nearbyButton.disabled=false;
          syncNearbyButton();
        }
      });
    }
    if(nearby && new URLSearchParams(location.search).get('nearby')==='1'){
      state.coords=nearby.getStoredLocation();
      state.nearby=!!state.coords;
      if(state.nearby)setNearbyStatus('Nearby location restored for this session.','success');
      else setNearbyStatus('Your saved location expired. Select Use My Location to refresh it.','error');
    }
    syncNearbyButton();
    window.addEventListener('shh:finder-records-loaded',()=>{if(state.nearby)render()});
    if(state.nearby && originalRecords().length)render();

    document.getElementById('finderPowerToggle').addEventListener('click',()=>{filters.style.display=filters.style.display==='none'?'flex':'none'});
    document.getElementById('finderPowerClear').addEventListener('click',()=>{input.value='';['finderPowerCity','finderPowerArea','finderPowerMin','finderPowerMax','finderPowerRating'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});document.getElementById('finderPowerVerified').checked=false;Object.assign(state,{city:'',area:'',min:null,max:null,rating:null,verified:false});suggest.classList.remove('show');render();input.focus()});
    const apply=()=>{Object.assign(state,{city:val('finderPowerCity'),area:val('finderPowerArea'),min:numberFrom(val('finderPowerMin')),max:numberFrom(val('finderPowerMax')),rating:numberFrom(val('finderPowerRating')),verified:document.getElementById('finderPowerVerified').checked});render()};
    ['finderPowerCity','finderPowerArea','finderPowerMin','finderPowerMax','finderPowerRating'].forEach(id=>document.getElementById(id).addEventListener('input',apply));
    document.getElementById('finderPowerVerified').addEventListener('change',apply);

    input.addEventListener('input',e=>{e.stopImmediatePropagation();suggestions();render()},true);
    input.addEventListener('keydown',e=>{e.stopImmediatePropagation();
      if(e.key==='ArrowDown' || e.key==='ArrowUp'){
        const rows=suggest._rows||[]; if(!rows.length)return;e.preventDefault();state.active=e.key==='ArrowDown'?Math.min(state.active+1,rows.length-1):Math.max(state.active-1,0);suggest.querySelectorAll('.finder-power-result').forEach((b,i)=>b.classList.toggle('active',i===state.active));
      } else if(e.key==='Enter'){
        e.preventDefault(); const rows=suggest._rows||[]; if(rows[state.active]){input.value=String(rows[state.active].r.name||rows[state.active].r.property_id||'');suggest.classList.remove('show');render()} else render();
      } else if(e.key==='Escape'){suggest.classList.remove('show')}
    },true);
    btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();suggest.classList.remove('show');render()},true);
    suggest.addEventListener('click',e=>{const b=e.target.closest('.finder-power-result');if(!b)return;const row=suggest._rows?.[Number(b.dataset.index)];if(row){input.value=String(row.r.name||row.property_id||'');suggest.classList.remove('show');render();input.focus()}});
    document.addEventListener('click',e=>{if(!panel.contains(e.target)&&!box.contains(e.target))suggest.classList.remove('show')});

    /* =====================================================
       SEO / GOOGLE DISCOVERY LAYER
       - No visual/layout changes.
       - Converts existing details controls into real crawlable
         anchors when a stable property id is present.
       - Publishes ItemList structured data from the live records.
    ===================================================== */
    const seoEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    const slugify=v=>String(v||'').normalize('NFKD').toLowerCase().trim().replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9\\s-]/g,'').replace(/\\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
    const propertyUrl=r=>{
      const type=page==='pg-finder.html'?'hostel':page.replace('-finder.html','');
      const slug=String(r?.slug||'').trim()||slugify([r?.name||r?.property_name||r?.service_name,r?.area||r?.locality,r?.city||r?.district].filter(Boolean).join(' '));
      return slug ? `/properties/${encodeURIComponent(type)}/${encodeURIComponent(slug)}/` : '';
    };
    const upsertJSONLD=(id,data)=>{
      let el=document.getElementById(id);
      if(!el){el=document.createElement('script');el.id=id;el.type='application/ld+json';document.head.appendChild(el)}
      el.textContent=JSON.stringify(data);
    };
    const publishSEO=()=>{
      const records=originalRecords();
      if(!records.length) return;
      const items=records.slice(0,100).map((r,i)=>({
        '@type':'ListItem','position':i+1,'name':String(r.name||r.title||config.label).trim(),
        'url':propertyUrl(r)||location.href.split('#')[0]
      }));
      upsertJSONLD('finderItemListSEO',{
        '@context':'https://schema.org','@type':'ItemList','name':document.title,
        'numberOfItems':items.length,'itemListElement':items
      });
      document.querySelectorAll('.details-btn').forEach((node)=>{
        if(node.tagName==='A') return;
        const card=node.closest('.card'); if(!card) return;
        const cardName=card.querySelector('h3')?.textContent||'';
        const row=originalRecords().find(r=>String(r.name||r.property_name||r.service_name||'').trim()===cardName.trim());
        if(!row) return;
        const href=propertyUrl(row);
        if(!href) return;
        const a=document.createElement('a');
        a.className=node.className;
        a.href=href;
        a.innerHTML=node.innerHTML;
        a.setAttribute('aria-label','View details for '+String(card.querySelector('h3')?.textContent||config.label).trim());
        node.replaceWith(a);
      });
    };
    const seoObserver=new MutationObserver(()=>publishSEO());
    seoObserver.observe(document.body,{childList:true,subtree:true});
    setTimeout(publishSEO,0);
    setTimeout(publishSEO,800);
    setTimeout(publishSEO,2000);

    window.__finderPowerSearch={render,config,state,publishSEO};
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready,{once:true}); else ready();
})();
