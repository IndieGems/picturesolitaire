// VIP, SAID ON HOME (the creator, 2026-11-02: "a VIP button on the home page that tells players what VIP gets
// them in this game and that it unlocks things for other games as well", after Cosmic Commute's; its place
// the creator's pick, top right beside the title):
//
//   the badge    a round gold button beside home's wordmark (home.ts), in the button material: the VIP tag's
//                gold, a crown and "VIP". Every 6 s it gives a small shake and then a glint crosses it, while
//                the player is not a member; never with less motion or the battery saver (style.css). A
//                member's is still, with a green tick. It shows once the first board is done, as the Shop
//                does, never in the guided start.
//   the screen   "VIP" in the top row, Back home and the gear as every screen has; then the travel picture
//                (the suitcase between two of the helpers, the gold VIP tag across its foot), the headline
//                and "One membership for the whole Gem Arcade."; what VIP gives here, the doors' own list
//                (vip-door.ts vipPerks, so the two never disagree), and under it, red and larger, "Other Gem
//                Arcade games give VIP rewards too!", never which games or what (the Arcade's own sheet
//                lists its perks: the SDK's arcade-and-store.md, "Never write an offer's perks"); then Get
//                VIP (vip-view.ts vipButton: Sign in for a guest, nothing where the Arcade cannot sell it).
//                A member reads "You're VIP" and the days left on the pass, else a thank-you, and no Get VIP.
//                It follows VIP coming or going while it is up, as the doors do.
//
// The days left are for show only, from the SDK's pass reading (gem.me.passes: the same reading the game's
// VIP listener hears, src/net/vip.ts), never a decision: who is VIP is the server's word (vipNow). Read once
// a session where nothing has said yet, never retried, and never while the platform has asked everyone to
// wait (src/net/pace.ts). Information is glass; the only buttons are the badge, Back, the gear and Get VIP.

import { gem } from "../gem";
import { held } from "../net/pace";
import { ICONS } from "./icons";
import { liveAttr, liveText, onLocaleChange, t } from "./i18n";
import { onVip, vipButton, vipNow } from "./vip-view";
import { vipPerks, vipTag } from "./vip-door";
import { helperPic } from "./helper-shop";

type Nav = {
  home(): void;
  /** Show the screen (app.ts's show("vipAbout")). */
  show(): void;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** A crown in cream with a brown edge, drawn for the badge (no art of its own: the creator's VIP tag's gold around it). */
const CROWN = `<svg class="vb-crown" viewBox="0 0 34 24" aria-hidden="true"><path d="M4.5 18.5 2.5 6.5l7.6 5.6L17 3.2l6.9 8.9 7.6-5.6-2 12Z" fill="#fff8e2" stroke="#7a4a06" stroke-width="2" stroke-linejoin="round"/><path d="M4.6 19.4h24.8v3H4.6Z" fill="#fff8e2" stroke="#7a4a06" stroke-width="1.8" stroke-linejoin="round"/><circle cx="17" cy="13.6" r="2.1" fill="#d8443a"/></svg>`;
/** A member's tick: white on green, ringed in white. */
const TICK = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#2e8f5e" stroke="#fff" stroke-width="2.5"/><path d="m7 12.4 3.3 3.2L17.2 8.7" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ---------------------------------------------------------------- the pass's end, for show
const DAY = 24 * 60 * 60 * 1000;
type Pass = { readonly pass: string; readonly held: boolean; readonly endsAt: string | null };
/** When the player's VIP pass ends (ms), as the SDK last read it; null: not held, no end, or not read. */
let endsAt: number | null = null;
let passHeard = false;
let passAsked = false;
const passListeners = new Set<() => void>();
/** Outside a release build: the play-test's pretend end (ms), or none (null), over the SDK's word. */
let pretendEnds: number | null | undefined;

function heardPasses(passes: readonly Pass[]): void {
  passHeard = true;
  const v = passes.find((p) => p.pass === "vip" && p.held);
  const ms = v?.endsAt ? Date.parse(v.endsAt) : NaN;
  const next = Number.isFinite(ms) ? ms : null;
  if (next === endsAt) return;
  endsAt = next;
  for (const fn of [...passListeners]) fn();
}

const connected = (): boolean => gem.frame.currentState === "connected";
let listening = false;
/** Hear the SDK's pass readings (it reads again after a purchase, a sign-in, on resume and when a pass ends). */
function listenPasses(): void {
  if (listening || !connected()) return;
  listening = true;
  try {
    gem.me.passes.on("changed", heardPasses);
  } catch (err) {
    console.warn("[vip-about] the pass reading could not be heard:", err);
  }
}
/** A member's screen with nothing heard yet: one read, this session, for its end date. */
function askPassOnce(): void {
  if (passHeard || passAsked || !connected() || held() > 0) return;
  passAsked = true;
  gem.me.passes
    .get("vip")
    .then((p) => heardPasses([p]))
    .catch(() => undefined); // no date: the thank-you stands
}
/** The days left on the member's pass (1 at the least), or null where its end is not known. */
function daysLeft(): number | null {
  const ends = pretendEnds !== undefined ? pretendEnds : endsAt;
  return ends === null ? null : Math.max(1, Math.ceil((ends - Date.now()) / DAY));
}
/** Outside a release build: as if the pass ended at `ms` (null: no end known; undefined: the SDK's word again). */
export function pretendVipEnds(ms: number | null | undefined): void {
  if (import.meta.env.MODE === "release") return;
  pretendEnds = ms;
  for (const fn of [...passListeners]) fn();
}

// ---------------------------------------------------------------- the badge
/** Home's VIP badge, beside the wordmark: hidden until home shows it (show(true), past the guided start). */
export function createVipBadge(open: () => void) {
  const badge = el("button", "btn round vip-badge");
  badge.type = "button";
  badge.dataset.press = "home.vip";
  badge.hidden = true;
  const face = el("span", "vb-face");
  face.setAttribute("aria-hidden", "true");
  face.innerHTML = CROWN;
  const word = el("b", "vb-word");
  face.append(word);
  const glint = el("span", "vb-glint");
  glint.setAttribute("aria-hidden", "true");
  glint.append(el("i"));
  const tick = el("span", "vb-tick");
  tick.setAttribute("aria-hidden", "true");
  tick.innerHTML = TICK;
  badge.append(face, glint, tick);
  badge.addEventListener("click", () => open());
  const draw = (): void => {
    const member = vipNow();
    badge.classList.toggle("member", member);
    glint.hidden = member;
    tick.hidden = !member;
    word.textContent = t("vip.tag");
    badge.setAttribute("aria-label", t(member ? "home.vipMember" : "home.vip"));
  };
  onVip(draw);
  onLocaleChange(draw);
  draw();
  return {
    element: badge,
    /** Shown or not (home's draw: once the first board is done). */
    show(on: boolean): void {
      badge.hidden = !on;
      if (on) draw();
    },
  };
}

// ---------------------------------------------------------------- the screen
export function createVipAbout(nav: Nav) {
  const pill = liveText(el("div", "top-pill glass"), "vip.tag");
  const back = el("button", "btn round top-back");
  back.type = "button";
  back.dataset.press = "vipAbout.back";
  back.innerHTML = ICONS.back;
  liveAttr(back, "aria-label", "vip.back");
  back.addEventListener("click", () => nav.home());
  const body = el("div", "vip-body vip-about");
  const scroll = el("div", "scroll");
  scroll.append(body);
  const screen = el("section", "screen menu-screen vip-about-screen");
  screen.hidden = true;
  screen.append(pill, back, scroll);

  /** The travel picture: the suitcase between a helper and a pack of three, the gold VIP tag across its foot. */
  function picture(): HTMLElement {
    const pic = el("div", "vip-pic vip-about-pic");
    pic.setAttribute("aria-hidden", "true");
    const suitcase = el("img", "vip-art");
    Object.assign(suitcase, { src: `${import.meta.env.BASE_URL}art/suitcase-closed.webp`, alt: "", draggable: false, decoding: "async" });
    const row = el("div", "va-row");
    row.append(helperPic("hint"), suitcase, helperPic("shuffle", 3));
    pic.append(row, vipTag("big"));
    return pic;
  }

  function draw(): void {
    const member = vipNow();
    body.classList.toggle("member", member);
    if (member) {
      listenPasses();
      askPassOnce();
    }
    const note = el("div", "vip-note glass");
    const days = member ? daysLeft() : null;
    note.append(
      el("b", "vip-big", t(member ? "vip.about.member" : "vip.about.head")),
      el("p", "", member ? (days === null ? t("vip.about.thanks") : t("vip.about.daysLeft", { count: days })) : t("vip.about.line")),
    );
    const perks = vipPerks();
    perks.append(el("p", "vip-more", t("vip.about.more")));
    const get = member ? null : vipButton("next vip-get");
    body.replaceChildren(picture(), note, perks, ...(get ? [get] : []));
  }

  // VIP came or went, or Get VIP came, went or became Sign in; the pass's end was read
  onVip(() => {
    if (!screen.hidden) draw();
  });
  passListeners.add(() => {
    if (!screen.hidden) draw();
  });

  return {
    screen,
    /** Open the screen. */
    open(): void {
      draw();
      nav.show();
      scroll.scrollTop = 0;
    },
    /** The words changed. */
    redraw(): void {
      if (!screen.hidden) draw();
    },
  };
}
