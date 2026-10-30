// THE ACHIEVEMENTS (docs/achievements.md): the creator's 22 (2026-10-30), as the player reads them on
// the unlock card (unlock.ts). Platform achievements: the Arcade records each unlock and lists them on
// the store page; the game only celebrates one (the SDK's achievements.md §5).
//
// The list is Server's (src/net/achievements.json, read through src/net/achievements.ts: each one's
// slug, id, counter, threshold and points); this file adds what the card draws. The words are in the
// locale files, one pair per achievement: `achievement.<slug>.name` and `.desc`; the ten stamps share
// one pair, `achievement.stamped.*`, with the trip's own translated name in {{trip}} (names-<lang>.json,
// "trip.<id>"). Server's make-config reads the same keys into the game config, so the Arcade's lists and
// this card say the same words; it also reads `achievement.count.<counter>.*`, the counters' own names
// the Arcade shows.
//
// The points are the card's to show (the SDK: an achievement's points are the game's to show; the
// player's Achievement Score is not).

import { ACHIEVEMENTS as LIST, type Achievement as Listed } from "../net/achievements";
import { t } from "./i18n";
import { tripById, tripName } from "./trips";

export type AchievementGroup = "journey" | "stamps" | "souvenirs" | "hard" | "daily";

export interface Achievement {
  /** Its stable name in the game ("first-steps", "stamped-t2"): the locale keys and the icon file. */
  slug: string;
  group: AchievementGroup;
  points: number;
  /** A stamp's trip ("t2"). */
  trip?: string;
  /** Art's avatar icon, public/art/achievements/<slug>-icon.webp: the six that award one. */
  icon?: boolean;
}

/** Each counter's group, for the medal's glyph. */
const GROUP: Record<string, AchievementGroup> = {
  levels_finished: "journey",
  trips_stamped: "stamps",
  souvenirs_finished: "souvenirs",
  hard_levels_won: "hard",
  super_hard_levels_won: "hard",
  dailies_won: "daily",
};

/** The card's view of one of Server's. */
export function asShown(a: Listed): Achievement {
  return { slug: a.slug, group: GROUP[a.counter] ?? "journey", points: a.points, ...(a.trip ? { trip: a.trip } : {}), ...(a.awardsIcon ? { icon: true } : {}) };
}

const BY_SLUG = new Map(LIST.map((a) => [a.slug, asShown(a)]));

export const achievementBySlug = (slug: string): Achievement | undefined => BY_SLUG.get(slug);

/** Every slug, in the list's order (the dev hooks). */
export const ACHIEVEMENT_SLUGS: readonly string[] = LIST.map((a) => a.slug);

/** Its name, in the player's language ("Stamped: Japan"). */
export function achievementName(a: Achievement): string {
  if (a.trip) return t("achievement.stamped.name", { trip: tripWords(a.trip) });
  return t(`achievement.${a.slug}.name`);
}

/** How it is earned, in the player's language. */
export function achievementDesc(a: Achievement): string {
  if (a.trip) return t("achievement.stamped.desc", { trip: tripWords(a.trip) });
  return t(`achievement.${a.slug}.desc`);
}

function tripWords(id: string): string {
  const tr = tripById(id);
  return tr ? tripName(tr) : id;
}

/** Art's icon for one of the six. */
export const achievementIconUrl = (a: Achievement): string => `${import.meta.env.BASE_URL}art/achievements/${a.slug}-icon.webp`;

/** The medal's metal, by what it is worth: bronze to 10 points, silver to 25, gold above. */
export const medalTier = (a: Achievement): "bronze" | "silver" | "gold" => (a.points <= 10 ? "bronze" : a.points <= 25 ? "silver" : "gold");
