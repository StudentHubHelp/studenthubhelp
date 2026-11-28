import { mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';

const BASE = (process.env.BASE_URL || 'https://studenthubhelp.in/').replace(/\/+$/, '') + '/';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const LOCATION_MIN_PROPERTIES = Number(process.env.SEO_LOCATION_MIN_PROPERTIES || 3);
// These city guides already have approved .html URLs; keep one canonical root per city.
const CITY_HTML_ROOTS = new Set(['sikar','bengaluru','chennai','kota','delhi','patna','jhunjhunu','pune','gurugram','coimbatore','jaipur','lucknow']);

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
  for (const alias of [city.name, ...(city.seoAliases || []), ...(city.searchAliases || [])]) CITY_ALIAS_MAP.set(key(alias), city.name);
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
    'patna':'Bihar','lucknow':'Uttar Pradesh','delhi':'Delhi','new delhi':'Delhi','gurugram':'Haryana','panchkula':'Haryana','sonipat':'Haryana','pune':'Maharashtra','vadodara':'Gujarat'
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
const CATEGORY_BANNERS = {
  hostel: '/hostel-banner.png',
  tiffin: '/tiffin-banner.png',
  library: '/library-banner.png',
  cafe: '/cafe-banner.png',
  bookstore: '/bookstore-banner.png'
};
function firstImageUrl(record) {
  const keys = ['images', 'image', 'image_urls', 'gallery_images', 'gallery', 'photos', 'image_url', 'photo_url', 'property_images'];
  function find(value) {
    if (value == null || value === '') return '';
    if (Array.isArray(value)) {
      for (const item of value) { const found = find(item); if (found) return found; }
      return '';
    }
    if (typeof value === 'object') return find(value.url || value.image_url || value.src || value.path || value.publicUrl);
    if (typeof value !== 'string') return '';
    const raw = value.trim();
    try { const parsed = JSON.parse(raw); if (parsed !== raw) return find(parsed); } catch {}
    const parts = raw.split(/\r?\n|,\s*(?=https?:\/\/)/i);
    for (const part of parts) {
      const candidate = part.trim().replace(/^['"]|['"]$/g, '');
      try { const parsed = new URL(candidate); if (parsed.protocol === 'https:') return parsed.href; } catch {}
    }
    return '';
  }
  for (const key of keys) { const found = find(record?.[key]); if (found) return found; }
  return '';
}

function rel(fromDepth,url){
  const target=new URL(url);
  const path=target.pathname.replace(/^\/+/, '');
  const prefix='../'.repeat(fromDepth);
  return prefix + path + (target.search ? target.search : '');
}
function citySeoProfile(city){
  const rows=city.rows;
  const counts=new Map(TABLES.map(meta=>[meta.type,rows.filter(row=>row.type===meta.type).length]));
  const ordered=TABLES.filter(meta=>(counts.get(meta.type)||0)>0)
    .sort((a,b)=>(counts.get(b.type)||0)-(counts.get(a.type)||0));
  const topServices=ordered.slice(0,2).map(meta=>meta.type==='hostel'?'Hostels & PGs':meta.type==='tiffin'?'Tiffin & Mess':meta.type==='library'?'Libraries':meta.type==='cafe'?'Cafes':'Bookstores');
  const titleServices=ordered.slice(0,2).map(meta=>meta.type==='hostel'?(ordered.length===1?'Hostels & PGs':'Hostels, PGs'):meta.type==='tiffin'?'Tiffin':meta.type==='library'?'Libraries':meta.type==='cafe'?'Cafes':'Bookstores');
  const areaCounts=new Map(),areaCategoryCounts=new Map(),areaNames=new Map();
  const normalizeArea=value=>key(value).replace(/[,.]+/g,' ').replace(/\s+/g,' ').trim();
  for(const row of rows){
    if(!row.area)continue;
    const areaKey=normalizeArea(row.area);
    if(!areaKey)continue;
    areaCounts.set(areaKey,(areaCounts.get(areaKey)||0)+1);
    if(!areaNames.has(areaKey))areaNames.set(areaKey,row.area.trim());
    if(!areaCategoryCounts.has(areaKey))areaCategoryCounts.set(areaKey,new Map());
    const categoryCounts=areaCategoryCounts.get(areaKey);
    categoryCounts.set(row.type,(categoryCounts.get(row.type)||0)+1);
  }
  const topAreaDetails=[...areaCounts.entries()]
    .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
    .slice(0,5)
    .map(([areaKey,count])=>{
      const categoryCounts=areaCategoryCounts.get(areaKey)||new Map();
      const topCategory=[...categoryCounts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]||'';
      return {name:areaNames.get(areaKey)||areaKey,count,topCategory};
    });
  const topAreas=topAreaDetails.map(item=>item.name);
  const coachingCounts=new Map();
  for(const row of rows){for(const slug of matchedCoachings(row)){const coach=coachingBySlug(slug);if(coach)coachingCounts.set(coach.name,(coachingCounts.get(coach.name)||0)+1);}}
  const coachingNames=[...coachingCounts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,4).map(([name])=>name);
  return {counts,ordered,topServices,titleServices,topAreas,topAreaDetails,coachingNames};
}
function joinWithAnd(items){
  if(items.length<2)return items[0]||'';
  if(items.length===2)return items[0]+' and '+items[1];
  return items.slice(0,-1).join(', ')+' and '+items[items.length-1];
}
function titleForCity(city, rows){
  const profile=citySeoProfile({name:city,rows});
  const types=profile.ordered.map(meta=>meta.type);
  let phrase=profile.titleServices.join(' & ')||'Student Services';
  if(key(city)==='kota' && types.includes('hostel') && types.includes('tiffin')) phrase='PGs, Hostels & Tiffin';
  return 'Student '+phrase+' in '+city+' | StudentHubHelp';
}
function descriptionForCity(city){
  const profile=citySeoProfile(city);
  const shortNames={hostel:'hostels/PGs',tiffin:'tiffin/mess services',library:'libraries',cafe:'cafes',bookstore:'bookstores'};
  const categories=profile.ordered.slice(0,3).map(meta=>shortNames[meta.type]||meta.label.toLowerCase());
  const categoryText=joinWithAnd(categories.length?categories:['student services']);
  const verified=city.rows.filter(row=>row.verified===true).length;
  const listingText=city.rows.length===1?'1 active student listing':city.rows.length+' active student listings';
  return 'Explore '+listingText+' in '+city.name+': '+categoryText+'. '+verified+(verified===1?' listing is':' listings are')+' marked verified in the directory. Confirm details with providers on StudentHubHelp.';
}
function h1ForCity(city){
  const profile=citySeoProfile(city);
  const phrase=joinWithAnd(profile.topServices.length?profile.topServices:['Student Services']);
  return phrase+' in '+city.name;
}
function cityContentIntro(city){
  const profile=citySeoProfile(city);
  const verified=city.rows.filter(row=>row.verified===true).length;
  const listingText=city.rows.length===1?'1 active listing':city.rows.length+' active listings';
  const categoryText=profile.ordered.map(meta=>meta.label+' ('+profile.counts.get(meta.type)+')').join(', ');
  const areaLinks=profile.topAreaDetails.map(area=>{
    const href=slug(area.name)+'/';
    const categoryName=TABLES.find(meta=>meta.type===area.topCategory)?.label||'student services';
    const label=area.name+' ('+area.count+' listings; largest category: '+categoryName+')';
    return area.count>=LOCATION_MIN_PROPERTIES
      ? '<a href="'+esc(href)+'">'+esc(label)+'</a>'
      : '<span>'+esc(label)+'</span>';
  }).join('');
  const areaText=profile.topAreas.length
    ? 'Current active listings are most frequently recorded in '+profile.topAreas.join(', ')+'. Area totals are based on saved locality fields, not verified travel distances.'
    : 'No locality names are currently available in the active listing records. Browse the city directory and check each listing address.';
  const coachingText=profile.coachingNames.length
    ? 'Some listing records mention coaching institutes or landmarks such as '+profile.coachingNames.join(', ')+'. These are text matches from listing details, not independently verified distance claims.'
    : 'Use Global Search for a coaching institute or landmark, then confirm the exact route using the listing address and a map.';
  const categoryChecks=profile.ordered.map(meta=>{
    const guidance={
      hostel:'For hostels and PGs, compare room type, sharing, facilities, safety information and published charges.',
      tiffin:'For meal and tiffin listings, check meal options, delivery coverage, plan duration and published timings; confirm whether a subscription is offered.',
      library:'For libraries, check access hours, seat availability, facilities and published fees.',
      cafe:'For cafes, review location, opening hours and services listed by the provider.',
      bookstore:'For bookstores, check listed book categories, stationery and availability before visiting.'
    };
    return guidance[meta.type];
  }).filter(Boolean);
  return '<section class="section city-overview"><h2>Student services and local areas in '+esc(city.name)+'</h2>'+
    '<p>The directory currently contains '+listingText+' in '+esc(city.name)+', across '+esc(categoryText||'the student-service categories')+'. '+verified+(verified===1?' listing is':' listings are')+' marked verified in the source records; the remaining active records are shown without a verification claim.</p>'+
    '<h3>Localities represented in the directory</h3><p>'+esc(areaText)+'</p><div class="links locality-links">'+areaLinks+'</div>'+
    '<h3>What to compare before choosing</h3><ul>'+categoryChecks.map(item=>'<li>'+esc(item)+'</li>').join('')+
    '<li>Confirm current price, exact address, availability and terms directly with the provider before visiting or paying.</li></ul>'+
    '<p>'+esc(coachingText)+'</p></section>';
}
function titleForCategory(meta, city){
  const singular={hostel:'Hostel & PG',tiffin:'Tiffin & Mess',library:'Library',cafe:'Cafe',bookstore:'Bookstore'}[meta.type]||meta.label;
  return 'Student '+singular+' in '+city+' | StudentHubHelp';
}
function titleForArea(area, city, rows, hasCoaching){
  const types=new Set(rows.map(row=>row.type));
  const names=[];
  if(types.has('hostel')) names.push('Hostel');
  if(types.has('library')) names.push('Library');
  if(types.has('tiffin')) names.push('Tiffin');
  if(types.has('cafe')) names.push('Cafe');
  if(types.has('bookstore')) names.push('Bookstore');
  if(key(city)!=='sikar'){
    const services=names.length>2?names.slice(0,2):names;
    const prefix='Student '+(services.length?services.join(' & '):'Student Services');
    return prefix+(hasCoaching?' Near Coaching':'')+' in '+area+', '+city+' | StudentHubHelp';
  }
  const suffix=' | StudentHubHelp';
  const location=' in '+area+', '+city;
  const room=Math.max(1,60-suffix.length-location.length);
  const candidates=[names.slice(0,2).join(' & '),names[0]||'Student Services','Student'];
  const prefix=candidates.find(value=>value && value.length<=room)||'Student';
  return prefix+location+suffix;
}
function titleForCoaching(coach,city){
  if(key(city)!=='sikar') return 'Student Properties near '+coach.name+' in '+city+' | StudentHubHelp';
  const suffix=' | StudentHubHelp';
  const location=' in '+city;
  const room=Math.max(1,60-suffix.length-location.length-5);
  const name=label(coach.name);
  const prefix='Near '+name.slice(0,room).trim();
  return prefix+location+suffix;
}
function card(row,depth){
  const href=rel(depth,propUrl(row));
  const bits=[row.area,row.city,row.address].filter(Boolean);
  if(key(row.city)!=='sikar'){
    const status=row.verified===true?'<span class="badge">✓ Verified</span>':'<span class="badge">Active · Details Provided</span>';
    return '<article class="property-card"><h3><a href="'+esc(href)+'">'+esc(row.name||'Student property')+'</a></h3>'+
      (bits.length?'<p>📍 '+esc(bits.join(' • '))+'</p>':'')+
      '<p>'+status+'</p></article>';
  }
  const banner=rel(depth,new URL(CATEGORY_BANNERS[row.type]||'/hostel-banner.png',BASE).href);
  const image=firstImageUrl(row)||banner;
  const status=row.verified===true?'<span class="badge">✓ Verified</span>':'<span class="badge">Active · Details Provided</span>';
  return '<article class="property-card"><a class="property-card-image" href="'+esc(href)+'"><img src="'+esc(image)+'" alt="'+esc((row.name||'Student property')+' listing image')+'" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\''+esc(banner)+'\'"></a><h3><a href="'+esc(href)+'">'+esc(row.name||'Student property')+'</a></h3>'+
    (bits.length?'<p>📍 '+esc(bits.join(' • '))+'</p>':'')+
    '<p>'+status+'</p></article>';
}
function categoryNames(rows){return [...new Set(rows.map(row=>TABLES.find(item=>item.type===row.type)?.label||row.type))].filter(Boolean);}
function faqForCity(city){const cats=categoryNames(city.rows),verified=city.rows.filter(row=>row.verified===true).length,listingText=city.rows.length===1?'1 active listing':city.rows.length+' active listings';return [{question:'What student services can I find in '+city.name+'?',answer:'The current StudentHubHelp directory shows '+listingText+' across '+cats.join(', ')+' in '+city.name+'. '+verified+(verified===1?' listing is':' listings are')+' marked verified in the source records.'},{question:'How can I find services near a coaching institute or landmark in '+city.name+'?',answer:'Search the institute or landmark name in Global Search. Matches use location details stored with listings; confirm the exact route and current availability with the provider before visiting.'},{question:'Are the listings guaranteed to be available?',answer:'Active status reflects the latest listing status available when this page was generated. Availability and service details can change, so reconfirm directly with the provider.'}];}
function faqForCategory(meta,city,rows){
  const verified=rows.filter(row=>row.verified===true).length;
  const countText=rows.length===1?'1 active record':rows.length+' active records';
  return [
    {question:'How many '+meta.label.toLowerCase()+' listings are shown in '+city.name+'?',answer:'This directory currently shows '+countText+' in the '+meta.label.toLowerCase()+' category in '+city.name+', of which '+verified+(verified===1?' record is':' records are')+' marked verified.'},
    {question:'What should I check before choosing a listing?',answer:'Review the location, facilities, timings, pricing and contact details shown on the individual listing, then confirm current availability directly with the provider.'},
    {question:'How can I find one near a landmark?',answer:'Search the landmark or coaching institute name in Global Search. Any distance stated in listing details is provider-supplied and should be confirmed using a map and the provider.'}
  ];
}
function faqForArea(area,city){const cats=categoryNames(area.rows),countText=area.rows.length===1?'1 active listing':area.rows.length+' active listings';return [{question:'What student services are listed around '+area.name+', '+city.name+'?',answer:'The current directory shows '+countText+' across '+cats.join(', ')+' around '+area.name+', '+city.name+'.'},{question:'How do I confirm the exact location?',answer:'Open the individual listing, review its address and map details, and confirm the route and availability with the provider before visiting.'}];}
function faqForCoaching(coach,city,rows){const cats=categoryNames(rows),countText=rows.length===1?'1 active listing':rows.length+' active listings';return [{question:'What student services are linked to '+coach.name+' in '+city.name+'?',answer:'This page groups '+countText+' whose stored name, area, address or nearby-landmark details mention '+coach.name+'. Categories shown include '+cats.join(', ')+'.'},{question:'Are distances from '+coach.name+' independently verified?',answer:'No. Coaching and landmark matches are based on information stored with each listing. Confirm the exact distance and route on a map and with the provider.'}];}
function faqHtml(items){if(!items.length)return '';return '<section class="section seo-faq" aria-label="Common questions"><h2>Quick answers</h2>'+items.map(item=>'<details><summary>'+esc(item.question)+'</summary><p>'+esc(item.answer)+'</p></details>').join('')+'</section>';}
function metaDescription(value){let text=String(value||'').replace(/\s+/g,' ').trim();if(text.length<110)text+=' Browse active listings on StudentHubHelp and check each listing status.';if(text.length>160)text=text.slice(0,157).replace(/\s+\S*$/,'').trim()+'…';return text;}
function limitTitle(value,max=60){const suffix=' | StudentHubHelp';const title=String(value||'').replace(/\s+/g,' ').trim();if(title.length<=max)return title;const source=title.endsWith(suffix)?title.slice(0,-suffix.length).trim():title;const room=max-suffix.length;const words=source.split(/\s+/);while(words.length&&words.join(' ').length>room)words.pop();const base=words.join(' ')||source.slice(0,room).trim();return base+suffix;}
function shell({title,description,canonical,h1,crumbs,body,depth=2,about=[],itemRows=[],faqItems=[],cityHub=false}){
  title=limitTitle(title);
  const canonicalAbs=canonical;
  const cityEntity=about.find(entity=>entity['@type']==='City');
  const liveCityMarkup=cityHub&&cityEntity?'<section class="section live-city-directory" id="cityHub" data-city="'+esc(cityEntity.name)+'" data-state="'+esc(cityEntity.containedInPlace?.name||'')+'"><h2>Live student listings in '+esc(cityEntity.name)+'</h2><p>Live counts and recent active listings are loaded from the public directory. Check each listing for current details.</p><div id="liveStats" class="live-stats"><span>Loading live directory…</span></div><div id="areaGrid" class="live-areas"></div><div id="liveCards" class="live-cards"></div></section>':'';
  const metaDesc=metaDescription(description);
  const premiumLocationPaths = new Set([
    '/sikar/','/sikar/piprali-road/','/sikar/nawalgarh-road/','/sikar/anand-nagar/','/sikar/new-indira-colony/','/sikar/vasant-vihar/',
    '/kota/','/kota/talwandi-kota/','/kota/indra-vihar-talwandi/','/kota/new-jawahar-nagar-talwandi-kota/','/kota/hostel/','/kota/tiffin/',
    '/sikar/hostel/','/sikar/cafe/','/sikar/tiffin/','/sikar/coaching/allen/','/sikar/coaching/matrix/',
  ]);
  const premiumCityPrefixes=['/bengaluru/','/chennai/','/patna/','/jhunjhunu/','/gurugram/','/coimbatore/','/delhi/','/jaipur/','/pune/','/lucknow/'];
  const premiumCityRoots=new Set(['/sikar.html','/bengaluru.html','/chennai.html','/kota.html','/delhi.html','/patna.html','/jhunjhunu.html','/pune.html','/gurugram.html','/coimbatore.html','/jaipur.html','/lucknow.html']);
  const canonicalPath = new URL(canonicalAbs).pathname;
  const premiumLocation = premiumLocationPaths.has(canonicalPath) || premiumCityRoots.has(canonicalPath) || premiumCityPrefixes.some(prefix=>canonicalPath.startsWith(prefix)) || canonicalPath.startsWith('/sikar/') || canonicalPath.startsWith('/kota/');
  const home=rel(depth,BASE);
  const breadcrumb=crumbs.filter((c,i)=>!(i===0&&c.name==='Home')).map((c,i,items)=>i===items.length-1?'<span>'+esc(c.name)+'</span>':'<a href="'+esc(rel(depth,c.url))+'">'+esc(c.name)+'</a>').join(' <span>›</span> ');
  const entityTypeByCategory={hostel:'LodgingBusiness',tiffin:'FoodEstablishment',library:'Library',cafe:'CafeOrCoffeeShop',bookstore:'BookStore'};
  const latestDataUpdate=itemRows.map(row=>row.updated_at||row.created_at||'').filter(Boolean).sort().pop()||null;
  const itemListElements=itemRows.slice(0,50).map((row,index)=>{
    const entity={'@type':entityTypeByCategory[row.type]||'Thing','name':row.name||'Student listing','url':propUrl(row)};
    if(row.address||row.area||row.city) entity.address={'@type':'PostalAddress',...(row.address?{'streetAddress':row.address}:{}),...(row.city?{'addressLocality':row.city}:{}),'addressCountry':'IN'};
    return {'@type':'ListItem','position':index+1,'item':entity};
  });
  const schema={'@context':'https://schema.org','@type':'CollectionPage','@id':canonicalAbs+'#page','name':h1,'url':canonicalAbs,'description':metaDesc,'inLanguage':'en-IN',...(latestDataUpdate?{'dateModified':latestDataUpdate}:{}),'isPartOf':{'@type':'WebSite','name':'StudentHubHelp','url':BASE},'breadcrumb':{'@type':'BreadcrumbList','itemListElement':crumbs.map((c,i)=>({'@type':'ListItem','position':i+1,'name':c.name,'item':c.url}))},...(about.length?{'about':about}:{}),...(itemRows.length?{'mainEntity':{'@type':'ItemList','numberOfItems':itemRows.length,'itemListOrder':'https://schema.org/ItemListOrderAscending','itemListElement':itemListElements}}:{}),...(faqItems.length?{'hasPart':{'@type':'FAQPage','mainEntity':faqItems.map(item=>({'@type':'Question','name':item.question,'acceptedAnswer':{'@type':'Answer','text':item.answer}}))}}:{})};
  const freshnessMarkup=latestDataUpdate?'<p class="data-freshness">Directory data last updated: '+esc(new Date(latestDataUpdate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}))+'</p>':'';
  const verifiedCount=itemRows.filter(row=>row.verified===true).length;
  const dataSourceMarkup=itemRows.length?'<section class="section data-source-note" aria-label="About this directory data"><h2>About this directory data</h2><p>Source: StudentHubHelp public listings directory. This page includes '+itemRows.length+' records marked active when the page was generated; '+verifiedCount+' are also marked verified in the source data.</p><p>Listing details and availability can change. Confirm current prices, facilities, timings, location and availability directly with the owner or service provider before making a decision.</p></section>':'';
  return '<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>'+esc(title)+'</title><meta name="description" content="'+esc(metaDesc)+'">'+GENERATED_MARKER+
    '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><link rel="icon" type="image/png" href="/logo.png?v=logo-hd-20261029"><link rel="apple-touch-icon" href="/logo.png?v=logo-hd-20261029"><link rel="canonical" href="'+esc(canonicalAbs)+'">'+
    '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(metaDesc)+'"><meta property="og:url" content="'+esc(canonicalAbs)+'"><meta property="og:type" content="website"><meta property="og:locale" content="en_IN"><meta property="og:image" content="https://studenthubhelp.in/logo.png?v=logo-hd-20261029"><meta property="og:image:alt" content="StudentHubHelp student services directory"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+esc(title)+'"><meta name="twitter:description" content="'+esc(metaDesc)+'"><meta name="twitter:image" content="https://studenthubhelp.in/logo.png?v=logo-hd-20261029">'+
    '<script type="application/ld+json">'+JSON.stringify(schema)+'</script>'+
    '<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:1180px;margin:auto;padding:24px;line-height:1.55;color:#172033;background:#fff}.crumbs{font-size:.92rem;margin-bottom:18px;color:#64748b}.crumbs a{color:#3158c9}.hero{padding:18px 0 8px}h1{font-size:clamp(28px,5vw,44px);line-height:1.1;margin:.2em 0}.muted{color:#64748b}.data-freshness{font-size:.9rem;color:#64748b;margin:8px 0 18px}.data-source-note{padding:18px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc}.data-source-note h2{margin-top:0}.data-source-note p:last-child{margin-bottom:0;color:#64748b}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}.property-card,.category-card{border:1px solid #e2e8f0;border-radius:14px;padding:16px;background:#fff}.property-card-image{display:block;margin:-16px -16px 14px}.property-card-image img{display:block;width:100%;height:164px;object-fit:cover;border-radius:13px 13px 0 0;background:#f1f5f9}.premium-location .property-card-image{margin:-20px -20px 14px}.premium-location .property-card-image img{height:170px;border-radius:17px 17px 0 0}.property-card h3,.category-card h2{margin-top:0}.property-card a,.category-card a{color:#3158c9;text-decoration:none}.badge{font-size:.82rem;color:#166534;background:#dcfce7;padding:3px 8px;border-radius:999px}.section{margin:30px 0}.links{display:flex;flex-wrap:wrap;gap:10px}.links a{padding:8px 12px;border:1px solid #dbe3ef;border-radius:999px;text-decoration:none;color:#3158c9}.premium-location{max-width:none!important;padding:0!important;background:#f5f7fb!important;color:#172238!important}.premium-location main{max-width:1240px;margin:0 auto;padding:24px 18px 56px}.premium-location .crumbs{color:#b8c8dc;background:#0b1f3a;border-radius:14px;padding:14px 18px;margin:0 0 22px}.premium-location .crumbs a{color:#f2c866}.premium-location .hero{position:relative;overflow:hidden;padding:34px clamp(22px,4vw,48px);margin:0 0 26px;border-radius:24px;color:#fff;background:radial-gradient(ellipse at 85% 0,rgba(215,166,61,.22),transparent 30%),linear-gradient(125deg,#07182e,#102e51 62%,#091d37);box-shadow:0 18px 42px rgba(12,31,58,.12)}.premium-location .hero h1{color:#fff;font-size:clamp(32px,4.8vw,56px);letter-spacing:-1.5px;max-width:850px}.premium-location .hero .muted{color:#d1dbea;max-width:760px}.premium-location .section{margin:28px 0}.premium-location .section>h2{font-size:clamp(20px,2.3vw,28px);letter-spacing:-.5px;color:#0b1f3a;margin:0 0 16px}.premium-location .grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:18px}.premium-location .property-card,.premium-location .category-card{border:1px solid #e2eaf3;border-radius:18px;padding:20px;background:#fff;box-shadow:0 8px 24px rgba(12,31,58,.055);transition:transform .18s ease,box-shadow .18s ease}.premium-location .property-card:hover,.premium-location .category-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(12,31,58,.1)}.premium-location .property-card h3,.premium-location .category-card h2{color:#142f52;line-height:1.35}.premium-location .property-card a,.premium-location .category-card a{color:#3158c9;font-weight:700}.premium-location .badge{display:inline-block;color:#166548;background:#e2f7ed;border:1px solid #b9ecd3;padding:5px 10px;border-radius:999px;font-weight:700}.premium-location .links a{background:#fff;border:1px solid #dbe4ef;color:#203a5b;font-weight:700;padding:10px 14px;border-radius:12px;transition:background .18s,border-color .18s}.premium-location .links a:hover{background:#fff5d9;border-color:#e7c66e}.premium-location a:focus-visible{outline:3px solid #d7a63d;outline-offset:3px}.seo-faq{border:1px solid #e2e8f0;border-radius:16px;padding:20px;background:#fff}.seo-faq h2{margin-top:0}.seo-faq details{padding:12px 0;border-top:1px solid #e2e8f0}.seo-faq summary{cursor:pointer;font-weight:700;color:#142f52}.seo-faq p{color:#475569;margin:10px 0 0}.live-city-directory{padding:22px;border:1px solid #e2eaf3;border-radius:20px;background:#fff;box-shadow:0 8px 24px rgba(12,31,58,.05)}.live-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin:14px 0}.live-stats .stat{padding:12px;border-radius:12px;background:#f3f7fb}.live-stats .stat b,.live-stats .stat span{display:block}.live-stats .stat b{font-size:22px;color:#0b1f3a}.live-stats .stat span{font-size:12px;color:#64748b}.live-areas{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.live-areas .area-card{padding:8px 11px;border:1px solid #dbe4ef;border-radius:12px;color:#203a5b}.live-areas .area-card small{display:block;color:#64748b}.live-cards .service-block{margin:22px 0}.live-cards .service-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.live-cards .listing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px}.live-cards .listing{display:block;padding:14px;border:1px solid #e2eaf3;border-radius:14px;color:#203a5b}.live-cards .listing-body>span{display:block;margin:5px 0}.live-cards .listing-bottom{color:#3158c9;font-weight:700}@media(max-width:650px){body{padding:0}.premium-location main{padding:14px 12px 36px}.premium-location .crumbs{padding:12px 14px;border-radius:12px}.premium-location .hero{padding:26px 20px;border-radius:18px}.premium-location .hero h1{font-size:clamp(29px,8vw,40px);letter-spacing:-.8px}.premium-location .property-card,.premium-location .category-card{padding:17px;border-radius:15px}.premium-location .grid{grid-template-columns:1fr;gap:12px}.premium-location .links{gap:8px}.premium-location .links a{padding:9px 11px}}</style><link rel="stylesheet" href="/assets/premium-location.css"></head><body class="'+(premiumLocation?'premium-location':'')+'"><main>'+
    '<nav class="crumbs"><a href="'+esc(home)+'">StudentHubHelp</a> <span>›</span> '+breadcrumb+'</nav>'+
    '<header class="hero"><h1>'+esc(h1)+'</h1><p class="muted">'+esc(description)+'</p></header>'+freshnessMarkup+'<section class="search-panel" aria-label="Find student services"><input type="search" aria-label="Search" placeholder="Search a place, locality or service..." onkeydown="if(event.key===\'Enter\'){window.location.href=\'/global-search.html?q=\'+encodeURIComponent(this.value)}"><a href="/global-search.html">Search places →</a></section><nav class="category-pills" aria-label="Student service categories"><a href="/global-search.html">✦ All places</a><a href="/pg-finder.html">⌂ Hostels &amp; PGs</a><a href="/cafe-finder.html">☕ Cafes</a><a href="/tiffin-finder.html">♨ Tiffin &amp; Mess</a><a href="/library-finder.html">▤ Libraries</a><a href="/bookstore-finder.html">▣ Bookstores</a></nav>'+liveCityMarkup+body+dataSourceMarkup+faqHtml(faqItems)+
    '</main>'+(cityHub?'<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script src="/city-hub.js" defer></script>':'')+'<script src="/chatbot/chatbot.js" defer></script></body></html>';
}
async function fetchRows(meta){
  const out=[]; let offset=0;
  while(true){
    const u=new URL(SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/'+meta.table);
    u.searchParams.set('select','id,property_id,slug,name,city,area,address,image,images,nearby_coaching,landmark,latitude,longitude,description,status,verified,updated_at,created_at');
    u.searchParams.set('status','eq.active');
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
  // Collapse alias chains to their final destination. Never stop on another
  // redirect stub when a direct canonical target is available.
  for(const [from,initialTo] of [...redirects.entries()]){
    if(!from.startsWith('/sikar/')) continue;
    let target=initialTo;
    const seen=new Set([from]);
    while(!seen.has(target)){
      const targetPath=decodeURIComponent(new URL(target,BASE).pathname.replace(/^\/+/, ''));
      const targetFile=targetPath.endsWith('/')?targetPath+'index.html':(/\.[a-z0-9]+$/i.test(targetPath)?targetPath:targetPath+'/index.html');
      if(expected.has(targetFile)) break;
      const next=redirects.get(target);
      if(!next) break;
      seen.add(target);
      target=next;
    }
    if(seen.has(target)) throw new Error('Cyclic SEO area redirect detected: '+from+' -> '+target);
    redirects.set(from,target);
  }
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
function escapeRegExp(value){return String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function explicitAddressCityMismatch(row){
  const expected=canonicalCityName(row.city),address=String(row.address||'');
  if(!address)return false;
  for(const city of CITY_ALIAS_DATA.canonicalCities||[]){
    if(canonicalCityName(city.name)===expected)continue;
    const aliases=[city.name,...(city.seoAliases||[]),...(city.searchAliases||[])];
    for(const alias of aliases){
      const pattern=new RegExp('(?:^|[,\\s])'+escapeRegExp(alias)+'\\s*,\\s*'+escapeRegExp(city.state)+'(?:\\s|,|$)','i');
      if(pattern.test(address))return true;
    }
  }
  return false;
}
function cityDedupeKey(row){
  const cityName=canonicalCityName(row.city);
  const cityEntry=(CITY_ALIAS_DATA.canonicalCities||[]).find(x=>x.name===cityName)||{};
  const aliases=[cityName,...(cityEntry.seoAliases||[]),...(cityEntry.searchAliases||[])];
  let name=String(row.name||'').trim();
  for(const alias of aliases)name=name.replace(new RegExp('\\s*\\('+escapeRegExp(alias)+'\\)\\s*$','i'),'');
  name=name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  let address=String(row.address||'').toLowerCase().replace(/\b\d{6}\b/g,'');
  for(const alias of aliases)address=address.replace(new RegExp('\\b'+escapeRegExp(alias)+'\\b','gi'),'');
  address=address.replace(/\b(india|rajasthan|karnataka|tamil nadu|bihar|delhi|haryana|maharashtra|gujarat|uttar pradesh)\b/gi,'')
    .replace(/\b(no|number)\.?\s*(?=\d)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  return row.type+'|'+slug(cityName)+'|'+name+'|'+address;
}
function dedupeCityRows(rows){
  const seen=new Set();
  return rows.filter(row=>{
    if(explicitAddressCityMismatch(row))return false;
    if(!row.name||!row.address)return true;
    const keyValue=cityDedupeKey(row);
    const parts=keyValue.split('|');
    if(!parts[2]||!parts[3])return true;
    if(seen.has(keyValue))return false;
    seen.add(keyValue);return true;
  });
}
const cityRows=dedupeCityRows(all);
const areaRedirects=new Map(),areaCounts=new Map(),cityCounts=new Map();
function normalizedAreaKey(value){return key(value).replace(/[,.]+/g,' ').replace(/\s+/g,' ').trim();}
for(const row of cityRows){const citySlug=slug(canonicalCityName(row.city));cityCounts.set(citySlug,(cityCounts.get(citySlug)||0)+1);if(row.area){const areaKey=citySlug+'|'+normalizedAreaKey(row.area);areaCounts.set(areaKey,(areaCounts.get(areaKey)||0)+1);}}
for(const row of cityRows){if(!row.areaRaw)continue;const cityName=canonicalCityName(row.city),citySlug=slug(cityName),cityPath='/'+citySlug+'/',oldAreaSlug=slug(row.areaRaw),newAreaSlug=slug(row.area),count=areaCounts.get(citySlug+'|'+normalizedAreaKey(row.area))||0;if(!oldAreaSlug)continue;const from=cityPath+oldAreaSlug+'/',cityTarget=CITY_HTML_ROOTS.has(citySlug)?'/'+citySlug+'.html':((cityCounts.get(citySlug)||0)>=3?cityPath:'/explore-listings.html');const to=row.area&&newAreaSlug&&count>=3?cityPath+newAreaSlug+'/':cityTarget;if(from!==to)areaRedirects.set(from,to);}
for(const citySlug of CITY_HTML_ROOTS){if(citySlug!=='sikar')areaRedirects.set('/'+citySlug+'/', '/'+citySlug+'.html');}
const cities=new Map();
for(const row of cityRows){
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
  const cityUrl=new URL(CITY_HTML_ROOTS.has(cs)?cs+'.html':cs+'/',BASE).href;
  if(CITY_HTML_ROOTS.has(cs)&&cs!=='sikar'){
    const htmlPath=cs+'.html';
    let cityHtml=await readFile(htmlPath,'utf8');
    if (!cityHtml.includes('<!-- STUDENT_CITY_STATIC_V2 -->')) {
    const pageTitle=limitTitle(titleForCity(c.name,c.rows));
    const pageDescription=metaDescription(descriptionForCity(c));
    const replaceTag=(source,pattern,value)=>source.replace(pattern,()=>value);
    cityHtml=replaceTag(cityHtml,/<title>[\s\S]*?<\/title>/i,'<title>'+esc(pageTitle)+'</title>');
    cityHtml=cityHtml.replace(/(<meta\s+name=["']description["']\s+content=["'])[^"']*(["'][^>]*>)/i,'$1'+esc(pageDescription)+'$2');
    cityHtml=cityHtml.replace(/(<meta\s+property=["']og:title["']\s+content=["'])[^"']*(["'][^>]*>)/i,'$1'+esc(pageTitle)+'$2');
    cityHtml=cityHtml.replace(/(<meta\s+property=["']og:description["']\s+content=["'])[^"']*(["'][^>]*>)/i,'$1'+esc(pageDescription)+'$2');
    cityHtml=cityHtml.replace(/(<meta\s+name=["']twitter:title["']\s+content=["'])[^"']*(["'][^>]*>)/i,'$1'+esc(pageTitle)+'$2');
    cityHtml=cityHtml.replace(/(<meta\s+name=["']twitter:description["']\s+content=["'])[^"']*(["'][^>]*>)/i,'$1'+esc(pageDescription)+'$2');
    cityHtml=cityHtml.replace(/<h1([^>]*)>[\s\S]*?<\/h1>/i,'<h1$1>'+esc(h1ForCity(c))+'</h1>');
    cityHtml=cityHtml.replace(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi,(full,jsonText)=>{
      try{
        const data=JSON.parse(jsonText);
        const nodes=Array.isArray(data['@graph'])?data['@graph']:[data];
        for(const node of nodes){
          const types=Array.isArray(node['@type'])?node['@type']:[node['@type']];
          if(types.includes('CollectionPage')||types.includes('WebPage')){
            node.name=pageTitle;node.description=pageDescription;node.url=cityUrl;
          }
        }
        return '<script type="application/ld+json">'+JSON.stringify(data)+'</script>';
      }catch{return full;}
    });
    await write(htmlPath,cityHtml);
    }
  }
  const groups=new Map();
  for(const r of c.rows){if(!groups.has(r.type))groups.set(r.type,[]);groups.get(r.type).push(r);}
  const eligibleGroups=new Map([...groups.entries()].filter(([,rows])=>rows.length>=LOCATION_MIN_PROPERTIES));
  const categories=[...eligibleGroups.keys()].map(type=>TABLES.find(t=>t.type===type));
  const categoryLinks=categories.map(meta=>'<a href="'+esc(meta.type+'/')+'">'+meta.icon+' '+esc(meta.label)+'</a>').join('');
  const cityCoachingSlugs=[...new Set(c.rows.flatMap(matchedCoachings))];
  const coachingLinks=cityCoachingSlugs.map(s=>{const m=coachingBySlug(s);return '<a href="'+esc('/'+cs+'/'+entitySection(m)+'/'+m.slug+'/')+'">'+entityIcon(m)+' '+esc(m.name)+'</a>';}).join('');
  const coachingSection=coachingLinks?'<section class="section"><h2>Coaching institutes & landmarks in '+esc(c.name)+'</h2><p>Explore student properties connected to coaching institutes and local landmarks through active listing details.</p><div class="links">'+coachingLinks+'</div></section>':'';
  const cityCategoryCards=[...groups.entries()].map(([type,rows])=>{const m=TABLES.find(x=>x.type===type),target=rows.length>=LOCATION_MIN_PROPERTIES?type+'/':'/'+m.finder+'?q='+encodeURIComponent(c.name),countText=rows.length===1?'1 active record':rows.length+' active records',verified=rows.filter(row=>row.verified===true).length,verifiedText=verified===1?'1 marked verified':verified+' marked verified';return '<article class="category-card"><h2>'+m.icon+' '+esc(m.label)+'</h2><p>'+countText+'; '+verifiedText+'.</p><a href="'+esc(target)+'">Explore '+esc(m.label)+' in '+esc(c.name)+' →</a></article>';}).join('');
  const body=cityContentIntro(c)+coachingSection+'<section class="section"><h2>Student-focused listings in '+esc(c.name)+'</h2><div class="grid">'+cityCategoryCards+'</div></section>'+
    '<section class="section"><h2>Explore categories in '+esc(c.name)+'</h2><p>Choose a service category to compare listings available in this city.</p><div class="links">'+categoryLinks+'</div></section>'+
    '<section class="section"><h2>Student listings across '+esc(c.name)+'</h2><p>Open a listing to review its address, facilities and service information. Confirm details with the provider before visiting.</p><div class="grid">'+c.rows.slice(0,120).map(r=>card(r,1)).join('')+'</div></section>';
  // Sikar's primary city guide lives at /sikar.html. Do not recreate the
  // older /sikar/ city index; nested category, area and coaching pages remain.
  if (!CITY_HTML_ROOTS.has(cs)) {
    const cityPath=cityDir+'/index.html'; expected.add(cityPath); generated.push(cityUrl);
    await write(cityPath,shell({title:titleForCity(c.name,c.rows),description:descriptionForCity(c),canonical:cityUrl,h1:h1ForCity(c),crumbs:[{name:'Home',url:BASE},{name:c.name,url:cityUrl}],body,depth:1,about:[{'@type':'City','name':c.name,'containedInPlace':{'@type':'State','name':stateForCity(c.name,c.rows)}}],itemRows:c.rows,faqItems:faqForCity(c),cityHub:true}));
  }

  for(const meta of TABLES){
    const rows=c.rows.filter(r=>r.type===meta.type); if(rows.length<LOCATION_MIN_PROPERTIES) continue;
    const dir=cityDir+'/'+meta.type; const url=new URL(cs+'/'+meta.type+'/',BASE).href;
    const relatedCoachings=[...new Set(rows.flatMap(matchedCoachings))];
    const relatedCoachingLinks=relatedCoachings.map(s=>{const m=coachingBySlug(s);return '<a href="'+esc('../'+entitySection(m)+'/'+m.slug+'/')+'">'+entityIcon(m)+' '+esc(m.name)+'</a>';}).join('');
    const coachingContext=relatedCoachingLinks?'<section class="section"><h2>Nearby coaching & landmarks</h2><div class="links">'+relatedCoachingLinks+'</div></section>':'';
    const body='<section class="section"><h2>'+esc(meta.label)+' in '+esc(c.name)+'</h2><div class="grid">'+rows.map(r=>card(r,2)).join('')+'</div></section>'+coachingContext+
      '<section class="section"><a href="'+esc(rel(2,cityUrl))+'">← Back to '+esc(c.name)+'</a> · <a href="'+esc(rel(2,new URL(meta.finder,BASE).href))+'">Open '+esc(meta.label)+' Finder</a></section>';
    const p=dir+'/index.html'; expected.add(p); generated.push(url);
    await write(p,shell({title:titleForCategory(meta,c.name),description:'Browse '+rows.length+' active '+meta.label.toLowerCase()+' in '+c.name+'. Verification status is shown on each listing. Compare locations and available service details on StudentHubHelp.',canonical:url,h1:meta.label+' in '+c.name,crumbs:[{name:c.name,url:cityUrl},{name:meta.label,url}],body,depth:3,about:[{'@type':'City','name':c.name},{'@type':'Thing','name':meta.label}],itemRows:rows,faqItems:faqForCategory(meta,c,rows)}));
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
    const areaCoachingSection=areaCoachingLinks?'<section class="section"><h2>Nearby coaching & landmarks</h2><p>Coaching and landmark links are derived from names found in active listing details, including nearby-coaching and landmark fields.</p><div class="links">'+areaCoachingLinks+'</div></section>':'';
    const body='<section class="section"><h2>Active student properties in '+esc(a.name)+', '+esc(c.name)+'</h2><div class="grid">'+a.rows.map(r=>card(r,2)).join('')+'</div></section>'+areaCoachingSection+
      '<section class="section"><h2>Categories</h2><div class="links">'+groupLinks+'</div></section>'+
      '<p><a href="'+esc(rel(2,cityUrl))+'">← Back to '+esc(c.name)+'</a></p>';
    const p=dir+'/index.html'; expected.add(p); generated.push(url);
    await write(p,shell({title:titleForArea(a.name,c.name,a.rows,areaCoachingSlugs.length>0),description:'Browse '+a.rows.length+' active student listings around '+a.name+', '+c.name+'. Compare available categories and open each listing for location and service details.',canonical:url,h1:'Student Properties in '+a.name+', '+c.name,crumbs:[{name:c.name,url:cityUrl},{name:a.name,url}],body,depth:3,about:[{'@type':'Place','name':a.name,'containedInPlace':{'@type':'City','name':c.name}}],itemRows:a.rows,faqItems:faqForArea(a,c)}));
  }

  for(const coachSlug of cityCoachingSlugs){
    const coach=coachingBySlug(coachSlug); if(!coach) continue;
    const rows=c.rows.filter(r=>matchedCoachings(r).includes(coachSlug)); if(rows.length<LOCATION_MIN_PROPERTIES) continue;
    const section=entitySection(coach);
    const dir=cityDir+'/'+section+'/'+coach.slug;
    const url=new URL(cs+'/'+section+'/'+coach.slug+'/',BASE).href;
    const typeLinks=[...new Set(rows.map(r=>r.type))].map(type=>{const m=TABLES.find(x=>x.type===type);return '<a href="'+esc('/'+m.finder)+'">'+m.icon+' '+esc(m.label)+'</a>';}).join('');
    const body='<section class="section"><h2>Student properties near '+esc(coach.name)+' in '+esc(c.name)+'</h2><p>These active listings mention this location in their name, area, address or nearby-landmark details. Listing-provided distances are not independently verified; confirm the exact route before visiting.</p><div class="grid">'+rows.map(r=>card(r,3)).join('')+'</div></section><section class="section"><h2>Categories</h2><div class="links">'+typeLinks+'</div></section><p><a href="'+esc(rel(3,cityUrl))+'">← Back to '+esc(c.name)+'</a></p>';
    const p=dir+'/index.html'; expected.add(p); generated.push(url);
    await write(p,shell({title:titleForCoaching(coach,c.name),description:'Find student listings linked to '+coach.name+' in '+c.name+'. Check each listing for its location details and confirm exact distance before visiting.',canonical:url,h1:'Student Properties near '+coach.name+' in '+c.name,crumbs:[{name:c.name,url:cityUrl},{name:coach.name,url}],body,depth:3,about:[{'@type':entitySchemaType(coach),'name':coach.name},{'@type':'City','name':c.name}],itemRows:rows,faqItems:faqForCoaching(coach,c,rows)}));
  }
}


/* Keep the legacy /sikar.html city guide useful to crawlers before client-side hydration.
   Refresh its marked static blocks from active public listings. Verification labels
   are rendered per record; no database writes are performed. */
const sikarCity = cities.get('sikar');
const existingSikarPage = await readFile('sikar.html', 'utf8').catch(() => '');
if (sikarCity && !existingSikarPage.includes('<!-- STUDENT_CITY_STATIC_V2 -->')) {
  const replaceStaticBlock = (html, name, value) => {
    const start = '<!-- SIKAR_STATIC_' + name + '_START -->';
    const end = '<!-- SIKAR_STATIC_' + name + '_END -->';
    if (!html.includes(start) || !html.includes(end)) {
      throw new Error('Missing Sikar static content markers for ' + name + ' in sikar.html');
    }
    const from = html.indexOf(start) + start.length;
    const to = html.indexOf(end, from);
    if (to < from) throw new Error('Invalid Sikar static content marker order for ' + name);
    return html.slice(0, from) + value + html.slice(to);
  };
  let sikarHtml = await readFile('sikar.html', 'utf8');
  const latestSikarUpdate = sikarCity.rows
    .map(row => row.updated_at || row.created_at || '')
    .filter(Boolean).sort().at(-1);
  const updatedLabel = latestSikarUpdate
    ? new Date(latestSikarUpdate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Current directory';
  const sikarAreas = new Map();
  for (const row of sikarCity.rows) {
    if (!row.area) continue;
    const areaKey = key(row.area);
    if (!sikarAreas.has(areaKey)) sikarAreas.set(areaKey, { name: row.area, rows: [] });
    sikarAreas.get(areaKey).rows.push(row);
  }
  const areaEntries = [...sikarAreas.values()]
    .filter(area => area.rows.length >= LOCATION_MIN_PROPERTIES)
    .sort((a, b) => b.rows.length - a.rows.length || a.name.localeCompare(b.name));
  const staticStats = [
    '<div class="stat"><b>' + sikarCity.rows.length + '</b><span>Active listings</span></div>',
    '<div class="stat"><b>' + new Set(sikarCity.rows.map(row => row.type)).size + '</b><span>Service categories</span></div>',
    '<div class="stat"><b>' + areaEntries.length + '</b><span>Area guides</span></div>',
    '<div class="stat"><b>' + esc(updatedLabel) + '</b><span>Latest listing update</span></div>'
  ].join('');
  const staticAreas = areaEntries.map(area =>
    '<a class="area-card" href="/sikar/' + esc(slug(area.name)) + '/"><span>📍</span><div><strong>' +
    esc(area.name) + '</strong><small>' + area.rows.length + ' active listings · Open area guide →</small></div></a>'
  ).join('');
  const staticRows = [];
  const staticCategories = TABLES.map(meta => {
    const rows = sikarCity.rows.filter(row => row.type === meta.type)
      .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')) || String(a.name || '').localeCompare(String(b.name || '')));
    if (!rows.length) return '';
    staticRows.push(...rows.slice(0, 3));
    const cards = rows.slice(0, 3).map(row => {
      const href = propUrl(row);
      const place = [row.area, row.city].filter(Boolean).join(', ') || row.address || 'Sikar';
      return '<a class="listing" href="' + esc(href) + '"><span class="listing-body"><span class="listing-title"><strong>' +
        esc(row.name || 'Student listing') + '</strong>' + (row.verified===true?'<span class="verified-tag">✓ Verified</span>':'<span class="verified-tag">Active</span>') + '</span><span class="listing-location">📍 ' +
        esc(place) + '</span><span class="listing-bottom"><b>View Details</b><span>→</span></span></span></a>';
    }).join('');
    const categoryPath = meta.type === 'hostel' ? 'hostel' : meta.type;
    return '<section class="service-block"><div class="service-head"><div><span class="service-icon">' + meta.icon +
      '</span><div><small>SIKAR LIVE DIRECTORY</small><h2>' + esc(meta.label) + ' in Sikar</h2></div></div><a href="/sikar/'
      categoryPath + '/">Explore all →</a></div><p class="section-copy">Browse ' + rows.length + ' active listings in the StudentHubHelp directory; ' + rows.filter(row=>row.verified===true).length + ' are marked verified. Open a listing to review its supplied location and service details, then confirm current availability and terms directly with the provider.</p><div class="listing-grid">' +
      cards + '</div><p class="finder-link"><a href="/' + esc(meta.finder) + '?q=Sikar">Search all ' + esc(meta.label.toLowerCase()) + ' in Sikar →</a></p></section>';
  }).join('');
  const areaNames = areaEntries.slice(0, 5).map(area => area.name);
  const areaSummary = areaNames.length ? areaNames.join(', ') : 'the Sikar city directory';
  const staticQuickAnswer = '<p>StudentHubHelp currently lists ' + sikarCity.rows.length +
    ' active listings across ' + new Set(sikarCity.rows.map(row => row.type)).size +
    ' student-service categories in Sikar. Area guides include ' + esc(areaSummary) +
    '. Open a listing for its supplied details and confirm current availability directly with the provider.</p>';
  sikarHtml = replaceStaticBlock(sikarHtml, 'STATS', staticStats);
  sikarHtml = replaceStaticBlock(sikarHtml, 'AREAS', staticAreas);
  sikarHtml = replaceStaticBlock(sikarHtml, 'LISTINGS', staticCategories);
  sikarHtml = replaceStaticBlock(sikarHtml, 'QUICK_ANSWER', staticQuickAnswer);
  sikarHtml = replaceStaticBlock(sikarHtml, 'PRICE_DATE', 'Directory data checked: ' + esc(updatedLabel) + '.');
  const schemaBlock = sikarHtml.match(/<!-- SIKAR_STATIC_SCHEMA_START -->([\s\S]*?)<!-- SIKAR_STATIC_SCHEMA_END -->/);
  const schemaScript = schemaBlock?.[1]?.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!schemaBlock || !schemaScript) throw new Error('Could not locate Sikar structured data block');
  const sikarSchema = JSON.parse(schemaScript[1]);
  const schemaGraph = Array.isArray(sikarSchema['@graph']) ? sikarSchema['@graph'] : [];
  const listingSchema = schemaGraph.find(node => node['@type'] === 'ItemList');
  if (!listingSchema) throw new Error('Sikar ItemList schema is missing');
  listingSchema.numberOfItems = staticRows.length;
  listingSchema.itemListElement = staticRows.map((row, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: { '@type': 'Thing', name: row.name || 'Student listing', url: propUrl(row) }
  }));
  sikarHtml = replaceStaticBlock(sikarHtml, 'SCHEMA', '<script type="application/ld+json">' + JSON.stringify(sikarSchema) + '</script>');
  await write('sikar.html', sikarHtml);
}

const redirectPages=await writeAreaRedirects(areaRedirects,expected);
const redirectUrls=new Set(redirectPages.filter(item=>item.from.startsWith('/sikar/')).map(item=>new URL(item.from,BASE).href));
const uniqueGenerated=[...new Set(generated)].filter(url=>!redirectUrls.has(url));
await write('seo-generated-manifest.json', JSON.stringify({generated: uniqueGenerated, expected:[...expected], areaRedirects:[...areaRedirects].map(([from,to])=>({from,to})), redirectPages}, null, 2)+'\n');
console.log(JSON.stringify({activeProperties:all.length,cities:cities.size,generatedPages:generated.length,locationThreshold:LOCATION_MIN_PROPERTIES},null,2));
