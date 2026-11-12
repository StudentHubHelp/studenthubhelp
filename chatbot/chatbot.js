(function(){
'use strict';
if(window.__SHH_CHATBOT_V1__) return;
window.__SHH_CHATBOT_V1__ = true;

const CFG = {
  url:'https://idurlccrarznnnqixxsd.supabase.co',
  anon:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdXJsY2NyYXJ6bm5ucWl4eHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5ODY3NTgsImV4cCI6MjEwMzU2Mjc1OH0.pq_rza98twL-SETqm_6TGNzsPCkVJxwjocFUeLB1yMA',
  categories:{
    hostel:{table:'hostels',label:'Hostel / PG',icon:'🏠',banner:'/hostel-banner.png',aliases:['hostel','hostals','hostal','pg','paying guest','accommodation','room','rooms','हॉस्टल','पीजी']},
    tiffin:{table:'tiffins',label:'Tiffin / Mess',icon:'🍱',banner:'/tiffin-banner.png',aliases:['tiffin','tifin','mess','dabba','food service','meal','टिफिन','मेस']},
    library:{table:'libraries',label:'Library',icon:'📚',banner:'/library-banner.png',aliases:['library','libraries','reading room','study room','self study','लाइब्रेरी','पुस्तकालय']},
    cafe:{table:'cafes',label:'Cafe',icon:'☕',banner:'/cafe-banner.png',aliases:['cafe','cafes','café','coffee shop','कैफे','कॉफी']},
    bookstore:{table:'bookstores',label:'Book Store',icon:'📖',banner:'/bookstore-banner.png',aliases:['bookstore','book store','book shop','bookshop','stationery','books','किताब','स्टेशनरी']}
  },
  contactEmail:'support@studenthubhelp.in',
  instagram:'https://www.instagram.com/studenthubhelp/',
  supportUrl:'/contact-us.html'
};
const $ = (s,root=document)=>root.querySelector(s);
const esc = v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = v=>String(v==null?'':v).toLocaleLowerCase('en-IN').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\brd\b/g,'road').replace(/\s+/g,' ').trim();
const words = s=>norm(s).split(' ').filter(Boolean);
let chatbotDb=null,sessionUser=null,profile=null,cacheRows=null,cacheRowsAt=0,cacheGallery=null,cacheErrors={},activeSearch=null,history=[];
let sdkPromise=null;
let chatSession=null;
const CHAT_SESSION_KEY='shh-chat-session-v2';
const CHAT_CONTEXT_KEY='shh-chat-context-v2';
const CHAT_HISTORY_KEY='shh-chat-history-v2';
function makeUuid(){
  try{if(window.crypto?.randomUUID)return window.crypto.randomUUID();}catch(e){}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16);});
}
function getChatSession(){
  if(chatSession)return chatSession;
  try{
    const saved=JSON.parse(localStorage.getItem(CHAT_SESSION_KEY)||'null');
    const expired=!saved||!saved.conversationId||!saved.visitorId||Date.now()-Number(saved.lastActivity||0)>86400000;
    chatSession=expired?{conversationId:makeUuid(),visitorId:makeUuid(),lastActivity:Date.now()}:saved;
    chatSession.lastActivity=Date.now();
    localStorage.setItem(CHAT_SESSION_KEY,JSON.stringify(chatSession));
  }catch(e){chatSession={conversationId:makeUuid(),visitorId:makeUuid(),lastActivity:Date.now()};}
  return chatSession;
}
function saveConversationContext(){
  try{
    const a=activeSearch;
    if(!a){localStorage.removeItem(CHAT_CONTEXT_KEY);return;}
    localStorage.setItem(CHAT_CONTEXT_KEY,JSON.stringify({
      category:a.category,query:a.query,cityName:a.cityName||a.city||null,areaName:a.areaName||a.area||null,
      gender:a.gender||null,budget:a.budget??null,facilities:Array.isArray(a.facilities)?a.facilities:[],
      offset:Number(a.offset)||0,updatedAt:Date.now()
    }));
  }catch(e){}
}
function saveHistory(role,content){
  try{history.push({role,content:String(content||'').slice(0,3000),at:Date.now()});history=history.slice(-20);localStorage.setItem(CHAT_HISTORY_KEY,JSON.stringify(history));}catch(e){}
}
function restoreHistory(){
  try{const saved=JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY)||'[]');if(Array.isArray(saved))history=saved.filter(x=>x&&Date.now()-Number(x.at||0)<86400000).slice(-20);}catch(e){history=[];}
}
function isContextFollowUp(q){
  const n=norm(q);
  return /^(aur|and|also|same|waha|wahaan|there|it|usme|isme|what about|how much|kitna|kitne|price|fees?|timing|hours|menu|delivery|seats?|rent|deposit|wifi|ac|food|facility|facilities|boys|girls|under|budget|\d{3,})\b/.test(n)
    || /\b(what about|how much|aur batao|same area|usi area|wahi)\b/.test(n);
}
function lastConversationCategory(){
  for(let i=history.length-1;i>=0;i--){if(history[i].role==='user'){const cat=categoryOf(history[i].content);if(cat)return cat;}}
  return null;
}
function restoreConversationContext(){
  try{
    const saved=JSON.parse(localStorage.getItem(CHAT_CONTEXT_KEY)||'null');
    if(!saved||Date.now()-Number(saved.updatedAt||0)>86400000)return;
    activeSearch={category:saved.category,query:saved.query||'',city:saved.cityName||null,cityName:saved.cityName||null,
      area:saved.areaName||null,areaName:saved.areaName||null,gender:saved.gender||null,budget:saved.budget??null,
      facilities:Array.isArray(saved.facilities)?saved.facilities:[],offset:Number(saved.offset)||0,results:[]};
  }catch(e){}
}
function classifyIntent(q){
  const n=norm(q),cat=categoryOf(q);
  if(/\b(book|booking|reservation|cancel|refund|payment)\b/.test(n))return 'booking_support';
  if(/\b(my profile|my account|meri profile|mera account|my booking|my listing|status)\b/.test(n))return 'account_support';
  if(cat&&/\b(price|rate|fees?|timing|hours|menu|delivery|seats?|facilit|wifi|ac|food|rent|deposit|books?|stationery)\b/.test(n))return 'category_faq';
  if(cat||/\b(show|dikhao|find|search|near|nearby|options?)\b/.test(n))return 'listing_search';
  if(/\b(complaint|complain|feedback|suggestion|contact|help|support)\b/.test(n))return 'general_support';
  return 'general_question';
}
function plainChatText(value){
  return String(value||'')
    .replace(/<br\s*\/?\s*>/gi,'\n')
    .replace(/<\/(?:p|div|li)>/gi,'\n')
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi,'$2 ($1)')
    .replace(/<[^>]*>/g,' ')
    .replace(/&nbsp;/g,' ')
    .replace(/&amp;/g,'&')
    .replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>')
    .replace(/\n[ \t]+/g,'\n')
    .trim();
}
async function logChatMessage(role,content,extra={}){
  try{
    const client=await getDb();
    const user=await getUser();
    const session=getChatSession();
    const context=activeSearch||{};
    const metadata={
      page_path:String(location.pathname||'').slice(0,240),
      search_city:context.cityName||context.city||null,
      search_area:context.areaName||context.area||null,
      search_gender:context.gender||null,
      search_budget:context.budget??null,
      search_facilities:Array.isArray(context.facilities)?context.facilities:[],
      result_count:Array.isArray(context.results)?context.results.length:null,
      ...extra
    };
    const {error}=await client.from('chatbot_messages').insert({
      conversation_id:session.conversationId,visitor_id:session.visitorId,user_id:user?.id||null,
      role,content:(role==='assistant'?plainChatText(content):String(content||'')).slice(0,12000),intent:role==='user'?classifyIntent(content):null,
      category:categoryOf(content)||context.category||null,metadata
    });
    if(error)console.warn('[SHH chatbot] transcript save failed:',error.message);
    session.lastActivity=Date.now();
    try{localStorage.setItem(CHAT_SESSION_KEY,JSON.stringify(session));}catch(e){}
  }catch(e){console.warn('[SHH chatbot] transcript save unavailable');}
}

function getExistingClient(){
  try{if(typeof dbClient!=='undefined'&&dbClient&&typeof dbClient.from==='function')return dbClient;}catch(e){}
  try{if(typeof supabaseClient!=='undefined'&&supabaseClient&&typeof supabaseClient.from==='function')return supabaseClient;}catch(e){}
  try{if(typeof db!=='undefined'&&db&&typeof db.from==='function')return db;}catch(e){}
  return null;
}
function loadSdk(){
  if(window.supabase&&typeof window.supabase.createClient==='function')return Promise.resolve();
  if(sdkPromise)return sdkPromise;
  sdkPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload=resolve;s.onerror=()=>reject(new Error('Supabase client library unavailable'));
    document.head.appendChild(s);
  });
  return sdkPromise;
}
async function getDb(){
  if(chatbotDb)return chatbotDb;
  const existing=getExistingClient();
  if(existing){chatbotDb=existing;return chatbotDb;}
  await loadSdk();
  if(!window.supabase?.createClient)throw new Error('Supabase client unavailable');
  chatbotDb=window.__SHH_CHATBOT_DB__||(window.__SHH_CHATBOT_DB__=window.supabase.createClient(CFG.url,CFG.anon,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}));
  return chatbotDb;
}
async function getUser(){
  const client=await getDb();
  let {data,error}=await client.auth.getSession();
  if(error)throw error;
  if(!data?.session && window.supabase?.createClient && client!==window.__SHH_CHATBOT_DB__){
    try{
      const authClient=window.__SHH_CHATBOT_AUTH_DB__||(window.__SHH_CHATBOT_AUTH_DB__=window.supabase.createClient(CFG.url,CFG.anon,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}));
      const authResult=await authClient.auth.getSession();
      if(authResult.data?.session){chatbotDb=authClient;data=authResult.data;error=authResult.error;}
    }catch(e){}
  }
  sessionUser=data?.session?.user||null;
  profile=null;
  if(sessionUser){
    const activeClient=chatbotDb||client;
    const p=await activeClient.from('profiles').select('id,full_name,email,role,status').eq('id',sessionUser.id).maybeSingle();
    if(!p.error)profile=p.data||null;
  }
  return sessionUser;
}
function categoryOf(q){
  const n=norm(q);
  for(const [key,c] of Object.entries(CFG.categories)){
    if(c.aliases.some(a=>n.includes(norm(a))))return key;
  }
  const tokens=words(n);
  const typoAliases={hostel:['hostle','hostal','hostals'],tiffin:['tifin','tifffin'],library:['libary','librrary'],cafe:['cafee','caffee'],bookstore:['bookstroe','bookstor']};
  for(const [key,aliases] of Object.entries(typoAliases)){
    if(aliases.some(a=>tokens.includes(a)))return key;
  }
  for(const [key,c] of Object.entries(CFG.categories)){
    const candidates=c.aliases.map(norm).filter(a=>a.length>=5);
    if(tokens.some(token=>token.length>=5&&candidates.some(alias=>{
      const d=editDistance(token,alias);
      return d<=1||(token.length>=8&&d<=2);
    })))return key;
  }
  return null;
}
function genderOf(q){
  const n=norm(q);
  if(/\b(girls?|female|ladies|women|ladki|ladkiyan|mahila)\b|लड़क|महिला/.test(n))return 'girls';
  if(/\b(boys?|male|gents|men|ladka|ladke|ladkon)\b|लड़कों|पुरुष/.test(n))return 'boys';
  return null;
}
function budgetOf(q){
  const rawCurrency=String(q||'').match(/(?:₹|rs\.?\s*)(\d[\d,]*(?:\.\d+)?)\s*(k|thousand)?/i);
  if(rawCurrency){let amount=Number(rawCurrency[1].replace(/,/g,''));if(rawCurrency[2])amount*=1000;return Number.isFinite(amount)&&amount>0?amount:null;}
  const n=norm(q);
  const suffix=n.match(/(?:^|\s)(\d[\d,]*(?:\.\d+)?)\s*(k|thousand)\b/i);
  if(suffix){let amount=Number(suffix[1].replace(/,/g,''));if(suffix[2])amount*=1000;return Number.isFinite(amount)&&amount>0?amount:null;}
  const m=n.match(/(?:under|below|less than|upto|up to|within|budget|tak|maximum|max|₹|rs)\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand)?|(?:₹|rs\.?\s*)(\d[\d,]*(?:\.\d+)?)\s*(k|thousand)?/i);
  if(!m){
    const before=n.match(/(\d[\d,]*(?:\.\d+)?)\s*(k|thousand)?\s*(?:tak|under|below|max|maximum)/i);
    if(!before)return null;
    let v=Number(before[1].replace(/,/g,''));
    if(!Number.isFinite(v))return null;
    if(before[2])v*=1000;
    return v>0?v:null;
  }
  const raw=(m[1]||m[3]||'').replace(/,/g,'');
  let value=Number(raw);
  if(!Number.isFinite(value))return null;
  if((m[2]||m[4]||'').toLowerCase()==='k'||(m[2]||m[4]||'').toLowerCase()==='thousand')value*=1000;
  return value>0?value:null;
}
const FACILITY_TERMS={
  wifi:['wifi','wi fi','wi-fi','internet','वाईफाई'],
  ac:['ac','air conditioner','air conditioning'],
  food:['food','mess','meal','meals','khana','भोजन','खाना'],
  parking:['parking'],
  laundry:['laundry','washing machine'],
  security:['security','cctv'],
  attached_bathroom:['attached bathroom','attached washroom','attached bath'],
  geyser:['geyser','hot water'],
  power_backup:['power backup','backup'],
  charging_point:['charging point','charging'],
  locker:['locker'],
  girls_section:['girls section','girls area'],
  delivery:['home delivery','delivery'],
  open_24_hours:['24 hours','24 hour','24/7','24 ghante'],
  seating:['seating','seats','study seats'],
  girls_section:['girls section','girls area'],
  boys_section:['boys section','boys area'],
  stationery:['stationery'],
  photocopy:['photocopy','xerox'],
  book_rental:['book rental','rent books']
};
function requestedFacilities(q){
  const n=norm(q),out=[];
  for(const [key,terms] of Object.entries(FACILITY_TERMS))if(terms.some(t=>n.includes(norm(t))))out.push(key);
  return out;
}
function numberPrice(r,cat,query){
  const q=norm(query||'');
  let keys;
  if(cat==='hostel')keys=['monthly_rent','monthly_fee','price'];
  else if(cat==='tiffin')keys=/\bdaily\b|per day|roz|daily plan/.test(q)?['daily_plan','price','monthly_fee','monthly_plan']: /\bweekly\b|per week|hafta/.test(q)?['weekly_plan','price','monthly_fee','monthly_plan']:['monthly_plan','monthly_fee','price','weekly_plan','daily_plan'];
  else if(cat==='library')keys=/\bdaily\b|per day/.test(q)?['daily_fee','monthly_fee','price']:['monthly_fee','daily_fee','price'];
  else keys=['price','monthly_fee'];
  for(const k of keys){const v=Number(r?.[k]);if(Number.isFinite(v)&&v>0)return {value:v,label:k.includes('daily')?'per day':k.includes('weekly')?'per week':k.includes('monthly')?'per month':'listed price'};}
  const range=String(r?.monthly_rent_range||r?.price_range||'').trim();
  return range?{value:null,label:range}:null;
}
function rowPrice(r,query){
  return numberPrice(r,r.__category,query);
}
function genderMatch(r){
  const text=norm([r.type,r.category,r.name,r.description,r.rules].filter(Boolean).join(' '));
  if(/girls?|female|ladies|women|ladki|महिला|लड़कियों/.test(text))return 'girls';
  if(/boys?|male|gents|men|ladka|पुरुष|लड़कों/.test(text))return 'boys';
  if(/co.?ed|unisex|family/.test(text))return 'coed';
  return null;
}
function facilityValue(r,key){
  const direct=r?.[key];
  if(direct===true)return true;
  if(direct===false)return false;
  if(key==='ac'&&r?.ac_available===true)return true;
  if(key==='wifi'&&r?.wifi===true)return true;
  if(key==='food'&&(r?.food_available===true||r?.mess_available===true||r?.breakfast_available===true||r?.lunch_available===true||r?.dinner_available===true))return true;
  if(key==='delivery'&&(r?.delivery_available===true||r?.home_delivery===true||r?.delivery===true))return true;
  if(key==='seating'&&(Number(r?.seating_capacity)>0||Number(r?.available_seats)>0))return true;
  const text=norm([r?.facilities,r?.description,r?.menu,r?.features].filter(Boolean).join(' '));
  const terms=FACILITY_TERMS[key]||[key];
  if(terms.some(t=>text.includes(norm(t))))return true;
  return false;
}
function parseImages(r){
  const vals=[];
  if(r?.image)vals.push(String(r.image));
  if(Array.isArray(r?.images))vals.push(...r.images);
  else if(typeof r?.images==='string'){
    const raw=r.images.trim();
    if(raw.startsWith('[')){try{vals.push(...JSON.parse(raw));}catch(e){}}
    else if(raw)vals.push(...raw.split(/[\n,|]/).map(x=>x.trim()));
  }
  return vals.map(x=>typeof x==='string'?x:(x?.url||x?.image_url||'')).filter(x=>/^https?:\/\//i.test(x));
}
function rowSearchText(r){
  return norm([r.name,r.category,r.type,r.area,r.address,r.city,r.landmark,r.nearby_coaching,r.description,r.facilities].filter(Boolean).join(' '));
}
function namedListingMatches(rows,query,category){
  const n=norm(query);
  const filler=new Set(['ke','ka','ki','k','bare','baare','about','mein','me','batao','btao','bta','details','detail','info','information','kya','hai','he','please','mujhe','bta','btao','dikhao','show','find','search','the','for','of','tell','me']);
  const categoryWords=new Set(['hostel','hostals','hostal','pg','tiffin','tifin','mess','library','libraries','libary','cafe','cafes','cafee','bookstore','book','store','stationery']);
  const genderWords=new Set(['boy','boys','girl','girls','male','female']);
  const tokens=words(n).filter(t=>t.length>2&&!filler.has(t)&&!categoryWords.has(t)&&!genderWords.has(t)&&!/^\\d+$/.test(t));
  if(!tokens.length)return [];
  const candidates=rows.filter(r=>!category||r.__category===category).map(r=>{
    const nameWords=words(r.name||r.property_name||'');
    const locationWords=words([r.city,r.area].filter(Boolean).join(' '));
    const matched=tokens.filter(t=>nameWords.some(w=>w===t||w.includes(t)||(t.length>=5&&editDistance(w,t)<=1))||locationWords.includes(t));
    return {row:r,score:matched.length/tokens.length,matched:matched.length};
  }).filter(x=>x.matched===tokens.length).sort((a,b)=>b.score-a.score);
  if(!candidates.length)return [];
  const best=candidates[0].score;
  return candidates.filter(x=>x.score===best).map(x=>x.row);
}
function isNonLocationPhrase(value){
  const stop=new Set(['k','ke','ka','ki','bare','baare','about','details','detail','info','information','batao','btao','bta','hai','he','kya','please']);
  const parts=words(value);
  return !parts.length||parts.some(x=>stop.has(x));
}
async function loadRows(){
  // Refresh the active-only listing snapshot periodically so deactivated properties disappear promptly.
  if(cacheRows&&Date.now()-cacheRowsAt<30000)return cacheRows;
  const client=await getDb();
  const entries=Object.entries(CFG.categories);
  const results=await Promise.all(entries.map(async([key,c])=>{
    const {data,error}=await client.from(c.table).select('*').eq('status','active').limit(500);
    if(error){cacheErrors[key]=error.message;console.warn('[SHH chatbot] '+c.table+':',error.message);return [];}
    cacheErrors[key]=null;
    return (data||[]).map(r=>({...r,__category:key,__table:c.table}));
  }));
  cacheRows=results.flat();
  cacheRowsAt=Date.now();
  if(entries.every(([key])=>cacheErrors[key]))throw new Error('No public listing tables could be loaded');
  return cacheRows;
}
async function loadGallery(){
  if(cacheGallery)return cacheGallery;
  try{
    const client=await getDb();
    const {data,error}=await client.from('property_images').select('property_id,property_table,image_url,sort_order').order('sort_order',{ascending:true}).limit(1000);
    cacheGallery=error?[]:(data||[]);
  }catch(e){cacheGallery=[];}
  return cacheGallery;
}
function galleryImage(r,gallery){
  const row=(gallery||[]).find(x=>String(x.property_id)===String(r.id)&&String(x.property_table||'').toLowerCase()===String(r.__table).toLowerCase());
  return row?.image_url||parseImages(r)[0]||'';
}
function rowPrice(r){
  return numberPrice(r,r.__category);
}
function editDistance(a,b){
  const x=norm(a),y=norm(b);
  if(!x||!y)return 99;
  const dp=Array.from({length:x.length+1},(_,i)=>Array.from({length:y.length+1},(_,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=x.length;i++)for(let j=1;j<=y.length;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(x[i-1]===y[j-1]?0:1));
  return dp[x.length][y.length];
}
function matchSearch(rows,query,category,previous){
  const n=norm(query);
  const cityCandidates=[...new Set(rows.map(r=>String(r.city||'').trim()).filter(Boolean))].sort((a,b)=>b.length-a.length);
  const explicitCity=cityCandidates.find(x=>x.length>1&&n.includes(norm(x)))||null;
  // "Jhunjhnu me cafe" / "cafe in Jhunjhnu": extract the location phrase,
  // never the word following "me/in" (which is usually the category).
  const cityPhraseMatch=n.match(/^([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,2})\s+(?:mein|me)\b/)
    ||n.match(/\b(?:in|mein|me)\s+([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,2})$/i);
  const cityPhrase=cityPhraseMatch?.[1]?.trim()||null;
  const fuzzyCity=cityPhrase?cityCandidates
    .map(name=>({name,distance:editDistance(cityPhrase,name),length:norm(name).length}))
    .filter(x=>x.length>=5&&x.distance<=Math.max(1,Math.floor(x.length*0.22)))
    .sort((a,b)=>a.distance-b.distance||b.length-a.length)[0]?.name:null;
  const cityBase=explicitCity||fuzzyCity||null;
  const areaFields=r=>[r.area,r.landmark,r.nearby_coaching,r.address].filter(Boolean).map(String);
  const areaCandidates=[...new Set(rows.flatMap(areaFields).flatMap(v=>String(v).split(/[,;|/]/).map(x=>x.trim()).filter(Boolean)))].sort((a,b)=>b.length-a.length);
  const explicitArea=areaCandidates.find(x=>x.length>2&&n.includes(norm(x)))||null;
  const unknownAreaMatch=n.match(/(?:near|nearby|around|ke paas|paas)\s+([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,2})/i)
    ||(!cityBase?n.match(/([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,2})\s+(?:par|pr|pe|mein|me)\b/i):null);
  const rawAreaPhrase=unknownAreaMatch?.[1]?.trim()||(!cityBase?cityPhrase:null);
  const areaPhrase=rawAreaPhrase&&!isNonLocationPhrase(rawAreaPhrase)?rawAreaPhrase:null;
  const fuzzyArea=areaPhrase?areaCandidates.map(name=>({name,distance:editDistance(areaPhrase,name),length:norm(name).length}))
    .filter(x=>x.length>=5&&x.distance<=Math.max(1,Math.floor(x.length*0.22)))
    .sort((a,b)=>a.distance-b.distance||b.length-a.length)[0]?.name:null;
  const area=explicitArea||fuzzyArea||areaPhrase||previous?.areaName||null;
  const areaCityMatches=area?[...new Map(rows.filter(r=>areaFields(r).some(v=>norm(v).includes(norm(area)))).map(r=>[norm(r.city),String(r.city||'').trim()]).filter(([key,value])=>key&&value)).values()]:[];
  const areaCity=areaCityMatches.length===1?areaCityMatches[0]:null;
  const ambiguousAreaCity=Boolean(area&&!cityBase&&!previous?.cityName&&areaCityMatches.length>1);
  const city=cityBase||areaCity||previous?.cityName||null;
  const gender=genderOf(query)||previous?.gender||null;
  const budget=budgetOf(query)??previous?.budget??null;
  const requested=requestedFacilities(query);
  const facilities=requested.length?requested:(previous?.facilities||[]);
  let out=rows.filter(r=>r.__category===category);
  if(city)out=out.filter(r=>norm(r.city)===norm(city));
  if(gender)out=out.filter(r=>r.__category==='library'?(r[gender+'_section']===true||genderMatch(r)===gender):genderMatch(r)===gender);
  if(area){
    const a=norm(area);
    out=out.filter(r=>norm([r.area,r.landmark,r.nearby_coaching,r.address].filter(Boolean).join(' ')).includes(a));
  }
  if(budget!==null)out=out.filter(r=>{const p=rowPrice(r,query);return p&&p.value!==null&&p.value<=budget;});
  if(facilities.length)out=out.filter(r=>facilities.every(f=>facilityValue(r,f)));
  const tokens=words(query).filter(w=>w.length>2&&!/^\d+$/.test(w)&&!['hostel','hostals','girls','boys','dikhao','show','please','chahiye','mujhe','mein','me','ka','ki','ke','near','nearby','paas','budget','under','upto','tak','only','kar','do','badlo','change','more','aur','listings','next','with','and','for','the','from','in','all','want','need'].includes(w));
  const explicitLocation=/\b(?:near|nearby|around|road|area|par|pr|pe|mein|me)\b|ke paas|paas/.test(n);
  if(ambiguousAreaCity||(explicitLocation&&!city&&!explicitArea&&!unknownAreaMatch&&!previous?.areaName))out=[];
  else if(!city&&!area&&!gender&&!facilities.length&&tokens.length)out=out.filter(r=>{const h=rowSearchText(r);return tokens.some(t=>h.includes(t));});
  return {rows:out,city,area,gender,budget,facilities,cityName:city,areaName:area};
}
function detailsUrl(r){
  const type=r.__category,slug=String(r.slug||'').trim(),id=r.id;
  if(slug)return '/properties/'+encodeURIComponent(type)+'/'+encodeURIComponent(slug)+'/';
  return '/property-details.html?type='+encodeURIComponent(type)+'&id='+encodeURIComponent(id);
}
function facilitiesForCard(r){
  const list=[];
  const map={wifi:'Wi-Fi',ac:'AC',ac_available:'AC',food_available:'Food',mess_available:'Mess',attached_bathroom:'Attached Bathroom',parking:'Parking',laundry:'Laundry',security:'Security',cctv:'CCTV',power_backup:'Power Backup',charging_point:'Charging',locker:'Locker',delivery_available:'Delivery',home_delivery:'Home Delivery',delivery:'Delivery',takeaway:'Takeaway',open_24_hours:'24 Hours',girls_section:'Girls Section',boys_section:'Boys Section',stationery:'Stationery',photocopy:'Photocopy',printing:'Printing',second_hand_books:'Second-hand Books',book_rental:'Book Rental',jain_food:'Jain Food'};
  for(const [k,label] of Object.entries(map))if(r?.[k]===true&&!list.includes(label))list.push(label);
  if(r?.facilities){
    const parts=String(r.facilities).split(/[,;|\n]/).map(x=>x.trim()).filter(Boolean);
    for(const item of parts)if(!list.includes(item))list.push(item);
  }
  return list.slice(0,4);
}
function categoryDetails(r){
  const c=r.__category,items=[];
  const add=(label,value)=>{if(value!==undefined&&value!==null&&String(value).trim()!==''&&String(value).toLowerCase()!=='false')items.push(label+': '+String(value));};
  if(c==='hostel'){
    add('Room',r.room_sharing||(Array.isArray(r.room_types)?r.room_types.join(', '):r.room_types));
    if(Number(r.available_beds)>0)add('Seats',Number(r.available_beds)+' available');
    if(r.food_available===true||r.mess_available===true)add('Food',r.food_type||'Available');
    if(Number(r.security_deposit)>0)add('Deposit','₹'+Number(r.security_deposit).toLocaleString('en-IN'));
  }else if(c==='tiffin'){
    add('Meals',r.meal_type||[r.breakfast_available?'Breakfast':'',r.lunch_available?'Lunch':'',r.dinner_available?'Dinner':''].filter(Boolean).join(', '));
    add('Food',r.food_type);
    add('Plan',r.plan_type);
    if(r.delivery_available===true||r.home_delivery===true)add('Delivery','Available');
    if(r.jain_food===true)add('Jain Food','Available');
  }else if(c==='library'){
    add('Type',r.library_type);
    if(r.open_24_hours===true)add('Hours','24 hours');
    if(Number(r.available_seats)>0)add('Seats',Number(r.available_seats)+' available');
    if(r.girls_section===true)add('Section','Girls');
    if(r.boys_section===true)add('Section','Boys');
  }else if(c==='cafe'){
    add('Cuisine',r.cuisine);
    add('Price range',r.price_range);
    if(Number(r.seating_capacity)>0)add('Seating',Number(r.seating_capacity));
    add('Hours',[r.opening_time,r.closing_time].filter(Boolean).join(' – '));
    if(r.delivery===true||r.takeaway===true)add('Service',[r.delivery?'Delivery':'',r.takeaway?'Takeaway':''].filter(Boolean).join(', '));
  }else if(c==='bookstore'){
    add('Books',r.categories||r.classes);
    if(r.competitive_books===true||r.exam_books===true)add('Exam Books','Available');
    if(r.stationery===true)add('Service','Stationery');
    if(r.photocopy===true||r.printing===true)add('Print','Available');
    if(r.book_rental===true)add('Book Rental','Available');
  }
  return items.slice(0,3);
}
function cardHtml(r,gallery){
  const cfg=CFG.categories[r.__category],name=String(r.name||r.property_name||cfg.label),address=[r.address,r.area,r.city].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', ')||'Location details not provided';
  const p=rowPrice(r),verified=r.verified===true,gender=genderMatch(r),image=galleryImage(r,gallery)||cfg.banner;
  const phone=String(r.phone||'').replace(/[^\d+]/g,''),whatsapp=String(r.whatsapp||'').replace(/[^\d]/g,'');
  const chips=facilitiesForCard(r),details=categoryDetails(r);
  const price=p?(p.value!==null?'₹'+Math.round(p.value).toLocaleString('en-IN'):''):'';
  const rating=String(r.rating||'').trim();
  return '<article class="shh-chat-card"><img loading="lazy" decoding="async" src="'+esc(image)+'" alt="'+esc(name)+'" onerror="this.onerror=null;this.src=&#39;'+esc(cfg.banner)+'&#39;"><div class="shh-card-body"><div class="shh-card-top"><div class="shh-card-title">'+esc(name)+'</div><span class="shh-card-verified '+(verified?'':'shh-card-provided')+'">'+(verified?'✓ Verified':'Details Provided')+'</span></div>'+(price?'<div class="shh-card-price">'+esc(price)+' <small>'+esc(p.label)+'</small></div>':p?'<div class="shh-card-price">'+esc(p.label)+'</div>':'')+'<div class="shh-card-meta">📍 '+esc(address)+'</div>'+(gender?'<div class="shh-card-meta">👥 '+(gender==='girls'?'Girls':gender==='boys'?'Boys':'Co-ed')+'</div>':'')+(rating?'<div class="shh-card-meta">★ Rating: '+esc(rating)+'</div>':'')+(details.length?'<div class="shh-card-meta">'+details.map(esc).join(' · ')+'</div>':'')+(chips.length?'<div class="shh-card-chips">'+chips.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>':'')+'<div class="shh-card-actions"><a href="'+esc(detailsUrl(r))+'">View Details</a>'+(phone?'<a class="secondary" href="tel:'+esc(phone)+'">Call Owner</a>':whatsapp?'<a class="secondary" href="https://wa.me/'+esc(whatsapp)+'" target="_blank" rel="noopener">WhatsApp</a>':'<a class="secondary" href="'+esc(detailsUrl(r))+'">Contact Info</a>')+'</div></div></article>';
}
function addMessage(container,text,who='bot',extra=''){
  const wrap=document.createElement('div');wrap.className='shh-chat-message '+(who==='user'?'shh-user':'');
  wrap.innerHTML='<div class="shh-chat-bubble">'+text+'</div>'+extra;
  container.appendChild(wrap);container.scrollTop=container.scrollHeight;return wrap;
}
function quickMarkup(items){
  return '<div class="shh-chat-quick">'+items.map(x=>'<button type="button" data-shh-prompt="'+esc(x)+'">'+esc(x)+'</button>').join('')+'</div>';
}
function typing(container){
  const el=document.createElement('div');el.className='shh-chat-message';el.innerHTML='<span class="shh-chat-typing"><i></i><i></i><i></i></span>';container.appendChild(el);container.scrollTop=container.scrollHeight;return el;
}
function supportAnswer(q){
  const n=norm(q);
  if(/(?:how|kaise|kese|kes[e]?)\b.*\b(?:book|booking)\b|\b(?:book|booking)\b.*\b(?:kaise|kese|kare|kre|karu|karna|process)\b/.test(n)){
    return 'Hostel / PG book karne ka tarika:<br>1. <a href="/pg-finder.html">Hostel / PG Finder</a> kholen aur apni pasand ka hostel select karein.<br>2. Hostel ke details page par <b>Book Now</b> par click karein.<br>3. Booking form mein <b>Joining Date</b> aur <b>Duration</b> select karein.<br>4. Login karein (agar pehle se login nahi hain), phir <b>Confirm Booking Request</b> dabayein.<br>5. Request <b>Pending</b> status mein save hogi. Owner/admin ke response ke baad status update hoga; request submit hona confirmed room ya payment ki guarantee nahi hai.<br><br><a href="/pg-finder.html">Hostel Finder kholen</a>.';
  }
  // Category-wise everyday help: answer guidance questions without hijacking listing searches.
  const helpCategory=categoryOf(q)||activeSearch?.category||(isContextFollowUp(q)?lastConversationCategory():null);
  const asksHow=/\b(how|kaise|kese|kes[e]?|kya|what|which|where|when|kitna|kitne|kab|kahan|kaun|can i|do you|does|is there|available|milta|milti|milega|milengi|chahiye|batao|samjhao)\b/.test(n);
  const asksInfo=/\b(price|rate|fees?|charges?|cost|timing|time|hours|open|close|menu|food|meal|delivery|seating|seat|books?|stationery|photocopy|xerox|printing|rental|rent|facilit|feature|detail|contact|number|location|address|payment|refund|cancel|plan|monthly|daily|weekly|veg|non.?veg|jain|wifi|ac|parking|washroom|bathroom|security|rules?)\b/.test(n);
  const isSearchRequest=/\b(show|dikhao|find|search|listings?|options?|suggest|recommend|near|nearby)\b|ke paas|\bpaas\b/.test(n);
  if(helpCategory && (asksHow || asksInfo) && !isSearchRequest){
    const label=CFG.categories[helpCategory].label;
    const common='Aap chatbot se city/area ke saath category ka naam likhkar active listings search kar sakte hain, jaise <b>"Sikar mein '+label+' dikhao"</b>. Listing card par jo price, address, facilities aur contact details available hongi, wahi dikhengi. Jis detail ka record nahi hai, main uska guess nahi karunga.';
    if(helpCategory==='tiffin'){
      if(/delivery|home delivery|deliver/.test(n))return 'Tiffin/Mess listing mein delivery ya home-delivery ki detail tabhi confirm mani jayegi jab listing par delivery available dikhaya gaya ho. Aap <b>"Sikar mein tiffin with delivery dikhao"</b> likhkar search karein. '+common;
      if(/menu|meal|food|breakfast|lunch|dinner|veg|non.?veg|jain/.test(n))return 'Tiffin/Mess ke menu, meal type (breakfast/lunch/dinner), veg/Jain food aur food details listing ke available record ke hisaab se dikhte hain. Har provider ka menu same nahi hota; missing menu ko main assume nahi karunga. '+common;
      if(/price|rate|fees?|charges?|cost|monthly|daily|weekly|plan|kitna|kitne/.test(n))return 'Tiffin/Mess ka price plan ke hisaab se alag ho sakta hai—daily, weekly ya monthly. Chatbot listing mein saved price/plan hi dikhata hai. Aap <b>"Kota mein tiffin 3000 tak dikhao"</b> jaise query se budget filter kar sakte hain. '+common;
      return 'Tiffin/Mess ke liye aap meal type, veg/Jain food, delivery aur daily/weekly/monthly plan ke baare mein pooch sakte hain. Exact details har active listing ke saved data se hi batayi jayengi. '+common;
    }
    if(helpCategory==='library'){
      if(/timing|time|hours|open|close|kab/.test(n))return 'Library ki opening/closing timing ya 24-hour availability tabhi bata sakta hoon jab ye detail listing mein di gayi ho. Aap <b>"Jaipur mein 24 hours library dikhao"</b> likhkar search karein; card par available timing/seat details dekhein. '+common;
      if(/seat|seating|capacity|girls|boys|section/.test(n))return 'Library ki available seats aur girls/boys section ki information listing mein record hone par hi dikhayi jayegi. Seat availability badal sakti hai, isliye visit se pehle listing par diye contact se confirm karein. '+common;
      if(/price|rate|fees?|charges?|cost|monthly|daily|kitna/.test(n))return 'Library fees daily ya monthly ho sakti hai. Chatbot listing mein saved daily/monthly fee hi dikhata hai; missing fee ka estimate nahi banata. Aap <b>"Jaipur mein library 1000 tak dikhao"</b> likhkar budget search kar sakte hain. '+common;
      return 'Library ke liye aap timing, daily/monthly fee, available seats, girls/boys section aur study facilities ke baare mein pooch sakte hain. Sirf listing mein di gayi details confirm mani jayengi. '+common;
    }
    if(helpCategory==='cafe'){
      if(/menu|food|coffee|tea|cuisine|veg|non.?veg|jain/.test(n))return 'Cafe ka menu, cuisine aur food options tabhi confirm bata sakta hoon jab listing mein ye details di gayi hon. Aap <b>"Piprali Road par cafe dikhao"</b> ya city ke saath cafe search karein; card ke details/contact se menu confirm karein. '+common;
      if(/timing|time|hours|open|close|kab/.test(n))return 'Cafe ki opening/closing timing listing mein available hone par card par dikhayi jayegi. Live open/closed status har cafe ke liye verify nahi hota, isliye jaane se pehle listed contact par timing confirm karein. '+common;
      if(/seat|seating|capacity|delivery|takeaway/.test(n))return 'Cafe ki seating capacity, delivery ya takeaway option listing mein record hone par hi confirm hoga. Aap <b>"Sikar mein seating wale cafes dikhao"</b> jaise query se search kar sakte hain. '+common;
      if(/price|rate|fees?|charges?|cost|kitna|kitne/.test(n))return 'Cafe ka price menu aur item ke hisaab se badalta hai. Listing mein price range di ho toh card par dikhegi; exact menu price ke liye cafe se directly confirm karein. '+common;
      return 'Cafe ke liye aap cuisine/menu, price range, seating, opening hours, delivery aur takeaway ke baare mein pooch sakte hain. Main wahi detail confirm karunga jo listing mein saved hai. '+common;
    }
    if(helpCategory==='bookstore'){
      if(/stationery|photocopy|xerox|printing|print/.test(n))return 'Bookstore ki stationery, photocopy/Xerox aur printing services listing mein available dikhayi gayi hon tabhi confirm mani jayengi. Aap <b>"Kota mein stationery wali bookstore dikhao"</b> likhkar search karein. '+common;
      if(/book|books|textbook|exam|competitive|class|school|college|availability/.test(n))return 'Bookstore mein kaunsi books ya exam material available hai, ye listing ke categories/details par depend karta hai. Har title ka live stock chatbot verify nahi karta; specific book ke liye store ke listed contact par availability confirm karein. '+common;
      if(/price|rate|fees?|charges?|cost|kitna|kitne/.test(n))return 'Books aur stationery ke prices item, edition aur stock ke hisaab se alag hote hain. Chatbot kisi specific book ka live price/stock assume nahi karta; listing ke contact se confirm karein. '+common;
      return 'Bookstore ke liye aap textbooks, competitive exam books, stationery, photocopy/Xerox, printing aur book rental ke baare mein pooch sakte hain. Exact availability store se confirm karni hogi. '+common;
    }
    if(helpCategory==='hostel'){
      if(/price|rent|fees?|charges?|deposit|kitna|kitne|monthly/.test(n))return 'Hostel/PG ka rent room type aur listing ke hisaab se alag hota hai. Card par saved rent, deposit aur room details hi dikhengi. Aap <b>"Sikar mein boys hostel 6000 tak dikhao"</b> likhkar budget filter kar sakte hain. '+common;
      if(/facility|feature|wifi|food|ac|parking|laundry|washroom|bathroom|security|rule/.test(n))return 'Hostel/PG ki Wi-Fi, food, AC, parking, laundry, washroom aur security details listing mein record hone par hi confirm hongi. Aap required facility ke saath city/area likhkar search karein. '+common;
      return 'Hostel/PG ke liye rent, room sharing, girls/boys, facilities, food aur booking process ke baare mein pooch sakte hain. '+common;
    }
  }
  if(/complaint|complain|report issue|report a problem|shikayat|शिकायत/.test(n)){
    return 'Main aapki problem samajh sakta hoon. Abhi chatbot ke liye dedicated complaint-submission table/workflow verify nahi hua hai, isliye main fake ticket create nahi karunga. Aap <a href="/contact-us.html">Contact Us</a> page se issue bhej sakte hain ya <a href="mailto:'+CFG.contactEmail+'?subject=StudentHubHelp%20Support%20Issue">support email</a> par details bhej sakte hain.';
  }
  if(/contact|email|phone|instagram|director|sampark|संपर्क/.test(n)){
    return 'Aap StudentHubHelp support se yahan contact kar sakte hain:<br><b>Email:</b> <a href="mailto:'+CFG.contactEmail+'">'+CFG.contactEmail+'</a><br><b>Instagram:</b> <a href="'+CFG.instagram+'" target="_blank" rel="noopener">studenthubhelp</a><br><a href="'+CFG.supportUrl+'">Contact Us page kholen</a>.';
  }
  if(/appointment|consultation|meeting|schedule a call|समय लेना/.test(n)){
    return 'Aap StudentHubHelp team ke saath discussion ke liye <a href="/appointment.html">Appointment Request page</a> use kar sakte hain. Request submit hone ke baad team review karke confirmation degi.';
  }
  if(/feedback|suggestion|idea|sujhav|प्रतिक्रिया/.test(n)){
    return 'Aapka feedback welcome hai. Apna suggestion <a href="/contact-us.html">Contact Us</a> page ya support email ke through share karein.';
  }
  if(/add listing|listing add|property add|list kar|register property|अपनी प्रॉपर्टी/.test(n)){
    return 'Apni property ya service submit karne ke liye <a href="/add-listing.html">Add Listing page</a> kholen. Form submit hone ke baad listing admin review ke liye jaati hai.';
  }
  if(/login|sign in|password|account|लॉग.?इन/.test(n)){
    return 'Login ya account help ke liye <a href="/auth.html">Login / Register page</a> kholen. Password ya OTP chat mein share na karein.';
  }
  if(/student support|safety|safe|transport|pickup|drop|girl student|महिला सुरक्षा/.test(n)){
    return 'Student safety, transport aur new-city guidance ke liye <a href="/student-support.html">Student Support page</a> dekhein. Emergency mein local emergency services se seedha sampark karein.';
  }
  if(/booking|book kar|reservation|cancel|cancellation|payment|refund|owner call|phone nahi/.test(n)){
    return 'StudentHubHelp par booking request ka status property owner/admin ke response par depend karta hai. Main aapki apni saved booking ka status login ke baad check kar sakta hoon. Nayi booking ke liye relevant property ke details/finder page par booking option use karein. Payment, OTP, UPI PIN ya password yahan share na karein.';
  }
  if(/verified|verification|badge|trust/.test(n)){
    return 'Green “Verified” badge sirf un listings par dikhaya jata hai jinka admin verification record true hai. “Details Provided” ka matlab listing details submit hui hain; iska matlab verified nahi hai.';
  }
  if(/how|kaise|website|use|search|find|kahan|where|help|madad|guide/.test(n)){
    return 'Main aapko listings search, property details, Add Listing, login, student support aur contact options mein guide kar sakta hoon. Aap apna sawal natural Hindi, Hinglish ya English mein pooch sakte hain.';
  }
  return null;
}
async function myProfile(){
  const user=await getUser();if(!user)return {login:true};
  return {user,profile};
}
async function myBookings(){
  const user=await getUser();if(!user)return {login:true};
  const client=await getDb();
  const {data,error}=await client.from('student_bookings').select('id,property_id,property_table,property_name,category,status,created_at,joined_date,left_date').eq('student_id',user.id).order('created_at',{ascending:false}).limit(8);
  if(error)throw error;
  return {rows:data||[]};
}
async function myListings(){
  const user=await getUser();if(!user)return {login:true};
  const client=await getDb();
  const {data,error}=await client.from('listing_requests').select('id,name,category,city,area,status,admin_note,created_at,updated_at').eq('owner_id',user.id).order('created_at',{ascending:false}).limit(8);
  if(error)throw error;
  return {rows:data||[]};
}
function statusText(s){
  const x=norm(s);
  if(x==='active'||x==='approved'||x==='confirmed')return 'Approved / Active';
  if(x==='pending')return 'Pending review';
  if(x==='rejected')return 'Rejected';
  if(x==='completed')return 'Completed';
  if(x==='cancelled')return 'Cancelled';
  return s||'Status unavailable';
}
async function processMessage(q,container){
  const n=norm(q);
  if(/my profile|my account|meri profile|mera account|profile details|मेरा अकाउंट|मेरी प्रोफाइल/.test(n)){
    const result=await myProfile();
    if(result.login)return 'Aapki personal profile details dekhne ke liye pehle <a href="/auth.html">login</a> karein.';
    const p=result.profile||{};
    return 'Aap login hain. 👋<br><b>Name:</b> '+esc(p.full_name||'Name not added')+'<br><b>Email:</b> '+esc(p.email||result.user.email||'Not available')+'<br><b>Account role:</b> '+esc(p.role||'Not available')+'<br><a href="/student-dashboard.html">Open your dashboard</a>.';
  }
  if(/booking issue|booking problem|booking confirm|owner not responding|owner call|payment issue|refund|cancel my booking|booking cancel/.test(n)){
    const result=await myBookings();
    if(result.login)return 'Booking issue ko account ke saath check karne ke liye pehle <a href="/auth.html">login</a> karein. Login ke baad main aapki apni booking ka current status dekh sakta hoon.';
    if(!result.rows.length)return 'Aapke account mein abhi koi booking record nahi mila. Agar aapne request bheji hai, confirm karein ki aap usi account se login hain. Zarurat ho toh <a href="/contact-us.html">support team</a> se sampark karein.';
    return 'Main aapki latest booking records check kar raha hoon. <br>'+result.rows.slice(0,5).map(r=>'• <b>'+esc(r.property_name)+'</b> — '+esc(statusText(r.status))+' <small>(#'+esc(r.id)+')</small>').join('<br>')+'<br><br>Chatbot booking/payment ko khud confirm, cancel ya refund nahi karta. Status update ke liye property owner ya <a href="/contact-us.html">StudentHubHelp support</a> se contact karein. OTP, UPI PIN ya password share na karein.';
  }
  if(/my booking|my bookings|meri booking|meri booking ka|booking status|booking kaha|बुकिंग स्टेटस/.test(n)){
    const result=await myBookings();
    if(result.login)return 'Aapki private booking details dikhane ke liye pehle <a href="/auth.html">login</a> karein.';
    if(!result.rows.length)return 'Aapke account mein abhi koi booking record nahi mila. Agar aapne booking request bheji thi, login account verify karke dobara check karein.';
    return 'Aapki latest booking records:<br>'+result.rows.map(r=>'• <b>'+esc(r.property_name)+'</b> — '+esc(statusText(r.status))+' <small>(#'+esc(r.id)+')</small>').join('<br>')+'<br><br>Booking status owner/admin update ke baad badal sakta hai.';
  }
  if(/my listing|my listings|meri listing|listing status|listing approve|approve hui|meri property|लिस्टिंग स्टेटस/.test(n)){
    const result=await myListings();
    if(result.login)return 'Aapki listing request ka private status dekhne ke liye <a href="/auth.html">login</a> karein.';
    if(!result.rows.length)return 'Aapke account se linked koi listing request nahi mili. Agar aapne kisi doosre account se submit ki thi, us account se login karein.';
    return 'Aapki latest listing requests:<br>'+result.rows.map(r=>'• <b>'+esc(r.name)+'</b> — '+esc(statusText(r.status))+(r.admin_note?'<br>Admin note: '+esc(r.admin_note):'')).join('<br>')+'<br><br>Ye status Supabase ke current record se read kiya gaya hai.';
  }
  // Resolve named property questions from active Supabase rows before generic FAQ replies.
  const namedCategory=categoryOf(q);
  const asksNamedProperty=/(?:\b(?:bare|baare|about|details?|info|information)\b|ke\s+bare)/.test(n);
  if(namedCategory&&asksNamedProperty){
    const liveRows=await loadRows();
    if(cacheErrors[namedCategory])throw new Error('Unable to read '+CFG.categories[namedCategory].table);
    const liveNamedMatches=namedListingMatches(liveRows,q,namedCategory);
    if(liveNamedMatches.length){
      activeSearch={category:namedCategory,query:q,cityName:null,areaName:null,city:null,area:null,gender:null,budget:null,facilities:[],results:liveNamedMatches,offset:0};saveConversationContext();
      const liveGallery=await loadGallery();
      const intro=liveNamedMatches.length===1?'Mujhe aapki maangi hui active listing mil gayi. Ye rahi uski available details:':'Is naam se ye matching active listings mili hain. Aap sahi property select kar sakte hain:';
      return intro+liveNamedMatches.slice(0,5).map(r=>cardHtml(r,liveGallery)).join('')+(liveNamedMatches.length>5?quickMarkup(['Aur listings dikhao']):'');
    }
  }
  const support=supportAnswer(q);
  if(support)return support;
  if(/more|aur listings|next results|aur dikhao/.test(n)&&activeSearch?.category){
    if(!activeSearch.results?.length){
      const rows=await loadRows();
      const rebuilt=matchSearch(rows,activeSearch.query||'',activeSearch.category,activeSearch);
      activeSearch.results=rebuilt.rows;
    }
    const next=Number(activeSearch.offset||0)+4,shown=activeSearch.results.slice(next,next+4);
    if(!shown.length)return 'Is search ke saare matching results dikhaye ja chuke hain. Aap filters badal kar nayi search kar sakte hain.';
    activeSearch.offset=next;saveConversationContext();
    const gallery=await loadGallery();
    return shown.map(r=>cardHtml(r,gallery)).join('')+(activeSearch.results.length>next+4?quickMarkup(['Aur listings dikhao']):'');
  }
  if(/budget badlo|change budget/.test(n))return 'Aapka naya maximum budget kitna hai? Example: 5000 tak.';
  if(/area badlo|change area/.test(n))return 'Kaunsa area, road ya coaching landmark chahiye? Example: Piprali Road par.';
  if(/city batao|city badlo|change city/.test(n)){if(activeSearch){activeSearch.areaName=null;activeSearch.area=null;activeSearch.cityName=null;activeSearch.city=null;saveConversationContext();}return 'Kaunsa city chahiye? Example: Sikar, Jaipur ya Kota.';}
  if(/facilities filter/.test(n))return 'Kaunsi facility zaroori hai? Example: Wi-Fi, AC, food ya parking.';
  let cat=categoryOf(q);
  if(!cat&&activeSearch?.category)cat=activeSearch.category;
  if(!cat&&isContextFollowUp(q))cat=lastConversationCategory();
  if(cat){
    const rows=await loadRows();
    if(cacheErrors[cat])throw new Error('Unable to read '+CFG.categories[cat].table);
    const namedMatches=namedListingMatches(rows,q,cat);
    if(namedMatches.length){
      activeSearch={category:cat,query:q,cityName:null,areaName:null,city:null,area:null,gender:null,budget:null,facilities:[],results:namedMatches,offset:0};saveConversationContext();
      const gallery=await loadGallery();
      const intro=namedMatches.length===1?'Mujhe aapki maangi hui listing mil gayi. Ye rahi uski available details:':'Is naam se ye matching listings mili hain. Aap sahi property select kar sakte hain:';
      return intro+namedMatches.slice(0,5).map(r=>cardHtml(r,gallery)).join('')+(namedMatches.length>5?quickMarkup(['Aur listings dikhao']):'');
    }
    const previous=activeSearch||null;
    const result=matchSearch(rows,q,cat,previous);
    activeSearch={category:cat,query:q,city:result.city,area:result.area,cityName:result.cityName,areaName:result.areaName,gender:result.gender,budget:result.budget,facilities:result.facilities,results:result.rows,offset:0};saveConversationContext();
    if(!result.rows.length){
      let nextSteps;
      if(result.area&&result.city){
        const cityLabel=String(result.city).trim();
        nextSteps=[cityLabel+' mein '+(cat==='cafe'?'cafes':CFG.categories[cat].label.toLowerCase())+' dikhao','Area badlo'];
      }else if(result.area){
        nextSteps=['City batao','Area badlo'];
      }else if(result.city){
        nextSteps=['Area badlo'];
      }else{
        nextSteps=['City batao','Area batao'];
      }
      if(result.budget!==null)nextSteps.push('Budget badlo');
      const widerText=result.city?'Agar aap chahen, main '+esc(result.city)+' ke doosre areas ke '+(cat==='cafe'?'cafes':CFG.categories[cat].label.toLowerCase())+' dikha sakta hoon.':'City bata dein, phir main usi city mein exact active listings check karunga.';
      return 'Aapne '+(result.area?'<b>'+esc(result.area)+'</b> area':'is location')+(result.city?' ('+esc(result.city)+')':'')+' mein '+esc(CFG.categories[cat].label.toLowerCase())+' maange hain. Is exact location par abhi koi matching active listing nahi mili. Main doosre area ki listings bina aapki permission ke nahi dikhaunga. '+widerText+quickMarkup(nextSteps);
    }
    const gallery=await loadGallery();
    const shown=result.rows.slice(0,4);
    const count=result.rows.length;
    const summary='Mujhe <b>'+count+'</b> matching active listing'+(count===1?' mili':'s mili')+'. '+(result.city?'City: <b>'+esc(result.city)+'</b>. ':'')+(result.gender?'Type: <b>'+(result.gender==='girls'?'Girls': 'Boys')+'</b>. ':'')+(result.budget?'Budget: <b>₹'+result.budget.toLocaleString('en-IN')+' tak</b>. ':'');
    const cards=shown.map(r=>cardHtml(r,gallery)).join('');
    const more=count>4?quickMarkup(['Aur listings dikhao','Budget badlo','Facilities filter karo']):'';
    return summary+cards+more;
  }
  if(/hostel|pg|tiffin|mess|library|cafe|bookstore|book store|dikhao|show me|find|search/.test(n)){
    return 'Main aapke liye listing search kar sakta hoon. Kaunsi category chahiye—Hostel/PG, Tiffin, Library, Cafe ya Bookstore? City aur budget bhi bata sakte hain.'+quickMarkup(['Hostel / PG','Tiffin / Mess','Library','Cafe','Bookstore']);
  }
  if(activeSearch){
    return 'Aapki pichhli search ka context mere paas hai: <b>'+esc(CFG.categories[activeSearch.category]?.label||'listing')+'</b>'+
      (activeSearch.cityName?' · '+esc(activeSearch.cityName):'')+(activeSearch.areaName?' · '+esc(activeSearch.areaName):'')+
      '. Aap isi ke baare mein pooch rahe hain ya nayi search karni hai? Thoda specific bata dein—jaise timing, price, facilities, booking ya doosri category.'+
      quickMarkup(['Isi area mein cafes dikhao','Budget badlo','Facilities filter karo','Nayi search']);
  }
  return 'Main StudentHubHelp ki listings, booking guidance, account/listing support, website use, student safety aur contact details mein help kar sakta hoon. Aap apna sawal Hindi, Hinglish ya English mein likhein. Agar sawal ka matlab clear na hua toh main guess karne ke bajay clarification poochunga.'+quickMarkup(['Hostel dikhao','Meri booking status','Meri listing status','Contact support']);
}
function buildUI(){
  if($('#shh-chat-launcher'))return;
  const launcher=document.createElement('button');launcher.id='shh-chat-launcher';launcher.type='button';launcher.setAttribute('aria-label','Open StudentHubHelp Assistant');launcher.setAttribute('aria-expanded','false');launcher.innerHTML='✦<span class="shh-launcher-dot"></span>';
  const panel=document.createElement('section');panel.id='shh-chat-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','StudentHubHelp Assistant');
  panel.innerHTML='<header class="shh-chat-head"><div class="shh-chat-avatar">✦</div><div class="shh-chat-brand"><strong>Ultra Advance AI Assistant</strong><span>StudentHubHelp · Your Student Support Partner</span></div><span class="shh-chat-status">Ready</span><button type="button" data-shh-close aria-label="Close assistant">×</button></header><div class="shh-chat-messages" aria-live="polite"></div><div class="shh-chat-compose"><form><input type="text" name="message" maxlength="500" autocomplete="off" placeholder="Ask me anything..." aria-label="Type your message"><button type="submit" aria-label="Send message">➤</button></form><div class="shh-chat-footnote">StudentHubHelp · No external AI API</div></div>';
  document.body.append(launcher,panel);
  const messages=$('.shh-chat-messages',panel),form=$('form',panel),input=$('input',panel);
  async function open(){panel.classList.add('shh-open');launcher.setAttribute('aria-expanded','true');input.focus();if(!messages.dataset.greeted){messages.dataset.greeted='1';addMessage(messages,'Namaste! 👋 Main StudentHubHelp ka smart support assistant hoon. Aap hostel search, booking issue, listing status, website help ya contact details pooch sakte hain.'+quickMarkup(['Hostel dikhao','Booking help','Meri listing status','Contact support']));try{const user=await getUser();if(user){const name=profile?.full_name||user.email?.split('@')[0]||'Student';addMessage(messages,'Welcome back, <b>'+esc(name)+'</b>! Main aapki apni booking, listing request aur account se related help kar sakta hoon.');}}catch(e){console.warn('[SHH chatbot] personal greeting unavailable');}}}
  function close(){panel.classList.remove('shh-open');launcher.setAttribute('aria-expanded','false');launcher.focus();}
  launcher.addEventListener('click',()=>panel.classList.contains('shh-open')?close():open());
  $('[data-shh-close]',panel).addEventListener('click',close);
  async function send(q){
    q=String(q||'').trim();if(!q)return;
    addMessage(messages,esc(q),'user');saveHistory('user',q);input.value='';input.focus();
    const wait=typing(messages);
    await logChatMessage('user',q);
    try{
      const answer=await processMessage(q,messages);wait.remove();addMessage(messages,answer);
      await logChatMessage('assistant',answer,{is_error:false});
      saveHistory('assistant',answer);saveConversationContext();
    }
    catch(e){
      console.error('[SHH chatbot]',e);wait.remove();
      const errorAnswer='Abhi data load nahi ho pa raha. Kripya thodi der baad try karein ya <a href="/contact-us.html">support team se contact</a> karein.';
      addMessage(messages,errorAnswer);saveHistory('assistant',errorAnswer);await logChatMessage('assistant',errorAnswer,{is_error:true,error_message:String(e?.message||e).slice(0,500)});
    }
  }
  form.addEventListener('submit',e=>{e.preventDefault();send(input.value);});
  panel.addEventListener('click',e=>{
    const prompt=e.target.closest('[data-shh-prompt]');
    if(prompt){send(prompt.getAttribute('data-shh-prompt'));return;}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('shh-open'))close();});
}
function start(){
  restoreHistory();
  restoreConversationContext();
  getChatSession();
  const link=document.createElement('link');link.rel='stylesheet';link.href='/chatbot/chatbot.css';document.head.appendChild(link);
  buildUI();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();