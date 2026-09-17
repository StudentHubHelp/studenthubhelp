(function(){
  // Normalize common Indian/local address abbreviations so queries such as
  // "Piprali Road" also match stored values such as "Piprali Rd".
  function shhNormalizeLocationText(v){
    return norm(String(v||'')
      .replace(/\broad\b/g,' rd ')
      .replace(/\brd\.?\b/g,' rd ')
      .replace(/\bstreet\b/g,' st ')
      .replace(/\bst\.?\b/g,' st ')
      .replace(/\blane\b/g,' ln ')
      .replace(/\bln\.?\b/g,' ln ')
      .replace(/\bchoke\b/g,' chowk ')
      .replace(/\s+/g,' ').trim());
  }

  function shhLocationTokenMatch(token, fields){
    const t=shhNormalizeLocationText(token);
    const sources=[fields.city,fields.area,fields.address,fields.landmark];
    return sources.some(s=>{
      const hay=shhNormalizeLocationText(s);
      if(!hay) return false;
      const words=toks(hay);
      if(words.includes(t)) return true;
      return words.some(x=>sim(t,x)>=.90);
    });
  }

  function shhStrictLocationMatch(f,loc){
    if(!loc.length) return true;
    return loc.every(t=>shhLocationTokenMatch(t,f));
  }

  function shhGenderMatch(info,f){
    const text=norm([f.name,f.room,f.description,f.facilities,f.food].join(' '));
    if(info.ins.girls) return /(girls|girl|female|ladki|ladies|women|mahila)/.test(text);
    if(info.ins.boys) return /(boys|boy|male|ladka|gents|men|purush)/.test(text);
    return true;
  }

  function shhVegMatch(f){
    return /(veg|vegetarian|shakahari|pure veg)/.test(norm([f.food,f.facilities,f.menu,f.description].join(' ')));
  }

  function shhBetterScore(r,info){
    const f=fields(r),why=[];
    let s=0;
    if(info.cat && r.__category!==info.cat) return {s:-999,why:[]};
    if(info.location.length && !shhStrictLocationMatch(f,info.location)) return {s:-999,why:[]};
    if((info.ins.girls||info.ins.boys) && !shhGenderMatch(info,f)) return {s:-999,why:[]};
    if(info.ins.veg && !shhVegMatch(f)) return {s:-999,why:[]};

    const queryTerms=info.ts.filter(t=>!STOP.has(t));
    const categoryTerms=new Set(Object.values(ALIASES).flat().map(norm));
    const intentTerms=new Set(Object.values(INTENTS).flat().map(norm));
    const locationTerms=new Set(info.location);

    if(!info.location.length && !info.cat){
      if(f.name===info.n){s+=420;why.push('Exact name');}
      else if(f.name.includes(info.n)){s+=300;why.push('Name match');}
      else {const z=sim(info.n,f.name);if(z>=.72){s+=150*z;why.push('Name similarity');}}
    } else if(info.location.length){
      for(const t of info.location){
        const nt=shhNormalizeLocationText(t);
        const city=shhNormalizeLocationText(f.city);
        const area=shhNormalizeLocationText(f.area);
        const landmark=shhNormalizeLocationText(f.landmark);
        const address=shhNormalizeLocationText(f.address);
        if(toks(city).includes(nt)){s+=300;why.push('City match');}
        else if(toks(area).includes(nt)){s+=240;why.push('Area match');}
        else if(toks(landmark).includes(nt)){s+=190;why.push('Nearby match');}
        else if(toks(address).includes(nt)){s+=160;why.push('Address match');}
        else if(shhLocationTokenMatch(t,f)){s+=120;why.push('Location match');}
      }
    }

    if(info.cat===r.__category){s+=180;why.push(CATEGORIES[r.__category]?.label||'Category match');}

    const weights={name:220,area:120,city:115,landmark:105,address:90,category:70,facilities:45,food:45,room:40,timing:34,description:22,price:18};
    for(const t of queryTerms){
      if(categoryTerms.has(t)||locationTerms.has(t)||intentTerms.has(t)) continue;
      let best=0,bf='';
      for(const [field,w] of Object.entries(weights)){
        const z=tokenScore(t,f[field]);
        if(z*w>best){best=z*w;bf=field;}
      }
      if(best){s+=best;if(bf==='name')why.push('Name match');if(bf==='area')why.push('Area match');if(bf==='city')why.push('City match');if(bf==='landmark')why.push('Nearby match');}
    }

    if(info.ins.nearby&&(f.area||f.landmark||f.address))s+=28;
    if(info.ins.late&&f.timing){s+=18;if(/24|late|night|open|hour|am|pm/.test(f.timing))s+=28;}
    if(info.ins.veg)s+=35;
    if(info.ins.premium){const rating=Number(r.rating);if(Number.isFinite(rating)&&rating>0)s+=rating*10;}
    if(info.budget!=null){const nums=(f.price.match(/\d+(?:\.\d+)?/g)||[]).map(Number);if(nums.length){const p=Math.min(...nums);s+=p<=info.budget?50:-Math.min(50,(p-info.budget)/Math.max(1,info.budget)*50);}}
    if(r.verified===true||r.is_verified===true||norm(r.verification_status)==='verified')s+=15;
    return {s,why:uniq(why).slice(0,4)};
  }

  window.locationMatch=shhStrictLocationMatch;
  window.score=shhBetterScore;
  window.ranked=function(data,q){
    const info=parse(q);
    return data
      .filter(r=>activeFilter==='all'||r.__category===activeFilter)
      .map(r=>{const x=shhBetterScore(r,info);return {...r,__score:x.s,__reasons:x.why,__searchInfo:info};})
      .filter(r=>r.__score>=35)
      .sort((a,b)=>b.__score-a.__score||(Number(b.rating)||0)-(Number(a.rating)||0)||nameFromRecord(a).localeCompare(nameFromRecord(b)));
  };

  // Re-run the initial URL query after this override loads.
  if(typeof performSearch==='function' && input && input.value.trim()){
    setTimeout(()=>performSearch(input.value),0);
  }
})();
