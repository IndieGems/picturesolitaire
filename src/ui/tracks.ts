// THE SOUNDTRACK the game's music plays (the Cosmetics screen, cosmetics.ts; the creator,
// 2026-10-29: "Music follows the chosen track now, not the table"). Audio's music (src/audio/
// music.ts) follows chosenTrack(), crossfading when it changes; the files are Audio's
// (public/audio/<id>.*, MUSIC.ids in src/audio/sounds.ts).
//
// The tracks, in the screen's order:
//   track-sunny-day      every player's, and the default (the sunny bed-day loop)
//   track-winter-dusk    the snowy evening, with the Winter Dusk table: whoever owns the table owns
//                        its track (the lead's brief); no item of its own, so never sold, and shown
//                        only to its owners, as the table is
//   the shop's four      platform items bought once for Coins (Server's src/net/tracks.json, the
//                        cosmetics catalog), owned as src/net/keepsake.ts's one bag read says
//
// Which track is CHOSEN is the player's setting and follows them (gem.me.settings "track",
// choices.ts); only a choice they make is written. A chosen track they no longer own falls back to
// the default.
//
// A VIP PLAYS ANY TRACK SOLD (docs/vip.md): the shop's four, owned or not (never Winter Dusk's, which
// comes with its table, an event's prize). "track" keeps the latest choice, owned or borrowed;
// "trackOwned" the latest one they own, which a borrowed choice falls back to once VIP ends (the free
// track if none), the setting kept for VIP's return. The first screen never waits for any of it; the music waits on trackChoiceRead,
// capped (src/audio/index.ts), so it does not start on the default and change a moment later.

import { ownedTracks } from "../net/keepsake";
import { TRACKS } from "../net/tracks";
import { keepChoice, readChoices } from "./choices";
import { t } from "./i18n";
import { ownedTableArts } from "./tables";
import { onVip, vipNow } from "./vip-view";

export type TrackKind = "free" | "table" | "shop";
export interface TrackInfo {
  /** "track-paris-cafe": the setting's value, the item's slug, Audio's file name. */
  id: string;
  kind: TrackKind;
  /** For a "table" track: the table whose owners own it. */
  table?: string;
  /** For a "shop" track: the trip it belongs to (src/content/levels/trips.json). */
  trip?: string;
}

/** The track every player has, and the one played before anything is read. */
export const DEFAULT_TRACK = "track-sunny-day";
const SETTING = "track";
/** The latest track they chose that they own (a VIP's borrowed choice falls back to it). */
const SETTING_OWNED = "trackOwned";

export const TRACK_LIST: readonly TrackInfo[] = [
  { id: DEFAULT_TRACK, kind: "free" },
  { id: "track-winter-dusk", kind: "table", table: "table-winter-dusk" },
  ...TRACKS.map((x): TrackInfo => ({ id: x.slug, kind: "shop", trip: x.trip })),
];

export const trackInfo = (id: string): TrackInfo | undefined => TRACK_LIST.find((x) => x.id === id);

/** A track's name, in the player's language. */
export function trackTitle(id: string): string {
  const key = `track.${id}`;
  const said = t(key);
  return said === key ? (TRACKS.find((x) => x.slug === id)?.title ?? id) : said;
}

/** Dev server only: the shop tracks owned for a check in the play-test tool (cosmetics-shop.ts's pretend); null: the platform's word. */
let devOwned: Set<string> | null = null;
export function pretendOwnedTracks(ids: readonly string[] | null): void {
  if (!import.meta.env.DEV) return;
  devOwned = ids ? new Set(ids) : null;
}

/** The tracks this player may play, by id: the free one, a table's own with its table, and each they bought. */
export async function ownedTrackIds(): Promise<Set<string>> {
  const [tables, bought] = await Promise.all([ownedTableArts(), devOwned ? Promise.resolve([...devOwned]) : ownedTracks()]);
  const haveTable = new Set(tables.map((a) => a.id));
  const mine = new Set(bought);
  return new Set(
    TRACK_LIST.filter((x) => x.kind === "free" || (x.kind === "table" && haveTable.has(x.table!)) || (x.kind === "shop" && mine.has(x.id))).map((x) => x.id),
  );
}

let chosen = DEFAULT_TRACK;
/** The player chose a track this session: what the boot read finds later never overrides it. */
let touched = false;
/** The player's latest choice (null: none, the default); it may be borrowed, by a VIP. */
let wanted: string | null = null;
/** The latest track they chose that they own. */
let ownedPick: string | null = null;
let booted = false;

/** A track this player is lent while VIP (sold, and not theirs): the Cosmetics screen marks it. */
export async function lentTrack(id: string): Promise<boolean> {
  return vipNow() && trackInfo(id)?.kind === "shop" && !(await ownedTrackIds()).has(id);
}

/** What this player may play now: one they own, or, while VIP, one sold. */
async function playable(id: string): Promise<{ own: boolean } | undefined> {
  if ((await ownedTrackIds()).has(id)) return { own: true };
  return vipNow() && trackInfo(id)?.kind === "shop" ? { own: false } : undefined;
}

/** The track for the player's choices: the latest if they may play it, else the latest they own, else the default. */
async function settleChoice(): Promise<string> {
  if (wanted && (await playable(wanted))) return wanted;
  if (ownedPick && (await playable(ownedPick))?.own) return ownedPick;
  return DEFAULT_TRACK;
}

// VIP came or went: a borrowed track on, or back to one they own
onVip(() => {
  if (!booted) return;
  void settleChoice().then((id) => {
    if (id !== chosen) {
      chosen = id;
      changed();
    }
  });
});
const listeners = new Set<() => void>();
const changed = (): void => {
  for (const fn of [...listeners]) fn();
};

/** The track the player chose (the music plays it). */
export const chosenTrack = (): string => chosen;

/** Hear when the chosen track may have changed (read chosenTrack() again; a call may change nothing). Returns the unsubscribe. */
export function onTrackChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

let readSettled!: () => void;
/** Settles once the boot has read the player's track and changed over to it, or found it could not. */
export const trackChoiceRead: Promise<void> = new Promise((r) => (readSettled = r));

/** At boot: the player's chosen track, if they still own it; the default otherwise, or on no answer. */
export async function startTracks(): Promise<void> {
  try {
    const read = await readChoices();
    if (touched) return;
    wanted = read.get(SETTING) || null;
    ownedPick = read.get(SETTING_OWNED) || null;
    if (!wanted || wanted === DEFAULT_TRACK) return;
    const id = await settleChoice();
    if (id !== chosen && !touched) {
      chosen = id;
      changed();
    }
  } catch (err) {
    console.warn("[tracks] the chosen track could not be read", err);
  } finally {
    booted = true;
    readSettled();
  }
}

/** The player chose track `id` (one they own, or a VIP's sold one): the music changes over, and their choice is kept. */
export async function chooseTrack(id: string): Promise<boolean> {
  touched = true;
  const p = await playable(id);
  if (!p) return false;
  wanted = id;
  if (p.own) ownedPick = id;
  if (id === chosen) return true;
  chosen = id;
  changed();
  if (devOwned) return true;
  keepChoice(SETTING, id);
  if (p.own) keepChoice(SETTING_OWNED, id);
  return true;
}
