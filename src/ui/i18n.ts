// Every word the player reads, in their language (the Arcade's twelve: src/ui/locale.ts).
//
//   locales/en.json            the game's words in English: the source, bundled with the game
//   locales/<lang>.json        the same keys in a language, a chunk of its own, fetched once chosen
//   locales/names-<lang>.json  the content's names in it (trips, postcards' places, souvenirs,
//                              suitcase items, tables), fetched with it: home and the passport show them
//   locales/titles-<lang>.json the pictures' titles, fetched once home is whole (warmTitles): only the
//                              enlarged picture and the win card read them
// The content's English stays in the content (pictures.json, trips.json, suitcases.json, tables.json),
// read through catalogue.ts and the others' `localized` lookups; tools/i18n/content-en.mjs snapshots it
// for the translators, and tools/i18n/check.mjs checks every language against the English.
//
// The format is i18next's, so a translator or a tool that knows it knows this:
//   {{name}}               a placeholder, filled from t()'s second argument
//   key_one / key_other    plural forms, chosen by `count` through Intl.PluralRules
//   (key_few, key_many)    for the languages that have more (Polish, Russian)
// A key a language lacks reads in English, never as a blank.
//
// Which language: `?lang=` for review, else the Arcade's (gem.prefs.locale, which can change while
// the game is open), else the device's (navigator.languages: not every host sends prefs). app.ts
// chooses it before home is drawn (capped), and follows the Arcade after.
//
// When it changes, the screens follow: a label set once as its screen is built is set through live()
// (liveText, liveAttr), which sets it again; a screen that draws itself redraws (onLocaleChange).
//
// Keys are named after where the text appears ("win.next"), never after its English, and kept sorted.

import EN from "../../locales/en.json";
import { askedLocale, deviceLocale, negotiate, type Locale } from "./locale";

export { LOCALES, negotiate, type Locale } from "./locale";
export type Key = keyof typeof EN;
type Vars = Record<string, string | number>;
type Table = Record<string, string>;
type Load = () => Promise<{ default: Table }>;

const en: Table = EN;
/** The language's words over the content's names and titles: one lookup. */
let table: Table = en;
let words: Table = {};
let names: Table = {};
let titles: Table = {};
let lang: Locale = "en";
let rules = new Intl.PluralRules("en");
const enRules = rules;
const listeners = new Set<() => void>();

// every language but English, each file a chunk of its own (Vite rewrites the globs at build time)
const wordFiles = import.meta.glob<{ default: Table }>(["../../locales/*.json", "!../../locales/en.json", "!../../locales/names-*.json", "!../../locales/titles-*.json"]);
const nameFiles = import.meta.glob<{ default: Table }>(["../../locales/names-*.json", "!../../locales/names-en.json"]);
const titleFiles = import.meta.glob<{ default: Table }>(["../../locales/titles-*.json", "!../../locales/titles-en.json"]);
const file = (files: Record<string, Load>, name: string): Load | undefined => files[`../../locales/${name}.json`];

/** The language on screen. */
export const locale = (): Locale => lang;

/** `?lang=` pinned the language: the Arcade's then does not move it. */
export const pinned = (): boolean => askedLocale() !== null;

/** The language to start in, before the Arcade has said: `?lang=`, else the device's. */
export const bootLocale = deviceLocale;

function rebuild(): void {
  table = lang === "en" ? en : { ...titles, ...names, ...words };
}

/** The titles for the language on screen, once (home is whole, or the language changed after). */
let titlesWanted = false;
let titlesFor: Locale | null = null;
export function warmTitles(): void {
  titlesWanted = true;
  const want = lang;
  if (want === "en" || titlesFor === want) return;
  titlesFor = want;
  const load = file(titleFiles, `titles-${want}`);
  void load?.()
    .then((m) => {
      if (lang !== want) return;
      titles = m.default;
      rebuild();
    })
    .catch(() => {
      if (titlesFor === want) titlesFor = null; // the next ask tries again
    });
}

/** Switch language: fetches its words and names, then sets every live label and tells every screen. */
let asked: Locale = "en";
export async function setLocale(want: Locale): Promise<void> {
  asked = want; // the newest ask wins, whichever file lands first
  if (want === lang) return;
  let w: Table = {};
  let n: Table = {};
  if (want !== "en") {
    try {
      const [a, b] = await Promise.all([file(wordFiles, want)?.(), file(nameFiles, `names-${want}`)?.()]);
      if (!a) return;
      w = a.default;
      n = b?.default ?? {};
    } catch (err) {
      console.info("[i18n]", want, "did not load:", err instanceof Error ? err.message : err);
      return;
    }
  }
  if (asked !== want) return;
  lang = want;
  words = w;
  names = n;
  titles = {};
  titlesFor = null;
  rules = new Intl.PluralRules(want);
  rebuild();
  document.documentElement.lang = want;
  if (titlesWanted) warmTitles();
  repaint();
  for (const fn of [...listeners]) fn();
}

/** The Arcade's language, when it has said one the game has (and `?lang=` did not pin another). */
export function arcadeLocale(tag: string | null | undefined): Locale | null {
  return pinned() ? null : negotiate(tag);
}

/** Hear a change of language (a screen redraws itself in the new one). Returns the unsubscribe. */
export function onLocaleChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

// ---------------------------------------------------------------- live labels

/** Labels set once as their screen is built, set again on every change of language. */
let painters: { ref: WeakRef<Element>; paint: (e: Element) => void }[] = [];
function repaint(): void {
  painters = painters.filter((p) => {
    const e = p.ref.deref();
    if (e) p.paint(e);
    return !!e;
  });
}

/** `paint` sets `el`'s words now and after every change of language. For a label nothing else sets. */
export function live<E extends Element>(el: E, paint: (el: E) => void): E {
  paint(el);
  painters.push({ ref: new WeakRef(el), paint: paint as (e: Element) => void });
  return el;
}
/** `el`'s text is `key`'s, in the language on screen. */
export const liveText = <E extends Element>(el: E, key: Key | (string & {}), vars?: Vars): E => live(el, (e) => void (e.textContent = t(key, vars)));
/** `el`'s attribute `name` (aria-label, alt) is `key`'s, in the language on screen. */
export const liveAttr = <E extends Element>(el: E, name: string, key: Key | (string & {}), vars?: Vars): E =>
  live(el, (e) => e.setAttribute(name, t(key, vars)));

// ---------------------------------------------------------------- lookups

function lookup(key: string, vars?: Vars): string | undefined {
  const count = vars?.count;
  if (typeof count === "number") {
    // the language's own form, else its general one, else English's
    const s = table[`${key}_${rules.select(count)}`] ?? table[`${key}_other`] ?? en[`${key}_${enRules.select(count)}`] ?? en[`${key}_other`];
    if (s !== undefined) return s;
  }
  return table[key] ?? en[key];
}

/** A content name in the player's language ("picture.<id>", "suitcase.<month>.theme"), else its own `english`. */
export function named(key: string, english: string): string {
  return table[key] ?? english;
}

/**
 * The text for `key` in the player's language, `{{name}}` filled from `vars`; `count` also picks the
 * plural form. A key nothing has comes back as itself (catalogue.ts then shows the content's English).
 */
export function t(key: Key | (string & {}), vars?: Vars): string {
  const text = lookup(key, vars) ?? key;
  if (!vars) return text;
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}
