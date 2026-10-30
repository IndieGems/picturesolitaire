// CARRY ON WHERE YOU LEFT OFF (GSR-014; the creator chose "Yes, offer to resume"). The Arcade
// ends a parked session after about five minutes, and the level in play went with it. Gameplay's
// src/game/in-hand.ts now keeps the level in hand in the player's save; this is the screens' side.
//
//   at boot     the level kept last time (keptBoard: a save read, never waited on by home), as a
//               play the game can open again: a campaign level the player has reached, the day's
//               daily (that day only, by the platform's date), a challenge, a Souvenir, an event's
//               level (a VIP's: VIP ended since lets it go); and only
//               while it is still dealt as it was (fits). Anything else is let go (dropInHand).
//   the offer   a small card over home once it is up with nothing over it (as a friend's challenge
//               waits, app.ts): "Carry on?", where the level is ("Level 27 · Japan"), "It's just as
//               you left it.", Continue (amber) and Not now. Not now keeps it: Next stop (or the
//               Daily tile, the Souvenir tile) carries the same level on, as Back to home keeps the
//               level in hand within a session (the lead's Option A, 2026-10-29).
//   opening     app.ts opens a carried play with openBoard's `resume` (its whole line replayed:
//               moves, time, stacks, a shuffle's mix) and keeps every board that may be carried on
//               (keepInHand). Opening any other level lets this one go, as the screens keep only
//               one level in hand.

import { dropInHand, fits, keptBoard, type InHand, type KeptPlay } from "../game/in-hand";
import { loadDaily, loadEventLevel, loadLevel, loadSouvenir, type Level } from "../game/levels";
import { loadChallenges } from "./challenge-data";
import { today } from "../net/daily";
import { campaignNext } from "../net/progress";
import { isVip, onVipChange, vipKnown } from "../net/vip";
import { eventShown } from "./event-switch";
import { liveText, t } from "./i18n";
import type { Play } from "./app";

/** A level kept last time, ready to carry on: the play that opens it, its record, and where it is in words. */
export interface CarryOn {
  play: Play;
  kept: InHand;
}

/** The longest the read is waited for when the player presses a way into a level before it lands. */
export const CARRY_WAIT_MS = 1500;

/** The play a kept record names, as this game has it now; null (and the record let go) when it no longer fits. */
export async function carryOnFrom(kept: InHand | null): Promise<CarryOn | null> {
  if (!kept) return null;
  const found = await playOf(kept.play).catch(() => undefined);
  // no answer (the level's chunk would not load): keep the record for the next session
  if (found === undefined) return null;
  if (!found || !fits(kept, found.level)) {
    dropInHand();
    return null;
  }
  return { play: found.play, kept };
}

/** Read the slot and resolve it: the boot's one call. */
export async function readCarryOn(): Promise<CarryOn | null> {
  return carryOnFrom(await keptBoard());
}

/** The play and level a kept play names; null when the game has no such level any more (or not today). */
async function playOf(p: KeptPlay): Promise<{ play: Play; level: Level } | null> {
  if (p.kind === "campaign") {
    // a level the player has reached (the campaign goes round past its last board, as Next stop does)
    if (p.level > campaignNext()) return null;
    const level = await loadLevel(p.level);
    return { play: { kind: "campaign", level: p.level }, level };
  }
  if (p.kind === "daily") {
    // the day's daily only, by the platform's date: yesterday's is let go
    const [day, d] = await Promise.all([today(CARRY_WAIT_MS), loadDaily(p.date)]);
    if (!d || day.date !== p.date) return null;
    return { play: { kind: "daily", d }, level: d };
  }
  if (p.kind === "challenge") {
    const c = (await loadChallenges()).find((x) => x.id === p.id);
    return c ? { play: { kind: "challenge", c }, level: c.level } : null;
  }
  if (p.kind === "event") {
    // a VIP's alone (docs/vip.md): VIP ended since, the level is let go; no word on VIP yet (offline,
    // slow), it is kept for the next session
    if (!(await vipHeard(CARRY_WAIT_MS))) throw new Error("no word on VIP yet");
    if (!eventShown()) return null;
    const e = await loadEventLevel(p.id);
    return e ? { play: { kind: "event", e }, level: e } : null;
  }
  const s = await loadSouvenir(p.trip);
  return s ? { play: { kind: "souvenir", s }, level: s } : null;
}

/** The server's word on VIP has landed, or says yes already (the dev menu's Pretend too): true; `ms` went by without it: false. */
function vipHeard(ms: number): Promise<boolean> {
  if (vipKnown() || isVip()) return Promise.resolve(true);
  return new Promise((done) => {
    const timer = setTimeout(() => {
      off();
      done(vipKnown());
    }, ms);
    const off = onVipChange(() => {
      clearTimeout(timer);
      off();
      done(true);
    });
  });
}

/** The play a board is kept as, when it may be carried on to another session; null for the rest. */
export function keptPlayOf(p: Play, guiding: boolean): KeptPlay | null {
  if (p.practice) return null; // the dev menu's: nothing saved
  if (p.kind === "campaign") return guiding ? null : { kind: "campaign", level: p.level };
  if (p.kind === "daily") return { kind: "daily", date: p.d.date };
  if (p.kind === "challenge") return { kind: "challenge", id: p.c.id };
  if (p.kind === "souvenir") return { kind: "souvenir", trip: p.s.trip };
  if (p.kind === "event") return { kind: "event", id: p.e.id };
  return null; // a lesson, a friend's one-off, an experiment
}

/** The offer's card: "Carry on?", where, "It's just as you left it.", Continue and Not now. */
export function carryOnCard(where: string, go: () => void, later: () => void, closeKey: HTMLButtonElement): HTMLElement {
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = ""): HTMLElementTagNameMap[K] => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  };
  const button = (cls: string, press: string, key: string, fn: () => void): HTMLButtonElement => {
    const b = el("button", `btn ${cls}`);
    b.type = "button";
    b.dataset.press = press;
    b.append(liveText(el("span"), key));
    b.addEventListener("click", fn);
    return b;
  };
  const card = el("div", "card resume-card");
  const head = liveText(el("h2"), "resume.title");
  const line = el("p", "resume-where");
  line.textContent = where;
  const why = liveText(el("p", "resume-why"), "resume.why");
  const row = el("div", "row");
  row.append(button("", "resume.later", "resume.later", later), button("amber next", "resume.continue", "resume.continue", go));
  card.append(closeKey, head, line, why, row);
  card.setAttribute("aria-label", t("resume.title"));
  return card;
}
