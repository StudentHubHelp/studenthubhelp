import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const U=(Deno.env.get("SUPABASE_URL")||"").replace(/\/$/,"");
const K=Deno.env.get("SUPABASE_SECRET_KEY")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const GEMINI=Deno.env.get("GEMINI_API_KEY")||"";
const MODEL="gemini-3.8-flash";
const RATE_WINDOW_MS=60_000, RATE_MAX=30;
const rateMap=new Map<string,{start:number,count:number}>();
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const SRC=[["hostels","hostel"],["tiffins","tiffin"],["libraries","library"],["cafes","cafe"],["bookstores","bookstore"]] as const;
const n=(v:any)=>String(v??"").toLowerCase().normalize("NFKC").replace(/[^a-z0-9\u0900-\u097f]+/gi," ").replace(/\s+/g," ").trim();
const num=(v:any)=>{const x=Number(String(v??"").replace(/,/g,""));return Number.isFinite(x)?x:undefined};
function rateKey(req:Request){const f=req.headers.get("x-forwarded-for")||req.headers.get("cf-connecting-ip")||"unknown";return f.split(",")[0].trim().slice(0,100)||"unknown"}
function allowed(req:Request){const key=rateKey(req),now=Date.now(),old=rateMap.get(key);if(!old||now-old.start>=RATE_WINDOW_MS){rateMap.set(key,{start:now,count:1});return true}if(old.count>=RATE_MAX)return false;old.count++;return true}
async function db<T>(path:string):Promise<T>{if(!U||!K)throw Error("database configuration missing");const r=await fetch(U+path,{headers:{apikey:K,Authorization:`Bearer ${K}`,"Content-Type":"application/json"}});if(!r.ok)throw Error(`database ${r.status}`);return await r.json() as T}
const LANDMARKS=[{key:"allen",label:"Allen Career Institute Sikar",aliases:["allen","allen sikar","allen coaching","allen career","allen sanskar","allen piprali"],city:"Sikar",lat:27.62624,lng:75.17721},{key:"clc",label:"CLC Sikar",aliases:["clc","clc sikar"],city:"Sikar",lat:27.6206291,lng:75.1616672},{key:"vibrant",label:"Vibrant Academy Sikar",aliases:["vibrant","vibrant coaching","vibrant academy","vibrant academy ssc","vibrant ssc"],city:"Sikar"}];
function city(s:string){const x=n(s),m:[string,string][]=[["sikar","Sikar"],["piprali","Sikar"],["पिपराली","Sikar"],["सिकर","Sikar"],["kota","Kota"],["talwandi","Kota"],["jaipur","Jaipur"],["ajmer","Ajmer"],["bikaner","Bikaner"],["jodhpur","Jodhpur"],["udaipur","Udaipur"],["alwar","Alwar"],["delhi","Delhi"],["ahmedabad","Ahmedabad"],["lucknow","Lucknow"],["hyderabad","Hyderabad"],["pune","Pune"]];return m.find(([a])=>x.includes(n(a)))?.[1]||""}
function findLandmark(s:string){const x=n(s);for(const l of LANDMARKS)if(l.aliases.some(a=>x.includes(n(a))))return l;return undefined}
function nearTerm(s:string){const x=n(s),lm=findLandmark(x);if(lm)return lm.key;const known=["vibrant coaching","vibrant career institute","nawalgarh road","nawalgarh rd","nawalgarh","clc","allen","gurukripa","matrix academy","prayas eduhub","banco career academy","inspector ssc academy"];const hit=known.find(k=>x.includes(n(k)));if(hit)return hit;const m=x.match(/(?:near|nearby|around|paas|pass|ke paas|k pass|aas paas|bagal|nazdeek|पास|आस पास|बगल)(?:\s+me)?\s+([a-z0-9\u0900-\u097f][a-z0-9\u0900-\u097f ]{1,50}?)(?=\s+(?:chahiye|dikhao|dikhado|hai|ho|rehna|rahna|book|konsa|kaunsa|aur|bhi)\b|$)/i);if(m)return m[1].trim();if(/(?:piprali road|piprali rd|पिपराली रोड)/i.test(x))return "piprali road";return ""}
function cat(s:string){const x=n(s),hits:[string,number][]=[];const defs:[string,RegExp][]=[["hostel",/hostel|pg|room|stay|accommodation|girls|boys|female|male|rehne|rehna|रहने|हॉस्टल|पीजी/],["tiffin",/tiffin|mess|khana|food|meal|jain food|टिफिन|मेस|खाना/],["library",/library|reading|seat|लाइब्रेरी/],["cafe",/cafe|coffee|restaurant|hangout|कैफे/],["bookstore",/bookstore|books|stationery|bookshop|किताब|बुकस्टोर/]];for(const [type,re] of defs)for(const m of x.matchAll(new RegExp(re.source,"gi")))hits.push([type,m.index??-1]);const near=new Set(hits.filter(([,pos])=>/(near|nearby|around|paas|pass|ke paas|k pass|aas paas|bagal|nazdeek|पास|आस पास|बगल)/i.test(x.slice(Math.max(0,pos-50),pos))).map(([type])=>type));return hits.find(([type])=>!near.has(type))?.[0]||hits[0]?.[0]}
function secondaryCats(s:string){const x=n(s),out:string[]=[];const defs:[string,RegExp][]=[["hostel",/hostel|pg|room|stay|accommodation|girls|boys|female|male|rehne|rehna|रहने|हॉस्टल|पीजी/],["tiffin",/tiffin|mess|khana|food|meal|टिफिन|मेस|खाना/],["library",/library|reading|seat|लाइब्रेरी/],["cafe",/cafe|coffee|restaurant|hangout|कैफे/],["bookstore",/bookstore|books|stationery|bookshop|किताब|बुकस्टोर/]];for(const [type,re] of defs)for(const m of x.matchAll(new RegExp(re.source,"gi"))){const pos=m.index??-1;if(/(near|nearby|around|paas|pass|ke paas|k pass|aas paas|bagal|nazdeek|पास|आस पास|बगल)/i.test(x.slice(Math.max(0,pos-50),pos)))out.push(type)}return [...new Set(out)]}
function coords(p:any){const lat=Number(p.latitude??p.lat??p.location_latitude??p.latitude_deg),lng=Number(p.longitude??p.lng??p.lon??p.location_longitude??p.longitude_deg);return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null}
function distanceKm(a:any,b:any){const A=coords(a),B=coords(b);if(!A||!B)return undefined;const r=(v:number)=>v*Math.PI/180,dLat=r(B.lat-A.lat),dLon=r(B.lng-A.lng),h=Math.sin(dLat/2)**2+Math.cos(r(A.lat))*Math.cos(r(B.lat))*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))}
function distanceToLandmark(p:any,l:any){const A=coords(p),B=l?{latitude:l.lat,longitude:l.lng}:null;if(!A||!B)return undefined;return distanceKm(A,B)}
function searchText(p:any){return n([p.name,p.title,p.business_name,p.service_name,p.city,p.area,p.service_area,p.address,p.landmark,p.description,p.facilities,p.amenities].filter(Boolean).join(" "))}
async function direct(type:string,ct?:string){const table=SRC.find(x=>x[1]===type)?.[0];if(!table)return [];const rows=await db<any[]>(`/rest/v1/${table}?select=*&limit=1000`);return (Array.isArray(rows)?rows:[]).map(p=>({...p,_type:type})).filter(p=>!ct||n(p.city||"").includes(n(ct)))}
async function multiDirect(types:string[],ct?:string){const out:any[]=[];for(const type of [...new Set(types.filter(Boolean))])out.push(...await direct(type,ct));return out}
function genderWanted(s:string){const x=n(s);if(/\b(girls|girl|female|ladki|ladkiyo|ladkiyon|महिला|लड़क|लड़की|girls hostel)\b/i.test(x))return "girls";if(/\b(boys|boy|male|ladke|ladkon|लड़के|लड़का|boys hostel)\b/i.test(x))return "boys";return ""}
function areaWanted(s:string){const x=n(s);if(/nawalgarh road|nawalgarh rd|नवलगढ़ रोड/i.test(x))return "nawalgarh";if(/piprali road|piprali rd|पिपराली रोड/i.test(x))return "piprali";return ""}
function priceLabel(p:any,c:string){const v=Number(p.monthly_rent??p.monthly_fee??p.monthly_charge??p.price);if(!Number.isFinite(v)||v<=0)return "";if(c==="hostel"||c==="tiffin"||c==="library")return "₹"+v.toLocaleString("en-IN")+"/mo";return "₹"+v.toLocaleString("en-IN")}
function card(p:any){const c=p._type,price=priceLabel(p,c),d=p._distanceKm;return{id:String(p.id),name:p.name||p.title||p.service_name||p.business_name||"Active listing",type:c,city:p.city||"",area:p.area||p.service_area||"",address:p.address||"",phone:([p.phone,p.contact_phone,p.whatsapp,p.whatsapp_number].find(v=>{const s=String(v??"").trim();return s&&s!=="0"&&s.replace(/\D/g,"").length>=7})||""),rating:num(p.rating),verified:p.verified===true,price,distanceKm:d===undefined?undefined:Number(d.toFixed(1)),distanceLabel:d===undefined?"":`~${d.toFixed(1)} km`,nearbyMatch:p._nearbyVerified===true||p._nearbyAreaMatch===true,highlights:["wifi","ac_available","ac","cctv","food_available","mess_available","available_beds","room_types","room_sharing","gender_type","timing","timings","delivery_available","nearby_coaching"].map(k=>[k,p[k]]).filter(([,v])=>v!==null&&v!==undefined&&String(v).trim()!==""&&String(v).toLowerCase()!=="false").slice(0,4).map(([k,v])=>k+": "+String(v)),description:p.description&&String(p.description).trim().length<=280?String(p.description).trim():"",mapsUrl:p.google_maps_url||"",detailsUrl:p.slug?`property-details.html?type=${c}&slug=${encodeURIComponent(p.slug)}`:undefined}}
function rank(p:any,q:string,ct:string,near:string){const x=searchText(p),t=n(q);let s=0;const a=areaWanted(q);if(a&&x.includes(a))s+=25;if(ct&&n(p.city||"").includes(n(ct)))s+=30;for(const w of t.split(" ").filter(z=>z.length>2).slice(0,20))if(x.includes(w))s+=2;if(near){if(near==="allen"||near==="clc"){if(p._distanceKm!==undefined)s+=Math.max(0,20-p._distanceKm*5);if(x.includes(near))s+=10}else if(near==="vibrant"){if(x.includes("vibrant"))s+=20;if(x.includes("nawalgarh"))s+=8}else if(x.includes(n(near)))s+=20}if(p.verified===true)s+=4;if(Number.isFinite(Number(p.rating)))s+=Math.min(5,Number(p.rating));return s}
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
function fallbackReply(c:string|undefined,recs:any[],near:string){const l=label(c||"");if(recs.length)return `Bilkul 😊 ${near?(`${near==="allen"?"Allen":near==="clc"?"CLC":near} ke paas `):""}${recs.length} active ${l} listing${recs.length>1?"s":""} mili ${recs.length>1?"hain":"hai"}. Neeche live StudentHubHelp options diye hain.`;return `Abhi ${near?(`${near==="allen"?"Allen":near==="clc"?"CLC":near} ke paas `):""}koi matching **${l}** listing nahi mili. Aap area/city ya requirement thodi aur specific bhej sakte hain.`}
function safeJson(s:string){try{return JSON.parse(s)}catch{const m=s.match(/\{[\s\S]*\}/);if(m)try{return JSON.parse(m[0])}catch{}return null}}
function aiIntentDefaults(){return{intent:"general",confidence:0,category:"",categories:[],city:"",locality:"",area:"",landmark:"",nearRelation:"",gender:"",budgetMin:null,budgetMax:null,facilities:[],referenceIndex:null,action:"",followUp:false,correction:false,needsClarification:false,clarificationQuestion:"",searchScope:""}}
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
function deterministicLocation(s:string){
 const x=n(s);
 if(/\b(talwandi|tilwandi|तालवंडी|तलवंडी)\b/i.test(x))return{city:"Kota",locality:"Talwandi"};
 if(/nawalgarh road|nawalgarh rd|नवलगढ़ रोड/i.test(x))return{city:"Sikar",area:"Nawalgarh Road"};
 if(/piprali road|piprali rd|पिपराली रोड/i.test(x))return{city:"Sikar",area:"Piprali Road"};
 const lm=findLandmark(x);if(lm)return{city:lm.city,landmark:lm.key};return{};
}
async function aiUnderstand(msg:string,history:any[]){
 const fallback=aiIntentDefaults();if(!GEMINI)return fallback;
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
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":GEMINI},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",maxOutputTokens:700,thinkingConfig:{thinkingLevel:"medium"}}})});
  if(!r.ok)return fallback;const j=await r.json(),txt=j?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("")||"";return normalizeIntent(safeJson(txt));
 }catch{return fallback}
}
function mergeIntent(ai:any,msg:string,history:any[]){
 const o=normalizeIntent(ai),curLoc=deterministicLocation(msg),old=history.filter(x=>x.role==="user").map(x=>x.text||" ").join(" "),oldLoc=deterministicLocation(old);
 if(curLoc.city)o.city=curLoc.city;if(curLoc.locality)o.locality=curLoc.locality;if(curLoc.area)o.area=curLoc.area;if(curLoc.landmark)o.landmark=curLoc.landmark;
 if(!o.city&&o.followUp)o.city=oldLoc.city||city(old);if(!o.area&&o.followUp)o.area=oldLoc.area||areaWanted(old);if(!o.locality&&o.followUp)o.locality=oldLoc.locality;if(!o.landmark&&o.followUp)o.landmark=oldLoc.landmark||findLandmark(old)?.key||"";
 if(!o.category&&o.followUp){const pc=cat(old);if(pc)o.category=pc;o.categories=pc?[pc]:[]}if(o.category&&!o.categories.length)o.categories=[o.category];if(o.categories.length)o.category=o.categories[0];return o;
}
function budgetValue(p:any){return num(p.monthly_rent??p.monthly_fee??p.monthly_charge??p.price)}
function matchesFacility(p:any,wanted:string[]){if(!wanted.length)return true;const z=searchText(p);return wanted.every(f=>z.includes(n(f))||Object.entries(p).some(([k,v])=>n(k).includes(n(f))&&(v===true||String(v).toLowerCase()==="true"||n(v).includes(n(f)))))}

async function aiProperty(msg:string,history:any[],recs:any[],c?:string,near?:string){if(!GEMINI)return{};try{const h=history.slice(-8).map(x=>`${x.role==="user"?"USER":"ASSISTANT"}: ${String(x.text||"")}`).join("\n");const prompt=`You are StudentHubHelp's Ultra Advance AI Assistant.
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
const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":GEMINI},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:350,thinkingConfig:{thinkingLevel:"low"}}})});if(!r.ok)return{};const j=await r.json();return{reply:j?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("")||""}}catch{return{}}}

async function dbWrite(method:string,path:string,body:any,prefer="return=minimal"){
  if(!U||!K)throw Error("database configuration missing");
  const r=await fetch(U+path,{method,headers:{apikey:K,Authorization:`Bearer ${K}`,"Content-Type":"application/json",Prefer:prefer},body:JSON.stringify(body)});
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
  void logChatTurn(sessionId,userMessage,payload);
  return new Response(JSON.stringify(payload),init);
}
async function aiGeneral(msg:string,history:any[]){if(!GEMINI)return{};try{const h=history.slice(-8).map(x=>({role:x.role==="assistant"?"model":"user",parts:[{text:String(x.text||"").slice(0,1500)}]}));const system=`You are StudentHubHelp's Ultra Advance AI Assistant for students.
You are a natural conversational, study and general knowledge assistant.
Match the user's language and tone: Hindi, Hinglish or English.
You can discuss normal life, boredom, tiredness, motivation, hobbies and casual topics in a friendly respectful way.
You can answer questions across school/college subjects and explain concepts step-by-step when useful.
If the user asks for current/fresh information, use Google Search grounding when available.
Do not claim StudentHubHelp property facts here. Property data belongs to the separate live Supabase property flow.
Do not pretend to know personal facts about the user.
Keep normal chat concise and human; for study questions be clear and useful.
Current message: ${msg}`;
const body:any={contents:[...h,{role:"user",parts:[{text:system}]}],generationConfig:{maxOutputTokens:700,thinkingConfig:{thinkingLevel:"medium"}}};if(wantsCurrentWeb(msg))body.tools=[{google_search:{}}];const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":GEMINI},body:JSON.stringify(body)});if(!r.ok)return{};const j=await r.json();const reply=j?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("")||"";const chunks=j?.candidates?.[0]?.groundingMetadata?.groundingChunks||[];const sources=chunks.map((x:any)=>x?.web?.uri&&{url:x.web.uri,title:x.web.title||x.web.uri}).filter(Boolean).slice(0,5);return{reply,webGrounded:sources.length>0,webSources:sources}}catch{return{}}}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return new Response(JSON.stringify({error:"POST required"}),{status:405,headers:H});
 try{
  if(!allowed(req))return new Response(JSON.stringify({error:"Too many requests. Please try again shortly."}),{status:429,headers:{...H,"Retry-After":"60"}});
  const contentLength=Number(req.headers.get("content-length")||0);if(contentLength>32768)return new Response(JSON.stringify({error:"Request is too large."}),{status:413,headers:H});
  const b=await req.json(),msg=String(b?.message||"").trim().slice(0,1500),history=Array.isArray(b?.history)?b.history.slice(-8).map((x:any)=>({role:String(x?.role||"").slice(0,20),text:String(x?.text||"").slice(0,1500)})):[];
  if(!msg)return new Response(JSON.stringify({error:"Message is required"}),{status:400,headers:H});
  const sessionId=String(b?.sessionId||crypto.randomUUID());
  if(isGreeting(msg))return await chatResponse({reply:greeting(),intent:"Greeting / Onboarding",primaryTopic:"StudentHubHelp AI",suggestedFollowUps:["Find a hostel","Find a tiffin service","Find a library","Contact support"],recommendations:[],recommendedProperties:[],grounded:true,sessionId},{headers:H},sessionId,msg);
  const requestedFocusId=String(b?.focusPropertyId||"");
  const requestedFocusType=String(b?.focusPropertyType||"");
  if((isPhoneIntent(msg)||isDetailIntent(msg))&&requestedFocusId){
    const focusHistory=history.filter(x=>x.role==="user").map(x=>x.text||"").join(" ");
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
      const ar=await aiProperty(msg,history,[fp],focusType,nearTerm(focusCombined));
      const reply=ar.reply||("Bilkul 😊 **"+fp.name+"** ki available details neeche di hain.");
      return await chatResponse({reply,intent:"Property Details",primaryTopic:label(focusType)+" details",recommendedProperties:[fp],recommendations:[fp],suggestedFollowUps:["Iska phone number batao","Allen ke paas aur options dikhao"],grounded:true,sessionId},{headers:H},sessionId,msg);
    }
  }
  if(isAccountSupport(msg))return await chatResponse({reply:accountSupportReply(msg),intent:"Account / Login Support",primaryTopic:"Account access",suggestedFollowUps:["I forgot my password","Google login is not working","Dashboard is not opening","Contact support"],recommendations:[],recommendedProperties:[],grounded:true,sessionId},{headers:H},sessionId,msg);
  if(isContact(msg)||String(b?.action||"")==="contact_support")return await chatResponse({reply:"Ji bilkul 😊 StudentHubHelp team se contact ke liye:\n\n📧 Email: satpalswami22742@gmail.com\n📞 Phone: +91 9929718264",intent:"Support / Contact",primaryTopic:"Contact StudentHubHelp",suggestedFollowUps:["Find a hostel","Find a library","Search by area","Back to search"],recommendations:[],recommendedProperties:[],grounded:true,sessionId},{headers:H},sessionId,msg);
  const previous=history.filter(x=>x.role==="user").map(x=>x.text||"").join(" "),combined=previous+" "+msg,aiRaw=await aiUnderstand(msg,history),u=mergeIntent(aiRaw,msg,history),explicitCat=cat(msg),nearCats=secondaryCats(msg),aiCats=u.categories||[],c=u.category||explicitCat||(u.followUp?cat(previous):""),propertyMode=u.intent.startsWith("property_")||isPropertyQuery(msg,u.followUp?previous:""),ct=u.city||(u.followUp?city(previous):""),near=u.landmark||u.area||u.locality||(u.nearRelation?nearTerm(msg):""),action=String(b?.action||u.action||""),shownIds=new Set((Array.isArray(b?.shownPropertyIds)?b.shownPropertyIds:[]).map((x:any)=>String(x)));
  if(action==="search_area"&&!city(msg)&&!nearTerm(msg))return await chatResponse({reply:"Bilkul 😊 Aap kis **area / locality** mein search karna chahte hain? Area ka naam bhejiye, main current requirement ke saath search refine kar dunga.",intent:"Area Refinement",primaryTopic:c?label(c)+" discovery":"Student Services Discovery",recommendedProperties:[],recommendations:[],suggestedFollowUps:["Search by city","Show more options","Contact support"],grounded:true,sessionId},{headers:H},sessionId,msg);
  if(/(?:konsa|kaunsa|kaunsi|which|should i|chahiye).{0,35}(book|hostel|pg)|(?:book|hostel|pg).{0,35}(konsa|kaunsa|kaunsi|which|should)/i.test(n(msg))&&!isBookingInfoQuestion(msg)){
    const decisionRows=await multiDirect([c||"hostel"],ct);
    const decisionLandmark=findLandmark(near||"");
    if(decisionLandmark){for(const p of decisionRows){const d=distanceToLandmark(p,decisionLandmark);if(d!==undefined)p._distanceKm=d}}
    let decision=decisionRows.filter(p=>!shownIds.has(String(p.id)));
    if(decisionLandmark)decision=decision.filter(p=>n(p.city||"")===n(decisionLandmark.city)&&(p._distanceKm===undefined||p._distanceKm<=10));
    const rankedDecision=decision.map(p=>({...p,_score:rank(p,combined,ct,near)})).sort((a,z)=>z._score-a._score).slice(0,8).map(card);
    const ar=await aiProperty(msg,history,rankedDecision,c||"hostel",near);
    const reply=ar.reply||"Aapki requirement ke hisaab se live options compare kar sakte hain.";
    return await chatResponse({reply,intent:"Property Comparison",primaryTopic:label(c||"hostel")+" comparison",recommendedProperties:rankedDecision,recommendations:rankedDecision,suggestedFollowUps:["Boys hostel dikhao","Girls hostel dikhao","Budget ke according dikhao"],grounded:true,sessionId},{headers:H},sessionId,msg);
  }
  if(isPropertyAdviceQuestion(msg)){const adviceCat=cat(msg)||cat(previous)||"hostel";return await chatResponse({reply:adviceReply(adviceCat),intent:"Property Selection Guidance",primaryTopic:label(adviceCat)+" selection guidance",recommendedProperties:[],recommendations:[],suggestedFollowUps:["Find a property","Search by area","Show more options","Contact support"],grounded:true,sessionId},{headers:H},sessionId,msg);}
  if(isBookingInfoQuestion(msg)){const ar=await aiGeneral(`The user asks how to book/reserve a hostel or PG. Explain a practical StudentHubHelp booking process: shortlist suitable live listings, open full details, check price/room type/availability, call owner, confirm terms and visit/verify before paying. Do not invent any property-specific availability or booking facility.`,history);const reply=ar.reply||"Hostel book karne ka simple process: pehle suitable listing shortlist karein, full details me price/room type check karein, owner ko Call karke availability aur terms confirm karein, aur payment se pehle property/owner verify karein.";return await chatResponse({reply,intent:"Booking Guidance",primaryTopic:"Hostel / PG Booking",recommendedProperties:[],recommendations:[],suggestedFollowUps:["Allen ke paas hostel dikhao","Budget ke according hostel dikhao","Boys hostel dikhao","Girls hostel dikhao"],grounded:true,sessionId},{headers:H},sessionId,msg);}
  if(!propertyMode){const ar=await aiGeneral(msg,history);const reply=ar.reply||"Bilkul 😊 Main yahin hoon. Aap jo poochna chahein, seedha poochiye—study, ideas, facts ya normal conversation, sab par baat kar sakte hain.";return await chatResponse({reply,intent:"General / Study / Conversation",primaryTopic:"Student AI Assistant",recommendedProperties:[],recommendations:[],suggestedFollowUps:["Ask a study question","Tell me something interesting","Find a property","Contact support"],grounded:true,webGrounded:ar.webGrounded||false,webSources:ar.webSources||[],sessionId},{headers:H},sessionId,msg);}
  let rows=await multiDirect(aiCats.length?aiCats:(c?[c]:(nearCats.length?nearCats:["hostel"])),ct);
  const wantedGender=u.gender||genderWanted(msg),wantedArea=u.area?(/nawalgarh/i.test(u.area)?"nawalgarh":/piprali/i.test(u.area)?"piprali":u.area.toLowerCase()):areaWanted(msg);
  const wantedLocality=n(u.locality||"");
  if(wantedGender)rows=rows.filter(p=>{const z=searchText(p);const g=n([p.gender_type,p.gender,p.hostel_type,p.name,p.title,p.description].filter(Boolean).join(" "));return wantedGender==="girls"?/girls|girl|female|women|ladki|ladkiyon|महिला|लड़क/i.test(g):/boys|boy|male|men|ladke|लड़के/i.test(g)});
  if(wantedArea)rows=rows.filter(p=>searchText(p).includes(n(wantedArea)));
  if(wantedLocality)rows=rows.filter(p=>searchText(p).includes(wantedLocality));
  if(u.budgetMax!==null||u.budgetMin!==null)rows=rows.filter(p=>{const v=budgetValue(p);if(v===undefined)return false;return (u.budgetMax===null||v<=u.budgetMax)&&(u.budgetMin===null||v>=u.budgetMin)});
  if(u.facilities?.length)rows=rows.filter(p=>matchesFacility(p,u.facilities));
  const landmark=u.landmark?findLandmark(u.landmark)||LANDMARKS.find(l=>l.key===u.landmark):findLandmark(near||"");
  if(landmark){for(const p of rows){const d=distanceToLandmark(p,landmark);if(d!==undefined)p._distanceKm=d}rows=rows.filter(p=>n(p.city||"")===n(landmark.city)&&(p._distanceKm===undefined||p._distanceKm<=10))}
  else if(near){const q=n(near);const exact=rows.filter(p=>searchText(p).includes(q));if(exact.length)rows=exact;else if(!wantedArea)rows=[]}
  if(nearCats.length){const secondaryRows=await multiDirect(nearCats,ct);for(const p of rows){let best=Infinity,hasCoords=false;for(const q of secondaryRows){const d=distanceKm(p,q);if(d!==undefined){hasCoords=true;best=Math.min(best,d)}else if(p.area&&searchText(q).includes(n(p.area)))best=Math.min(best,1)}if(best<=3){p._nearbyDistanceKm=best;p._nearbyVerified=hasCoords;p._nearbyAreaMatch=!hasCoords}}rows=rows.filter(p=>p._nearbyDistanceKm!==undefined)}
  rows=rows.filter(p=>!shownIds.has(String(p.id)));
  const ranked=rows.map(p=>({...p,_score:rank(p,combined,ct,near)})).sort((a,z)=>z._score-a._score);
  let recs=ranked.slice(0,8).map(card);
  if(action==="view_details"){const focusId=String(b?.focusPropertyId||""),focusType=String(b?.focusPropertyType||c||"hostel"),focusRows=await multiDirect([focusType],ct),focus=focusRows.find(p=>String(p.id)===focusId);recs=focus?[card(focus)]:recs.slice(0,1)}
  const ar=await aiProperty(msg,history,recs,c,near),reply=ar.reply||fallbackReply(c,recs,near),followups=["View full details","Search by area","Show more options","Contact support"];
  return await chatResponse({reply,intent:"Live Property Search",primaryTopic:c?label(c)+" discovery":"Student Services Discovery",recommendedProperties:recs,recommendations:recs,suggestedFollowUps:followups,grounded:true,sessionId,searchMode:"ultra_advance_live_supabase_ai",targetCity:ct||undefined,targetCategory:c||undefined,nearbyTerm:near||undefined,aiIntent:u.intent,aiConfidence:u.confidence,aiEntities:{category:u.category,categories:u.categories,city:u.city,locality:u.locality,area:u.area,landmark:u.landmark,gender:u.gender,budgetMin:u.budgetMin,budgetMax:u.budgetMax,facilities:u.facilities,referenceIndex:u.referenceIndex}},{headers:H},sessionId,msg);
 }catch(e){return new Response(JSON.stringify({reply:"Ji, live search me temporary issue aaya. Please same query dobara bhejiye.",grounded:false,error:"Temporary server error"}),{status:200,headers:H})}
});