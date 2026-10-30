// AN EVENT FINISHED (docs/vip.md, the creator, 2026-10-30): the 10th item packed wins the event's prize,
// its table and its Passport stamp (its Coins come with each item found, 50 at a time: the Arcade pays at
// most 100 at once), and that is the game standard's biggest celebration: a card of its own, fireworks
// over it (none under less motion) and its sound (Audio's milestone, on milestone:show "event"), the
// event's name, the table won, the last item's "+50" with the Arcade's coin, and the
// event's stamp landing on the card as the passport's trip stamps do (the same thud and sparkle, and
// trip:stamp, for the same thump, as it lands). Continue carries on; See your passport opens its Event
// stamps page.
//
// It survives a quick tap (as the unlock card does, unlock.ts): a finished event waits here until the app
// says the screen can take it (`ready`), and the app asks again (poke) whenever its screen changes. On the
// level's win card it comes up once the 10th item has flown into the suitcase, in the card's place (the
// win card waits under it); a prize that landed after the player left the card (the checker slow, the
// game reopened) comes up on the next screen that can take it. Each event once a session: the checker's
// word may be heard twice.
//
// The prize is the platform's (Server's src/net/suitcase.ts): this card says what landed, never decides it.
// Information is glass; its two buttons carry on.

import { emit } from "../events";
import { coinIcon } from "./coin";
import { closed, opened } from "./dialogs";
import { fireworks } from "./fireworks";
import { locale, named, t } from "./i18n";
import { eventStamp, sparkles } from "./passport";
import { eventTitle } from "./suitcase";
import { EVENT_ITEM_COINS, eventNamed, eventPrize, suitcases } from "./suitcase-data";
import { BUILT_IN_TABLE, knownTable, thumbOf } from "./tables";

interface Opts {
  /** Whether the screen can take the card now (no play in hand, no finish running, no other card up). */
  ready: () => boolean;
  /** The card went up, or went away. */
  changed?: (up: boolean) => void;
  /** See your passport: its Event stamps page. */
  passport: () => void;
}

/** What one finish shows: the event, its table (when one landed), and the Coins it paid. */
export interface Finished {
  event: string;
  /** The table's slug, when the platform gave it now (absent: already held, or the event has none). */
  table?: string;
  /** The last item's Coins as paid (50 when not said). */
  coins?: number;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

const lessMotion = () => document.documentElement.classList.contains("less-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
/** The stamp comes down once the card has settled, as on a passport page (passport.ts: 300 ms down). */
const STAMP_AFTER_MS = 650;
const LAND_MS = 300;

export function createEventFinish(opts: Opts) {
  const veil = el("div", "veil event-finish");
  veil.hidden = true;
  veil.setAttribute("role", "dialog");
  veil.setAttribute("aria-modal", "true");
  const pending: Finished[] = [];
  const seen = new Set<string>();
  let timers: number[] = [];
  const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

  function close(then?: () => void): void {
    if (veil.hidden) return;
    for (const id of timers) clearTimeout(id);
    timers = [];
    veil.hidden = true;
    veil.replaceChildren();
    closed(veil);
    opts.changed?.(false);
    then?.();
    poke();
  }

  function show(f: Finished): void {
    const ev = eventNamed(f.event);
    const theme = ev ? eventTitle(ev) : "";
    const pack = suitcases.get(f.event);
    const won = eventPrize(f.event);
    const card = el("div", "card finish-card");
    // the stamp's place, and the stamp coming down into it
    const spot = el("div", "finish-spot");
    spot.setAttribute("aria-hidden", "true");
    // what was won: the table (when it landed now), and the Coins with the Arcade's coin
    const prize = el("div", "finish-prize");
    // the table is said only once the platform gave it now (the verdict's items), as every reward on a card is
    const slug = f.table;
    const art = slug && slug !== BUILT_IN_TABLE ? knownTable(slug) : undefined;
    if (slug && art) {
      const item = el("div", "finish-row glass");
      const img = el("img", "finish-table");
      Object.assign(img, { src: thumbOf(art), alt: "", draggable: false, decoding: "async" });
      item.append(img, el("span", "", t("case.tableName", { table: named(`table.${slug}`, won?.tableTitle ?? art.title) })));
      prize.append(item);
    }
    const coins = f.coins && f.coins > 0 ? f.coins : EVENT_ITEM_COINS;
    const coinRow = el("div", "finish-row glass finish-coins");
    coinRow.append(el("b", "", `+${coins.toLocaleString(locale())}`), coinIcon(28));
    prize.append(coinRow);
    const stampLine = el("p", "finish-stamped", t("finish.stamped"));
    const on = el("button", "btn amber next finish-on");
    on.type = "button";
    on.dataset.press = "finish.continue";
    on.textContent = t("finish.continue");
    on.addEventListener("click", () => close());
    const book = el("button", "btn finish-passport");
    book.type = "button";
    book.dataset.press = "finish.passport";
    book.textContent = t("finish.passport");
    book.addEventListener("click", () => close(opts.passport));
    card.append(el("h2", "finish-title", t("finish.title")), el("p", "finish-line", t("finish.line", { count: pack?.items.length ?? 10, theme })), spot, stampLine, prize, on, book);
    veil.replaceChildren(card);
    veil.hidden = false;
    opened(veil, () => close());
    opts.changed?.(true);
    emit("milestone:show", { id: "event" });
    requestAnimationFrame(() => fireworks(card, 7, 3200));
    // the stamp comes down onto the card: the passport's thud and sparkle, and its thump
    const calm = lessMotion();
    later(calm ? 0 : STAMP_AFTER_MS, () => {
      const stamp = eventStamp(f.event, theme);
      stamp.classList.add(calm ? "fading" : "landing");
      spot.replaceChildren(stamp);
      later(calm ? 0 : LAND_MS, () => {
        emit("trip:stamp", { trip: f.event }); // Audio's stamp thump under it
        stampLine.classList.add("shown");
        if (calm) return;
        card.classList.add("thud");
        spot.append(...sparkles());
        later(400, () => card.classList.remove("thud"));
      });
    });
  }

  /** Show what is waiting, if the screen can take it now. */
  function poke(): void {
    if (!pending.length || !veil.hidden || !opts.ready()) return;
    show(pending.shift()!);
  }

  return {
    veil,
    /** An event just finished (its prize landed): its card, once the screen can take it. Each event once a session. */
    add(f: Finished): void {
      if (!f.event || seen.has(f.event)) return;
      seen.add(f.event);
      pending.push(f);
      queueMicrotask(poke);
    },
    /** The screen changed: show what waits, if it can take it now. */
    poke,
    /** Whether the card is up. */
    up: () => !veil.hidden,
    /** Dev only: the card for event `event`, again and again (the seen list skipped). */
    preview(event: string): void {
      if (import.meta.env.MODE === "release") return;
      const table = eventPrize(event)?.table;
      pending.push({ event, ...(table && table !== BUILT_IN_TABLE ? { table } : {}) });
      queueMicrotask(poke);
    },
  };
}
