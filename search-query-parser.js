(function(window){
'use strict';
const CATEGORIES={hostel:['hostel','hostels','hostal','hostals','pg','p g','paying guest','accommodation','boys hostel','girls hostel','हॉस्टल','पीजी'],tiffin:['tiffin','tiffins','tifin','mess','dabba','food','meal','meals','lunch','dinner','khana','टिफिन','मेस','खाना'],library:['library','libraries','libary','study library','reading room','study room','self study','लाइब्रेरी','पुस्तकालय'],cafe:['cafe','cafes','café','coffee shop','coffeehouse','restaurant','restro','eatery','कैफे','कॉफी'],bookstore:['bookstore','bookstores','book store','book stores','book shop','book shops','bookshop','bookshops','stationery','books','किताब','स्टेशनरी']};
const GENDER={boys:['boys','boy','male','gents','men','ladka','ladke','ladkon','पुरुष','लड़कों'],girls:['girls','girl','female','ladies','women','ladki','ladkiyan','ladkiyon','महिला','लड़कियों'],family:['family','families','parivar','परिवार']};
const FACILITIES={ac:['ac','air conditioner','air conditioning','cooler'],wifi:['wifi','wi fi','wi-fi','internet'],food:['food','mess','tiffin','meal','meals','khana','भोजन','खाना'],parking:['parking'],laundry:['laundry','washing machine'],geyser:['geyser','hot water'],security:['security','cctv'],lift:['lift','elevator'],power_backup:['power backup','backup'],attached_washroom:['attached bath','attached bathroom','attached washroom','private bathroom']};
const STOP=new Set('me mein mai main m mujhe mujko chahiye chaiye chahiy ko ke ka ki k se tak par pe pr in at the a an for of to and with under below upto up less than between from range budget rupees rupee rs inr price rent monthly near nearby paas pass around opposite beside next close nazdeek best top premium cheap cheapest affordable sasta sasti accha achha wala wali wale waale hai hain he please property student service hostel tiffin library cafe bookstore room rooms'.split(' '));
const norm=value=>{const raw=String(value??'');const base=window.normalizeLocationText?window.normalizeLocationText(raw):raw.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}₹.]+/gu,' ').replace(/\s+/g,' ').trim();return base.replace(/\bwi[\s-]?fi\b/g,'wifi').replace(/\brd\b/g,'road').replace(/\bst\b/g,'street').replace(/\s+/g,' ').trim();};
const canonical=value=>window.StudentHubLocationRegistry?.canonicalizeCity?.(value)||({bangalore:'bengaluru',gurgaon:'gurugram'}[norm(value)]||norm(value));
const fields=['area','locality','neighborhood','address','full_address','location','location_address','landmark','landmarks','nearby','nearby_coaching','service_area'];
const textOf=(row,keys)=>keys.map(k=>row&&row[k]).filter(v=>v!=null&&v!=='').map(v=>Array.isArray(v)?v.join(' '):String(v)).join(' ');
function priceIntent(value){
 const raw=String(value??'').replace(/(\d),(?=\d{3}\b)/g,'$1');
 const range=raw.match(/(?:between|from)?\s*₹?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|hazar|हजार)?\s*(?:to|and|-|–|—)\s*₹?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|hazar|हजार)?/i);
 const amount=(n,u)=>n==null?null:Number(String(n).replace(/,/g,''))*(u?1000:1);
 if(range){const a=amount(range[1],range[2]),b=amount(range[3],range[4]);return{min:Math.min(a,b),max:Math.max(a,b)};}
 const s=norm(raw).replace(/,/g,'');
 const read=m=>m?amount(m[1],m[2]):null;
 const max=s.match(/(?:under|below|upto|up to|less than|within|max|budget|se kam|से कम|तक)\s*₹?\s*(\d+(?:\.\d+)?)\s*(k|thousand|hazar|हजार)?/i)||s.match(/₹\s*(\d+(?:\.\d+)?)\s*(k|thousand|hazar|हजार)?/i);
 const min=s.match(/(?:above|over|more than|at least|minimum|kam se kam|से ऊपर|से ज्यादा)\s*₹?\s*(\d+(?:\.\d+)?)\s*(k|thousand|hazar|हजार)?/i);
 return{max:read(max),min:read(min)};
}
function stripAliases(value,groups){let out=' '+norm(value)+' ';const aliases=groups.flatMap(x=>Array.isArray(x)?x:[x]).map(norm).filter(Boolean).sort((a,b)=>b.length-a.length);for(const alias of aliases){const escaped=alias.replace(/[.*+?^$()|[\]\\]/g,'\\$&');out=out.replace(new RegExp('(^| )'+escaped+'(?= |$)','giu'),' ');}return out.replace(/\s+/g,' ').trim();}
function parse(input,rows){
 const context=input&&typeof input==='object'&&!Array.isArray(input)?input:null;
 const raw=context?[String(context.rawKeyword??context.keyword??'').trim(),String(context.explicitLocation??context.location??'').trim()].filter(Boolean).join(' '):String(input??'').trim();
 const normalized=norm(raw),records=Array.isArray(rows)?rows:[],selected=canonical(context?.selectedCategory||'');
 let category=Object.keys(CATEGORIES).find(k=>selected===k||selected===k+'s')||null;
 if(!category){for(const [key,aliases] of Object.entries(CATEGORIES)){if(aliases.some(a=>(' '+normalized+' ').includes(' '+norm(a)+' '))){category=key;break;}}}
 const gender=Object.keys(GENDER).filter(k=>GENDER[k].some(a=>(' '+normalized+' ').includes(' '+norm(a)+' ')));
 const facilities=Object.entries(FACILITIES).filter(([,aliases])=>aliases.some(a=>(' '+normalized+' ').includes(' '+norm(a)+' '))).map(([key])=>key);
 const budget=priceIntent(normalized),cities=[...new Set(records.map(r=>canonical(r?.city)).filter(Boolean))].sort((a,b)=>b.length-a.length);
 const cityMatches=cities.filter(city=>(' '+normalized+' ').includes(' '+city+' ')),city=cityMatches[0]||null;
 const landmarkValues=[...new Set(records.flatMap(r=>[r?.landmark,r?.nearby_coaching]).filter(Boolean).map(norm))].filter(x=>x.length>2);
 const landmarks=landmarkValues.filter(x=>(' '+normalized+' ').includes(' '+x+' ')).sort((a,b)=>b.length-a.length);
 const nearby=/\b(near|nearby|close to|around|opposite|beside|next to|ke paas|ke pass|paas|pas|nazdeek|नजदीक|पास)\b/i.test(normalized);
 const requestedPropertyType=/\b(flat|flats|apartment|apartments)\b/i.test(normalized)?'flat':null;
 let remainder=stripAliases(normalized,[...Object.values(CATEGORIES),...Object.values(GENDER),...Object.values(FACILITIES),['under','below','upto','up to','less than','within','max','budget','se kam','से कम','तक','above','over','more than','at least','minimum','kam se kam','से ऊपर','से ज्यादा','₹','rs','inr','rupees','thousand','hazar','हजार'],['nearby','near','close to','around','opposite','beside','next to','ke paas','ke pass','paas','pas','nazdeek','नजदीक','पास'],['2 bhk','2bhk','1 bhk','1bhk','double sharing','triple sharing','single room','private room','single occupancy','room','rooms','flat','flats','apartment','apartments']]);
 remainder=remainder.replace(/\b\d+(?:\.\d+)?\s*(?:k|thousand|hazar|हजार)?\b/g,' ').replace(/[₹]/g,' ').replace(/\s+/g,' ').trim();
 const cityStripped=city?(' '+remainder+' ').replace(' '+city+' ',' ').trim():remainder;
 const locationTokens=cityStripped.split(' ').filter(t=>t.length>1&&!STOP.has(t)),locationPhrase=locationTokens.join(' ');
 const roadQuery=/\broad\b/i.test(normalized),roadMatch=normalized.match(/([\p{L}\p{N}]+)\s+road\b/iu),roadRoot=roadMatch?roadMatch[1]:null;
 const roadPhrase=roadQuery&&roadRoot?roadRoot+' road':'';
 const inferencePhrase=roadPhrase||locationPhrase;
 const inferredCities=inferencePhrase?[...new Set(records.filter(r=>norm(textOf(r,fields)).includes(inferencePhrase)).map(r=>canonical(r?.city)).filter(Boolean))]:[];
 const explicitLocation=context?String(context.explicitLocation??context.location??'').trim():'',explicitLocationNorm=norm(explicitLocation);
 const explicitLocationCity=cities.find(c=>(' '+explicitLocationNorm+' ').includes(' '+c+' '))||null;
 return {rawQuery:raw,normalizedQuery:normalized,category,city:explicitLocationCity||city,cityMatches:cityMatches.length?cityMatches:explicitLocationCity?[explicitLocationCity]:[],locationTokens,locationPhrase,roadQuery,roadRoot,gender,facilities,budget,landmarks,freeTextKeywords:locationTokens.filter(t=>t!=='road'&&t!==roadRoot),nearby,requestedPropertyType,inferredCities,ambiguousRoad:roadQuery&&!explicitLocationCity&&!city&&inferredCities.length>1,explicitLocation,selectedCategory:selected||''};
}
window.StudentHubQueryParser=Object.freeze({parse,normalize:norm,canonical,version:'1.0.0'});
})(window);
