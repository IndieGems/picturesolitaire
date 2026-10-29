// TABLES AND SOUNDTRACKS THE PLAYER OWNS, the platform's answer. The tables themselves (slug,
// id, title, how each is earned) are in src/net/tables.ts, the soundtracks in src/net/tracks.ts;
// the onboarding keepsake is granted only by the server, once, when campaign board 1 is
// verified, and a win verdict that granted it lists it (`items`). Shop tables and soundtracks
// are bought on the Cosmetics screen (src/net/cosmetics.ts).
//
// What the player OWNS is read here. Which owned table and track are CHOSEN are settings the
// player makes, kept with the game's settings (gem.me.settings: they follow the player), never
// here and never in browser storage.
//
// ONE READ FOR ALL OF THEM (the lead, 2026-10-29, after the office-wide throttle; UI's design):
// asking per item cost a request for every item the player does NOT own (the SDK's
// instances() asks the platform itself when the bag holds none of an item), about ten at each
// start, and again for the table chooser and the settings menu. So the bag is read once
// (gem.me.inventory.snapshot(), the SDK's own cached read), shared by every caller at the same
// time, and kept until the inventory changes (inventory.onChanged: a refresh after a paid win,
// the SDK's own writes, a purchase among them). The bag lists items by their config id
// (`itemDefinitionId`, the `id` in src/net/tables.json and tracks.json), never by slug. A bag that
// runs past one page cannot say what it leaves out, so only then is each item asked for, as
// before. A read that gets no answer is not asked again for a while (src/net/pace.ts), and the
// last answer stands meanwhile.

import { GemApiError } from "@indiegems/gem-web-sdk/sdk";
import { gem } from "../gem";
import { suspect } from "../ui/online";
import { noAnswer, refusalOf } from "./no-answer";
import { backoff, heard, held } from "./pace";
import { TABLES } from "./tables";
import { TRACKS } from "./tracks";

export { KEEPSAKE, TABLES, type Table } from "./tables";
export { TRACKS, type Track } from "./tracks";

/** Framed by the platform: another origin's frame (as src/net/helpers.ts). The play-test tool's frame is this page's own origin, with no platform behind it: nothing owned, nothing asked. */
const framed = ((): boolean => {
  if (window.self === window.top) return false;
  try {
    return window.parent.location.origin !== location.origin;
  } catch {
    return true; // another origin: a platform frame
  }
})();

/** Every item read here: the tables, then the soundtracks (no slug is both). */
const ITEMS: readonly { slug: string; id: string }[] = [...TABLES, ...TRACKS];

/** The read out now or kept, shared by every caller: the owned slugs. */
let reading: Promise<Set<string>> | null = null;
/** The last answer that landed (kept through a failed read). */
let known = new Set<string>();
/** Bought this session, as the platform confirmed: owned whatever a read still in flight says (never traded, never taken). */
const bought = new Set<string>();
/** Failed reads in a row, and no new read before this (Date.now()). */
let fails = 0;
let notBefore = 0;
let listening = false;
/** A bag past one page where some item got no answer: nothing to suspect beyond what holds() did. */
const PARTIAL = new Error("an item could not be read");

/** One item asked for alone (a bag past one page): true, false, or null for no answer. */
async function holds(item: { slug: string; id: string }): Promise<boolean | null> {
  try {
    return (await gem.me.inventory.instances(item.id)).some((i) => i.quantity > 0);
  } catch (err) {
    // not_found is the platform's answer for a player who holds none: they don't own it
    if (err instanceof GemApiError && err.reason === "not_found") return false;
    heard(err);
    if (noAnswer(err)) suspect();
    console.warn(`[keepsake] could not read ${item.slug}: ${refusalOf(err)}`);
    return null;
  }
}

async function read(): Promise<Set<string>> {
  try {
    await gem.awaitIdentity(10_000);
    const bag = (await gem.me.inventory.snapshot()).items;
    let owned: Set<string>;
    if (bag.nextCursor === undefined) {
      // the whole bag: an item it does not list is not owned
      const ids = new Set(bag.data.filter((i) => i.quantity > 0).map((i) => i.itemDefinitionId));
      owned = new Set(ITEMS.filter((t) => ids.has(t.id)).map((t) => t.slug));
    } else {
      const each = await Promise.all(ITEMS.map(async (t) => [t.slug, await holds(t)] as const));
      if (each.some(([, h]) => h === null)) throw PARTIAL;
      owned = new Set(each.filter(([, h]) => h).map(([s]) => s));
    }
    for (const s of bought) owned.add(s);
    known = owned;
    fails = 0;
    return owned;
  } catch (err) {
    heard(err);
    if (err !== PARTIAL && noAnswer(err)) suspect();
    console.warn(`[keepsake] the tables and tracks owned could not be read: ${refusalOf(err)}`);
    // what was known stands; the next ask waits a while (src/net/pace.ts)
    notBefore = Date.now() + backoff(++fails, 5000);
    reading = null;
    return known;
  }
}

/** The owned slugs (tables and tracks): one read shared by every caller, kept until the inventory changes. */
function owned(): Promise<Set<string>> {
  if (!framed) return Promise.resolve(new Set());
  if (!listening) {
    listening = true;
    gem.me.inventory.onChanged(() => {
      reading = null;
    });
  }
  if (reading) return reading;
  if (Date.now() < notBefore || held() > 0) return Promise.resolve(known);
  reading = read();
  return reading;
}

/**
 * For src/net/cosmetics.ts: read the bag afresh (after a purchase, or one that got no answer).
 * The answer is the platform's, or the last one known while a wait runs.
 */
export function rereadOwned(): Promise<Set<string>> {
  reading = null;
  return owned();
}

/** For src/net/cosmetics.ts: the platform confirmed this purchase, so it is owned from now on, whatever an older read says. */
export function boughtNow(slug: string): void {
  bought.add(slug);
  known.add(slug);
}

/** Does the player own this table? False unframed, and when the platform cannot be asked. */
export async function ownsTable(slug: string): Promise<boolean> {
  return (await owned()).has(slug);
}

/** Every table the player owns, by slug (in src/net/tables.json's order). */
export async function ownedTables(): Promise<string[]> {
  const mine = await owned();
  return TABLES.filter((t) => mine.has(t.slug)).map((t) => t.slug);
}

/** Does the player own this soundtrack? False unframed, and when the platform cannot be asked. */
export async function ownsTrack(slug: string): Promise<boolean> {
  return (await owned()).has(slug);
}

/** Every soundtrack the player owns, by slug (in src/net/tracks.json's order). */
export async function ownedTracks(): Promise<string[]> {
  const mine = await owned();
  return TRACKS.filter((t) => mine.has(t.slug)).map((t) => t.slug);
}
