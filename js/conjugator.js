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

// --- 提取词干 ---
function stem(it) {
  if (it.endsWith("are")) return it.slice(0, -3);
  if (it.endsWith("ere")) return it.slice(0, -3);
  if (it.endsWith("ire")) return it.slice(0, -3);
  if (it.endsWith("urre")) return it.slice(0, -3); // tradurre
  if (it.endsWith("porre")) return it.slice(0, -5); // comporre etc
  if (it.endsWith("urre")) return it.slice(0, -3);
  if (it.endsWith("urre")) return it.slice(0, -3);
  return it;
}

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
  // 自反动词 presente 统一处理
  if (tenseId === "presente" && verb.reflexive) {
    const s = verb.pr ? verb.pr[PERSONS.findIndex(p => p.id === personId)] : null;
    if (s) return s;
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
          // 单数: io/tu/lui → gender
          pp = pp.slice(0, -1) + (gender === "f" ? "a" : "o");
        } else if (pIdx === 3) {
          // noi: 默认用复数性
          pp = pp.slice(0, -1) + (gender === "f" ? "e" : "i");
        } else if (pIdx === 4) {
          // voi: 默认用复数
          pp = pp.slice(0, -1) + (gender === "f" ? "e" : "i");
        } else {
          // loro
          pp = pp.slice(0, -1) + (gender === "f" ? "e" : "i");
        }
      }

      return auxForm + " " + pp;
    }

    // ----- Imperfetto -----
    case "imperfetto": {
      // 只有 essere 在 imf 中有特殊形式，已在 verb.imf 中处理
      let s = verb.i.endsWith("urre") ? verb.i.slice(0, -3) :
              verb.i.endsWith("porre") ? verb.i.slice(0, -5) + "pon" :
              stem(verb.i);
      if (type === "are") {
        const endings = ["avo","avi","ava","avamo","avate","avano"];
        return s + endings[pIdx];
      }
      if (type === "ere" || type === "irregular") {
        const endings = ["evo","evi","eva","evamo","evate","evano"];
        return s + endings[pIdx];
      }
      if (type === "ire" || type === "ire-isc") {
        const endings = ["ivo","ivi","iva","ivamo","ivate","ivano"];
        return s + endings[pIdx];
      }
      return s + "eva"; // fallback
    }

    // ----- Imperativo -----
    case "imperativo": {
      // Imperativo 只有 tu/lui/noi/voi/loro 五种形式，但同一人称系统
      // 对于 io 或不存在的人称，标记为不可用
      if (personId === "io") return "(—)";

      // 先查存储的不规则形式
      // 注意: imp 数组索引 = [tu, lui, noi, voi, loro], 而 PERSONS 索引 = [io, tu, lui, noi, voi, loro]
      // 所以 imp 索引 = PERSONS 索引 - 1
      if (verb.imp) {
        const idx = PERSONS.findIndex(p => p.id === personId);
        const impIdx = idx - 1; // imp 数组没有 io
        if (impIdx >= 0 && verb.imp[impIdx]) return verb.imp[impIdx];
      }

      const s = verb.i.endsWith("urre") ? verb.i.slice(0, -3) :
                verb.i.endsWith("porre") ? verb.i.slice(0, -5) + "pon" :
                stem(verb.i);

      // Lei (3a s): 用 congiuntivo presente
      // Noi (1a p): 同 presente
      // Voi (2a p): 同 presente
      // Loro (3a p): 用 congiuntivo presente

      if (pIdx === 0) return "(—)"; // io 无命令式

      if (type === "are") {
        if (pIdx === 1) return s + "a";       // tu
        if (pIdx === 2) return s + "i";       // lui (Lei)
        if (pIdx === 3) return s + "iamo";    // noi
        if (pIdx === 4) return s + "ate";     // voi
        if (pIdx === 5) return s + "ino";     // loro
      }
      if (type === "ere") {
        if (pIdx === 1) return s + "i";       // tu
        if (pIdx === 2) return s + "a";       // lui
        if (pIdx === 3) return s + "iamo";    // noi
        if (pIdx === 4) return s + "ete";     // voi
        if (pIdx === 5) return s + "ano";     // loro
      }
      if (type === "ire") {
        if (pIdx === 1) return s + "i";       // tu
        if (pIdx === 2) return s + "a";       // lui
        if (pIdx === 3) return s + "iamo";    // noi
        if (pIdx === 4) return s + "ite";     // voi
        if (pIdx === 5) return s + "ano";     // loro
      }
      if (type === "ire-isc") {
        if (pIdx === 1) return s + "isci";    // tu
        if (pIdx === 2) return s + "isca";    // lui
        if (pIdx === 3) return s + "iamo";    // noi
        if (pIdx === 4) return s + "ite";     // voi
        if (pIdx === 5) return s + "iscano";  // loro
      }
      // irregular fallback - 用 presente
      const pr = conjugate(verb, "presente", personId, gender);
      return pr;
    }

    default:
      return verb.i;
  }
}

// --- 生成一道题目数据 ---
function generateQuestion(opts) {
  // opts: { tense?: "presente"|"passato_prossimo"|"imperfetto"|"imperativo",
  //         verb?: verbObject,
  //         onlyErrors?: boolean }
  
  // 选择动词
  let verb;
  if (opts && opts.verb) {
    verb = opts.verb;
  } else {
    verb = VERBS[Math.floor(Math.random() * VERBS.length)];
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
