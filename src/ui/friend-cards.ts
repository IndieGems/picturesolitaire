// FRIEND CHALLENGES on screen (the creator, 2026-10-28; docs/friend-challenges.md). The platform's
// side is src/net/friends.ts; the one-off board itself is app.ts's (kind "oneoff"). Here:
//
//   the social row     on a win card after a trip board (from board 3) or a daily: Challenge a friend
//                      (in the Arcade, for a player with a friend: never a guest) and Share (everywhere: the Arcade's share, the
//                      phone's sheet or a copy). Under it, one status line says what happened (sent,
//                      copied, too many for now), so nothing pops up over the card.
//   the friends sheet  Challenge a friend's list: each Arcade friend, a tap asks the Arcade (which
//                      shows its own Send sheet), and Share a link instead at its foot.
//   the challenge card the friend's side, as the game opens on a challenge or a link: whose, which
//                      board, the moves to beat and the helpers they used, a sneak peek said as one,
//                      and Play.
//   the compare card   the one-off's win: the two counts side by side, a line for a win, a tie or a
//                      loss, Challenge back (to the sender, with the player's own count) and Share;
//                      after a loss Try again leads.
//
// Buttons are buttons and the rest is glass (AGENTS.md, the two materials); every card is a dialog
// to a keyboard (dialogs.ts), its way out the corner key at its top right.

import { t } from "./i18n";
import { closed, cornerKey, opened } from "./dialogs";
import { longDate, shortDate } from "./format";
import { eventShown } from "./event-switch";
import { ICONS, type IconName } from "./icons";
import {
  challengeFriend,
  challengesOffered,
  friendAction,
  friendState,
  listFriends,
  onFriendState,
  shareDare,
  type Dare,
  type FriendRow,
  type Sent,
  type Shared,
} from "../net/friends";

type Kids = Array<Node | string | null | undefined | false>;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<Record<string, string>> = {}, ...kids: Kids): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) if (v !== undefined) el.setAttribute(k, v);
  for (const kid of kids) if (kid) el.append(kid);
  return el;
}
function button(cls: string, press: string, label: string, go: () => void, glyph?: IconName): HTMLButtonElement {
  const b = h("button", { type: "button", class: `btn ${cls}`.trim(), "data-press": press }, glyph ? icon(glyph) : null, h("span", {}, label));
  b.addEventListener("click", go);
  return b;
}
function icon(name: IconName): Node {
  const tpl = document.createElement("template");
  tpl.innerHTML = ICONS[name];
  return tpl.content.firstChild!;
}

/** The words before a shared link (the fallback's; the Arcade's share writes its own): the template's line. */
export function shareLine(d: Dare): string {
  return "board" in d ? t("friends.shareBoard", { board: d.board, count: d.moves }) : t("friends.shareDaily", { date: shortDate(d.date), count: d.moves });
}

/** Who sent a challenge, as each place says it: a name, or "your friend" (a link names nobody). */
export interface Who {
  /** The platform's name for the sender; null from a link. */
  name: string | null;
}
const whoStart = (w: Who) => w.name ?? t("friends.anon");
const whoMid = (w: Who) => w.name ?? t("friends.anonMid");
const whoLabel = (w: Who) => w.name ?? t("friends.anonLabel");

export function createFriendCards(app: HTMLElement) {
  // the friends sheet: over the win card (z-index: style.css, .veil.friends)
  const sheet = h("div", { class: "veil friends", hidden: "", role: "dialog", "aria-modal": "true", "aria-labelledby": "friends-title" });
  app.append(sheet);
  /** The sheet's turn: each open draws again from this. */
  let shown: { d: Dare; friends: FriendRow[] | null; failed: boolean; busy: boolean; say: string; sent: (name: string | null) => void } | null = null;

  function closeSheet(): void {
    if (sheet.hidden) return;
    sheet.hidden = true;
    shown = null;
    closed(sheet);
  }

  function drawSheet(): void {
    const s = shown;
    if (!s) return;
    const list = h("div", { class: "friend-list" });
    if (s.failed) list.append(h("p", { class: "friend-none" }, t("friends.listFailed")));
    else if (s.friends === null) list.append(h("p", { class: "friend-none" }, t("friends.loading")));
    else if (!s.friends.length) list.append(h("p", { class: "friend-none" }, t("friends.none")));
    else
      for (const f of s.friends) {
        const name = f.name ?? t("friends.anonLabel");
        const face = f.avatar
          ? h("img", { class: "friend-face", src: f.avatar, alt: "", draggable: "false" })
          : h("span", { class: "friend-face", "aria-hidden": "true" }, [...name][0]?.toUpperCase() ?? "?");
        const row = h(
          "button",
          { type: "button", class: "friend", "data-press": "friends.pick", ...(s.busy ? { disabled: "" } : {}) },
          face,
          h("span", { class: "who" }, h("b", {}, name), f.tag ? h("small", {}, `#${f.tag}`) : null),
        );
        // one ask per press, never retried: the Arcade shows its own Send sheet
        row.addEventListener("click", () => void pick(f));
        list.append(row);
      }
    const card = h(
      "div",
      { class: "card friends-card" },
      cornerKey("close", t("friends.close"), "friends.close", closeSheet),
      h("h2", { id: "friends-title" }, t("friends.pickTitle")),
      h("p", {}, t("friends.pickWhy", { count: s.d.moves })),
      list,
      h("p", { class: "friends-say", role: "status" }, s.say),
      // straight from the press, as every share must be
      button("friends-link", "friends.link", t("friends.link"), () => share(s.d, (w) => (s.say = w), drawSheet), "share"),
    );
    sheet.replaceChildren(card);
  }

  async function pick(f: FriendRow): Promise<void> {
    const s = shown;
    if (!s || s.busy) return;
    s.busy = true;
    s.say = "";
    drawSheet();
    const r = await challengeFriend(f.playerId, s.d);
    s.busy = false;
    friendAction(r === "sent" ? "challenge_sent" : "challenge_not_sent", s.d);
    if (shown !== s) return;
    if (r === "sent") {
      closeSheet();
      s.sent(f.name);
      return;
    }
    // closed, refused or unavailable: say nothing (the SDK's rule); too many, or our mistake: say so
    s.say = r === "later" ? t("friends.later") : r === "failed" ? t("friends.failed") : "";
    drawSheet();
  }

  function openSheet(d: Dare, sent: (name: string | null) => void): void {
    shown = { d, friends: null, failed: false, busy: false, say: "", sent };
    const s = shown;
    drawSheet();
    sheet.hidden = false;
    opened(sheet, closeSheet);
    // read fresh each time: a friend may have accepted the player's request since (the SDK's friends.md)
    listFriends().then(
      (list) => (s.friends = list),
      (err: unknown) => {
        console.info("[friends] the list did not load:", err);
        s.failed = true;
      },
    ).finally(() => {
      if (shown === s) drawSheet();
    });
  }

  /** Share the dare, from the press; `say` gets the line to show (copied, or it failed), then `redraw`. */
  function share(d: Dare, say: (words: string) => void, redraw: () => void): void {
    void shareDare(d, shareLine(d)).then((how: Shared) => {
      if (how !== "cancelled" && how !== "failed") friendAction("shared", d);
      say(how === "copied" ? t("friends.copied") : how === "failed" ? t("friends.shareFailed") : "");
      redraw();
    });
  }

  /**
   * The win card's row: Challenge a friend (or Challenge back, straight to `back`, the challenge's
   * sender) where the Arcade offers it and the player has a friend, and Share; one status line under
   * them. `amber` makes the challenge the card's main action (the compare card after a win or a tie),
   * else Share.
   *
   * The friends list may still be out when the card opens (a slow read, a first win right after the
   * handshake: QA's read of 50b9aba). Then the row keeps the challenge's place, unseen, so Share
   * already sits where it stays: a friend found fills the place, none (or a failed read) gives it up,
   * and Share widens over it, covering where it was, so a thumb on its way never lands on another
   * button. A list that lands later still (the handshake settled after the card opened, a friend
   * accepted while the Arcade had the game paused) adds the button before Share in the same way.
   */
  function socialRow(d: Dare, opts: { back?: { id: string; name: string | null }; amber?: boolean } = {}): HTMLElement {
    const say = h("p", { class: "social-say", role: "status" });
    const tell = (w: string) => (say.textContent = w);
    const make = (): HTMLButtonElement => {
      const b: HTMLButtonElement = opts.back
        ? button("", "friends.back", t("friends.back"), () => void challengeBack(opts.back!, d, b, tell), "friends")
        : button("", "friends.challenge", t("friends.challenge"), () =>
            openSheet(d, (name) => {
              sentOn(b);
              tell(name ? t("friends.sentTo", { name }) : t("friends.sent"));
            }),
            "friends",
          );
      return b;
    };
    const shareBtn = button("", "friends.share", t("friends.share"), () => share(d, tell, () => undefined), "share");
    const row = h("div", { class: "row" }, shareBtn);
    let challenge: HTMLButtonElement | null = null;
    /** The challenge's place, kept unseen while the list is out. */
    const hold = (b: HTMLButtonElement, held: boolean) => {
      b.classList.toggle("held", held);
      b.disabled = held;
      if (held) b.setAttribute("aria-hidden", "true");
      else b.removeAttribute("aria-hidden");
    };
    const lead = () => {
      if (!opts.amber) return;
      const main = challenge ?? shareBtn;
      main.classList.add("amber");
      (main === shareBtn ? challenge : shareBtn)?.classList.remove("amber");
    };
    const state = () => (challengesOffered() ? friendState() : "no");
    const draw = (s: "yes" | "no" | "asking") => {
      if (s !== "no" && !challenge) {
        challenge = make();
        row.prepend(challenge);
      }
      if (s === "no" && challenge?.classList.contains("held")) {
        challenge.remove();
        challenge = null;
      }
      if (challenge) hold(challenge, s === "asking");
      lead();
    };
    const first = state();
    draw(first);
    if (first !== "yes") {
      const off = onFriendState(() => {
        // the card closed, or the button is out: nothing more to hear
        if (!row.isConnected) return off();
        const s = state();
        if (s === "asking") return;
        draw(s);
        if (s === "yes") off();
      });
    }
    return h("div", { class: "social" }, row, say);
  }

  /** Challenge back: one press, one ask, straight to the sender (the Arcade confirms and sends). */
  let backing = false;
  async function challengeBack(to: { id: string; name: string | null }, d: Dare, b: HTMLButtonElement, tell: (w: string) => void): Promise<void> {
    if (backing) return;
    backing = true;
    b.disabled = true;
    tell("");
    const r: Sent = await challengeFriend(to.id, d);
    backing = false;
    friendAction(r === "sent" ? "challenge_sent" : "challenge_not_sent", d);
    if (r === "sent") {
      sentOn(b);
      tell(to.name ? t("friends.sentTo", { name: to.name }) : t("friends.sent"));
      return;
    }
    b.disabled = false;
    tell(r === "later" ? t("friends.later") : r === "failed" ? t("friends.failed") : "");
  }

  /** A challenge sent from this card: its button says so, and rests (one more is a fresh card away). */
  function sentOn(b: HTMLButtonElement): void {
    const words = b.lastElementChild;
    if (words) words.textContent = t("friends.sentButton");
    b.disabled = true;
    b.classList.remove("amber");
    b.classList.add("resting");
  }

  return { socialRow, closeSheet, isOpen: () => !sheet.hidden };
}

export type FriendCards = ReturnType<typeof createFriendCards>;

/** What the challenge card says about the board. */
export interface ChallengeView {
  dare: Dare;
  who: Who;
  /** "Board 62 · France", or "The daily puzzle of Oct 26". */
  where: string;
  /** A board the player has not reached: a sneak peek. */
  peek: boolean;
  /** Played before (a relaunch of an answered challenge). */
  answered: boolean;
  /** A daily not yet out for this player (their date is behind the sender's): its date, and no Play. */
  notYet: string | null;
}

/** The challenge card: whose, which board, the count to beat and their helpers, then Play. */
export function challengeCard(v: ChallengeView, play: () => void, close: () => void): HTMLElement {
  const { dare, who } = v;
  const helpers = dare.helpers > 0 ? t("oneoff.theirHelpers", { name: whoStart(who), count: dare.helpers }) : t("oneoff.theirNoHelpers", { name: whoStart(who) });
  const note = v.notYet ? t("oneoff.notYet", { date: longDate(v.notYet) }) : v.answered ? t("oneoff.played") : v.peek ? t("oneoff.peek") : null;
  return h(
    "div",
    { class: "card dare-card" },
    cornerKey("close", t("friends.close"), "oneoff.close", close),
    h("h2", {}, who.name ? t("oneoff.title", { name: who.name }) : t("oneoff.titleAnon")),
    h("p", { class: "dare-where" }, v.where),
    h(
      "div",
      { class: "dare-count glass" },
      h("b", {}, String(dare.moves)),
      h("span", { class: "dare-label" }, t("oneoff.toBeat", { count: dare.moves })),
      h("span", { class: "dare-helpers" }, helpers),
    ),
    note ? h("p", { class: `dare-note${v.peek && !v.answered && !v.notYet ? " peek" : ""}` }, note) : null,
    // (a daily's: the suitcase it would not fill is said only while the event is on, event-switch.ts)
    h("p", { class: "dare-fun" }, t("board" in dare ? "oneoff.funBoard" : eventShown() ? "oneoff.funDaily" : "oneoff.funDailyPlain")),
    v.notYet ? null : button("amber next", "oneoff.play", v.answered ? t("oneoff.again") : t("oneoff.play"), play),
  );
}

/** The one-off's result against the dare: fewer moves win, the same is a tie. */
export type Outcome = "won" | "tied" | "lost";
export const outcomeOf = (moves: number, d: Dare): Outcome => (moves < d.moves ? "won" : moves === d.moves ? "tied" : "lost");

/** The compare card's middle: the two counts side by side, the winner's lit, each with its helpers; then the line. */
export function comparePanel(moves: number, helpers: number, d: Dare, who: Who): HTMLElement[] {
  const o = outcomeOf(moves, d);
  const used = (n: number) => (n > 0 ? t("oneoff.helpers", { count: n }) : t("oneoff.noHelpers"));
  const stat = (n: number, label: string, uses: number, lit: boolean, cls: string) =>
    h("div", { class: `stat glass ${cls}${lit ? " lit" : ""}` }, h("b", {}, String(n)), h("span", {}, label), h("i", {}, used(uses)));
  const gap = Math.abs(d.moves - moves);
  const line =
    o === "won" ? t("oneoff.wonLine", { name: whoMid(who), count: gap }) : o === "tied" ? t("oneoff.tiedLine", { name: whoMid(who), count: moves }) : t("oneoff.lostLine", { name: whoStart(who), count: gap });
  return [
    h(
      "div",
      { class: "stats compare", role: "group", "aria-label": t("oneoff.compareAria", { you: moves, name: whoLabel(who), them: d.moves }) },
      stat(moves, t("win.you"), helpers, o !== "lost", "you"),
      stat(d.moves, whoLabel(who), d.helpers, o !== "won", "them"),
    ),
    h("p", { class: `compare-line ${o}` }, line),
  ];
}
