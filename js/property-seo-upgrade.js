(function(){
  'use strict';

  const BASE='https://studenthubhelp.github.io/studenthubhelp/';
  const qs=new URLSearchParams(location.search);
  const typeMap={hostel:'LodgingBusiness',tiffin:'FoodEstablishment',cafe:'CafeOrCoffeeShop',library:'Library',bookstore:'BookStore'};
  const type=(qs.get('type')||'hostel').toLowerCase();
  const id=(qs.get('id')||'').trim();
  const slug=(qs.get('slug')||'').trim();
  const finder={hostel:'pg-finder.html',tiffin:'tiffin-finder.html',library:'library-finder.html',cafe:'cafe-finder.html',bookstore:'bookstore-finder.html'}[type]||'pg-finder.html';

  function canonicalUrl(){
    const u=new URL('property-details.html',BASE);
    u.searchParams.set('type',type);
    if(slug) u.searchParams.set('slug',slug); else if(id) u.searchParams.set('id',id);
    return u.href;
  }
  function setRobots(value){
    let el=document.querySelector('meta[name="robots"]');
    if(!el){el=document.createElement('meta');el.name='robots';document.head.appendChild(el)}
    el.content=value;
  }
  function setCanonical(url){
    const links=[...document.querySelectorAll('link[rel="canonical"]')];
    const first=links[0]||document.createElement('link');
    first.rel='canonical'; first.href=url;
    if(!first.parentNode) document.head.appendChild(first);
    links.slice(1).forEach(x=>x.remove());
  }
  function normalizeSchema(){
    const el=document.getElementById('propertySchema');
    if(!el) return;
    let data;
    try{data=JSON.parse(el.textContent||'{}')}catch(_){return}
    if(!data||!Array.isArray(data['@graph'])) return;
    const business=data['@graph'].find(x=>x&&((x['@type']==='LocalBusiness')||Object.values(typeMap).includes(x['@type'])));
    if(business){
      business['@type']=typeMap[type]||'LocalBusiness';
      business.url=canonicalUrl();
      business['@id']=canonicalUrl()+'#business';
      if(business.address&&business.address.addressLocality&&business.address.addressRegion){
        const area=business.address.addressLocality;
        const city=business.address.addressRegion;
        business.address.extendedAddress=business.address.extendedAddress||area;
        business.address.addressLocality=city;
        delete business.address.addressRegion;
      }
      const visible=document.body?.innerText||'';
      if(/Verified by StudentHubHelp/i.test(visible)){
        business.additionalProperty=[{'@type':'PropertyValue','name':'Verification status','value':'Verified by StudentHubHelp'}];
      }else if(/Not currently verified/i.test(visible)){
        business.additionalProperty=[{'@type':'PropertyValue','name':'Verification status','value':'Not currently verified'}];
      }
    }
    const page=data['@graph'].find(x=>x&&x['@type']==='WebPage');
    if(page){page.url=canonicalUrl();page['@id']=canonicalUrl()+'#webpage';if(business)page.mainEntity={'@id':canonicalUrl()+'#business'};}
    const breadcrumb=data['@graph'].find(x=>x&&x['@type']==='BreadcrumbList');
    if(breadcrumb){breadcrumb['@id']=canonicalUrl()+'#breadcrumb';const last=breadcrumb.itemListElement?.find(x=>x.position===3);if(last)last.item=canonicalUrl();}
    el.textContent=JSON.stringify(data,null,2);
  }
  function apply(){
    if(!id&&!slug){setRobots('noindex, follow');setCanonical(new URL(finder,BASE).href);return;}
    setRobots('index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setCanonical(canonicalUrl());
    normalizeSchema();
  }
  apply();
  [700,1600,3000,5000].forEach(ms=>setTimeout(apply,ms));
})();
