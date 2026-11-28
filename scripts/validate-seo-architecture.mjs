import { readFile } from 'node:fs/promises';
import { RULES, CATEGORIES, pageStateKey } from './seo-page-eligibility.mjs';

const BASE='https://studenthubhelp.in';
const manifest=JSON.parse(await readFile('seo-generated-manifest.json','utf8'));
const state=JSON.parse(await readFile('data/seo-page-state.json','utf8'));
const sitemap=await readFile('sitemap-pages.xml','utf8');
const sitemapUrls=new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1].trim()));
const generated=(manifest.generated||[]).map(value=>new URL(value,BASE));
const known=[];
const errors=[];
const unique={title:new Map(),h1:new Map(),description:new Map()};
const noindexPaths=new Set();

const readPage=async path=>readFile(path,'utf8').catch(()=>null);
const fileForUrl=url=>{
  let path=decodeURIComponent(url.pathname).replace(/^\//,'');
  if(!path||path.endsWith('/')) path+='index.html';
  return path;
};
const textOf=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const getTag=(html,regex)=>html.match(regex)?.[1]?.trim()||'';
const robotsOf=html=>(html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i)?.[1]||'').toLowerCase();
const canonicalOf=html=>html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]||html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i)?.[1]||'';

function pageIdentity(url){
  const parts=url.pathname.split('/').filter(Boolean);
  if(parts.length===1 && parts[0]==='student-cities.html') return {type:'studentCitiesHub',citySlug:'all'};
  if(parts.length===1 && !parts[0].endsWith('.html')) return {type:'cityHub',citySlug:parts[0]};
  if(parts.length===2 && CATEGORIES.includes(parts[1])) return {type:'cityCategory',citySlug:parts[0],categorySlug:parts[1]};
  if(parts.length===2) return {type:'areaHub',citySlug:parts[0],areaSlug:parts[1]};
  if(parts.length===3 && CATEGORIES.includes(parts[1])) return {type:'areaCategory',citySlug:parts[0],categorySlug:parts[1],areaSlug:parts[2]};
  return null;
}
function stateFor(identity){
  return identity ? state.pages?.[pageStateKey(identity)] : null;
}
function recordUnique(kind,value,url){
  const key=value.toLowerCase();
  if(!key) return;
  const previous=unique[kind].get(key);
  if(previous) errors.push('Duplicate '+kind+': '+url+' matches '+previous);
  else unique[kind].set(key,url);
}

for(const url of generated){
  const path=fileForUrl(url);
  const html=await readPage(path);
  if(!html){errors.push('Generated index URL has no HTML file: '+url.href+' ('+path+')');continue;}
  const identity=pageIdentity(url);
  if(!identity) continue;
  const pageState=stateFor(identity);
  if(!pageState || pageState.status!=='index') errors.push('Generated URL is not in index state: '+url.href);
  const title=textOf(getTag(html,/<title>([\s\S]*?)<\/title>/i));
  const description=textOf(getTag(html,/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i));
  const h1=textOf(getTag(html,/<h1\b[^>]*>([\s\S]*?)<\/h1>/i));
  const canonical=canonicalOf(html);
  const robots=robotsOf(html);
  if(!title) errors.push('Missing title: '+url.href);
  if(title.length>60) errors.push('Title exceeds 60 characters ('+title.length+'): '+url.href);
  if(!description) errors.push('Missing meta description: '+url.href);
  if(description.length>160) errors.push('Meta description exceeds 160 characters ('+description.length+'): '+url.href);
  if(!h1) errors.push('Missing H1: '+url.href);
  if(canonical!==url.href) errors.push('Canonical mismatch: '+url.href+' -> '+canonical);
  if(robots.includes('noindex')) errors.push('Noindex page listed as generated index URL: '+url.href);
  recordUnique('title',title,url.href);
  recordUnique('h1',h1,url.href);
  recordUnique('description',description,url.href);

  const metrics=pageState?.metrics||{};
  if(identity.type==='cityHub' && metrics.listingCount<RULES.rules.cityHub.minListings && pageState.reason!=='hysteresis-buffer') errors.push('City hub below threshold but indexable: '+url.href);
  if(identity.type==='cityCategory' && metrics.listingCount<RULES.rules.cityCategory.minListings && pageState.reason!=='hysteresis-buffer') errors.push('City-category below threshold but indexable: '+url.href);
  if(identity.type==='areaCategory'){
    if(metrics.listingCount<RULES.rules.areaCategory.minListings && pageState.reason!=='hysteresis-buffer') errors.push('Area-category below threshold: '+url.href);
    if(metrics.verifiedCount<RULES.rules.areaCategory.minVerified) errors.push('Area-category lacks required verified listing: '+url.href);
    if(metrics.profileComplete!==true) errors.push('Area-category has no complete editorial profile: '+url.href);
  }
  if(identity.type==='areaHub'){
    if(metrics.listingCount<RULES.rules.areaHub.minListings && pageState.reason!=='hysteresis-buffer') errors.push('Area hub below listing threshold: '+url.href);
    if(metrics.categoryCount<RULES.rules.areaHub.minCategories) errors.push('Area hub below category threshold: '+url.href);
    if(metrics.profileComplete!==true) errors.push('Area hub has no complete editorial profile: '+url.href);
  }
  if(['cityCategory','areaCategory','areaHub'].includes(identity.type) && /Loading(?:\s|…|\.\.\.)/i.test(html)) errors.push('Indexable listing page contains Loading placeholder: '+url.href);
  if(['cityCategory','areaCategory','areaHub'].includes(identity.type)){
    const cards=(html.match(/class=["'][^"']*listing-card[^"']*["']/g)||[]).length;
    if(cards===0) errors.push('Indexable listing page has no server-rendered listing cards: '+url.href);
  }
  if(!sitemapUrls.has(url.href)) errors.push('Indexable page missing from sitemap-pages.xml: '+url.href);
  known.push({url,html,identity,path});
}

for(const relativePath of manifest.expected||[]){
  const path=relativePath.replace(/^\.\//,'');
  const html=await readPage(path);
  if(!html) continue;
  if(robotsOf(html).includes('noindex')){
    const canonical=canonicalOf(html);
    const url=canonical?new URL(canonical,BASE):new URL('/'+path.replace(/index\.html$/,''),BASE);
    noindexPaths.add(url.pathname);
    if(sitemapUrls.has(url.href)) errors.push('Noindex page is present in sitemap: '+url.href);
  }
}

// Legacy city .html aliases must not be used as internal links; footer city cross-links are exempt.
for(const city of ['sikar','jaipur','jhunjhunu','kota','delhi','gurugram','bengaluru','patna','chennai','pune','coimbatore','lucknow','ahmedabad','hyderabad']){
  noindexPaths.add('/'+city+'.html');
}
for(const page of known){
  for(const match of page.html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)){
    const href=match[1];
    if(!href||href.startsWith('#')||/^(?:mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    let target;
    try{target=new URL(href,page.url);}catch{continue;}
    if(target.origin!==BASE) continue;
    if(noindexPaths.has(target.pathname)){
      const isCityFolder= /^\/(?:sikar|jaipur|jhunjhunu|kota|delhi|gurugram|bengaluru|patna|chennai|pune|coimbatore|lucknow|ahmedabad|hyderabad)\/$/.test(target.pathname);
      if(!(isCityFolder && page.html.includes('city-cross-links'))) errors.push('Indexable page links to a noindex URL: '+page.url.href+' -> '+target.href);
    }
  }
}

const studentCities=await readPage('student-cities.html');
if(studentCities){
  const eState=state.pages?.[pageStateKey({type:'studentCitiesHub',citySlug:'all'})];
  if(eState?.status!=='index') errors.push('Student Cities hub is not in index state.');
  if(!sitemapUrls.has(BASE+'/student-cities.html')) errors.push('Student Cities hub missing from sitemap.');
}
if(errors.length){
  console.error('SEO architecture validation failed:');
  for(const error of errors) console.error(' - '+error);
  process.exitCode=1;
}else{
  console.log('SEO architecture validation passed for '+known.length+' indexable page(s).');
}
