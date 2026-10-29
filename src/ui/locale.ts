// Which of the game's languages a language tag reads in: the Arcade's twelve, no more. Tiny on
// purpose: the boot entry (src/main.ts) uses it before any word list has loaded.

export const LOCALES = ["en", "de", "es", "fr", "it", "ja", "ko", "pl", "pt-BR", "ru", "tr", "zh-Hans"] as const;
export type Locale = (typeof LOCALES)[number];

/** The game's language for a tag ("pt" and "pt-PT" read Brazilian Portuguese, any "zh" Simplified Chinese), or null. */
export function negotiate(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const t = tag.trim().replace(/_/g, "-").toLowerCase();
  const exact = LOCALES.find((l) => l.toLowerCase() === t);
  if (exact) return exact;
  const primary = t.split("-")[0]!;
  if (primary === "pt") return "pt-BR";
  if (primary === "zh") return "zh-Hans";
  return LOCALES.find((l) => l === primary) ?? null;
}

/** `?lang=<tag>`: a language pinned for review (screenshots, the text-fit checks), never in a release build. */
export function askedLocale(): Locale | null {
  if (import.meta.env.MODE === "release" || typeof location === "undefined") return null;
  return negotiate(new URLSearchParams(location.search).get("lang"));
}

/** The language to start in before the Arcade says: `?lang=`, else the device's, else English. */
export function deviceLocale(): Locale {
  const asked = askedLocale();
  if (asked) return asked;
  for (const tag of typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language])) {
    const l = negotiate(tag);
    if (l) return l;
  }
  return "en";
}
