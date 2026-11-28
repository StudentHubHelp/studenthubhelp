import { mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { buildListingSelect, normalizeListingRecord } from './seo-listing-data.mjs';
import { decidePageState, pageStateKey, parentPath } from './seo-page-eligibility.mjs';

const BASE = (process.env.BASE_URL || 'https://studenthubhelp.in/').replace(/\/+$/, '') + '/';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const LOCATION_MIN_PROPERTIES = Number(process.env.SEO_LOCATION_MIN_PROPERTIES || 3);
// These city guides already have approved .html URLs; keep one canonical root per city.
const CITY_HTML_ROOTS = new Set(['sikar','bengaluru','chennai','kota','delhi','patna','jhunjhunu','pune','gurugram','coimbatore','jaipur','lucknow','ahmedabad','hyderabad']);

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
const SEO_AREA_PROFILES = JSON.parse(await readFile('data/seo-area-profiles.json', 'utf8').catch(() => '{"profiles":[]}'));
const PREVIOUS_PAGE_STATE = JSON.parse(await readFile('data/seo-page-state.json', 'utf8').catch(() => '{"version":1,"pages":{}}'));
const PREVIOUS_SEO_MANIFEST = JSON.parse(await readFile('seo-generated-manifest.json', 'utf8').catch(() => '{"expected":[]}'));
const NEXT_PAGE_STATE = { version:1, generatedAt:new Date().toISOString(), pages:{ ...(PREVIOUS_PAGE_STATE.pages || {}) } };
const PENDING_ELIGIBILITY_REDIRECTS = new Map();
const PAGE_DECISION_CACHE = new Map();
const ROOT_CITY_REDIRECTS = [];
const SEO_RUN_NOW = new Date();
const AREA_PROFILE_MAP = new Map((SEO_AREA_PROFILES.profiles || []).map(profile => [profile.citySlug+'|'+profile.areaSlug, profile]));
function getAreaProfile(citySlug, areaName) { return AREA_PROFILE_MAP.get(citySlug+'|'+slug(areaName)) || null; }
function decideAndStorePage(identity, metrics, relativePath, assumePreviouslyIndexed=false) {
  const stateKey = pageStateKey(identity);
  if(PAGE_DECISION_CACHE.has(stateKey)) return PAGE_DECISION_CACHE.get(stateKey);
  const manifestPath = './' + relativePath.replace(/^\.\//,'');
  const manifestIndexed = (PREVIOUS_SEO_MANIFEST.expected || []).includes(manifestPath);
  const previous = NEXT_PAGE_STATE.pages[stateKey] || ((manifestIndexed || assumePreviouslyIndexed) ? { status:'index', everIndexed:true } : null);
  const decision = decidePageState({ ...metrics, type:identity.type, previousState:previous, now:SEO_RUN_NOW });
  NEXT_PAGE_STATE.pages[stateKey] = {
    ...decision,
    everIndexed: decision.status === 'index' || decision.status === 'noindex-grace' || decision.status === 'redirect' || previous?.everIndexed === true,
    parent: parentPath(identity),
    path:relativePath,
    evaluatedAt:SEO_RUN_NOW.toISOString()
  };
  PAGE_DECISION_CACHE.set(stateKey,decision);
  return decision;
}
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
const VERIFIED_LANDMARKS = JSON.parse(await readFile('data/verified-landmarks.json', 'utf8'));
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
    'patna':'Bihar','lucknow':'Uttar Pradesh','ahmedabad':'Gujarat','hyderabad':'Telangana','delhi':'Delhi','new delhi':'Delhi','gurugram':'Haryana','panchkula':'Haryana','sonipat':'Haryana','pune':'Maharashtra','vadodara':'Gujarat'
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
  const singular={hostel:'Hostels & PGs',tiffin:'Tiffin Services',library:'Libraries & Study Rooms',cafe:'Cafes for Students',bookstore:'Bookstores'}[meta.type]||meta.label;
  return singular+' in '+city+' for Students | StudentHubHelp';
}
function titleForArea(area, city, rows, hasCoaching){
  const types=new Set(rows.map(row=>row.type));
  const names=[];
  if(types.has('hostel')) names.push('Hostels & PGs');
  if(types.has('library')) names.push('Libraries');
  if(types.has('tiffin')) names.push('Tiffin Services');
  if(types.has('cafe')) names.push('Cafes');
  if(types.has('bookstore')) names.push('Bookstores');
  const category=names.slice(0,2).join(' & ')||'Student Services';
  return 'Student Services in '+area+', '+city+' | StudentHubHelp';
}
function titleForCoaching(coach,city){
  return 'Student Listings Near '+label(coach.name)+' in '+city+' | StudentHubHelp';
}
function card(row,depth,options={}){
  const href=rel(depth,propUrl(row));
  const bits=[row.area,row.city,row.address].filter(Boolean);
  const banner=rel(depth,new URL(CATEGORY_BANNERS[row.type]||'/hostel-banner.png',BASE).href);
  const image=firstImageUrl(row)||banner;
  const status=row.verified===true?'<span class="badge">✓ Verified</span>':'<span class="badge">Active · Details Provided</span>';
  const details=options.details?[
    row.timing?'<p><strong>Timing:</strong> '+esc(row.timing)+'</p>':'',
    row.phone?'<p><strong>Phone:</strong> <a href="tel:'+esc(String(row.phone).replace(/[^+0-9]/g,''))+'">'+esc(row.phone)+'</a></p>':'',
    row.facilities?'<p><strong>Facilities:</strong> '+esc(row.facilities)+'</p>':''
  ].join(''):'';
  return '<article class="property-card"><a class="property-card-image" href="'+esc(href)+'"><img src="'+esc(image)+'" alt="'+esc((row.name||'Student property')+' listing image')+'" loading="lazy" decoding="async"></a><h3><a href="'+esc(href)+'">'+esc(row.name||'Student property')+'</a></h3>'+
    (bits.length?'<p>📍 '+esc(bits.join(' • '))+'</p>':'')+details+
    '<p>'+status+'</p><p><a href="'+esc(href)+'">View Details →</a></p></article>';
}
function categoryNames(rows){return [...new Set(rows.map(row=>TABLES.find(item=>item.type===row.type)?.label||row.type))].filter(Boolean);}
function cityQuickAnswer(city){
  const cats=categoryNames(city.rows);
  const verified=city.rows.filter(row=>row.verified===true).length;
  const profile=citySeoProfile(city);
  const topAreas=profile.topAreas.slice(0,2);
  return '<section class="section quick-answer" aria-label="Quick answer"><h2>Quick answer</h2><p>StudentHubHelp lists '+city.rows.length+' active student-service records in '+esc(city.name)+', across '+esc(cats.slice(0,3).join(', '))+'. '+verified+' are marked verified in saved directory data. Explore '+esc(topAreas.join(' and ')||'the listed localities')+', compare provider details and open each View Details page. Confirm current availability, charges and exact route directly with the provider.</p></section>';
}
function faqForCity(city){
  const cats=categoryNames(city.rows),verified=city.rows.filter(row=>row.verified===true).length,listingText=city.rows.length===1?'1 active listing':city.rows.length+' active listings';
  const profile=citySeoProfile(city);
  const facilities=[...new Set(city.rows.flatMap(row=>String(row.facilities||'').split(/[,;|]/).map(label).filter(Boolean)))].slice(0,5);
  const timings=city.rows.filter(row=>row.timing||row.timings).length;
  const fees=areaFeeSummary({rows:city.rows}).slice(0,2);
  return [
    {question:'What student services can I find in '+city.name+'?',answer:'The current StudentHubHelp directory shows '+listingText+' across '+cats.join(', ')+' in '+city.name+'. '+verified+(verified===1?' listing is':' listings are')+' marked verified in the source records.'},
    {question:'Which areas have the most listed student services?',answer:profile.topAreas.length?'The highest listing counts in the current directory are recorded in '+profile.topAreas.join(', ')+'. These are record counts, not a ranking of quality or verified travel proximity.':'Area names are not consistently available in the active records; check each listing address.'},
    {question:'How can I find services near a coaching institute or landmark in '+city.name+'?',answer:'Search the institute or landmark name in Global Search. Matches use location details stored with listings; confirm the exact route and current availability with the provider before visiting.'},
    {question:'Which facilities and timings are available?',answer:facilities.length?'Provider records mention '+facilities.join(', ')+'. '+timings+' listings include timing information; check each listing because services vary.':'Facilities and operating hours are not consistently supplied in the saved records. Confirm the details directly with each provider.'},
    {question:'Are prices or fees published?',answer:fees.length?fees.join('; ')+'. These are provider-supplied values; confirm billing period, inclusions and current charges directly.':'Published price and fee fields are not consistently available. Contact providers for current charges.'},
    {question:'Are the listings guaranteed to be available?',answer:'Active status reflects the latest listing status available when this page was generated. Availability and service details can change, so reconfirm directly with the provider.'}
  ];
}
function categoryQuickAnswer(meta,city,rows){
  const verified=rows.filter(row=>row.verified===true).length;
  return '<section class="section quick-answer" aria-label="Quick answer"><h2>Quick answer</h2><p>StudentHubHelp lists '+rows.length+' active '+esc(meta.label.toLowerCase())+' records in '+esc(city.name)+'. '+verified+' are marked verified in saved directory data. Compare provider-supplied addresses, facilities and timings on each card. Open View Details for full information, and confirm current prices, availability, terms and exact routes directly with the provider before visiting or paying.</p></section>';
}
function areaFallbackSections(meta,city,rows,citySlug){
  const grouped=new Map();
  for(const row of rows){if(!row.area)continue;const name=label(row.area),areaSlug=slug(name);if(!areaSlug)continue;if(!grouped.has(areaSlug))grouped.set(areaSlug,{name,rows:[]});grouped.get(areaSlug).rows.push(row);}
  const sections=[...grouped.entries()].sort((a,b)=>b[1].rows.length-a[1].rows.length||a[1].name.localeCompare(b[1].name)).map(([areaSlug,area])=>{
    const profile=getAreaProfile(citySlug,area.name);
    const decision=decideAndStorePage(
      {type:'areaCategory',citySlug,categorySlug:meta.type,areaSlug},
      {listingCount:area.rows.length,verifiedCount:area.rows.filter(row=>row.verified===true).length,profileComplete:profile?.profileComplete===true && PAGE_DECISION_CACHE.get(pageStateKey({type:'cityCategory',citySlug,categorySlug:meta.type}))?.linkable===true},
      citySlug+'/'+meta.type+'/'+areaSlug+'/index.html'
    );
    if(decision.status==='redirect') PENDING_ELIGIBILITY_REDIRECTS.set('/'+citySlug+'/'+meta.type+'/'+areaSlug+'/',parentPath({type:'areaCategory',citySlug,categorySlug:meta.type}));
    if(decision.linkable){
      const url=rel(2,new URL(citySlug+'/'+meta.type+'/'+areaSlug+'/',BASE).href);
      return '<section class="section area-category-link"><h3>'+esc(area.name)+'</h3><p>'+area.rows.length+' active '+esc(meta.label.toLowerCase())+' records in this area.</p><p><a href="'+esc(url)+'">Open '+esc(meta.label)+' guide for '+esc(area.name)+' →</a></p></section>';
    }
    return '<section class="section area-fallback"><h3>'+esc(meta.label)+' in '+esc(area.name)+'</h3><p>'+area.rows.length+' active records are included here; a separate area page is not currently eligible for indexing.</p><div class="grid">'+area.rows.map(row=>card(row,2)).join('')+'</div></section>';
  });
  return sections.length?'<section class="section area-wise-listings"><h2>Area-wise '+esc(meta.label)+' listings in '+esc(city.name)+'</h2>'+sections.join('')+'</section>':'';
}
function categoryIntro(meta,city,rows){
  const areaCounts=new Map();
  for(const row of rows){if(!row.area)continue;const name=label(row.area);areaCounts.set(name,(areaCounts.get(name)||0)+1);}
  const areas=[...areaCounts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,3);
  const coaching=[...new Set(rows.flatMap(matchedCoachings))].map(coachSlug=>coachingBySlug(coachSlug)?.name).filter(Boolean).slice(0,3);
  const facilities=[...new Set(rows.flatMap(row=>String(row.facilities||'').split(/[,;|]/).map(label).filter(value=>value&&value.length<=48&&value.split(/\s+/).length<=6)))].slice(0,4);
  const timings=[...new Set(rows.map(row=>label(row.timing||row.timings)).filter(value=>value&&value.length<=36))].slice(0,2);
  const feeSummary=areaFeeSummary({rows}).slice(0,2);
  const verifiedLandmarks=verifiedLandmarksForArea({name:meta.label,rows},city);
  const verified=rows.filter(row=>row.verified===true).length;
  const areaText=areas.length?areas.map(([name,count])=>name+' ('+count+')').join(', '):'locality details are not consistently supplied';
  const coachingText=coaching.length?'Listing text mentions '+coaching.join(', ')+'. These are name or address matches, not proof of distance.':'No coaching-institute name match is recorded in this category data.';
  const facilityText=facilities.length?'Short facility details include '+facilities.join(', ')+'.':'Some providers supply longer facility descriptions; review each listing card for those details.';
  const timingText=timings.length?'Available timing examples include '+timings.join(' and ')+'.':'Operating hours are not consistently supplied across the records.';
  const feeText=feeSummary.length?'Some provider records include '+feeSummary.join('; ')+'. Confirm the billing period, deposit, inclusions and current amount directly.':'No usable published price or fee value is present in these category records; contact providers for current charges.';
  const landmarkText=verifiedLandmarks.length?'Verified landmarks near the geocoded listing centroid include '+verifiedLandmarks.map(item=>item.name).join(', ')+'. Approximate straight-line distances are shown below, not road distances.':'No verified landmark coordinates fall within 8 km of this category’s geocoded listing centroid, so no proximity distance is claimed.';
  const guidance={
    hostel:'For hostels and PGs, compare room type, sharing, food arrangement, facilities and house rules.',
    tiffin:'For tiffin services, compare meal type, plan duration, delivery coverage and meal timings.',
    library:'For libraries, compare access hours, seating, study facilities and published fees.',
    cafe:'For cafes, check opening hours, seating and services listed by the provider.',
    bookstore:'For bookstores, check book categories, exam stock, stationery and availability.'
  }[meta.type]||'Review the provider-supplied location and service details.';
  return '<section class="section area-overview category-overview"><h2>About '+esc(meta.label)+' in '+esc(city.name)+'</h2>'+
    '<p>StudentHubHelp currently shows '+rows.length+' active '+esc(meta.label.toLowerCase())+' records in '+esc(city.name)+'. '+verified+' records are marked verified in the saved directory data. Localities represented include '+esc(areaText)+'. These counts reflect the active directory snapshot when this page was generated, not live availability or complete market coverage.</p>'+
    '<p>'+esc(coachingText)+' '+esc(facilityText)+' Provider-supplied details appear on individual cards where available; missing fields are omitted rather than estimated.</p>'+
    '<p>'+esc(timingText)+' '+esc(feeText)+'</p>'+
    '<p>'+esc(landmarkText)+'</p>'+
    '<h3>What to compare before choosing</h3><p>'+esc(guidance)+' Check the exact address, total cost, terms and current availability directly with the provider. Use the listing map link to assess your route before travelling.</p></section>';
}
function faqForCategory(meta,city,rows){
  const verified=rows.filter(row=>row.verified===true).length;
  const facilities=[...new Set(rows.flatMap(row=>String(row.facilities||'').split(/[,;|]/).map(label).filter(value=>value&&value.length<=48&&value.split(/\s+/).length<=6)))].slice(0,5);
  const timings=rows.filter(row=>row.timing||row.timings).length;
  const fees=areaFeeSummary({rows}).slice(0,2);
  const landmarks=verifiedLandmarksForArea({name:meta.label,rows},city);
  return [
    {question:'How many '+meta.label.toLowerCase()+' listings are shown in '+city.name+'?',answer:'The current directory shows '+rows.length+' active '+meta.label.toLowerCase()+' records in '+city.name+', including '+verified+' marked verified.'},
    {question:'Which localities are represented?',answer:'The locality names and counts shown in the page introduction come from the active listing records. Confirm the exact address on each individual listing before travelling.'},
    {question:'Which facilities and timings are available?',answer:facilities.length?'Provider records mention '+facilities.join(', ')+'. '+timings+' listings include timing information. Details vary by provider, so review each card.':'Facilities and timings are not consistently supplied; contact the provider to confirm the details you need.'},
    {question:'Are prices or fees published?',answer:fees.length?fees.join('; ')+'. These are provider-supplied values; confirm the billing period, deposit and current amount directly.':'No usable published price or fee value is present in these category records. Contact providers for current charges.'},
    {question:'Are nearby landmark distances verified?',answer:landmarks.length?landmarks.map(item=>item.name+' ('+item.distanceKm.toFixed(1)+' km straight-line)').join(', ')+'. Distances are approximate from the listing-coordinate centroid, not road distances.':'No verified landmark coordinates fall within 8 km of the geocoded listing centroid, so no distance claim is made.'},
    {question:'What should I check before choosing a listing?',answer:'Compare the exact location, facilities, timings, total cost, terms and contact details shown on the individual listing. Confirm current availability and route directly with the provider.'}
  ];
}
function areaLandmarkMatches(area){
  return [...new Set(area.rows.flatMap(matchedCoachings))]
    .map(slug=>coachingBySlug(slug))
    .filter(Boolean);
}
function areaCentroid(area){
  const points=area.rows.filter(row=>Number.isFinite(Number(row.latitude))&&Number.isFinite(Number(row.longitude))&&row.latitude!==null&&row.longitude!==null);
  if(!points.length)return null;
  return {latitude:points.reduce((sum,row)=>sum+Number(row.latitude),0)/points.length,longitude:points.reduce((sum,row)=>sum+Number(row.longitude),0)/points.length};
}
function straightLineKm(a,b){
  const rad=value=>value*Math.PI/180,earth=6371;
  const dLat=rad(Number(b.latitude)-Number(a.latitude)),dLon=rad(Number(b.longitude)-Number(a.longitude));
  const x=Math.sin(dLat/2)**2+Math.cos(rad(Number(a.latitude)))*Math.cos(rad(Number(b.latitude)))*Math.sin(dLon/2)**2;
  return 2*earth*Math.asin(Math.sqrt(x));
}
function verifiedLandmarksForArea(area,city){
  const center=areaCentroid(area);
  if(!center)return [];
  return VERIFIED_LANDMARKS.filter(item=>item.verified===true&&key(item.city)===key(city.name)&&Number.isFinite(Number(item.latitude))&&Number.isFinite(Number(item.longitude)))
    .map(item=>({...item,distanceKm:straightLineKm(center,item)}))
    .filter(item=>item.distanceKm<=8)
    .sort((a,b)=>a.distanceKm-b.distanceKm)
    .slice(0,5);
}
function feeValueForRow(row){
  const fields={
    hostel:[['monthly_rent_range','monthly rent range'],['monthly_rent','monthly rent'],['monthly_fee','monthly fee'],['price','published price']],
    tiffin:[['monthly_fee','monthly fee'],['price','published price']],
    library:[['monthly_fee','monthly fee'],['daily_fee','daily fee'],['price','published price']],
    cafe:[['price_range','price range'],['price','published price']],
    bookstore:[['price','published price']]
  }[row.type]||[];
  const found=fields.find(([field])=>row[field]!==null&&row[field]!==undefined&&String(row[field]).trim()!=='');
  if(!found)return null;
  const raw=row[found[0]];
  const formatted=typeof raw==='number'||/^\d+(?:\.\d+)?$/.test(String(raw).trim())
    ? '₹'+new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(Number(raw))
    : (/^\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?$/.test(String(raw).trim())?'₹'+String(raw).trim():String(raw).trim());
  return {type:row.type,label:found[1],value:formatted};
}
function areaFeeSummary(area){
  const grouped=new Map();
  for(const row of area.rows){
    const fee=feeValueForRow(row);
    if(!fee)continue;
    const meta=TABLES.find(item=>item.type===fee.type);
    const keyValue=fee.type+'|'+fee.label;
    if(!grouped.has(keyValue))grouped.set(keyValue,{category:meta?.label||fee.type,label:fee.label,values:new Set()});
    grouped.get(keyValue).values.add(fee.value);
  }
  return [...grouped.values()].slice(0,3).map(item=>item.category+' — '+item.label+': '+[...item.values].slice(0,2).join(', '));
}
function areaQuickAnswer(area,city){
  const counts=new Map();
  for(const row of area.rows) counts.set(row.type,(counts.get(row.type)||0)+1);
  const categorySummary=TABLES.filter(meta=>counts.has(meta.type)).slice(0,2).map(meta=>counts.get(meta.type)+' '+meta.label.toLowerCase()).join(', ');
  const verified=area.rows.filter(row=>row.verified===true).length;
  return '<section class="section quick-answer" aria-label="Quick answer"><h2>Quick answer</h2><p>StudentHubHelp lists '+area.rows.length+' active student-service records around '+esc(area.name)+', '+esc(city.name)+': '+esc(categorySummary)+'. '+verified+' records are marked verified in saved directory data. Compare each provider’s address, facilities and timings, then confirm current price, availability and route directly with the provider before visiting.</p></section>';
}
function areaContentIntro(area,city){
  const counts=new Map();
  for(const row of area.rows)counts.set(row.type,(counts.get(row.type)||0)+1);
  const categories=TABLES.filter(meta=>counts.has(meta.type)).map(meta=>meta.label+' ('+counts.get(meta.type)+')');
  const names=[...new Set(area.rows.map(row=>label(row.name)).filter(Boolean))].slice(0,2);
  const facilities=[...new Set(area.rows.flatMap(row=>String(row.facilities||'').split(/[,;|]/).map(label).filter(value=>value&&value.length<=48&&value.split(/\s+/).length<=6)))].slice(0,3);
  const timings=[...new Set(area.rows.map(row=>label(row.timing||row.timings)).filter(value=>value&&value.length<=36))].slice(0,1);
  const verifiedLandmarks=verifiedLandmarksForArea(area,city);
  const feeSummary=areaFeeSummary(area).slice(0,2);
  const verified=area.rows.filter(row=>row.verified===true).length;
  const guidance={
    hostel:'For hostels and PGs, compare room type, sharing, included food, facilities and house rules.',
    tiffin:'For tiffin services, compare meal type, plan duration, delivery coverage and meal timings.',
    library:'For libraries, compare access hours, seating, study facilities and published fees.',
    cafe:'For cafes, check opening hours, seating and the services actually listed by the provider.',
    bookstore:'For bookstores, check book categories, exam stock, stationery and availability.'
  };
  const advice=[...new Set(area.rows.map(row=>guidance[row.type]).filter(Boolean))].slice(0,2).join(' ');
  const nameText=names.length?'Examples in the current records include '+names.join(', ')+'.':'Individual provider names are shown in the listing cards below.';
  const facilityText=facilities.length?'Short facility details in the records include '+facilities.join(', ')+'.':'Some providers supply longer facility descriptions; review the individual cards for those details.';
  const timingText=timings.length?'Available timing examples include '+timings.join(' and ')+'.':'Operating hours are not consistently supplied across these records.';
  const feeText=feeSummary.length?'Published price or fee fields in some records show '+feeSummary.join('; ')+'.':'The active records for this locality do not contain a usable published price or fee value.';
  const feeCaveat=feeSummary.length?' These amounts are provider-supplied; confirm billing period, deposit, inclusions and current charges directly before deciding.':' Contact providers to confirm current charges and what is included.';
  const landmarkText=verifiedLandmarks.length
    ?'Verified nearby landmarks include '+verifiedLandmarks.map(item=>item.name).join(', ')+'. The table shows approximate straight-line distances from the centroid of geocoded listings, not road distances or travel times.'
    :'No verified landmark coordinates fall within 8 km of the geocoded listing centroid, so this page makes no landmark-distance claim.';
  return '<section class="section area-overview"><h2>About student services in '+esc(area.name)+', '+esc(city.name)+'</h2>'+
    '<p>The StudentHubHelp directory currently contains '+area.rows.length+' active listing records associated with '+esc(area.name)+', '+esc(city.name)+'. They cover '+esc(categories.join(', '))+'. '+verified+' records are marked verified in the saved directory data. Counts reflect the directory snapshot when this page was generated, not live availability.</p>'+
    '<p>'+esc(nameText)+' Provider records supply addresses, phone numbers and service details where available; missing fields are omitted rather than estimated. '+esc(facilityText)+'</p>'+
    '<p>'+esc(timingText)+' '+esc(feeText+feeCaveat)+'</p>'+
    '<p>'+esc(landmarkText)+' Where listing coordinates are missing or too far from verified landmarks, no distance is shown.</p>'+
    '<h3>What to compare before choosing</h3><p>'+esc(advice)+' Check the exact address, current availability, terms and total cost directly with the provider. Use the individual listing map link to plan your route.</p></section>';
}
function areaLandmarkTable(area,city){
  const landmarks=verifiedLandmarksForArea(area,city);
  if(!landmarks.length)return '';
  return '<section class="section area-landmarks"><h2>Verified nearby landmarks</h2><p>Landmark coordinates are from the StudentHubHelp verified dataset. Distances are approximate straight-line measurements from the centroid of available listing coordinates, not driving distance or travel time.</p><div class="table-wrap"><table><thead><tr><th>Verified landmark</th><th>Recorded locality</th><th>Approx. straight-line distance</th></tr></thead><tbody>'+
    landmarks.map(item=>'<tr><td>'+esc(item.name)+'</td><td>'+esc(item.area||item.address||city.name)+'</td><td>'+item.distanceKm.toFixed(1)+' km</td></tr>').join('')+
    '</tbody></table></div></section>';
}
function faqForArea(area,city){
  const cats=categoryNames(area.rows),countText=area.rows.length===1?'1 active listing':area.rows.length+' active listings';
  const verified=area.rows.filter(row=>row.verified===true).length;
  const facilities=[...new Set(area.rows.flatMap(row=>String(row.facilities||'').split(/[,;|]/).map(label).filter(Boolean)))].slice(0,5);
  const timings=area.rows.filter(row=>row.timing).length;
  const fees=areaFeeSummary(area);
  const landmarks=verifiedLandmarksForArea(area,city);
  return [
    {question:'What student services are listed around '+area.name+', '+city.name+'?',answer:'The current directory shows '+countText+' across '+cats.join(', ')+' around '+area.name+', '+city.name+'.'},
    {question:'How many listings are marked verified?',answer:verified+' of '+area.rows.length+' active records are marked verified in the saved StudentHubHelp directory data. Check the badge on each card and confirm details with the provider.'},
    {question:'Which facilities and timings are available?',answer:facilities.length?'The listing records mention '+facilities.join(', ')+'. '+timings+' records include timing information. Check each property page because details vary by provider.':'Facilities and timings are not consistently available in the saved records. Review each listing and contact the provider to confirm.'},
    {question:'Are published fees or prices available?',answer:fees.length?fees.join('; ')+'. These are provider-supplied values from the saved records; confirm the exact billing period and current amount directly with the provider.':'No usable published fee or price value is present in the current active records for this locality. Contact providers for current charges.'},
    {question:'What verified landmarks are nearby?',answer:landmarks.length?landmarks.map(item=>item.name+' ('+item.distanceKm.toFixed(1)+' km straight-line)').join(', ')+'. Distances are approximate from the listing-coordinate centroid, not road distances.':'No verified landmark coordinates are available close enough to this locality in the current verified dataset; no distance claim is made.'},
    {question:'How can I compare listings before choosing?',answer:'Open each View Details page and compare the address, category-specific facilities, timings, published charges and contact details. Confirm current availability and terms directly with the provider before paying.'}
  ];
}
function coachingQuickAnswer(coach,city,rows){
  const cats=categoryNames(rows);
  const verified=rows.filter(row=>row.verified===true).length;
  return '<section class="section quick-answer" aria-label="Quick answer"><h2>Quick answer</h2><p>StudentHubHelp groups '+rows.length+' active student listings that mention '+esc(coach.name)+' in '+esc(city.name)+'. These matches come from listing names, areas, addresses or nearby-landmark fields; they do not prove verified distance to the institute. Compare category and provider details on each card, then confirm the exact route and current availability directly with the provider. '+verified+' records are marked verified.</p></section>';
}
function coachingIntro(coach,city,rows){
  const cats=categoryNames(rows);
  const areas=[...new Set(rows.map(row=>label(row.area)).filter(Boolean))].slice(0,4);
  const names=[...new Set(rows.map(row=>label(row.name)).filter(Boolean))].slice(0,3);
  const facilities=[...new Set(rows.flatMap(row=>String(row.facilities||'').split(/[,;|]/).map(label).filter(value=>value&&value.length<=48&&value.split(/\s+/).length<=6)))].slice(0,4);
  const fees=areaFeeSummary({rows}).slice(0,2);
  const verified=rows.filter(row=>row.verified===true).length;
  const landmarks=verifiedLandmarksForArea({name:coach.name,rows},city);
  const facilityText=facilities.length?'Short facility details include '+facilities.join(', ')+'.':'Some providers include detailed facility information on their individual cards.';
  const feeText=fees.length?'Published price or fee fields in some records include '+fees.join('; ')+'. Confirm current charges directly.':'Published price or fee values are not consistently available in these records; contact providers for current charges.';
  const landmarkText=landmarks.length?'Verified landmarks near the centroid of geocoded listings include '+landmarks.map(item=>item.name).join(', ')+'. The distance table shows approximate straight-line distances from those listings, not from the coaching institute itself.':'No verified landmark coordinates fall within 8 km of the geocoded listing centroid, so no distance claim is shown.';
  return '<section class="section area-overview coaching-overview"><h2>Student services linked to '+esc(coach.name)+' in '+esc(city.name)+'</h2>'+
    '<p>This page groups '+rows.length+' active student-service records whose stored listing name, locality, address or nearby-landmark field mentions '+esc(coach.name)+'. Categories represented include '+esc(cats.join(', '))+'. '+verified+' records are marked verified in the saved directory data. These text matches are useful for discovery, but do not prove a provider is next to the institute.</p>'+
    '<p>Localities represented in these records include '+esc(areas.join(', ')||'locality details not supplied')+'. Examples include '+esc(names.join(', ')||'the listings shown below')+'. '+esc(facilityText)+'</p>'+
    '<p>'+esc(feeText)+' Review each provider’s address, timing, contact information and service details; missing fields are not estimated.</p>'+
    '<p>'+esc(landmarkText)+'</p>'+
    '<h3>How to use these results</h3><p>Open each View Details page, compare category-specific facilities and published charges, then confirm the route on a map and check current availability directly with the provider before paying.</p></section>';
}
function faqForCoaching(coach,city,rows){
  const cats=categoryNames(rows);
  const fees=areaFeeSummary({rows}).slice(0,2);
  const landmarks=verifiedLandmarksForArea({name:coach.name,rows},city);
  return [
    {question:'What student services are linked to '+coach.name+' in '+city.name+'?',answer:'This page groups '+rows.length+' active listings whose stored name, area, address or nearby-landmark details mention '+coach.name+'. Categories include '+cats.join(', ')+'.'},
    {question:'Are these listings confirmed to be beside '+coach.name+'?',answer:'No. Matches are based on listing text fields and are not proof of proximity. Check the provider address and route on a map before visiting.'},
    {question:'Are distances from '+coach.name+' independently verified?',answer:landmarks.length?'The table shows approximate straight-line distances from the centroid of geocoded listings to verified landmarks. It does not measure distance from the coaching institute.':'No verified landmark coordinates are available close to the geocoded listing centroid; no distance claim is made.'},
    {question:'Which listing categories are available?',answer:'The current records include '+cats.join(', ')+'. Open each card to review the individual provider and service details.'},
    {question:'Are prices and facilities available?',answer:(fees.length?fees.join('; ')+'. ':'')+'Provider-supplied facilities and charges vary by listing. Review each card and confirm current details directly with the provider.'},
    {question:'How should I choose a listing?',answer:'Compare the address, category, facilities, timings, total cost and terms. Confirm current availability and the exact route with the provider before paying.'}
  ];
}
function faqHtml(items){if(!items.length)return '';return '<section class="section seo-faq" aria-label="Common questions"><h2>Quick answers</h2>'+items.map(item=>'<details><summary>'+esc(item.question)+'</summary><p>'+esc(item.answer)+'</p></details>').join('')+'</section>';}
function metaDescription(value){let text=String(value||'').replace(/\s+/g,' ').trim();if(text.length<110)text+=' Browse active listings on StudentHubHelp and check each listing status.';if(text.length>160)text=text.slice(0,157).replace(/\s+\S*$/,'').trim()+'…';return text;}
function limitTitle(value,max=60){const suffix=' | StudentHubHelp';const title=String(value||'').replace(/\s+/g,' ').trim();if(title.length<=max)return title;const source=title.endsWith(suffix)?title.slice(0,-suffix.length).trim():title;const room=max-suffix.length;const words=source.split(/\s+/);while(words.length&&words.join(' ').length>room)words.pop();const base=words.join(' ')||source.slice(0,room).trim();return base+suffix;}
function shell({title,description,canonical,h1,crumbs,body,depth=2,about=[],itemRows=[],faqItems=[],cityHub=false,robots='index,follow'}){
  title=limitTitle(title);
  const canonicalAbs=canonical;
  const pageCrumbs=crumbs.some(item=>item.name==='Student Cities')?crumbs:(crumbs[0]?.name==='Home'?[crumbs[0],{name:'Student Cities',url:new URL('student-cities.html',BASE).href},...crumbs.slice(1)]:[{name:'Student Cities',url:new URL('student-cities.html',BASE).href},...crumbs]);
  const cityEntity=about.find(entity=>entity['@type']==='City');
  const liveCityMarkup=cityHub&&cityEntity?'<section class="section live-city-directory" id="cityHub" data-city="'+esc(cityEntity.name)+'" data-state="'+esc(cityEntity.containedInPlace?.name||'')+'"><h2>Live student listings in '+esc(cityEntity.name)+'</h2><p>Live counts and recent active listings are loaded from the public directory. Check each listing for current details.</p><div id="liveStats" class="live-stats"><span>Loading live directory…</span></div><div id="areaGrid" class="live-areas"></div><div id="liveCards" class="live-cards"></div></section>':'';
  const metaDesc=metaDescription(description);
  const premiumLocationPaths = new Set([
    '/sikar/','/sikar/piprali-road/','/sikar/nawalgarh-road/','/sikar/anand-nagar/','/sikar/new-indira-colony/','/sikar/vasant-vihar/',
    '/kota/','/kota/talwandi-kota/','/kota/indra-vihar-talwandi/','/kota/new-jawahar-nagar-talwandi-kota/','/kota/hostel/','/kota/tiffin/',
    '/sikar/hostel/','/sikar/cafe/','/sikar/tiffin/','/sikar/coaching/allen/','/sikar/coaching/matrix/',
  ]);
  const premiumCityPrefixes=['/bengaluru/','/chennai/','/patna/','/jhunjhunu/','/gurugram/','/coimbatore/','/delhi/','/jaipur/','/pune/','/lucknow/','/ahmedabad/','/hyderabad/'];
  const premiumCityRoots=new Set(['/sikar.html','/bengaluru.html','/chennai.html','/kota.html','/delhi.html','/patna.html','/jhunjhunu.html','/pune.html','/gurugram.html','/coimbatore.html','/jaipur.html','/lucknow.html','/ahmedabad.html','/hyderabad.html']);
  const canonicalPath = new URL(canonicalAbs).pathname;
  const sikarPage = canonicalPath.startsWith('/sikar/');
  const premiumFolderPage = [...CITY_HTML_ROOTS].some(citySlug => canonicalPath.startsWith('/' + citySlug + '/'));
  const premiumLocation = premiumLocationPaths.has(canonicalPath) || premiumCityRoots.has(canonicalPath) || premiumCityPrefixes.some(prefix=>canonicalPath.startsWith(prefix)) || canonicalPath.startsWith('/sikar/') || canonicalPath.startsWith('/kota/');
  const home=rel(depth,BASE);
  const breadcrumb=pageCrumbs.filter((c,i)=>!(i===0&&c.name==='Home')).map((c,i,items)=>i===items.length-1?'<span>'+esc(c.name)+'</span>':'<a href="'+esc(rel(depth,c.url))+'">'+esc(c.name)+'</a>').join(' <span>›</span> ');
  const entityTypeByCategory={hostel:'LodgingBusiness',tiffin:'FoodEstablishment',library:'Library',cafe:'CafeOrCoffeeShop',bookstore:'BookStore'};
  const latestDataUpdate=itemRows.map(row=>row.updated_at||row.created_at||'').filter(Boolean).sort().pop()||null;
  const itemListElements=itemRows.slice(0,50).map((row,index)=>{
    const entity={'@type':entityTypeByCategory[row.type]||'Thing','name':row.name||'Student listing','url':propUrl(row)};
    if(row.address||row.area||row.city) entity.address={'@type':'PostalAddress',...(row.address?{'streetAddress':row.address}:{}),...(row.city?{'addressLocality':row.city}:{}),'addressCountry':'IN'};
    return {'@type':'ListItem','position':index+1,'item':entity};
  });
  const schema={'@context':'https://schema.org','@type':'CollectionPage','@id':canonicalAbs+'#page','name':h1,'url':canonicalAbs,'description':metaDesc,'inLanguage':'en-IN',...(latestDataUpdate?{'dateModified':latestDataUpdate}:{}),'isPartOf':{'@type':'WebSite','@id':BASE+'#website','name':'StudentHubHelp','url':BASE,'publisher':{'@type':'Organization','@id':BASE+'#organization','name':'StudentHubHelp','url':BASE}},'publisher':{'@type':'Organization','@id':BASE+'#organization','name':'StudentHubHelp','url':BASE},'breadcrumb':{'@type':'BreadcrumbList','itemListElement':pageCrumbs.map((c,i)=>({'@type':'ListItem','position':i+1,'name':c.name,'item':c.url}))},...(about.length?{'about':about}:{}),...(itemRows.length?{'mainEntity':{'@type':'ItemList','numberOfItems':itemRows.length,'itemListOrder':'https://schema.org/ItemListOrderAscending','itemListElement':itemListElements}}:{}),...(faqItems.length?{'hasPart':{'@type':'FAQPage','mainEntity':faqItems.map(item=>({'@type':'Question','name':item.question,'acceptedAnswer':{'@type':'Answer','text':item.answer}}))}}:{})};
  const verifiedCount=itemRows.filter(row=>row.verified===true).length;
  const dataSourceMarkup=itemRows.length?'<section class="section data-source-note" aria-label="About this directory data"><h2>About this directory data</h2><p>Source: StudentHubHelp public listings directory. This page includes '+itemRows.length+' records marked active when the page was generated; '+verifiedCount+' are also marked verified in the source data.</p><p>Listing details and availability can change. Confirm current prices, facilities, timings, location and availability directly with the owner or service provider before making a decision.</p></section>':'';
  const updateMarkup=latestDataUpdate?'<p class="directory-updated"><strong>Directory data last updated:</strong> '+esc(new Date(latestDataUpdate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}))+'</p>':'';
  return '<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>'+esc(title)+'</title><meta name="description" content="'+esc(metaDesc)+'">'+GENERATED_MARKER+
    '<meta name="robots" content="'+esc(robots)+',max-image-preview:large,max-snippet:-1,max-video-preview:-1"><link rel="icon" type="image/png" href="/logo.png?v=logo-hd-20261029"><link rel="apple-touch-icon" href="/logo.png?v=logo-hd-20261029"><link rel="canonical" href="'+esc(canonicalAbs)+'">'+
    '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(metaDesc)+'"><meta property="og:url" content="'+esc(canonicalAbs)+'"><meta property="og:type" content="website"><meta property="og:locale" content="en_IN"><meta property="og:image" content="https://studenthubhelp.in/logo.png?v=logo-hd-20261029"><meta property="og:image:alt" content="StudentHubHelp student services directory"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+esc(title)+'"><meta name="twitter:description" content="'+esc(metaDesc)+'"><meta name="twitter:image" content="https://studenthubhelp.in/logo.png?v=logo-hd-20261029">'+
    '<script type="application/ld+json">'+JSON.stringify(schema)+'</script>'+
    '<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:1180px;margin:auto;padding:24px;line-height:1.55;color:#172033;background:#fff}.crumbs{font-size:.92rem;margin-bottom:18px;color:#64748b}.crumbs a{color:#3158c9}.hero{padding:18px 0 8px}h1{font-size:clamp(28px,5vw,44px);line-height:1.1;margin:.2em 0}.muted{color:#64748b}.data-source-note{padding:18px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc}.data-source-note h2{margin-top:0}.data-source-note p:last-child{margin-bottom:0;color:#64748b}.directory-updated{font-size:.9rem;color:#64748b;margin:16px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}.property-card,.category-card{border:1px solid #e2e8f0;border-radius:14px;padding:16px;background:#fff}.property-card-image{display:block;margin:-16px -16px 14px}.property-card-image img{display:block;width:100%;height:164px;object-fit:cover;border-radius:13px 13px 0 0;background:#f1f5f9}.premium-location .property-card-image{margin:-20px -20px 14px}.premium-location .property-card-image img{height:170px;border-radius:17px 17px 0 0}.property-card h3,.category-card h2{margin-top:0}.property-card a,.category-card a{color:#3158c9;text-decoration:none}.badge{font-size:.82rem;color:#166534;background:#dcfce7;padding:3px 8px;border-radius:999px}.section{margin:30px 0}.links{display:flex;flex-wrap:wrap;gap:10px}.links a{padding:8px 12px;border:1px solid #dbe3ef;border-radius:999px;text-decoration:none;color:#3158c9}.premium-location{max-width:none!important;padding:0!important;background:#f5f7fb!important;color:#172238!important}.premium-location main{max-width:1240px;margin:0 auto;padding:24px 18px 56px}.premium-location .crumbs{color:#b8c8dc;background:#0b1f3a;border-radius:14px;padding:14px 18px;margin:0 0 22px}.premium-location .crumbs a{color:#f2c866}.premium-location .hero{position:relative;overflow:hidden;padding:34px clamp(22px,4vw,48px);margin:0 0 26px;border-radius:24px;color:#fff;background:radial-gradient(ellipse at 85% 0,rgba(215,166,61,.22),transparent 30%),linear-gradient(125deg,#07182e,#102e51 62%,#091d37);box-shadow:0 18px 42px rgba(12,31,58,.12)}.premium-location .hero h1{color:#fff;font-size:clamp(32px,4.8vw,56px);letter-spacing:-1.5px;max-width:850px}.premium-location .hero .muted{color:#d1dbea;max-width:760px}.premium-location .section{margin:28px 0}.premium-location .section>h2{font-size:clamp(20px,2.3vw,28px);letter-spacing:-.5px;color:#0b1f3a;margin:0 0 16px}.premium-location .grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:18px}.premium-location .property-card,.premium-location .category-card{border:1px solid #e2eaf3;border-radius:18px;padding:20px;background:#fff;box-shadow:0 8px 24px rgba(12,31,58,.055);transition:transform .18s ease,box-shadow .18s ease}.premium-location .property-card:hover,.premium-location .category-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(12,31,58,.1)}.premium-location .property-card h3,.premium-location .category-card h2{color:#142f52;line-height:1.35}.premium-location .property-card a,.premium-location .category-card a{color:#3158c9;font-weight:700}.premium-location .badge{display:inline-block;color:#166548;background:#e2f7ed;border:1px solid #b9ecd3;padding:5px 10px;border-radius:999px;font-weight:700}.premium-location .links a{background:#fff;border:1px solid #dbe4ef;color:#203a5b;font-weight:700;padding:10px 14px;border-radius:12px;transition:background .18s,border-color .18s}.premium-location .links a:hover{background:#fff5d9;border-color:#e7c66e}.premium-location a:focus-visible{outline:3px solid #d7a63d;outline-offset:3px}.seo-faq{border:1px solid #e2e8f0;border-radius:16px;padding:20px;background:#fff}.seo-faq h2{margin-top:0}.seo-faq details{padding:12px 0;border-top:1px solid #e2e8f0}.seo-faq summary{cursor:pointer;font-weight:700;color:#142f52}.seo-faq p{color:#475569;margin:10px 0 0}.live-city-directory{padding:22px;border:1px solid #e2eaf3;border-radius:20px;background:#fff;box-shadow:0 8px 24px rgba(12,31,58,.05)}.live-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin:14px 0}.live-stats .stat{padding:12px;border-radius:12px;background:#f3f7fb}.live-stats .stat b,.live-stats .stat span{display:block}.live-stats .stat b{font-size:22px;color:#0b1f3a}.live-stats .stat span{font-size:12px;color:#64748b}.live-areas{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.live-areas .area-card{padding:8px 11px;border:1px solid #dbe4ef;border-radius:12px;color:#203a5b}.live-areas .area-card small{display:block;color:#64748b}.live-cards .service-block{margin:22px 0}.live-cards .service-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.live-cards .listing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px}.live-cards .listing{display:block;padding:14px;border:1px solid #e2eaf3;border-radius:14px;color:#203a5b}.live-cards .listing-body>span{display:block;margin:5px 0}.live-cards .listing-bottom{color:#3158c9;font-weight:700}@media(max-width:650px){body{padding:0}.premium-location main{padding:14px 12px 36px}.premium-location .crumbs{padding:12px 14px;border-radius:12px}.premium-location .hero{padding:26px 20px;border-radius:18px}.premium-location .hero h1{font-size:clamp(29px,8vw,40px);letter-spacing:-.8px}.premium-location .property-card,.premium-location .category-card{padding:17px;border-radius:15px}.premium-location .grid{grid-template-columns:1fr;gap:12px}.premium-location .links{gap:8px}.premium-location .links a{padding:9px 11px}}</style><link rel="stylesheet" href="/assets/premium-location.css">'+(premiumFolderPage?'<link rel="stylesheet" href="/assets/sikar-premium.css">':'')+'</head><body class="'+(premiumLocation?'premium-location':'')+(premiumFolderPage?' sikar-premium':'')+'">'+(premiumFolderPage?'<nav class="sikar-site-nav" aria-label="Main navigation"><a class="sikar-brand" href="/"><img src="/logo.png" alt="StudentHubHelp"><span>StudentHubHelp</span></a><div class="sikar-nav-links"><a href="/student-cities.html">Explore Cities</a><a href="/pg-finder.html">Hostels &amp; PGs</a><a href="/library-finder.html">Libraries</a><a href="/tiffin-finder.html">Tiffin Services</a><a href="/resources.html">Resources</a><a class="sikar-nav-cta" href="/list-property.html">List Your Property</a></div></nav>':'')+'<main>'+
    '<nav class="crumbs"><a href="'+esc(home)+'">StudentHubHelp</a> <span>›</span> '+breadcrumb+'</nav>'+
    '<header class="hero"><h1>'+esc(h1)+'</h1><p class="muted">'+esc(description)+'</p></header>'+'<section class="search-panel" aria-label="Find student services"><input type="search" aria-label="Search" placeholder="Search a place, locality or service..." onkeydown="if(event.key===\'Enter\'){window.location.href=\'/global-search.html?q=\'+encodeURIComponent(this.value)}"><a href="/global-search.html">Search places →</a></section><nav class="category-pills" aria-label="Student service categories"><a href="/global-search.html">✦ All places</a><a href="/pg-finder.html">⌂ Hostels &amp; PGs</a><a href="/cafe-finder.html">☕ Cafes</a><a href="/tiffin-finder.html">♨ Tiffin &amp; Mess</a><a href="/library-finder.html">▤ Libraries</a><a href="/bookstore-finder.html">▣ Bookstores</a></nav>'+liveCityMarkup+body+dataSourceMarkup+updateMarkup+faqHtml(faqItems)+
    '</main>'+(premiumFolderPage?'<footer class="sikar-site-footer"><div class="sikar-footer-top"><a class="sikar-footer-brand" href="/">StudentHubHelp</a><nav class="sikar-footer-links" aria-label="Footer navigation"><a href="/student-cities.html">Explore Cities</a><a href="/pg-finder.html">Hostels &amp; PGs</a><a href="/library-finder.html">Libraries</a><a href="/tiffin-finder.html">Tiffin Services</a><a href="/resources.html">Resources</a><a href="/list-property.html">List Your Property</a></nav></div><div class="sikar-footer-bottom">Made for students across India · StudentHubHelp</div></footer>':'')+(cityHub?'<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script src="/city-hub.js" defer></script>':'')+'<script src="/chatbot/chatbot.js" defer></script></body></html>';
}
async function fetchRows(meta){
  const out=[]; let offset=0;
  while(true){
    const u=new URL(SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/'+meta.table);
    u.searchParams.set('select',buildListingSelect(meta.type));
    u.searchParams.set('status','eq.active');
    u.searchParams.set('offset',String(offset)); u.searchParams.set('limit','1000');
    const res=await fetch(u,{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY}});
    if(!res.ok) throw new Error(meta.table+': HTTP '+res.status+' '+await res.text());
    const batch=await res.json(); if(!Array.isArray(batch)||!batch.length) break;
    for(const raw of batch){
      const city=canonicalCityName(raw.city), areaRaw=label(raw.area||raw.service_area), area=normalizeArea(areaRaw,city);
      const normalized=normalizeListingRecord(meta.type,raw,{city,area});
      const name=label(normalized.name);
      if(!city||!name||!normalized.active) continue;
      const savedSlug=String(raw.slug||'').trim();
      const duplicateRedirect=LEGACY_REDIRECTS['/properties/'+meta.type+'/'+savedSlug+'/'];
      if(duplicateRedirect && duplicateRedirect.type===meta.type && duplicateRedirect.slug && duplicateRedirect.slug!==savedSlug) continue;
      out.push({...normalized,categoryLabel:meta.label,icon:meta.icon,city,area,areaRaw,name});
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
  const rules=[...redirects.entries()].flatMap(([from,to])=>[from+' '+to+' 301',from.replace(/\/$/,'')+' '+to+' 301']).concat(ROOT_CITY_REDIRECTS.map(item=>item.from+' '+item.to+' 301'));
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
for(const row of cityRows){if(!row.areaRaw)continue;const cityName=canonicalCityName(row.city),citySlug=slug(cityName),cityPath='/'+citySlug+'/',oldAreaSlug=slug(row.areaRaw),newAreaSlug=slug(row.area),count=areaCounts.get(citySlug+'|'+normalizedAreaKey(row.area))||0;if(!oldAreaSlug)continue;const from=cityPath+oldAreaSlug+'/',cityTarget=CITY_HTML_ROOTS.has(citySlug)||((cityCounts.get(citySlug)||0)>=10)?cityPath:'/student-cities.html';const to=row.area&&newAreaSlug&&count>=3?cityPath+newAreaSlug+'/':cityTarget;if(from!==to)areaRedirects.set(from,to);}
// Consolidate the thin duplicate Nawalgarh Road library URL into the live directory page.
areaRedirects.set('/sikar/nawalgarh-road/library/','/sikar/library/');
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

// Promote the existing city guides to the standard /city/ directory URLs.
// The old .html URLs remain permanent 301 aliases.
for(const cs of CITY_HTML_ROOTS){
  const sourcePath=cs+'.html';
  let html=await readFile(sourcePath,'utf8').catch(()=> '');
  if(!html) continue;
  const city=cities.get(cs);
  const cityName=city?.name || CITY_ALIAS_DATA.canonicalCities.find(item=>item.slug===cs)?.name || label(cs);
  const folderPath=cs+'/index.html';
  const cityUrl=new URL(cs+'/',BASE).href;
  const decision=decideAndStorePage({type:'cityHub',citySlug:cs},{listingCount:city?.rows.length||0},folderPath,true);
  const title=limitTitle(city ? titleForCity(cityName,city.rows) : 'Student Services in '+cityName+' | StudentHubHelp');
  html=html.replace(/<meta\s+name=["']robots["'][^>]*>/i,'<meta name="robots" content="noindex,follow">');
  if(!/<meta\s+name=["']robots["']/i.test(html)) html=html.replace('</head>','<meta name="robots" content="noindex,follow"></head>');
  html=html.replace(/<title>[\s\S]*?<\/title>/i,'<title>'+esc(title)+'</title>');
  html=html.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/i,tag=>tag.replace(/href=["'][^"']*["']/i,'href="'+esc(cityUrl)+'"'));
  html=html.replace(/(<meta\s+property=["']og:url["']\s+content=["'])[^"']*(["'][^>]*>)/i,'$1'+esc(cityUrl)+'$2');
  html=html.replaceAll('https://studenthubhelp.in/'+sourcePath,cityUrl);
  if(city && city.rows.length){
    const description=metaDescription(descriptionForCity(city));
    html=html.replace(/(<meta\s+name=["']description["']\s+content=["'])[^"']*(["'][^>]*>)/i,'$1'+esc(description)+'$2');
    html=html.replace(/(<meta\s+property=["']og:title["']\s+content=["'])[^"']*(["'][^>]*>)/i,'$1'+esc(title)+'$2');
    html=html.replace(/(<meta\s+name=["']twitter:title["']\s+content=["'])[^"']*(["'][^>]*>)/i,'$1'+esc(title)+'$2');
  }
  ROOT_CITY_REDIRECTS.push({from:'/'+sourcePath,to:decision.status==='redirect'?parentPath({type:'cityHub',citySlug:cs}):'/'+cs+'/'});
  if(decision.status==='redirect') ROOT_CITY_REDIRECTS.push({from:'/'+cs+'/',to:parentPath({type:'cityHub',citySlug:cs})});
  else { expected.add(folderPath); if(decision.sitemap) generated.push(cityUrl); }
  await write(sourcePath,html);
}

for(const c of cities.values()){
  const cs=slug(c.name); if(!cs || c.rows.length<LOCATION_MIN_PROPERTIES) continue;
  const cityDir=GENERATED_ROOT+'/'+cs;
  const cityUrl=new URL(cs+'/',BASE).href;
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
  const categoryDecisions=new Map();
  for(const meta of TABLES){
    const rows=groups.get(meta.type)||[];
    const path=cs+'/'+meta.type+'/index.html';
    const decision=decideAndStorePage({type:'cityCategory',citySlug:cs,categorySlug:meta.type},{listingCount:rows.length,verifiedCount:rows.filter(row=>row.verified===true).length},path);
    categoryDecisions.set(meta.type,decision);
    if(decision.status==='redirect') PENDING_ELIGIBILITY_REDIRECTS.set('/'+cs+'/'+meta.type+'/',parentPath({type:'cityCategory',citySlug:cs,categorySlug:meta.type}));
  }
  const eligibleGroups=new Map([...groups.entries()].filter(([type])=>categoryDecisions.get(type)?.linkable));
  const categories=[...eligibleGroups.keys()].map(type=>TABLES.find(t=>t.type===type));
  const categoryLinks=categories.map(meta=>'<a href="'+esc(meta.type+'/')+'">'+meta.icon+' '+esc(meta.label)+'</a>').join('');
  const cityCoachingSlugs=[...new Set(c.rows.flatMap(matchedCoachings))];
  const coachingLinks=cityCoachingSlugs.map(s=>{const m=coachingBySlug(s);return '<a href="'+esc('/'+cs+'/'+entitySection(m)+'/'+m.slug+'/')+'">'+entityIcon(m)+' '+esc(m.name)+'</a>';}).join('');
  const coachingSection=coachingLinks?'<section class="section"><h2>Coaching institutes & landmarks in '+esc(c.name)+'</h2><p>Explore student properties connected to coaching institutes and local landmarks through active listing details.</p><div class="links">'+coachingLinks+'</div></section>':'';
  const cityCategoryCards=TABLES.map(m=>{const rows=groups.get(m.type)||[],decision=categoryDecisions.get(m.type),target=decision?.linkable?m.type+'/':'/'+m.finder+'?q='+encodeURIComponent(c.name),countText=rows.length===1?'1 active record':rows.length+' active records',verified=rows.filter(row=>row.verified===true).length,verifiedText=verified===1?'1 marked verified':verified+' marked verified';return '<article class="category-card"><h2>'+m.icon+' '+esc(m.label)+'</h2><p>'+countText+'; '+verifiedText+'.</p><a href="'+esc(target)+'">Explore '+esc(m.label)+' in '+esc(c.name)+' →</a></article>';}).join('');
  const body=cityQuickAnswer(c)+cityContentIntro(c)+coachingSection+'<section class="section"><h2>Student-focused listings in '+esc(c.name)+'</h2><div class="grid">'+cityCategoryCards+'</div></section>'+
    '<section class="section"><h2>Explore categories in '+esc(c.name)+'</h2><p>Choose a service category to compare listings available in this city.</p><div class="links">'+categoryLinks+'</div></section>'+
    '<section class="section"><h2>Student listings across '+esc(c.name)+'</h2><p>Open a listing to review its address, facilities and service information. Confirm details with the provider before visiting.</p><div class="grid">'+c.rows.slice(0,120).map(r=>card(r,1)).join('')+'</div></section>';
  // Sikar's primary city guide lives at /sikar.html. Do not recreate the
  // older /sikar/ city index; nested category, area and coaching pages remain.
  if (!CITY_HTML_ROOTS.has(cs)) {
    const cityPath=cityDir+'/index.html';
    const decision=decideAndStorePage({type:'cityHub',citySlug:cs},{listingCount:c.rows.length},cityPath);
    if(decision.status==='redirect') PENDING_ELIGIBILITY_REDIRECTS.set('/'+cs+'/',parentPath({type:'cityHub',citySlug:cs}));
    if(decision.status==='index'||decision.status==='noindex-grace'){
      expected.add(cityPath); if(decision.sitemap) generated.push(cityUrl);
      await write(cityPath,shell({title:titleForCity(c.name,c.rows),description:descriptionForCity(c),canonical:cityUrl,h1:h1ForCity(c),crumbs:[{name:'Home',url:BASE},{name:c.name,url:cityUrl}],body,depth:1,about:[{'@type':'City','name':c.name,'containedInPlace':{'@type':'State','name':stateForCity(c.name,c.rows)}}],itemRows:c.rows,faqItems:faqForCity(c),cityHub:true,robots:decision.robots}));
    }
  }

  for(const meta of TABLES){
    const rows=c.rows.filter(r=>r.type===meta.type);
    const decision=categoryDecisions.get(meta.type);
    if(!decision || decision.status==='omit' || decision.status==='redirect') continue;
    const dir=cityDir+'/'+meta.type; const url=new URL(cs+'/'+meta.type+'/',BASE).href;
    const relatedCoachings=[...new Set(rows.flatMap(matchedCoachings))];
    const relatedCoachingLinks=relatedCoachings.map(s=>{const m=coachingBySlug(s);return '<a href="'+esc('../'+entitySection(m)+'/'+m.slug+'/')+'">'+entityIcon(m)+' '+esc(m.name)+'</a>';}).join('');
    const coachingContext=relatedCoachingLinks?'<section class="section"><h2>Nearby coaching & landmarks</h2><div class="links">'+relatedCoachingLinks+'</div></section>':'';
    const body=categoryQuickAnswer(meta,c,rows)+categoryIntro(meta,c,rows)+areaFallbackSections(meta,c,rows,cs)+areaLandmarkTable({name:meta.label,rows},c)+'<section class="section"><h2>'+esc(meta.label)+' listings in '+esc(c.name)+'</h2><div class="grid">'+rows.map(r=>card(r,2)).join('')+'</div></section>'+coachingContext+
      '<section class="section"><a href="'+esc(rel(2,cityUrl))+'">← Back to '+esc(c.name)+'</a> · <a href="'+esc(rel(2,new URL(meta.finder,BASE).href))+'">Open '+esc(meta.label)+' Finder</a></section>';
    const p=dir+'/index.html'; expected.add(p); if(decision.sitemap) generated.push(url);
    await write(p,shell({title:titleForCategory(meta,c.name),description:'Find '+rows.length+' active '+meta.label.toLowerCase()+' in '+c.name+'. Compare local areas, facilities and provider details on StudentHubHelp.',canonical:url,h1:meta.label+' in '+c.name,crumbs:[{name:c.name,url:cityUrl},{name:meta.label,url}],body,depth:3,about:[{'@type':'City','name':c.name,'containedInPlace':{'@type':'State','name':stateForCity(c.name,rows)}},{'@type':'Thing','name':meta.label}],itemRows:rows,faqItems:faqForCategory(meta,c,rows),robots:decision.robots}));
  }

  const areas=new Map();
  for(const r of c.rows){if(!r.area)continue;const ak=key(r.area);if(!areas.has(ak))areas.set(ak,{name:r.area,rows:[]});areas.get(ak).rows.push(r);}
  for(const a of areas.values()){
    const as=slug(a.name); if(!as || as===cs) continue;
    const profile=getAreaProfile(cs,a.name);
    const areaHubPath=cs+'/'+as+'/index.html';
    const areaHubDecision=decideAndStorePage(
      {type:'areaHub',citySlug:cs,areaSlug:as},
      {listingCount:a.rows.length,categoryCount:new Set(a.rows.map(row=>row.type)).size,profileComplete:profile?.profileComplete===true},
      areaHubPath
    );
    if(areaHubDecision.status==='redirect') PENDING_ELIGIBILITY_REDIRECTS.set('/'+cs+'/'+as+'/',parentPath({type:'areaHub',citySlug:cs}));

    const areaCategoryDecisions=new Map();
    for(const meta of TABLES){
      const items=a.rows.filter(row=>row.type===meta.type);
      const categoryPath=cs+'/'+meta.type+'/'+as+'/index.html';
      const decision=decideAndStorePage(
        {type:'areaCategory',citySlug:cs,categorySlug:meta.type,areaSlug:as},
        {listingCount:items.length,verifiedCount:items.filter(row=>row.verified===true).length,profileComplete:profile?.profileComplete===true && categoryDecisions.get(meta.type)?.linkable===true},
        categoryPath
      );
      areaCategoryDecisions.set(meta.type,decision);
      if(decision.status==='redirect') PENDING_ELIGIBILITY_REDIRECTS.set('/'+cs+'/'+meta.type+'/'+as+'/',parentPath({type:'areaCategory',citySlug:cs,categorySlug:meta.type}));
    }

    const editorialIntro=profile?.introText
      ? '<section class="section area-editorial-profile"><h2>About '+esc(a.name)+', '+esc(c.name)+'</h2><p>'+esc(profile.introText)+'</p>'+
        ((profile.landmarks||[]).length?'<p><strong>Local reference points:</strong> '+esc(profile.landmarks.join(', '))+'</p>':'')+
        ((profile.coachingNearby||[]).length?'<p><strong>Coaching references:</strong> '+esc(profile.coachingNearby.join(', '))+'</p>':'')+
        '<p class="muted">Reference names are orientation cues, not verified proximity or commute claims. Confirm the exact route on a map.</p></section>'
      : areaContentIntro(a,c);

    const areaCoachingSlugs=[...new Set(a.rows.flatMap(matchedCoachings))];
    const areaCoachingLinks=areaCoachingSlugs.map(coachSlug=>{const m=coachingBySlug(coachSlug);return '<a href="'+esc('../'+entitySection(m)+'/'+m.slug+'/')+'">'+entityIcon(m)+' '+esc(m.name)+'</a>';}).join('');
    const areaCoachingSection=areaCoachingLinks?'<section class="section"><h2>Names mentioned in listing details</h2><p>These coaching or landmark names appear in provider-supplied listing text; this does not establish distance or proximity.</p><div class="links">'+areaCoachingLinks+'</div></section>':'';

    if(areaHubDecision.status==='index'||areaHubDecision.status==='noindex-grace'){
      const cityCategoryLinks=[...new Set(a.rows.map(row=>row.type))]
        .filter(type=>categoryDecisions.get(type)?.linkable)
        .map(type=>{const m=TABLES.find(x=>x.type===type);return '<a href="'+esc('../'+type+'/')+'">'+m.icon+' '+esc(m.label)+'</a>';}).join('');
      const areaCategoryLinks=[...new Set(a.rows.map(row=>row.type))]
        .filter(type=>areaCategoryDecisions.get(type)?.linkable)
        .map(type=>{const m=TABLES.find(x=>x.type===type);return '<a href="'+esc('../'+type+'/'+as+'/')+'">'+m.icon+' '+esc(m.label)+' in '+esc(a.name)+'</a>';}).join('');
      const body=areaQuickAnswer(a,c)+editorialIntro+areaLandmarkTable(a,c)+
        '<section class="section"><h2>Active student listings in '+esc(a.name)+', '+esc(c.name)+'</h2><div class="grid">'+a.rows.map(r=>card(r,2)).join('')+'</div></section>'+areaCoachingSection+
        (cityCategoryLinks?'<section class="section"><h2>City categories</h2><div class="links">'+cityCategoryLinks+'</div></section>':'')+
        (areaCategoryLinks?'<section class="section"><h2>Explore categories in this area</h2><div class="links">'+areaCategoryLinks+'</div></section>':'')+
        '<p><a href="'+esc(rel(2,cityUrl))+'">← Back to '+esc(c.name)+'</a></p>';
      const url=new URL(cs+'/'+as+'/',BASE).href;
      expected.add(areaHubPath); if(areaHubDecision.sitemap) generated.push(url);
      await write(areaHubPath,shell({title:titleForArea(a.name,c.name,a.rows,areaCoachingSlugs.length>0),description:'Browse '+a.rows.length+' active student listings around '+a.name+', '+c.name+'. Compare available categories and confirm provider details before visiting.',canonical:url,h1:'Student Services in '+a.name+', '+c.name,crumbs:[{name:c.name,url:cityUrl},{name:a.name,url}],body,depth:3,about:[{'@type':'Place','name':a.name,'containedInPlace':{'@type':'City','name':c.name,'containedInPlace':{'@type':'State','name':stateForCity(c.name,a.rows)}}}],itemRows:a.rows,faqItems:faqForArea(a,c),robots:areaHubDecision.robots}));
    }

    for(const meta of TABLES){
      const items=a.rows.filter(row=>row.type===meta.type);
      const decision=areaCategoryDecisions.get(meta.type);
      if(!decision || decision.status==='omit' || decision.status==='redirect') continue;
      const areaCategoryUrl=new URL(cs+'/'+meta.type+'/'+as+'/',BASE).href;
      const parentCategoryUrl=new URL(cs+'/'+meta.type+'/',BASE).href;
      const siblingLinks=[...new Set(a.rows.map(row=>row.type))]
        .filter(type=>type!==meta.type && areaCategoryDecisions.get(type)?.linkable)
        .map(type=>{const m=TABLES.find(x=>x.type===type);return '<a href="'+esc(rel(3,new URL(cs+'/'+type+'/'+as+'/',BASE).href))+'">'+m.icon+' '+esc(m.label)+'</a>';}).join('');
      const parentLink=categoryDecisions.get(meta.type)?.linkable
        ? '<a href="'+esc(rel(3,parentCategoryUrl))+'">All '+esc(meta.label)+' in '+esc(c.name)+'</a>' : '';
      const areaHubLink=areaHubDecision.linkable
        ? '<a href="'+esc(rel(3,new URL(cs+'/'+as+'/',BASE).href))+'">Area guide: '+esc(a.name)+'</a>' : '';
      const crossLinks=[parentLink,areaHubLink,siblingLinks].filter(Boolean).join('');
      const quick='<section class="section quick-answer" aria-label="Quick answer"><h2>Quick answer</h2><p>StudentHubHelp lists '+items.length+' active '+esc(meta.label.toLowerCase())+' in '+esc(a.name)+', '+esc(c.name)+'. '+items.filter(row=>row.verified===true).length+' are marked verified in the source records. Confirm current availability, charges and exact routes directly with each provider.</p></section>';
      const body=quick+editorialIntro+areaLandmarkTable({name:a.name,rows:items},c)+
        '<section class="section"><h2>'+esc(meta.label)+' in '+esc(a.name)+', '+esc(c.name)+'</h2><div class="grid">'+items.map(row=>card(row,3,{details:true})).join('')+'</div></section>'+
        (crossLinks?'<section class="section"><h2>Related student pages</h2><div class="links">'+crossLinks+'</div></section>':'')+
        '<p><a href="'+esc(rel(3,cityUrl))+'">← Back to '+esc(c.name)+'</a></p>';
      const pageTitle=meta.label+' in '+a.name+', '+c.name+' | StudentHubHelp';
      expected.add(cs+'/'+meta.type+'/'+as+'/index.html'); if(decision.sitemap) generated.push(areaCategoryUrl);
      await write(cs+'/'+meta.type+'/'+as+'/index.html',shell({title:pageTitle,description:'Compare '+items.length+' active '+meta.label.toLowerCase()+' in '+a.name+', '+c.name+'. Review verified status, provider details and available facilities.',canonical:areaCategoryUrl,h1:meta.label+' in '+a.name+', '+c.name,crumbs:[{name:'Home',url:BASE},{name:'Student Cities',url:new URL('student-cities.html',BASE).href},{name:c.name,url:cityUrl},{name:meta.label,url:parentCategoryUrl},{name:a.name,url:areaCategoryUrl}],body,depth:3,about:[{'@type':'Place','name':a.name,'containedInPlace':{'@type':'City','name':c.name,'containedInPlace':{'@type':'State','name':stateForCity(c.name,items)}}},{'@type':'Thing','name':meta.label}],itemRows:items,faqItems:faqForArea({name:a.name,rows:items},c),robots:decision.robots}));
    }
  }

  for(const coachSlug of cityCoachingSlugs){
    const coach=coachingBySlug(coachSlug); if(!coach) continue;
    const rows=c.rows.filter(r=>matchedCoachings(r).includes(coachSlug)); if(rows.length<LOCATION_MIN_PROPERTIES) continue;
    const section=entitySection(coach);
    const dir=cityDir+'/'+section+'/'+coach.slug;
    const url=new URL(cs+'/'+section+'/'+coach.slug+'/',BASE).href;
    const typeLinks=[...new Set(rows.map(r=>r.type))].map(type=>{const m=TABLES.find(x=>x.type===type);return '<a href="'+esc('/'+m.finder)+'">'+m.icon+' '+esc(m.label)+'</a>';}).join('');
    const body=coachingQuickAnswer(coach,c,rows)+coachingIntro(coach,c,rows)+areaLandmarkTable({name:coach.name,rows},c)+'<section class="section"><h2>Student properties near '+esc(coach.name)+' in '+esc(c.name)+'</h2><p>These active listings mention this location in their name, area, address or nearby-landmark details. Text matches do not confirm proximity; verify the exact route before visiting.</p><div class="grid">'+rows.map(r=>card(r,3)).join('')+'</div></section><section class="section"><h2>Categories</h2><div class="links">'+typeLinks+'</div></section><p><a href="'+esc(rel(3,cityUrl))+'">← Back to '+esc(c.name)+'</a></p>';
    const p=dir+'/index.html'; expected.add(p); generated.push(url);
    await write(p,shell({title:titleForCoaching(coach,c.name),description:'Find student listings linked to '+coach.name+' in '+c.name+'. Check each listing for its location details and confirm exact distance before visiting.',canonical:url,h1:'Student Properties near '+coach.name+' in '+c.name,crumbs:[{name:c.name,url:cityUrl},{name:coach.name,url}],body,depth:3,about:[{'@type':entitySchemaType(coach),'name':coach.name},{'@type':'City','name':c.name,'containedInPlace':{'@type':'State','name':stateForCity(c.name,rows)}}],itemRows:rows,faqItems:faqForCoaching(coach,c,rows)}));
  }
}


/* Build static Nawalgarh Road category pages from the same active, deduplicated
   listing records and card renderer used by generated SEO directory pages. */
const nawalgarhCity = cities.get('sikar');
if (nawalgarhCity) {
  const nawalgarhConfig = [
    { type:'hostel', path:'sikar/nawalgarh-road/hostel/index.html', url:'https://studenthubhelp.in/sikar/nawalgarh-road/hostel/', label:'Hostels & PGs', plural:'hostels and PGs' },
    { type:'tiffin', path:'sikar/nawalgarh-road/tiffin/index.html', url:'https://studenthubhelp.in/sikar/nawalgarh-road/tiffin/', label:'Tiffin & Mess Services', plural:'tiffin and mess services' },
    { type:'bookstore', path:'sikar/nawalgarh-road/bookstore/index.html', url:'https://studenthubhelp.in/sikar/nawalgarh-road/bookstore/', label:'Bookstores & Stationery', plural:'bookstores' },
    { type:'library', path:'sikar/libraries/nawalgarh-road/index.html', url:'https://studenthubhelp.in/sikar/libraries/nawalgarh-road/', label:'Libraries & Study Spaces', plural:'libraries and study spaces' }
  ];
  for (const page of nawalgarhConfig) {
    const rows=nawalgarhCity.rows.filter(row=>row.type===page.type && /nawalgarh/i.test([row.area,row.address,row.nearby_coaching,row.landmark].filter(Boolean).join(' ')))
      .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
    const decision=decideAndStorePage({type:'areaCategory',citySlug:'sikar',categorySlug:page.type,areaSlug:'nawalgarh-road'},{listingCount:rows.length,verifiedCount:rows.filter(row=>row.verified===true).length,profileComplete:getAreaProfile('sikar','Nawalgarh Road')?.profileComplete===true},page.path);
    if(decision.status==='redirect') PENDING_ELIGIBILITY_REDIRECTS.set('/'+page.path.replace(/index\.html$/,''),parentPath({type:'areaCategory',citySlug:'sikar',categorySlug:page.type}));
    if (decision.status==='omit' || decision.status==='redirect') continue;
    const verified=rows.filter(row=>row.verified===true).length;
    const description='Browse '+rows.length+' active '+page.plural+' around Nawalgarh Road, Sikar. Review provider-supplied addresses, timings, facilities and contact details on StudentHubHelp.';
    const listingCards=rows.map(row=>card(row,3,{details:true})).join('');
    const areaGroup={name:'Nawalgarh Road',rows};
    const quickAnswer=areaQuickAnswer(areaGroup,{name:'Sikar'});
    const areaIntro=areaContentIntro(areaGroup,{name:'Sikar'});
    const landmarkTable=areaLandmarkTable(areaGroup,{name:'Sikar'});
    const body=quickAnswer+areaIntro+landmarkTable+
      '<section class="section"><h2>'+esc(page.label)+' around Nawalgarh Road, Sikar</h2><p>These cards are rendered directly into the page HTML from active StudentHubHelp directory records. Fields not supplied in a record are omitted; confirm current availability and details with the provider.</p><div class="grid">'+listingCards+'</div></section>'+
      '<section class="section"><h2>Explore more in Sikar</h2><div class="links"><a href="/sikar.html">Sikar student directory</a><a href="/student-cities.html">Student Cities</a><a href="/sikar/hostel/">Hostels & PGs</a><a href="/sikar/tiffin/">Tiffin & Mess</a><a href="/sikar/library/">Libraries</a><a href="/sikar/bookstore/">Bookstores</a></div></section>';
    const faqItems=faqForArea(areaGroup,{name:'Sikar'});
    const pageHtml=shell({
      title:page.label+' on Nawalgarh Road, Sikar | StudentHubHelp',
      description,canonical:page.url,h1:page.label+' on Nawalgarh Road, Sikar',
      crumbs:[{name:'Home',url:BASE},{name:'Student Cities',url:new URL('student-cities.html',BASE).href},{name:'Sikar',url:new URL('sikar.html',BASE).href},{name:page.label,url:page.url}],
      body,depth:3,about:[{'@type':'Place','name':'Nawalgarh Road','containedInPlace':{'@type':'City','name':'Sikar','containedInPlace':{'@type':'State','name':'Rajasthan'}}},{'@type':'Thing','name':page.label}],
      itemRows:rows,faqItems,robots:decision.robots
    });
    await write(page.path,pageHtml);
    expected.add(page.path);
    if(decision.sitemap) generated.push(page.url);
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

for(const [from,to] of PENDING_ELIGIBILITY_REDIRECTS) areaRedirects.set(from,to);
// Materialize the final city-hub copies after all city-specific static HTML updates.
for(const cs of CITY_HTML_ROOTS){
  const sourcePath=cs+'.html', folderPath=cs+'/index.html';
  const state=NEXT_PAGE_STATE.pages[pageStateKey({type:'cityHub',citySlug:cs})];
  if(!state || state.status==='redirect') continue;
  let html=await readFile(sourcePath,'utf8');
  const cityUrl=new URL(cs+'/',BASE).href;
  html=html.replace(/<meta\s+name=["']robots["'][^>]*>/i,'<meta name="robots" content="'+esc(state.robots||'noindex,follow')+',max-image-preview:large,max-snippet:-1,max-video-preview:-1">');
  html=html.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/i,tag=>tag.replace(/href=["'][^"']*["']/i,'href="'+esc(cityUrl)+'"'));
  html=html.replace(/(<meta\s+property=["']og:url["']\s+content=["'])[^"']*(["'][^>]*>)/i,'$1'+esc(cityUrl)+'$2');
  html=html.replaceAll('https://studenthubhelp.in/'+sourcePath,cityUrl);
  for(const other of CITY_HTML_ROOTS) html=html.replaceAll('href="/'+other+'.html"','href="/'+other+'/"');
  const city=cities.get(cs);
  const latestCityUpdate=(city?.rows||[]).map(row=>row.updated_at||row.created_at||'').filter(Boolean).sort().at(-1);
  if(latestCityUpdate){
    html=html.replace(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi,(full,jsonText)=>{
      try{
        const data=JSON.parse(jsonText);
        const nodes=Array.isArray(data['@graph'])?data['@graph']:[data];
        for(const node of nodes){
          const types=Array.isArray(node['@type'])?node['@type']:[node['@type']];
          if(types.includes('CollectionPage')||types.includes('WebPage')) node.dateModified=latestCityUpdate;
        }
        return '<script type="application/ld+json">'+JSON.stringify(data)+'</script>';
      }catch{return full;}
    });
  }
  await write(folderPath,html);
}
// Every 301 target must exist after eligibility filtering; otherwise merge to its city hub.
for(const [from,rawTarget] of [...areaRedirects.entries()]){
  let target=rawTarget;
  const firstSegment=target.split('/').filter(Boolean)[0]||from.split('/').filter(Boolean)[0];
  if(target==='/'+firstSegment+'.html' && CITY_HTML_ROOTS.has(firstSegment)) target='/'+firstSegment+'/';
  const targetFile=target.endsWith('/')?target.replace(/^\//,'')+'index.html':target.replace(/^\//,'');
  let exists=expected.has(targetFile);
  if(!exists) exists=!!(await readFile(targetFile,'utf8').catch(()=>null));
  if(!exists){
    const cityRoot=firstSegment+'/index.html';
    target=expected.has(cityRoot)?'/'+firstSegment+'/':'/student-cities.html';
  }
  areaRedirects.set(from,target);
}
const redirectPages=await writeAreaRedirects(areaRedirects,expected);
const redirectUrls=new Set(redirectPages.filter(item=>item.from.startsWith('/sikar/')).map(item=>new URL(item.from,BASE).href));
const uniqueGenerated=[...new Set(generated)].filter(url=>!redirectUrls.has(url));
await write('seo-generated-manifest.json', JSON.stringify({generated: uniqueGenerated, expected:[...expected], areaRedirects:[...areaRedirects].map(([from,to])=>({from,to})), redirectPages}, null, 2)+'\n');
await write('data/seo-page-state.json', JSON.stringify(NEXT_PAGE_STATE, null, 2)+'\n');
console.log(JSON.stringify({activeProperties:all.length,cities:cities.size,generatedPages:generated.length,locationThreshold:LOCATION_MIN_PROPERTIES},null,2));
