(function(){
  'use strict';
  // Phase 1: query normalization + typo tolerance + synonym expansion + intent/entity extraction.
  // Non-destructive: wraps the existing ranking layer and only adds score to compatible records.
  const STOP=new Set(['the','a','an','is','are','me','mujhe','mujko','mko','chahiye','chaiye','please','plz','for','of','in','on','at','par','pe','pr','ke','ka','ki','k','near','nearby','pass','pas','paas','hai','hain','ko','se','tak','and','or','ya','with','under','within','less','than','me','mein','mai','m','में','पर','के','का','की','पास','को','से','तक','और','या','चाहिए','चाहिये']);
  const SYN={
    hostel:['hostel','pg','paying guest','payingguest','residential hostel','room','rooms','stay','accommodation','रहने'],
    tiffin:['tiffin','mess','dabba','home food','meal service','food delivery','lunch','dinner','खाना','टिफिन','मेस'],
    library:['library','study library','reading room','study room','self study','self-study','पढ़ाई','स्टडी'],
    cafe:['cafe','cafes','coffee shop','coffeehouse','restro','restaurant','eatery','coffee','चाय','कैफे'],
    bookstore:['bookstore','book store','book shop','bookseller','book depot','stationery','stationary shop','books','किताब','बुकस्टोर'],
    girls:['girls','girl','female','ladies','women','mahila','ladki','girls hostel','girls pg','महिला','लड़कियों'],
    boys:['boys','boy','male','gents','men','purush','ladka','boys hostel','boys pg','पुरुष','लड़कों'],
    veg:['veg','vegetarian','pure veg','shakahari','शाकाहारी','वेज'],
    food:['food','meal','meals','mess','tiffin','breakfast','lunch','dinner','खाना','भोजन'],
    cheap:['cheap','affordable','budget','low price','कम कीमत','सस्ता','बजट'],
    premium:['premium','luxury','ac','best','top','high end','प्रीमियम'],
    availability:['available','availability','vacant','vacancy','empty','beds available','seat available','खाली','उपलब्ध'],
    timing:['open','opening','closing','timing','hours','24x7','24/7','late night','night','समय']
  };
  const allSyn=Object.values(SYN).flat();
  const norm=s=>String(s??'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[|,;:/()[\]{}.!?]+/g,' ').replace(/\s+/g,' ').trim();
  const compact=s=>norm(s).replace(/\s+/g,'');
  const tokens=s=>norm(s).split(/\s+/).filter(x=>x&&!STOP.has(x));
  function lev(a,b){a=compact(a);b=compact(b);if(a===b)return 0;if(!a||!b)return 99;if(Math.abs(a.length-b.length)>3)return 99;let p=Array(b.length+1).fill(0).map((_,i)=>i);for(let i=1;i<=a.length;i++){let c=[i];for(let j=1;j<=b.length;j++)c[j]=Math.min(c[j-1]+1,p[j]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c;}return p[b.length];}
  function typoToken(t){if(t.length<4)return t;let best=t,bd=99;for(const s of allSyn){if(s.includes(' ')||/[^a-z]/i.test(s))continue;const d=lev(t,s);if(d<bd && d<=Math.max(1,Math.floor(t.length*.28))){best=s;bd=d;}}return best;}
  function normalizeQuery(q){const n=norm(q),ts=tokens(n),corrected=ts.map(typoToken);return {raw:String(q??''),normalized:n,tokens:ts,correctedTokens:corrected,corrected:corrected.join(' ')};}
  function groups(q){const n=norm(q),out=[];for(const [k,arr] of Object.entries(SYN)){if(arr.some(x=>n.includes(norm(x))))out.push(k);}return [...new Set(out)];}
  function parseIntent(q){
    const x=normalizeQuery(q),g=groups(q),n=x.normalized;
    const category=['hostel','tiffin','library','cafe','bookstore'].find(k=>g.includes(k))||null;
    return {category,groups:g,corrected:x.corrected,original:x.raw,hasTypoCorrection:x.corrected!==x.tokens.join(' '),near:/\b(near|nearby|paas|pas|pass|beside|next to|samne|saamne|opposite|across|piche|behind)\b/i.test(n),availability:g.includes('availability'),timing:g.includes('timing'),price:n.match(/(?:under|below|upto|up to|less than|within|kam|se kam|₹|rs\.?)[^0-9]{0,8}(\d[\d,]*(?:\.\d+)?)/i)?.[1]||null};
  }
  function hay(r){const vals=[];Object.keys(r||{}).forEach(k=>{if(/^(__|created_at$|updated_at$|image$|images$)/i.test(k))return;const v=r[k];if(v!=null)vals.push(typeof v==='object'?JSON.stringify(v):String(v));});return norm(vals.join(' '));}
  function semanticBonus(r,intent){
    const h=hay(r);let s=0;
    const fieldMap={hostel:['category','type','name'],tiffin:['category','type','name','meal_type','food_type'],library:['category','type','name'],cafe:['category','type','name'],bookstore:['category','type','name','book_type','specialization'],girls:['gender','type','category','name'],boys:['gender','type','category','name'],veg:['food_type','food','menu','facilities','description'],food:['food_type','meal_type','food','menu','facilities','description'],availability:['available_beds','availability','status','seats','vacancy','description'],timing:['timing','hours','opening_hours','closing_hours','description']};
    for(const g of intent.groups){const fs=fieldMap[g]||[];let hit=false;for(const f of fs){const v=norm(r?.[f]);if(v&&SYN[g].some(a=>v.includes(norm(a)))){hit=true;break;}}if(hit)s+=70;else if(SYN[g].some(a=>h.includes(norm(a))))s+=18;}
    for(const t of intent.correctedTokens){if(t.length<3)continue;if(h.includes(t))s+=9;}
    if(intent.hasTypoCorrection)s+=4;
    return s;
  }
  function install(){
    if(typeof window.ranked!=='function'||window.__studentHubPhase1Installed)return;
    const old=window.ranked;window.__studentHubPhase1Installed=true;
    window.ranked=function(data,q){
      const base=old(data,q),intent=parseIntent(q);
      if(!intent.groups.length&&!intent.hasTypoCorrection)return base;
      return base.map(r=>{const bonus=semanticBonus(r,intent);return {...r,__phase1Intent:intent,__phase1Bonus:bonus,__score:(r.__score||0)+bonus};}).sort((a,b)=>b.__score-a.__score||iName(a).localeCompare(iName(b)));
    };
    function iName(r){return String(r?.name||r?.title||r?.property_name||'');}
    window.__studentHubPhase1={normalizeQuery,parseIntent,lev,semanticBonus,version:'1.0.1'};
  }
  const timer=setInterval(()=>{if(typeof window.ranked==='function'){clearInterval(timer);install();}},50);setTimeout(()=>{clearInterval(timer);install();},10000);
})();
