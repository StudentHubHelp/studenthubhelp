(function(){
  'use strict';
  const ROAD={
    piprali:['piprali road','piprali rd','piprali'],
    nawalgarh:['nawalgarh road','nawalgarh rd','nawalgarh'],
    jaipur:['jaipur road','jaipur rd','jaipur'],
    jhunjhunu:['jhunjhunu road','jhunjhunu rd','jhunjhunu'],
    rani_sati:['rani sati road','rani sati rd','rani sati'],
    devipura:['devipura road','devipura rd','devipura'],
    railway:['railway station road','railway station rd','railway road','railway station'],
    mandia:['mandia road','mandia rd','mandia'],
    fatehpuri:['fatehpuri gate road','fatehpuri gate rd','fatehpuri gate'],
    todarmal:['todarmal road','todarmal rd','todarmal']
  };
  const LANDMARK={
    allen:['allen','allen coaching','allen career institute'],clc:['clc','career line coaching','career line classes'],
    vibrant:['vibrant','vibrant coaching','vibrant career institute'],gurukripa:['gurukripa','gurukripa coaching','gci'],
    matrix:['matrix','matrix coaching','matrix academy'],aayaam:['aayaam','aayam','aayaam career academy'],
    pcp:['pcp','pcp coaching','pcp career institute'],path:['path','path coaching','path academy'],
    aakash:['aakash','aakash institute','akash institute'],sk_college:['sk college','s k college'],
    railway_station:['railway station','railway station sikar'],piprali_circle:['piprali circle'],
    charan_singh_gate:['charan singh gate'],sk_hospital:['sk hospital'],kvm_school:['kvm school']
  };
  const REL={
    near:['near','nearby','close to','paas','pass','paas mein','ke paas','ke pass','नजदीक','पास'],
    opposite:['opposite','across','samne','saamne','सामने','के सामने'],
    beside:['beside','next to','adjacent','bagal me','bagal mein','बगल में'],
    behind:['behind','piche','peeche','पीछे'],
    front:['in front of','front of','aage','आगे'],
    between:['between','ke beech','ke bich','बीच में','के बीच']
  };
  const norm=s=>String(s??'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[|,;:/()[\]{}.!?]+/g,' ').replace(/\s+/g,' ').trim();
  const contains=(text,alts)=>{const n=norm(text);return alts.some(x=>n.includes(norm(x)));};
  const hits=(q,map)=>Object.entries(map).filter(([,alts])=>contains(q,alts)).map(([k])=>k);
  const queryInfo=q=>{const n=norm(q);return {raw:n,roads:hits(n,ROAD),landmarks:hits(n,LANDMARK),relations:hits(n,REL),between:/\bbetween\b|\bke beech\b|\bke bich\b|बीच|के बीच/i.test(n)};};
  const fieldText=r=>{const keys=['name','property_name','service_name','title','area','city','address','nearby','landmark','location','locality','service_area','description','facilities','timing'];return norm(keys.map(k=>r?.[k]).filter(v=>v!=null).join(' '));};
  const entityPresent=(text,map,key)=>contains(text,map[key]||[key]);
  function relationEvidence(text,relation,entityMap,keys){
    const n=norm(text), alts=REL[relation]||[];
    for(const a of alts){const p=n.indexOf(norm(a));if(p<0)continue;const windowText=n.slice(Math.max(0,p-90),Math.min(n.length,p+150));if(keys.some(k=>entityPresent(windowText,entityMap,k)))return true;}
    return false;
  }
  function scoreLocation(r,q){
    const info=queryInfo(q),h=fieldText(r);let score=0,matched=0,required=0,evidence=[];
    for(const k of info.roads){required++;if(entityPresent(h,ROAD,k)){score+=125;matched++;evidence.push('road:'+k);}else score-=45;}
    for(const k of info.landmarks){required++;if(entityPresent(h,LANDMARK,k)){score+=115;matched++;evidence.push('landmark:'+k);}else score-=35;}
    for(const rel of info.relations){if(rel==='near')continue;required++;if(relationEvidence(h,rel,LANDMARK,[...Object.keys(LANDMARK)])||relationEvidence(h,rel,ROAD,[...Object.keys(ROAD)])){score+=70;matched++;evidence.push('relation:'+rel);}else score-=25;}
    if(info.between){
      const entities=[...info.landmarks,...info.roads];
      if(entities.length>=2){required++;const both=entities.every(k=>entityPresent(h,LANDMARK,k)||entityPresent(h,ROAD,k));if(both){score+=150;matched++;evidence.push('between:both');}else score-=80;}
    }
    if(info.roads.length===1&&entityPresent(h,ROAD,info.roads[0]))score+=35;
    if(info.landmarks.length===1&&entityPresent(h,LANDMARK,info.landmarks[0]))score+=25;
    if(info.relations.includes('near')&&(info.landmarks.length||info.roads.length))score+=10;
    if(required&&matched===required)score+=60;
    return {score,matched,required,roads:info.roads,landmarks:info.landmarks,relations:info.relations,evidence};
  }
  function install(){
    if(typeof window.ranked!=='function'||window.__studentHubPhase3Installed)return;
    const old=window.ranked;window.__studentHubPhase3Installed=true;
    window.ranked=function(data,q){
      const base=old(data,q);if(!Array.isArray(base)||!q)return base;
      const info=queryInfo(q);if(!info.roads.length&&!info.landmarks.length&&!info.relations.length&&!info.between)return base;
      return base.map(r=>{const c=scoreLocation(r,q);return {...r,__phase3LocationScore:c.score,__phase3Location:c,__score:(r.__score||0)+c.score};}).sort((a,b)=>b.__score-a.__score||String(a.name||a.property_name||a.title||'').localeCompare(String(b.name||b.property_name||b.title||'')));
    };
    window.__studentHubPhase3={queryInfo,scoreLocation,version:'1.0.0'};
  }
  const timer=setInterval(()=>{if(typeof window.ranked==='function'){clearInterval(timer);install();}},50);
  setTimeout(()=>{clearInterval(timer);install();},10000);
})();
