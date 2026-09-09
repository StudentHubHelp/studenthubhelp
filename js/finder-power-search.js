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
    document.head.appendChild(style);

    const panel=document.createElement('div'); panel.className='finder-power-panel';
    panel.innerHTML=`
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
    const filters=panel.querySelector('#finderPowerFilters');
    const suggest=panel.querySelector('#finderPowerSuggest');
    filters.style.display='none';

    const state={city:'',area:'',min:null,max:null,rating:null,verified:false,active:0};
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
      const q=norm(input.value); const hay=norm(searchable(r));
      if(q && score(r,q)<=0) return false;
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
      const ranked=source.filter(passes).map((r,i)=>({r,i,s:score(r,input.value)})).sort((a,b)=>b.s-a.s||String(a.r.name||'').localeCompare(String(b.r.name||''))).map(x=>x.r);
      const backup=allRecords; allRecords=ranked;
      try{ renderRecords(); } finally { allRecords=backup; }
      const meta=document.getElementById('resultText');
      if(meta && input.value.trim()) meta.textContent=`Showing ${ranked.length} smart result${ranked.length===1?'':'s'} for "${input.value.trim()}"`;
      return ranked;
    };
    const escapeText=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    const suggestions=()=>{
      const q=norm(input.value); if(!q){suggest.classList.remove('show');suggest.innerHTML='';return;}
      const ranked=originalRecords().map((r,i)=>({r,i,s:score(r,q)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,8);
      suggest.innerHTML=ranked.length?ranked.map((x,i)=>{
        const r=x.r,name=String(r.name||r.title||config.label),area=String(r.area||r.city||r.address||'');
        return `<button type="button" class="finder-power-result" data-index="${i}"><i class="fa-solid ${config.icon}"></i><span><strong>${escapeText(name)}</strong><small>${escapeText(area)}${r.property_id?' • ID #'+escapeText(r.property_id):''}</small></span></button>`;
      }).join(''):`<div class="finder-power-meta">No matching suggestions</div>`;
      suggest._rows=ranked; suggest.classList.add('show'); state.active=0;
    };

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
    const stableId=r=>String(r?.id ?? r?.property_id ?? '').trim();
    const propertyUrl=r=>{
      const type=page.replace('-finder.html','').replace('pg','hostel').replace('tiffin','tiffin').replace('library','library').replace('cafe','cafe').replace('bookstore','bookstore');
      const slug=String(r?.slug||'').trim();
      const id=stableId(r);
      if(slug) return `property-details.html?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}`;
      if(id) return `property-details.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
      return '';
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
        const idText=card.querySelector('.property-id-badge')?.textContent||card.querySelector('.property-id')?.textContent||'';
        const idMatch=idText.match(/(?:ID\s*#|Property\s*ID:\s*#)\s*([A-Za-z0-9_-]+)/i);
        if(!idMatch) return;
        const id=idMatch[1];
        const a=document.createElement('a');
        a.className=node.className;
        a.href=`property-details.html?type=${encodeURIComponent(page==='pg-finder.html'?'hostel':page.replace('-finder.html',''))}&id=${encodeURIComponent(id)}`;
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
