// VIP, SAID ON HOME (the creator, 2026-11-02: "a VIP button on the home page that tells players what VIP gets
// them in this game and that it unlocks things for other games as well", after Cosmic Commute's; its place
// the creator's pick, top right beside the title):
//
//   the badge    a round gold button beside home's wordmark (home.ts), in the button material: the VIP tag's
//                gold, a crown and "VIP". Every 6 s it gives a small shake and then a glint crosses it, while
//                the player is not a member; never with less motion or the battery saver (style.css). A
//                member's is still, with a green tick. It shows once the first board is done, as the Shop
//                does, never in the guided start.
//   the screen   "VIP" in the top row, Back home and the gear as every screen has. For a player who is not a
//                member, a VIP BOARDING PASS (the creator's pick of four, 2026-11-02, after "act more excited
//                about this with exclamation marks"): paper, flat, a gold band "FIRST CLASS ✈ VIP", Passenger:
//                You!, Seat 1A, From Picture Passport, Valid in All of Gem Arcade, the suitcase; "Your VIP
//                boarding pass" over its four stamped lines, the best first (the creator, 2026-11-02): every
//                event and its prize table, the daily archive, the day's gift, the welcome gift (what
//                vip-door.ts vipPerks lists, in the same order, in the pass's words); its barcode stub carrying, red and larger, "Other Gem Arcade games give VIP rewards
//                too!", never which games or what (the Arcade's own sheet lists its perks: the SDK's
//                arcade-and-store.md, "Never write an offer's perks"); then "Get VIP: board now!" (vip-view.ts
//                vipButton: Sign in for a guest, nothing where the Arcade cannot sell it). A member reads the
//                travel picture (the suitcase between two helpers, the gold tag), "You're VIP" and the days
//                left on the pass, else a thank-you, the perks and the other games' line, and no Get VIP. It
//                follows VIP coming or going while it is up, as the doors do.
//
// The days left are for show only, from the SDK's pass reading (gem.me.passes: the same reading the game's
// VIP listener hears, src/net/vip.ts), never a decision: who is VIP is the server's word (vipNow). Read once
// a session where nothing has said yet, never retried, and never while the platform has asked everyone to
// wait (src/net/pace.ts). Information is glass and paper; the only buttons are the badge, Back, the gear and Get VIP.

import { gem } from "../gem";
import { held } from "../net/pace";
import { ICONS } from "./icons";
import { liveAttr, liveText, onLocaleChange, t } from "./i18n";
import { onVip, vipButton, vipNow } from "./vip-view";
import { vipPerks, vipTag } from "./vip-door";
import { helperPic } from "./helper-shop";
import { VIP_DAILY_SIZE, VIP_WELCOME_SIZE } from "../net/vip";

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
/** An ink stamp's tick, for the boarding pass's lines. */
const STAMP = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="20" cy="20" r="12.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.2 2.2"/><path d="m13 20.5 4.6 4.4 9.4-9.6" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
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

  /**
   * The VIP boarding pass, for a player who is not a member: the band, its fields and the suitcase, its four
   * stamped lines, and its barcode stub with the other games' line. Paper, flat: information.
   */
  function boardingPass(): HTMLElement {
    const pass = el("div", "vip-pass");
    pass.setAttribute("role", "group");
    pass.setAttribute("aria-label", t("vip.about.pass.title"));
    const band = el("div", "vip-pass-band");
    band.setAttribute("aria-hidden", "true");
    const plane = el("span", "ico-wrap");
    plane.innerHTML = ICONS.plane;
    band.append(el("b", "", t("vip.about.pass.class")), plane, el("b", "", t("vip.tag")));
    const top = el("div", "vip-pass-top");
    const fields = el("dl", "vip-pass-fields");
    for (const [k, v] of [
      ["vip.about.pass.passenger", "vip.about.pass.you"],
      ["vip.about.pass.seat", "vip.about.pass.seatNo"],
      ["vip.about.pass.from", "vip.about.pass.here"],
      ["vip.about.pass.to", "vip.about.pass.everywhere"],
    ] as const) {
      const f = el("div");
      f.append(el("dt", "", t(k)), el("dd", "", t(v)));
      fields.append(f);
    }
    const suitcase = el("img", "vip-pass-case");
    Object.assign(suitcase, { src: `${import.meta.env.BASE_URL}art/suitcase-closed.webp`, alt: "", draggable: false, decoding: "async" });
    top.append(fields, suitcase);
    const lines = el("ul", "vip-pass-lines");
    for (const words of [
      t("vip.about.pass.events"),
      t("vip.about.pass.archive"),
      t("vip.about.pass.daily", { count: VIP_DAILY_SIZE }),
      t("vip.about.pass.welcome", { count: VIP_WELCOME_SIZE }),
    ]) {
      const li = el("li");
      const stamp = el("span", "vip-pass-stamp");
      stamp.setAttribute("aria-hidden", "true");
      stamp.innerHTML = STAMP;
      li.append(stamp, el("span", "", words));
      lines.append(li);
    }
    const passBody = el("div", "vip-pass-body");
    passBody.append(top, el("b", "vip-pass-title", t("vip.about.pass.title")), lines);
    // the other games' line on the stub's paper, where a busy table behind never muddies it
    const stub = el("div", "vip-pass-stub");
    const code = el("span", "vip-pass-code");
    code.setAttribute("aria-hidden", "true");
    stub.append(code, el("p", "vip-more vip-pass-more", t("vip.about.more")));
    pass.append(band, passBody, stub);
    return pass;
  }

  function draw(): void {
    const member = vipNow();
    body.classList.toggle("member", member);
    if (!member) {
      // the boarding pass, then Get VIP in its words (a guest's Sign in keeps its own)
      const get = vipButton("next vip-get vip-pass-get");
      if (get && get.dataset.press === "vip.get") get.textContent = t("vip.about.pass.get");
      body.replaceChildren(boardingPass(), ...(get ? [get] : []));
      return;
    }
    listenPasses();
    askPassOnce();
    const note = el("div", "vip-note glass");
    const days = daysLeft();
    note.append(el("b", "vip-big", t("vip.about.member")), el("p", "", days === null ? t("vip.about.thanks") : t("vip.about.daysLeft", { count: days })));
    const perks = vipPerks();
    perks.append(el("p", "vip-more", t("vip.about.more")));
    body.replaceChildren(picture(), note, perks);
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
