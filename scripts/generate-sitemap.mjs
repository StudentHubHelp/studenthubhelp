import { writeFile } from 'node:fs/promises';

const BASE='https://studenthubhelp.github.io/studenthubhelp/';
const SUPABASE_URL=process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY=process.env.SUPABASE_ANON_KEY;
const TABLES={
  hostel:'hostels',
  tiffin:'tiffins',
  library:'libraries',
  cafe:'cafes',
  bookstore:'bookstores'
};

if(!SUPABASE_URL||!SUPABASE_ANON_KEY) throw new Error('Missing Supabase public API configuration.');

function esc(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
function validDate(value){const d=new Date(value);return Number.isNaN(d.getTime())?null:d.toISOString()}
function recordUrl(type,row){
  const id=String(row.slug??'').trim()||String(row.id??'').trim()||String(row.property_id??'').trim();
  if(!id) return null;
  const u=new URL('property-details.html',BASE);
  u.searchParams.set('type',type);
  if(String(row.slug??'').trim()) u.searchParams.set('slug',String(row.slug).trim());
  else u.searchParams.set('id',id);
  return u.href;
}
async function fetchTable(table){
  const rows=[];
  const pageSize=1000;
  for(let offset=0;offset<50000;offset+=pageSize){
    const url=new URL(`${SUPABASE_URL.replace(/\/$/,'')}/rest/v1/${table}`);
    url.searchParams.set('select','*');
    url.searchParams.set('offset',String(offset));
    url.searchParams.set('limit',String(pageSize));
    const res=await fetch(url,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}});
    if(!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    const batch=await res.json();
    if(!Array.isArray(batch)||batch.length===0) break;
    rows.push(...batch);
    if(batch.length<pageSize) break;
  }
  return rows;
}

const urls=new Map();
const add=(loc,lastmod,changefreq='daily',priority='0.7')=>{if(!urls.has(loc)||lastmod>urls.get(loc).lastmod)urls.set(loc,{loc,lastmod,changefreq,priority})};
add(BASE,null,'weekly','1.0');
for(const [type] of Object.entries(TABLES)) add(new URL(`${type==='hostel'?'pg':type}-finder.html`,BASE).href,null,'daily','0.9');

for(const [type,table] of Object.entries(TABLES)){
  const rows=await fetchTable(table);
  for(const row of rows){
    const loc=recordUrl(type,row);
    if(!loc) continue;
    const lastmod=validDate(row.updated_at||row.modified_at||row.created_at);
    add(loc,lastmod,'weekly','0.8');
  }
}

const body=[...urls.values()].map(x=>`  <url><loc>${esc(x.loc)}</loc>${x.lastmod?`<lastmod>${x.lastmod}</lastmod>`:''}<changefreq>${x.changefreq}</changefreq><priority>${x.priority}</priority></url>`).join('\n');
const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
await writeFile('sitemap.xml',xml,'utf8');
console.log(`Generated sitemap.xml with ${urls.size} URLs.`);
