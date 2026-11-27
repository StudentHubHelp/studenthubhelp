(function(){
  'use strict';

  const BASE='https://studenthubhelp.in/';
  const qs=new URLSearchParams(location.search);
  const prettyMatch=location.pathname.match(/^\/properties\/(hostel|tiffin|library|cafe|bookstore)\/([^/]+)\/?$/i);
  const prettyType=prettyMatch?prettyMatch[1].toLowerCase():'';
  const prettySlug=prettyMatch?decodeURIComponent(prettyMatch[2]):'';
  const typeMap={hostel:'LodgingBusiness',tiffin:'FoodEstablishment',cafe:'CafeOrCoffeeShop',library:'Library',bookstore:'BookStore'};
  const type=(prettyType||qs.get('type')||'hostel').toLowerCase();
  const id=(qs.get('id')||'').trim();
  const slug=(prettySlug||qs.get('slug')||'').trim();
  const finder={hostel:'pg-finder.html',tiffin:'tiffin-finder.html',library:'library-finder.html',cafe:'cafe-finder.html',bookstore:'bookstore-finder.html'}[type]||'pg-finder.html';

  function canonicalUrl(){
    if(prettySlug||slug) return new URL('properties/'+type+'/'+encodeURIComponent(prettySlug||slug)+'/',BASE).href;
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
    const el=document.getElementById('baseSchema')||document.getElementById('propertySchema');
    if(!el) return;
    let data;
    try{data=JSON.parse(el.textContent||'{}')}catch(_){return}
    if(!data||typeof data!=='object') return;

    const graph=Array.isArray(data['@graph'])?data['@graph']:null;
    const business=graph
      ? graph.find(x=>x&&((x['@type']==='LocalBusiness')||Object.values(typeMap).includes(x['@type'])))
      : (data.mainEntity&&Object.values(typeMap).includes(data.mainEntity['@type'])?data.mainEntity:null);

    if(business){
      business['@type']=typeMap[type]||business['@type']||'LocalBusiness';
      business.url=canonicalUrl();
      business['@id']=canonicalUrl()+'#business';
      business.inLanguage='en-IN';
      business.areaServed=business.areaServed||{'@type':'Country','name':'India'};
      if(business.address&&business.address.addressLocality){
        business.address.addressCountry=business.address.addressCountry||'IN';
      }
      const badge=document.querySelector('.trust-badge');
      const verification=badge?(badge.textContent||'').trim():'';
      const properties=Array.isArray(business.additionalProperty)
        ? business.additionalProperty.filter(x=>x&&x.name!=='Verification status') : [];
      if(/Verified Listing/i.test(verification)){
        properties.push({'@type':'PropertyValue','name':'Verification status','value':'Verified by StudentHubHelp'});
      }else if(/Details Provided/i.test(verification)){
        properties.push({'@type':'PropertyValue','name':'Verification status','value':'Details provided; not independently verified'});
      }
      if(properties.length) business.additionalProperty=properties;
    }

    const page=graph
      ? graph.find(x=>x&&x['@type']==='WebPage')
      : (data['@type']==='WebPage'?data:null);
    if(page){
      page.url=canonicalUrl();
      page['@id']=canonicalUrl()+'#webpage';
      page.inLanguage='en-IN';
      if(business&&graph) page.mainEntity={'@id':canonicalUrl()+'#business'};
    }

    const crumb=document.getElementById('propertyBreadcrumb');
    const crumbItems=crumb
      ? Array.from(crumb.querySelectorAll('a,.breadcrumb-current')).map((node,index)=>({
          '@type':'ListItem',
          'position':index+1,
          'name':(node.textContent||'').replace(/\\s+/g,' ').trim(),
          'item':node.href||canonicalUrl()
        })).filter(item=>item.name)
      : [];
    if(crumbItems.length){
      const breadcrumb={'@type':'BreadcrumbList','@id':canonicalUrl()+'#breadcrumb','itemListElement':crumbItems};
      if(graph){
        const existing=graph.find(x=>x&&x['@type']==='BreadcrumbList');
        if(existing) Object.assign(existing,breadcrumb);
        else graph.push(breadcrumb);
      }else{
        data={'@context':data['@context']||'https://schema.org','@graph':[data,breadcrumb]};
      }
    }
    el.textContent=JSON.stringify(data,null,2);
  }
  function apply(){
    if(prettySlug){
      setRobots('index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
      setCanonical(canonicalUrl());
      normalizeSchema();
      return;
    }
    if(!id&&!slug){
      setRobots('noindex, follow');
      setCanonical(new URL(finder,BASE).href);
      return;
    }
    setRobots('index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    // Slug URLs are the canonical property URLs. For legacy id-only URLs,
    // wait for property-details.html to load the record and resolve its stored slug.
    if(slug){
      setCanonical(canonicalUrl());
      normalizeSchema();
    }
  }
  apply();
  [700,1600,3000,5000].forEach(ms=>setTimeout(apply,ms));
})();
