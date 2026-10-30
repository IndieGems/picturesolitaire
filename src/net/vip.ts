// WHO IS VIP, the server's word (the creator, 2026-10-30; docs/vip.md). Gem Arcade VIP is the
// Arcade's own pass; the game never sells or describes it. The win checker decides who holds it
// (functions/checker/src/vip.rs) and this file only repeats its answer, for the screens and the
// helper buttons to draw from. The server never takes this file's word for anything.
//
// The platform cannot say yet (SDK 17.0.0), so the checker answers "not VIP" on test and release.
// On dev, a build with the dev menu can PRETEND (the creator's and QA's "Pretend I'm VIP"):
// pretendVip(true) adds `pretend_vip: true` to every call this game makes to the checker, and the
// checker honours it on the dev channel only. A release build carries none of the pretend
// (import.meta.env.MODE, as the dev menu), and the checker refuses it off dev whatever is sent.
//
//   isVip()             the last answer: false until the server's word lands this session
//   vipKnown()          the server's word has landed
//   onVipChange(fn)     hear each change (fn(isVip())); returns the unsubscribe
//   pretendVip(on)      the dev menu's toggle: isVip() follows at once, then the server's word
//   pretending()        the toggle's state, for the menu
//   vipFields()         what a call to the checker carries for it (claims.ts, suitcase.ts)
//
// The checker is asked once a session (loadVip, at boot), again when the toggle moves, and every
// verdict says too (`vip` on the answer, heard()). A read with no answer is asked again on a wait
// that grows (src/net/pace.ts). Unframed (a plain tab, the play-test tool) there is no server:
// isVip() is the toggle.

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
  again?.();
  again = null;
  try {
    await gem.awaitIdentity(10_000);
    const a = (await gem.functions.invoke({ v: 1, what: "vip", ...vipFields() })).json() as Record<string, unknown>;
    if (typeof a.vip !== "boolean") throw new Error(`the checker answered ${String(a.status)} ${String(a.reason ?? "")}`);
    fails = 0;
    set(a.vip, true);
  } catch (err) {
    paced(err);
    console.warn(`[vip] could not be read: ${noAnswer(err) ? "no answer" : refusalOf(err)}`);
    later(backoff(++fails, 5000));
  } finally {
    reading = false;
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
