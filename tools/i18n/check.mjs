// CHECK THE TRANSLATIONS against the English, for every Arcade language (src/ui/i18n.ts):
//
//   locales/<lang>.json          the game's words: every key en.json has, plural keys in the
//                                forms the language needs (Intl.PluralRules, for whole numbers:
//                                Polish and Russian one/few/many and other, Japanese only other),
//                                and every {{placeholder}} the English has, no more and no other
//                                ({{count}} may be left out of a form, "eine Münze")
//   locales/names-<lang>.json    the content names home, the passport and the suitcase show
//   locales/titles-<lang>.json   the pictures' titles
//                                (both against tools/i18n/content-en.mjs's English snapshots: a
//                                name missing reads in English, so it is reported, not failed)
//
//   node tools/i18n/check.mjs            every language
//   node tools/i18n/check.mjs de ru      those only
//   --strict                             a missing or stale content name fails too
//
// Exit 1 on any failure: a missing or extra key, a broken placeholder, a plural form the language
// lacks, an empty string, a file that is not JSON.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { contentEnglish } from "./content-en.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const LOCALES = ["de", "es", "fr", "it", "ja", "ko", "pl", "pt-BR", "ru", "tr", "zh-Hans"];
const PLURAL = /_(zero|one|two|few|many|other)$/;
const holes = (s) => new Set([...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]));
const load = (p) => JSON.parse(readFileSync(`${ROOT}${p}`, "utf8"));

/** The plural forms a language picks for whole numbers (what a count can be), plus `other`. */
function formsOf(lang) {
  const rules = new Intl.PluralRules(lang);
  const seen = new Set(["other"]);
  for (let n = 0; n <= 10000; n++) seen.add(rules.select(n));
  return seen;
}

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const only = args.filter((a) => !a.startsWith("--"));
const langs = only.length ? only : LOCALES;
const en = load("locales/en.json");
// the English keys, plural ones by their base
const enBase = new Map();
for (const [k, v] of Object.entries(en)) {
  const base = k.replace(PLURAL, "");
  const e = enBase.get(base) ?? { plural: false, holes: new Set() };
  if (PLURAL.test(k)) e.plural = true;
  for (const h of holes(v)) e.holes.add(h);
  enBase.set(base, e);
}
const { names: namesEn, titles: titlesEn } = contentEnglish();

let failed = 0;
const fail = (lang, msg) => {
  failed++;
  console.log(`✗ ${lang}: ${msg}`);
};

function sameHoles(lang, file, key, text, want, countOptional) {
  const have = holes(text);
  for (const h of have) if (!want.has(h)) fail(lang, `${file} ${key}: {{${h}}} is not in the English`);
  for (const h of want) if (!have.has(h) && !(countOptional && h === "count")) fail(lang, `${file} ${key}: {{${h}}} is missing`);
}

for (const lang of langs) {
  const file = `locales/${lang}.json`;
  if (!existsSync(`${ROOT}${file}`)) {
    fail(lang, `${file} is missing`);
    continue;
  }
  let t;
  try {
    t = load(file);
  } catch (err) {
    fail(lang, `${file} is not JSON: ${err.message}`);
    continue;
  }
  const forms = formsOf(lang);
  const seenBase = new Set();
  for (const [k, v] of Object.entries(t)) {
    if (typeof v !== "string" || !v.trim()) {
      fail(lang, `${file} ${k}: empty`);
      continue;
    }
    const base = k.replace(PLURAL, "");
    const e = enBase.get(base);
    if (!e) {
      fail(lang, `${file} ${k}: not an English key`);
      continue;
    }
    seenBase.add(base);
    if (PLURAL.test(k)) {
      const form = PLURAL.exec(k)[1];
      if (!e.plural) fail(lang, `${file} ${k}: the English is not a plural`);
      else if (!forms.has(form)) fail(lang, `${file} ${k}: ${lang} has no "${form}" form`);
      sameHoles(lang, file, k, v, e.holes, true);
    } else {
      if (e.plural) fail(lang, `${file} ${k}: the English is a plural (${base}_other...)`);
      sameHoles(lang, file, k, v, e.holes, false);
    }
  }
  for (const [base, e] of enBase) {
    if (!seenBase.has(base)) {
      fail(lang, `${file} ${base}${e.plural ? "_*" : ""}: missing`);
      continue;
    }
    if (e.plural) for (const f of forms) if (!(`${base}_${f}` in t)) fail(lang, `${file} ${base}_${f}: missing (${lang} needs ${[...forms].join(", ")})`);
  }

  // the content names: only what the English has, placeholders none
  for (const [kind, english] of [["names", namesEn], ["titles", titlesEn]]) {
    const cf = `locales/${kind}-${lang}.json`;
    if (!existsSync(`${ROOT}${cf}`)) {
      console.log(`· ${lang}: ${cf} not written yet (English shows)`);
      if (strict) failed++;
      continue;
    }
    let c;
    try {
      c = load(cf);
    } catch (err) {
      fail(lang, `${cf} is not JSON: ${err.message}`);
      continue;
    }
    for (const [k, v] of Object.entries(c)) {
      if (typeof v !== "string" || !v.trim()) fail(lang, `${cf} ${k}: empty`);
      else if (!(k in english)) {
        console.log(`· ${lang}: ${cf} ${k}: no longer in the English (delete it)`);
        if (strict) failed++;
      } else if (holes(v).size) fail(lang, `${cf} ${k}: a name has no {{placeholders}}`);
    }
    const missing = Object.keys(english).filter((k) => !(k in c));
    if (missing.length) {
      console.log(`· ${lang}: ${cf}: ${missing.length} of ${Object.keys(english).length} not translated (English shows), e.g. ${missing.slice(0, 3).join(", ")}`);
      if (strict) failed++;
    }
  }
  console.log(`${lang}: checked`);
}

if (failed) {
  console.log(`\n${failed} problem${failed === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("\nall good");
