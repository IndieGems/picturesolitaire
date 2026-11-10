// WHO IS VIP, the server's word (the creator, 2026-10-30; docs/vip.md), and VIP'S GIFTS. Gem Arcade
// VIP is the Arcade's own pass; the game never sells or describes it. The win checker decides who
// holds it (functions/checker/src/vip.rs) and this file only repeats its answer, for the screens to
// draw from. The server never takes this file's word for anything.
//
// VIP GIVES HELPERS, it does not make them free (the creator, 2026-11-01, after Jade Match): a VIP's
// uses spend stock like anyone's. The checker pays the gifts ({"v":1,"what":"vip_gift"},
// functions/checker/src/gift.rs): on the player's own date the day's gift (VIP_DAILY, 2 helpers by the
// day of their week, Monday first) once a date, and the welcome (VIP_WELCOME) once a membership, both
// clamped at the cap. It is asked when the server's word turns VIP on (at boot, after a purchase or a
// sign-in, the dev pretend), and whenever the SDK's pass reading changes while it says VIP (which also
// catches a new day on resume); what it paid goes to onVipGift's listeners, once per gift, and the
// stock is read again. Asking pays nothing twice: each gift's order has its own nonce.
//
// VIP is the Arcade's pass `vip` (on sale since 2026-11-01). The checker asks the platform which
// passes the player holds (SDK 19.0.0) and answers `vip: true | false`; when the platform could not
// say, its answer carries no `vip`, and isVip() keeps what it had. The browser's own pass reading
// (gem.me.passes) is never taken as VIP: it only says when to ask the checker again.
// On dev, a build with the dev menu can PRETEND (the creator's and QA's "Pretend I'm VIP"):
// pretendVip(true) adds `pretend_vip: true` to every call this game makes to the checker, and the
// checker honours it on the dev channel only. A release build carries none of the pretend
// (import.meta.env.MODE, as the dev menu), and the checker refuses it off dev whatever is sent.
//
//   isVip()             the last answer: false until the server's word lands this session
//   vipKnown()          the server's word has landed
//   onVipChange(fn)     hear each change (fn(isVip())); returns the unsubscribe
//   recheckVip()        ask the checker again, fresh (UI's vip-view after a purchase or a sign-in,
//                       and the pass listener below): calls close together cost one read
//   pretendVip(on)      the dev menu's toggle: isVip() follows at once, then the server's word
//   pretending()        the toggle's state, for the menu
//   vipFields()         what a call to the checker carries for it (claims.ts, suitcase.ts)
//   onVipGift(fn)       hear each gift the checker paid (welcome before daily), once per id; one paid
//                       before anything listens is handed to the first listener. Returns the unsubscribe
//   VIP_WELCOME, VIP_DAILY, VIP_WELCOME_SIZE, VIP_DAILY_SIZE   the gifts' sizes (src/net/helper-ids.json,
//                       the copy the checker compiles in), for the screens' words
//   vipExtraCoins(base), vipHelpers(gift), VIP_HELPER_FACTOR, VIP_EXTRA_GAME_PAYS   THE VIP EXTRA's
//                       previews (the creator, 2026-11-10: +50% Coins, double helpers), from
//                       src/net/vip-extra.json, the copy the checker pays from (below)
//
// The checker is asked at boot (the events read, src/net/suitcase.ts, says VIP; with the events off,
// loadVip asks), again when the toggle moves, by recheckVip, and an answer that asked says too (`vip`
// on it, heardVip()). The SDK re-reads the player's passes after a store purchase, on resume, after a
// sign-in and when a held pass ends, while something listens (gem.me.passes.on("changed")): loadVip
// listens, and a reading that differs from the checker's last word (or none yet) asks the checker
// again. A read with no answer is asked again on a wait that grows (src/net/pace.ts). Unframed (a
// plain tab, the play-test tool) there is no server: isVip() is the toggle.

import { gem } from "../gem";
import { noAnswer, refusalOf } from "./no-answer";
import { backoff, heard as paced, held, whenDue } from "./pace";
import { readChoices } from "../ui/choices";
import HELPERS from "./helper-ids.json";
import type { HelperKind } from "./helpers";
import IDS from "./suitcase-ids.json";
import RULE from "./vip-extra.json";

/** Framed by the platform: another origin's frame (as src/net/helpers.ts). */
const framed = ((): boolean => {
  if (window.self === window.top) return false;
  try {
    return window.parent.location.origin !== location.origin;
  } catch {
    return true;
  }
})();
/** The pretend exists only in a build with the dev menu. */
const CAN_PRETEND = import.meta.env.MODE !== "release";

let vip = false;
let known = false;
let pretend = false;
let reading = false;
let fails = 0;
let again: (() => void) | null = null;
const listeners = new Set<(vip: boolean) => void>();

/** The server's last word this session (null: none yet), apart from the pretend's own. */
let serverSaid: boolean | null = null;

function set(next: boolean, fromServer: boolean): void {
  if (fromServer) {
    known = true;
    const was = serverSaid;
    serverSaid = next;
    // the server's word turns VIP on (the first word, a purchase, a sign-in, the pretend): its gifts
    if (next && was !== true) askGift();
  }
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
export const pretending = (): boolean => CAN_PRETEND && pretend;

/** Hear each change of isVip(). Returns the unsubscribe. */
export function onVipChange(fn: (vip: boolean) => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** What a call to the checker carries: the dev pretend, when it is on (nothing in a release build). */
export function vipFields(): { pretend_vip?: true } {
  return CAN_PRETEND && pretend ? { pretend_vip: true } : {};
}

/** A checker answer that says (`vip`: true or false): the server's word. claims.ts and suitcase.ts pass each one here. */
export function heardVip(answer: Record<string, unknown>): void {
  if (typeof answer.vip === "boolean") set(answer.vip, true);
}

async function read(): Promise<void> {
  if (!framed || reading) return;
  if (held() > 0) return later(held());
  reading = true;
  askAgain = false;
  again?.();
  again = null;
  let ok = false;
  try {
    await gem.awaitIdentity(10_000);
    await vipReady(); // a recheck at boot carries the dev pretend kept from last time, as the first read does
    const a = (await gem.functions.invoke({ v: 1, what: "vip", ...vipFields() })).json() as Record<string, unknown>;
    // no `vip`: the platform could not say ("retry"), so what isVip() says stands, and we ask later
    if (typeof a.vip !== "boolean") throw new Error(`the checker answered ${String(a.status)} ${String(a.reason ?? "")}`);
    fails = 0;
    ok = true;
    set(a.vip, true);
  } catch (err) {
    paced(err);
    console.warn(`[vip] could not be read: ${noAnswer(err) ? "no answer" : refusalOf(err)}`);
    later(backoff(++fails, 5000));
  } finally {
    reading = false;
  }
  // asked again while this read was out: it may have left before a purchase landed, so once more
  // (a failed read has its own wait already, which reads fresh)
  if (askAgain && ok) recheckVip();
}

/** A recheck asked while a read was out. */
let askAgain = false;
/** The gather a recheck waits in, so calls close together (the sheet's answer, the pass listener) cost one read. */
let gather: number | undefined;
const GATHER_MS = 1000;

/**
 * Ask the checker again, fresh: after a purchase or a sign-in (src/ui/vip-view.ts), and when the
 * player's passes change (loadVip's listener). Never a cached answer; one read for calls within
 * GATHER_MS; one more after a read already out; through src/net/pace.ts (never while hidden, never
 * inside the platform's wait). The doors follow the answer (isVip, onVipChange), never this call.
 */
export function recheckVip(): void {
  if (!framed) return;
  if (reading) {
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

let listening = false;
/** Hear the SDK's pass reads: a reading that differs from the checker's last word (or none yet) asks it again. It decides nothing. */
function listen(): void {
  if (listening || !framed) return;
  listening = true;
  try {
    gem.me.passes.on("changed", (passes) => {
      const says = passes.some((p) => p.pass === "vip" && p.held);
      if (!known || says !== vip) recheckVip();
      // a new membership, a renewal or a new day while VIP: its gifts (asked only once the server says VIP)
      if (says) askGift();
    });
  } catch (err) {
    console.warn(`[vip] the pass listener could not be attached: ${refusalOf(err)}`);
  }
}

function later(ms: number): void {
  again?.();
  again = whenDue(ms, () => {
    again = null;
    void read();
  });
}

let ready: Promise<void> | null = null;
/**
 * The dev menu's pretend as kept last time (the "devVip" choice, from the one shared read of the
 * player's choices: no call of its own), restored before the first read and the first claim, so it
 * goes with them and nothing is asked twice. At once in a release build.
 */
export function vipReady(): Promise<void> {
  // never more than 3 s: the claims wait on it, and a read with no answer must not hold them
  ready ??= !CAN_PRETEND || !framed
    ? Promise.resolve()
    : Promise.race([
        readChoices()
          .then((m) => {
            if (m.get("devVip") === "1" && !pretend) {
              pretend = true;
              set(true, false);
            }
          })
          .catch(() => {}),
        new Promise<void>((r) => setTimeout(r, 3000)),
      ]);
  return ready;
}

/**
 * Ask the checker. Call once, at boot (src/net/progress.ts's loadProgress starts it). While the
 * events are on (src/net/suitcase-ids.json), their read at boot says VIP too (src/net/suitcase.ts,
 * loadSuitcase), so this asks nothing of its own: one call where there were two.
 */
export function loadVip(): void {
  listen();
  if ((IDS as { on?: boolean }).on === true) return;
  void vipReady().then(() => read());
}

/**
 * The dev menu's "Pretend I'm VIP". isVip() follows at once (and onVipChange fires); framed, the
 * checker is asked again and its word stands: yes on the dev channel, no anywhere else.
 */
export async function pretendVip(on: boolean): Promise<void> {
  if (!CAN_PRETEND) return;
  pretend = on;
  set(on, false);
  if (!framed) return;
  fails = 0;
  await read();
}

// ------------------------------------------------------------------ VIP's gifts

type Sizes = Readonly<Record<HelperKind, number>>;
const KINDS: readonly HelperKind[] = ["hint", "undo", "shuffle"];
const sizes = (g: Partial<Record<HelperKind, number>> | undefined): Sizes =>
  Object.freeze({ hint: g?.hint ?? 0, undo: g?.undo ?? 0, shuffle: g?.shuffle ?? 0 });
const total = (g: Sizes): number => KINDS.reduce((n, k) => n + g[k], 0);

/** The welcome gift, once a membership (3 Hints, 2 Undos, 3 Shuffles). */
export const VIP_WELCOME: Sizes = sizes(HELPERS.vip.welcome);
/** The welcome's helpers in all (8). */
export const VIP_WELCOME_SIZE: number = total(VIP_WELCOME);
/** The day's gift by the day of the player's week, Monday first (7 of them). */
export const VIP_DAILY: readonly Sizes[] = Object.freeze(HELPERS.vip.daily.map((g) => sizes(g)));
/** One day's helpers (2; the largest day's, should the days ever differ). */
export const VIP_DAILY_SIZE: number = Math.max(...VIP_DAILY.map(total));

export type VipGiftKind = "daily" | "welcome";
export interface VipGift {
  kind: VipGiftKind;
  /** The payment's own id (the daily's "vip:<date>", the welcome's "vip-welcome:<end day>"): a gift heard twice shows once. */
  id: string;
  /** The gift's size, before the cap (0 for a helper it has none of). */
  gift: Sizes;
  /** What reached the stock after the cap: got[k] < gift[k] means the cap clamped it. */
  got: Sizes;
  /** The counts just after paying, for the kinds the platform's receipt named. */
  after?: Partial<Record<HelperKind, number>>;
  /** The daily's day of the player's week, Monday 1 .. Sunday 7. */
  day?: number;
}

const giftListeners = new Set<(g: VipGift) => void>();
/** Paid before anything listened: handed to the first listener. */
const unheard: VipGift[] = [];
/** Ids already handed on this session. */
const handed = new Set<string>();

/** Hear each gift the checker paid, once per id (welcome before daily). Returns the unsubscribe. */
export function onVipGift(fn: (g: VipGift) => void): () => void {
  giftListeners.add(fn);
  for (const g of unheard.splice(0)) hand(g);
  return () => void giftListeners.delete(fn);
}

function hand(g: VipGift): void {
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

/** One gift of the checker's answer, as the game reads it; null when it is not the shape. */
function giftOf(x: unknown): VipGift | null {
  const g = (x ?? {}) as Record<string, unknown>;
  if ((g.kind !== "daily" && g.kind !== "welcome") || typeof g.id !== "string" || !g.id) return null;
  const gift = counts(g.gift, true);
  const got = counts(g.got, true);
  if (!gift || !got) return null;
  const after = counts(g.after, false) ?? {};
  const day = whole(g.day);
  return {
    kind: g.kind,
    id: g.id,
    gift: sizes(gift),
    got: sizes(got),
    ...(Object.keys(after).length ? { after } : {}),
    ...(g.kind === "daily" && day !== null ? { day } : {}),
  };
}

let gifting = false;
let giftAgain = false;
let giftFails = 0;
let giftRetry: (() => void) | null = null;
let giftGather: number | undefined;
/** The channel's checker does not know the gifts (an older one): asked no more this session. */
let giftUnknown = false;

/**
 * Ask the checker for VIP's gifts, once the server says VIP (never on the browser's word): one ask
 * for calls within GATHER_MS, one more after an ask already out, through src/net/pace.ts.
 */
function askGift(): void {
  if (!framed || giftUnknown) return;
  if (gifting) {
    giftAgain = true;
    return;
  }
  if (giftGather !== undefined) return;
  giftGather = window.setTimeout(() => {
    giftGather = undefined;
    giftFails = 0;
    giftLater(0);
  }, GATHER_MS);
}

function giftLater(ms: number): void {
  giftRetry?.();
  giftRetry = whenDue(ms, () => {
    giftRetry = null;
    void askGiftNow();
  });
}

async function askGiftNow(): Promise<void> {
  if (!framed || gifting || serverSaid !== true) return; // not VIP (now): nothing to ask
  if (held() > 0) return giftLater(held());
  gifting = true;
  giftAgain = false;
  let again = false;
  try {
    await gem.awaitIdentity(10_000);
    const a = (await gem.functions.invoke({ v: 1, what: "vip_gift", ...vipFields() })).json() as Record<string, unknown>;
    if (a.status === "retry") throw new Error(`the checker answered retry ${String(a.reason ?? "")}`);
    if (a.status !== "vip_gift") {
      // the channel's checker predates the gifts: nothing to ask of it this session
      giftUnknown = true;
      console.warn(`[vip] the checker here pays no VIP gifts (it answered ${String(a.status)} ${String(a.reason ?? "")})`);
      return;
    }
    heardVip(a);
    const gifts = (Array.isArray(a.gifts) ? a.gifts : []).map(giftOf).filter((g): g is VipGift => !!g && !handed.has(g.id));
    gifts.sort((x, y) => (x.kind === y.kind ? 0 : x.kind === "welcome" ? -1 : 1));
    if (gifts.length) void import("./helpers").then((m) => m.helpers.refresh());
    for (const g of gifts) {
      handed.add(g.id);
      hand(g);
    }
    // an order failed after another landed: ask again on the growing wait (nothing is paid twice)
    again = typeof a.again === "string";
    if (!again) giftFails = 0;
  } catch (err) {
    paced(err);
    console.warn(`[vip] the gifts could not be asked: ${noAnswer(err) ? "no answer" : refusalOf(err)}`);
    again = true;
  } finally {
    gifting = false;
  }
  if (again) giftLater(backoff(++giftFails, 5000));
  else if (giftAgain) askGift();
}

// ------------------------------------------------------------------ the VIP extra's previews

/**
 * THE VIP EXTRA (the creator, 2026-11-10; docs/vip.md): +50% on every Coin payout and double on every
 * helper reward, for a VIP, paid by the win checker beside the base (functions/checker/src/pay.rs).
 * These are the previews UI shows BEFORE a reward is won; what landed is the verdict's (claims.ts:
 * vipExtra, vipHelpers, vipLate). One copy of the rule, src/net/vip-extra.json, read here and by the
 * checker. A coming SDK may have the Arcade tell the game its exact VIP extra (the creator): its figure
 * replaces the rule at this one seam, vipExtraCoins, as at pay.rs's vip_extra_coins, and
 * VIP_EXTRA_GAME_PAYS turns false there, so a VIP is never paid twice.
 */

/** The VIP extra on one Coin payout of `base`: ceil(base / 2), so 25 shows +13, 50 +25, 100 +50. Per payout: a board with two grants adds each one's. */
export function vipExtraCoins(base: number): number {
  const b = Math.max(0, Math.floor(Number(base) || 0));
  return Math.ceil((b * RULE.coins.num) / RULE.coins.den);
}

/** Each helper reward is multiplied by this for a VIP (2: double). */
export const VIP_HELPER_FACTOR: number = RULE.helpers;

/** What a VIP gets in all of a helper reward (the kit's 3 of each shows 6 of each): `gift` times VIP_HELPER_FACTOR. The cap of 20 still clamps it when paid. */
export function vipHelpers(gift: Partial<Record<HelperKind, number>>): Record<HelperKind, number> {
  const s = sizes(gift);
  return { hint: s.hint * VIP_HELPER_FACTOR, undo: s.undo * VIP_HELPER_FACTOR, shuffle: s.shuffle * VIP_HELPER_FACTOR };
}

/** The game pays the extra itself (true now); false once the Arcade pays it (the seam above). */
export const VIP_EXTRA_GAME_PAYS: boolean = RULE.gamePays === true;
