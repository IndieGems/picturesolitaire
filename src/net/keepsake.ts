// TABLES THE PLAYER OWNS, the platform's answer. The tables themselves (slug,
// id, title, how each is earned) are in src/net/tables.ts; the onboarding
// keepsake is granted only by the server, once, when campaign board 1 is
// verified, and a win verdict that granted it lists it (`items`).
//
// What the player OWNS is read here. Which owned table is CHOSEN is a setting
// the player makes, kept with the game's settings (gem.me.settings: it follows
// the player), never here and never in browser storage.

import { gem } from "../gem";
import { suspect } from "../ui/online";
import { TABLES } from "./tables";

export { KEEPSAKE, TABLES, type Table } from "./tables";

const framed = window.self !== window.top;

/** Does the player own this table? False unframed, and when the platform cannot be asked. */
export async function ownsTable(slug: string): Promise<boolean> {
  if (!framed) return false;
  try {
    await gem.awaitIdentity(10_000);
    return (await gem.me.inventory.instances(slug)).some((i) => i.quantity > 0);
  } catch (err) {
    suspect();
    console.warn(`[keepsake] could not read ${slug}`, err);
    return false;
  }
}

/** Every table the player owns, by slug. */
export async function ownedTables(): Promise<string[]> {
  const owned = await Promise.all(TABLES.map(async (t) => ((await ownsTable(t.slug)) ? t.slug : null)));
  return owned.filter((s): s is string => s !== null);
}
