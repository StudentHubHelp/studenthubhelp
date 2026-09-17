(function(){
  // Advanced local-search layer: understands road + landmark + relation + category
  // combinations such as "Piprali Road par Allen ke paas hostel" and keeps the
  // existing UI/data flow untouched.
  const shhCatAliases={
    hostel:['hostel','pg','paying guest','boys hostel','girls hostel','boy hostel','girl hostel'],
    tiffin:['tiffin','mess','food service','home food','dabba','dabbawala'],
    library:['library','study library','reading room','study room'],
    cafe:['cafe','cafes','coffee shop','restaurant','restro'],
    bookstore:['bookstore','book store','books store','book shop','stationery','book depot']
  };
  const shhRoadAliases={
    'piprali road':['piprali road','piprali rd','piprali','piprali bypass'],
    'nawalgarh road':['nawalgarh road','nawalgarh rd','nawalgarh','nawalgadh road','nawargadh road'],
    'jaipur road':['jaipur road','jaipur rd'],
    'jhunjhunu road':['jhunjhunu road','jhunjhunu rd'],
    'rani sati road':['rani sati road','rani sati rd'],
    'devipura road':['devipura road','devipura rd'],
    'railway station road':['railway station road','railway station rd'],
    'mandia road':['mandia road','mandia rd']
  };
  const shhLandmarkAliases={
    'allen':['allen','allen coaching','allen career institute','allen institute','allen career'],
    'clc':['clc','clc coaching','clc sikar','career line coaching','clc kvm','clc-b'],
    'vibrant':['vibrant','vibrant coaching','vibrant career institute','vibrant academy'],
    'gurukripa':['gurukripa','gurukripa coaching','gurukripa career institute','gci','gurukripa g8','gurukripa g-8','gurukripa g9','gurukripa g-9'],
    'matrix':['matrix','matrix coaching','matrix academy','matrix neet division'],
    'aayaam':['aayaam','aayaam career academy','aayam'],
    'pcp':['pcp','pcp coaching','pcp sikar'],
    'path':['path','path coaching','path career institute','path academy'],
    'aakash':['aakash','aakash institute','akash institute'],
    'unacademy':['unacademy','unacademy centre','unacademy center'],
    'sri chaitanya':['sri chaitanya','sri chaitanya academy'],
    'resonance':['resonance','resonance coaching'],
    'motion':['motion','motion education'],
    'career point':['career point','careerpoint'],
    'banco':['banco','banco career academy'],
    'prayas':['prayas','prayas eduhub'],
    'inspector ssc':['inspector ssc','inspector ssc academy'],
    'kalam':['kalam','kalam academy','kalam coaching'],
    'physics wallah':['physics wallah','pw vidyapeeth','pw'],
    'mahendra':['mahendra','mahendra coaching'],
    'sambhav':['sambhav','sambhav institute'],
    'sharad lata hospital':['sharad lata hospital','dr sharad lata hospital'],
    'gurukripa hospital':['gurukripa hospital'],
    'sanjay restaurant':['sanjay restaurant','sanjay restorent'],
    'piprali circle':['piprali circle','piprali chowk'],
    'charan singh gate':['charan singh gate'],
    'railway station':['railway station'],
    'sk college':['sk college','s k college'],
    'sk hospital':['sk hospital']
  };
  const shhStop=new Set(['me','mein','mai','in','on','par','pr','pe','at','the','a','an','ke','ka','ki','k','near','nearby','pass','pas','paas','of','for','hai','hain','m','में','पर','के','पास','को','का','की','और','or','and']);

  function shhNorm(v){
    let s=norm(String(v||''));
    s=s.replace(/[|,;:/()[\]{}]+/g,' ').replace(/\broad\b/g,'rd').replace(/\brd\.?\b/g,'rd').replace(/\bstreet\b/g,'st').replace(/\bst\.?\b/g,'st').replace(/\blane\b/g,'ln').replace(/\bln\.?\b/g,'ln');
    return s.replace(/\s+/g,' ').trim();
  }
  function shhAllText(r){
    const vals=[];
    Object.keys(r||{}).forEach(k=>{
      if(/^(__|id$|created_at$|updated_at$|slug$|image$|images$)/i.test(k)) return;
      const v=r[k];
      if(v===null||v===undefined) return;
      if(typeof v==='object'){try{vals.push(JSON.stringify(v));}catch(e){}}
      else vals.push(String(v));
    });
    return shhNorm(vals.join(' '));
  }
  function shhField(r,names){
    for(const n of names){if(r&&r[n]!==undefined&&r[n]!==null&&String(r[n]).trim())return String(r[n]);}
    return '';
  }
  function shhCore(r){
    return shhNorm([
      shhField(r,['city']),shhField(r,['area']),shhField(r,['address']),
      shhField(r,['service_area']),shhField(r,['nearby_coaching'])
    ].join(' '));
  }
  function shhFindAlias(text,map){
    const n=shhNorm(text),hits=[];
    Object.entries(map).forEach(([key,aliases])=>{if(aliases.some(a=>n.includes(shhNorm(a))))hits.push(key);});
    return hits;
  }
  function shhFindCategory(text){
    const n=shhNorm(text);
    for(const [cat,aliases] of Object.entries(shhCatAliases))if(aliases.some(a=>n.includes(shhNorm(a))))return cat;
    return null;
  }
  function shhExtractLandmark(q){
    const n=shhNorm(q);
    const known=shhFindAlias(n,shhLandmarkAliases);
    if(known.length)return known.sort((a,b)=>b.length-a.length)[0];
    const before=n.match(/(?:^|\s)(.+?)\s+(?:ke\s+paas|k\s+pass|k\s+pas|ke\s+pass|near|paas|pass|samne|opposite|front\s+of|in\s+front\s+of|behind|piche)\b/i);
    if(before){
      let x=before[1].replace(/\b(?:par|pr|pe|me|mein|road|rd|street|st|lane|ln)\b/gi,' ').trim();
      const tt=x.split(/\s+/).filter(t=>!shhStop.has(t));
      return tt.slice(-4).join(' ');
    }
    const after=n.match(/\b(?:near|paas|pass|samne|opposite|behind|piche)\s+(.+?)(?=\s+(?:hostel|pg|tiffin|mess|cafe|library|bookstore|book\s+store|stationery)\b|$)/i);
    if(after)return after[1].trim().split(/\s+/).slice(0,5).join(' ');
    return '';
  }
  function shhParse(q){
    const raw=String(q||''),n=shhNorm(raw),cat=shhFindCategory(n),roads=shhFindAlias(n,shhRoadAliases);
    const landmark=shhExtractLandmark(n);
    const landmarkAliases=landmark&&shhLandmarkAliases[landmark]?shhLandmarkAliases[landmark]:(landmark?[landmark]:[]);
    let city='';
    const cm=n.match(/\b(sikar|jaipur|kota|delhi|bengaluru|bangalore|jhunjhunu)\b/i);if(cm)city=cm[1];
    return {raw,n,cat,roads,city,landmark,landmarkAliases,location:[...roads,...(city?[city]:[])],nearby:!!landmark,ts:toks(n),ins:{nearby:!!landmark,girls:/\b(girls?|female|ladki|ladies|women|mahila)\b/i.test(n),boys:/\b(boys?|male|ladka|gents|men|purush)\b/i.test(n),veg:/\b(veg|vegetarian|shakahari|pure veg)\b/i.test(n),premium:/\b(premium|luxury|best|top|ac)\b/i.test(n),late:/\b(24|24x7|late|night|open|hours?)\b/i.test(n)},budget:null};
  }
  function shhContainsAlias(text,aliases){const n=shhNorm(text);return aliases.some(a=>n.includes(shhNorm(a)));}
  function shhLocationHit(r,info){
    if(!info.roads.length&&!info.city)return true;
    const core=shhCore(r),all=shhAllText(r);
    if(info.city&&!core.includes(shhNorm(info.city))&&!all.includes(shhNorm(info.city)))return false;
    for(const road of info.roads){const aliases=shhRoadAliases[road]||[road];if(!shhContainsAlias(core,aliases))return false;}
    return true;
  }
  function shhLandmarkEvidence(r,info){
    if(!info.landmark)return {ok:true,score:0,distance:Infinity,reason:''};
    const aliases=info.landmarkAliases.length?info.landmarkAliases:[info.landmark];
    const chunks=[['name',shhField(r,['name']),520],['address',shhField(r,['address']),480],['area',shhField(r,['area']),420],['nearby',shhField(r,['nearby_coaching']),400],['service',shhField(r,['service_area']),360]];
    let best={ok:false,score:0,distance:Infinity,reason:''};
    for(const [kind,text,base] of chunks){
      if(!shhContainsAlias(text,aliases))continue;
      let s=base,dist=Infinity,n=shhNorm(text);
      if(/\b(near|pass|pas|paas|ke paas|k pass|k paas|samne|opposite|front of|behind|piche|पास|सामने|पीछे|नजदीक)\b/i.test(n))s+=80;
      const idx=aliases.map(a=>n.indexOf(shhNorm(a))).filter(x=>x>=0).sort((a,b)=>a-b)[0];
      const around=idx>=0?n.slice(Math.max(0,idx-20),Math.min(n.length,idx+120)):n;
      const dm=around.match(/(?:~|about|approx(?:imately)?|distance|duri)?\s*(\d+(?:\.\d+)?)\s*(km|kilometer|kilometre|m|meter|metre)\b/i);
      if(dm){dist=Number(dm[1])*(/^m/i.test(dm[2])?.001:1);s+=Math.max(0,180-Math.min(180,dist*60));}
      if(s>best.score)best={ok:true,score:s,distance:dist,reason:kind==='nearby'?'Nearby landmark match':'Landmark match'};
    }
    return best;
  }
  function shhGender(info,r){
    if(!info.ins.girls&&!info.ins.boys)return true;
    const t=shhAllText(r);
    return info.ins.girls?/\b(girls?|female|ladki|ladies|women|mahila)\b/i.test(t):/\b(boys?|male|ladka|gents|men|purush)\b/i.test(t);
  }
  function shhVeg(info,r){
    if(!info.ins.veg)return true;
    return /\b(veg|vegetarian|shakahari|pure veg)\b/i.test(shhNorm([shhField(r,['food_type']),shhField(r,['food']),shhField(r,['menu']),shhField(r,['facilities']),shhField(r,['description'])].join(' ')));
  }
  function shhScoreAdvanced(r,info){
    if(info.cat&&r.__category!==info.cat)return {s:-999,why:[]};
    if(!shhLocationHit(r,info))return {s:-999,why:[]};
    if(!shhGender(info,r)||!shhVeg(info,r))return {s:-999,why:[]};
    let s=0,why=[];
    if(info.cat){s+=260;why.push(CATEGORIES[info.cat]?.label||'Category match');}
    if(info.city){s+=220;why.push('City match');}
    for(const road of info.roads){s+=260;why.push('Road match');}
    const le=shhLandmarkEvidence(r,info);
    if(info.landmark){if(!le.ok)return {s:-999,why:[]};s+=le.score;why.push(le.reason);}
    const ignored=new Set([...Object.values(shhCatAliases).flat().map(shhNorm),...info.roads,shhNorm(info.city||'')]);
    const qTerms=info.ts.filter(t=>!shhStop.has(t)&&!ignored.has(t));
    const weights={name:230,area:150,city:130,address:115,nearby_coaching:105,service_area:100,landmark:100,facilities:45,food:45,menu:45,description:30,room_types:35,room_sharing:30};
    for(const t of qTerms){
      let best=0,bf='';
      for(const [k,w] of Object.entries(weights)){const z=tokenScore(t,shhField(r,[k]));if(z*w>best){best=z*w;bf=k;}}
      if(best){s+=best;if(bf==='name')why.push('Name match');else if(bf==='area'||bf==='city')why.push('Location match');}
    }
    if(info.ins.nearby)s+=120;
    if(r.verified===true||r.is_verified===true||norm(r.verification_status)==='verified')s+=15;
    if(info.ins.premium){const rating=Number(r.rating);if(Number.isFinite(rating))s+=rating*10;}
    return {s,why:uniq(why).slice(0,4),distance:le.distance};
  }
  window.ranked=function(data,q){
    const info=shhParse(q);
    return data.filter(r=>activeFilter==='all'||r.__category===activeFilter)
      .map(r=>{const x=shhScoreAdvanced(r,info);return {...r,__score:x.s,__reasons:x.why,__searchInfo:info,__nearDistance:x.distance};})
      .filter(r=>r.__score>=35)
      .sort((a,b)=>b.__score-a.__score||a.__nearDistance-b.__nearDistance||(Number(b.rating)||0)-(Number(a.rating)||0)||nameFromRecord(a).localeCompare(nameFromRecord(b)));
  };
  window.locationMatch=function(f,loc){
    if(!loc||!loc.length)return true;
    return loc.every(t=>shhContainsAlias([f.city,f.area,f.address,f.landmark,f.nearby_coaching,f.service_area].join(' '),[t]));
  };
  if(typeof performSearch==='function'&&input&&input.value.trim())setTimeout(()=>performSearch(input.value),0);
})();
