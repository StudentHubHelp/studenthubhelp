(function(){
'use strict';
const CATEGORY={hostel:['hostel','hostels','hostals','hostal','pg','paying guest','accommodation','boys hostel','girls hostel','room','rooms','stay','हॉस्टल','पीजी'],tiffin:['tiffin','tiffins','tifin','mess','dabba','food','meal','meals','lunch','dinner','khana','टिफिन','मेस','खाना'],library:['library','libraries','study library','reading room','study room','self study','लाइब्रेरी','पुस्तकालय'],cafe:['cafe','cafes','café','coffee shop','coffeehouse','restaurant','restro','eatery','कैफे','कॉफी'],bookstore:['bookstore','book store','book shop','bookshop','stationery','books','किताब','स्टेशनरी']};
const GENDER={boys:['boys','boy','male','gents','men','ladka','ladke','ladkon','पुरुष','लड़कों'],girls:['girls','girl','female','ladies','women','ladki','ladkiyan','ladkiyon','महिला','लड़कियों'],family:['family','families','parivar','परिवार']};
const FACILITIES={ac:['ac','air conditioner','air conditioning','cooler'],wifi:['wifi','wi fi','wi-fi','internet'],food:['food','mess','tiffin','meal','meals','khana','भोजन','खाना'],attached_washroom:['attached bath','attached bathroom','attached washroom','private bathroom','private toilet','separate bathroom'],parking:['parking'],laundry:['laundry','washing machine'],geyser:['geyser','hot water'],security:['security','cctv'],lift:['lift','elevator'],power_backup:['power backup','backup']};
const FACILITY_COLUMNS={ac:['ac','ac_available','air_conditioning'],wifi:['wifi','wifi_available'],food:['food_available','food_type','meal_type','mess_available','delivery_available','home_delivery'],attached_washroom:['attached_bathroom','attached_washroom'],parking:['parking'],laundry:['laundry'],geyser:['geyser','hot_water'],security:['cctv','security'],lift:['lift','elevator'],power_backup:['power_backup']};
const FILLER=new Set('me mein mai main ko chahiye chahiy chaiye wala wali wale waale ke ka ki k se tak par pe pr in at the a an for of to and with under below upto up less than budget rupees rupee rs inr price rent monthly mujhe please near nearby pass paas around opposite room property student mujko best top premium cheap cheapest affordable sasta sasti accha achha high rated luxury popular '.split(' '));
const norm=v=>window.normalizeLocationText?window.normalizeLocationText(v):String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/wi[-\s]?fi/g,'wifi').replace(/[^\p{L}\p{N}₹.]+/gu,' ').replace(/\s+/g,' ').replace(/\brd\b/g,'road').trim();
const val=(r,keys)=>keys.map(k=>r&&r[k]).filter(v=>v!=null&&v!=='').map(v=>Array.isArray(v)?v.join(' '):typeof v==='object'?JSON.stringify(v):String(v)).join(' ');
const locText=r=>norm(val(r,['city','state','area','locality','neighborhood','address','full_address','location','location_address','landmark','landmarks','nearby','nearby_coaching','service_area','pincode']));
const canonical=s=>window.StudentHubLocationRegistry?.canonicalizeCity?.(s)||({bangalore:'bengaluru',gurgaon:'gurugram'}[norm(s)]||norm(s));
function categoryOf(q){const tokens=norm(q).split(' ').filter(Boolean);for(const [k,a] of Object.entries(CATEGORY)){const aliases=a.map(x=>norm(x));if(tokens.some(t=>aliases.includes(t)||((t.endsWith('s')&&aliases.includes(t.slice(0,-1)))||(t.endsWith('es')&&aliases.includes(t.slice(0,-2))))))return k;for(const alias of aliases){if(alias.includes(' ')&&(' '+tokens.join(' ')+' ').includes(' '+alias+' '))return k;}}return null;}
function priceIntent(q){const raw=String(q??'').replace(/(\d),(?=\d{3}\b)/g,'$1').replace(/,/g,'');const n=norm(raw).replace(/(\d)\s+(\d{3})(?=\s|$)/g,'$1$2');const max=n.match(/(?:under|below|upto|up to|less than|within|max|budget|se kam|से कम|तक)\s*₹?\s*(\d+(?:\.\d+)?)\s*(k|thousand|hazar|हजार)?/i)||n.match(/₹\s*(\d+(?:\.\d+)?)\s*(k|thousand|hazar|हजार)?/i)||n.match(/(\d+(?:\.\d+)?)\s*(k|thousand|hazar|हजार)\s*(?:tak|तक)/i);const min=n.match(/(?:above|over|more than|at least|minimum|kam se kam|से ऊपर|से ज्यादा)\s*₹?\s*(\d+(?:\.\d+)?)\s*(k|thousand|hazar|हजार)?/i);const cv=m=>m?Number(m[1])*(m[2]?1000:1):null;return{max:cv(max),min:cv(min)};}
function priceBounds(r){
 for(const k of ['price','rent','monthly_rent','monthly_price','monthly_fee','fee','amount','monthly_charge','price_range','rent_range','monthly_rent_range','monthly_plan']){
  const raw=r&&r[k];if(raw==null||raw==='')continue;
  const ns=String(raw).replace(/,/g,'').match(/\d+(?:\.\d+)?/g);
  if(ns&&ns.length){const nums=ns.map(Number).filter(Number.isFinite);if(nums.length){const isRange=/[-–—]|\bto\b|\bसे\b/i.test(String(raw))&&nums.length>1;return isRange?{min:Math.min(...nums),max:Math.max(...nums)}:{min:nums[0],max:nums[0]};}}
 }
 return null;
}
function priceOf(r){const bounds=priceBounds(r);return bounds?bounds.max:null;}
function parseString(q,rows){const n=norm(q),cat=categoryOf(n),prices=priceIntent(q),genders=Object.keys(GENDER).filter(g=>GENDER[g].some(x=>(' '+n+' ').includes(' '+norm(x)+' '))),facilities=Object.entries(FACILITIES).filter(([,alts])=>alts.some(x=>(' '+n+' ').includes(' '+norm(x)+' '))).map(([k])=>k);const room=[];if(/\b2\s*bhk\b|\b2bhk\b/i.test(n))room.push('2bhk');if(/\b1\s*bhk\b|\b1bhk\b/i.test(n))room.push('1bhk');if(/double sharing|2 sharing|double room/i.test(n))room.push('double sharing');if(/triple sharing|3 sharing/i.test(n))room.push('triple sharing');if(/single room|private room|single occupancy|ek kamra|एक कमरा|सिंगल रूम/i.test(n))room.push('single room');const nearby=/\b(near|nearby|close to|around|opposite|beside|next to|ke paas|ke pass|paas|nazdeek|नजदीक|पास)\b/i.test(n);
let rest=n;const remove=arr=>{for(const x of arr.slice().sort((a,b)=>String(b).length-String(a).length)){const phrase=' '+norm(x)+' ';rest=(' '+rest+' ').split(phrase).join(' ');}rest=norm(rest);};
remove(Object.values(CATEGORY).flat());remove(Object.values(GENDER).flat());remove(Object.values(FACILITIES).flat());remove(['under','below','upto','up to','less than','within','max','budget','se kam','से कम','tak','तक','above','over','more than','at least','minimum','kam se kam','से ऊपर','से ज्यादा','₹','rs','inr','rupees','thousand','hazar','हजार','nearby','near','close to','around','opposite','beside','next to','ke paas','ke pass','paas','nazdeek','नजदीक','पास','2 bhk','2bhk','1 bhk','1bhk','double sharing','triple sharing','single room','private room','single occupancy','room','rooms','flat','flats']);rest=rest.replace(/\b\d+(?:\.\d+)?\s*(?:k|thousand|hazar|हजार)?\b/g,' ').split(' ').filter(t=>t.length>1&&!FILLER.has(t)).join(' ').replace(/\s+/g,' ').trim();
const records=Array.isArray(rows)?rows:[],cityValues=[...new Set(records.map(r=>canonical(r&&r.city)).filter(Boolean))].sort((a,b)=>b.length-a.length),cityCandidates=[...new Set([...records.map(r=>String(r?.city??'').trim()).filter(Boolean),...(window.StudentHubLocationRegistry?.cityEntries||[]).flatMap(entry=>[entry.name,...(entry.seoAliases||[]),...(entry.searchAliases||[])])])].sort((a,b)=>norm(b).length-norm(a).length),matchedCityCandidate=cityCandidates.find(c=>(' '+n+' ').includes(' '+norm(c)+' '))||null,explicitCity=matchedCityCandidate?canonical(matchedCityCandidate):cityValues.find(c=>(' '+n+' ').includes(' '+c+' '))||null,areaFields=['area','locality','neighborhood','address','full_address','location','location_address','landmark','landmarks','nearby','nearby_coaching','service_area'],locationPhrase=matchedCityCandidate?norm((' '+rest+' ').split(' '+norm(matchedCityCandidate)+' ').join(' ')):explicitCity?norm((' '+rest+' ').split(' '+explicitCity+' ').join(' ')):rest,roadQuery=/\b(road|rd)\b/i.test(locationPhrase),requestedPropertyType=/\b(flat|flats|apartment|apartments)\b/i.test(n)?'flat':null;let inferredCities=[];if(locationPhrase){const hits=records.filter(r=>norm(val(r,areaFields)).includes(locationPhrase));inferredCities=[...new Set(hits.map(r=>canonical(r&&r.city)).filter(Boolean))];}const anchoredCity=explicitCity||(locationPhrase&&roadQuery&&inferredCities.length===1?inferredCities[0]:null);const ambiguousRoad=roadQuery&&!explicitCity&&inferredCities.length!==1;return{raw:String(q||''),normalized:n,category:cat,genders,facilities,room,prices,nearby,locationPhrase,roadQuery,explicitCity,anchoredCity,inferredCities,requestedPropertyType,ambiguousRoad};}
function parse(q,rows){
  if(!window.StudentHubQueryParser)return parseString(q,rows);
  const unified=window.StudentHubQueryParser.parse(q,rows);
  const legacy=parseString(unified.rawQuery,rows);
  let locationPhrase=unified.roadQuery&&unified.roadRoot?unified.roadRoot+' road':(unified.locationPhrase||'');
  let roadQuery=!!unified.roadQuery;
  let roadRoot=unified.roadRoot||null;
  let city=unified.city||null;
  let inferredCities=unified.inferredCities||[];
  let freeTextKeywords=unified.freeTextKeywords||[];
  let ambiguousRoad=!!unified.ambiguousRoad;
  if(q&&typeof q==='object'){
    const explicitLocation=String(q.explicitLocation??q.location??'').trim();
    if(explicitLocation){
      const locationIntent=window.StudentHubQueryParser.parse(explicitLocation,rows);
      roadQuery=!!locationIntent.roadQuery||/\\b(road|rd)\\b/i.test(explicitLocation);
      roadRoot=locationIntent.roadRoot||roadRoot;
      locationPhrase=roadQuery&&roadRoot?roadRoot+' road':(locationIntent.locationPhrase||window.StudentHubQueryParser.normalize(explicitLocation));
      city=locationIntent.city||city;
      inferredCities=locationIntent.inferredCities?.length?locationIntent.inferredCities:inferredCities;
      freeTextKeywords=[...new Set([...freeTextKeywords,...(locationIntent.freeTextKeywords||[])])];
      ambiguousRoad=!!locationIntent.ambiguousRoad;
    }
  }
  const anchoredCity=city||(roadQuery&&inferredCities.length===1?inferredCities[0]:null);
  return {
    ...legacy,
    raw:unified.rawQuery,
    normalized:unified.normalizedQuery,
    category:unified.category||legacy.category,
    genders:unified.gender||legacy.genders,
    facilities:unified.facilities||legacy.facilities,
    prices:unified.budget||legacy.prices,
    nearby:unified.nearby,
    locationPhrase,
    roadQuery,
    explicitCity:city,
    anchoredCity,
    inferredCities,
    ambiguousRoad,
    requestedPropertyType:unified.requestedPropertyType||legacy.requestedPropertyType,
    locationTokens:unified.locationTokens||[],
    landmarks:unified.landmarks||[],
    freeTextKeywords,
    roadRoot,
    unifiedIntent:unified,
    nearbyMode:!!(q&&typeof q==='object'&&q.nearbyMode)
  };
}
function evidence(r,kind,key){const keys=kind==='location'?['area','locality','neighborhood','address','full_address','location','location_address','landmark','landmarks','nearby','nearby_coaching','service_area']:kind==='facility'?['facilities','amenities','features','services','description','details',...(FACILITY_COLUMNS[key]||[])]:kind==='gender'?['gender','gender_type','gender_suitability','hostel_type','property_type','type','category','name','title','description']:kind==='room'?['room_type','room_types','sharing','sharing_type','room_sharing','property_type','type','name','title','description']:['name','title','property_name','service_name','category','type'];if(kind==='facility'&&(FACILITY_COLUMNS[key]||[]).some(k=>r&&([true,1].includes(r[k])||['true','yes','available','1'].includes(norm(r[k])))))return true;const v=norm(val(r,keys));return(FACILITIES[key]||GENDER[key]||[key]).some(a=>(' '+v+' ').includes(' '+norm(a)+' '));}
function cityMatch(r,city,roadQuery,phrase){const actual=canonical(r&&r.city);if(roadQuery&&phrase){if(!locText(r).includes(phrase))return false;if(city&&actual!==canonical(city))return false;return true;}if(city){if(actual&&actual!==canonical(city))return false;if(!actual&&!locText(r).includes(canonical(city)))return false;if(phrase&&!locText(r).includes(phrase))return false;return true;}if(phrase)return locText(r).includes(phrase);return true;}
function strictFilter(rows,q){const i=parse(q,rows);let result=(Array.isArray(rows)?rows:[]).slice();if(i.requestedPropertyType)result=result.filter(r=>/\b(flat|flats|apartment|apartments)\b/i.test(val(r,['property_type','type','category','name','title','room_type','accommodation_type'])));if(i.category)result=result.filter(r=>r.__category===i.category);if(i.anchoredCity||i.explicitCity||i.locationPhrase){const wanted=i.anchoredCity||i.explicitCity;result=result.filter(r=>cityMatch(r,wanted,i.roadQuery,i.locationPhrase));}if(i.freeTextKeywords?.length)result=result.filter(r=>{const hay=norm(val(r,['name','title','property_name','service_name','area','address','landmark','nearby_coaching','service_area']));return i.freeTextKeywords.every(t=>(' '+hay+' ').includes(' '+norm(t)+' '));});if(i.genders.length)result=result.filter(r=>i.genders.every(g=>evidence(r,'gender',g)));if(i.facilities.length)result=result.filter(r=>i.facilities.every(f=>evidence(r,'facility',f)));if(i.room.length)result=result.filter(r=>i.room.every(x=>evidence(r,'room',x)));if(i.prices.max!=null||i.prices.min!=null)result=result.filter(r=>{const p=priceBounds(r);return p!=null&&(i.prices.max==null||p.min<=i.prices.max)&&(i.prices.min==null||p.max>=i.prices.min);});if(i.nearby&&!i.locationPhrase&&!i.explicitCity&&!i.nearbyMode)return[];return result;}
function search(rows,q,ranked){
const context=q&&typeof q==='object'&&!Array.isArray(q)?q:null;
const intent=parse(q,rows),candidates=strictFilter(rows,q);if(!candidates.length)return[];
const rankingQuery=context?[String(context.rawKeyword??context.keyword??'').trim(),String(context.explicitLocation??context.location??'').trim()].filter(Boolean).join(' '):q;
const rankedRows=typeof ranked==='function'?ranked(candidates,rankingQuery):candidates;if(!Array.isArray(rankedRows))return candidates;const keyOf=r=>String(r.id??r.property_id??r.slug??r.name)+'|'+String(r.__category);const keys=new Set(candidates.map(keyOf));const safe=rankedRows.filter(r=>keys.has(keyOf(r)));const rankedKeys=new Set(safe.map(keyOf));const finalRows=safe.concat(candidates.filter(r=>!rankedKeys.has(keyOf(r))));if(intent.ambiguousRoad&&!intent.explicitCity)return finalRows.slice().sort((a,b)=>canonical(a.city).localeCompare(canonical(b.city))||(Number(b.__score)||0)-(Number(a.__score)||0)||String(a.name||'').localeCompare(String(b.name||'')));return finalRows;}
window.StudentHubUniversalSearch={parse,strictFilter,search,priceOf,version:'1.1.0'};
})();