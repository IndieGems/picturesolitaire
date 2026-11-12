// A VIP'S GIFTS (the creator, 2026-11-01, after Jade Match's VIP chests): a VIP spends helpers like
// anyone, and gets them as gifts instead, each paid by the win checker and reported by Server's
// src/net/vip.ts (onVipGift), once per payment:
//
//   THE DAILY VIP GIFT   two helpers, a different pair each day of the week (VIP_DAILY): "Your VIP gift".
//   THE WELCOME GIFT     eight helpers (VIP_WELCOME), once per membership: "Welcome to VIP". A milestone
//                        in the game standard's sense, so a celebration: the gold rays, fireworks over the
//                        card (none under less motion) and the milestone's sound (Audio's, milestone:show).
//
// THE WELCOME CARD comes before the welcome gift's (the creator, 2026-11-02, B of two mockups: "if a VIP member
// comes from another game, not having ever played ours with the VIP tag, lets give them a welcome card telling them
// what they'll get with VIP in our game"). The welcome gift's payment is the one seam that already knows this is a
// membership's first visit (once a membership, again after a lapse), so it is the trigger: no flag of ours, nothing
// kept. "Welcome, VIP!", what VIP gives here as the boarding pass says it (vip-about.ts vipPassLines, best first,
// the welcome gift left to its own card), then "Let's play!" (the gift card at once all the same, then the next
// level, as home's Next stop opens it, once it closes: nobody waits for their gift; it was "Show me the events!"
// until the events opened to everyone, 2026-11-10) or "Later" (the gift card at once, then home; Back and Escape
// too). The calm one: the rays, no fireworks, no sound
// (the gift card's milestone is the one celebration). Only what the game gives: no price, never "free", nothing of
// the Arcade's own perks, no other game named.
//
// Each is a card of its own over home, after anything else home's boot shows (the friend's challenge,
// Carry on?, an achievement or an event caught up: app.ts's `ready`), the welcome first when both came.
// The card shows what came (Art's helper pictures, "+2 Hints"), then each helper flies into its counter
// on the card ("Your helpers", the stock after: Server's `after`, else the stock as read), which ticks up
// as it lands. A helper the cap clamped says so plainly under them ("Your Hints were full."), and only
// what landed flies. The card is information (glass); its one button carries on.
//
// It survives a quick tap: a gift waits here until home can take it (a player who left home first sees
// it on coming back), the button takes no press in the card's first moments (a tap meant for what was
// under it), and a press while the helpers fly lands them all at once instead of closing. Nothing here
// is kept between sessions: the checker pays once, and Server says so once (each `id` once a session).

import { emit } from "../events";
import { closed, opened } from "./dialogs";
import { fireworks } from "./fireworks";
import { helperPic } from "./helper-shop";
import { t } from "./i18n";
import { KINDS, type HelperKind } from "./stock";
import { vipGiftSizes, vipTag } from "./vip-tag";
import { vipPassLines } from "./vip-about";
import type { VipGift } from "../net/vip";

export type { VipGift };

interface Opts {
  /** Home is up with nothing over it and nothing of the boot's still to come. */
  ready: () => boolean;
  /** The card went up, or went away (the app's other cards wait while it is up). */
  changed?: (up: boolean) => void;
  /** The player's stock of a helper now (stock.ts). */
  count: (k: HelperKind) => number;
  /** Hear the stock change (stock.ts onChange); returns the unsubscribe. */
  onStock: (fn: () => void) => () => void;
  /** The most of one helper a player can carry (HELPER_CAP). */
  cap: number;
  /** The welcome card's "Let's play!": the next level, as home's Next stop opens it. */
  play: () => void;
}

/** A gift waits this long once home can take it, so whatever else home's boot shows comes first. */
const BEAT_MS = 900;
/** While home cannot take it, it looks again this often (no network: the app's own state). */
const AGAIN_MS = 1500;
/** The button takes no press for this long after the card goes up (a tap meant for what was under it). */
const HOLD_MS = 600;
/** The first helper leaves its tile this long after the card goes up (the card's and the tiles' entrance). */
const FLY_AT_MS = 750;
/** Between one helper's flight and the next. */
const FLY_GAP_MS = { daily: 220, welcome: 140 } as const;
const FLY_MS = 620;

const lessMotion = (): boolean =>
  document.documentElement.classList.contains("less-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** Whole, at least 0 and at most `cap`. */
const whole = (n: unknown, cap = Infinity): number => Math.min(cap, Math.max(0, Math.floor(Number(n) || 0)));

export function createVipGifts(o: Opts) {
  const veil = el("div", "veil vip-gift");
  veil.hidden = true;
  veil.setAttribute("role", "dialog");
  veil.setAttribute("aria-modal", "true");
  veil.setAttribute("aria-labelledby", "vip-gift-title");
  veil.setAttribute("aria-describedby", "vip-gift-sub");
  /** Waiting for home, the welcome first. */
  const pending: VipGift[] = [];
  /** Shown or waiting this session, by the payment's id. */
  const seen = new Set<string>();
  /** The welcomes whose welcome card has been shown, by the payment's id. */
  const welcomed = new Set<string>();
  let timer = 0;
  /** The welcome card's "Let's play!" was pressed: the next level once the gifts' cards close. */
  let toPlay = false;
  /** The card up now: lands its helpers at once, and takes it down. */
  let current: { land(): void; landed(): boolean; stop(): void } | null = null;

  function close(): void {
    if (veil.hidden) return;
    current?.land();
    current?.stop();
    current = null;
    veil.hidden = true;
    veil.replaceChildren();
    closed(veil);
    o.changed?.(false);
    if (toPlay) {
      // the welcome card's "Let's play!": the gifts that came with it (the day's) at once, then the next level
      const next = pending.shift();
      if (next) return show(next);
      toPlay = false;
      return o.play();
    }
    // the next (the day's, after the welcome) after a beat of home
    poke();
  }

  /** The welcome card, before the welcome gift's: what VIP gives here, then play on or the gift. */
  function welcomeCard(g: VipGift): void {
    welcomed.add(g.id);
    const openedAt = performance.now();
    const card = el("div", "card vip-gift-card welcome vg-hello");
    const rays = el("div", "vg-rays");
    rays.setAttribute("aria-hidden", "true");
    const tag = vipTag("big", true);
    tag.setAttribute("aria-hidden", "true");
    const head = el("h2", "vg-title", t("vip.welcome.title"));
    head.id = "vip-gift-title";
    const perks = el("div", "vg-perks");
    const line = el("p", "vg-line", t("vip.welcome.line"));
    line.id = "vip-gift-sub";
    perks.append(line, vipPassLines(false));
    const go = el("button", "btn amber next vg-go", t("vip.welcome.play"));
    go.type = "button";
    go.dataset.press = "vipWelcome.play";
    const later = el("button", "btn vg-later", t("vip.welcome.later"));
    later.type = "button";
    later.dataset.press = "vipWelcome.later";
    /** On to the gift's card, now. */
    const toGift = () => {
      closed(veil);
      show(g);
    };
    go.addEventListener("click", () => {
      // a tap meant for what was under it
      if (performance.now() - openedAt < HOLD_MS) return;
      // the gift first all the same, then the next level once it closes
      toPlay = true;
      toGift();
    });
    later.addEventListener("click", () => {
      if (performance.now() - openedAt >= HOLD_MS) toGift();
    });
    card.append(rays, tag, head, perks, go, later);
    veil.replaceChildren(card);
    veil.hidden = false;
    // Back and Escape: Later, so the gift is never lost
    opened(veil, toGift);
    o.changed?.(true);
  }

  function show(g: VipGift): void {
    const welcome = g.kind === "welcome";
    if (welcome && !welcomed.has(g.id)) return welcomeCard(g);
    const kinds = KINDS.filter((k) => whole(g.gift[k]) > 0);
    const got = (k: HelperKind) => whole(g.got[k], whole(g.gift[k]));
    /** Each counter's last number: the stock after (Server's, else as read), from it less what landed. */
    const to: Record<HelperKind, number> = { undo: 0, hint: 0, shuffle: 0 };
    const at: Record<HelperKind, number> = { undo: 0, hint: 0, shuffle: 0 };
    for (const k of KINDS) {
      to[k] = whole(g.after?.[k] ?? o.count(k), o.cap);
      at[k] = Math.max(0, to[k] - got(k));
    }

    const card = el("div", `card vip-gift-card${welcome ? " welcome" : ""}`);
    if (welcome) {
      const rays = el("div", "vg-rays");
      rays.setAttribute("aria-hidden", "true");
      card.append(rays);
    }
    const tag = vipTag("big member");
    tag.querySelector(".vip-lock")?.remove();
    tag.setAttribute("aria-hidden", "true");
    const head = el("h2", "vg-title", t(welcome ? "vipGift.welcomeTitle" : "vipGift.dailyTitle"));
    head.id = "vip-gift-title";
    const total = kinds.reduce((n, k) => n + whole(g.gift[k]), 0);
    const sub = el("p", "vg-sub", welcome ? t("vipGift.welcomeSub", { count: total }) : t("vipGift.dailySub"));
    sub.id = "vip-gift-sub";

    // what came: a tile per helper in it, its picture and "+2 Hints" (or "Full", the cap's)
    const tiles = el("div", "vg-gift");
    const tileOf: Partial<Record<HelperKind, HTMLElement>> = {};
    kinds.forEach((k, i) => {
      const n = got(k);
      const tile = el("div", `vg-tile${n < whole(g.gift[k]) ? " clamped" : ""}${n === 0 ? " none" : ""}`);
      tile.dataset.kind = k;
      tile.style.setProperty("--i", String(i));
      const pic = el("span", "vg-pic");
      pic.append(helperPic(k, whole(g.gift[k]) >= 3 ? 3 : 1));
      tile.append(pic, el("span", "vg-n", n > 0 ? t(`win.gift.${k}`, { count: n }) : t("vipGift.fullTag")));
      tiles.append(tile);
      tileOf[k] = pic;
    });
    tiles.setAttribute("aria-label", kinds.filter((k) => got(k) > 0).map((k) => t(`win.gift.${k}`, { count: got(k) })).join(", "));
    for (const c of tiles.children) c.setAttribute("aria-hidden", "true");

    // where they go: the player's helpers, ticking up as each lands
    const have = el("div", "vg-have glass");
    have.append(el("span", "vg-have-head", t("vipGift.yours")));
    const counts = el("div", "vg-counts");
    const numOf = {} as Record<HelperKind, HTMLElement>;
    const chipOf = {} as Record<HelperKind, HTMLElement>;
    for (const k of KINDS) {
      const chip = el("span", `vg-count${to[k] >= o.cap ? " full" : ""}`);
      chip.dataset.kind = k;
      const pic = el("span", "vg-count-pic");
      pic.append(helperPic(k));
      const num = el("b", "", String(at[k]));
      chip.append(pic, num);
      chip.setAttribute("aria-hidden", "true");
      counts.append(chip);
      numOf[k] = num;
      chipOf[k] = chip;
    }
    have.append(counts);
    const sayHave = () => have.setAttribute("aria-label", `${t("vipGift.yours")}: ${KINDS.map((k) => `${t(`board.${k}`)} ${to[k]}`).join(", ")}`);
    sayHave();

    // the cap's clamp, plainly, one line per helper it clamped, then the cap once
    const notes: HTMLElement[] = [];
    for (const k of kinds) {
      const n = got(k);
      const want = whole(g.gift[k]);
      if (n >= want) continue;
      notes.push(el("p", "vg-full", n === 0 ? t(`vipGift.full.${k}`) : t(`vipGift.some.${k}`, { got: n, gift: want })));
    }
    if (notes.length) notes.push(el("p", "vg-full cap", t("vipGift.cap", { cap: o.cap })));

    const on = el("button", "btn amber next vg-on");
    on.type = "button";
    on.dataset.press = `vipGift.continue.${g.kind}`;
    on.textContent = t("vipGift.continue");

    const said = el("div", "vg-notes");
    said.append(...notes);
    card.append(tag, head, sub, tiles, have, ...(notes.length ? [said] : []), on);
    veil.replaceChildren(card);

    // ---- the flights: each helper that landed, one by one, into its counter ----
    const openedAt = performance.now();
    const timers = new Set<number>();
    const flying = new Set<Animation>();
    let left = kinds.reduce((n, k) => n + got(k), 0);
    const tick = (k: HelperKind) => {
      at[k] = Math.min(to[k], at[k] + 1);
      numOf[k].textContent = String(at[k]);
      const chip = chipOf[k];
      chip.classList.remove("grew");
      void chip.offsetWidth;
      chip.classList.add("grew");
      left = Math.max(0, left - 1);
    };
    const land = () => {
      for (const id of timers) clearTimeout(id);
      timers.clear();
      for (const a of [...flying]) a.cancel();
      flying.clear();
      document.querySelectorAll(".vg-flight").forEach((n) => n.remove());
      for (const k of KINDS) {
        at[k] = to[k];
        numOf[k].textContent = String(to[k]);
      }
      left = 0;
      card.classList.add("landed");
    };
    const fly = (k: HelperKind, delay: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        const from = tileOf[k];
        const dest = chipOf[k].querySelector(".vg-count-pic");
        if (!from || !dest || veil.hidden) return tick(k);
        const a = from.getBoundingClientRect();
        const b = dest.getBoundingClientRect();
        if (!a.width || !b.width) return tick(k);
        const ghost = el("div", "vg-flight");
        ghost.setAttribute("aria-hidden", "true");
        ghost.append(helperPic(k));
        const size = 40;
        ghost.style.left = `${a.left + a.width / 2 - size / 2}px`;
        ghost.style.top = `${a.top + a.height / 2 - size / 2}px`;
        document.body.append(ghost);
        const dx = b.left + b.width / 2 - (a.left + a.width / 2);
        const dy = b.top + b.height / 2 - (a.top + a.height / 2);
        const anim = ghost.animate(
          [
            { transform: "translate(0, 0) scale(0.7)", opacity: 0 },
            { transform: "translate(0, -16px) scale(1.15)", opacity: 1, offset: 0.22 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.75)`, opacity: 1, offset: 0.9 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.55)`, opacity: 0 },
          ],
          { duration: FLY_MS, easing: "cubic-bezier(0.45, 0, 0.3, 1)", fill: "both" },
        );
        flying.add(anim);
        anim.onfinish = () => {
          flying.delete(anim);
          ghost.remove();
          tick(k);
          if (!left) card.classList.add("landed");
        };
        anim.oncancel = () => {
          flying.delete(anim);
          ghost.remove();
        };
      }, delay);
      timers.add(id);
    };
    if (lessMotion() || !left) {
      // no flights: the counters say it, after the card's own moment
      const id = window.setTimeout(() => land(), lessMotion() ? 300 : 0);
      timers.add(id);
    } else {
      // round the kinds, one of each in turn, so every counter moves early
      let n = 0;
      const queue = kinds.map((k) => got(k));
      for (let round = 0; queue.some((q) => q > 0); round++)
        kinds.forEach((k, i) => {
          if (queue[i]! <= 0) return;
          queue[i]!--;
          fly(k, FLY_AT_MS + n++ * FLY_GAP_MS[g.kind]);
        });
    }

    // the stock read again while it is up (Server's refresh after paying): the counters take its word once landed
    const offStock = o.onStock(() => {
      for (const k of KINDS) {
        const now = whole(o.count(k), o.cap);
        if (now === to[k]) continue;
        to[k] = now;
        chipOf[k].classList.toggle("full", now >= o.cap);
        if (card.classList.contains("landed")) numOf[k].textContent = String(now);
      }
      sayHave();
    });

    on.addEventListener("click", () => {
      // a tap meant for what was under it
      if (performance.now() - openedAt < HOLD_MS) return;
      // a tap while they fly lands them all at once; the next carries on
      if (left > 0) return void land();
      close();
    });
    card.addEventListener("click", (e) => {
      if (e.target !== on && left > 0 && performance.now() - openedAt >= HOLD_MS) land();
    });

    current = {
      land,
      landed: () => left === 0,
      stop: () => {
        offStock();
        for (const id of timers) clearTimeout(id);
        timers.clear();
      },
    };
    veil.hidden = false;
    opened(veil, close);
    o.changed?.(true);
    if (welcome) {
      // the milestone's own sound (Audio's), and fireworks over the card (none under less motion)
      emit("milestone:show", { id: "vipWelcome" });
      requestAnimationFrame(() => !veil.hidden && fireworks(card, 6, 3000));
    }
  }

  /** Show the next gift once home can take it: after a beat, so the boot's own cards come first. */
  function poke(): void {
    if (!pending.length || !veil.hidden || timer) return;
    timer = window.setTimeout(() => {
      timer = 0;
      if (!pending.length || !veil.hidden) return;
      if (document.hidden) return void document.addEventListener("visibilitychange", poke, { once: true });
      if (!o.ready()) {
        timer = window.setTimeout(() => {
          timer = 0;
          poke();
        }, AGAIN_MS);
        return;
      }
      show(pending.shift()!);
    }, BEAT_MS);
  }

  function take(g: VipGift): void {
    pending.push(g);
    // the welcome before the day's
    pending.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "welcome" ? -1 : 1));
    poke();
  }

  return {
    veil,
    /** A gift the checker paid (Server's onVipGift). One that paid nothing, or heard before, is left out. */
    add(g: VipGift): void {
      if (!g || (g.kind !== "daily" && g.kind !== "welcome") || seen.has(g.id)) return;
      if (!KINDS.some((k) => whole(g.gift?.[k]) > 0)) return;
      seen.add(g.id);
      // the welcome card says VIP's gifts by the preview's sizes: asked now, while the card waits for home
      if (g.kind === "welcome") vipGiftSizes();
      take(g);
    },
    /** The screen changed: a waiting gift may come now. */
    poke,
    /** Whether a gift's card is up. */
    up: (): boolean => !veil.hidden,
    /** Dev only: show `g` as it comes, again and again (the seen list skipped). */
    preview(g: VipGift): void {
      take(g);
    },
  };
}
