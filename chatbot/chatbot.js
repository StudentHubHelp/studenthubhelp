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
  contactEmail:'studenthubhelpp@gmail.com',
  instagram:'https://www.instagram.com/studenthubhelp/',
  supportUrl:'/contact-us.html'
};
const $ = (s,root=document)=>root.querySelector(s);
const esc = v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = v=>String(v==null?'':v).toLocaleLowerCase('en-IN').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const words = s=>norm(s).split(' ').filter(Boolean);
let chatbotDb=null,sessionUser=null,profile=null,cacheRows=null,cacheGallery=null,cacheErrors={},activeSearch=null,history=[];
let sdkPromise=null;

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
async function loadRows(){
  if(cacheRows)return cacheRows;
  const client=await getDb();
  const entries=Object.entries(CFG.categories);
  const results=await Promise.all(entries.map(async([key,c])=>{
    const {data,error}=await client.from(c.table).select('*').eq('status','active').limit(500);
    if(error){cacheErrors[key]=error.message;console.warn('[SHH chatbot] '+c.table+':',error.message);return [];}
    cacheErrors[key]=null;
    return (data||[]).map(r=>({...r,__category:key,__table:c.table}));
  }));
  cacheRows=results.flat();
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
function matchSearch(rows,query,category,previous){
  const n=norm(query);
  const cityCandidates=[...new Set(rows.map(r=>String(r.city||'').trim()).filter(Boolean))].sort((a,b)=>b.length-a.length);
  const explicitCity=cityCandidates.find(x=>x.length>1&&n.includes(norm(x)))||null;
  const unknownCityMatch=n.match(/\b(?:in|mein|me)\s+([a-z][a-z-]*)/i)||n.match(/^([a-z][a-z-]*)\s+mein\b/i);
  const city=explicitCity||(unknownCityMatch?unknownCityMatch[1]:null)||previous?.cityName||null;
  const areaCandidates=[...new Set(rows.flatMap(r=>[r.area,r.landmark,r.nearby_coaching].filter(Boolean).map(String)))].sort((a,b)=>b.length-a.length);
  const explicitArea=areaCandidates.find(x=>x.length>2&&n.includes(norm(x)))||null;
  const unknownAreaMatch=n.match(/(?:near|nearby|around|ke paas|paas)\s+([a-z][a-z-]*)/i);
  const area=explicitArea||(unknownAreaMatch?unknownAreaMatch[1]:null)||previous?.areaName||null;
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
  const explicitLocation=/\b(?:near|nearby|around|road|area)\b|ke paas|paas/.test(n);
  if(explicitLocation&&!explicitArea&&!unknownAreaMatch&&!previous?.areaName)out=[];
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
  const support=supportAnswer(q);
  if(support)return support;
  if(/more|aur listings|next results|aur dikhao/.test(n)&&activeSearch?.results?.length){
    const next=activeSearch.offset+4,shown=activeSearch.results.slice(next,next+4);
    if(!shown.length)return 'Is search ke saare matching results dikhaye ja chuke hain. Aap filters badal kar nayi search kar sakte hain.';
    activeSearch.offset=next;
    const gallery=await loadGallery();
    return shown.map(r=>cardHtml(r,gallery)).join('')+(activeSearch.results.length>next+4?quickMarkup(['Aur listings dikhao']):'');
  }
  if(/budget badlo|change budget/.test(n))return 'Aapka naya maximum budget kitna hai? Example: 5000 tak.';
  if(/area badlo|change area/.test(n))return 'Kaunsa area, road ya coaching landmark chahiye? Example: Allen ke paas.';
  if(/facilities filter/.test(n))return 'Kaunsi facility zaroori hai? Example: Wi-Fi, AC, food ya parking.';
  let cat=categoryOf(q);
  if(!cat&&activeSearch?.category)cat=activeSearch.category;
  if(cat){
    const rows=await loadRows();
    if(cacheErrors[cat])throw new Error('Unable to read '+CFG.categories[cat].table);
    const previous=activeSearch&&activeSearch.category===cat?activeSearch:null;
    const result=matchSearch(rows,q,cat,previous);
    activeSearch={category:cat,query:q,city:result.city,area:result.area,cityName:result.cityName,areaName:result.areaName,gender:result.gender,budget:result.budget,facilities:result.facilities,results:result.rows,offset:0};
    if(!result.rows.length){
      const city=result.city?' in '+esc(result.city):'';
      const area=result.area?' near '+esc(result.area):'';
      return 'Is exact criteria'+city+area+' mein matching active '+esc(CFG.categories[cat].label.toLowerCase())+' listing nahi mili. Main doosre city ya area ki listing mix nahi karunga. Aap budget ya area badal kar try kar sakte hain.'+quickMarkup(['Budget badlo','Area badlo','Facilities filter karo']);
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
  return 'Main StudentHubHelp ki listings, booking guidance, account/listing support, website use, student safety aur contact details mein help kar sakta hoon. Apna sawal thoda aur detail mein batayein.'+quickMarkup(['Hostel dikhao','Meri booking status','Meri listing status','Contact support']);
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
    addMessage(messages,esc(q),'user');input.value='';input.focus();
    const wait=typing(messages);
    try{const answer=await processMessage(q,messages);wait.remove();addMessage(messages,answer);}
    catch(e){console.error('[SHH chatbot]',e);wait.remove();addMessage(messages,'Abhi data load nahi ho pa raha. Kripya thodi der baad try karein ya <a href="/contact-us.html">support team se contact</a> karein.');}
  }
  form.addEventListener('submit',e=>{e.preventDefault();send(input.value);});
  panel.addEventListener('click',e=>{
    const prompt=e.target.closest('[data-shh-prompt]');
    if(prompt){send(prompt.getAttribute('data-shh-prompt'));return;}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('shh-open'))close();});
}
function start(){
  const link=document.createElement('link');link.rel='stylesheet';link.href='/chatbot/chatbot.css';document.head.appendChild(link);
  buildUI();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();