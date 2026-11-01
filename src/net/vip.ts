// WHO IS VIP, the server's word (the creator, 2026-10-30; docs/vip.md). Gem Arcade VIP is the
// Arcade's own pass; the game never sells or describes it. The win checker decides who holds it
// (functions/checker/src/vip.rs) and this file only repeats its answer, for the screens and the
// helper buttons to draw from. The server never takes this file's word for anything.
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
import IDS from "./suitcase-ids.json";

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

function set(next: boolean, fromServer: boolean): void {
  if (fromServer) known = true;
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
