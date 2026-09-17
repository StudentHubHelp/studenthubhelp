(function(){
  'use strict';
  // Phase 2: compound-query/entity intelligence.
  const SYN={hostel:['hostel','pg','paying guest','payingguest','room','rooms','stay','accommodation'],tiffin:['tiffin','mess','dabba','home food','meal service','food delivery','lunch','dinner'],library:['library','study library','reading room','study room','self study','self-study'],cafe:['cafe','cafes','coffee shop','coffeehouse','restro','restaurant','eatery'],bookstore:['bookstore','book store','book shop','bookseller','book depot','stationery','stationary shop'],girls:['girls','girl','female','ladies','women','mahila','ladki','girls hostel','girls pg'],boys:['boys','boy','male','gents','men','purush','ladka','boys hostel','boys pg'],veg:['veg','vegetarian','pure veg','shakahari'],cheap:['cheap','affordable','budget','low price'],premium:['premium','luxury','ac','best','top','high end']};
  const CATEGORY={hostel:['hostel','pg','paying guest'],tiffin:['tiffin','mess'],library:['library','study library','reading room'],cafe:['cafe','coffee shop','restaurant','restro'],bookstore:['bookstore','book store','book shop','stationery']};
  const STOP=new Set(['the','a','an','is','are','me','mujhe','mujko','mko','chahiye','chaiye','please','for','of','in','on','at','par','pe','pr','ke','ka','ki','k','near','nearby','pass','pas','paas','hai','hain','ko','se','tak','and','or','ya','with','under','within','less','than','above','over','more','greater','minimum','min','at','least','budget','me','mein','mai','m','में','पर','के','का','की','पास','को','से','तक','और','या','चाहिए','चाहिये']);
  const norm=s=>String(s??'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[|,;:/()[\]{}.!?]+/g,' ').replace(/\s+/g,' ').trim();
  const toks=s=>norm(s).split(/\s+/).filter(Boolean);
  const num=s=>{const m=String(s??'').replace(/,/g,'').match(/\d+(?:\.\d+)?/);return m?Number(m[0]):null;};
  const priceNumber=s=>Number(String(s??'').replace(/[\s,]/g,''));
  function maxPrice(q){const n=norm(q);const m=n.match(/(?:under|below|upto|up to|less than|within|budget)[^0-9]{0,12}(\d[\d\s,]*(?:\.\d+)?)/i);return m?priceNumber(m[1]):null;}
  function minPrice(q){const n=norm(q);const m=n.match(/(?:above|over|more than|greater than|minimum|min|at least|kam se kam|se kam)[^0-9]{0,12}(\d[\d\s,]*(?:\.\d+)?)/i);return m?priceNumber(m[1]):null;}
  function groups(q){const n=norm(q),out=[];for(const [k,a] of Object.entries(SYN))if(a.some(x=>n.includes(norm(x))))out.push(k);return [...new Set(out)];}
  function category(q){const g=groups(q);return ['hostel','tiffin','library','cafe','bookstore'].find(x=>g.includes(x))||null;}
  function fieldText(r){const parts=[];for(const [k,v] of Object.entries(r||{})){if(/^(__|created_at$|updated_at$|image$|images$)/i.test(k)||v==null)continue;parts.push(typeof v==='object'?JSON.stringify(v):String(v));}return norm(parts.join(' '));}
  function priceOf(r){for(const k of ['price','monthly_price','monthly_rent','rent','monthly_fee','fee','amount']){const v=num(r?.[k]);if(v!=null)return v;}const p=fieldText(r).match(/(?:₹|rs\.?)[^0-9]{0,5}(\d[\d\s,]*)/i);return p?priceNumber(p[1]):null;}
  function hasAny(v,arr){const x=norm(v);return !!x&&arr.some(a=>x.includes(norm(a)));}
  function conditionScore(r,q){const n=norm(q),g=groups(q),h=fieldText(r),cat=category(q);let s=0,matched=0,required=0;
    if(cat){required++;if(hasAny(r?.category,CATEGORY[cat])||hasAny(r?.type,CATEGORY[cat])||hasAny(r?.name,CATEGORY[cat])){s+=110;matched++;}else if(h.includes(cat)){s+=45;matched++;}else s-=180;}
    if(g.includes('girls')){required++;if(hasAny(r?.gender,['girls','girl','female','ladies','women','महिला'])||/girls?\s*(hostel|pg)/i.test(h)){s+=95;matched++;}else s-=160;}
    if(g.includes('boys')){required++;if(hasAny(r?.gender,['boys','boy','male','gents','men','पुरुष'])||/boys?\s*(hostel|pg)/i.test(h)){s+=95;matched++;}else s-=160;}
    if(g.includes('veg')){required++;if(hasAny(r?.food_type,['veg','vegetarian','pure veg','shakahari'])||/\bveg(?:etarian)?\b/i.test(h)){s+=90;matched++;}else s-=100;}
    const hi=maxPrice(q),lo=minPrice(q),rp=priceOf(r);
    if(hi!=null){required++;if(rp!=null&&rp<=hi){s+=80;matched++;}else if(rp!=null)s-=100;}
    if(lo!=null){required++;if(rp!=null&&rp>=lo){s+=60;matched++;}else if(rp!=null)s-=70;}
    const nonStop=toks(n).filter(x=>!STOP.has(x)&&x.length>2);let tokenHits=0;
    for(const t of nonStop){if(h.includes(t)){s+=10;tokenHits++;continue;}for(const a of Object.values(SYN)){if(a.some(x=>norm(x)===t)&&a.some(x=>h.includes(norm(x)))){s+=7;tokenHits++;break;}}}
    if(nonStop.length&&tokenHits===nonStop.length)s+=35;if(required&&matched===required)s+=55;
    return {score:s,required,matched,cat,groups:g,price:rp,max:hi,min:lo};
  }
  const iName=r=>String(r?.name||r?.property_name||r?.service_name||r?.title||'').toLowerCase();
  function install(){if(typeof window.ranked!=='function'||window.__studentHubPhase2Installed)return;const old=window.ranked;window.__studentHubPhase2Installed=true;window.ranked=function(data,q){const base=old(data,q);if(!Array.isArray(base)||!q)return base;const nq=String(q);const scored=base.map(r=>{const c=conditionScore(r,nq);return {...r,__phase2Score:c.score,__phase2Conditions:c};});const explicit=groups(nq).length||maxPrice(nq)!=null||minPrice(nq)!=null;if(!explicit)return scored;return scored.filter(r=>r.__phase2Conditions.required===0||r.__phase2Conditions.matched>0).sort((a,b)=>b.__phase2Score-a.__phase2Score||(a.__score||0)-(b.__score||0)||iName(a).localeCompare(iName(b)));};window.__studentHubPhase2={groups,category,maxPrice,minPrice,priceOf,conditionScore,version:'1.2.0'};}
  const timer=setInterval(()=>{if(typeof window.ranked==='function'){clearInterval(timer);install();}},50);setTimeout(()=>{clearInterval(timer);install();},10000);
})();
