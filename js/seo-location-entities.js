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
  function propertyUrl(r){
    const slug=clean(r?.slug), id=clean(r?.id||r?.property_id);
    if(!slug&&!id) return null;
    const u=new URL('property-details.html',base);
    u.searchParams.set('type',type);
    u.searchParams.set(slug?'slug':'id',slug||id);
    return u.href;
  }

  function publish(){
    const records=Array.isArray(window.allRecords)?window.allRecords:[];
    if(!records.length) return;

    const cities=new Map();
    const items=[];

    records.forEach((r,index)=>{
      const city=clean(r.city);
      const area=clean(r.area);
      if(city){
        if(!cities.has(city)) cities.set(city,new Set());
        if(area) cities.get(city).add(area);
      }

      if(items.length<100){
        const url=propertyUrl(r);
        const name=clean(r.name||r.service_name||r.property_name);
        if(url&&name){
          items.push({
            '@type':'ListItem',
            'position':items.length+1,
            'name':name,
            'url':url,
            ...(city?{'item':{'@type':'Thing','name':name,'url':url,'additionalProperty':[{'@type':'PropertyValue','name':'City','value':city},...(area?[{'@type':'PropertyValue','name':'Area','value':area}]:[])]}}: {})
          });
        }
      }
    });

    const about=[];
    [...cities.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(0,200).forEach(([city,areas])=>{
      about.push({
        '@type':'City',
        'name':city,
        'containedInPlace':{'@type':'Country','name':'India'},
        ...(areas.size?{'additionalProperty':[{'@type':'PropertyValue','name':'Areas covered','value':[...areas].slice(0,50).join(', ')}]}:{})
      });
    });

    const payload={
      '@context':'https://schema.org',
      '@type':'CollectionPage',
      '@id':new URL(path,base).href+'#locations',
      'url':new URL(path,base).href,
      'name':labels[path]+' in India',
      'description':'Student-friendly '+labels[path].toLowerCase()+' listings organized by city and local area across India.',
      'inLanguage':'en-IN',
      'isPartOf':{'@type':'WebSite','name':'StudentHubHelp','url':base},
      'about':about,
      ...(items.length?{'mainEntity':{'@type':'ItemList','numberOfItems':items.length,'itemListElement':items}}:{})
    };

    let el=document.getElementById('finderLocationEntitiesSEO');
    if(!el){el=document.createElement('script');el.id='finderLocationEntitiesSEO';el.type='application/ld+json';document.head.appendChild(el)}
    el.textContent=JSON.stringify(payload);
  }

  let attempts=0;
  const timer=setInterval(()=>{publish();if(++attempts>=16)clearInterval(timer)},500);
  publish();
})();