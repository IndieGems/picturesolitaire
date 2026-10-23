// Every word the player reads, from one catalogue: locales/en.json.
//
// The format is i18next's, so a translator or a tool that knows it knows this:
//   {{name}}               a placeholder, filled from t()'s second argument
//   key_one / key_other    plural forms, chosen by `count` through Intl.PluralRules
//
// English only for now (AGENTS.md, "Translation": other languages come at the
// release promotion). When they do, each locale is a file beside en.json, and
// a key a locale lacks falls back to English, never to a blank.
//
// Keys are named after where the text appears ("win.next"), never after its
// English, and kept sorted.

import EN from "../../locales/en.json";

export type Key = keyof typeof EN;
type Vars = Record<string, string | number>;

const table: Record<string, string> = EN;
const rules = new Intl.PluralRules("en");

/** The text for `key`, with `{{name}}` filled from `vars`; `count` also picks the plural form. */
export function t(key: Key | string, vars?: Vars): string {
  let text: string | undefined;
  if (vars && typeof vars.count === "number") text = table[`${key}_${rules.select(vars.count)}`] ?? table[`${key}_other`];
  text ??= table[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}
