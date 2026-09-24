(function(){'use strict';
const C={hostel:['hostel','hostal','pg','paying guest','boys hostel','girls hostel'],tiffin:['tiffin','tifin','mess','dabba','home food','meal service','food service','food delivery','lunch','dinner','khana','टिफिन','मेस'],library:['library','study library','reading room','study room'],cafe:['cafe','cafes','coffee shop','coffeehouse','restro','restaurant','eatery','coffee'],bookstore:['bookstore','book store','book shop','bookseller','book depot','stationery','books']};
const R={near:['near','nearby','close to','paas','pas','pass','paas mein','paas me','ke paas','ke pass','ke pas','नजदीक','पास'],beside:['beside','next to','adjacent','bagal me','bagal mein','bagal','side me','side mein','बगल में'],opposite:['opposite','across','samne','saamne','ke samne','ke saamne','सामने'],behind:['behind','piche','peeche','ke piche','ke peeche','पीछे'],front:['in front of','front of','aage','आगे'],between:['between','ke beech','ke bich','beech mein','बीच में','के बीच']};
const L={allen:['allen','allen coaching','allen career institute'],clc:['clc','career line coaching','career line classes'],vibrant:['vibrant','vibrant coaching'],gurukripa:['gurukripa','gci'],matrix:['matrix','matrix coaching'],aayaam:['aayaam','aayam'],pcp:['pcp'],path:['path','path coaching'],aakash:['aakash','aakash institute','akash institute','akash'],sk_college:['sk college','s k college'],railway_station:['railway station','railway station road','railway'],piprali_circle:['piprali circle'],sk_hospital:['sk hospital'],kvm_school:['kvm school']};
const D={piprali:['piprali road','piprali rd','piprali'],nawalgarh:['nawalgarh road','nawalgarh rd','nawalgarh'],jaipur:['jaipur road','jaipur rd','jaipur'],jhunjhunu:['jhunjhunu road','jhunjhunu rd','jhunjhunu'],rani_sati:['rani sati road','rani sati rd','rani sati'],devipura:['devipura road','devipura rd','devipura'],railway:['railway station road','railway station rd','railway road'],mandia:['mandia road','mandia rd','mandia']};
const STOP=new Set('the a an is are me mujhe mujko mko chahiye chaiye please plz for of in on at par pe pr ke ka ki k near nearby pass pas paas hai hain ko se tak and or ya with mein mai m me wala wali wale konsa kaunsa kya batao bata kahan kaha milega do de coaching institute academy center centre road rd road pr par service property student students'.split(' '));
const norm=s=>String(s??'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/wi[-_\s]?fi/g,'wifi').replace(/tif+in/g,'tiffin').replace(/hostal/g,'hostel').replace(/\bk\b/g,'ke').replace(/[|,;:/()[\]{}.!?]+/g,' ').replace(/\s+/g,' ').trim();
const toks=s=>norm(s).split(/\s+/).filter(Boolean),has=(t,a)=>{t=norm(t);return a.some(x=>t.includes(norm(x)))},keys=(q,m)=>Object.entries(m).filter(([,a])=>has(q,a)).map(([k])=>k);
function lev(a,b){a=norm(a);b=norm(b);if(a===b)return 0;if(!a||!b)return Math.max(a.length,b.length);if(Math.abs(a.length-b.length)>2)return Math.max(a.length,b.length);let p=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,p[j]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=row}return p[b.length]}
function fuzzyAliasKeys(q,m){const n=norm(q),ts=toks(n),out=[];for(const[k,a]of Object.entries(m)){let matched=false;for(const alias of a){const an=norm(alias),at=toks(an);if(!an)continue;if(n.includes(an)){matched=true;break}if(at.length===1&&at[0].length>=5){const maxEd=at[0].length>=8?2:1;if(ts.some(t=>t.length>=5&&Math.abs(t.length-at[0].length)<=maxEd&&lev(t,at[0])<=maxEd)){matched=true;break}}}if(matched)out.push(k)}return out}
function fuzzyKnownLocationToken(token,m){const t=norm(token);if(!t||t.length<5)return false;for(const a of Object.values(m).flat()){const an=norm(a),at=toks(an);if(at.length!==1||at[0].length<5)continue;const maxEd=at[0].length>=8?2:1;if(Math.abs(t.length-at[0].length)<=maxEd&&lev(t,at[0])<=maxEd)return true}return false}
function category(q){q=norm(q);for(const[k,a]of Object.entries(C))if(a.some(x=>q.includes(norm(x))))return k;return null}
function relations(q){q=norm(q);return Object.entries(R).filter(([,a])=>a.some(x=>q.includes(norm(x)))).map(([k])=>k)}
function cityTokensFromQuery(n){const cities=['sikar','kota','jaipur','delhi','new delhi','bengaluru','bangalore','mumbai','pune','indore','ahmedabad','chennai','hyderabad','lucknow','patna','chandigarh'];return cities.filter(c=>new RegExp('\\b'+c.replace(/ /g,'\\s+')+'\\b','i').test(n)).map(c=>c==='bangalore'?'bengaluru':c)}
function parseQuery(q){const n=norm(q),cat=category(n),land=Array.from(new Set([...keys(n,L),...fuzzyAliasKeys(n,L)])),road=Array.from(new Set([...keys(n,D),...fuzzyAliasKeys(n,D)])),rel=relations(n),cities=cityTokensFromQuery(n),cw=new Set(Object.values(C).flat().map(norm)),rw=new Set(Object.values(R).flat().map(norm));const veg=/\b(veg|vegetarian|pure veg|shakahari)\b/i.test(n),girls=/\b(girls|girl|female|ladies|women|ladki|ladkiyon)\b/i.test(n),boys=/\b(boys|boy|male|gents|men|ladka|ladkon)\b/i.test(n),intentWords=new Set(['veg','vegetarian','pure','shakahari','girls','girl','female','ladies','women','ladki','ladkiyon','boys','boy','male','gents','men','ladka','ladkon']);const loc=toks(n).filter(t=>t.length>2&&!STOP.has(t)&&!cw.has(t)&&!rw.has(t)&&!fuzzyKnownLocationToken(t,L)&&!fuzzyKnownLocationToken(t,D)&&!intentWords.has(t));return{raw:String(q??''),normalized:n,tokens:toks(n),category:cat,landmarks:land,roads:road,relations:rel,locationTokens:loc,cities,veg,girls,boys}}
function text(r){const ks=['name','property_name','service_name','title','category','type','area','city','address','full_address','nearby','landmark','location','locality','service_area','description','facilities','features','services','menu','food_type','meal_type','gender','timing','opening_hours'];return norm(ks.map(k=>r?.[k]).filter(v=>v!=null).map(v=>typeof v==='object'?JSON.stringify(v):String(v)).join(' '))}
function relationEvidence(h,rel,i){for(const a of(R[rel]||[])){const p=h.indexOf(norm(a));if(p<0)continue;const w=h.slice(Math.max(0,p-100),Math.min(h.length,p+180));if(i.landmarks.some(k=>has(w,L[k]))||i.roads.some(k=>has(w,D[k])))return true}return false}
function entityScore(r,i){const h=text(r);let s=0,m=0,req=0,e=[];if(i.cities.length){req++;const rc=norm([r?.city,r?.area,r?.address].filter(Boolean).join(' '));if(i.cities.some(c=>rc.includes(c))){s+=220;m++;e.push('city:'+i.cities[0])}else{s-=600;e.push('city-mismatch')}}if(i.category){req++;if(has(r?.category,C[i.category])||has(r?.type,C[i.category])||has(r?.name,C[i.category])||h.includes(i.category)){s+=120;m++;e.push('category:'+i.category)}else s-=120}if(i.veg){req++;if(/\b(veg|vegetarian|pure veg|shakahari)\b/i.test(h)){s+=110;m++;e.push('veg')}else s-=100}if(i.girls){req++;if(/\b(girls|girl|female|ladies|women|ladki)\b/i.test(h)){s+=110;m++;e.push('girls')}else s-=100}if(i.boys){req++;if(/\b(boys|boy|male|gents|men|ladka)\b/i.test(h)){s+=110;m++;e.push('boys')}else s-=100}for(const k of i.landmarks){req++;if(has(h,L[k])){s+=145;m++;e.push('landmark:'+k)}else s-=55}for(const k of i.roads){req++;if(has(h,D[k])){s+=130;m++;e.push('road:'+k)}else s-=45}for(const x of i.relations){if(x==='near')continue;req++;if(relationEvidence(h,x,i)){s+=70;m++;e.push('relation:'+x)}else s-=20}if(i.relations.includes('near')&&(i.landmarks.length||i.roads.length)){req++;const proximityFields=['name','address','area','nearby','landmark','location','service_area','description','facilities'];const proximityText=norm(proximityFields.map(k=>r?.[k]).filter(v=>v!=null).join(' '));const nearEntity=i.landmarks.some(k=>has(proximityText,L[k]))||i.roads.some(k=>has(proximityText,D[k]));const explicitNear=relationEvidence(h,'near',i);if(nearEntity&&explicitNear){s+=75;m++;e.push('near:'+((i.landmarks[0]||i.roads[0])||'location'))}else{s-=90}}for(const t of i.locationTokens){req++;if(h.includes(t)){s+=22;m++;e.push('token:'+t)}else s-=35}if(req&&m>=req)s+=90;return{score:s,matched:m,required:req,evidence:e}}
function rankRows(data,q,forcedCategory){
  const query=String(q??'').trim();
  const forced=forcedCategory?norm(forcedCategory):'';
  const effective=forced && !category(query) ? query+' '+forced : query;
  const i=parseQuery(effective);
  if(forced) i.category=forced;
  const rows=Array.isArray(data)?data:[];

  const out=rows.map((r,idx)=>{
    const e=entityScore(r,i);
    const catOk=!forced || (r.__category===forced || has(r?.category,C[forced]||[forced]) || has(r?.type,C[forced]||[forced]));
    if(!catOk)return null;

    const base=Number(r.__score)||0;
    const locationHard = !i.cities.length ||
      i.cities.every(c=>norm([r?.city,r?.area,r?.address].filter(Boolean).join(' ')).includes(c));
    const roadsHard = !i.roads.length ||
      i.roads.every(k=>has(text(r),D[k]));
    const landmarksHard = !i.landmarks.length ||
      i.landmarks.every(k=>has(text(r),L[k]));
    const nearHard = !i.relations.includes('near') || !(i.landmarks.length||i.roads.length) ||
      e.evidence.some(x=>x.startsWith('near:'));
    const exactLocation = locationHard && roadsHard && landmarksHard && nearHard;

    const hardMisses=[];
    if(i.cities.length && !locationHard) hardMisses.push('city');
    if(i.roads.length && !roadsHard) hardMisses.push('road');
    if(i.landmarks.length && !landmarksHard) hardMisses.push('landmark');
    if(i.relations.includes('near') && !nearHard) hardMisses.push('proximity');

    const locationHits=(i.roads.filter(k=>has(text(r),D[k])).length)+
      (i.landmarks.filter(k=>has(text(r),L[k])).length);

    let tier='broader';
    if(exactLocation && e.matched>=e.required) tier='exact';
    else if(locationHits>0) tier='nearby';
    else if(i.cities.length && locationHard) tier='nearby';

    return {...r,__unifiedScore:base+e.score,__unifiedSearch:e,__matchTier:tier,__hardLocationMatch:exactLocation,__hardMisses:hardMisses};
  }).filter(Boolean);

  const exact=out.filter(r=>r.__matchTier==='exact');
  if(exact.length){
    return exact
      .sort((a,b)=>b.__unifiedScore-a.__unifiedScore||(Number(b.rating)||0)-(Number(a.rating)||0)||String(a.name||a.property_name||a.title||'').localeCompare(String(b.name||b.property_name||b.title||'')));
  }

  // No exact match: preserve explicit location constraints.
  // A query containing a road, landmark, city, or location token must never
  // fall back to unrelated listings from another location.
  const hasExplicitLocation=Boolean(
    i.cities.length ||
    i.roads.length ||
    i.landmarks.length ||
    i.locationTokens.length
  );
  const contextualFallback=out.filter(r=>{
    if(!(r.__unifiedSearch.score>0))return false;
    if(!hasExplicitLocation)return true;

    const h=text(r);
    const cityOk=!i.cities.length ||
      i.cities.some(c=>norm([r?.city,r?.area,r?.address].filter(Boolean).join(' ')).includes(c));
    const roadOk=!i.roads.length ||
      i.roads.some(k=>has(h,D[k]));
    const landmarkOk=!i.landmarks.length ||
      i.landmarks.some(k=>has(h,L[k]));
    const tokenOk=!i.locationTokens.length ||
      i.locationTokens.some(t=>h.includes(t));

    return cityOk && roadOk && landmarkOk && tokenOk;
  });

  const fallback=contextualFallback
    .filter(r=>r.__matchTier==='nearby' || r.__matchTier==='broader')
    .sort((a,b)=>{
      const tierA=a.__matchTier==='nearby'?1:0;
      const tierB=b.__matchTier==='nearby'?1:0;
      return tierB-tierA || b.__unifiedScore-a.__unifiedScore ||
        (Number(b.rating)||0)-(Number(a.rating)||0) ||
        String(a.name||a.property_name||a.title||'').localeCompare(String(b.name||b.property_name||b.title||''));
    });

  return fallback;
}
window.StudentHubSearchEngine={normalize:norm,parseQuery,rankRows,entityScore,version:'2.1.0'};

function install(){if(typeof window.ranked!=='function'||window.__studentHubPhase5Installed)return;const old=window.ranked;window.__studentHubPhase5Installed=true;window.ranked=function(data,q){const i=parseQuery(q),base=old(data,q);if(!i.category&&!i.landmarks.length&&!i.roads.length&&!i.relations.length)return base;const unified=rankRows(data,q,i.category);if(unified.length)return unified;const normal=Array.isArray(base)?base:[],cityScoped=i.cities.length?normal.filter(r=>{const h=norm([r?.city,r?.area,r?.address].filter(Boolean).join(' '));return i.cities.some(c=>h.includes(c))}):normal,broad=i.category||i.locationTokens.join(' ');let pool=cityScoped;if(broad&&(i.landmarks.length+i.roads.length+i.relations.length)){const b=old(data,broad);const bb=Array.isArray(b)?b:[];pool=cityScoped.concat(bb.filter(r=>{const h=norm([r?.city,r?.area,r?.address].filter(Boolean).join(' '));return !i.cities.length||i.cities.some(c=>h.includes(c))}))}const map=new Map;for(const r of pool){const e=entityScore(r,i),score=(Number(r.__score)||0)+e.score,key=String(r?.property_id||r?.id||r?.slug||r?.name||r?.property_name||'').toLowerCase()+'|'+String(r?.__category||r?.category||'');const p=map.get(key);if(!p||score>p.__score)map.set(key,{...r,__score:score,__phase5Natural:e,__phase5Intent:i})}return[...map.values()].filter(r=>r.__phase5Natural.score>=0||r.__score>=20).sort((a,b)=>b.__score-a.__score||String(a.name||a.property_name||'').localeCompare(String(b.name||b.property_name||'')))};window.__studentHubPhase5={normalize:norm,parseQuery,detectCategory:category,detectRelation:relations,entityScore,version:'1.0.0'}}
const t=setInterval(()=>{if(typeof window.ranked==='function'){clearInterval(t);install()}},50);setTimeout(()=>{clearInterval(t);install()},10000)})();