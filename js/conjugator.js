// ============================================================
// 意大利语动词变位引擎
// 支持的时态/语式: indicativo presente, passato prossimo, imperfetto, imperativo
// ============================================================

// --- 人称代词 ---
const PERSONS = [
  { id:"io",    label:"io",      num:"s", person:1 },
  { id:"tu",    label:"tu",      num:"s", person:2 },
  { id:"lui",   label:"lui/lei", num:"s", person:3 },
  { id:"noi",   label:"noi",     num:"p", person:1 },
  { id:"voi",   label:"voi",     num:"p", person:2 },
  { id:"loro",  label:"loro",    num:"p", person:3 }
];

// --- 时态列表（题目使用）---
const TENSES = [
  { id:"presente",      label:"Indicativo Presente" },
  { id:"passato_prossimo", label:"Passato Prossimo" },
  { id:"imperfetto",    label:"Imperfetto" },
  { id:"imperativo",    label:"Imperativo" }
];

// --- 提取词干（支持自反动词）---
function stem(it) {
  // 自反动词词干：-arsi → -a, -ersi → -e, -irsi → -i
  if (it.endsWith("arsi")) return it.slice(0, -4);   // alzarsi → alz
  if (it.endsWith("ersi")) return it.slice(0, -4);   // sedersi → sed
  if (it.endsWith("irsi")) return it.slice(0, -4);   // vestirsi → vest
  if (it.endsWith("are")) return it.slice(0, -3);
  if (it.endsWith("ere")) return it.slice(0, -3);
  if (it.endsWith("ire")) return it.slice(0, -3);
  if (it.endsWith("urre")) return it.slice(0, -3); // tradurre
  if (it.endsWith("porre")) return it.slice(0, -5); // comporre etc
  return it;
}

// --- 自反代词 ---
const REFLEXIVE_PRONS = ["mi", "ti", "si", "ci", "vi", "si"];

// ============================================
// 主函数: conjugate(verb, tenseId, personId, gender?)
// ============================================
function conjugate(verb, tenseId, personId, gender) {
  gender = gender || "m";

  // 优先返回存储的自定义形式
  if (tenseId === "presente" && verb.pr) {
    const idx = PERSONS.findIndex(p => p.id === personId);
    if (idx >= 0 && verb.pr[idx]) return verb.pr[idx];
  }
  if (tenseId === "imperfetto" && verb.imf) {
    const idx = PERSONS.findIndex(p => p.id === personId);
    if (idx >= 0 && verb.imf[idx]) return verb.imf[idx];
  }
  if (tenseId === "imperativo" && verb.imp) {
    const idx = PERSONS.findIndex(p => p.id === personId);
    const impIdx = idx - 1; // imp 数组没有 io
    if (impIdx >= 0 && verb.imp[impIdx]) return verb.imp[impIdx];
  }
  // 自反动词 presente 统一处理（无存储 pr 时自动计算）
  if (tenseId === "presente" && verb.reflexive) {
    if (verb.pr) {
      const idx = PERSONS.findIndex(p => p.id === personId);
      if (idx >= 0 && verb.pr[idx]) return verb.pr[idx];
    }
    // 自动计算：先算变位，再加代词
    const form = conjugate({ ...verb, reflexive: false }, tenseId, personId, gender);
    const pIdx = PERSONS.findIndex(p => p.id === personId);
    return REFLEXIVE_PRONS[pIdx] + " " + form;
  }

  const type = verb.t;
  const pIdx = PERSONS.findIndex(p => p.id === personId);
  const isPlural = PERSONS[pIdx].num === "p";
  const persNum = PERSONS[pIdx].person;

  switch (tenseId) {

    // ----- Presente -----
    case "presente": {
      let s = stem(verb.i);
      if (type === "are") {
        // 处理 -care/-gare → tu aggiungi h; -ciare/-giare → togli i
        const endings = ["o","i","a","iamo","ate","ano"];
        if (verb.i.endsWith("care") || verb.i.endsWith("gare")) {
          if (pIdx === 1) endings[1] = "hi";
        }
        if (verb.i.endsWith("ciare") || verb.i.endsWith("giare")) {
          // mangi + i = mangii → mangi
          if (pIdx === 1) endings[1] = "";
        }
        return s + endings[pIdx];
      }
      if (type === "ere") {
        const endings = ["o","i","e","iamo","ete","ono"];
        return s + endings[pIdx];
      }
      if (type === "ire") {
        const endings = ["o","i","e","iamo","ite","ono"];
        return s + endings[pIdx];
      }
      if (type === "ire-isc") {
        const iscPersons = [0, 1, 2, 5]; // io, tu, lui, loro → -isc-
        if (iscPersons.includes(pIdx)) {
          const endings = ["isco","isci","isce","iamo","ite","iscono"];
          return s + endings[pIdx];
        } else {
          const endings = ["o","i","e","iamo","ite","ono"];
          return s + endings[pIdx];
        }
      }
      return verb.i; // fallback
    }

    // ----- Passato Prossimo -----
    case "passato_prossimo": {
      const aux = verb.a || "avere";
      // 助动词现在时变位
      const auxForms = {
        "avere": ["ho","hai","ha","abbiamo","avete","hanno"],
        "essere": ["sono","sei","è","siamo","siete","sono"]
      };
      let auxForm = (auxForms[aux] || auxForms["avere"])[pIdx];

      // 自反动词：在助动词前加自反代词
      let reflexivePrefix = "";
      if (verb.reflexive) {
        reflexivePrefix = REFLEXIVE_PRONS[pIdx] + " ";
      }

      // 过去分词
      let pp = verb.pp || "";
      if (!pp) {
        // 规则过去分词
        if (type === "are") pp = stem(verb.i) + "ato";
        else if (type === "ere") pp = stem(verb.i) + "uto";
        else if (type === "ire" || type === "ire-isc") pp = stem(verb.i) + "ito";
        else pp = verb.i; // fallback
      }

      // 用 essere 时，过去分词需与主语性数一致
      if (aux === "essere") {
        if (pIdx <= 2) {
          pp = pp.slice(0, -1) + (gender === "f" ? "a" : "o");
        } else {
          pp = pp.slice(0, -1) + (gender === "f" ? "e" : "i");
        }
      }

      return reflexivePrefix + auxForm + " " + pp;
    }

    // ----- Imperfetto -----
    case "imperfetto": {
      // 先处理存储的不规则形式
      if (verb.imf) {
        const idx = PERSONS.findIndex(p => p.id === personId);
        let form = verb.imf[idx] || stem(verb.i);
        if (verb.reflexive) form = REFLEXIVE_PRONS[pIdx] + " " + form;
        return form;
      }
      let s = verb.i.endsWith("urre") ? verb.i.slice(0, -3) :
              verb.i.endsWith("porre") ? verb.i.slice(0, -5) + "pon" :
              stem(verb.i);
      if (type === "are") {
        const endings = ["avo","avi","ava","avamo","avate","avano"];
        return (verb.reflexive ? REFLEXIVE_PRONS[pIdx] + " " : "") + s + endings[pIdx];
      }
      if (type === "ere" || type === "irregular") {
        const endings = ["evo","evi","eva","evamo","evate","evano"];
        return (verb.reflexive ? REFLEXIVE_PRONS[pIdx] + " " : "") + s + endings[pIdx];
      }
      if (type === "ire" || type === "ire-isc") {
        const endings = ["ivo","ivi","iva","ivamo","ivate","ivano"];
        return (verb.reflexive ? REFLEXIVE_PRONS[pIdx] + " " : "") + s + endings[pIdx];
      }
      return s + "eva"; // fallback
    }

    // ----- Imperativo -----
    case "imperativo": {
      if (personId === "io") return "(—)";

      // 先查存储的不规则形式
      if (verb.imp) {
        const idx = PERSONS.findIndex(p => p.id === personId);
        const impIdx = idx - 1;
        if (impIdx >= 0 && verb.imp[impIdx]) return verb.imp[impIdx];
      }

      const s = verb.i.endsWith("urre") ? verb.i.slice(0, -3) :
                verb.i.endsWith("porre") ? verb.i.slice(0, -5) + "pon" :
                stem(verb.i);

      if (pIdx === 0) return "(—)";

      // 计算基本命令式形式（不含代词）
      let base = "";

      if (type === "are") {
        if (pIdx === 1) base = s + "a";
        else if (pIdx === 2) base = s + "i";
        else if (pIdx === 3) base = s + "iamo";
        else if (pIdx === 4) base = s + "ate";
        else if (pIdx === 5) base = s + "ino";
      } else if (type === "ere") {
        if (pIdx === 1) base = s + "i";
        else if (pIdx === 2) base = s + "a";
        else if (pIdx === 3) base = s + "iamo";
        else if (pIdx === 4) base = s + "ete";
        else if (pIdx === 5) base = s + "ano";
      } else if (type === "ire") {
        if (pIdx === 1) base = s + "i";
        else if (pIdx === 2) base = s + "a";
        else if (pIdx === 3) base = s + "iamo";
        else if (pIdx === 4) base = s + "ite";
        else if (pIdx === 5) base = s + "ano";
      } else if (type === "ire-isc") {
        if (pIdx === 1) base = s + "isci";
        else if (pIdx === 2) base = s + "isca";
        else if (pIdx === 3) base = s + "iamo";
        else if (pIdx === 4) base = s + "ite";
        else if (pIdx === 5) base = s + "iscano";
      } else {
        // irregular fallback
        const pr = conjugate({ ...verb, reflexive: false }, "presente", personId, gender);
        base = pr;
      }

      // 自反动词：添加代词
      if (verb.reflexive) {
        if (pIdx === 1) return base + "ti";           // tu: alza + ti = alzati
        if (pIdx === 2) return "si " + base;          // lui: si alzi
        if (pIdx === 3) return s + "iamoci";          // noi: alziamo + ci = alziamoci
        if (pIdx === 4) return base + "vi";           // voi: alzate + vi = alzatevi
        if (pIdx === 5) return "si " + base;          // loro: si alzino
      }

      return base;
    }

    default:
      return verb.i;
  }
}

// --- 判断动词是否为不规则（用于筛选）---
function isIrregular(verb) {
  // t === "irregular" 肯定是
  if (verb.t === "irregular") return true;
  // 有存储的 imf（不规则 imperfetto）也算
  if (verb.imf) return true;
  // 有存储的 imp（不规则 imperativo）也算
  if (verb.imp) return true;
  // 过去分词不规则的 -ere（有 pp 且不是规则 -uto 结尾）
  if (verb.t === "ere" && verb.pp && !verb.pp.endsWith("uto") && !verb.pp.endsWith("uto")) return true;
  // 过去分词不规则的 -ire（有 pp 且不是规则 -ito 结尾）
  if ((verb.t === "ire" || verb.t === "ire-isc") && verb.pp && !verb.pp.endsWith("ito")) return true;
  return false;
}

// --- 生成一道题目数据 ---
function generateQuestion(opts) {
  // opts: { tense?: "presente"|"passato_prossimo"|"imperfetto"|"imperativo",
  //         verb?: verbObject,
  //         verbType?: "all"|"irregular"|"regular",
  //         onlyErrors?: boolean }

  // 选择动词
  let verb;
  if (opts && opts.verb) {
    verb = opts.verb;
  } else {
    let pool = VERBS;
    if (opts && opts.verbType === "irregular") {
      pool = VERBS.filter(v => isIrregular(v));
    } else if (opts && opts.verbType === "regular") {
      pool = VERBS.filter(v => !isIrregular(v));
    }
    // 避免空池（极端情况全部被筛掉了）
    if (pool.length === 0) pool = VERBS;
    verb = pool[Math.floor(Math.random() * pool.length)];
  }

  // 选择时态
  let tenseId;
  if (opts && opts.tense) {
    tenseId = opts.tense;
  } else {
    const tenseOpt = TENSES[Math.floor(Math.random() * TENSES.length)];
    tenseId = tenseOpt.id;
  }

  // 选择人称 (imperativo 排除 io)
  let eligiblePersons = PERSONS;
  if (tenseId === "imperativo") {
    eligiblePersons = PERSONS.filter(p => p.id !== "io");
  }
  const person = eligiblePersons[Math.floor(Math.random() * eligiblePersons.length)];

  // 随机性别 (仅 passato prossimo 用 essere 时需要)
  const gender = Math.random() < 0.5 ? "m" : "f";

  const answer = conjugate(verb, tenseId, person.id, gender);

  const tenseLabel = TENSES.find(t => t.id === tenseId).label;

  return {
    verb: verb,
    tenseId: tenseId,
    tenseLabel: tenseLabel,
    person: person,
    gender: gender,
    answer: answer
  };
}
