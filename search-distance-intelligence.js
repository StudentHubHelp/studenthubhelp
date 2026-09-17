(function(){
  // ULTRA+ landmark -> property distance intelligence.
  // Keeps the existing search/ranking intact and adds a distance layer on top.
  // Distance sources, in priority order:
  // 1) exact property/landmark coordinates when available,
  // 2) explicit distance written in the property data (e.g. "500 m from Allen"),
  // 3) relation/landmark evidence without a measurable distance.
  const oldRanked=window.ranked;
  if(typeof oldRanked!=='function')return;

  const landmarkCoords=window.STUDENTHUB_LANDMARK_COORDS||{};
  const normDI=v=>String(v??'').toLowerCase().replace(/[|,;:/()[\]{}]+/g,' ').replace(/\s+/g,' ').trim();
  const aliasesDI={
    allen:['allen','allen coaching','allen career institute','allen institute','allen career','allen sikar'],
    clc:['clc','clc coaching','clc sikar','career line coaching','career line classes','clc kvm','clc-b'],
    vibrant:['vibrant','vibrant coaching','vibrant career institute','vibrant academy','vibrant sikar'],
    gurukripa:['gurukripa','gurukripa coaching','gurukripa career institute','gci','gurukripa g8','gurukripa g-8','gurukripa g9','gurukripa g-9'],
    matrix:['matrix','matrix coaching','matrix academy','matrix neet division'],
    aayaam:['aayaam','aayaam career academy','aayam','aayam academy'],
    pcp:['pcp','pcp coaching','pcp sikar','pcp career institute'],
    path:['path','path coaching','path career institute','path academy'],
    aakash:['aakash','aakash institute','akash institute']
  };
  const findLandmarkDI=q=>{
    const n=normDI(q),hits=[];
    Object.entries(aliasesDI).forEach(([k,a])=>{if(a.some(x=>n.includes(normDI(x))))hits.push(k);});
    return hits.sort((a,b)=>b.length-a.length)[0]||'';
  };
  const numberDistanceDI=text=>{
    const n=normDI(text);
    const re=/(?:~|about|approx(?:imately)?|around|within|under|upto|up to|less than|distance|duri|from|se|की दूरी|दूर|पास)\s*(\d+(?:\.\d+)?)\s*(km|kilometer|kilometre|kms|m|meter|metre|मीटर|किलोमीटर)\b/i;
    const m=n.match(re);
    if(!m)return null;
    const value=Number(m[1]);
    if(!Number.isFinite(value))return null;
    return /^m|meter|metre|मीटर$/i.test(m[2])?value/1000:value;
  };
  const haversineDI=(lat1,lon1,lat2,lon2)=>{
    const a=[lat1,lon1,lat2,lon2].map(Number);
    if(a.some(v=>!Number.isFinite(v)))return null;
    const rad=Math.PI/180,R=6371;
    const dLat=(a[2]-a[0])*rad,dLon=(a[3]-a[1])*rad;
    const x=Math.sin(dLat/2)**2+Math.cos(a[0]*rad)*Math.cos(a[2]*rad)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(Math.min(1,x)));
  };
  const coordFromRecordDI=r=>{
    const lat=Number(r?.latitude??r?.lat),lon=Number(r?.longitude??r?.lng??r?.lon);
    return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null;
  };
  const coordFromLandmarkDI=key=>{
    const c=landmarkCoords[key]||landmarkCoords[normDI(key)];
    if(!c)return null;
    const lat=Number(c.lat??c.latitude),lon=Number(c.lon??c.lng??c.longitude);
    return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null;
  };
  const distanceFromRecordDI=(r,info)=>{
    const landmark=info?.landmark||findLandmarkDI(info?.raw||'');
    if(!landmark)return {km:null,source:'none',confidence:0};
    const pc=coordFromRecordDI(r),lc=coordFromLandmarkDI(landmark);
    if(pc&&lc){const km=haversineDI(pc.lat,pc.lon,lc.lat,lc.lon);if(km!=null)return {km,source:'coordinates',confidence:1};}
    const fields=['nearby_coaching','landmark','address','area','service_area','description','facilities','location','nearby'];
    for(const f of fields){const d=numberDistanceDI(r?.[f]);if(d!=null)return {km:d,source:'property-text',confidence:.85};}
    const all=Object.values(r||{}).filter(v=>v!==null&&v!==undefined).map(v=>typeof v==='object'?JSON.stringify(v):String(v)).join(' ');
    const d=numberDistanceDI(all);
    if(d!=null)return {km:d,source:'record-text',confidence:.7};
    return {km:null,source:'landmark-only',confidence:.35};
  };
  const queryDistanceDI=q=>{
    const n=normDI(q);
    const limit=n.match(/(?:within|under|upto|up to|less than|around|about|approx(?:imately)?)\s*(\d+(?:\.\d+)?)\s*(km|kilometer|kilometre|kms|m|meter|metre|मीटर|किलोमीटर)\b/i);
    const target=limit?Number(limit[1])*(/^m|meter|metre|मीटर$/i.test(limit[2])?.001:1):null;
    const nearest=/\b(closest|nearest|sabse paas|sabse pass|सबसे पास|near me|nearest to)\b/i.test(n);
    return {limitKm:target,nearest};
  };

  window.ranked=function(data,q){
    const base=oldRanked(data,q), info=(base[0]&&base[0].__searchInfo)||{};
    const landmark=info.landmark||findLandmarkDI(q);
    if(!landmark)return base;
    const qd=queryDistanceDI(q);
    const scored=base.map(r=>{
      const d=distanceFromRecordDI(r,{...info,landmark,raw:q});
      let bonus=0;
      if(d.km!=null){
        // Stronger separation for close properties; measurable distance always beats
        // an unmeasured landmark mention, while the original relevance remains primary.
        bonus=260+Math.max(0,180-Math.min(180,d.km*90));
        if(qd.nearest)bonus+=Math.max(0,220-Math.min(220,d.km*110));
        if(qd.limitKm!=null)bonus+=d.km<=qd.limitKm?180: -500;
      }else{
        bonus=qd.limitKm!=null||qd.nearest?-120:0;
      }
      return {...r,__landmarkDistanceKm:d.km,__distanceSource:d.source,__distanceConfidence:d.confidence,__score:r.__score+bonus};
    });
    return scored.filter(r=>qd.limitKm==null||r.__landmarkDistanceKm!=null&&r.__landmarkDistanceKm<=qd.limitKm)
      .sort((a,b)=>b.__score-a.__score||((a.__landmarkDistanceKm??Infinity)-(b.__landmarkDistanceKm??Infinity))||nameFromRecord(a).localeCompare(nameFromRecord(b)));
  };

  // Lightweight deterministic regression hook. It is not used by the UI.
  window.__studentHubDistanceIntelligenceTest=function(){
    const info={landmark:'allen',raw:'allen'};
    const rows=[
      {name:'A - 250m',nearby_coaching:'250 m from Allen'},
      {name:'B - 1km',nearby_coaching:'1 km from Allen'},
      {name:'C - 2km',nearby_coaching:'2 km from Allen'},
      {name:'D - unknown',nearby_coaching:'Near Allen'}
    ];
    const out=rows.map(r=>({name:r.name,distance:distanceFromRecordDI(r,info).km}));
    return JSON.stringify(out[0].distance===.25&&out[1].distance===1&&out[2].distance===2&&out[3].distance===null);
  };
})();
