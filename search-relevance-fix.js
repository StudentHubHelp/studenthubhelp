(function(){
  // ULTRA local-search layer: road + landmark + relation + category + context.
  // Examples: "Piprali Road par Allen ke paas hostel", "CLC k pass tiffin",
  // "Nawalgarh Road near Vibrant coaching library". Existing UI/data flow stays intact.
  const shhCatAliases={
    hostel:['hostel','pg','paying guest','payingguest','boys hostel','girls hostel','boy hostel','girl hostel','residential hostel'],
    tiffin:['tiffin','mess','food service','home food','dabba','dabbawala','meal service','food delivery'],
    library:['library','study library','reading room','study room','self study','self-study'],
    cafe:['cafe','cafes','coffee shop','coffeehouse','restaurant','restro','eatery'],
    bookstore:['bookstore','book store','books store','book shop','book depot','stationery','stationary shop','bookseller']
  };
  const shhRoadAliases={
    'piprali road':['piprali road','piprali rd','piprali','piprali bypass','piprali road area'],
    'nawalgarh road':['nawalgarh road','nawalgarh rd','nawalgarh','nawalgadh road','nawargadh road','nawalgarh road area'],
    'jaipur road':['jaipur road','jaipur rd','jaipur road area'],
    'jhunjhunu road':['jhunjhunu road','jhunjhunu rd','jhunjhunu road area'],
    'rani sati road':['rani sati road','rani sati rd','rani sati road area'],
    'devipura road':['devipura road','devipura rd','devipura road area'],
    'railway station road':['railway station road','railway station rd','station road'],
    'mandia road':['mandia road','mandia rd'],
    'fatehpuri gate road':['fatehpuri gate road','fatehpuri gate rd'],
    'todarmal road':['todarmal road','todarmal rd']
  };
  const shhLandmarkAliases={
    'allen':['allen','allen coaching','allen career institute','allen institute','allen career','allen sikar'],
    'clc':['clc','clc coaching','clc sikar','career line coaching','career line classes','clc kvm','clc-b'],
    'vibrant':['vibrant','vibrant coaching','vibrant career institute','vibrant academy','vibrant sikar'],
    'gurukripa':['gurukripa','gurukripa coaching','gurukripa career institute','gci','gurukripa g8','gurukripa g-8','gurukripa g9','gurukripa g-9'],
    'matrix':['matrix','matrix coaching','matrix academy','matrix neet division'],
    'aayaam':['aayaam','aayaam career academy','aayam','aayam academy'],
    'pcp':['pcp','pcp coaching','pcp sikar','pcp career institute'],
    'path':['path','path coaching','path career institute','path academy'],
    'aakash':['aakash','aakash institute','akash institute'],
    'unacademy':['unacademy','unacademy centre','unacademy center'],
    'sri chaitanya':['sri chaitanya','sri chaitanya academy'],
    'resonance':['resonance','resonance coaching'],
    'motion':['motion','motion education'],
    'career point':['career point','careerpoint','career point sikar'],
    'banco':['banco','banco career academy'],
    'prayas':['prayas','prayas eduhub'],
    'inspector ssc':['inspector ssc','inspector ssc academy'],
    'kalam':['kalam','kalam academy','kalam coaching'],
    'physics wallah':['physics wallah','pw vidyapeeth','pw centre','pw center'],
    'mahendra':['mahendra','mahendra coaching','mahendra education'],
    'sambhav':['sambhav','sambhav institute'],
    'sharad lata hospital':['sharad lata hospital','dr sharad lata hospital'],
    'gurukripa hospital':['gurukripa hospital'],
    'sanjay restaurant':['sanjay restaurant','sanjay restorent'],
    'piprali circle':['piprali circle','piprali chowk'],
    'charan singh gate':['charan singh gate'],
    'railway station':['railway station','sikar railway station'],
    'sk college':['sk college','s k college'],
    'sk hospital':['sk hospital'],
    'kvm school':['kvm school','kvm sr sec school'],
    'samarthpura school':['samarthpura school'],
    'disney school':['disney school'],
    'vijay ground':['vijay ground'],
    'jaldhari nagar':['jaldhari nagar'],
    'new janta colony':['new janta colony'],
    'jat colony':['jat colony'],
    'surya nagar':['surya nagar'],
    'jyoti nagar':['jyoti nagar']
  };
  const shhStop=new Set(['me','mein','mai','m','in','on','par','pr','pe','at','the','a','an','ke','ka','ki','k','near','nearby','pass','pas','paas','of','for','hai','hain','me','se','tak','andar','within','from','and','or','ya','yaar','par','में','पर','के','पास','को','का','की','और','या','से','तक','अंदर']);
  const shhRelationRe=/\b(near|nearby|beside|next to|opposite|across|front of|in front of|behind|back of|piche|samne|saamne|paas|pass|pas|k paas|k pass|ke paas|ke pass|ke pas|ke saamne|ke samne|ke piche|ke peeche|near to)\b/i;

  function shhNorm(v){
    let s=norm(String(v||''));
    s=s.replace(/[|,;:/()[\]{}]+/g,' ')
      .replace(/\broad\b/g,'rd').replace(/\brd\.?\b/g,'rd')
      .replace(/\bstreet\b/g,'st').replace(/\bst\.?\b/g,'st')
      .replace(/\blane\b/g,'ln').replace(/\bln\.?\b/g,'ln')
      .replace(/\bchowk\b/g,'chowk').replace(/\bchoke\b/g,'chowk');
    return s.replace(/\s+/g,' ').trim();
  }
  function shhField(r,names){
    for(const n of names){if(r&&r[n]!==undefined&&r[n]!==null&&String(r[n]).trim())return String(r[n]);}
    return '';
  }
  function shhAllText(r){
    const vals=[];
    Object.keys(r||{}).forEach(k=>{
      if(/^(__|id$|created_at$|updated_at$|slug$|image$|images$)/i.test(k))return;
      const v=r[k];if(v===null||v===undefined)return;
      if(typeof v==='object'){try{vals.push(JSON.stringify(v));}catch(e){}}else vals.push(String(v));
    });
    return shhNorm(vals.join(' '));
  }
  function shhCore(r){
    return shhNorm([
      shhField(r,['city']),shhField(r,['area']),shhField(r,['address']),
      shhField(r,['service_area']),shhField(r,['nearby_coaching']),
      shhField(r,['landmark']),shhField(r,['location']),shhField(r,['nearby'])
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
    const before=n.match(/(?:^|\s)(.+?)\s+(?:ke\s+paas|k\s+pass|k\s+pas|ke\s+pass|ke\s+pas|near(?:by)?|near\s+to|beside|next\s+to|samne|saamne|opposite|across|front\s+of|in\s+front\s+of|behind|back\s+of|piche|peeche)\b/i);
    if(before){
      let x=before[1].replace(/\b(?:par|pr|pe|me|mein|road|rd|street|st|lane|ln|near|nearby)\b/gi,' ').trim();
      const tt=x.split(/\s+/).filter(t=>!shhStop.has(t));
      return tt.slice(-5).join(' ');
    }
    const after=n.match(/\b(?:near|nearby|beside|next\s+to|paas|pass|pas|samne|saamne|opposite|across|behind|piche|peeche)\s+(.+?)(?=\s+(?:hostel|pg|tiffin|mess|cafe|cafes|library|bookstore|book\s+store|stationery|restaurant)\b|$)/i);
    if(after)return after[1].trim().split(/\s+/).filter(t=>!shhStop.has(t)).slice(0,6).join(' ');
    return '';
  }
  function shhParse(q){
    const raw=String(q||''),n=shhNorm(raw),cat=shhFindCategory(n),roads=shhFindAlias(n,shhRoadAliases),landmark=shhExtractLandmark(n);
    const landmarkAliases=landmark&&shhLandmarkAliases[landmark]?shhLandmarkAliases[landmark]:(landmark?[landmark]:[]);
    let city='';
    const cm=n.match(/\b(sikar|jaipur|kota|delhi|bengaluru|bangalore|jhunjhunu|churu)\b/i);if(cm)city=cm[1];
    const relation=(n.match(shhRelationRe)||[])[0]||'';
    const distanceMatch=n.match(/(?:within|under|upto|up to|less than|around|about|approx(?:imately)?|distance|duri|from)\s*(\d+(?:\.\d+)?)\s*(km|kilometer|kilometre|m|meter|metre)\b/i);
    return {raw,n,cat,roads,city,landmark,landmarkAliases,relation,location:[...roads,...(city?[city]:[])],nearby:!!landmark||!!relation,distanceLimit:distanceMatch?Number(distanceMatch[1])*(/^m/i.test(distanceMatch[2])?.001:1):null,ts:toks(n),ins:{nearby:!!landmark||!!relation,girls:/\b(girls?|female|ladki|ladies|women|mahila)\b/i.test(n),boys:/\b(boys?|male|ladka|gents|men|purush)\b/i.test(n),veg:/\b(veg|vegetarian|shakahari|pure veg)\b/i.test(n),premium:/\b(premium|luxury|best|top|ac)\b/i.test(n),late:/\b(24|24x7|late|night|open|hours?)\b/i.test(n)},budget:null};
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
    // Strong proximity fields first; description/other text is accepted as supporting evidence,
    // but receives less weight so an unrelated mention cannot outrank a true nearby listing.
    const chunks=[
      ['name',shhField(r,['name']),560],['address',shhField(r,['address']),520],
      ['area',shhField(r,['area']),460],['nearby',shhField(r,['nearby_coaching']),450],
      ['landmark',shhField(r,['landmark']),440],['service',shhField(r,['service_area']),390],
      ['description',shhField(r,['description']),260],['facilities',shhField(r,['facilities']),150]
    ];
    let best={ok:false,score:0,distance:Infinity,reason:''};
    for(const [kind,text,base] of chunks){
      if(!shhContainsAlias(text,aliases))continue;
      const n=shhNorm(text);let s=base,dist=Infinity;
      if(shhRelationRe.test(n))s+=90;
      const idx=aliases.map(a=>n.indexOf(shhNorm(a))).filter(x=>x>=0).sort((a,b)=>a-b)[0];
      const around=idx>=0?n.slice(Math.max(0,idx-45),Math.min(n.length,idx+150)):n;
      const dm=around.match(/(?:~|about|approx(?:imately)?|distance|duri|within|under|upto|up\s+to)?\s*(\d+(?:\.\d+)?)\s*(km|kilometer|kilometre|m|meter|metre)\b/i);
      if(dm){dist=Number(dm[1])*(/^m/i.test(dm[2])?.001:1);s+=Math.max(0,220-Math.min(220,dist*70));}
      if(info.distanceLimit!=null&&dist!==Infinity&&dist>info.distanceLimit)continue;
      if(s>best.score)best={ok:true,score:s,distance:dist,reason:kind==='nearby'||kind==='landmark'?'Nearby landmark match':kind==='description'?'Landmark mentioned':'Location landmark match'};
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
    if(info.cat){s+=300;why.push(CATEGORIES[info.cat]?.label||'Category match');}
    if(info.city){s+=220;why.push('City match');}
    for(const road of info.roads){s+=280;why.push('Road match');}
    const le=shhLandmarkEvidence(r,info);
    if(info.landmark){if(!le.ok)return {s:-999,why:[]};s+=le.score;why.push(le.reason);}
    const ignored=new Set([...Object.values(shhCatAliases).flat().map(shhNorm),...info.roads,shhNorm(info.city||''),...shhStop]);
    const qTerms=info.ts.filter(t=>!ignored.has(t));
    const weights={name:240,area:155,city:135,address:125,nearby_coaching:115,service_area:105,landmark:105,facilities:45,food:45,menu:45,description:30,room_types:35,room_sharing:30};
    for(const t of qTerms){
      let best=0,bf='';
      for(const [k,w] of Object.entries(weights)){const z=tokenScore(t,shhField(r,[k]));if(z*w>best){best=z*w;bf=k;}}
      if(best){s+=best;if(bf==='name')why.push('Name match');else if(bf==='area'||bf==='city')why.push('Location match');}
    }
    if(info.ins.nearby)s+=140;
    if(info.distanceLimit!=null)s+=30;
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