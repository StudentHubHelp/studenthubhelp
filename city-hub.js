(() => {
  const root=document.getElementById('cityHub');
  if(!root||!window.supabase)return;
  const city=root.dataset.city;
  const config={Sikar:{areas:['Piprali Road','Samarthpura','Station Road','Devli Road']},Kota:{areas:['Talwandi','Vigyan Nagar','Landmark City','Kunhadi']},Jaipur:{areas:['Mansarovar','Malviya Nagar','Vaishali Nagar','Gopalpura']},Delhi:{areas:['Mukherjee Nagar','Laxmi Nagar','Rajinder Nagar','South Delhi']},Ahmedabad:{areas:['Navrangpura','Chandkheda','Vastrapur','Maninagar']},Lucknow:{areas:['Aliganj','Gomti Nagar','Hazratganj','Indira Nagar']},Hyderabad:{areas:['Kukatpally','Ameerpet','Dilsukhnagar','Himayatnagar']},Pune:{areas:['Kothrud','Viman Nagar','Shivajinagar','Wakad']}}[city]||{areas:[]};
  const sb=window.supabase.createClient('https://idurlccrarznnnqixxsd.supabase.co','sb_publishable_JIRAAdzm97xMNN1jIS_idg_oHEObFhT');
  const tables=[['hostels','Hostels & PGs','🏠','pg-finder.html'],['tiffins','Tiffin & Mess','🍱','tiffin-finder.html'],['libraries','Libraries & Study Spaces','📚','library-finder.html'],['cafes','Student Cafes','☕','cafe-finder.html'],['bookstores','Book Stores','📖','bookstore-finder.html']];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number(v)>0?'₹'+Math.round(Number(v)).toLocaleString('en-IN'):'';
  const q=encodeURIComponent(city),cards=document.getElementById('liveCards'),stats=document.getElementById('liveStats'),areas=document.getElementById('areaGrid');
  const asArray=v=>Array.isArray(v)?v:(typeof v==='string'?v.split(/[,|;]/).map(s=>s.trim()).filter(Boolean):[]);
  const firstImage=p=>{
    const candidates=[p.image_url,p.image,p.cover_image,p.cover_url,p.photo_url,p.thumbnail_url,p.main_image,p.featured_image,...asArray(p.images),...asArray(p.photos),...asArray(p.image_urls),...asArray(p.gallery)];
    return candidates.find(v=>typeof v==='string'&&/^https?:\/\//i.test(v.trim()))||'';
  };
  const facilities=p=>{
    const raw=[...asArray(p.facilities),...asArray(p.amenities),...asArray(p.features),...asArray(p.room_type?[p.room_type]:[])];
    return [...new Set(raw.map(v=>typeof v==='string'?v.trim():'').filter(Boolean))].slice(0,3);
  };
  const typeFor=table=>({hostels:'hostel',tiffins:'tiffin',libraries:'library',cafes:'cafe',bookstores:'bookstore'}[table]||'');
  const categoryBanner={
    hostels:{label:'HOSTEL & PG',icon:'🏠',image:'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1000&q=80'},
    tiffins:{label:'TIFFIN & MESS',icon:'🍱',image:'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80'},
    libraries:{label:'LIBRARY & STUDY',icon:'📚',image:'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1000&q=80'},
    cafes:{label:'CAFES',icon:'☕',image:'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80'},
    bookstores:{label:'BOOKSTORES',icon:'📖',image:'https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?auto=format&fit=crop&w=1000&q=80'}
  };
  areas.innerHTML=config.areas.map(a=>`<a class="area-card" href="global-search.html?q=${encodeURIComponent(a+' '+city)}"><span>📍</span><div><strong>${esc(a)}</strong><small>Explore student services →</small></div></a>`).join('');
  const href=(id,url)=>{const e=document.getElementById(id);if(e)e.href=url};
  href('searchCity','global-search.html?q='+q);href('allHostels','pg-finder.html?q='+q);href('allTiffin','tiffin-finder.html?q='+q);href('allLibraries','library-finder.html?q='+q);href('allCafes','cafe-finder.html?q='+q);href('allBooks','bookstore-finder.html?q='+q);
  const searches={hostel:'hostel near coaching '+city,tiffin:'tiffin near coaching '+city,library:'library near coaching '+city,cafe:'cafe '+city,bookstore:'bookstore '+city};
  document.querySelectorAll('[data-search]').forEach(a=>a.href='global-search.html?q='+encodeURIComponent(searches[a.dataset.search]||city));
  async function loadTable([table,label,icon]){
    const count=await sb.from(table).select('id',{count:'exact',head:true}).eq('status','active').ilike('city',city);
    if(count.error)return {table,label,icon,data:[],count:0};
    const r=await sb.from(table).select('*').eq('status','active').ilike('city',city).limit(40);
    return {table,label,icon,data:r.error?[]:(r.data||[]),count:count.count||0};
  }
  Promise.all(tables.map(loadTable)).then(results=>{
    const total=results.reduce((n,r)=>n+(Number(r.count)||0),0),verified=results.reduce((n,r)=>n+r.data.filter(x=>x.verified===true).length,0);
    stats.innerHTML=`<div class="stat"><b>${total}</b><span>Live listings</span></div><div class="stat"><b>${verified}</b><span>Verified listings</span></div><div class="stat"><b>5</b><span>Student services</span></div><div class="stat"><b>${config.areas.length}</b><span>Popular areas</span></div>`;
    cards.innerHTML=results.map(r=>{
      const top=r.data.slice(0,3),finder=({hostels:'pg-finder.html',tiffins:'tiffin-finder.html',libraries:'library-finder.html',cafes:'cafe-finder.html',bookstores:'bookstore-finder.html'})[r.table];
      return `<section class="service-block"><div class="service-head"><div><span class="service-icon">${r.icon}</span><div><small>EXPLORE IN ${esc(city.toUpperCase())}</small><h2>${esc(r.label)}</h2></div></div><a href="${finder}?q=${q}">View all →</a></div><div class="listing-grid">${top.length?top.map(p=>{
        const type=typeFor(r.table),url=p.slug?`property-details.html?type=${type}&slug=${encodeURIComponent(p.slug)}`:p.property_id?`property-details.html?id=${encodeURIComponent(p.property_id)}`:`global-search.html?q=${encodeURIComponent((p.name||city)+' '+city)}`;
        const image=firstImage(p),name=p.name||'Student-friendly listing',location=[p.area,p.city].filter(Boolean).join(', ')||p.address||city,price=money(p.price),features=facilities(p),rating=p.rating!=null&&p.rating!==''&&Number.isFinite(Number(p.rating))?Number(p.rating).toFixed(1):'',banner=categoryBanner[r.table]||{label:'STUDENT SERVICES',icon:r.icon,image:''};
        const bannerMarkup=image?`<img src="${esc(image)}" alt="${esc(name)}" loading="lazy" decoding="async" onerror="this.style.display='none';this.nextElementSibling.hidden=false"><span class="listing-placeholder category-banner" hidden style="background-image:linear-gradient(0deg,#102541a8,#10254112),url('${banner.image}')">${banner.icon}</span>`:`<span class="listing-placeholder category-banner" style="background-image:linear-gradient(0deg,#102541a8,#10254112),url('${banner.image}')">${banner.icon}</span>`;
        return `<a class="listing" href="${url}" aria-label="View details for ${esc(name)}"><span class="listing-media">${bannerMarkup}<span class="listing-badges"><span class="listing-badge category-badge">${banner.icon} ${banner.label}</span>${p.verified===true?'<span class="listing-badge">✓ Verified</span>':''}</span></span><span class="listing-body"><span class="listing-title"><strong>${esc(name)}</strong></span><span class="listing-location"><span>📍</span><span>${esc(location)}</span></span><span class="listing-price-row"><span class="listing-price">${price||'Contact for price'}${price?'<small> / month</small>':''}</span>${rating?'<span class="listing-rating">★ '+esc(rating)+'</span>':''}</span>${features.length?`<span class="listing-facilities">${features.map(f=>`<span class="listing-facility">${esc(f)}</span>`).join('')}</span>`:''}<span class="listing-bottom"><b>View Details</b><span class="listing-arrow" aria-hidden="true">→</span></span></span></a>`;
      }).join(''):`<div class="empty">No active listings found yet. <a href="global-search.html?q=${q}">Search ${esc(city)}</a> →</div>`}</div></section>`;
    }).join('');
  }).catch(()=>{if(cards)cards.innerHTML='<div class="empty">Listings are temporarily unavailable. Please try again shortly.</div>';});
  const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
})();