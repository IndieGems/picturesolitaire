// WHO IS VIP, FOR THE SCREENS, and VIP'S GIFTS (docs/vip.md). NO GAME CODE READS VIP (the creator,
// 2026-11-12): what VIP adds is the config's, as bonuses on the rewards catalog's recipes
// (`requires: holds_pass vip`), and the platform judges them when a recipe runs. This file only
// repeats the platform's PREVIEW of one of them, for the screens to draw from (home's badge, the VIP
// screen): VIP's daily gift, a recipe that is a VIP bonus alone, whose bonus the preview marks
// `eligible` for this player (true: VIP; false: not; "unknown": the preview cannot say). It never
// reads the player's passes, names no pass, and decides nothing: the checker's recipes are the word.
//
// VIP GIVES HELPERS, it does not make them free (the creator, 2026-11-01, after Jade Match): a VIP's
// uses spend stock like anyone's. The checker gives the gifts ({"v":1,"what":"vip_gift"},
// functions/checker/src/gift.rs): on the player's own date that weekday's gift recipe (2 helpers in
// the config), once a date by its key, then, after one that applied, the welcome, once per player,
// ever, each clamped at the cap. It is ASKED only when the preview says the day's bonus would apply
// (to save calls: the platform still decides), once a date a session; what it gave goes to
// onVipGift's listeners, once per gift, and the stock is read again.
//
//   isVip()             the preview's last word: false until it lands this session
//   vipKnown()          the preview has said (true or false)
//   onVipChange(fn)     hear each change (fn(isVip())); returns the unsubscribe
//   recheckVip()        look again, fresh (UI's vip-view after Get VIP's sheet or a sign-in): calls close
//                       together cost one look; resuming and a new day look again by themselves
//   previewVipGifts()   the day's gift and the welcome in helpers in all, from the config's bonus grants
//                       (the preview): { daily, welcome }, null where it cannot say
//   onVipGift(fn)       hear each gift the checker gave (welcome before daily), once per id; one given
//                       before anything listens is handed to the first listener, and none before the cap
//                       is known (the config's, src/net/helpers.ts: the gift card says it when the cap
//                       clamped a gift, so it never shows one it would have to guess). Returns the unsubscribe
//
// Unframed (a plain tab, the play-test tool) there is no platform: isVip() stays false.

import { gem, onArcadePause } from "../gem";
import { currentDaily, onDailyChange } from "./daily";
import IDS from "./helper-ids.json";
import { helpers, type HelperKind } from "./helpers";
import { noAnswer, refusalOf } from "./no-answer";
import { backoff, heard as paced, held, whenDue } from "./pace";
import { helpersOf, previewRecipe, weekdayIndex } from "./rewards";

/** Framed by the platform: another origin's frame (as src/net/helpers.ts). */
const framed = ((): boolean => {
  if (window.self === window.top) return false;
  try {
    return window.parent.location.origin !== location.origin;
  } catch {
    return true;
  }
})();

let vip = false;
let known = false;
let looking = false;
let fails = 0;
let again: (() => void) | null = null;
const listeners = new Set<(vip: boolean) => void>();

function set(next: boolean): void {
  known = true;
  if (next === vip) return;
  vip = next;
  for (const fn of [...listeners]) {
    try {
      fn(vip);
    } catch (err) {
      console.warn("[vip] a listener failed:", err);
    }
  }
}

export const isVip = (): boolean => vip;
export const vipKnown = (): boolean => known;

/** Hear each change of isVip(). Returns the unsubscribe. */
export function onVipChange(fn: (vip: boolean) => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** VIP's gift recipe for a date (helper-ids.json `rewards.vipGift`, Monday first). */
function giftRecipe(date: string): string | null {
  const i = weekdayIndex(date);
  return i === null ? null : (IDS.rewards.vipGift[i]?.id ?? null);
}

/** Look at the preview of today's gift recipe: its bonus's eligibility is VIP, for the screens. */
async function look(): Promise<void> {
  if (!framed || looking) return;
  looking = true;
  askAgain = false;
  again?.();
  again = null;
  let ok = false;
  try {
    await gem.awaitIdentity(10_000);
    const date = currentDaily().date;
    const recipe = giftRecipe(date);
    const p = recipe ? await previewRecipe(recipe) : null;
    if (!p) throw new Error("the gift's recipe could not be previewed");
    gifts.set(date, p);
    const e = p.bonuses[0]?.eligible;
    if (e !== true && e !== false) throw new Error("the preview cannot say yet");
    fails = 0;
    ok = true;
    set(e);
    // the day's gift: asked only when the preview says it would apply (the checker still decides)
    if (e && !currentDaily().guessed) askGift(date);
  } catch (err) {
    console.warn(`[vip] could not look: ${refusalOf(err)}`);
    later(backoff(++fails, 5000));
  } finally {
    looking = false;
  }
  if (askAgain && ok) recheckVip();
}

/** A recheck asked while a look was out. */
let askAgain = false;
/** The gather a recheck waits in, so calls close together (the sheet's answer, resuming) cost one look. */
let gather: number | undefined;
const GATHER_MS = 1000;

/**
 * Look again, fresh: after Get VIP's sheet or a sign-in (src/ui/vip-view.ts), on resuming, and on a
 * new day. One look for calls within GATHER_MS; one more after a look already out; through
 * src/net/pace.ts (never while hidden, never inside the platform's wait).
 */
export function recheckVip(): void {
  if (!framed) return;
  if (looking) {
    askAgain = true;
    return;
  }
  if (gather !== undefined) return;
  gather = window.setTimeout(() => {
    gather = undefined;
    fails = 0;
    later(0);
  }, GATHER_MS);
}

function later(ms: number): void {
  again?.();
  again = whenDue(ms, () => {
    again = null;
    void look();
  });
}

let started = false;
/** Look, once, at boot (src/net/progress.ts's loadProgress starts it), and again on resuming and on each new day. */
export function loadVip(): void {
  if (started || !framed) return;
  started = true;
  onArcadePause((paused) => {
    if (!paused) recheckVip();
  });
  onDailyChange((d) => {
    if (!d.guessed) recheckVip();
  });
  void look();
}

/** The previews read this session: today's gift recipe by date, and the welcome's. */
const gifts = new Map<string, import("@indiegems/gem-web-sdk/sdk").ConfigPreview>();
let welcomePreview: import("@indiegems/gem-web-sdk/sdk").ConfigPreview | null = null;

const KINDS: readonly HelperKind[] = ["hint", "undo", "shuffle"];
const total = (g: Record<HelperKind, number>): number => KINDS.reduce((n, k) => n + g[k], 0);

/**
 * VIP's day's gift and welcome, in helpers in all, as the config's bonus grants say (the preview:
 * never a figure of ours); null where it cannot say (unframed, or no preview).
 */
export async function previewVipGifts(): Promise<{ daily: number | null; welcome: number | null }> {
  if (!framed) return { daily: null, welcome: null };
  const date = currentDaily().date;
  const recipe = giftRecipe(date);
  const [d, w] = await Promise.all([gifts.get(date) ?? (recipe ? previewRecipe(recipe) : Promise.resolve(null)), welcomePreview ?? previewRecipe(IDS.rewards.vipWelcome.id)]);
  if (d) gifts.set(date, d);
  if (w) welcomePreview = w;
  return { daily: d ? total(helpersOf(d, true)) : null, welcome: w ? total(helpersOf(w, true)) : null };
}

// ------------------------------------------------------------------ VIP's gifts

type Sizes = Readonly<Record<HelperKind, number>>;
const sizes = (g: Partial<Record<HelperKind, number>> | undefined): Sizes =>
  Object.freeze({ hint: g?.hint ?? 0, undo: g?.undo ?? 0, shuffle: g?.shuffle ?? 0 });

export type VipGiftKind = "daily" | "welcome";
export interface VipGift {
  kind: VipGiftKind;
  /** The gift's own key (the daily's "vip:<date>", the welcome's "vip-welcome:<date>"): a gift heard twice shows once. */
  id: string;
  /** The gift's size before the cap, from the config's bonus grants (the preview); `got` when the preview could not say. */
  gift: Sizes;
  /** What reached the stock after the cap: got[k] < gift[k] means the cap clamped it. */
  got: Sizes;
  /** The counts just after it was given, for the kinds the platform's receipt named. */
  after?: Partial<Record<HelperKind, number>>;
  /** The daily's day of the player's week, Monday 1 .. Sunday 7. */
  day?: number;
}

const giftListeners = new Set<(g: VipGift) => void>();
/** Given before anything listened: handed to the first listener. */
const unheard: VipGift[] = [];
/** Ids already handed on this session. */
const handed = new Set<string>();

/** Hear each gift the checker gave, once per id (welcome before daily). Returns the unsubscribe. */
export function onVipGift(fn: (g: VipGift) => void): () => void {
  giftListeners.add(fn);
  for (const g of unheard.splice(0)) hand(g);
  return () => void giftListeners.delete(fn);
}

/** Gifts given before the cap was known (the config not read yet), handed on once it is. */
const capWait: VipGift[] = [];
let capHeard: (() => void) | null = null;

function hand(g: VipGift): void {
  if (helpers.cap() === null) {
    capWait.push(g);
    capHeard ??= helpers.onChange(() => {
      if (helpers.cap() === null) return;
      capHeard?.();
      capHeard = null;
      for (const w of capWait.splice(0)) hand(w);
    });
    return;
  }
  if (!giftListeners.size) {
    unheard.push(g);
    return;
  }
  for (const fn of [...giftListeners]) {
    try {
      fn(g);
    } catch (err) {
      console.warn("[vip] a gift listener failed:", err);
    }
  }
}

const whole = (x: unknown): number | null => (typeof x === "number" && Number.isInteger(x) && x >= 0 ? x : null);

/** Each helper's number in a gift's record; null when `all` and one is missing. */
function counts(r: unknown, all: boolean): Partial<Record<HelperKind, number>> | null {
  const o = (r ?? {}) as Record<string, unknown>;
  const out: Partial<Record<HelperKind, number>> = {};
  for (const k of KINDS) {
    const n = whole(o[k]);
    if (n !== null) out[k] = n;
    else if (all) return null;
  }
  return out;
}

/** One gift of the checker's answer, as the game reads it (its size from the preview `date`'s); null when it is not the shape. */
function giftOf(x: unknown, date: string): VipGift | null {
  const g = (x ?? {}) as Record<string, unknown>;
  if ((g.kind !== "daily" && g.kind !== "welcome") || typeof g.id !== "string" || !g.id) return null;
  const got = counts(g.got, true);
  if (!got) return null;
  const p = g.kind === "daily" ? gifts.get(date) : welcomePreview;
  const after = counts(g.after, false) ?? {};
  const day = whole(g.day);
  return {
    kind: g.kind,
    id: g.id,
    gift: p ? sizes(helpersOf(p, true)) : sizes(got),
    got: sizes(got),
    ...(Object.keys(after).length ? { after } : {}),
    ...(g.kind === "daily" && day !== null ? { day } : {}),
  };
}

let gifting = false;
let giftFails = 0;
let giftRetry: (() => void) | null = null;
/** The dates asked this session (once a date: the checker's key makes a second ask give nothing). */
const asked = new Set<string>();
/** The channel's checker does not know the gifts (an older one): asked no more this session. */
let giftUnknown = false;

/** Ask the checker for the day's gifts, once a date a session, once the preview says the day's bonus would apply. */
function askGift(date: string): void {
  if (!framed || giftUnknown || asked.has(date) || gifting) return;
  asked.add(date);
  giftFails = 0;
  giftLater(0, date);
}

function giftLater(ms: number, date: string): void {
  giftRetry?.();
  giftRetry = whenDue(ms, () => {
    giftRetry = null;
    void askGiftNow(date);
  });
}

async function askGiftNow(date: string): Promise<void> {
  if (!framed || gifting) return;
  if (held() > 0) return giftLater(held(), date);
  gifting = true;
  let again = false;
  try {
    await gem.awaitIdentity(10_000);
    // the welcome's size, for the card, should the welcome come with the day's gift
    if (!welcomePreview) welcomePreview = await previewRecipe(IDS.rewards.vipWelcome.id);
    const a = (await gem.functions.invoke({ v: 1, what: "vip_gift" })).json() as Record<string, unknown>;
    if (a.status === "retry") throw new Error(`the checker answered retry ${String(a.reason ?? "")}`);
    if (a.status !== "vip_gift") {
      // the channel's checker predates the gifts: nothing to ask of it this session
      giftUnknown = true;
      console.warn(`[vip] the checker here gives no VIP gifts (it answered ${String(a.status)} ${String(a.reason ?? "")})`);
      return;
    }
    const on = typeof a.today === "string" ? a.today : date;
    const list = (Array.isArray(a.gifts) ? a.gifts : []).map((x) => giftOf(x, on)).filter((g): g is VipGift => !!g && !handed.has(g.id));
    list.sort((x, y) => (x.kind === y.kind ? 0 : x.kind === "welcome" ? -1 : 1));
    if (list.length) void import("./helpers").then((m) => m.helpers.refresh());
    for (const g of list) {
      handed.add(g.id);
      hand(g);
    }
    // a run failed after another landed: ask again on the growing wait (nothing is given twice)
    again = typeof a.again === "string";
    if (!again) giftFails = 0;
  } catch (err) {
    paced(err);
    console.warn(`[vip] the gifts could not be asked: ${noAnswer(err) ? "no answer" : refusalOf(err)}`);
    again = true;
  } finally {
    gifting = false;
  }
  if (again) giftLater(backoff(++giftFails, 5000), date);
}
