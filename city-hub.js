(() => {
  const root=document.getElementById('cityHub'); if(!root||!window.supabase)return;
  const city=root.dataset.city;
  const config={Sikar:{areas:['Piprali Road','Samarthpura','Station Road','Devli Road']},Kota:{areas:['Talwandi','Vigyan Nagar','Landmark City','Kunhadi']},Jaipur:{areas:['Mansarovar','Malviya Nagar','Vaishali Nagar','Gopalpura']},Delhi:{areas:['Mukherjee Nagar','Laxmi Nagar','Rajinder Nagar','South Delhi']},Ahmedabad:{areas:['Navrangpura','Chandkheda','Vastrapur','Maninagar']},Lucknow:{areas:['Aliganj','Gomti Nagar','Hazratganj','Indira Nagar']},Hyderabad:{areas:['Kukatpally','Ameerpet','Dilsukhnagar','Himayatnagar']},Pune:{areas:['Kothrud','Viman Nagar','Shivajinagar','Wakad']}}[city]||{areas:[]};
  const sb=window.supabase.createClient('https://idurlccrarznnnqixxsd.supabase.co','sb_publishable_JIRAAdzm97xMNN1jIS_idg_oHEObFh5');
  const tables=[['hostels','Hostels & PGs','🏠','pg-finder.html'],['tiffins','Tiffin & Mess','🍱','tiffin-finder.html'],['libraries','Libraries & Study Spaces','📚','library-finder.html'],['cafes','Student Cafes','☕','cafe-finder.html'],['bookstores','Book Stores','📖','bookstore-finder.html']];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number(v)>0?'₹'+Math.round(Number(v)).toLocaleString('en-IN'):'';
  const q=encodeURIComponent(city),cards=document.getElementById('liveCards'),stats=document.getElementById('liveStats'),areas=document.getElementById('areaGrid');
  areas.innerHTML=config.areas.map(a=>`<a class="area-card" href="global-search.html?q=${encodeURIComponent(a+' '+city)}"><span>📍</span><div><strong>${esc(a)}</strong><small>Explore student services →</small></div></a>`).join('');
  const href=(id,url)=>{const e=document.getElementById(id);if(e)e.href=url};
  href('searchCity','global-search.html?q='+q); href('allHostels','pg-finder.html?q='+q); href('allTiffin','tiffin-finder.html?q='+q); href('allLibraries','library-finder.html?q='+q); href('allCafes','cafe-finder.html?q='+q); href('allBooks','bookstore-finder.html?q='+q);
  const searches={hostel:'hostel near coaching '+city,tiffin:'tiffin near coaching '+city,library:'library near coaching '+city,cafe:'cafe '+city,bookstore:'bookstore '+city}; document.querySelectorAll('[data-search]').forEach(a=>a.href='global-search.html?q='+encodeURIComponent(searches[a.dataset.search]||city));
  async function loadTable([table,label,icon]){
    const filter=`city.ilike.%${city}%,area.ilike.%${city}%,address.ilike.%${city}%`;
    const count=await sb.from(table).select('id',{count:'exact',head:true}).or(filter);
    if(count.error)return {table,label,icon,data:[],count:0};
    const r=await sb.from(table).select('id,name,area,city,address,price,rating,verified,slug,property_id').or(filter).limit(40);
    return {table,label,icon,data:r.error?[]:(r.data||[]),count:count.count||0};
  }
  Promise.all(tables.map(loadTable)).then(results=>{
    const total=results.reduce((n,r)=>n+(Number(r.count)||0),0),verified=results.reduce((n,r)=>n+r.data.filter(x=>x.verified===true).length,0);
    stats.innerHTML=`<div class="stat"><b>${total}</b><span>Live listings</span></div><div class="stat"><b>${verified}</b><span>Verified listings</span></div><div class="stat"><b>5</b><span>Student services</span></div><div class="stat"><b>${config.areas.length}</b><span>Popular areas</span></div>`;
    cards.innerHTML=results.map(r=>{const top=r.data.slice(0,3),finder=r.table==='hostels'?'pg-finder.html':r.table==='tiffins'?'tiffin-finder.html':r.table==='libraries'?'library-finder.html':r.table==='cafes'?'cafe-finder.html':'bookstore-finder.html';return `<section class="service-block"><div class="service-head"><div><span class="service-icon">${r.icon}</span><div><small>EXPLORE IN ${esc(city.toUpperCase())}</small><h2>${esc(r.label)}</h2></div></div><a href="${finder}?q=${q}">View all →</a></div><div class="listing-grid">${top.length?top.map(p=>{const type=r.table==='hostels'?'hostel':r.table.slice(0,-1),url=p.slug?`property-details.html?type=${type}&slug=${encodeURIComponent(p.slug)}`:`global-search.html?q=${encodeURIComponent(p.name||city)}`;return `<a class="listing" href="${url}"><div class="listing-title"><strong>${esc(p.name||'Student-friendly listing')}</strong>${p.verified===true?'<span>✓ Verified</span>':''}</div><small>📍 ${esc([p.area,p.city].filter(Boolean).join(', ')||p.address||city)}</small><div class="listing-bottom">${money(p.price)?`<b>${money(p.price)}</b>`:'<b>View details</b>'}${p.rating!=null?`<em>⭐ ${esc(p.rating)}</em>`:''}</div></a>`}).join(''):`<div class="empty">No live listings found yet. <a href="global-search.html?q=${q}">Search ${esc(city)}</a> →</div>`}</div></section>`}).join('');
  });
  const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
})();