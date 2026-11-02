// THE VIP SCREEN'S TRIAL LOOKS (the creator, 2026-11-02: "act more excited about this with exclamation marks
// and things. Try different versions that are really trying to sell me on the VIP pass"): four takes on home's
// VIP screen (vip-about.ts) for a player who is not a member, each its own tone and look, for the creator to pick
// from; a member sees the screen as shipped. Outside a release build only: vip-about.ts loads this file behind
// import.meta.env.MODE, so a release build carries none of it, its stylesheet included. Once the creator picks,
// the pick moves into vip-about.ts and this file goes.
//
//   A  First Class!    travel hype: a gold sparkle burst behind the suitcase, bold perk lines with "!", a big
//                      glowing "Get VIP now!"; the home badge twinkles
//   B  Boarding pass   the screen a VIP boarding pass on paper ("FIRST CLASS ✈ VIP"), the perks its stamped
//                      lines, the other games' line on its barcode stub, "Get VIP: board now!"
//   C  Big numbers     the value up front: 2, 8, 3 months, 30 levels, each large; "...and more in other Gem
//                      Arcade games!"; the home badge's glint brighter and twice as often
//   D  Celebration     gold rays turning behind the suitcase, confetti falling, a glow on Get VIP; the home badge
//                      wears a turning halo
//
// Only what the game gives (the daily gift, the welcome gift, the daily archive, the events and their prize
// tables), no price, never "free", no hurry that is not true, and nothing of the Arcade's own perks: the other
// games' line names no game and no reward. Information is glass or paper, flat; the only buttons are Back, the
// gear and Get VIP. Every motion stops with less motion, the battery saver or the system's reduced motion.

import "./vip-looks.css";
import { ICONS } from "./icons";
import { t } from "./i18n";
import { vipButton } from "./vip-view";
import { vipTag } from "./vip-door";
import { helperPic } from "./helper-shop";
import { VIP_DAILY_SIZE, VIP_WELCOME_SIZE } from "../net/vip";
import { EVENT_LEVELS, scheduledEvent } from "./suitcase-data";
import { knownTable, thumbOf } from "./tables";

/** The looks (their names for the dev menu: vip-about.ts VIP_LOOKS). */
export type Look = "a" | "b" | "c" | "d";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
const img = (src: string, cls = ""): HTMLImageElement => {
  const i = el("img", cls);
  Object.assign(i, { src, alt: "", draggable: false, decoding: "async" });
  return i;
};
const ART = (name: string) => `${import.meta.env.BASE_URL}art/${name}`;
const suitcase = (cls = "") => img(ART("suitcase-closed.webp"), cls);
const icon = (svg: string): HTMLElement => {
  const s = el("span", "ico-wrap");
  s.innerHTML = svg;
  return s;
};
/** The event's prize table's thumbnail, the one on now (the door's), if the tables' list is in. */
function prizeThumb(): HTMLImageElement | null {
  const e = scheduledEvent()?.e;
  const art = e?.table ? knownTable(e.table) : undefined;
  return art ? img(thumbOf(art), "lk-thumb") : null;
}
/** A four-point sparkle. */
const SPARK = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 0c.9 5.6 4.4 9.1 10 10-5.6.9-9.1 4.4-10 10-.9-5.6-4.4-9.1-10-10C5.6 9.1 9.1 5.6 10 0Z"/></svg>`;
/** An ink stamp's tick, for the boarding pass's lines. */
const STAMP = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="20" cy="20" r="12.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.2 2.2"/><path d="m13 20.5 4.6 4.4 9.4-9.6" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const sparkles = (n: number, cls: string): HTMLElement => {
  const box = el("span", cls);
  box.setAttribute("aria-hidden", "true");
  for (let i = 0; i < n; i++) {
    const s = el("i");
    s.innerHTML = SPARK;
    s.style.setProperty("--i", String(i));
    box.append(s);
  }
  return box;
};
/** Get VIP in the look's own words where it is the offer (a guest's Sign in keeps its own), or nothing where VIP cannot be had here. */
function getVip(cls: string, words: string): HTMLButtonElement | null {
  const b = vipButton(`next vip-get ${cls}`);
  if (b && b.dataset.press === "vip.get") b.textContent = words;
  return b;
}
const more = (key = "vip.about.more", cls = "") => el("p", `vip-more ${cls}`.trim(), t(key));

// ---------------------------------------------------------------- A: First Class!
function firstClass(): Node[] {
  const hero = el("div", "vip-pic lk-a-hero");
  hero.setAttribute("aria-hidden", "true");
  const burst = el("span", "lk-burst");
  hero.append(burst, sparkles(7, "lk-sparks"), suitcase("lk-a-case"), vipTag("big"));
  const note = el("div", "vip-note glass lk-a-note");
  note.append(el("b", "lk-a-head", t("vip.look.a.head")), el("p", "", t("vip.look.a.line")));
  const rows = el("ul", "lk-a-perks");
  const row = (pic: Node, words: string) => {
    const li = el("li", "glass");
    const p = el("span", "lk-pic");
    p.setAttribute("aria-hidden", "true");
    p.append(pic);
    li.append(p, el("b", "", words));
    rows.append(li);
  };
  row(helperPic("hint"), t("vip.look.a.daily", { count: VIP_DAILY_SIZE }));
  row(helperPic("shuffle", 3), t("vip.look.a.welcome", { count: VIP_WELCOME_SIZE }));
  row(icon(ICONS.daily), t("vip.look.a.archive"));
  row(prizeThumb() ?? img(ART("suitcase-closed-small.webp")), t("vip.look.a.events"));
  const get = getVip("lk-glow lk-a-get", t("vip.look.a.get"));
  return [hero, note, rows, more("vip.about.more", "lk-a-more"), ...(get ? [get] : [])];
}

// ---------------------------------------------------------------- B: Boarding pass
function boardingPass(): Node[] {
  const pass = el("div", "lk-pass");
  pass.setAttribute("role", "group");
  pass.setAttribute("aria-label", t("vip.look.b.title"));
  const band = el("div", "lk-pass-band");
  band.setAttribute("aria-hidden", "true");
  const plane = icon(ICONS.plane);
  band.append(el("b", "", t("vip.look.b.class")), plane, el("b", "", t("vip.tag")));
  const body = el("div", "lk-pass-body");
  const top = el("div", "lk-pass-top");
  const fields = el("dl", "lk-pass-fields");
  for (const [k, v] of [
    ["vip.look.b.passenger", "vip.look.b.you"],
    ["vip.look.b.seat", "vip.look.b.seatNo"],
    ["vip.look.b.from", "vip.look.b.here"],
    ["vip.look.b.to", "vip.look.b.everywhere"],
  ] as const) {
    const f = el("div");
    f.append(el("dt", "", t(k)), el("dd", "", t(v)));
    fields.append(f);
  }
  top.append(fields, suitcase("lk-pass-case"));
  const title = el("b", "lk-pass-title", t("vip.look.b.title"));
  const lines = el("ul", "lk-pass-lines");
  for (const words of [
    t("vip.look.b.daily", { count: VIP_DAILY_SIZE }),
    t("vip.look.b.welcome", { count: VIP_WELCOME_SIZE }),
    t("vip.look.b.archive"),
    t("vip.look.b.events"),
  ]) {
    const li = el("li");
    const s = el("span", "lk-stamp");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = STAMP;
    li.append(s, el("span", "", words));
    lines.append(li);
  }
  body.append(top, title, lines);
  const stub = el("div", "lk-pass-stub");
  const code = el("span", "lk-barcode");
  code.setAttribute("aria-hidden", "true");
  // the other games' line on the stub's paper, where a busy table behind never muddies it
  stub.append(code, more("vip.about.more", "lk-b-more"));
  pass.append(band, body, stub);
  const get = getVip("lk-b-get", t("vip.look.b.get"));
  return [pass, ...(get ? [get] : [])];
}

// ---------------------------------------------------------------- C: Big numbers
function bigNumbers(): Node[] {
  const head = el("div", "vip-note glass lk-c-head");
  head.append(vipTag("big"), el("b", "lk-c-title", t("vip.look.c.head")));
  const list = el("ul", "lk-c-list glass");
  const row = (n: string, words: string, pic: Node) => {
    const li = el("li");
    const p = el("span", "lk-pic");
    p.setAttribute("aria-hidden", "true");
    p.append(pic);
    li.append(el("b", "lk-num", n), el("span", "lk-words", words), p);
    list.append(li);
  };
  row(String(VIP_DAILY_SIZE), t("vip.look.c.daily", { count: VIP_DAILY_SIZE }), helperPic("hint"));
  row(String(VIP_WELCOME_SIZE), t("vip.look.c.welcome", { count: VIP_WELCOME_SIZE }), helperPic("shuffle", 3));
  row("3", t("vip.look.c.archive"), icon(ICONS.daily));
  row(String(EVENT_LEVELS), t("vip.look.c.events"), prizeThumb() ?? img(ART("suitcase-closed-small.webp")));
  const get = getVip("lk-c-get", t("vip.look.c.get"));
  return [head, list, more("vip.look.c.more", "lk-c-more"), ...(get ? [get] : [])];
}

// ---------------------------------------------------------------- D: Celebration
function celebration(): Node[] {
  const hero = el("div", "vip-pic lk-d-hero");
  hero.setAttribute("aria-hidden", "true");
  const confetti = el("span", "lk-confetti");
  for (let i = 0; i < 16; i++) {
    const c = el("i");
    c.style.setProperty("--i", String(i));
    confetti.append(c);
  }
  hero.append(el("span", "lk-rays"), confetti, suitcase("lk-d-case"), vipTag("big"));
  const note = el("div", "vip-note glass");
  note.append(el("b", "vip-big lk-d-head", t("vip.look.d.head")), el("p", "", t("vip.look.d.line")));
  const list = el("ul", "lk-d-list");
  for (const words of [
    t("vip.look.d.daily", { count: VIP_DAILY_SIZE }),
    t("vip.look.d.welcome", { count: VIP_WELCOME_SIZE }),
    t("vip.look.d.archive"),
    t("vip.look.d.events"),
  ]) {
    const li = el("li", "glass");
    const tick = el("span", "lk-tick");
    tick.setAttribute("aria-hidden", "true");
    tick.innerHTML = ICONS.check;
    li.append(tick, el("span", "", words));
    list.append(li);
  }
  const get = getVip("lk-glow lk-d-get", t("vip.look.d.get"));
  return [hero, note, list, more("vip.about.more", "lk-d-more"), ...(get ? [get] : [])];
}

/** The screen's body for look `look`, as a player who is not a member sees it. */
export function drawLook(look: Look): Node[] {
  return look === "a" ? firstClass() : look === "b" ? boardingPass() : look === "c" ? bigNumbers() : celebration();
}

/** Home's badge wears the look's pop (style: vip-looks.css, html[data-vip-look]); null: as shipped. */
export function badgeLook(look: Look | null): void {
  if (look) document.documentElement.dataset.vipLook = look;
  else delete document.documentElement.dataset.vipLook;
}
