(function(){
  'use strict';
  const path=location.pathname.split('/').pop().toLowerCase();
  const labels={
    'pg-finder.html':'Hostel and PG Finder',
    'tiffin-finder.html':'Tiffin and Mess Finder',
    'library-finder.html':'Library Finder',
    'cafe-finder.html':'Cafe Finder',
    'bookstore-finder.html':'Bookstore Finder'
  };
  if(!labels[path]) return;
  const base='https://studenthubhelp.github.io/studenthubhelp/';
  const type=path.replace('-finder.html','').replace('pg','hostel');
  function clean(v){return String(v??'').replace(/\s+/g,' ').trim()}
  function publish(){
    const records=Array.isArray(window.allRecords)?window.allRecords:[];
    if(!records.length) return;
    const cities=new Map();
    records.forEach(r=>{
      const city=clean(r.city);
      const area=clean(r.area);
      if(!city) return;
      if(!cities.has(city)) cities.set(city,new Set());
      if(area) cities.get(city).add(area);
    });
    const about=[];
    [...cities.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(0,100).forEach(([city,areas])=>{
      about.push({
        '@type':'City',
        'name':city,
        'containedInPlace':{'@type':'Country','name':'India'},
        'additionalProperty':areas.size?[{'@type':'PropertyValue','name':'Areas covered','value':[...areas].slice(0,25).join(', ')}]:undefined
      });
    });
    const payload={
      '@context':'https://schema.org',
      '@type':'CollectionPage',
      '@id':new URL(path,base).href+'#locations',
      'url':new URL(path,base).href,
      'name':labels[path]+' in India',
      'about':about
    };
    let el=document.getElementById('finderLocationEntitiesSEO');
    if(!el){el=document.createElement('script');el.id='finderLocationEntitiesSEO';el.type='application/ld+json';document.head.appendChild(el)}
    el.textContent=JSON.stringify(payload);
  }
  let attempts=0;
  const timer=setInterval(()=>{publish();if(++attempts>=12)clearInterval(timer)},500);
  publish();
})();
