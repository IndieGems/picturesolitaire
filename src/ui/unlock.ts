// THE UNLOCK CARD: an achievement just unlocked (achievements.ts) gets a card of its own, the game
// standard's "Achievements and event milestones get a BIG celebration": fireworks over it (none under
// less motion), its own sound (Audio's, on milestone:show "achievement"), a picture of what was won
// (Art's avatar icon for the six that award one, else a medal: bronze, silver or gold by its points,
// the trip's own stamp in it for "Stamped: <trip>"), its name, how it was earned and its points.
// The card is information (glass); its one button carries on.
//
// It comes up in the win card's place, never as a line on it: the win card waits under it, out of
// sight, and Continue shows it again with all it carries (the pictures, the Coins, Next). Several at
// once (a player's first win after achievements came, catching up) are one card, a row each; one that
// arrives while the card is up joins it.
//
// It survives a quick tap: what unlocked waits here until the app says the screen can take it
// (`ready`), and the app asks again (poke) whenever its screen changes. So Next pressed before the
// checker's word landed shows the card over the next level as it opens; a trip's last level shows it
// once the passport's stamp is down, after the stamp, not before it (app.ts).
//
// How the game learns of an unlock is Server's (src/net/achievements.ts, onUnlock: a win's verdict, or
// a compare for one that never arrived), each once a session: add() takes what it says, and nothing here
// is kept between sessions. Its sound is Audio's "achievement", once per card going up, never per row.

import { emit } from "../events";
import { achievementBySlug, achievementDesc, achievementIconUrl, achievementName, medalTier, type Achievement } from "./achievements";
import { closed, opened } from "./dialogs";
import { fireworks } from "./fireworks";
import { t } from "./i18n";
import { tripById } from "./trips";
import { stampUrl } from "./passport";

/** What the checker said unlocked: the achievement, and the points it credited (the card shows its own when absent). */
export interface Unlocked {
  slug: string;
  points?: number;
}

interface Opts {
  /** Whether the screen can take the card now (no play in hand, no finish running, no stamp due). */
  ready: () => boolean;
  /** The card went up, or went away. */
  changed?: (up: boolean) => void;
}

const SVG = "http://www.w3.org/2000/svg";

/** The medal's glyph for each group: lines in the medal's ink, drawn at 24 units. */
const GLYPHS: Record<string, string> = {
  // two footprints
  journey:
    '<path d="M8.2 3.2c1.7 0 2.6 1.9 2.6 4.2s-1 3.9-2.6 3.9-2.7-1.6-2.7-3.9 1-4.2 2.7-4.2Z"/><path d="M6.1 13.2h4.3l-.4 2.4a1.8 1.8 0 0 1-3.5 0Z"/><path d="M15.8 8.2c1.7 0 2.7 1.9 2.7 4.2s-1 3.9-2.7 3.9-2.6-1.6-2.6-3.9 1-4.2 2.6-4.2Z"/><path d="M13.6 18.2h4.3l-.4 2.4a1.8 1.8 0 0 1-3.5 0Z"/>',
  // a suitcase
  souvenirs: '<rect x="3.5" y="7.5" width="17" height="12" rx="2.2"/><path d="M9 7.5V5.6c0-.9.7-1.6 1.6-1.6h2.8c.9 0 1.6.7 1.6 1.6v1.9"/><path d="M8 7.5v12M16 7.5v12"/>',
  // a peak with its flag
  hard: '<path d="M2.8 20 9.6 9l3.2 4.8L15.2 10 21.2 20Z"/><path d="M15.2 10V3.8l3.6 1.4-3.6 1.4"/>',
  // the sun
  daily:
    '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.4 5.4l1.8 1.8M16.8 16.8l1.8 1.8M5.4 18.6l1.8-1.8M16.8 7.2l1.8-1.8"/>',
  // a passport (a stamp whose drawing is missing)
  stamps: '<rect x="5" y="2.8" width="14" height="18.4" rx="2"/><circle cx="12" cy="10.5" r="3.4"/><path d="M8.6 16.8h6.8"/>',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function glyph(group: string): SVGSVGElement {
  const s = document.createElementNS(SVG, "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("aria-hidden", "true");
  s.classList.add("medal-glyph");
  s.innerHTML = GLYPHS[group] ?? GLYPHS.journey!;
  return s;
}

/**
 * A medal: a metal rim (bronze, silver, gold) on ribbon tails, a frosted face, and in it the group's
 * glyph, or a stamp's own drawing. `icon`: Art's avatar icon fills the face instead, the rim kept
 * (a medal stands in if it does not load).
 */
export function medalOf(a: Achievement): HTMLElement {
  const m = el("div", `medal ${medalTier(a)} ${a.group}`);
  m.setAttribute("aria-hidden", "true");
  const face = el("div", "medal-face");
  m.append(el("i", "medal-ribbon"), el("div", "medal-rim"), face);
  const tr = a.trip ? tripById(a.trip) : undefined;
  const picture = a.icon ? achievementIconUrl(a) : tr ? stampUrl(tr) : "";
  if (!picture) {
    face.append(glyph(a.group));
    return m;
  }
  const img = el("img", a.icon ? "medal-icon" : "medal-stamp");
  img.alt = "";
  img.draggable = false;
  img.decoding = "async";
  img.addEventListener("error", () => face.replaceChildren(glyph(a.group)), { once: true });
  img.src = picture;
  face.append(img);
  if (a.icon) m.classList.add("icon");
  return m;
}

export function createUnlocks(opts: Opts) {
  const veil = el("div", "veil unlock");
  veil.hidden = true;
  veil.setAttribute("role", "dialog");
  veil.setAttribute("aria-modal", "true");
  /** Waiting for the screen to take them, in the order they came. */
  const pending: Array<{ a: Achievement; points: number }> = [];
  /** Shown, or waiting, this session: the checker's word may come twice (a verdict heard as it opens, then as it lands). */
  const seen = new Set<string>();
  /** On the open card. */
  let shown: Array<{ a: Achievement; points: number }> = [];
  let card: HTMLElement | null = null;
  /** A poke is due at the end of this task: what one win unlocked is heard one by one, and goes up as one card. */
  let soon = false;
  const pokeSoon = () => {
    if (soon) return;
    soon = true;
    queueMicrotask(() => {
      soon = false;
      poke();
    });
  };

  function row(u: { a: Achievement; points: number }): HTMLElement {
    const box = el("div", "unlock-item");
    const words = el("div", "unlock-words");
    words.append(
      el("b", "unlock-name", achievementName(u.a)),
      el("span", "unlock-desc", achievementDesc(u.a)),
      el("span", "unlock-points glass", t("unlock.points", { count: u.points })),
    );
    box.append(el("div", "unlock-pic"), words);
    box.firstElementChild!.append(medalOf(u.a));
    return box;
  }

  /** The card's heading and layout for what it holds: one big, several as rows. */
  function lay(): void {
    if (!card) return;
    card.classList.toggle("many", shown.length > 1);
    const head = card.querySelector("h2");
    if (head) head.textContent = shown.length > 1 ? t("unlock.titleMany", { count: shown.length }) : t("unlock.title");
  }

  function close(): void {
    if (veil.hidden) return;
    veil.hidden = true;
    veil.replaceChildren();
    card = null;
    shown = [];
    closed(veil);
    opts.changed?.(false);
    // more came as it closed
    poke();
  }

  function show(list: Array<{ a: Achievement; points: number }>): void {
    shown = [...list];
    const items = el("div", "unlock-items");
    for (const u of list) items.append(row(u));
    const on = el("button", "btn amber next unlock-on");
    on.type = "button";
    on.dataset.press = "unlock.continue";
    on.textContent = t("unlock.continue");
    on.addEventListener("click", close);
    card = el("div", "card unlock-card");
    card.append(el("h2", "unlock-title"), items, on);
    lay();
    veil.replaceChildren(card);
    veil.hidden = false;
    opened(veil, close);
    opts.changed?.(true);
    // its own sound (Audio's), in place of the win card's
    emit("milestone:show", { id: "achievement" });
    // fireworks() draws nothing under less motion: the card and the sound stay
    requestAnimationFrame(() => card && fireworks(card, list.length > 1 ? 6 : 5, 2600));
  }

  /** Show what is waiting, if the screen can take it now. */
  function poke(): void {
    if (!pending.length) return;
    if (!veil.hidden && card) {
      // the card is up: these join it
      const items = card.querySelector(".unlock-items")!;
      for (const u of pending.splice(0)) {
        shown.push(u);
        items.append(row(u));
      }
      lay();
      fireworks(card, 3, 1800);
      return;
    }
    if (!opts.ready()) return;
    show(pending.splice(0));
  }

  return {
    veil,
    /** What the checker says just unlocked. Unknown slugs and repeats are left out. */
    add(list: readonly Unlocked[]): void {
      for (const u of list) {
        const a = achievementBySlug(u.slug);
        if (!a || seen.has(a.slug)) continue;
        seen.add(a.slug);
        pending.push({ a, points: typeof u.points === "number" && u.points > 0 ? u.points : a.points });
      }
      pokeSoon();
    },
    /** The screen changed: show what waits, if it can take it now. */
    poke,
    /** Whether the card is up. */
    up: () => !veil.hidden,
    /** Dev only: the card for these slugs, again and again (the seen list skipped). */
    preview(slugs: readonly string[]): void {
      for (const s of slugs) {
        const a = achievementBySlug(s);
        if (a) pending.push({ a, points: a.points });
      }
      pokeSoon();
    },
  };
}
