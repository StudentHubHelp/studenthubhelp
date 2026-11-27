import { mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';

const BASE = (process.env.BASE_URL || 'https://studenthubhelp.in/').replace(/\/+$/, '') + '/';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const LOCATION_MIN_PROPERTIES = Number(process.env.SEO_LOCATION_MIN_PROPERTIES || 3);

const TABLES = [
  { type:'hostel', table:'hostels', label:'Hostels & PGs', finder:'pg-finder.html', icon:'🏠' },
  { type:'tiffin', table:'tiffins', label:'Tiffin & Mess Services', finder:'tiffin-finder.html', icon:'🍱' },
  { type:'library', table:'libraries', label:'Libraries & Study Spaces', finder:'library-finder.html', icon:'📚' },
  { type:'cafe', table:'cafes', label:'Cafes', finder:'cafe-finder.html', icon:'☕' },
  { type:'bookstore', table:'bookstores', label:'Bookstores & Stationery', finder:'bookstore-finder.html', icon:'📖' }
];

if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase public API configuration.');

const GENERATED_ROOT = '.';
const GENERATED_MARKER = '<meta name="studenthubhelp-generated-seo" content="true">';
const LEGACY_REDIRECTS = JSON.parse(await readFile('property-url-redirects.json', 'utf8'));
const CITY_ALIAS_DATA = JSON.parse(await readFile('data/city-aliases.json', 'utf8'));
const CITY_ALIAS_MAP = new Map();
for (const city of CITY_ALIAS_DATA.canonicalCities || []) {
  for (const alias of [city.name, ...(city.seoAliases || [])]) CITY_ALIAS_MAP.set(key(alias), city.name);
}
function canonicalCityName(value) { return CITY_ALIAS_MAP.get(key(value)) || label(value); }

function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function slug(v){
  return String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90);
}
function label(v){
  return String(v||'').trim().replace(/\s+/g,' ');
}
function key(v){return label(v).toLowerCase();}
function stripLocationSuffix(value,suffix){const text=label(value),part=label(suffix);if(!text||!part)return text;const lower=text.toLowerCase(),target=part.toLowerCase();if(lower===target)return '';if(lower.endsWith(' '+target))return text.slice(0,text.length-part.length).replace(/[,\s]+$/,'').trim();return text;}
function normalizeArea(value,city){let area=label(value);if(!area)return '';const state=stateForCity(city);area=stripLocationSuffix(area,'India');if(state)area=stripLocationSuffix(area,state);const cityEntry=CITY_ALIAS_DATA.canonicalCities.find(item=>key(item.name)===key(city));const aliases=[city,...(cityEntry?.seoAliases||[]),...(cityEntry?.searchAliases||[])].filter(Boolean).sort((a,b)=>label(b).length-label(a).length);for(const alias of aliases)area=stripLocationSuffix(area,alias);return area&&key(area)!==key(city)&&key(area)!==key(state)?label(area):'';}
const COACHINGS = JSON.parse(await readFile('data/landmark-aliases.json', 'utf8'));
const locationRegistrySource = String.raw`(function(window){
'use strict';
const cityEntries=${JSON.stringify(CITY_ALIAS_DATA.canonicalCities)};
const landmarkEntries=${JSON.stringify(COACHINGS)};
const norm=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
const cityMap=new Map();
for(const city of cityEntries){for(const alias of [city.name,...(city.seoAliases||[]),...(city.searchAliases||[])]){const aliasKey=norm(alias);if(aliasKey)cityMap.set(aliasKey,norm(city.name));}}
const canonicalizeCity=value=>{const key=norm(value);return key?(cityMap.get(key)||key):'';};
const landmarkAliases=Object.freeze(Object.fromEntries(landmarkEntries.map(item=>[item.slug,item.aliases||[]])));
function findLandmarks(value){const text=' '+norm(value)+' ';return Object.entries(landmarkAliases).filter(([,aliases])=>aliases.some(alias=>{const a=norm(alias);return a&&text.includes(' '+a+' ');})).map(([slug])=>slug).sort((a,b)=>b.length-a.length);}
window.StudentHubLocationRegistry=Object.freeze({version:'1.0.0',cityEntries,landmarkEntries,landmarkAliases,normalize:norm,canonicalizeCity,findLandmarks});
})(window);
`;
await writeFile('js/location-intelligence-registry.js', locationRegistrySource, 'utf8');

function matchedCoachings(row){
  const text=key([row.name,row.area,row.address,row.nearby_coaching,row.landmark].filter(Boolean).join(' '));
  return COACHINGS.filter(c=>c.aliases.some(a=>text.includes(a))).map(c=>c.slug);
}
function coachingBySlug(slug){return COACHINGS.find(c=>c.slug===slug);}
function entitySection(entity){return entity?.type==='coaching'?'coaching':'landmarks';}
function entityIcon(entity){return entity?.type==='coaching'?'🎓':'📍';}
function entitySchemaType(entity){return entity?.schemaType||(entity?.type==='coaching'?'EducationalOrganization':'Place');}
function stateForCity(city,rows=[]){
  const known={
    'sikar':'Rajasthan','jhunjhunu':'Rajasthan','udaipurwati':'Rajasthan','kota':'Rajasthan','jaipur':'Rajasthan',
    'bengaluru':'Karnataka','mysuru':'Karnataka','mangaluru':'Karnataka','manipal':'Karnataka','hassan':'Karnataka','davanagere':'Karnataka','hubballi':'Karnataka','ramanagara':'Karnataka','belagavi':'Karnataka',
    'chennai':'Tamil Nadu','coimbatore':'Tamil Nadu','vellore':'Tamil Nadu','kanchipuram':'Tamil Nadu','madurai':'Tamil Nadu','salem':'Tamil Nadu','tiruchirappalli':'Tamil Nadu','tirunelveli':'Tamil Nadu','thanjavur':'Tamil Nadu',
    'patna':'Bihar','delhi':'Delhi','new delhi':'Delhi','gurugram':'Haryana','panchkula':'Haryana','sonipat':'Haryana','pune':'Maharashtra','vadodara':'Gujarat'
  };
  const normalized=key(city).replace(/\s*\([^)]*\)/g,'').trim();
  if(known[normalized]) return known[normalized];
  const counts=new Map();
  for(const row of rows){
    const match=String(row.address||'').match(/\b(Rajasthan|Karnataka|Tamil Nadu|Bihar|Delhi|Haryana|Maharashtra|Gujarat|Uttar Pradesh|Madhya Pradesh|Kerala|Telangana|Andhra Pradesh|West Bengal|Punjab|Odisha|Assam)\b/i);
    if(match){const state=match[1].replace(/\b\\w/g,c=>c.toUpperCase());counts.set(state,(counts.get(state)||0)+1);}
  }
  return [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||'India';
}

function propUrl(row){
  const savedSlug=String(row.slug||slug([row.name,row.area,row.city].filter(Boolean).join(' '))).trim();
  const mapped=LEGACY_REDIRECTS['/properties/'+row.type+'/'+savedSlug+'/'];
  const propertySlug=String(mapped?.slug||savedSlug).trim();
  if(!propertySlug) return BASE;
  return new URL('properties/'+encodeURIComponent(row.type)+'/'+encodeURIComponent(propertySlug)+'/',BASE).href;
}
function rel(fromDepth,url){
  const target=new URL(url);
  const path=target.pathname.replace(/^\/+/, '');
  const prefix='../'.repeat(fromDepth);
  return prefix + path + (target.search ? target.search : '');
}
function titleWithCity(prefix,city){const suffix=' | StudentHubHelp',cityName=String(city||'').trim();const maxPrefix=60-suffix.length-cityName.length-4;let text=String(prefix||'Student Services').trim();if(maxPrefix<8)return (cityName+' | StudentHubHelp').slice(0,60);if(text.length>maxPrefix)text=text.slice(0,Math.max(1,maxPrefix-1)).trimEnd()+'…';return text+' in '+cityName+suffix;}
function card(row,depth){
  const href=rel(depth,propUrl(row));
  const bits=[row.area,row.city,row.address].filter(Boolean);
  return '<article class="property-card"><h3><a href="'+esc(href)+'">'+esc(row.name||'Student property')+'</a></h3>'+
    (bits.length?'<p>📍 '+esc(bits.join(' • '))+'</p>':'')+
    '<p><span class="badge">✓ Verified & Active</span></p></article>';
}
function categoryNames(rows){return [...new Set(rows.map(row=>TABLES.find(item=>item.type===row.type)?.label||row.type))].filter(Boolean);}
function faqForCity(city){const cats=categoryNames(city.rows);return [{question:'What student services can I find in '+city.name+'?',answer:'The current StudentHubHelp directory shows '+city.rows.length+' verified and active listings across '+cats.join(', ')+' in '+city.name+'.'},{question:'How can I find services near a coaching institute or landmark in '+city.name+'?',answer:'Search the institute or landmark name in Global Search. Matches use location details stored with listings; confirm the exact route and current availability with the provider before visiting.'},{question:'Are the listings guaranteed to be available?',answer:'Listings shown here are marked active and verified in the source data when this page is generated. Availability and service details can change, so reconfirm directly with the provider.'}];}
function faqForCategory(meta,city,rows){return [{question:'How many '+meta.label.toLowerCase()+' listings are shown in '+city.name+'?',answer:'This directory currently shows '+rows.length+' verified and active '+meta.label.toLowerCase()+' listings in '+city.name+'.'},{question:'What should I check before choosing a listing?',answer:'Review the location, facilities, timings, pricing and contact details shown on the individual listing, then confirm current availability directly with the provider.'},{question:'How can I find one near a landmark?',answer:'Search the landmark or coaching institute name in Global Search. Any distance stated in listing details is provider-supplied and should be confirmed using a map and the provider.'}];}
function faqForArea(area,city){const cats=categoryNames(area.rows);return [{question:'What student services are listed around '+area.name+', '+city.name+'?',answer:'The current directory shows '+area.rows.length+' verified and active listings across '+cats.join(', ')+' around '+area.name+', '+city.name+'.'},{question:'How do I confirm the exact location?',answer:'Open the individual listing, review its address and map details, and confirm the route and availability with the provider before visiting.'}];}
function faqForCoaching(coach,city,rows){const cats=categoryNames(rows);return [{question:'What student services are linked to '+coach.name+' in '+city.name+'?',answer:'This page groups '+rows.length+' verified and active listings whose stored name, area, address or nearby-landmark details mention '+coach.name+'. Categories shown include '+cats.join(', ')+'.'},{question:'Are distances from '+coach.name+' independently verified?',answer:'No. Coaching and landmark matches are based on information stored with each listing. Confirm the exact distance and route on a map and with the provider.'}];}
function faqHtml(items){if(!items.length)return '';return '<section class="section seo-faq" aria-label="Common questions"><h2>Quick answers</h2>'+items.map(item=>'<details><summary>'+esc(item.question)+'</summary><p>'+esc(item.answer)+'</p></details>').join('')+'</section>';}
function metaDescription(value){let text=String(value||'').replace(/\s+/g,' ').trim();if(text.length<110)text+=' Browse verified and active listings on StudentHubHelp.';if(text.length>160)text=text.slice(0,157).replace(/\s+\S*$/,'').trim()+'…';return text;}
function shell({title,description,canonical,h1,crumbs,body,depth=2,about=[],itemRows=[],faqItems=[]}){
  const canonicalAbs=canonical;
  const metaDesc=metaDescription(description);
  const premiumLocationPaths = new Set([
    '/sikar/','/sikar/piprali-road/','/sikar/nawalgarh-road/','/sikar/anand-nagar/','/sikar/new-indira-colony/','/sikar/vasant-vihar/',
    '/kota/','/kota/talwandi-kota/','/kota/indra-vihar-talwandi/','/kota/new-jawahar-nagar-talwandi-kota/','/kota/hostel/','/kota/tiffin/',
    '/sikar/hostel/','/sikar/cafe/','/sikar/tiffin/','/sikar/coaching/allen/','/sikar/coaching/matrix/',
  ]);
  const canonicalPath = new URL(canonicalAbs).pathname;
  const premiumLocation = premiumLocationPaths.has(canonicalPath) || canonicalPath.startsWith('/sikar/') || canonicalPath.startsWith('/kota/');
  const home=rel(depth,BASE);
  const breadcrumb=crumbs.map((c,i)=>i===crumbs.length-1?'<span>'+esc(c.name)+'</span>':'<a href="'+esc(rel(depth,c.url))+'">'+esc(c.name)+'</a>').join(' <span>›</span> ');
  const entityTypeByCategory={hostel:'LodgingBusiness',tiffin:'FoodEstablishment',library:'Library',cafe:'CafeOrCoffeeShop',bookstore:'BookStore'};
  const latestDataUpdate=itemRows.map(row=>row.updated_at||row.created_at||'').filter(Boolean).sort().pop()||null;
  const itemListElements=itemRows.slice(0,50).map((row,index)=>{
    const entity={'@type':entityTypeByCategory[row.type]||'Thing','name':row.name||'Student listing','url':propUrl(row)};
    if(row.address||row.area||row.city) entity.address={'@type':'PostalAddress',...(row.address?{'streetAddress':row.address}:{}),...(row.city?{'addressLocality':row.city}:{}),'addressCountry':'IN'};
    return {'@type':'ListItem','position':index+1,'item':entity};
  });
  const schema={'@context':'https://schema.org','@type':'CollectionPage','@id':canonicalAbs+'#page','name':h1,'url':canonicalAbs,'description':metaDesc,'inLanguage':'en-IN',...(latestDataUpdate?{'dateModified':latestDataUpdate}:{}),'isPartOf':{'@type':'WebSite','name':'StudentHubHelp','url':BASE},'breadcrumb':{'@type':'BreadcrumbList','itemListElement':crumbs.map((c,i)=>({'@type':'ListItem','position':i+1,'name':c.name,'item':c.url}))},...(about.length?{'about':about}:{}),...(itemRows.length?{'mainEntity':{'@type':'ItemList','numberOfItems':itemRows.length,'itemListOrder':'https://schema.org/ItemListOrderAscending','itemListElement':itemListElements}}:{}),...(faqItems.length?{'hasPart':{'@type':'FAQPage','mainEntity':faqItems.map(item=>({'@type':'Question','name':item.question,'acceptedAnswer':{'@type':'Answer','text':item.answer}}))}}:{})};
  const freshnessMarkup=latestDataUpdate?'<p class="data-freshness">Directory data last updated: '+esc(new Date(latestDataUpdate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}))+'</p>':'';
  const dataSourceMarkup=itemRows.length?'<section class="section data-source-note" aria-label="About this directory data"><h2>About this directory data</h2><p>Source: StudentHubHelp public listings directory. This page includes '+itemRows.length+' listing records selected from entries marked active and verified in the source data when this page was generated.</p><p>Listing details and availability can change. Confirm current prices, facilities, timings, location and availability directly with the owner or service provider before making a decision.</p></section>':'';
  return '<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>'+esc(title)+'</title><meta name="description" content="'+esc(metaDesc)+'">'+GENERATED_MARKER+
    '<meta name="robots" content="index,follow"><link rel="icon" type="image/png" href="/logo.png?v=logo-hd-20261029"><link rel="apple-touch-icon" href="/logo.png?v=logo-hd-20261029"><link rel="canonical" href="'+esc(canonicalAbs)+'">'+
    '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(metaDesc)+'"><meta property="og:url" content="'+esc(canonicalAbs)+'"><meta property="og:type" content="website">'+
    '<script type="application/ld+json">'+JSON.stringify(schema)+'</script>'+
    '<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:1180px;margin:auto;padding:24px;line-height:1.55;color:#172033;background:#fff}.crumbs{font-size:.92rem;margin-bottom:18px;color:#64748b}.crumbs a{color:#3158c9}.hero{padding:18px 0 8px}h1{font-size:clamp(28px,5vw,44px);line-height:1.1;margin:.2em 0}.muted{color:#64748b}.data-freshness{font-size:.9rem;color:#64748b;margin:8px 0 18px}.data-source-note{padding:18px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc}.data-source-note h2{margin-top:0}.data-source-note p:last-child{margin-bottom:0;color:#64748b}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}.property-card,.category-card{border:1px solid #e2e8f0;border-radius:14px;padding:16px;background:#fff}.property-card h3,.category-card h2{margin-top:0}.property-card a,.category-card a{color:#3158c9;text-decoration:none}.badge{font-size:.82rem;color:#166534;background:#dcfce7;padding:3px 8px;border-radius:999px}.section{margin:30px 0}.links{display:flex;flex-wrap:wrap;gap:10px}.links a{padding:8px 12px;border:1px solid #dbe3ef;border-radius:999px;text-decoration:none;color:#3158c9}.premium-location{max-width:none!important;padding:0!important;background:#f5f7fb!important;color:#172238!important}.premium-location main{max-width:1240px;margin:0 auto;padding:24px 18px 56px}.premium-location .crumbs{color:#b8c8dc;background:#0b1f3a;border-radius:14px;padding:14px 18px;margin:0 0 22px}.premium-location .crumbs a{color:#f2c866}.premium-location .hero{position:relative;overflow:hidden;padding:34px clamp(22px,4vw,48px);margin:0 0 26px;border-radius:24px;color:#fff;background:radial-gradient(ellipse at 85% 0,rgba(215,166,61,.22),transparent 30%),linear-gradient(125deg,#07182e,#102e51 62%,#091d37);box-shadow:0 18px 42px rgba(12,31,58,.12)}.premium-location .hero h1{color:#fff;font-size:clamp(32px,4.8vw,56px);letter-spacing:-1.5px;max-width:850px}.premium-location .hero .muted{color:#d1dbea;max-width:760px}.premium-location .section{margin:28px 0}.premium-location .section>h2{font-size:clamp(20px,2.3vw,28px);letter-spacing:-.5px;color:#0b1f3a;margin:0 0 16px}.premium-location .grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:18px}.premium-location .property-card,.premium-location .category-card{border:1px solid #e2eaf3;border-radius:18px;padding:20px;background:#fff;box-shadow:0 8px 24px rgba(12,31,58,.055);transition:transform .18s ease,box-shadow .18s ease}.premium-location .property-card:hover,.premium-location .category-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(12,31,58,.1)}.premium-location .property-card h3,.premium-location .category-card h2{color:#142f52;line-height:1.35}.premium-location .property-card a,.premium-location .category-card a{color:#3158c9;font-weight:700}.premium-location .badge{display:inline-block;color:#166548;background:#e2f7ed;border:1px solid #b9ecd3;padding:5px 10px;border-radius:999px;font-weight:700}.premium-location .links a{background:#fff;border:1px solid #dbe4ef;color:#203a5b;font-weight:700;padding:10px 14px;border-radius:12px;transition:background .18s,border-color .18s}.premium-location .links a:hover{background:#fff5d9;border-color:#e7c66e}.premium-location a:focus-visible{outline:3px solid #d7a63d;outline-offset:3px}.seo-faq{border:1px solid #e2e8f0;border-radius:16px;padding:20px;background:#fff}.seo-faq h2{margin-top:0}.seo-faq details{padding:12px 0;border-top:1px solid #e2e8f0}.seo-faq summary{cursor:pointer;font-weight:700;color:#142f52}.seo-faq p{color:#475569;margin:10px 0 0}@media(max-width:650px){body{padding:0}.premium-location main{padding:14px 12px 36px}.premium-location .crumbs{padding:12px 14px;border-radius:12px}.premium-location .hero{padding:26px 20px;border-radius:18px}.premium-location .hero h1{font-size:clamp(29px,8vw,40px);letter-spacing:-.8px}.premium-location .property-card,.premium-location .category-card{padding:17px;border-radius:15px}.premium-location .grid{grid-template-columns:1fr;gap:12px}.premium-location .links{gap:8px}.premium-location .links a{padding:9px 11px}}</style><link rel="stylesheet" href="/assets/premium-location.css"></head><body class="'+(premiumLocation?'premium-location':'')+'"><main>'+
    '<nav class="crumbs"><a href="'+esc(home)+'">StudentHubHelp</a> <span>›</span> '+breadcrumb+'</nav>'+
    '<header class="hero"><h1>'+esc(h1)+'</h1><p class="muted">'+esc(description)+'</p></header>'+freshnessMarkup+'<section class="search-panel" aria-label="Find student services"><input type="search" aria-label="Search" placeholder="Search a place, locality or service..." onkeydown="if(event.key===\'Enter\'){window.location.href=\'/global-search.html?q=\'+encodeURIComponent(this.value)}"><a href="/global-search.html">Search places →</a></section><nav class="category-pills" aria-label="Student service categories"><a href="/global-search.html">✦ All places</a><a href="/pg-finder.html">⌂ Hostels &amp; PGs</a><a href="/cafe-finder.html">☕ Cafes</a><a href="/tiffin-finder.html">♨ Tiffin &amp; Mess</a><a href="/library-finder.html">▤ Libraries</a><a href="/bookstore-finder.html">▣ Bookstores</a></nav>'+body+dataSourceMarkup+faqHtml(faqItems)+
    '</main><script src="/chatbot/chatbot.js" defer></script></body></html>';
}
async function fetchRows(meta){
  const out=[]; let offset=0;
  while(true){
    const u=new URL(SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/'+meta.table);
    u.searchParams.set('select','id,property_id,slug,name,city,area,address,nearby_coaching,landmark,latitude,longitude,description,status,verified,updated_at,created_at');
    u.searchParams.set('status','eq.active'); u.searchParams.set('verified','eq.true');
    u.searchParams.set('offset',String(offset)); u.searchParams.set('limit','1000');
    const res=await fetch(u,{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY}});
    if(!res.ok) throw new Error(meta.table+': HTTP '+res.status+' '+await res.text());
    const batch=await res.json(); if(!Array.isArray(batch)||!batch.length) break;
    for(const raw of batch){
      const city=canonicalCityName(raw.city), area=normalizeArea(raw.area||raw.service_area,city);
      const name=label(raw.name||raw.service_name);
      if(!city||!name) continue;
      const savedSlug=String(raw.slug||'').trim();
      const duplicateRedirect=LEGACY_REDIRECTS['/properties/'+meta.type+'/'+savedSlug+'/'];
      if(duplicateRedirect && duplicateRedirect.type===meta.type && duplicateRedirect.slug && duplicateRedirect.slug!==savedSlug) continue;
      out.push({...raw,type:meta.type,categoryLabel:meta.label,icon:meta.icon,city,area,areaRaw:label(raw.area||raw.service_area),name});
    }
    if(batch.length<1000) break; offset+=1000;
  }
  return out;
}
async function cleanupGeneratedPages(dir='.') {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const path = dir === '.' ? entry.name : dir + '/' + entry.name;
    if (entry.isDirectory()) {
      await cleanupGeneratedPages(path);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const html = await readFile(path, 'utf8').catch(() => '');
    if (html.includes(GENERATED_MARKER)) await rm(path);
  }
}
async function write(path,content){await mkdir(path.split('/').slice(0,-1).join('/')||'.',{recursive:true});await writeFile(path,content,'utf8');}
async function writeAreaRedirects(redirects,expected){
  const redirectPages=[];
  for(const [from,to] of redirects.entries()){
    const filePath=from.replace(/^\/+|\/+$/g,'')+'/index.html';
    if(expected.has(filePath))continue;
    const destination=new URL(to,BASE).href;
    const html='<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow">'+GENERATED_MARKER+'<link rel="canonical" href="'+esc(destination)+'"><meta http-equiv="refresh" content="0;url='+esc(destination)+'"><title>Page moved | StudentHubHelp</title></head><body><main><h1>This page has moved</h1><p><a href="'+esc(destination)+'">Continue to the updated StudentHubHelp page</a>.</p></main><script>window.location.replace('+JSON.stringify(destination)+');</script></body></html>';
    await write(filePath,html);
    expected.add(filePath);
    redirectPages.push({from,to,path:filePath});
  }
  const start='# BEGIN STUDENTHUBHELP GENERATED SEO AREA REDIRECTS',end='# END STUDENTHUBHELP GENERATED SEO AREA REDIRECTS';
  const existing=await readFile('_redirects','utf8').catch(()=> '');
  let preserved=existing;
  const a=existing.indexOf(start),b=existing.indexOf(end);
  if(a>=0&&b>a)preserved=(existing.slice(0,a)+'\n'+existing.slice(b+end.length)).trim();
  const rules=[...redirects.entries()].flatMap(([from,to])=>[from+' '+to+' 301',from.replace(/\/$/,'')+' '+to+' 301']);
  const block=[start,...rules,end].join('\n');
  await write('_redirects',[preserved,block].filter(Boolean).join('\n')+'\n');
  return redirectPages;
}

await cleanupGeneratedPages();
await mkdir(GENERATED_ROOT,{recursive:true});

const all=(await Promise.all(TABLES.map(fetchRows))).flat();
const areaRedirects=new Map(),areaCounts=new Map(),cityCounts=new Map();
for(const row of all){const citySlug=slug(canonicalCityName(row.city));cityCounts.set(citySlug,(cityCounts.get(citySlug)||0)+1);if(row.area){const areaKey=citySlug+'|'+key(row.area);areaCounts.set(areaKey,(areaCounts.get(areaKey)||0)+1);}}
for(const row of all){if(!row.areaRaw)continue;const cityName=canonicalCityName(row.city),citySlug=slug(cityName),cityPath='/'+citySlug+'/';const oldAreaSlug=slug(row.areaRaw),newAreaSlug=slug(row.area),count=areaCounts.get(citySlug+'|'+key(row.area))||0;if(!oldAreaSlug)continue;const from=cityPath+oldAreaSlug+'/';const cityTarget=(cityCounts.get(citySlug)||0)>=3?cityPath:'/explore-listings.html';const to=row.area&&newAreaSlug&&count>=3?cityPath+newAreaSlug+'/':cityTarget;if(from!==to)areaRedirects.set(from,to);}
const cities=new Map();
for(const row of all){
  const canonicalCity=canonicalCityName(row.city);
  const citySlug=slug(canonicalCity); if(!citySlug) continue;
  if(!cities.has(citySlug)) cities.set(citySlug,{name:canonicalCity,rows:[],nameCounts:new Map()});
  const group=cities.get(citySlug);
  group.rows.push({...row,city:canonicalCity});
  group.nameCounts.set(canonicalCity,(group.nameCounts.get(canonicalCity)||0)+1);
}
for(const group of cities.values()){
  group.name=[...group.nameCounts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0][0];
}

const generated=[];
const expected=new Set();

for(const c of cities.values()){
  const cs=slug(c.name); if(!cs || c.rows.length<LOCATION_MIN_PROPERTIES) continue;
  const cityDir=GENERATED_ROOT+'/'+cs;
  const cityUrl=new URL(cs+'/',BASE).href;
  const groups=new Map();
  for(const r of c.rows){if(!groups.has(r.type))groups.set(r.type,[]);groups.get(r.type).push(r);}
  const eligibleGroups=new Map([...groups.entries()].filter(([,rows])=>rows.length>=LOCATION_MIN_PROPERTIES));
  const categories=[...eligibleGroups.keys()].map(type=>TABLES.find(t=>t.type===type));
  const categoryLinks=categories.map(meta=>'<a href="'+esc(meta.type+'/')+'">'+meta.icon+' '+esc(meta.label)+'</a>').join('');
  const cityCoachingSlugs=[...new Set(c.rows.flatMap(matchedCoachings))];
  const coachingLinks=cityCoachingSlugs.map(s=>{const m=coachingBySlug(s);return '<a href="'+esc(entitySection(m)+'/'+m.slug+'/')+'">'+entityIcon(m)+' '+esc(m.name)+'</a>';}).join('');
  const coachingSection=coachingLinks?'<section class="section"><h2>Coaching institutes & landmarks in '+esc(c.name)+'</h2><p>Explore student properties connected to coaching institutes and local landmarks through verified listing data.</p><div class="links">'+coachingLinks+'</div></section>':'';
  const body=coachingSection+'<section class="section"><h2>Student-focused listings in '+esc(c.name)+'</h2><div class="grid">'+[...eligibleGroups.entries()].map(([type,rows])=>{const m=TABLES.find(x=>x.type===type);return '<article class="category-card"><h2>'+m.icon+' '+esc(m.label)+'</h2><p>'+rows.length+' verified and active listing'+(rows.length===1?'':'s')+'.</p><a href="'+esc(type+'/')+'">View '+esc(m.label)+' in '+esc(c.name)+' →</a></article>';}).join('')+'</div></section>'+
    '<section class="section"><h2>Explore '+esc(c.name)+'</h2><div class="links">'+categoryLinks+'</div></section>'+
    '<section class="section"><h2>Verified properties</h2><div class="grid">'+c.rows.slice(0,120).map(r=>card(r,1)).join('')+'</div></section>';
  const cityPath=cityDir+'/index.html'; expected.add(cityPath); generated.push(cityUrl);
  await write(cityPath,shell({title:titleWithCity('Student Services',c.name),description:'Find '+c.rows.length+' verified student listings in '+c.name+', including '+categoryNames(c.rows).join(', ')+'. Browse by category and locality on StudentHubHelp.',canonical:cityUrl,h1:'StudentHubHelp in '+c.name,crumbs:[{name:c.name,url:cityUrl}],body,depth:1,about:[{'@type':'City','name':c.name,'containedInPlace':{'@type':'State','name':stateForCity(c.name,c.rows)}}],itemRows:c.rows,faqItems:faqForCity(c)}));

  for(const meta of TABLES){
    const rows=c.rows.filter(r=>r.type===meta.type); if(rows.length<LOCATION_MIN_PROPERTIES) continue;
    const dir=cityDir+'/'+meta.type; const url=new URL(cs+'/'+meta.type+'/',BASE).href;
    const relatedCoachings=[...new Set(rows.flatMap(matchedCoachings))];
    const relatedCoachingLinks=relatedCoachings.map(s=>{const m=coachingBySlug(s);return '<a href="'+esc('../'+entitySection(m)+'/'+m.slug+'/')+'">'+entityIcon(m)+' '+esc(m.name)+'</a>';}).join('');
    const coachingContext=relatedCoachingLinks?'<section class="section"><h2>Nearby coaching & landmarks</h2><div class="links">'+relatedCoachingLinks+'</div></section>':'';
    const body='<section class="section"><h2>'+esc(meta.label)+' in '+esc(c.name)+'</h2><div class="grid">'+rows.map(r=>card(r,2)).join('')+'</div></section>'+coachingContext+
      '<section class="section"><a href="'+esc(rel(2,cityUrl))+'">← Back to '+esc(c.name)+'</a> · <a href="'+esc(rel(2,new URL(meta.finder,BASE).href))+'">Open '+esc(meta.label)+' Finder</a></section>';
    const p=dir+'/index.html'; expected.add(p); generated.push(url);
    await write(p,shell({title:titleWithCity(meta.label,c.name),description:'Browse '+rows.length+' verified '+meta.label.toLowerCase()+' in '+c.name+'. Compare locations and available service details on StudentHubHelp.',canonical:url,h1:meta.label+' in '+c.name,crumbs:[{name:c.name,url:cityUrl},{name:meta.label,url}],body,depth:3,about:[{'@type':'City','name':c.name},{'@type':'Thing','name':meta.label}],itemRows:rows,faqItems:faqForCategory(meta,c,rows)}));
  }

  const areas=new Map();
  for(const r of c.rows){if(!r.area)continue;const ak=key(r.area);if(!areas.has(ak))areas.set(ak,{name:r.area,rows:[]});areas.get(ak).rows.push(r);}
  for(const a of areas.values()){
    if(a.rows.length<LOCATION_MIN_PROPERTIES) continue;
    const as=slug(a.name); if(!as || as===cs) continue;
    const dir=cityDir+'/'+as; const url=new URL(cs+'/'+as+'/',BASE).href;
    const groupLinks=[...new Set(a.rows.map(r=>r.type))].filter(type=>eligibleGroups.has(type)).map(type=>{const m=TABLES.find(x=>x.type===type);return '<a href="'+esc('../'+type+'/' )+'">'+m.icon+' '+esc(m.label)+'</a>';}).join('');
    const areaCoachingSlugs=[...new Set(a.rows.flatMap(matchedCoachings))];
    const areaCoachingLinks=areaCoachingSlugs.map(s=>{const m=coachingBySlug(s);return '<a href="'+esc('../'+entitySection(m)+'/'+m.slug+'/')+'">'+entityIcon(m)+' '+esc(m.name)+'</a>';}).join('');
    const areaCoachingSection=areaCoachingLinks?'<section class="section"><h2>Nearby coaching & landmarks</h2><p>Coaching and landmark links are derived from names found in active verified listing details, including nearby-coaching and landmark fields.</p><div class="links">'+areaCoachingLinks+'</div></section>':'';
    const body='<section class="section"><h2>Verified student properties in '+esc(a.name)+', '+esc(c.name)+'</h2><div class="grid">'+a.rows.map(r=>card(r,2)).join('')+'</div></section>'+areaCoachingSection+
      '<section class="section"><h2>Categories</h2><div class="links">'+groupLinks+'</div></section>'+
      '<p><a href="'+esc(rel(2,cityUrl))+'">← Back to '+esc(c.name)+'</a></p>';
    const p=dir+'/index.html'; expected.add(p); generated.push(url);
    await write(p,shell({title:titleWithCity('Student Services near '+a.name,c.name),description:'Browse '+a.rows.length+' verified student listings around '+a.name+', '+c.name+'. Compare available categories and open each listing for location and service details.',canonical:url,h1:'Student Properties in '+a.name+', '+c.name,crumbs:[{name:c.name,url:cityUrl},{name:a.name,url}],body,depth:3,about:[{'@type':'Place','name':a.name,'containedInPlace':{'@type':'City','name':c.name}}],itemRows:a.rows,faqItems:faqForArea(a,c)}));
  }

  for(const coachSlug of cityCoachingSlugs){
    const coach=coachingBySlug(coachSlug); if(!coach) continue;
    const rows=c.rows.filter(r=>matchedCoachings(r).includes(coachSlug)); if(rows.length<LOCATION_MIN_PROPERTIES) continue;
    const section=entitySection(coach);
    const dir=cityDir+'/'+section+'/'+coach.slug;
    const url=new URL(cs+'/'+section+'/'+coach.slug+'/',BASE).href;
    const typeLinks=[...new Set(rows.map(r=>r.type))].map(type=>{const m=TABLES.find(x=>x.type===type);return '<a href="'+esc('/'+m.finder)+'">'+m.icon+' '+esc(m.label)+'</a>';}).join('');
    const body='<section class="section"><h2>Student properties near '+esc(coach.name)+' in '+esc(c.name)+'</h2><p>These verified and active listings mention this location in their name, area, address or nearby-landmark details. Listing-provided distances are not independently verified; confirm the exact route before visiting.</p><div class="grid">'+rows.map(r=>card(r,3)).join('')+'</div></section><section class="section"><h2>Categories</h2><div class="links">'+typeLinks+'</div></section><p><a href="'+esc(rel(3,cityUrl))+'">← Back to '+esc(c.name)+'</a></p>';
    const p=dir+'/index.html'; expected.add(p); generated.push(url);
    await write(p,shell({title:titleWithCity('Near '+coach.name,c.name),description:'Find student listings linked to '+coach.name+' in '+c.name+'. Check each listing for its location details and confirm exact distance before visiting.',canonical:url,h1:'Student Properties near '+coach.name+' in '+c.name,crumbs:[{name:c.name,url:cityUrl},{name:coach.name,url}],body,depth:3,about:[{'@type':entitySchemaType(coach),'name':coach.name},{'@type':'City','name':c.name}],itemRows:rows,faqItems:faqForCoaching(coach,c,rows)}));
  }
}

const uniqueGenerated = [...new Set(generated)];
const redirectPages=await writeAreaRedirects(areaRedirects,expected);
await write('seo-generated-manifest.json', JSON.stringify({generated: uniqueGenerated, expected:[...expected], areaRedirects:[...areaRedirects].map(([from,to])=>({from,to})), redirectPages}, null, 2)+'\n');
console.log(JSON.stringify({verifiedActiveProperties:all.length,cities:cities.size,generatedPages:generated.length,locationThreshold:LOCATION_MIN_PROPERTIES},null,2));
