import { mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';

const BASE = (process.env.BASE_URL || 'https://studenthubhelp.in/').replace(/\/+$/, '') + '/';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const LOCATION_MIN_PROPERTIES = Number(process.env.SEO_LOCATION_MIN_PROPERTIES || 3);

const TABLES = [
  { type:'hostel', table:'hostels', label:'Hostels & PGs', finder:'pg-finder.html', icon:'🏠' },
  { type:'tiffin', table:'tiffins', label:'Tiffin Services', finder:'tiffin-finder.html', icon:'🍱' },
  { type:'library', table:'libraries', label:'Libraries & Study Spaces', finder:'library-finder.html', icon:'📚' },
  { type:'cafe', table:'cafes', label:'Cafes', finder:'cafe-finder.html', icon:'☕' },
  { type:'bookstore', table:'bookstores', label:'Bookstores & Stationery', finder:'bookstore-finder.html', icon:'📖' }
];

if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase public API configuration.');

const GENERATED_ROOT = '.';
const GENERATED_MARKER = '<meta name="studenthubhelp-generated-seo" content="true">';

function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function slug(v){
  return String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90);
}
function label(v){
  return String(v||'').trim().replace(/\s+/g,' ');
}
function key(v){return label(v).toLowerCase();}
const COACHINGS=[
  {slug:'allen',name:'ALLEN Career Institute',aliases:['allen career institute','allen coaching','allen']},
  {slug:'clc',name:'CLC',aliases:['clc coaching','clc institute','clc kvm','clc-b']},
  {slug:'matrix',name:'Matrix JEE / NEET',aliases:['matrix coaching','matrix neet','matrix jee','matrix']},
  {slug:'gurukripa',name:'Gurukripa Career Institute',aliases:['gurukripa coaching','gurukripa coching','gurukripa']},
  {slug:'vibrant',name:'Vibrant Academy',aliases:['vibrant coaching','vibrant academy','vibrant']},
  {slug:'aakash',name:'Aakash Institute',aliases:['aakash coaching','aakash institute','aakash']},
  {slug:'kalam',name:'Kalam Academy',aliases:['kalam coaching','kalam academy','kalam']},
  {slug:'pcp',name:'PCP',aliases:['pcp coaching','pcp institute','pcp']},
  {slug:'banco',name:'Banco Career Academy',aliases:['banco coaching','banco career academy','banco']},
  {slug:'career-line',name:'Career Line Coaching',aliases:['career line coaching','career line']},
  {slug:'unacademy',name:'Unacademy',aliases:['unacademy']}
];
function matchedCoachings(row){
  const text=key([row.name,row.area,row.address].filter(Boolean).join(' '));
  return COACHINGS.filter(c=>c.aliases.some(a=>text.includes(a))).map(c=>c.slug);
}
function coachingBySlug(slug){return COACHINGS.find(c=>c.slug===slug);}
function propUrl(row){
  const u=new URL('property-details.html',BASE);
  u.searchParams.set('type',row.type);
  if(row.slug) u.searchParams.set('slug',row.slug); else u.searchParams.set('id',row.id);
  return u.href;
}
function rel(fromDepth,url){
  const target=new URL(url);
  const path=target.pathname.replace(/^\/+/, '');
  const prefix='../'.repeat(fromDepth);
  return prefix + path + (target.search ? target.search : '');
}
function card(row,depth){
  const href=rel(depth,propUrl(row));
  const bits=[row.area,row.city,row.address].filter(Boolean);
  return '<article class="property-card"><h3><a href="'+esc(href)+'">'+esc(row.name||'Student property')+'</a></h3>'+
    (bits.length?'<p>📍 '+esc(bits.join(' • '))+'</p>':'')+
    '<p><span class="badge">✓ Verified & Active</span></p></article>';
}
function shell({title,description,canonical,h1,crumbs,body,depth=2,about=[]}){
  const canonicalAbs=canonical;
  const home=rel(depth,BASE);
  const breadcrumb=crumbs.map((c,i)=>i===crumbs.length-1?'<span>'+esc(c.name)+'</span>':'<a href="'+esc(rel(depth,c.url))+'">'+esc(c.name)+'</a>').join(' <span>›</span> ');
  const schema={'@context':'https://schema.org','@type':'CollectionPage','@id':canonicalAbs+'#page','name':h1,'url':canonicalAbs,'description':description,'inLanguage':'en-IN','isPartOf':{'@type':'WebSite','name':'StudentHubHelp','url':BASE},'breadcrumb':{'@type':'BreadcrumbList','itemListElement':crumbs.map((c,i)=>({'@type':'ListItem','position':i+1,'name':c.name,'item':c.url}))},...(about.length?{'about':about}:{})};
  return '<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>'+esc(title)+'</title><meta name="description" content="'+esc(description)+'">'+GENERATED_MARKER+
    '<meta name="robots" content="index,follow"><link rel="canonical" href="'+esc(canonicalAbs)+'">'+
    '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+esc(canonicalAbs)+'"><meta property="og:type" content="website">'+
    '<script type="application/ld+json">'+JSON.stringify(schema)+'</script>'+
    '<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:1180px;margin:auto;padding:24px;line-height:1.55;color:#172033;background:#fff}.crumbs{font-size:.92rem;margin-bottom:18px;color:#64748b}.crumbs a{color:#3158c9}.hero{padding:18px 0 8px}h1{font-size:clamp(28px,5vw,44px);line-height:1.1;margin:.2em 0}.muted{color:#64748b}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}.property-card,.category-card{border:1px solid #e2e8f0;border-radius:14px;padding:16px;background:#fff}.property-card h3,.category-card h2{margin-top:0}.property-card a,.category-card a{color:#3158c9;text-decoration:none}.badge{font-size:.82rem;color:#166534;background:#dcfce7;padding:3px 8px;border-radius:999px}.section{margin:30px 0}.links{display:flex;flex-wrap:wrap;gap:10px}.links a{padding:8px 12px;border:1px solid #dbe3ef;border-radius:999px;text-decoration:none;color:#3158c9}@media(max-width:650px){body{padding:16px}}</style></head><body><main>'+
    '<nav class="crumbs"><a href="'+esc(home)+'">StudentHubHelp</a> <span>›</span> '+breadcrumb+'</nav>'+
    '<header class="hero"><h1>'+esc(h1)+'</h1><p class="muted">'+esc(description)+'</p></header>'+body+
    '</main></body></html>';
}
async function fetchRows(meta){
  const out=[]; let offset=0;
  while(true){
    const u=new URL(SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/'+meta.table);
    u.searchParams.set('select','id,property_id,slug,name,city,area,address,status,verified,updated_at,created_at');
    u.searchParams.set('status','eq.active'); u.searchParams.set('verified','eq.true');
    u.searchParams.set('offset',String(offset)); u.searchParams.set('limit','1000');
    const res=await fetch(u,{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY}});
    if(!res.ok) throw new Error(meta.table+': HTTP '+res.status+' '+await res.text());
    const batch=await res.json(); if(!Array.isArray(batch)||!batch.length) break;
    for(const raw of batch){
      const city=label(raw.city), area=label(raw.area||raw.service_area);
      const name=label(raw.name||raw.service_name);
      if(!city||!name) continue;
      out.push({...raw,type:meta.type,categoryLabel:meta.label,icon:meta.icon,city,area,name});
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

await cleanupGeneratedPages();
await mkdir(GENERATED_ROOT,{recursive:true});

const all=(await Promise.all(TABLES.map(fetchRows))).flat();
const cities=new Map();
for(const row of all){
  const ck=key(row.city); if(!cities.has(ck)) cities.set(ck,{name:row.city,rows:[]});
  cities.get(ck).rows.push(row);
}

const generated=[];
const expected=new Set();

for(const c of cities.values()){
  const cs=slug(c.name); if(!cs) continue;
  const cityDir=GENERATED_ROOT+'/'+cs;
  const cityUrl=new URL(cs+'/',BASE).href;
  const categories=[...new Map(c.rows.map(r=>[r.type,r])).values()].map(r=>TABLES.find(t=>t.type===r.type));
  const categoryLinks=categories.map(meta=>'<a href="'+esc(meta.type+'/')+'">'+meta.icon+' '+esc(meta.label)+'</a>').join('');
  const groups=new Map();
  for(const r of c.rows){if(!groups.has(r.type))groups.set(r.type,[]);groups.get(r.type).push(r);}
  const cityCoachingSlugs=[...new Set(c.rows.flatMap(matchedCoachings))];
  const coachingLinks=cityCoachingSlugs.map(s=>{const m=coachingBySlug(s);return '<a href="'+esc('coaching/'+m.slug+'/')+'">🎓 '+esc(m.name)+'</a>';}).join('');
  const coachingSection=coachingLinks?'<section class="section"><h2>Coaching & study hubs in '+esc(c.name)+'</h2><p>Explore student properties connected to major coaching and study locations through verified listing data.</p><div class="links">'+coachingLinks+'</div></section>':'';
  const body=coachingSection+'<section class="section"><h2>Student-focused listings in '+esc(c.name)+'</h2><div class="grid">'+[...groups.entries()].map(([type,rows])=>{const m=TABLES.find(x=>x.type===type);return '<article class="category-card"><h2>'+m.icon+' '+esc(m.label)+'</h2><p>'+rows.length+' verified and active listing'+(rows.length===1?'':'s')+'.</p><a href="'+esc(type+'/')+'">View '+esc(m.label)+' in '+esc(c.name)+' →</a></article>';}).join('')+'</div></section>'+
    '<section class="section"><h2>Explore '+esc(c.name)+'</h2><div class="links">'+categoryLinks+'</div></section>'+
    '<section class="section"><h2>Verified properties</h2><div class="grid">'+c.rows.slice(0,120).map(r=>card(r,1)).join('')+'</div></section>';
  const cityPath=cityDir+'/index.html'; expected.add(cityPath); generated.push(cityUrl);
  await write(cityPath,shell({title:'Student Hostels, Tiffins, Cafes, Libraries & Bookstores in '+c.name+' | StudentHubHelp',description:'Find verified and active student-focused hostels, tiffin services, cafes, libraries and bookstores in '+c.name+'.',canonical:cityUrl,h1:'StudentHubHelp in '+c.name,crumbs:[{name:c.name,url:cityUrl}],body,depth:1,about:[{'@type':'City','name':c.name,'containedInPlace':{'@type':'State','name':'Rajasthan'}}]}));

  for(const meta of TABLES){
    const rows=c.rows.filter(r=>r.type===meta.type); if(!rows.length) continue;
    const dir=cityDir+'/'+meta.type; const url=new URL(cs+'/'+meta.type+'/',BASE).href;
    const relatedCoachings=[...new Set(rows.flatMap(matchedCoachings))];
    const relatedCoachingLinks=relatedCoachings.map(s=>{const m=coachingBySlug(s);return '<a href="'+esc('../coaching/'+m.slug+'/')+'">🎓 '+esc(m.name)+'</a>';}).join('');
    const coachingContext=relatedCoachingLinks?'<section class="section"><h2>Nearby coaching & study locations</h2><div class="links">'+relatedCoachingLinks+'</div></section>':'';
    const body='<section class="section"><h2>'+esc(meta.label)+' in '+esc(c.name)+'</h2><div class="grid">'+rows.map(r=>card(r,2)).join('')+'</div></section>'+coachingContext+
      '<section class="section"><a href="'+esc(rel(2,cityUrl))+'">← Back to '+esc(c.name)+'</a> · <a href="'+esc(rel(2,new URL(meta.finder,BASE).href))+'">Open '+esc(meta.label)+' Finder</a></section>';
    const p=dir+'/index.html'; expected.add(p); generated.push(url);
    await write(p,shell({title:meta.label+' in '+c.name+' | StudentHubHelp',description:'Browse verified and active '+meta.label.toLowerCase()+' in '+c.name+' on StudentHubHelp.',canonical:url,h1:meta.label+' in '+c.name,crumbs:[{name:c.name,url:cityUrl},{name:meta.label,url}],body,depth:3,about:[{'@type':'City','name':c.name},{'@type':'Thing','name':meta.label}]}));
  }

  const areas=new Map();
  for(const r of c.rows){if(!r.area)continue;const ak=key(r.area);if(!areas.has(ak))areas.set(ak,{name:r.area,rows:[]});areas.get(ak).rows.push(r);}
  for(const a of areas.values()){
    if(a.rows.length<LOCATION_MIN_PROPERTIES) continue;
    const as=slug(a.name); if(!as || as===cs) continue;
    const dir=cityDir+'/'+as; const url=new URL(cs+'/'+as+'/',BASE).href;
    const groupLinks=[...new Set(a.rows.map(r=>r.type))].map(type=>{const m=TABLES.find(x=>x.type===type);return '<a href="'+esc('../'+type+'/' )+'">'+m.icon+' '+esc(m.label)+'</a>';}).join('');
    const areaCoachingSlugs=[...new Set(a.rows.flatMap(matchedCoachings))];
    const areaCoachingLinks=areaCoachingSlugs.map(s=>{const m=coachingBySlug(s);return '<a href="'+esc('../coaching/'+m.slug+'/')+'">🎓 '+esc(m.name)+'</a>';}).join('');
    const areaCoachingSection=areaCoachingLinks?'<section class="section"><h2>Nearby coaching & institutes</h2><p>Coaching relationships are derived only when the coaching name is present in active verified listing data.</p><div class="links">'+areaCoachingLinks+'</div></section>':'';
    const body='<section class="section"><h2>Verified student properties in '+esc(a.name)+', '+esc(c.name)+'</h2><div class="grid">'+a.rows.map(r=>card(r,2)).join('')+'</div></section>'+areaCoachingSection+
      '<section class="section"><h2>Categories</h2><div class="links">'+groupLinks+'</div></section>'+
      '<p><a href="'+esc(rel(2,cityUrl))+'">← Back to '+esc(c.name)+'</a></p>';
    const p=dir+'/index.html'; expected.add(p); generated.push(url);
    await write(p,shell({title:'Student Properties in '+a.name+', '+c.name+' | StudentHubHelp',description:'Explore verified and active student-focused properties around '+a.name+', '+c.name+'.',canonical:url,h1:'Student Properties in '+a.name+', '+c.name,crumbs:[{name:c.name,url:cityUrl},{name:a.name,url}],body,depth:3,about:[{'@type':'Place','name':a.name,'containedInPlace':{'@type':'City','name':c.name}}]}));
  }

  for(const coachSlug of cityCoachingSlugs){
    const coach=coachingBySlug(coachSlug); if(!coach) continue;
    const rows=c.rows.filter(r=>matchedCoachings(r).includes(coachSlug)); if(!rows.length) continue;
    const dir=cityDir+'/coaching/'+coach.slug;
    const url=new URL(cs+'/coaching/'+coach.slug+'/',BASE).href;
    const typeLinks=[...new Set(rows.map(r=>r.type))].map(type=>{const m=TABLES.find(x=>x.type===type);return '<a href="'+esc('../../'+type+'/')+'">'+m.icon+' '+esc(m.label)+'</a>';}).join('');
    const body='<section class="section"><h2>Student properties near '+esc(coach.name)+' in '+esc(c.name)+'</h2><p>These verified and active listings mention this coaching or institute in their stored name, area, or address.</p><div class="grid">'+rows.map(r=>card(r,3)).join('')+'</div></section><section class="section"><h2>Categories</h2><div class="links">'+typeLinks+'</div></section><p><a href="'+esc(rel(3,cityUrl))+'">← Back to '+esc(c.name)+'</a></p>';
    const p=dir+'/index.html'; expected.add(p); generated.push(url);
    await write(p,shell({title:'Student Properties near '+coach.name+' in '+c.name+' | StudentHubHelp',description:'Find verified and active student-focused hostels, tiffins, cafes, libraries and bookstores near '+coach.name+' in '+c.name+'.',canonical:url,h1:'Student Properties near '+coach.name+' in '+c.name,crumbs:[{name:c.name,url:cityUrl},{name:coach.name,url}],body,depth:3,about:[{'@type':'EducationalOrganization','name':coach.name},{'@type':'City','name':c.name}]}));
  }
}

const uniqueGenerated = [...new Set(generated)];
await write('seo-generated-manifest.json', JSON.stringify({generated: uniqueGenerated, expected:[...expected]}, null, 2)+'\n');
console.log(JSON.stringify({verifiedActiveProperties:all.length,cities:cities.size,generatedPages:generated.length,locationThreshold:LOCATION_MIN_PROPERTIES},null,2));
