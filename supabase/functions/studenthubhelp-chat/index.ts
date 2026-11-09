import "jsr:@supabase/functions-js/edge-runtime.d.ts";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const U=(Deno.env.get("SUPABASE_URL")||"").replace(/\/$/,"");
const K=Deno.env.get("SUPABASE_SECRET_KEY")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const GEMINI=Deno.env.get("GEMINI_API_KEY")||"";
const MODEL="gemini-3.8-flash";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type,x-session-id","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const SRC=[["hostels","hostel"],["tiffins","tiffin"],["libraries","library"],["cafes","cafe"],["bookstores","bookstore"]] as const;
const n=(v:any)=>String(v??"").toLowerCase().normalize("NFKC").replace(/[^a-z0-9\u0900-\u097f]+/gi," ").replace(/\s+/g," ").trim();
const num=(v:any)=>{const x=Number(String(v??"").replace(/,/g,""));return Number.isFinite(x)?x:undefined};
function rateKeys(req:Request,sessionId:string){const cfIp=req.headers.get("cf-connecting-ip")?.trim()||"";const forwarded=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"";const userAgent=(req.headers.get("user-agent")||"unknown-agent").slice(0,80);const stableSession=(req.headers.get("x-session-id")||sessionId||"anonymous").slice(0,160);const keys:{scopeKey:string;limit:number;windowSeconds:number}[]=[];if(cfIp&&cfIp.length<=100&&!/[\s,]/.test(cfIp)){keys.push({scopeKey:"ip:"+cfIp,limit:30,windowSeconds:60})}else{console.warn("[RATE_LIMIT] trusted cf-connecting-ip missing; using untrusted proxy/session fallback");if(forwarded&&forwarded.length<=100)keys.push({scopeKey:"proxy-untrusted:"+forwarded,limit:8,windowSeconds:60});keys.push({scopeKey:"fallback-session-ua:"+stableSession+":"+userAgent,limit:10,windowSeconds:60})}keys.push({scopeKey:"session:"+stableSession,limit:15,windowSeconds:60});return keys}
async function consumeDualRateLimit(scope:string,req:Request,sessionId:string,limit:number,windowSeconds:number){for(const item of rateKeys(req,sessionId)){const allowed=await consumeRateLimit(scope,item.scopeKey,Math.min(limit,item.limit),Math.max(windowSeconds,item.windowSeconds));if(!allowed)return false}return true}
async function consumeRateLimit(scope:string,key:string,limit:number,windowSeconds:number){if(!U||!K)throw Error("rate limiter database configuration missing");const r=await fetch(U+"/rest/v1/rpc/consume_chatbot_rate_limit",{method:"POST",headers:{apikey:K,Authorization:"Bearer "+K,"Content-Type":"application/json"},body:JSON.stringify({p_scope:scope,p_key:key,p_limit:limit,p_window_seconds:windowSeconds}),signal:AbortSignal.timeout(4000)});if(!r.ok)throw Error("distributed rate limiter unavailable: "+r.status);return await r.json()===true}
async function db<T>(path:string):Promise<T>{if(!U||!K)throw Error("database configuration missing");const r=await fetch(U+path,{headers:{apikey:K,Authorization:`Bearer ${K}`,"Content-Type":"application/json"},signal:AbortSignal.timeout(4000)});if(!r.ok)throw Error(`database ${r.status}`);return await r.json() as T}
type ChatbotRuntimeConfig={enabled:boolean;ai_rerank_enabled:boolean;lead_capture_enabled:boolean;comparison_enabled:boolean;budget_planner_enabled:boolean;max_candidates:number;max_results:number;max_output_tokens:number;temperature:number;maintenance_message:string};
const SAFE_FALLBACK_CONFIG:ChatbotRuntimeConfig={enabled:false,ai_rerank_enabled:false,lead_capture_enabled:false,comparison_enabled:false,budget_planner_enabled:false,max_candidates:10,max_results:1,max_output_tokens:200,temperature:0,maintenance_message:"Chatbot system maintenance par hai. Kripya thodi der baad koshish karein ya seedhe support par sampark karein."};
const DEFAULT_RUNTIME_CONFIG:ChatbotRuntimeConfig=SAFE_FALLBACK_CONFIG;
let runtimeConfigCache:{value:ChatbotRuntimeConfig;expiresAt:number}|null=null;
async function getRuntimeConfig():Promise<ChatbotRuntimeConfig>{if(runtimeConfigCache&&runtimeConfigCache.expiresAt>Date.now())return runtimeConfigCache.value;try{const rows=await db<any[]>("/rest/v1/chatbot_admin_config?select=*&id=eq.1&limit=1");const row=rows?.[0];if(!row){console.error("[CRITICAL] chatbot_admin_config row id=1 is missing; disabling chatbot");runtimeConfigCache={value:SAFE_FALLBACK_CONFIG,expiresAt:Date.now()+2000};return SAFE_FALLBACK_CONFIG}const value:ChatbotRuntimeConfig={enabled:row.enabled===true,ai_rerank_enabled:row.ai_rerank_enabled===true,lead_capture_enabled:row.lead_capture_enabled===true,comparison_enabled:row.comparison_enabled===true,budget_planner_enabled:row.budget_planner_enabled===true,max_candidates:Math.max(10,Math.min(100,Number(row.max_candidates)||40)),max_results:Math.max(1,Math.min(20,Number(row.max_results)||8)),max_output_tokens:Math.max(200,Math.min(3000,Number(row.max_output_tokens)||900)),temperature:Math.max(0,Math.min(1,Number.isFinite(Number(row.temperature))?Number(row.temperature):0.2)),maintenance_message:String(row.maintenance_message||"").slice(0,500)};runtimeConfigCache={value,expiresAt:Date.now()+2000};return value}catch(e){console.error("[CRITICAL] chatbot admin config fetch failed; disabling chatbot",e);runtimeConfigCache={value:SAFE_FALLBACK_CONFIG,expiresAt:Date.now()+2000};return SAFE_FALLBACK_CONFIG}}
const LANDMARKS=[{key:"allen",label:"Allen Career Institute Sikar",aliases:["allen","allen sikar","allen coaching","allen career","allen sanskar","allen piprali"],city:"Sikar",lat:27.62624,lng:75.17721},{key:"clc",label:"CLC Sikar",aliases:["clc","clc sikar"],city:"Sikar",lat:27.6206291,lng:75.1616672},{key:"vibrant",label:"Vibrant Academy Sikar",aliases:["vibrant","vibrant coaching","vibrant academy","vibrant academy ssc","vibrant ssc"],city:"Sikar"},{key:"matrix",label:"Matrix Coaching Sikar",aliases:["matrix","matrix academy","matrix coaching","matrix sikar"],city:"Sikar"},{key:"gurukripa",label:"Gurukripa Coaching Sikar",aliases:["gurukripa","guru kripa","gurukripa coaching","gurukripa sikar"],city:"Sikar"}];
function city(s:string){const x=n(s),m:[string,string][]=[["sikar","Sikar"],["piprali","Sikar"],["पिपराली","Sikar"],["सिकर","Sikar"],["udaipurwati","Udaipurwati"],["उदयपुरवाटी","Udaipurwati"],["jhunjhunu","Jhunjhunu"],["झुंझुनूं","Jhunjhunu"],["झुंझुनू","Jhunjhunu"],["kota","Kota"],["talwandi","Kota"],["jaipur","Jaipur"],["ajmer","Ajmer"],["bikaner","Bikaner"],["jodhpur","Jodhpur"],["udaipur","Udaipur"],["alwar","Alwar"],["delhi","Delhi"],["ahmedabad","Ahmedabad"],["lucknow","Lucknow"],["hyderabad","Hyderabad"],["pune","Pune"]];return m.find(([a])=>x.includes(n(a)))?.[1]||""}
function findLandmark(s:string){const x=n(normalizeSearchTerms(s));for(const l of LANDMARKS)if(l.aliases.some(a=>x.includes(n(a))))return l;return undefined}
function nearTerm(s:string){const x=n(normalizeSearchTerms(s)),lm=findLandmark(x);if(lm)return lm.key;const known=["vibrant coaching","vibrant career institute","nawalgarh road","nawalgarh rd","nawalgarh","clc","allen","gurukripa","matrix","matrix academy","prayas eduhub","banco career academy","inspector ssc academy"];const hit=known.find(k=>x.includes(n(k)));if(hit)return hit;const m=x.match(/(?:near|nearby|around|paas|pass|ke paas|k pass|aas paas|bagal|nazdeek|पास|आस पास|बगल)(?:\s+me)?\s+([a-z0-9\u0900-\u097f][a-z0-9\u0900-\u097f ]{1,50}?)(?=\s+(?:chahiye|dikhao|dikhado|hai|ho|rehna|rahna|book|konsa|kaunsa|aur|bhi)\b|$)/i);if(m)return m[1].trim();if(/(?:piprali road|piprali rd|पिपराली रोड)/i.test(x))return "piprali road";return ""}
function cat(s:string){const x=n(s),hits:[string,number][]=[];const defs:[string,RegExp][]=[["hostel",/hostel|pg|room|stay|accommodation|girls|boys|female|male|rehne|rehna|रहने|हॉस्टल|पीजी/],["tiffin",/tiffin|mess|khana|food|meal|jain food|टिफिन|मेस|खाना/],["library",/library|reading|seat|लाइब्रेरी/],["cafe",/cafe|coffee|restaurant|hangout|कैफे/],["bookstore",/bookstore|books|stationery|bookshop|किताब|बुकस्टोर/]];for(const [type,re] of defs)for(const m of x.matchAll(new RegExp(re.source,"gi")))hits.push([type,m.index??-1]);const near=new Set(hits.filter(([,pos])=>/(near|nearby|around|paas|pass|ke paas|k pass|aas paas|bagal|nazdeek|पास|आस पास|बगल)/i.test(x.slice(Math.max(0,pos-50),pos))).map(([type])=>type));return hits.find(([type])=>!near.has(type))?.[0]||hits[0]?.[0]}
function secondaryCats(s:string){const x=n(s),out:string[]=[];const defs:[string,RegExp][]=[["hostel",/hostel|pg|room|stay|accommodation|girls|boys|female|male|rehne|rehna|रहने|हॉस्टल|पीजी/],["tiffin",/tiffin|mess|khana|food|meal|टिफिन|मेस|खाना/],["library",/library|reading|seat|लाइब्रेरी/],["cafe",/cafe|coffee|restaurant|hangout|कैफे/],["bookstore",/bookstore|books|stationery|bookshop|किताब|बुकस्टोर/]];for(const [type,re] of defs)for(const m of x.matchAll(new RegExp(re.source,"gi"))){const pos=m.index??-1;if(/(near|nearby|around|paas|pass|ke paas|k pass|aas paas|bagal|nazdeek|पास|आस पास|बगल)/i.test(x.slice(Math.max(0,pos-50),pos)))out.push(type)}return [...new Set(out)]}
function coords(p:any){if(!p||typeof p!=="object")return null;const lat=Number(p.latitude??p.lat??p.location_latitude??p.latitude_deg),lng=Number(p.longitude??p.lng??p.lon??p.location_longitude??p.longitude_deg);return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180?{lat,lng}:null}
function distanceKm(a:any,b:any){const A=coords(a),B=coords(b);if(!A||!B)return undefined;const r=(v:number)=>v*Math.PI/180,dLat=r(B.lat-A.lat),dLon=r(B.lng-A.lng),h=Math.sin(dLat/2)**2+Math.cos(r(A.lat))*Math.cos(r(B.lat))*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))}
function distanceToLandmark(p:any,l:any){const A=coords(p),B=l?{latitude:l.lat,longitude:l.lng}:null;if(!A||!B)return undefined;return distanceKm(A,B)}
function searchText(p:any){return n([p.name,p.title,p.business_name,p.service_name,p.type,p.gender_type,p.gender,p.city,p.area,p.service_area,p.address,p.landmark,p.nearby_coaching,p.description,p.facilities,p.amenities].filter(Boolean).join(" "))}
function cityMatches(actual:any,target:any){
 const a=n(actual),t=n(target);
 if(!a||!t)return false;
 if(a===t)return true;
 const actualWords=a.split(" ");
 if(t.split(" ").length===1)return actualWords.includes(t);
 return a.startsWith(t+" ")||a.endsWith(" "+t);
}
function isCityDuplicateTerm(term:string|undefined,cityName:string|undefined){
 const value=n(term||""),cityValue=n(cityName||"");
 const meaningful=value.split(" ").filter(word=>!["city","district","rajasthan","india"].includes(word)).join(" ");
 return !!meaningful&&!!cityValue&&meaningful===cityValue;
}
async function direct(type:string,ct?:string,maxBudget?:number,locationTerm?:string,genderFilter?:string){
 const table=SRC.find(x=>x[1]===type)?.[0];
 if(!table){console.error(`[SEARCH_CONFIG_ERROR] Unknown category: ${type}`);return []}
 const pageSize=250,maxRows=5000;
 const cleanCity=String(ct||"").replace(/[%,()*]/g," ").replace(/\s+/g," ").trim();
 const fetchActiveRows=async(cityFilter?:string)=>{
  const params=new URLSearchParams({select:"*",status:"eq.active",limit:String(pageSize),order:"id.asc"});
  if(cityFilter)params.set("city",`ilike.*${cityFilter}*`);
  const rowsOut:any[]=[];
  let cursor:string|number|undefined;
  const pagingDeadline=Date.now()+8000;
  while(rowsOut.length<maxRows&&Date.now()<pagingDeadline){
   if(cursor!==undefined)params.set("id",`gt.${cursor}`);
   const batch=await db<any[]>(`/rest/v1/${table}?${params.toString()}`);
   if(!Array.isArray(batch))throw Error(`Unexpected ${table} response: expected an array`);
   if(!batch.length)break;
   rowsOut.push(...batch);
   const lastId=batch[batch.length-1]?.id;
   if(lastId===undefined||batch.length<pageSize)break;
   cursor=lastId;
  }
  if(Date.now()>=pagingDeadline)console.warn(`[SEARCH_PARTIAL] ${type} pagination reached its 8s limit; fetched ${rowsOut.length} rows`);
  return rowsOut;
 };
 let rawRows=await fetchActiveRows(cleanCity||undefined);
 console.info(`[SEARCH_FETCH] category=${type} table=${table} city=${cleanCity||"ALL"} rows=${rawRows.length}`);
 if(ct&&rawRows.length===0){
  console.warn(`[SEARCH_RECHECK] category=${type} city=${cleanCity}: retrying active rows without the city filter`);
  const broadRows=await fetchActiveRows();
  rawRows=broadRows.filter(p=>cityMatches(p.city,cleanCity));
  console.info(`[SEARCH_RECHECK_RESULT] category=${type} city=${cleanCity} broadRows=${broadRows.length} cityMatches=${rawRows.length}`);
 }
 let rows=ct?rawRows.filter(p=>cityMatches(p.city,cleanCity)):rawRows;
 if(maxBudget!==undefined&&Number.isFinite(maxBudget)&&maxBudget>0)rows=rows.filter(p=>{const value=budgetValue(p,type);return value!==undefined&&value<=maxBudget});
 const term=String(locationTerm||"").replace(/[^a-zA-Z0-9\u0900-\u097f -]/g," ").replace(/\s+/g," ").trim();
 if(term&&!isCityDuplicateTerm(term,cleanCity)){const wanted=n(term);rows=rows.filter(p=>searchText(p).includes(wanted))}
 if(type==="hostel"&&(genderFilter==="girls"||genderFilter==="boys")){
  const variants=genderFilter==="girls"?["girls","girl","female","women","ladies","ladki","महिला","लड़क"]:["boys","boy","male","men","ladke","लड़के"];
  rows=rows.filter(p=>{const text=n([p.name,p.description,p.type,p.gender_type,p.gender].filter(Boolean).join(" "));return variants.some(v=>text.includes(n(v)))});
 }
 console.info(`[SEARCH_FILTERED] category=${type} city=${cleanCity||"ALL"} rows=${rows.length}`);
 return rows.map(p=>({...p,_type:type}));
}
async function multiDirect(types:string[],ct?:string,maxBudget?:number,locationTerm?:string,genderFilter?:string){
 const unique=[...new Set(types.filter(Boolean))];
 const groups=await Promise.all(unique.map(type=>direct(type,ct,maxBudget,locationTerm,genderFilter)));
 return groups.flat();
}
function positiveAmount(...values:any[]){for(const raw of values){const value=num(raw);if(value!==undefined&&value>0)return value}return undefined}
function monthlyAmount(p:any,type:string){return type==="hostel"?positiveAmount(p.monthly_rent,p.monthly_fee,p.price):positiveAmount(p.monthly_plan,p.monthly_fee)}
async function planComboBudget(cityName:string,totalBudget:number,genderFilter?:string){
 const hostelCap=Math.floor(totalBudget*0.70),tiffinCap=Math.floor(totalBudget*0.35);
 const [hostelRows,tiffinRows]=await Promise.all([direct("hostel",cityName,hostelCap,undefined,genderFilter),direct("tiffin",cityName,tiffinCap)]);
 const hostels=hostelRows.filter(p=>cityMatches(p.city,cityName));const tiffins=tiffinRows.filter(p=>cityMatches(p.city,cityName));
 const pricedHostels=hostels.map(p=>({p,cost:monthlyAmount(p,"hostel")})).filter(x=>x.cost!==undefined) as Array<{p:any;cost:number}>;
 const pricedTiffins=tiffins.map(p=>({p,cost:monthlyAmount(p,"tiffin")})).filter(x=>x.cost!==undefined) as Array<{p:any;cost:number}>;
 let best:{hostel:any;tiffin:any;hostelCost:number;tiffinCost:number;total:number;score:number}|undefined;
 for(const h of pricedHostels)for(const t of pricedTiffins){const total=h.cost+t.cost;if(total>totalBudget)continue;const score=Math.abs(h.cost-totalBudget*0.65)+Math.abs(t.cost-totalBudget*0.35)+(totalBudget-total)*0.15;if(!best||score<best.score)best={hostel:h.p,tiffin:t.p,hostelCost:h.cost,tiffinCost:t.cost,total,score}}
 return best;
}
function genderWanted(s:string){const x=n(normalizeSearchTerms(s));if(/\b(girls|girl|female|ladki|ladkiyo|ladkiyon|महिला|लड़क|लड़की|girls hostel)\b/i.test(x))return "girls";if(/\b(boys|boy|male|ladke|ladkon|लड़के|लड़का|boys hostel)\b/i.test(x))return "boys";return ""}
function areaWanted(s:string){const x=n(normalizeSearchTerms(s));if(/nawalgarh road|nawalgarh rd|नवलगढ़ रोड/i.test(x))return "nawalgarh";if(/piprali road|piprali rd|पिपराली रोड/i.test(x))return "piprali";return ""}
function priceLabel(p:any,c:string){const v=c==="tiffin"?positiveAmount(p.monthly_plan,p.monthly_fee):positiveAmount(p.monthly_rent,p.monthly_fee,p.monthly_charge,p.price);if(v===undefined)return "";if(c==="hostel"||c==="tiffin"||c==="library")return "₹"+v.toLocaleString("en-IN")+"/mo";return "₹"+v.toLocaleString("en-IN")}
function card(p:any){const c=p._type,price=priceLabel(p,c),d=p._distanceKm;return{id:String(p.id),name:p.name||p.title||p.service_name||p.business_name||"Active listing",type:c,city:p.city||"",area:p.area||p.service_area||"",address:p.address||"",phone:([p.phone,p.contact_phone,p.whatsapp,p.whatsapp_number].find(v=>{const s=String(v??"").trim();return s&&s!=="0"&&s.replace(/\D/g,"").length>=7})||""),rating:num(p.rating),verified:p.verified===true,price,distanceKm:d===undefined?null:Number(d.toFixed(1)),distanceVerified:d!==undefined,distanceLabel:d===undefined?(p._nearbyAreaMatch?`${p.area||p.service_area||p.city||"Area"} area match · exact distance unavailable`:""):`~${d.toFixed(1)} km (GPS straight-line)`,nearbyMatch:p._nearbyVerified===true||p._nearbyAreaMatch===true,highlights:["wifi","ac_available","ac","cctv","food_available","mess_available","available_beds","room_types","room_sharing","gender_type","timing","timings","delivery_available","nearby_coaching"].map(k=>[k,p[k]]).filter(([,v])=>v!==null&&v!==undefined&&String(v).trim()!==""&&String(v).toLowerCase()!=="false").slice(0,4).map(([k,v])=>k+": "+String(v)),description:p.description&&String(p.description).trim().length<=280?String(p.description).trim():"",mapsUrl:p.google_maps_url||"",detailsUrl:p.slug?`property-details.html?type=${c}&slug=${encodeURIComponent(p.slug)}`:undefined}}
function rank(p:any,q:string,ct:string,near:string){const x=searchText(p),t=n(q);let s=0;if(p._distanceKm!==undefined)s+=Math.max(0,25-p._distanceKm*5);const a=areaWanted(q);if(a&&x.includes(a))s+=25;if(ct&&n(p.city||"").includes(n(ct)))s+=30;for(const w of t.split(" ").filter(z=>z.length>2).slice(0,20))if(x.includes(w))s+=2;if(near){if(near==="allen"||near==="clc"){if(p._distanceKm!==undefined)s+=Math.max(0,20-p._distanceKm*5);if(x.includes(near))s+=10}else if(near==="vibrant"){if(x.includes("vibrant"))s+=20;if(x.includes("nawalgarh"))s+=8}else if(near==="matrix"||near==="gurukripa"){if(x.includes(near))s+=30;else s-=3}else if(x.includes(n(near)))s+=20}if(p.verified===true)s+=4;if(Number.isFinite(Number(p.rating)))s+=Math.min(5,Number(p.rating));return s}
function isGreeting(s:string){return /^(hi|hello|hey|namaste|good morning|good afternoon|good evening|good night|gm|gn|hii|hlo|नमस्ते|सुप्रभात|शुभ प्रभात|शुभ संध्या)[!.\s]*$/i.test(s.trim())}
function isAccountSupport(s:string){
  const x=n(s);
  return /(login|log in|log-in|sign in|signin|sign-in|can't login|cant login|cannot login|unable to login|not able to login|login nahi|login nhi|login nahin|sign in nahi|signin nahi|password|forgot password|reset password|otp|verification code|google login|google sign in|dashboard access|account access|account issue|account problem|owner account|owner login|authentication|auth issue|session expired|logout issue)/i.test(x);
}
function accountSupportReply(s:string){
  const x=n(s);
  if(/password|forgot|reset/i.test(x)) return "Ji 😊 Account password issue ke liye **Forgot Password / Reset Password** option use kijiye. Agar reset link/OTP nahi aa raha hai, mujhe bataiye—main next troubleshooting steps bataunga.";
  if(/otp|verification code|google login|google sign|verification/i.test(x)) return "Ji 😊 Login verification issue lag raha hai. OTP/Google sign-in complete nahi ho raha ho to bataiye ki problem **OTP, Google confirmation, ya redirect/dashboard** me kis step par aa rahi hai—main usi step ka solution bataunga.";
  if(/owner account|owner login|owner/i.test(x)) return "Ji 😊 Ye **Owner Account Login** issue hai. Property search karne ki zarurat nahi hai. Login page par Owner role select karke sign in kijiye. Agar login ke baad dashboard open nahi ho raha, password/OTP problem hai, ya Google login redirect issue hai, exact error/message bhej dijiye—main usi issue ko troubleshoot karunga.";
  return "Ji 😊 Aapka message **Account/Login Support** se related hai. Main property listings suggest nahi karunga. Bataiye problem login, password, OTP/Google sign-in, ya dashboard access me kis step par aa rahi hai, aur main usi ke according help karunga.";
}
function isContact(s:string){return /(director|founder|contact support|support|email|contact us)/i.test(n(s))}
function isPhoneIntent(s:string){return /(?:phone|number|contact|mobile|call).{0,20}(iska|iske|iski|this|that|property|hostel|pg)|(?:iska|iske|iski|this|that).{0,20}(phone|number|mobile|contact)/i.test(n(s))}
function isOwnerContactQuestion(s:string){const x=n(s);return /(owner|malik|proprietor|manager)/i.test(x)&&/(contact|call|phone|number|kaise|kese|kahan|how to|baat kare|baat kar|milna|connect)/i.test(x)}
function isDetailIntent(s:string){return /(full details|full detail|details batao|details btao|detail batao|detail btao|puri details|poori details|iska details|iske details|iski details|is property ki details|view details|details of)/i.test(s)}
function isBookingInfoQuestion(s:string){return /(?:how|kaise|kese|kese|kis tarah|process|procedure).{0,30}(book|booking|reserve|reservation)|(?:book|booking|reserve|reservation).{0,30}(kaise|kese|process|procedure)/i.test(n(s))}
function isPropertyAdviceQuestion(s:string){const x=n(s);return /(?:choose|select|pick|decide|consider|check|dhyan|dhyaan|dhyān|what to look|kya dekh|kya check|kya dhyan|kaise choose|kese choose|kaise select|kese select|kaunsa lena|kaunsi lena|kis basis|kis cheez|kin cheez|kya kya).{0,70}(hostel|pg|tiffin|mess|library|cafe|bookstore|property|room|stay|service|lena|choose|select)|(?:hostel|pg|tiffin|mess|library|cafe|bookstore).{0,70}(choose|select|check|dhyan|dhyān|kya dekh|kya check|kis basis|kaise|kese)/i.test(x)}
function adviceReply(c:string){const labelName=c==="hostel"?"Hostel / PG":c==="tiffin"?"Tiffin service":c==="library"?"Library":c==="cafe"?"Cafe":c==="bookstore"?"Bookstore":"Property";const checks:any={hostel:["📍 Location & daily travel","💰 Total cost: rent, deposit, electricity, mess and other charges","🛏️ Room sharing, ventilation, bathroom and storage","🍱 Food quality, menu and meal timings","🚿 Water, electricity backup, Wi‑Fi, laundry and cleanliness","🔐 Safety: CCTV, entry rules, warden/owner availability","📜 Rules: visitors, curfew, leave policy, notice period and deposit refund","📞 Booking se pehle address, phone, room availability aur total charges owner se confirm karein"],tiffin:["🍱 Food quality, taste and hygiene","💰 Monthly price, delivery charges and deposit","📍 Delivery area and exact delivery timing","🥗 Menu, veg/non-veg/Jain options and customization","📦 Trial meal ya sample lene ka option","📞 Cancellation, pause and refund rules","⭐ Recent reviews aur actual customer feedback","📞 Subscription se pehle total monthly cost aur delivery terms confirm karein"],library:["📍 Distance from college/coaching/home","💺 Seat availability and fixed/unlimited seating","🕐 Opening hours, especially early morning/late night","📶 Wi‑Fi, charging points and study environment","❄️ AC/cooling, lighting and cleanliness","💰 Monthly/day pass and security deposit","🔇 Noise level and rules for calls/food","📞 Payment se pehle seat availability, timings and refund rules confirm karein"],cafe:["🍽️ Food/drink quality and hygiene","💰 Prices, taxes and minimum order","📶 Wi‑Fi and charging availability if you need to study","🪑 Seating, noise level and working/study comfort","🕐 Opening hours and peak-time crowd","📍 Location and parking/transport convenience","⭐ Recent reviews and actual photos","📞 Special requirements or availability pehle confirm karein"],bookstore:["📚 Required books/editions actually available hain ya nahi","💰 Price, discount and return/exchange policy","📝 Stationery, photocopy/printing or other services","📍 Location and opening hours","🔎 New/used books and condition if applicable","💳 Payment options and bill/invoice","⭐ Recent reviews and customer feedback","📞 Book order/availability ko payment se pehle confirm karein"]};return `Bilkul 😊 ${labelName} choose karte waqt sirf rating ya price mat dekho. Ye points check karo:\n\n${(checks[c]||checks.hostel).map((v:string,i:number)=>`${i+1}. ${v}`).join("\n")}\n\n💡 **StudentHubHelp tip:** Agar 2-3 options shortlist hain, main unke available details ko side-by-side compare karne mein help kar sakta hoon.`}
function isPropertyQuery(msg:string,history:string){
  const x=n(msg),h=n(history);
  if(isAccountSupport(msg)||isBookingInfoQuestion(msg))return false;
  const currentExplicit=!!cat(msg)||!!secondaryCats(msg).length||!!findLandmark(msg)||/(property|listing|rent|room|hostel|pg|tiffin|mess|library|cafe|bookstore|ke paas|k pass|paas me|area|locality|landmark|availability|verified|konsa|kaunsa|options|chahiye)/i.test(x);
  if(currentExplicit)return true;
  const hasPropertyContext=!!cat(history)||/(hostel|pg|tiffin|mess|library|cafe|bookstore|property|listing)/i.test(h);
  return hasPropertyContext&&/^(show|more|another|same|this|that|yes|haan|ha|ok|okay|ac|wifi|non ac|veg|girls|boys|near|nearest|dikhao|dikhado|aur|options|option|wala|wali|chahiye|budget|under|below|within)\\b/i.test(x);
}
function wantsCurrentWeb(s:string){return /(latest|today|current|recent|news|weather|result|price|2026|aaj|abhi|naya|new|update|who is|what happened)/i.test(n(s))}
function greeting(){return "Namaste! 🙏 Main StudentHubHelp ka **Ultra Advance AI Assistant** hoon.\n\nAap jo bhi requirement batayenge—Hostel, Tiffin, Library, Cafe, Bookstore, area, nearby location, study question ya normal baat—main aapki baat samajhkar help karunga.\n\n**Aapko kis cheez ki jankari chahiye?**"}
function label(c:string){return c==="hostel"?"hostel / PG":c==="tiffin"?"tiffin service":c==="library"?"library":c==="cafe"?"cafe":c==="bookstore"?"bookstore":"student service"}
function fallbackReply(c:string|undefined,recs:any[],near:string,cityName:string=""){const l=label(c||""),place=near?(near==="allen"?"Allen ke paas":near==="clc"?"CLC ke paas":`${near} area mein`):"";if(recs.length)return `Bilkul 😊 ${place?place+" ":""}${recs.length} active ${l} listing${recs.length>1?"s":""} mili ${recs.length>1?"hain":"hai"}. Neeche live StudentHubHelp options diye hain.`;if(cityName)return `Maine live StudentHubHelp listings check ki hain, lekin abhi **${cityName}** mein koi active matching ${l} listing nahi mili. Main fake options nahi dikhaunga. Aap ${cityName} ka area/landmark bata sakte hain, ya kisi doosri category ki listing search kar sakte hain.`;return `Abhi ${place?place+" ":""}koi matching **${l}** listing nahi mili. Aap city aur area/landmark bataiye; main live listings ko uske hisaab se check karunga.`}
function safeJson(s:string){try{return JSON.parse(s)}catch{const m=s.match(/\{[\s\S]*\}/);if(m)try{return JSON.parse(m[0])}catch{}return null}}
const SEARCH_ALIASES:[RegExp,string][]=[[/\b(?:piparli\s+rd|piprali\s+rd|pipli\s+road|piprali)\b/gi,"piprali road"],[/\b(?:allun|allan|allen\s+institute|allen\s+career)\b/gi,"allen"],[/\b(?:sasta|saste|kam\s+budget)\b/gi,"budget"],[/\b(?:ladko\s+ka|ladkon\s+ka)\b/gi,"boys"],[/\b(?:ladkiyo\s+ka|ladkiyon\s+ka)\b/gi,"girls"]];
function normalizeSearchTerms(input:string){let value=String(input||"").normalize("NFKC");for(const [pattern,replacement] of SEARCH_ALIASES)value=value.replace(pattern,replacement);return value}
type ChatIntent={intent:string;confidence:number;category:string;categories:string[];city:string;locality:string;area:string;landmark:string;nearRelation:string;gender:string;budgetMin:number|null;budgetMax:number|null;facilities:string[];referenceIndex:number|null;action:string;followUp:boolean;correction:boolean;needsClarification:boolean;clarificationQuestion:string;searchScope:string};
type StrictLocation={city?:string;locality?:string;area?:string;landmark?:string};
function aiIntentDefaults():ChatIntent{return{intent:"general",confidence:0,category:"",categories:[],city:"",locality:"",area:"",landmark:"",nearRelation:"",gender:"",budgetMin:null,budgetMax:null,facilities:[],referenceIndex:null,action:"",followUp:false,correction:false,needsClarification:false,clarificationQuestion:"",searchScope:""}}
function offlineIntent(msg:string,history:any[]){
 const o=aiIntentDefaults(),x=n(normalizeSearchTerms(msg)),defs:[string,RegExp][]=[["hostel",/hostel|\bpg\b|room|stay|accommodation|girls hostel|boys hostel|हॉस्टल|पीजी/],["tiffin",/tiffin|mess|khana|food service|टिफिन|मेस/],["library",/library|reading room|study room|लाइब्रेरी/],["cafe",/cafe|coffee shop|कैफे/],["bookstore",/bookstore|book shop|bookshop|stationery|बुकस्टोर/]];
 const cats=defs.filter(([,re])=>re.test(x)).map(([c])=>c);
 o.categories=[...new Set(cats)];o.category=o.categories[0]||cat(msg)||"";
 const loc=strictLocation(msg);o.city=loc.city||city(msg)||"";o.locality=loc.locality||"";o.area=loc.area||"";o.landmark=loc.landmark||"";
 o.gender=genderWanted(msg);
 const budget=x.match(/(?:under|below|within|budget|upto|up to|kam|less than|₹|rs\.?\s*)(\d[\d,]*)/i)||x.match(/(\d[\d,]*)\s*(?:se\s*)?(?:kam|ke andar|under|below)/i);
 if(budget)o.budgetMax=num(budget[1])??null;
 o.facilities=[...["wifi","wi fi","ac","non ac","cctv","food","mess","parking"].filter(v=>x.includes(n(v)))];
 if(o.category||o.categories.length||loc.city||loc.area||loc.locality||loc.landmark||nearTerm(msg)){
  o.intent="property_search";o.confidence=0.78;o.searchScope=loc.area||loc.locality||loc.landmark?"nearby":"city";
 }
 const prev=history.filter(v=>v.role==="user").map(v=>String(v.text||"")).join(" ");
 if(!o.category&&cat(prev)&&(/^(sikar|kota|jaipur|ajmer|bikaner|jodhpur|udaipur|alwar|delhi|ahmedabad|lucknow|hyderabad|pune)$/i.test(x)||/(more|another|same|aur|options|dikhao|dikhado|budget|iska|iske|iski|near|paas|haan|yes)/i.test(x))){
  o.followUp=true;o.category=cat(prev);o.categories=[o.category];const old=strictLocation(prev);
  if(!o.city)o.city=old.city||"";if(!o.area)o.area=old.area||"";if(!o.locality)o.locality=old.locality||"";if(!o.landmark)o.landmark=old.landmark||"";
 }
 if(/\b(nahi|nahin|not|instead|rather)\b/i.test(x)&&cats.length){o.correction=true;o.category=cats[cats.length-1];o.categories=[o.category]}
 return normalizeIntent(o)
}
function normalizeIntent(x:any){
 const d=aiIntentDefaults(),o={...d,...(x&&typeof x==="object"?x:{})};
 const cats=Array.isArray(o.categories)?o.categories.map((v:any)=>String(v||"").toLowerCase()).filter((v:string)=>["hostel","tiffin","library","cafe","bookstore"].includes(v)):[];
 const one=String(o.category||"").toLowerCase();
 o.categories=[...new Set([...(cats||[]),...(one&&["hostel","tiffin","library","cafe","bookstore"].includes(one)?[one]:[])])];
 o.category=o.categories[0]||"";
 o.city=String(o.city||"").trim();o.locality=String(o.locality||"").trim();o.area=String(o.area||"").trim();o.landmark=String(o.landmark||"").trim();o.nearRelation=String(o.nearRelation||"").trim();
 o.gender=["girls","boys"].includes(String(o.gender||"").toLowerCase())?String(o.gender).toLowerCase():"";
 o.budgetMin=num(o.budgetMin)??null;o.budgetMax=num(o.budgetMax)??null;
 o.facilities=Array.isArray(o.facilities)?o.facilities.map((v:any)=>String(v||"").trim()).filter(Boolean).slice(0,12):[];
 o.referenceIndex=Number.isInteger(Number(o.referenceIndex))?Number(o.referenceIndex):null;o.confidence=Math.max(0,Math.min(1,Number(o.confidence)||0));
 o.followUp=!!o.followUp;o.correction=!!o.correction;o.needsClarification=!!o.needsClarification;return o;
}
function deterministicLocation(s:string):StrictLocation{
 const x=n(s);
 if(/\b(talwandi|tilwandi|तालवंडी|तलवंडी)\b/i.test(x))return{city:"Kota",locality:"Talwandi"};
 if(/\b(udaipurwati|उदयपुरवाटी)\b/i.test(x))return{city:"Udaipurwati"};
 if(/\b(jhunjhunu|झुंझुनूं|झुंझुनू)\b/i.test(x))return{city:"Jhunjhunu"};
 if(/nawalgarh road|nawalgarh rd|nawalgarh|नवलगढ़ रोड|नवलगढ रोड/i.test(x))return{city:"Sikar",area:"Nawalgarh Road"};
 if(/piprali road|piprali rd|piprali|पिपराली रोड|पिपराली/i.test(x))return{city:"Sikar",area:"Piprali Road"};
 const lm=findLandmark(x);if(lm)return{city:lm.city,landmark:lm.key};return{};
}
function strictLocation(s:string):StrictLocation{
 const normalized=normalizeSearchTerms(s),d=deterministicLocation(normalized),x=n(normalized);
 if(d.city||d.locality||d.area||d.landmark)return d;
 const c=city(normalized);return c?{city:c}:{};
}
async function aiUnderstand(msg:string,history:any[],cfg:ChatbotRuntimeConfig=DEFAULT_RUNTIME_CONFIG,deadlineAt?:number){
 const fallback=offlineIntent(msg,history);if(!GEMINI)return fallback;
 try{
  const h=history.slice(-8).map(x=>`${x.role==="user"?"USER":"ASSISTANT"}: ${String(x.text||"").slice(0,1200)}`).join("\n");
  const prompt=`You are the intent-understanding engine for StudentHubHelp, a student local-discovery assistant.
Understand the CURRENT user message, not just keywords. Users may write Hindi, Hinglish, English, transliteration, spelling mistakes, short follow-ups and corrections.
Return ONLY valid JSON:
{"intent":"property_search|property_reference|property_details|property_contact|property_compare|account_support|booking_guidance|property_advice|support_contact|general|greeting","confidence":0.0,"category":"hostel|tiffin|library|cafe|bookstore|","categories":[],"city":"","locality":"","area":"","landmark":"","nearRelation":"near|around|exact|within_city|","gender":"girls|boys|","budgetMin":null,"budgetMax":null,"facilities":[],"referenceIndex":null,"action":"search|more|details|phone|compare|clarify|","followUp":false,"correction":false,"needsClarification":false,"clarificationQuestion":"","searchScope":"exact|nearby|city|follow_up|"}
Rules:
- Current message has priority; older context fills missing fields only for a true follow-up.
- "nahi cafe chahiye" / "hostel nahi library" means correction=true and the NEW category wins.
- "Talwandi me cafe" => city="Kota", locality="Talwandi", category="cafe". Do not confuse locality with city.
- Allen/Vibrant/CLC are landmarks when used with near/paas/around.
- Understand meaning: "study karne ke liye quiet jagah" may mean library; if genuinely ambiguous, ask a short clarification.
- Multi-category requests go in categories.
- Extract gender, budget, facilities, locality, area, landmark, and references such as "second wale".
- Account/login/password/OTP/Google sign-in/dashboard issues are account_support, never property_search.
- Never invent property facts.
CURRENT MESSAGE:
${msg}
RECENT CONVERSATION:
${h}`;
  const intentTimeout=Math.min(2500,Math.max(0,deadlineAt===undefined?2500:deadlineAt-Date.now()));if(intentTimeout<100)return fallback;const intentController=new AbortController(),intentTimer=setTimeout(()=>intentController.abort(),intentTimeout);try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":GEMINI},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",maxOutputTokens:cfg.max_output_tokens,temperature:cfg.temperature,thinkingConfig:{thinkingLevel:"medium"}}}),signal:intentController.signal});if(!r.ok)return fallback;const j=await r.json(),txt=j?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("")||"";return normalizeIntent(safeJson(txt))}finally{clearTimeout(intentTimer)}
 }catch{return fallback}
}
function mergeIntent(ai:any,msg:string,history:any[]){
 const o=normalizeIntent(ai),curLoc=strictLocation(msg),old=history.filter(x=>x.role==="user").map(x=>x.text||" ").join(" "),oldLoc=strictLocation(old);
 // Canonical location words in the CURRENT message always override model guesses.
 if(curLoc.city)o.city=curLoc.city;
 if(curLoc.locality)o.locality=curLoc.locality;
 if(curLoc.area)o.area=curLoc.area;
 if(curLoc.landmark)o.landmark=curLoc.landmark;
 // Never inherit an old location unless AI explicitly marked this as a follow-up.
 if(o.followUp){
  if(!o.city)o.city=oldLoc.city||"";
  if(!o.area)o.area=oldLoc.area||"";
  if(!o.locality)o.locality=oldLoc.locality||"";
  if(!o.landmark)o.landmark=oldLoc.landmark||"";
 }
 if(!o.category&&o.followUp){const pc=cat(old);if(pc)o.category=pc;o.categories=pc?[pc]:[]}
 if(o.category&&!o.categories.length)o.categories=[o.category];
 if(o.categories.length)o.category=o.categories[0];
 return o;
}
function budgetValue(p:any,type?:string){return type==="tiffin"?positiveAmount(p.monthly_plan,p.monthly_fee):positiveAmount(p.monthly_rent,p.monthly_fee,p.monthly_charge,p.price)}
function matchesFacility(p:any,wanted:string[]){if(!wanted.length)return true;const z=searchText(p);return wanted.every(f=>z.includes(n(f))||Object.entries(p).some(([k,v])=>n(k).includes(n(f))&&(v===true||String(v).toLowerCase()==="true"||n(v).includes(n(f)))))}

async function aiProperty(msg:string,history:any[],recs:any[],c?:string,near?:string,cfg:ChatbotRuntimeConfig=DEFAULT_RUNTIME_CONFIG,deadlineAt?:number){if(!GEMINI||!cfg.ai_rerank_enabled)return{};try{const h=history.slice(-8).map(x=>`${x.role==="user"?"USER":"ASSISTANT"}: ${String(x.text||"")}`).join("\n");const prompt=`You are StudentHubHelp's Ultra Advance AI Assistant.
Match the user's language: natural Hinglish/Hindi/English.
Be warm, concise, clear and impressive.
Current user: ${msg}
Conversation:
${h}
Property intent: ${label(c||"")}
Reference: ${near||"none"}
LIVE SUPABASE LISTINGS (ONLY SOURCE OF TRUTH FOR PROPERTY FACTS):
${JSON.stringify(recs.slice(0,8))}
Rules:
- Never invent property facts.
- Property name, price, phone, address, rating, facilities, verification, description and distance must come only from supplied live listing data.
- Never use outside knowledge to create a StudentHubHelp listing.
- Distance is approximate straight-line distance and may be stated only when distanceLabel exists.
- If a requested fact is missing, say it is not currently available.
- Keep property results focused; do not replace the requested category with another category.
- Preserve the user's conversational context only when it matches the current intent.
- The current user message has priority over older property-search context.
- Never turn account/login/password/OTP/Google-sign-in/dashboard-access messages into property searches.
- Never recommend listings unless the current message has a property-search intent.
- Do not expose internal system/tool details.
Return only the natural reply text.`;
const enhancementTimeout=Math.min(8000,Math.max(0,deadlineAt===undefined?8000:deadlineAt-Date.now()));if(enhancementTimeout<250)return{};const enhancementController=new AbortController(),enhancementTimer=setTimeout(()=>enhancementController.abort(),enhancementTimeout);try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":GEMINI},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:cfg.max_output_tokens,temperature:cfg.temperature,thinkingConfig:{thinkingLevel:"low"}}}),signal:enhancementController.signal});if(!r.ok)return{};const j=await r.json();return{reply:j?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("")||""}}finally{clearTimeout(enhancementTimer)}}catch(e){console.warn("Gemini enhancement skipped; deterministic response retained",e instanceof Error?e.message:String(e));return{}}}

async function dbWrite(method:string,path:string,body:any,prefer="return=minimal"){
  if(!U||!K)throw Error("database configuration missing");
  const r=await fetch(U+path,{method,headers:{apikey:K,Authorization:`Bearer ${K}`,"Content-Type":"application/json",Prefer:prefer},body:JSON.stringify(body),signal:AbortSignal.timeout(4000)});
  if(!r.ok)throw Error(`database write ${r.status}: ${(await r.text()).slice(0,200)}`);
  if(r.status===204)return null;
  return await r.json().catch(()=>null);
}
async function logChatTurn(sessionId:string,userMessage:string,payload:any){
  try{
    const intent=String(payload?.intent||"").slice(0,200)||null;
    const primaryTopic=String(payload?.primaryTopic||"").slice(0,200)||null;
    const targetCity=String(payload?.targetCity||"").slice(0,120)||null;
    const recommendedCategory=String(payload?.targetCategory||"").slice(0,120)||null;
    const recs=Array.isArray(payload?.recommendedProperties)?payload.recommendedProperties:(Array.isArray(payload?.recommendations)?payload.recommendations:[]);
    const grounded=payload?.grounded===true;
    const existing=await db<any[]>(`/rest/v1/chatbot_conversations?select=id,message_count,first_message_at&session_id=eq.${encodeURIComponent(sessionId)}&limit=1`);
    let conversationId:string;
    let oldCount=0;
    if(existing[0]){
      conversationId=String(existing[0].id);
      oldCount=Number(existing[0].message_count||0);
    }else{
      const created=await dbWrite("POST","/rest/v1/chatbot_conversations",{session_id:sessionId,message_count:0,primary_topic:primaryTopic,intent,target_city:targetCity,recommended_category:recommendedCategory,grounded,metadata:{source:"studenthubhelp-chat"}},"return=representation");
      conversationId=String(created?.[0]?.id||"");
      if(!conversationId)throw Error("conversation id missing");
    }
    const nowCount=oldCount+2;
    await dbWrite("POST","/rest/v1/chatbot_messages",{conversation_id:conversationId,session_id:sessionId,role:"user",message:userMessage.slice(0,1500),intent,primary_topic:primaryTopic,sentiment:null,recommended_properties:[],metadata:{source:"live_chatbot"}});
    await dbWrite("POST","/rest/v1/chatbot_messages",{conversation_id:conversationId,session_id:sessionId,role:"assistant",message:String(payload?.reply||"").slice(0,8000),intent,primary_topic:primaryTopic,sentiment:null,recommended_properties:recs.slice(0,8),metadata:{source:"live_chatbot",webGrounded:payload?.webGrounded===true,searchMode:payload?.searchMode||null}});
    await dbWrite("PATCH",`/rest/v1/chatbot_conversations?id=eq.${encodeURIComponent(conversationId)}`,{last_message_at:new Date().toISOString(),message_count:nowCount,primary_topic:primaryTopic,intent,target_city:targetCity,recommended_category:recommendedCategory,last_user_message:userMessage.slice(0,1500),last_bot_reply:String(payload?.reply||"").slice(0,8000),live_active_property_count:recs.length,grounded,metadata:{source:"studenthubhelp-chat",lastEvent:"chat_response",webGrounded:payload?.webGrounded===true}});
    await dbWrite("POST","/rest/v1/chatbot_events",{conversation_id:conversationId,session_id:sessionId,event_type:"chat_response",payload:{intent,primaryTopic,targetCity,recommendedCategory,recommendedPropertyCount:recs.length,grounded}});
  }catch(e){
    console.error("chatbot persistence failed",e);
  }
}
async function chatResponse(payload:any,init:any,sessionId:string,userMessage:string){
  EdgeRuntime.waitUntil(logChatTurn(sessionId,userMessage,payload));
  return new Response(JSON.stringify(payload),init);
}
function offlineGeneralReply(msg:string){
 const x=n(msg);
 if(/2\s*\+\s*2/i.test(msg)||/\b(2 plus 2|two plus two)\b/i.test(x))return "2 + 2 = **4** 😊";
 if(/photosynthesis|प्रकाश संश्लेषण/i.test(x))return "**Photosynthesis (प्रकाश संश्लेषण)** वह प्रक्रिया है जिसमें हरे पौधे sunlight, पानी और carbon dioxide की मदद से अपना भोजन (glucose) बनाते हैं और oxygen छोड़ते हैं.\n\n**Equation:** Carbon dioxide + Water + Light → Glucose + Oxygen.";
 if(/interesting fact|something interesting|tell me a fact|kuch interesting|रोचक तथ्य/i.test(x))return "✨ Ek interesting fact: Octopus ke **3 hearts** hote hain, aur uska blood blue hota hai.";
 if(/tired|bored|alone|थक|बोर|अकेल|mood.*fresh|motivat/i.test(x))return "Samajh sakta hoon 😊 2 minute ka mini reset try karo: paani piyo, thoda stretch karo, 5 deep breaths lo, phir bas 10 minute ka ek chhota study target choose karo. Chaaho to hum thodi casual baat bhi kar sakte hain.";
 if(/what is|define|meaning of|kya hota|samjhao|explain/i.test(x)&&/gravity|गुरुत्वाकर्षण/i.test(x))return "Gravity (गुरुत्वाकर्षण) woh force hai jo objects ko ek-doosre ki taraf attract karti hai. Earth ki gravity humein zameen par rakhti hai aur cheezon ko neeche girati hai.";
 if(/hello|hi|hey|namaste|kaise ho|kya haal/i.test(x))return "Namaste 😊 Main yahin hoon—study questions, general knowledge, ideas ya StudentHubHelp listings mein help kar sakta hoon. Aaj kya karna hai?";
 return "Main bina external AI API key ke live StudentHubHelp listings, location-based search, booking guidance aur kuch common study/general questions handle kar sakta hoon. Is sawaal ka reliable jawab dene ke liye thoda aur context ya specific question bhej dijiye 😊";
}
async function aiGeneral(msg:string,history:any[],cfg:ChatbotRuntimeConfig=DEFAULT_RUNTIME_CONFIG,deadlineAt?:number){const offline=offlineGeneralReply(msg);if(!GEMINI||offline!=="Main bina external AI API key ke live StudentHubHelp listings, location-based search, booking guidance aur kuch common study/general questions handle kar sakta hoon. Is sawaal ka reliable jawab dene ke liye thoda aur context ya specific question bhej dijiye 😊")return{reply:offline,webGrounded:false,webSources:[]};try{const h=history.slice(-8).map(x=>({role:x.role==="assistant"?"model":"user",parts:[{text:String(x.text||"").slice(0,1500)}]}));const system=`You are StudentHubHelp's Ultra Advance AI Assistant for students.
You are a natural conversational, study and general knowledge assistant.
Match the user's language and tone: Hindi, Hinglish or English.
You can discuss normal life, boredom, tiredness, motivation, hobbies and casual topics in a friendly respectful way.
You can answer questions across school/college subjects and explain concepts step-by-step when useful.
If the user asks for current/fresh information, use Google Search grounding when available.
Do not claim StudentHubHelp property facts here. Property data belongs to the separate live Supabase property flow.
Do not pretend to know personal facts about the user.
Keep normal chat concise and human; for study questions be clear and useful.
Current message: ${msg}`;
const body:any={contents:[...h,{role:"user",parts:[{text:system}]}],generationConfig:{maxOutputTokens:cfg.max_output_tokens,temperature:cfg.temperature,thinkingConfig:{thinkingLevel:"medium"}}};if(wantsCurrentWeb(msg))body.tools=[{google_search:{}}];const aiTimeout=Math.min(8000,Math.max(0,deadlineAt===undefined?8000:deadlineAt-Date.now()));if(aiTimeout<250)return{reply:offlineGeneralReply(msg),webGrounded:false,webSources:[]};const aiController=new AbortController(),aiTimer=setTimeout(()=>aiController.abort(),aiTimeout);let r:Response;try{r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":GEMINI},body:JSON.stringify(body),signal:aiController.signal})}finally{clearTimeout(aiTimer)};if(!r.ok)return{reply:offlineGeneralReply(msg),webGrounded:false,webSources:[]};const j=await r.json();const reply=j?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("")||"";const chunks=j?.candidates?.[0]?.groundingMetadata?.groundingChunks||[];const sources=chunks.map((x:any)=>x?.web?.uri&&{url:x.web.uri,title:x.web.title||x.web.uri}).filter(Boolean).slice(0,5);return{reply:reply||offlineGeneralReply(msg),webGrounded:sources.length>0,webSources:sources}}catch{return{reply:offlineGeneralReply(msg),webGrounded:false,webSources:[]}}}

Deno.serve(async(req:Request)=>{
 const requestDeadlineAt=Date.now()+12000;
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return new Response(JSON.stringify({error:"POST required"}),{status:405,headers:H});
 try{
  const contentLength=Number(req.headers.get("content-length")||0);if(contentLength>32768)return new Response(JSON.stringify({error:"Request is too large."}),{status:413,headers:H});
  const rawBody=await req.text();if(new TextEncoder().encode(rawBody).byteLength>32768)return new Response(JSON.stringify({error:"Request is too large."}),{status:413,headers:H});
  let b:any;try{b=JSON.parse(rawBody)}catch{return new Response(JSON.stringify({error:"Invalid JSON request."}),{status:400,headers:H})}
  const msg:string=String(b?.message||"").trim().slice(0,1500),history:{role:string;text:string}[]=Array.isArray(b?.history)?b.history.slice(-8).map((x:any)=>({role:String(x?.role||"").slice(0,20),text:String(x?.text||"").slice(0,1500)})):[];
  if(!msg)return new Response(JSON.stringify({error:"Message is required"}),{status:400,headers:H});
  const sessionId=String(b?.sessionId||crypto.randomUUID()).slice(0,160);
  try{if(!await consumeDualRateLimit("chat",req,sessionId,30,60))return new Response(JSON.stringify({success:false,error_code:"RATE_LIMIT_EXCEEDED",error:"Too many requests. Please try again shortly.",can_retry:true}),{status:429,headers:{...H,"Retry-After":"60"}})}catch(e){console.error(e);return new Response(JSON.stringify({success:false,error_code:"RATE_LIMIT_UNAVAILABLE",reply:"Chat service temporarily unavailable. Please try again shortly.",can_retry:true}),{status:503,headers:H})}
  const cfg=await getRuntimeConfig();
  if(!cfg.enabled)return new Response(JSON.stringify({reply:cfg.maintenance_message||"StudentHubHelp AI assistant is temporarily unavailable. Please try again shortly.",grounded:false,maintenance:true}),{status:503,headers:H});
  if(String(b?.action||"")==="submit_owner_lead"){
    if(!cfg.lead_capture_enabled)return new Response(JSON.stringify({error:"Owner listing requests are temporarily disabled."}),{status:403,headers:H});
    try{if(!await consumeDualRateLimit("owner_lead",req,sessionId,3,600))return new Response(JSON.stringify({error:"Too many owner requests. Please try again later."}),{status:429,headers:{...H,"Retry-After":"600"}})}catch(e){console.error(e);return new Response(JSON.stringify({error:"Owner request service temporarily unavailable."}),{status:503,headers:H})}
    const lead=b?.ownerLead||{};
    const name=String(lead.name||"").trim().replace(/\s+/g," ").slice(0,80);
    const phone=String(lead.phone||"").trim().slice(0,20);
    const digits=phone.replace(/\D/g,"");
    const category=String(lead.category||"").trim().slice(0,40);
    const area=String(lead.area||"").trim().replace(/\s+/g," ").slice(0,120);
    const allowedCategories=new Set(["Hostel / PG","Tiffin","Library","Cafe","Bookstore","Other"]);
    if(name.length<2||digits.length<10||digits.length>13||!allowedCategories.has(category)||area.length<2){
      return new Response(JSON.stringify({error:"Please provide a valid name, mobile number, category and area."}),{status:400,headers:H});
    }
    try{
      await dbWrite("POST","/rest/v1/chatbot_leads",{session_id:sessionId,name,phone,city:area,detected_need:"Owner listing request: "+category,status:"new",source:"owner_listing_form",metadata:{category,area,review_required:true,publish_automatically:false,verification_required:true}});
      return await chatResponse({reply:"Request successfully received 😊\n\n**Status:** Pending admin review\n**Category:** "+category+"\n**Area:** "+area+"\n\nTeam will review your request. This does not publish or verify the listing automatically.",intent:"Owner Listing Lead",primaryTopic:"Owner listing request",recommendedProperties:[],recommendations:[],suggestedFollowUps:["Find a hostel","Find a tiffin service","Contact support"],grounded:true,sessionId},{headers:H},sessionId,msg);
    }catch(e){
      console.error("owner listing lead save failed",e);
      return new Response(JSON.stringify({error:"Could not save the request right now. Please try again shortly."}),{status:503,headers:H});
    }
  }
  if(isGreeting(msg))return await chatResponse({reply:greeting(),intent:"Greeting / Onboarding",primaryTopic:"StudentHubHelp AI",suggestedFollowUps:["Find a hostel","Find a tiffin service","Find a library","Contact support"],recommendations:[],recommendedProperties:[],grounded:true,sessionId},{headers:H},sessionId,msg);
  const requestedFocusId=String(b?.focusPropertyId||"");
  const requestedFocusType=String(b?.focusPropertyType||"");
  if((isPhoneIntent(msg)||isDetailIntent(msg))&&requestedFocusId){
    const focusHistory=history.filter((x:{role:string;text:string})=>x.role==="user").map((x:{role:string;text:string})=>x.text||"").join(" ");
    const focusCombined=focusHistory+" "+msg;
    const focusType=requestedFocusType||cat(focusCombined)||"hostel";
    const focusRows=await multiDirect([focusType],city(focusCombined)||"");
    const focus=focusRows.find(p=>String(p.id)===requestedFocusId);
    if(focus){
      const fp=card(focus);
      if(isPhoneIntent(msg)){
        const raw=String(fp.phone||"").trim();
        const validPhone=raw&&raw!=="0"&&raw.replace(/\D/g,"").length>=7?raw:"";
        const reply=validPhone?"Ji 😊 **"+fp.name+"** ka listed phone number: **"+validPhone+"**":"Is listing ka valid phone number abhi StudentHubHelp data me available nahi hai.";
        return await chatResponse({reply,intent:"Property Contact",primaryTopic:label(focusType)+" contact",recommendedProperties:[fp],recommendations:[fp],suggestedFollowUps:["Iske full details batao","Allen ke paas aur options dikhao"],grounded:true,sessionId},{headers:H},sessionId,msg);
      }
      const ar=await aiProperty(msg,history,[fp],focusType,nearTerm(focusCombined),cfg,requestDeadlineAt);
      const reply=ar.reply||("Bilkul 😊 **"+fp.name+"** ki available details neeche di hain.");
      return await chatResponse({reply,intent:"Property Details",primaryTopic:label(focusType)+" details",recommendedProperties:[fp],recommendations:[fp],suggestedFollowUps:["Iska phone number batao","Allen ke paas aur options dikhao"],grounded:true,sessionId},{headers:H},sessionId,msg);
    }
  }
  if(isAccountSupport(msg))return await chatResponse({reply:accountSupportReply(msg),intent:"Account / Login Support",primaryTopic:"Account access",suggestedFollowUps:["I forgot my password","Google login is not working","Dashboard is not opening","Contact support"],recommendations:[],recommendedProperties:[],grounded:true,sessionId},{headers:H},sessionId,msg);
  if(isContact(msg)||String(b?.action||"")==="contact_support")return await chatResponse({reply:"Ji bilkul 😊 StudentHubHelp team se contact ke liye:\n\n📧 Email: studenthubhelpp@gmail.com\n📞 Phone: +91 9929718264",intent:"Support / Contact",primaryTopic:"Contact StudentHubHelp",suggestedFollowUps:["Find a hostel","Find a library","Search by area","Back to search"],recommendations:[],recommendedProperties:[],grounded:true,sessionId},{headers:H},sessionId,msg);
  const previous=history.filter(x=>x.role==="user").map(x=>x.text||" ").join(" ");
  const combined=previous+" "+msg;
  const aiRaw=await aiUnderstand(msg,history,cfg,requestDeadlineAt);
  const u=mergeIntent(aiRaw,msg,history);
  const explicitCat=cat(msg),nearCats=secondaryCats(msg);
  const multiCategoryRequest=/(?:\b(?:and|plus|with)\b|\+|\baur\b|और)/i.test(n(msg));
  const detectedCats=["hostel","tiffin","library","cafe","bookstore"].filter(type=>new RegExp(type==="hostel"?"hostel|\\bpg\\b|हॉस्टल|पीजी":type==="tiffin"?"tiffin|mess|meal|टिफिन|मेस":type==="library"?"library|reading room|लाइब्रेरी":type==="cafe"?"cafe|कैफे":"bookstore|book shop|stationery|बुकस्टोर","i").test(n(msg)));
  const aiCats=explicitCat&&!multiCategoryRequest?[explicitCat]:[...new Set([...(u.categories||[]),...detectedCats])];
  const c=explicitCat&&!multiCategoryRequest?explicitCat:(u.category||explicitCat||(u.followUp?cat(previous):""));
  const propertyMode=u.intent.startsWith("property_")||isPropertyQuery(msg,u.followUp?previous:"");
  const locationForFilter=strictLocation(msg);
  const ct=locationForFilter.city||u.city||(u.followUp?city(previous):"");
  const rawAreaTerm=u.area||u.locality||"";
  const areaTerm=isCityDuplicateTerm(rawAreaTerm,ct)?"":rawAreaTerm;
  const rawNear=u.landmark||areaTerm||(u.nearRelation?nearTerm(msg):"");
  const near=isCityDuplicateTerm(rawNear,ct)?"":rawNear;
  const action=String(b?.action||u.action||"");
  const shownList=(Array.isArray(b?.shownPropertyIds)?b.shownPropertyIds:[]).map((x:any)=>String(x));
  const shownIds=new Set(shownList);
  const clientCoords=coords(b?.clientCoords);
  const genericNearbyIntent=/(?:\bnear me\b|\bnearby\b|\bnearest\b|mere paas|mere pass|mere aas paas|aas paas|पास में|मेरे पास)/i.test(n(msg))&&!u.landmark&&!u.area&&!u.locality&&!nearTerm(msg);
  if(propertyMode&&genericNearbyIntent&&!clientCoords)return await chatResponse({reply:"Aapke aas-paas listings dikhane ke liye device location ki zaroorat hai. Kripya location access allow karein ya apna landmark/area batayein (jaise Piprali Road ya Allen ke paas).",intent:"Location Required",primaryTopic:"Nearby listing search",recommendedProperties:[],recommendations:[],suggestedFollowUps:["Search by area","Search by city"],grounded:true,sessionId},{headers:H},sessionId,msg);
  if(action==="search_area"&&!city(msg)&&!nearTerm(msg))return await chatResponse({reply:"Bilkul 😊 Aap kis **area / locality** mein search karna chahte hain? Area ka naam bhejiye, main current requirement ke saath search refine kar dunga.",intent:"Area Refinement",primaryTopic:c?label(c)+" discovery":"Student Services Discovery",recommendedProperties:[],recommendations:[],suggestedFollowUps:["Search by city","Show more options","Contact support"],grounded:true,sessionId},{headers:H},sessionId,msg);
  if(u.needsClarification&&u.clarificationQuestion&&!u.category&&!u.categories.length&&!u.locality&&!u.area&&!u.landmark)return await chatResponse({reply:u.clarificationQuestion,intent:"Clarification",primaryTopic:"Requirement clarification",recommendedProperties:[],recommendations:[],suggestedFollowUps:["Find a hostel","Find a library","Find a cafe","Find a tiffin service"],grounded:true,sessionId},{headers:H},sessionId,msg);
  if(u.intent==="property_reference"&&u.referenceIndex){
    const all=await multiDirect(["hostel","tiffin","library","cafe","bookstore"],ct);
    const ordered=shownList.length?shownList.map((id:string)=>all.find(p=>String(p.id)===id)).filter(Boolean):[];
    const target=ordered[u.referenceIndex-1]||all.find(p=>String(p.id)===shownList[u.referenceIndex-1]);
    if(target){
      const fp=card(target),wantPhone=u.action==="phone"||isPhoneIntent(msg);
      if(wantPhone){const ph=String(fp.phone||"").trim();const reply=ph&&ph.replace(/\\D/g,"").length>=7?"Ji 😊 **"+fp.name+"** ka listed phone number: **"+ph+"**":"Is listing ka valid phone number abhi StudentHubHelp data me available nahi hai.";return await chatResponse({reply,intent:"Property Contact",primaryTopic:"Referenced property contact",recommendedProperties:[fp],recommendations:[fp],suggestedFollowUps:["Iske full details batao","Aur options dikhao"],grounded:true,sessionId},{headers:H},sessionId,msg)}
      const ar=await aiProperty(msg,history,[fp],fp.type,near,cfg,requestDeadlineAt),reply=ar.reply||("Bilkul 😊 **"+fp.name+"** ki available details neeche di hain.");return await chatResponse({reply,intent:"Property Reference",primaryTopic:"Referenced property",recommendedProperties:[fp],recommendations:[fp],suggestedFollowUps:["Iska phone number batao","Aur options dikhao"],grounded:true,sessionId},{headers:H},sessionId,msg)
    }
  }
  if(cfg.comparison_enabled&&(/(?:konsa|kaunsa|kaunsi|which|should i|chahiye).{0,35}(book|hostel|pg)|(?:book|hostel|pg).{0,35}(konsa|kaunsa|kaunsi|which|should)/i.test(n(msg)))&&!isBookingInfoQuestion(msg)){
    const decisionRows=await multiDirect([c||"hostel"],ct,u.budgetMax??undefined,u.area||u.locality||undefined,u.gender||genderWanted(msg));
    const decisionLandmark=findLandmark(near||"");
    if(decisionLandmark){for(const p of decisionRows){const d=distanceToLandmark(p,decisionLandmark);if(d!==undefined)p._distanceKm=d;else if(searchText(p).includes(n(decisionLandmark.key)))p._nearbyAreaMatch=true}}
    let decision=decisionRows.filter(p=>!shownIds.has(String(p.id)));
    if(decisionLandmark)decision=decision.filter(p=>n(p.city||"")===n(decisionLandmark.city)&&((p._distanceKm!==undefined&&p._distanceKm<=10)||p._nearbyAreaMatch===true));
    if(u.budgetMax!==null||u.budgetMin!==null)decision=decision.filter(p=>{const v=budgetValue(p,p._type||c);return v!==undefined&&(u.budgetMax===null||v<=u.budgetMax)&&(u.budgetMin===null||v>=u.budgetMin)});
    const rankedDecision=decision.map(p=>({...p,_score:rank(p,combined,ct,near)})).sort((a,z)=>z._score-a._score).slice(0,cfg.max_results).map(card);
    const ar=await aiProperty(msg,history,rankedDecision,c||"hostel",near,cfg,requestDeadlineAt);
    const reply=ar.reply||"Aapki requirement ke hisaab se live options compare kar sakte hain.";
    return await chatResponse({reply,intent:"Property Comparison",primaryTopic:label(c||"hostel")+" comparison",recommendedProperties:rankedDecision,recommendations:rankedDecision,suggestedFollowUps:["Boys hostel dikhao","Girls hostel dikhao","Budget ke according dikhao"],grounded:true,sessionId},{headers:H},sessionId,msg);
  }

const ownerDetailsIntent=/(?:owner|malik|maalik|proprietor|manager).{0,35}(?:details?|contact|phone|number|kaise|kese|kahan|how to|baat kare|baat kar|connect)|(?:details?|contact|phone|number).{0,35}(?:owner|malik|maalik|proprietor|manager)/i.test(n(msg));
  const ownerBusinessName=(()=>{
    const x=msg.trim();
    const patterns=[
      /^(.+?)\s+(?:ki|ke)\s+owner\s+(?:(?:ki|ke)\s+)?(?:details?|contact|phone|number)\b/i,
      /^(.+?)\s+(?:ki|ke|ka|k)\s+owner\s+(?:se\s+)?(?:details?|contact|phone|number|kaise|kese|kahan|how|baat|connect)\b/i,
      /^(.+?)\s+(?:owner|malik|maalik|proprietor|manager)\s+(?:details?|contact|phone|number)\b/i,
      /(?:details?|contact|phone|number)\s+(?:of\s+)?(.+?)\s+(?:owner|malik|maalik|proprietor|manager)\b/i
    ];
    for(const re of patterns){const m=x.match(re);if(m?.[1])return m[1].replace(/\b(?:please|plz|batao|btao|kese|kaise|kre|karo|kare|krna|karna)\b/gi," ").trim()}
    return "";
  })();
  if(ownerDetailsIntent && ownerBusinessName){
    const allOwnerRows=await multiDirect(["hostel","tiffin","library","cafe","bookstore"],"");
    const q=n(ownerBusinessName);
    const matches=allOwnerRows.filter(p=>{
      const name=n(p.name||p.title||p.business_name||p.service_name||"");
      return name===q || (q.length>=4 && (name.includes(q)||q.includes(name)));
    });
    const exact=matches.filter(p=>n(p.name||p.title||p.business_name||p.service_name||"")===q);
    const candidates=exact.length?exact:matches;
    if(candidates.length===1){
      const found=candidates[0], fp=card(found), phone=String(fp.phone||"").trim();
      const contact=phone ? "\n\n📞 **Listed phone:** "+phone : "\n\n📞 Is listing mein valid phone number available nahi hai.";
      const reply="Ji 😊 **"+fp.name+"** ki StudentHubHelp listing mil gayi."+contact+(fp.address?"\n\n📍 **Address:** "+fp.address:"")+(fp.city?"\n🏙️ **City:** "+fp.city:"")+"\n\nOwner se contact ke liye listing ka **Call Owner / WhatsApp** option use karein, agar available ho.";
      return await chatResponse({reply,intent:"Owner / Listing Contact",primaryTopic:"Owner contact details",recommendedProperties:[fp],recommendations:[fp],suggestedFollowUps:["Is listing ki full details batao","Search by area","Contact support"],grounded:true,sessionId},{headers:H},sessionId,msg);
    }
    const reply=candidates.length>1
      ? "Mujhe **"+ownerBusinessName+"** naam se ek se zyada possible listings mili hain. Galat owner details dene se bachne ke liye city/area ya listing link bhej dein."
      : "Mujhe live StudentHubHelp listings mein **"+ownerBusinessName+"** ka exact/clear match nahi mila. Main phone number guess nahi karunga. City/area ya listing link bhej dein, main sahi listing identify karne mein help karunga.";
    return await chatResponse({reply,intent:"Owner / Listing Contact",primaryTopic:"Owner contact lookup",recommendedProperties:[],recommendations:[],suggestedFollowUps:["Search by area","Find a cafe","Contact support"],grounded:true,sessionId},{headers:H},sessionId,msg);
  }
  if(isOwnerContactQuestion(msg)){
  const reply = "Ji 😊 Owner se contact karne ke liye StudentHubHelp par us business ki listing kholiye aur **Call Owner / WhatsApp** button use kijiye, agar available ho. Main bina exact listing match kiye kisi business ka phone number confirm nahi karunga. Aap business ka exact naam, city/area ya listing link bhej dein, taaki sahi listing aur available contact details identify karne mein help mil sake.";

  return await chatResponse({
    reply,
    intent: "Owner Contact Guidance",
    primaryTopic: "Contact a business owner",
    recommendedProperties: [],
    recommendations: [],
    suggestedFollowUps: [
      "Find a cafe",
      "Search by area",
      "Contact support"
    ],
    grounded: true,
    sessionId
  }, {headers:H}, sessionId, msg);
}

  if(isPropertyAdviceQuestion(msg)){const adviceCat=cat(msg)||cat(previous)||"hostel";return await chatResponse({reply:adviceReply(adviceCat),intent:"Property Selection Guidance",primaryTopic:label(adviceCat)+" selection guidance",recommendedProperties:[],recommendations:[],suggestedFollowUps:["Find a property","Search by area","Show more options","Contact support"],grounded:true,sessionId},{headers:H},sessionId,msg);}
  if(isBookingInfoQuestion(msg)){const ar=await aiGeneral(`The user asks how to book/reserve a hostel or PG. Explain a practical StudentHubHelp booking process: shortlist suitable live listings, open full details, check price/room type/availability, call owner, confirm terms and visit/verify before paying. Do not invent any property-specific availability or booking facility.`,history,cfg,requestDeadlineAt);const reply=ar.reply||"Hostel book karne ka simple process: pehle suitable listing shortlist karein, full details me price/room type check karein, owner ko Call karke availability aur terms confirm karein, aur payment se pehle property/owner verify karein.";return await chatResponse({reply,intent:"Booking Guidance",primaryTopic:"Hostel / PG Booking",recommendedProperties:[],recommendations:[],suggestedFollowUps:["Allen ke paas hostel dikhao","Budget ke according hostel dikhao","Boys hostel dikhao","Girls hostel dikhao"],grounded:true,sessionId},{headers:H},sessionId,msg);}
  if(!propertyMode){const ar=await aiGeneral(msg,history,cfg,requestDeadlineAt);const reply=ar.reply||"Bilkul 😊 Main yahin hoon. Aap jo poochna chahein, seedha poochiye—study, ideas, facts ya normal conversation, sab par baat kar sakte hain.";return await chatResponse({reply,intent:"General / Study / Conversation",primaryTopic:"Student AI Assistant",recommendedProperties:[],recommendations:[],suggestedFollowUps:["Ask a study question","Tell me something interesting","Find a property","Contact support"],grounded:true,webGrounded:ar.webGrounded||false,webSources:ar.webSources||[],sessionId},{headers:H},sessionId,msg);}
  const comboCategories=[...new Set([...(c?[c]:[]),...aiCats,...nearCats,...(["hostel","tiffin","library","cafe","bookstore"].filter(type=>new RegExp(type==="hostel"?"hostel|\\bpg\\b":type==="tiffin"?"tiffin|mess":type==="library"?"library":type==="cafe"?"cafe":"bookstore","i").test(n(msg))))])];
  const budgetFromText=Number(u.budgetMax)||Number(String(msg.match(/(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{3})+|\d{4,6})/i)?.[1]||"").replace(/,/g,""))||0;
  if(cfg.budget_planner_enabled&&budgetFromText>0&&comboCategories.includes("hostel")&&comboCategories.includes("tiffin")){
    if(!ct)return await chatResponse({reply:"Hostel + tiffin ka exact monthly combo banane ke liye apni city bata dijiye.",intent:"Budget Planning",primaryTopic:"Hostel + Tiffin Combo Budget",recommendedProperties:[],recommendations:[],suggestedFollowUps:["Sikar mein ₹8000 budget","Kota mein ₹8000 budget","Jaipur mein ₹8000 budget"],grounded:true,sessionId},{headers:H},sessionId,msg);
    const combo=await planComboBudget(ct,budgetFromText,u.gender||genderWanted(msg));
    if(!combo)return await chatResponse({reply:`${ct} mein ₹${budgetFromText.toLocaleString("en-IN")} ke andar dono categories ke verified monthly prices wala combo nahi mila. Kuch listings mein monthly rent/plan missing hai, isliye main unka total guess nahi karunga. Aap budget badha sakte hain ya hostel aur tiffin alag-alag search kar sakte hain.`,intent:"Budget Planning",primaryTopic:"Hostel + Tiffin Combo Budget",recommendedProperties:[],recommendations:[],suggestedFollowUps:["Hostel alag search karo","Tiffin alag search karo","Budget badhakar try karo"],grounded:true,sessionId},{headers:H},sessionId,msg);
    const hostelCard=card(combo.hostel),tiffinCard=card(combo.tiffin),total=combo.total,savings=budgetFromText-total;
    const budgetPlan={targetBudget:budgetFromText,city:ct,livingType:"pg_tiffin" as const,items:[{category:"rent" as const,label:`${hostelCard.name} — ₹${combo.hostelCost.toLocaleString("en-IN")}/month`,amount:combo.hostelCost,note:[hostelCard.area,hostelCard.city].filter(Boolean).join(", ")},{category:"food" as const,label:`${tiffinCard.name} — ₹${combo.tiffinCost.toLocaleString("en-IN")}/month`,amount:combo.tiffinCost,note:[tiffinCard.area,tiffinCard.city].filter(Boolean).join(", ")}],totalEstimated:total,savingsOrOverrun:savings,status:savings>300?"under_budget" as const:savings< -300?"over_budget" as const:"balanced" as const,savingsTips:["Prices are taken from active StudentHubHelp listings; confirm inclusions and availability with the provider before payment."],recommendedCombo:`${hostelCard.name} + ${tiffinCard.name}`};
    const reply=`Aapke ₹${budgetFromText.toLocaleString("en-IN")} monthly budget mein ${ct} ka best available combo:\n\n🏠 **Hostel:** ${hostelCard.name} — ₹${combo.hostelCost.toLocaleString("en-IN")}/month\n🍲 **Tiffin:** ${tiffinCard.name} — ₹${combo.tiffinCost.toLocaleString("en-IN")}/month\n\n💰 **Total:** ₹${total.toLocaleString("en-IN")}/month\n**Bachat:** ₹${savings.toLocaleString("en-IN")}/month\n\nYeh prices active listing records se li gayi hain; final inclusions aur availability provider se confirm karein.`;
    return await chatResponse({reply,intent:"Combined Budget Plan",primaryTopic:"Hostel + Tiffin Combo Budget",budgetPlan,recommendedProperties:[hostelCard,tiffinCard],recommendations:[hostelCard,tiffinCard],suggestedFollowUps:["Hostel ki full details batao","Tiffin ki full details batao","Aur combo options dikhao"],grounded:true,sessionId,targetCity:ct,targetCategory:"hostel+tiffin"},{headers:H},sessionId,msg);
  }
  let rows=await multiDirect(aiCats.length?aiCats:(c?[c]:(nearCats.length?nearCats:["hostel"])),ct,u.budgetMax??undefined,areaTerm||undefined,u.gender||genderWanted(msg));
  if(clientCoords)for(const p of rows){const d=distanceKm(clientCoords,p);if(d!==undefined)p._distanceKm=d}
  const wantedGender=u.gender||genderWanted(msg),wantedArea=areaTerm?(/nawalgarh/i.test(areaTerm)?"nawalgarh":/piprali/i.test(areaTerm)?"piprali":areaTerm.toLowerCase()):areaWanted(msg);
  const wantedLocality=isCityDuplicateTerm(u.locality,ct)?"":n(u.locality||"");
  if(wantedGender)rows=rows.filter(p=>{const z=searchText(p);const g=n([p.gender_type,p.gender,p.hostel_type,p.type,p.name,p.title,p.description].filter(Boolean).join(" "));return wantedGender==="girls"?/girls|girl|female|women|ladki|ladkiyon|महिला|लड़क/i.test(g):/boys|boy|male|men|ladke|लड़के/i.test(g)});
  // Explicit city is a hard boundary; never leak another city into the answer.
  if(ct)rows=rows.filter(p=>cityMatches(p.city,ct));
  if(wantedArea)rows=rows.filter(p=>searchText(p).includes(n(wantedArea)));
  if(wantedLocality)rows=rows.filter(p=>searchText(p).includes(wantedLocality));
  // An explicit road/locality is also a hard constraint when the user asked for it.
  if(locationForFilter.area)rows=rows.filter(p=>searchText(p).includes(n(locationForFilter.area)));
  if(u.budgetMax!==null||u.budgetMin!==null)rows=rows.filter(p=>{const v=budgetValue(p,p._type||c);if(v===undefined)return false;return (u.budgetMax===null||v<=u.budgetMax)&&(u.budgetMin===null||v>=u.budgetMin)});
  if(u.facilities?.length)rows=rows.filter(p=>matchesFacility(p,u.facilities));
  const landmark=u.landmark?findLandmark(u.landmark)||LANDMARKS.find(l=>l.key===u.landmark):findLandmark(near||"");
  if(landmark){for(const p of rows){const d=distanceToLandmark(p,landmark);if(d!==undefined)p._distanceKm=d;else if(searchText(p).includes(n(landmark.key)))p._nearbyAreaMatch=true}rows=rows.filter(p=>cityMatches(p.city,landmark.city)&&((p._distanceKm!==undefined&&p._distanceKm<=10)||p._nearbyAreaMatch===true))}
  else if(near){const q=n(normalizeSearchTerms(near));const exact=rows.filter(p=>searchText(p).includes(q));if(exact.length){for(const p of exact)if(p._distanceKm===undefined)p._nearbyAreaMatch=true;rows=exact}else rows=[]}
  if(nearCats.length){const secondaryRows=await multiDirect(nearCats,ct);for(const p of rows){let best=Infinity,hasCoords=false;for(const q of secondaryRows){const d=distanceKm(p,q);if(d!==undefined){hasCoords=true;best=Math.min(best,d)}else if(p.area&&searchText(q).includes(n(p.area)))best=Math.min(best,1)}if(best<=3){p._nearbyDistanceKm=best;p._nearbyVerified=hasCoords;p._nearbyAreaMatch=!hasCoords}}rows=rows.filter(p=>p._nearbyDistanceKm!==undefined)}
  rows=rows.filter(p=>!shownIds.has(String(p.id)));
  const ranked=rows.map(p=>({...p,_score:rank(p,combined,ct,near)})).sort((a,z)=>z._score-a._score).slice(0,cfg.max_candidates);
  let recs=ranked.slice(0,cfg.max_results).map(card);
  if(action==="view_details"){const focusId=String(b?.focusPropertyId||""),focusType=String(b?.focusPropertyType||c||"hostel"),focusRows=await multiDirect([focusType],ct),focus=focusRows.find(p=>String(p.id)===focusId);recs=focus?[card(focus)]:recs.slice(0,1)}
  const ar=await aiProperty(msg,history,recs,c,near,cfg,requestDeadlineAt),reply=ar.reply||fallbackReply(c,recs,near,ct),followups=["View full details","Search by area","Show more options","Contact support"];
  return await chatResponse({reply,intent:"Live Property Search",primaryTopic:c?label(c)+" discovery":"Student Services Discovery",recommendedProperties:recs,recommendations:recs,suggestedFollowUps:followups,grounded:true,sessionId,searchMode:"ultra_advance_live_supabase_ai",targetCity:ct||undefined,targetCategory:c||undefined,nearbyTerm:near||undefined,aiIntent:u.intent,aiConfidence:u.confidence,aiEntities:{category:u.category,categories:u.categories,city:u.city,locality:u.locality,area:u.area,landmark:u.landmark,gender:u.gender,budgetMin:u.budgetMin,budgetMax:u.budgetMax,facilities:u.facilities,referenceIndex:u.referenceIndex}},{headers:H},sessionId,msg);
 }catch(e){const errorId=crypto.randomUUID();const timedOut=e instanceof Error&&(e.name==="TimeoutError"||e.name==="AbortError");const errorCode=timedOut?"DATABASE_TIMEOUT":"INTERNAL_ERROR";const reply=timedOut?"Properties search me thoda samay lag raha hai. Kripya dobara try karein.":"Server par temporary connectivity issue aaya hai. Kripya 1 minute baad punah prayas karein.";const status=timedOut?504:500;console.error(`[ERROR_REF:${errorId}] Internal chatbot failure`,{errorCode,message:e instanceof Error?e.message:String(e),stack:e instanceof Error?e.stack:undefined,timestamp:new Date().toISOString()});return new Response(JSON.stringify({success:false,error_code:errorCode,reply,error:"Temporary server error",error_id:errorId,can_retry:true,grounded:false}),{status,headers:{...H,"Retry-After":"60"}})}
});