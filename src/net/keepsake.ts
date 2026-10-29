// TABLES THE PLAYER OWNS, the platform's answer. The tables themselves (slug,
// id, title, how each is earned) are in src/net/tables.ts; the onboarding
// keepsake is granted only by the server, once, when campaign board 1 is
// verified, and a win verdict that granted it lists it (`items`).
//
// What the player OWNS is read here. Which owned table is CHOSEN is a setting
// the player makes, kept with the game's settings (gem.me.settings: it follows
// the player), never here and never in browser storage.
//
// ONE READ FOR ALL OF THEM (the lead, 2026-10-29, after the office-wide throttle; UI's design):
// asking per table cost a request for every table the player does NOT own (the SDK's
// instances() asks the platform itself when the bag holds none of an item), about ten at each
// start, and again for the table chooser and the settings menu. So the bag is read once
// (gem.me.inventory.snapshot(), the SDK's own cached read), shared by every caller at the same
// time, and kept until the inventory changes (inventory.onChanged: a refresh after a paid win,
// the SDK's own writes). The bag lists items by their config id (`itemDefinitionId`, the table's
// `id` in src/net/tables.json), never by slug. A bag that runs past one page cannot say what it
// leaves out, so only then is each table asked for, as before. A read that gets no answer is not
// asked again for a while (src/net/pace.ts), and the last answer stands meanwhile.

import { GemApiError } from "@indiegems/gem-web-sdk/sdk";
import { gem } from "../gem";
import { suspect } from "../ui/online";
import { noAnswer, refusalOf } from "./no-answer";
import { backoff, heard, held } from "./pace";
import { TABLES } from "./tables";

export { KEEPSAKE, TABLES, type Table } from "./tables";

const framed = window.self !== window.top;

/** The read out now or kept, shared by every caller: the owned slugs. */
let reading: Promise<Set<string>> | null = null;
/** The last answer that landed (kept through a failed read). */
let known = new Set<string>();
/** Failed reads in a row, and no new read before this (Date.now()). */
let fails = 0;
let notBefore = 0;
let listening = false;
/** A bag past one page where some table got no answer: nothing to suspect beyond what holds() did. */
const PARTIAL = new Error("a table could not be read");

/** One table asked for alone (a bag past one page): true, false, or null for no answer. */
async function holds(slug: string): Promise<boolean | null> {
  try {
    return (await gem.me.inventory.instances(slug)).some((i) => i.quantity > 0);
  } catch (err) {
    // not_found is the platform's answer for a player who holds none: they don't own it
    if (err instanceof GemApiError && err.reason === "not_found") return false;
    heard(err);
    if (noAnswer(err)) suspect();
    console.warn(`[keepsake] could not read ${slug}: ${refusalOf(err)}`);
    return null;
  }
}

async function read(): Promise<Set<string>> {
  try {
    await gem.awaitIdentity(10_000);
    const bag = (await gem.me.inventory.snapshot()).items;
    let owned: Set<string>;
    if (bag.nextCursor === undefined) {
      // the whole bag: a table it does not list is not owned
      const ids = new Set(bag.data.filter((i) => i.quantity > 0).map((i) => i.itemDefinitionId));
      owned = new Set(TABLES.filter((t) => ids.has(t.id)).map((t) => t.slug));
    } else {
      const each = await Promise.all(TABLES.map(async (t) => [t.slug, await holds(t.slug)] as const));
      if (each.some(([, h]) => h === null)) throw PARTIAL;
      owned = new Set(each.filter(([, h]) => h).map(([s]) => s));
    }
    known = owned;
    fails = 0;
    return owned;
  } catch (err) {
    heard(err);
    if (err !== PARTIAL && noAnswer(err)) suspect();
    console.warn(`[keepsake] the tables owned could not be read: ${refusalOf(err)}`);
    // what was known stands; the next ask waits a while (src/net/pace.ts)
    notBefore = Date.now() + backoff(++fails, 5000);
    reading = null;
    return known;
  }
}

/** The owned tables' slugs: one read shared by every caller, kept until the inventory changes. */
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

/** Does the player own this table? False unframed, and when the platform cannot be asked. */
export async function ownsTable(slug: string): Promise<boolean> {
  return (await owned()).has(slug);
}

/** Every table the player owns, by slug (in src/net/tables.json's order). */
export async function ownedTables(): Promise<string[]> {
  const mine = await owned();
  return TABLES.filter((t) => mine.has(t.slug)).map((t) => t.slug);
}
