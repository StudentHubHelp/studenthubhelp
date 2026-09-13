(() => {
  const root = document.getElementById('cityHub');
  if (!root || !window.supabase) return;
  const city = root.dataset.city;
  const state = root.dataset.state || 'India';
  const config = {
    Sikar:{areas:['Piprali Road','Samarthpura','Station Road','Devli Road'],study:'coaching and competitive-exam preparation'},
    Kota:{areas:['Talwandi','Vigyan Nagar','Landmark City','Kunhadi'],study:'coaching and competitive-exam preparation'},
    Jaipur:{areas:['Mansarovar','Malviya Nagar','Vaishali Nagar','Gopalpura'],study:'college, coaching and higher education'},
    Delhi:{areas:['Mukherjee Nagar','Laxmi Nagar','Rajinder Nagar','South Delhi'],study:'competitive exams, colleges and higher education'},
    Ahmedabad:{areas:['Navrangpura','Chandkheda','Vastrapur','Maninagar'],study:'universities, colleges and coaching'},
    Lucknow:{areas:['Aliganj','Gomti Nagar','Hazratganj','Indira Nagar'],study:'competitive exams, colleges and higher education'},
    Hyderabad:{areas:['Kukatpally','Ameerpet','Dilsukhnagar','Himayatnagar'],study:'universities, colleges and competitive exams'},
    Pune:{areas:['Kothrud','Viman Nagar','Shivajinagar','Wakad'],study:'universities, colleges and professional education'}
  }[city] || {areas:[],study:'student education and study needs'};
  const sb = window.supabase.createClient('https://idurlccrarznnnqixxsd.supabase.co','sb_publishable_JIRAAdzm97xMNN1jIS_idg_oHEObFh5');
  const tables=[['hostels','Hostels & PGs','🏠','pg-finder.html'],['tiffins','Tiffin & Mess','🍱','tiffin-finder.html'],['libraries','Libraries & Study Spaces','📚','library-finder.html'],['cafes','Student Cafes','☕','cafe-finder.html'],['bookstores','Book Stores','📖','bookstore-finder.html']];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number(v)>0?'₹'+Math.round(Number(v)).toLocaleString('en-IN'):'';
  const cityQ=encodeURIComponent(city);
  const cards=document.getElementById('liveCards'), stats=document.getElementById('liveStats'), areas=document.getElementById('areaGrid');
  areas.innerHTML=config.areas.map(a=>`<a class="area-card" href="global-search.html?q=${encodeURIComponent(a+' '+city)}"><span>📍</span><div><strong>${esc(a)}</strong><small>Explore student services →</small></div></a>`).join('');
  const setHref=(id,url)=>{const el=document.getElementById(id); if(el) el.href=url;};
  setHref('searchCity','global-search.html?q='+cityQ);
  setHref('allHostels','pg-finder.html?q='+cityQ);
  setHref('allTiffin','tiffin-finder.html?q='+cityQ);
  setHref('allLibraries','library-finder.html?q='+cityQ);
  setHref('allCafes','cafe-finder.html?q='+cityQ);
  setHref('allBooks','bookstore-finder.html?q='+cityQ);
  const searches={hostel:'hostel near coaching '+city,tiffin:'tiffin near coaching '+city,library:'library near coaching '+city,cafe:'cafe '+city,bookstore:'bookstore '+city};
  document.querySelectorAll('[data-search]').forEach(a=>a.href='global-search.html?q='+encodeURIComponent(searches[a.dataset.search]||city));
  async function loadTable([table,label,icon]){
    const {data,error}=await sb.from(table).select('id,name,area,city,address,price,rating,verified,slug,property_id').or(`city.ilike.*${city}*,area.ilike.*${city}*,address.ilike.*${city}*`).limit(40);
    if(error) return {table,label,icon,data:[]};
    return {table,label,icon,data:data||[]};
  }
  Promise.all(tables.map(loadTable)).then(results=>{
    let total=0, verified=0;
    results.forEach(r=>{total+=r.data.length; verified+=r.data.filter(x=>x.verified===true).length});
    stats.innerHTML=`<div><b>${total||'—'}</b><span>Live listings</span></div><div><b>${verified||'—'}</b><span>Verified listings</span></div><div><b>5</b><span>Student services</span></div><div><b>${config.areas.length}</b><span>Popular areas</span></div>`;
    cards.innerHTML=results.map(r=>{
      const top=r.data.slice(0,3);
      return `<section class="service-block"><div class="service-head"><div><span class="service-icon">${r.icon}</span><div><small>EXPLORE IN ${esc(city.toUpperCase())}</small><h2>${esc(r.label)}</h2></div></div><a href="${r.table==='hostels'?'pg-finder.html':r.table==='tiffins'?'tiffin-finder.html':r.table==='libraries'?'library-finder.html':r.table==='cafes'?'cafe-finder.html':'bookstore-finder.html'}?q=${cityQ}">View all →</a></div><div class="listing-grid">${top.length?top.map(p=>{const href=p.slug?`property-details.html?type=${r.table==='hostels'?'hostel':r.table.slice(0,-1)}&slug=${encodeURIComponent(p.slug)}`:`global-search.html?q=${encodeURIComponent(p.name||city)}`;return `<a class="listing" href="${href}"><div class="listing-title"><strong>${esc(p.name||'Student-friendly listing')}</strong>${p.verified===true?'<span>✓ Verified</span>':''}</div><small>📍 ${esc([p.area,p.city].filter(Boolean).join(', ')||p.address||city)}</small><div class="listing-bottom">${money(p.price)?`<b>${money(p.price)}</b>`:'<b>View details</b>'}${p.rating!=null?`<em>⭐ ${esc(p.rating)}</em>`:''}</div></a>`}).join(''):`<div class="empty">Live listings are being expanded for this city. <a href="global-search.html?q=${cityQ}">Search ${esc(city)}</a> →</div>`}</div></section>`;
    }).join('');
  });
  const year=document.getElementById('year'); if(year) year.textContent=new Date().getFullYear();
})();