// 意大利语动词变位引擎（后端 ES module）

import { VERBS } from './verbs.js';

const PERSONS = [
  { id:"io",    label:"io",      num:"s", person:1 },
  { id:"tu",    label:"tu",      num:"s", person:2 },
  { id:"lui",   label:"lui/lei", num:"s", person:3 },
  { id:"noi",   label:"noi",     num:"p", person:1 },
  { id:"voi",   label:"voi",     num:"p", person:2 },
  { id:"loro",  label:"loro",    num:"p", person:3 }
];

const TENSES = [
  { id:"presente",        label:"Indicativo Presente" },
  { id:"passato_prossimo",label:"Passato Prossimo" },
  { id:"imperfetto",      label:"Imperfetto" },
  { id:"imperativo",      label:"Imperativo" }
];

const REFLEXIVE_PRONS = ["mi", "ti", "si", "ci", "vi", "si"];

function stem(it) {
  if (it.endsWith("arsi")) return it.slice(0, -4);
  if (it.endsWith("ersi")) return it.slice(0, -4);
  if (it.endsWith("irsi")) return it.slice(0, -4);
  if (it.endsWith("are")) return it.slice(0, -3);
  if (it.endsWith("ere")) return it.slice(0, -3);
  if (it.endsWith("ire")) return it.slice(0, -3);
  if (it.endsWith("urre")) return it.slice(0, -3);
  if (it.endsWith("porre")) return it.slice(0, -5);
  return it;
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
    if (verb.pr) {
      const idx = PERSONS.findIndex(p => p.id === personId);
      if (idx >= 0 && verb.pr[idx]) return verb.pr[idx];
    }
    const form = conjugate({ ...verb, reflexive: false }, tenseId, personId, gender);
    const pIdx = PERSONS.findIndex(p => p.id === personId);
    return REFLEXIVE_PRONS[pIdx] + " " + form;
  }

  if (tenseId === "imperativo" && verb.imp) {
    const idx = PERSONS.findIndex(p => p.id === personId);
    const impIdx = idx - 1;
    if (impIdx >= 0 && verb.imp[impIdx]) return verb.imp[impIdx];
  }

  const type = verb.t;
  const pIdx = PERSONS.findIndex(p => p.id === personId);
  if (pIdx === -1) return verb.i;

  switch (tenseId) {

    case "presente": {
      let s = stem(verb.i);
      if (type === "are") {
        const endings = ["o","i","a","iamo","ate","ano"];
        if (verb.i.endsWith("care") || verb.i.endsWith("gare")) {
          if (pIdx === 1) endings[1] = "hi";
        }
        if (verb.i.endsWith("ciare") || verb.i.endsWith("giare")) {
          if (pIdx === 1) endings[1] = "";
        }
        return s + endings[pIdx];
      }
      if (type === "ere") return s + ["o","i","e","iamo","ete","ono"][pIdx];
      if (type === "ire") return s + ["o","i","e","iamo","ite","ono"][pIdx];
      if (type === "ire-isc") {
        return [0,1,2,5].includes(pIdx)
          ? s + ["isco","isci","isce","iamo","ite","iscono"][pIdx]
          : s + ["o","i","e","iamo","ite","ono"][pIdx];
      }
      return verb.i;
    }

    case "passato_prossimo": {
      const aux = verb.a || "avere";
      const auxForms = {
        "avere": ["ho","hai","ha","abbiamo","avete","hanno"],
        "essere": ["sono","sei","è","siamo","siete","sono"]
      };
      let auxForm = (auxForms[aux] || auxForms["avere"])[pIdx];
      let reflexivePrefix = "";
      if (verb.reflexive) reflexivePrefix = REFLEXIVE_PRONS[pIdx] + " ";
      let pp = verb.pp || "";
      if (!pp) {
        if (type === "are") pp = stem(verb.i) + "ato";
        else if (type === "ere") pp = stem(verb.i) + "uto";
        else if (type === "ire" || type === "ire-isc") pp = stem(verb.i) + "ito";
        else pp = verb.i;
      }
      if (aux === "essere") {
        if (pIdx <= 2) pp = pp.slice(0, -1) + (gender === "f" ? "a" : "o");
        else pp = pp.slice(0, -1) + (gender === "f" ? "e" : "i");
      }
      return reflexivePrefix + auxForm + " " + pp;
    }

    case "imperfetto": {
      if (verb.imf) {
        let form = verb.imf[pIdx] || stem(verb.i);
        if (verb.reflexive) form = REFLEXIVE_PRONS[pIdx] + " " + form;
        return form;
      }
      let s = verb.i.endsWith("urre") ? verb.i.slice(0, -3) :
              verb.i.endsWith("porre") ? verb.i.slice(0, -5) + "pon" :
              stem(verb.i);
      const prefix = verb.reflexive ? REFLEXIVE_PRONS[pIdx] + " " : "";
      if (type === "are" || (type === "irregular" && verb.i.endsWith("are"))) {
        return prefix + s + ["avo","avi","ava","avamo","avate","avano"][pIdx];
      }
      if (type === "ere" || type === "irregular") {
        return prefix + s + ["evo","evi","eva","evamo","evate","evano"][pIdx];
      }
      if (type === "ire" || type === "ire-isc") {
        return prefix + s + ["ivo","ivi","iva","ivamo","ivate","ivano"][pIdx];
      }
      return s + "eva";
    }

    case "imperativo": {
      if (personId === "io") return "(—)";
      if (verb.imp) {
        const idx = PERSONS.findIndex(p => p.id === personId);
        const impIdx = idx - 1;
        if (impIdx >= 0 && verb.imp[impIdx]) return verb.imp[impIdx];
      }
      const s = verb.i.endsWith("urre") ? verb.i.slice(0, -3) :
                verb.i.endsWith("porre") ? verb.i.slice(0, -5) + "pon" :
                stem(verb.i);
      if (pIdx === 0) return "(—)";
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
        base = conjugate({ ...verb, reflexive: false }, "presente", personId, gender);
      }
      if (verb.reflexive) {
        if (pIdx === 1) return base + "ti";
        if (pIdx === 2) return "si " + base;
        if (pIdx === 3) return s + "iamoci";
        if (pIdx === 4) return base + "vi";
        if (pIdx === 5) return "si " + base;
      }
      return base;
    }

    default:
      return verb.i;
  }
}

function isIrregular(verb) {
  if (verb.t === "irregular") return true;
  if (verb.imf) return true;
  if (verb.imp) return true;
  if (verb.t === "ere" && verb.pp && !verb.pp.endsWith("uto")) return true;
  if ((verb.t === "ire" || verb.t === "ire-isc") && verb.pp && !verb.pp.endsWith("ito")) return true;
  return false;
}

function generateQuestion(opts = {}) {
  const tenseList = ["presente","passato_prossimo","imperfetto","imperativo"];

  let verb;
  if (opts.verb) {
    verb = opts.verb;
  } else {
    let pool = [...VERBS];
    if (opts.verbType === "irregular") {
      pool = pool.filter(v => isIrregular(v));
    } else if (opts.verbType === "regular") {
      pool = pool.filter(v => !isIrregular(v));
    }
    if (pool.length === 0) pool = [...VERBS];
    verb = pool[Math.floor(Math.random() * pool.length)];
  }

  const tenseId = opts.tense || tenseList[Math.floor(Math.random() * tenseList.length)];

  let eligiblePersons = PERSONS;
  if (tenseId === "imperativo") {
    eligiblePersons = PERSONS.filter(p => p.id !== "io");
  }
  const person = eligiblePersons[Math.floor(Math.random() * eligiblePersons.length)];
  const gender = Math.random() < 0.5 ? "m" : "f";
  const answer = conjugate(verb, tenseId, person.id, gender);
  const tenseLabel = TENSES.find(t => t.id === tenseId).label;

  return { verb, tenseId, tenseLabel, person, gender, answer };
}

export { PERSONS, TENSES, VERBS, conjugate, isIrregular, generateQuestion };
