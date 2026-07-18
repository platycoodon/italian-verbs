// ============================================================
// 意大利语动词变位 API — Cloudflare Workers（单文件部署版）
// 使用方法：粘贴到 Cloudflare Dashboard → Workers → 创建 Worker
// 需要绑定一个 D1 数据库，绑定名: DB
// ============================================================

// ── 配置 ──
const JWT_SECRET = 'italian-verbs-worker-secret-change-in-production';
const ALLOWED_ORIGINS = [
  'https://platycoodon.github.io',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

// ============================================================
// 词库（138 个动词）
// ============================================================
const VERBS = [
  { i:"essere",t:"irregular",a:"essere",pp:"stato",pr:["sono","sei","è","siamo","siete","sono"],imf:["ero","eri","era","eravamo","eravate","erano"],imp:["sii","sia","siamo","siate","siano"]},
  { i:"avere",t:"irregular",a:"avere",pp:"avuto",pr:["ho","hai","ha","abbiamo","avete","hanno"],imp:["abbi","abbia","abbiamo","abbiate","abbiano"]},
  { i:"andare",t:"irregular",a:"essere",pp:"andato",pr:["vado","vai","va","andiamo","andate","vanno"],imp:["va'","vada","andiamo","andate","vadano"]},
  { i:"dare",t:"irregular",a:"avere",pp:"dato",pr:["do","dai","dà","diamo","date","danno"],imp:["da'","dia","diamo","diate","diano"]},
  { i:"stare",t:"irregular",a:"essere",pp:"stato",pr:["sto","stai","sta","stiamo","state","stanno"],imp:["sta'","stia","stiamo","stiate","stiano"]},
  { i:"fare",t:"irregular",a:"avere",pp:"fatto",pr:["faccio","fai","fa","facciamo","fate","fanno"],imf:["facevo","facevi","faceva","facevamo","facevate","facevano"],imp:["fa'","faccia","facciamo","fate","facciano"]},
  { i:"dire",t:"irregular",a:"avere",pp:"detto",pr:["dico","dici","dice","diciamo","dite","dicono"],imf:["dicevo","dicevi","diceva","dicevamo","dicevate","dicevano"],imp:["di'","dica","diciamo","dite","dicano"]},
  { i:"bere",t:"irregular",a:"avere",pp:"bevuto",pr:["bevo","bevi","beve","beviamo","bevete","bevono"],imf:["bevevo","bevevi","beveva","bevevamo","bevevate","bevevano"]},
  { i:"sapere",t:"irregular",a:"avere",pp:"saputo",pr:["so","sai","sa","sappiamo","sapete","sanno"],imp:["sappi","sappia","sappiamo","sappiate","sappiano"]},
  { i:"volere",t:"irregular",a:"avere",pp:"voluto",pr:["voglio","vuoi","vuole","vogliamo","volete","vogliono"]},
  { i:"dovere",t:"irregular",a:"avere",pp:"dovuto",pr:["devo","devi","deve","dobbiamo","dovete","devono"]},
  { i:"potere",t:"irregular",a:"avere",pp:"potuto",pr:["posso","puoi","può","possiamo","potete","possono"]},
  { i:"venire",t:"irregular",a:"essere",pp:"venuto",pr:["vengo","vieni","viene","veniamo","venite","vengono"],imp:["vieni","venga","veniamo","venite","vengano"]},
  { i:"morire",t:"irregular",a:"essere",pp:"morto",pr:["muoio","muori","muore","moriamo","morite","muoiono"],imp:["muori","muoia","moriamo","morite","muoiano"]},
  { i:"tradurre",t:"irregular",a:"avere",pp:"tradotto",pr:["traduco","traduci","traduce","traduciamo","traducete","traducono"],imf:["traducevo","traducevi","traduceva","traducevamo","traducevate","traducevano"],imp:["traduci","traduca","traduciamo","traducete","traducano"]},
  { i:"rimanere",t:"irregular",a:"essere",pp:"rimasto",pr:["rimango","rimani","rimane","rimaniamo","rimanete","rimangono"],imp:["rimani","rimanga","rimaniamo","rimanete","rimangano"]},
  { i:"spegnere",t:"irregular",a:"avere",pp:"spento",pr:["spengo","spegni","spegne","spegniamo","spegnete","spengono"],imp:["spegni","spenga","spegniamo","spegnete","spengano"]},
  { i:"cuocere",t:"irregular",a:"avere",pp:"cotto",pr:["cuocio","cuoci","cuoce","cuociamo","cuocete","cuociono"],imp:["cuoci","cuocia","cuociamo","cuocete","cuociano"]},
  { i:"porre",t:"irregular",a:"avere",pp:"posto",pr:["pongo","poni","pone","poniamo","ponete","pongono"],imp:["poni","ponga","poniamo","ponete","pongano"]},
  { i:"comporre",t:"irregular",a:"avere",pp:"composto",pr:["compongo","componi","compone","componiamo","componete","compongono"],imp:["componi","componga","componiamo","componete","compongano"]},
  { i:"proporre",t:"irregular",a:"avere",pp:"proposto",pr:["propongo","proponi","propone","proponiamo","proponete","propongono"],imp:["proponi","proponga","proponiamo","proponete","propongano"]},
  { i:"disporre",t:"irregular",a:"avere",pp:"disposto",pr:["dispongo","disponi","dispone","disponiamo","disponete","dispongono"],imp:["disponi","disponga","disponiamo","disponete","dispongano"]},
  { i:"salire",t:"irregular",a:"essere",pp:"salito",pr:["salgo","sali","sale","saliamo","salite","salgono"],imp:["sali","salga","saliamo","salite","salgano"]},
  { i:"uscire",t:"irregular",a:"essere",pp:"uscito",pr:["esco","esci","esce","usciamo","uscite","escono"],imp:["esci","esca","usciamo","uscite","escano"]},
  { i:"scegliere",t:"irregular",a:"avere",pp:"scelto",pr:["scelgo","scegli","sceglie","scegliamo","scegliete","scelgono"],imp:["scegli","scelga","scegliamo","scegliete","scelgano"]},
  { i:"togliere",t:"irregular",a:"avere",pp:"tolto",pr:["tolgo","togli","toglie","togliamo","togliete","tolgono"],imp:["togli","tolga","togliamo","togliete","tolgano"]},
  { i:"leggere",t:"ere",a:"avere",pp:"letto"},{ i:"correggere",t:"ere",a:"avere",pp:"corretto"},{ i:"scrivere",t:"ere",a:"avere",pp:"scritto"},
  { i:"friggere",t:"ere",a:"avere",pp:"fritto"},{ i:"rompere",t:"ere",a:"avere",pp:"rotto"},{ i:"piangere",t:"ere",a:"avere",pp:"pianto"},
  { i:"spingere",t:"ere",a:"avere",pp:"spinto"},{ i:"vincere",t:"ere",a:"avere",pp:"vinto"},{ i:"aggiungere",t:"ere",a:"avere",pp:"aggiunto"},
  { i:"dipingere",t:"ere",a:"avere",pp:"dipinto"},{ i:"assumere",t:"ere",a:"avere",pp:"assunto"},{ i:"prendere",t:"ere",a:"avere",pp:"preso"},
  { i:"rendere",t:"ere",a:"avere",pp:"reso"},{ i:"accendere",t:"ere",a:"avere",pp:"acceso"},{ i:"spendere",t:"ere",a:"avere",pp:"speso"},
  { i:"scendere",t:"ere",a:"essere",pp:"sceso"},{ i:"offendere",t:"ere",a:"avere",pp:"offeso"},{ i:"decidere",t:"ere",a:"avere",pp:"deciso"},
  { i:"uccidere",t:"ere",a:"avere",pp:"ucciso"},{ i:"ridere",t:"ere",a:"avere",pp:"riso"},{ i:"dividere",t:"ere",a:"avere",pp:"diviso"},
  { i:"chiudere",t:"ere",a:"avere",pp:"chiuso"},{ i:"concludere",t:"ere",a:"avere",pp:"concluso"},{ i:"diffondere",t:"ere",a:"avere",pp:"diffuso"},
  { i:"chiedere",t:"ere",a:"avere",pp:"chiesto"},{ i:"rispondere",t:"ere",a:"avere",pp:"risposto"},{ i:"vedere",t:"ere",a:"avere",pp:"visto"},
  { i:"perdere",t:"ere",a:"avere",pp:"perso"},{ i:"correre",t:"ere",a:"avere",pp:"corso"},{ i:"mettere",t:"ere",a:"avere",pp:"messo"},
  { i:"succedere",t:"ere",a:"essere",pp:"successo"},{ i:"permettere",t:"ere",a:"avere",pp:"permesso"},{ i:"esprimere",t:"ere",a:"avere",pp:"espresso"},
  { i:"muovere",t:"ere",a:"avere",pp:"mosso"},{ i:"discutere",t:"ere",a:"avere",pp:"discusso"},{ i:"vivere",t:"ere",a:"avere",pp:"vissuto"},
  { i:"nascere",t:"ere",a:"essere",pp:"nato"},{ i:"conoscere",t:"ere",a:"avere",pp:"conosciuto"},{ i:"crescere",t:"ere",a:"essere",pp:"cresciuto"},
  { i:"piovere",t:"ere",a:"essere",pp:"piovuto",note:"solo 3a pers"},
  { i:"aprire",t:"ire",a:"avere",pp:"aperto"},{ i:"offrire",t:"ire",a:"avere",pp:"offerto"},{ i:"soffrire",t:"ire",a:"avere",pp:"sofferto"},
  { i:"coprire",t:"ire",a:"avere",pp:"coperto"},{ i:"scoprire",t:"ire",a:"avere",pp:"scoperto"},
  { i:"accorgersi",t:"ire",a:"essere",pp:"accorto",reflexive:true,pr:["mi accorgo","ti accorgi","si accorge","ci accorgiamo","vi accorgete","si accorgono"]},
  { i:"alzarsi",t:"are",a:"essere",pp:"alzato",reflexive:true},{ i:"lavarsi",t:"are",a:"essere",pp:"lavato",reflexive:true},
  { i:"chiamarsi",t:"are",a:"essere",pp:"chiamato",reflexive:true},{ i:"fermarsi",t:"are",a:"essere",pp:"fermato",reflexive:true},
  { i:"prepararsi",t:"are",a:"essere",pp:"preparato",reflexive:true},{ i:"rilassarsi",t:"are",a:"essere",pp:"rilassato",reflexive:true},
  { i:"annoiarsi",t:"are",a:"essere",pp:"annoiato",reflexive:true},{ i:"allenarsi",t:"are",a:"essere",pp:"allenato",reflexive:true},
  { i:"parlare",t:"are",a:"avere",pp:"parlato"},{ i:"mangiare",t:"are",a:"avere",pp:"mangiato"},{ i:"studiare",t:"are",a:"avere",pp:"studiato"},
  { i:"lavorare",t:"are",a:"avere",pp:"lavorato"},{ i:"comprare",t:"are",a:"avere",pp:"comprato"},{ i:"abitare",t:"are",a:"avere",pp:"abitato"},
  { i:"cantare",t:"are",a:"avere",pp:"cantato"},{ i:"ballare",t:"are",a:"avere",pp:"ballato"},{ i:"giocare",t:"are",a:"avere",pp:"giocato"},
  { i:"pagare",t:"are",a:"avere",pp:"pagato"},{ i:"spiegare",t:"are",a:"avere",pp:"spiegato"},{ i:"aspettare",t:"are",a:"avere",pp:"aspettato"},
  { i:"incontrare",t:"are",a:"avere",pp:"incontrato"},{ i:"pensare",t:"are",a:"avere",pp:"pensato"},{ i:"trovare",t:"are",a:"avere",pp:"trovato"},
  { i:"cercare",t:"are",a:"avere",pp:"cercato"},{ i:"imparare",t:"are",a:"avere",pp:"imparato"},{ i:"insegnare",t:"are",a:"avere",pp:"insegnato"},
  { i:"lasciare",t:"are",a:"avere",pp:"lasciato"},{ i:"sognare",t:"are",a:"avere",pp:"sognato"},{ i:"desiderare",t:"are",a:"avere",pp:"desiderato"},
  { i:"preparare",t:"are",a:"avere",pp:"preparato"},{ i:"guidare",t:"are",a:"avere",pp:"guidato"},{ i:"ordinare",t:"are",a:"avere",pp:"ordinato"},
  { i:"cucinare",t:"are",a:"avere",pp:"cucinato"},{ i:"cominciare",t:"are",a:"avere",pp:"cominciato"},{ i:"dimenticare",t:"are",a:"avere",pp:"dimenticato"},
  { i:"viaggiare",t:"are",a:"avere",pp:"viaggiato"},
  { i:"credere",t:"ere",a:"avere",pp:"creduto"},{ i:"ricevere",t:"ere",a:"avere",pp:"ricevuto"},{ i:"ripetere",t:"ere",a:"avere",pp:"ripetuto"},
  { i:"vendere",t:"ere",a:"avere",pp:"venduto"},{ i:"battere",t:"ere",a:"avere",pp:"battuto"},{ i:"temere",t:"ere",a:"avere",pp:"temuto"},
  { i:"godere",t:"ere",a:"avere",pp:"goduto"},{ i:"dipendere",t:"ere",a:"avere",pp:"dipeso"},{ i:"assistere",t:"ere",a:"avere",pp:"assistito"},
  { i:"resistere",t:"ere",a:"avere",pp:"resistito"},{ i:"possedere",t:"ere",a:"avere",pp:"posseduto"},{ i:"cadere",t:"ere",a:"essere",pp:"caduto"},
  { i:"dormire",t:"ire",a:"avere",pp:"dormito"},{ i:"partire",t:"ire",a:"essere",pp:"partito"},{ i:"sentire",t:"ire",a:"avere",pp:"sentito"},
  { i:"seguire",t:"ire",a:"avere",pp:"seguito"},{ i:"servire",t:"ire",a:"avere",pp:"servito"},{ i:"vestire",t:"ire",a:"avere",pp:"vestito"},
  { i:"divertire",t:"ire",a:"avere",pp:"divertito"},{ i:"bollire",t:"ire",a:"avere",pp:"bollito"},{ i:"cucire",t:"ire",a:"avere",pp:"cucito"},
  { i:"finire",t:"ire-isc",a:"avere",pp:"finito"},{ i:"capire",t:"ire-isc",a:"avere",pp:"capito"},{ i:"pulire",t:"ire-isc",a:"avere",pp:"pulito"},
  { i:"preferire",t:"ire-isc",a:"avere",pp:"preferito"},{ i:"spedire",t:"ire-isc",a:"avere",pp:"spedito"},{ i:"costruire",t:"ire-isc",a:"avere",pp:"costruito"},
  { i:"fornire",t:"ire-isc",a:"avere",pp:"fornito"},{ i:"suggerire",t:"ire-isc",a:"avere",pp:"suggerito"},{ i:"colpire",t:"ire-isc",a:"avere",pp:"colpito"},
];

function findVerb(infinitive) { return VERBS.find(v => v.i === infinitive); }

// ============================================================
// 变位引擎
// ============================================================
const PERSONS = [{ id:"io",label:"io",num:"s",person:1 },{ id:"tu",label:"tu",num:"s",person:2 },{ id:"lui",label:"lui/lei",num:"s",person:3 },{ id:"noi",label:"noi",num:"p",person:1 },{ id:"voi",label:"voi",num:"p",person:2 },{ id:"loro",label:"loro",num:"p",person:3 }];
const TENSES = [{ id:"presente",label:"Indicativo Presente" },{ id:"passato_prossimo",label:"Passato Prossimo" },{ id:"imperfetto",label:"Imperfetto" },{ id:"imperativo",label:"Imperativo" }];
const REFLEXIVE_PRONS = ["mi", "ti", "si", "ci", "vi", "si"];

function stem(it) {
  if (it.endsWith("arsi")) return it.slice(0,-4); if (it.endsWith("ersi")) return it.slice(0,-4); if (it.endsWith("irsi")) return it.slice(0,-4);
  if (it.endsWith("are")) return it.slice(0,-3); if (it.endsWith("ere")) return it.slice(0,-3); if (it.endsWith("ire")) return it.slice(0,-3);
  if (it.endsWith("urre")) return it.slice(0,-3); if (it.endsWith("porre")) return it.slice(0,-5); return it;
}

function conjugate(verb, tenseId, personId, gender) {
  gender = gender || "m";
  if (tenseId === "presente" && verb.pr) {
    const idx = PERSONS.findIndex(p => p.id === personId);
    if (idx >= 0 && verb.pr[idx]) return verb.pr[idx];
  }
  if (tenseId === "imperfetto" && verb.imf) {
    const idx = PERSONS.findIndex(p => p.id === personId);
    if (idx >= 0 && verb.imf[idx]) return verb.imf[idx];
  }
  if (tenseId === "presente" && verb.reflexive) {
    if (verb.pr) { const idx = PERSONS.findIndex(p => p.id === personId); if (idx >= 0 && verb.pr[idx]) return verb.pr[idx]; }
    const form = conjugate({ ...verb, reflexive: false }, tenseId, personId, gender);
    return REFLEXIVE_PRONS[PERSONS.findIndex(p => p.id === personId)] + " " + form;
  }
  if (tenseId === "imperativo" && verb.imp) {
    const idx = PERSONS.findIndex(p => p.id === personId); const impIdx = idx - 1;
    if (impIdx >= 0 && verb.imp[impIdx]) return verb.imp[impIdx];
  }
  const type = verb.t; const pIdx = PERSONS.findIndex(p => p.id === personId); if (pIdx === -1) return verb.i;
  switch (tenseId) {
    case "presente": {
      let s = stem(verb.i);
      if (type === "are") {
        const e = ["o","i","a","iamo","ate","ano"];
        if (verb.i.endsWith("care")||verb.i.endsWith("gare")) { if(pIdx===1) e[1]="hi"; }
        if (verb.i.endsWith("ciare")||verb.i.endsWith("giare")) { if(pIdx===1) e[1]=""; }
        return s + e[pIdx];
      }
      if (type === "ere") return s + ["o","i","e","iamo","ete","ono"][pIdx];
      if (type === "ire") return s + ["o","i","e","iamo","ite","ono"][pIdx];
      if (type === "ire-isc") return [0,1,2,5].includes(pIdx) ? s + ["isco","isci","isce","iamo","ite","iscono"][pIdx] : s + ["o","i","e","iamo","ite","ono"][pIdx];
      return verb.i;
    }
    case "passato_prossimo": {
      const aux = verb.a || "avere";
      const auxForms = { "avere":["ho","hai","ha","abbiamo","avete","hanno"], "essere":["sono","sei","è","siamo","siete","sono"] };
      let a = (auxForms[aux]||auxForms["avere"])[pIdx];
      let p = verb.reflexive ? REFLEXIVE_PRONS[pIdx] + " " : "";
      let pp = verb.pp || "";
      if (!pp) { if(type==="are") pp=stem(verb.i)+"ato"; else if(type==="ere") pp=stem(verb.i)+"uto"; else if(type==="ire"||type==="ire-isc") pp=stem(verb.i)+"ito"; else pp=verb.i; }
      if (aux==="essere") { if(pIdx<=2) pp=pp.slice(0,-1)+(gender==="f"?"a":"o"); else pp=pp.slice(0,-1)+(gender==="f"?"e":"i"); }
      return p + a + " " + pp;
    }
    case "imperfetto": {
      if (verb.imf) { let f = verb.imf[pIdx]||stem(verb.i); if(verb.reflexive) f=REFLEXIVE_PRONS[pIdx]+" "+f; return f; }
      let s = verb.i.endsWith("urre")?verb.i.slice(0,-3):verb.i.endsWith("porre")?verb.i.slice(0,-5)+"pon":stem(verb.i);
      const px = verb.reflexive ? REFLEXIVE_PRONS[pIdx] + " " : "";
      if (type==="are"||(type==="irregular"&&verb.i.endsWith("are"))) return px+s+["avo","avi","ava","avamo","avate","avano"][pIdx];
      if (type==="ere"||type==="irregular") return px+s+["evo","evi","eva","evamo","evate","evano"][pIdx];
      if (type==="ire"||type==="ire-isc") return px+s+["ivo","ivi","iva","ivamo","ivate","ivano"][pIdx];
      return s+"eva";
    }
    case "imperativo": {
      if (personId==="io") return "(—)";
      if (verb.imp) { const idx=PERSONS.findIndex(p=>p.id===personId); const impIdx=idx-1; if(impIdx>=0&&verb.imp[impIdx]) return verb.imp[impIdx]; }
      const s=verb.i.endsWith("urre")?verb.i.slice(0,-3):verb.i.endsWith("porre")?verb.i.slice(0,-5)+"pon":stem(verb.i);
      if(pIdx===0) return "(—)"; let base="";
      if(type==="are"){if(pIdx===1)base=s+"a";else if(pIdx===2)base=s+"i";else if(pIdx===3)base=s+"iamo";else if(pIdx===4)base=s+"ate";else if(pIdx===5)base=s+"ino";}
      else if(type==="ere"){if(pIdx===1)base=s+"i";else if(pIdx===2)base=s+"a";else if(pIdx===3)base=s+"iamo";else if(pIdx===4)base=s+"ete";else if(pIdx===5)base=s+"ano";}
      else if(type==="ire"){if(pIdx===1)base=s+"i";else if(pIdx===2)base=s+"a";else if(pIdx===3)base=s+"iamo";else if(pIdx===4)base=s+"ite";else if(pIdx===5)base=s+"ano";}
      else if(type==="ire-isc"){if(pIdx===1)base=s+"isci";else if(pIdx===2)base=s+"isca";else if(pIdx===3)base=s+"iamo";else if(pIdx===4)base=s+"ite";else if(pIdx===5)base=s+"iscano";}
      else { base=conjugate({...verb,reflexive:false},"presente",personId,gender); }
      if(verb.reflexive){if(pIdx===1)return base+"ti";if(pIdx===2)return"si "+base;if(pIdx===3)return s+"iamoci";if(pIdx===4)return base+"vi";if(pIdx===5)return"si "+base;}
      return base;
    }
    default: return verb.i;
  }
}

function isIrregular(v) { return v.t==="irregular"||v.imf||v.imp||(v.t==="ere"&&v.pp&&!v.pp.endsWith("uto"))||((v.t==="ire"||v.t==="ire-isc")&&v.pp&&!v.pp.endsWith("ito")); }

function generateQuestion(opts={}) {
  const tl=["presente","passato_prossimo","imperfetto","imperativo"];
  let v; if(opts.verb) { v=opts.verb; } else {
    let p=[...VERBS]; if(opts.verbType==="irregular") p=p.filter(x=>isIrregular(x)); else if(opts.verbType==="regular") p=p.filter(x=>!isIrregular(x));
    if(p.length===0) p=[...VERBS]; v=p[Math.floor(Math.random()*p.length)];
  }
  const t=opts.tense||tl[Math.floor(Math.random()*tl.length)];
  let ep=PERSONS; if(t==="imperativo") ep=PERSONS.filter(p=>p.id!=="io");
  const person=ep[Math.floor(Math.random()*ep.length)], gender=Math.random()<0.5?"m":"f";
  const answer=conjugate(v,t,person.id,gender), label=TENSES.find(x=>x.id===t).label;
  return { verb:v, tenseId:t, tenseLabel:label, person, gender, answer };
}

// ============================================================
// Workers 入口
// ============================================================
function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return { 'Access-Control-Allow-Origin': allowed,'Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'86400','Content-Type':'application/json' };
}

function j(data, status=200, origin) { return new Response(JSON.stringify(data), { status, headers: corsHeaders(origin) }); }
function e(msg, status=400, origin) { return j({ error: msg }, status, origin); }

function getUserId(req) {
  try { const a=req.headers.get('Authorization'); if(!a||!a.startsWith('Bearer ')) return null; return jwt.verify(a.slice(7), JWT_SECRET).userId; } catch { return null; }
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), path = url.pathname, method = req.method, origin = req.headers.get('Origin')||'';
    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

    try {
      const body = ['POST'].includes(method) ? await req.json().catch(()=>({})) : {};

      if (path==='/api/health'&&method==='GET') return j({status:'ok',time:new Date().toISOString()});

      if (path==='/api/practice/question'&&method==='POST') {
        const q=generateQuestion({tense:body.tense||undefined,verbType:body.verbType||'all'});
        return j({verbInfinitive:q.verb.i,tenseId:q.tenseId,tenseLabel:q.tenseLabel,person:q.person,gender:q.gender,answer:q.answer});
      }

      if (path==='/api/practice/check'&&method==='POST') {
        const {verbInfinitive,tenseId,personId,gender,userAnswer}=body;
        if(!verbInfinitive||!tenseId||!personId||userAnswer===undefined) return e('参数不完整');
        const verb=findVerb(verbInfinitive); if(!verb) return e('找不到该动词',404);
        const ca=conjugate(verb,tenseId,personId,gender);
        return j({isCorrect:String(userAnswer).trim().toLowerCase()===ca.trim().toLowerCase(),correctAnswer:ca});
      }

      if (path==='/api/auth/register'&&method==='POST') {
        const {email,password,name}=body;
        if(!email||!password) return e('邮箱和密码不能为空');
        if(password.length<4) return e('密码至少 4 位');
        const existing=await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first();
        if(existing) return e('该邮箱已注册',409);
        const id=crypto.randomUUID();
        const {default:bcrypt}=await import('bcryptjs');
        const hashed=await bcrypt.hash(password,10);
        await env.DB.prepare('INSERT INTO users(id,email,password,name)VALUES(?,?,?,?)').bind(id,email,hashed,name||'').run();
        const {default:jwt_}=await import('jsonwebtoken');
        const token=jwt_.sign({userId:id},JWT_SECRET,{expiresIn:'30d'});
        return j({token,user:{id,email,name:name||''}},201);
      }

      if (path==='/api/auth/login'&&method==='POST') {
        const {email,password}=body;
        if(!email||!password) return e('邮箱和密码不能为空');
        const user=await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
        if(!user) return e('邮箱或密码错误',401);
        const {default:bcrypt}=await import('bcryptjs');
        const valid=await bcrypt.compare(password,user.password);
        if(!valid) return e('邮箱或密码错误',401);
        const {default:jwt_}=await import('jsonwebtoken');
        const token=jwt_.sign({userId:user.id},JWT_SECRET,{expiresIn:'30d'});
        return j({token,user:{id:user.id,email:user.email,name:user.name}});
      }

      if (path==='/api/auth/me'&&method==='GET') {
        const uid=getUserId(req); if(!uid) return e('未登录',401);
        const user=await env.DB.prepare('SELECT id,email,name,created_at FROM users WHERE id=?').bind(uid).first();
        if(!user) return e('用户不存在',401); return j({user});
      }

      if (path==='/api/errors'&&method==='GET') {
        const uid=getUserId(req); if(!uid) return j([]);
        const {results}=await env.DB.prepare('SELECT * FROM errors WHERE user_id=? ORDER BY created_at DESC').bind(uid).all();
        return j(results||[]);
      }

      if (path==='/api/errors'&&method==='POST') {
        const uid=getUserId(req); if(!uid) return e('请先登录',401);
        const {verbInfinitive,tenseId,tenseLabel,personId,personLabel,gender,userAnswer,correctAnswer}=body;
        if(!verbInfinitive||!tenseId||!personId||!userAnswer||!correctAnswer) return e('参数不完整');
        const id=crypto.randomUUID();
        await env.DB.prepare('INSERT INTO errors(id,user_id,verb_infinitive,tense_id,tense_label,person_id,person_label,gender,user_answer,correct_answer)VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,uid,verbInfinitive,tenseId,tenseLabel,personId,personLabel,gender||'m',userAnswer,correctAnswer).run();
        return j({id},201);
      }

      if (path.match(/^\/api\/errors\/[\w-]+$/)&&method==='DELETE') {
        const uid=getUserId(req); if(!uid) return e('请先登录',401);
        await env.DB.prepare('DELETE FROM errors WHERE id=? AND user_id=?').bind(path.split('/').pop(),uid).run();
        return j({ok:true});
      }

      if (path==='/api/errors'&&method==='DELETE') {
        const uid=getUserId(req); if(!uid) return e('请先登录',401);
        await env.DB.prepare('DELETE FROM errors WHERE user_id=?').bind(uid).run();
        return j({ok:true});
      }

      return j({error:'Not found'},404);
    } catch(err) { console.error('Worker error:',err); return j({error:'服务器内部错误'},500); }
  }
};
