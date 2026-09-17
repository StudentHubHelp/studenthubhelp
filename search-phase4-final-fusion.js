(function(){
  'use strict';
  const STOP=new Set(['the','a','an','is','are','me','mujhe','mujko','mko','chahiye','chaiye','please','for','of','in','on','at','par','pe','pr','ke','ka','ki','k','near','nearby','pass','pas','paas','hai','hain','ko','se','tak','and','or','ya','with','under','below','upto','up','less','than','within','above','over','more','greater','minimum','min','at','least','budget','mein','me','mai','m','में','पर','के','का','की','पास','को','से','तक','और','या','चाहिए','चाहिये']);
  const FIELDS={exact:['name','property_name','service_name','title'],location:['area','city','address','nearby','landmark','location','locality','service_area'],attributes:['category','type','gender','food_type','meal_type','room_type','sharing','book_type','specialization','facilities','timing'],descriptive:['description','features','menu','details']};
  const norm=s=>String(s??'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[|,;:/()[\]{}.!?]+/g,' ').replace(/\s+/g,' ').trim();
  const tokens=s=>norm(s).split(/\s+/).filter(Boolean);
  const textOf=(r,keys)=>norm(keys.map(k=>r?.[k]).filter(v=>v!=null).map(v=>typeof v==='object'?JSON.stringify(v):String(v)).join(' '));
  const nameOf=r=>String(r?.name||r?.property_name||r?.service_name||r?.title||'');
  function editDistance(a,b){a=norm(a);b=norm(b);if(a===b)return 0;const dp=Array(b.length+1);for(let j=0;j<=b.length;j++)dp[j]=j;for(let i=1;i<=a.length;i++){let prev=dp[0];dp[0]=i;for(let j=1;j<=b.length;j++){const cur=dp[j];dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=cur;}}return dp[b.length];}
  function queryParts(q){return [...new Set(tokens(q).filter(t=>!STOP.has(t)&&t.length>1))];}
  function scoreFinal(r,q){
    const nq=norm(q),parts=queryParts(q),name=textOf(r,FIELDS.exact),loc=textOf(r,FIELDS.location),attrs=textOf(r,FIELDS.attributes),desc=textOf(r,FIELDS.descriptive),all=[name,loc,attrs,desc].join(' ');
    let bonus=0,exact=0,covered=0,typo=0;
    if(nq&&name===nq){bonus+=180;exact++;}
    else if(nq&&name.includes(nq)){bonus+=120;exact++;}
    const phraseParts=parts.length>1?parts.join(' '):'';
    if(phraseParts&&name.includes(phraseParts)){bonus+=90;exact++;}
    for(const t of parts){
      if(name.split(/\s+/).some(x=>x===t)){bonus+=24;covered++;continue;}
      if(attrs.includes(t)){bonus+=18;covered++;continue;}
      if(loc.includes(t)){bonus+=16;covered++;continue;}
      if(desc.includes(t)){bonus+=8;covered++;continue;}
      const words=all.split(/\s+/).filter(Boolean);
      if(t.length>=4&&words.some(w=>editDistance(t,w)<=1)){bonus+=5;covered++;typo++;}
    }
    const coverage=parts.length?covered/parts.length:0;
    if(coverage===1)bonus+=55;else if(coverage>=.75)bonus+=30;else if(coverage>=.5)bonus+=12;
    const verified=r?.verified===true||/^(verified|approved)$/i.test(String(r?.status||r?.verification_status||''));
    if(verified)bonus+=8;
    if(r?.phone||r?.contact_phone||r?.whatsapp||r?.email)bonus+=2;
    const base=Number(r?.__score)||0,phase2=Number(r?.__phase2Score)||0;
    const final=base+phase2+bonus;
    return {final,bonus,base,phase2,phase3:Number(r?.__phase3LocationScore)||0,coverage,covered,parts:parts.length,exact,typo,verified};
  }
  function dedupe(rows){
    const seen=new Set(),out=[];
    for(const r of rows){const key=norm(r?.property_id||r?.id||nameOf(r));if(!key||seen.has(key))continue;seen.add(key);out.push(r);}return out;
  }
  function install(){
    if(typeof window.ranked!=='function'||window.__studentHubPhase4Installed)return;
    const old=window.ranked;window.__studentHubPhase4Installed=true;
    window.ranked=function(data,q){
      const base=old(data,q);if(!Array.isArray(base)||!q)return base;
      return dedupe(base).map(r=>{const c=scoreFinal(r,q);return {...r,__phase4FinalScore:c.final,__phase4Confidence:c.coverage,__phase4Meta:c};}).sort((a,b)=>b.__phase4FinalScore-a.__phase4FinalScore||b.__phase4Confidence-a.__phase4Confidence||String(nameOf(a)).localeCompare(String(nameOf(b))));
    };
    window.__studentHubPhase4={scoreFinal,queryParts,dedupe,version:'1.0.1'};
  }
  const timer=setInterval(()=>{if(typeof window.ranked==='function'){clearInterval(timer);install();}},50);setTimeout(()=>{clearInterval(timer);install();},10000);
})();
