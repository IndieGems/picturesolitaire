// THE LOCKED VIP DOOR'S SCREEN (the creator, 2026-10-30, after Untangled's showVip): a player who is not
// a VIP finds the daily archive's badge and the event's strip on home wearing a padlock and a gold "VIP"
// tag; a tap opens this screen, what the door holds, big:
//
//   the archive   a strip of the last few days, as the calendar draws them, under the tag
//   the event     its suitcase and its prize table, its name, and its levels and hidden items
//
// then Get VIP, the Arcade's own VIP sheet (vip-view.ts vipButton, the one button the Cosmetics banner
// has too): "Sign in to get VIP" for a guest, and nothing where the Arcade cannot sell it here (a TV, a
// browser that cannot pay). Back goes home. A VIP never sees it: VIP arriving while it is up (bought
// from here, or anywhere: the server's word) goes through the door: the archive's calendar, or the
// event's page once its record is in, a few seconds at most (else home, where the door now opens).
//
// Information is glass and paper; the only buttons are Back, the gear and Get VIP (or Sign in).

import { ICONS } from "./icons";
import { liveAttr, locale, t } from "./i18n";
import { onVip, vipButton, vipNow, VIP_WEARS_ALL } from "./vip-view";
import { helperPic } from "./helper-shop";
import { VIP_DAILY_SIZE, VIP_WELCOME_SIZE } from "../net/vip";

type Nav = {
  home(): void;
  /** VIP arrived while the door was up: in, to what it holds. */
  enter(door: VipDoor): void;
  /** Show the screen (app.ts's show("vip")). */
  show(): void;
};

/** What a door holds. */
export type VipDoor =
  | { kind: "archive"; today: string }
  | { kind: "event"; title: string; headline?: string; art: string; table?: { name: string; thumb: string }; levels: number; items: number };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** The padlock and the gold "VIP" tag (home's doors wear it too). */
export function vipTag(cls = ""): HTMLElement {
  const tag = el("span", cls ? `vip-tag ${cls}` : "vip-tag");
  tag.setAttribute("aria-hidden", "true");
  const lock = el("span", "vip-lock");
  lock.innerHTML = ICONS.lock;
  tag.append(lock, el("span", "", t("vip.tag")));
  return tag;
}

/** "2026-10-29" a day `n` before `date`. */
function daysBefore(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! - n)).toISOString().slice(0, 10);
}

/**
 * What VIP gives in this game, as every door lists it (the creator, 2026-11-01): the day's gift, the
 * welcome gift, the archive and the events, and the Cosmetics only while VIP lends them (vip-view.ts
 * VIP_WEARS_ALL: off since 2026-11-02, so four rows). Ours to say; the Arcade's own perks are its
 * sheet's. Information (glass), its numbers the checker's (src/net/vip.ts, from helper-ids.json).
 */
function perks(): HTMLElement {
  const box = el("div", "vip-perks glass");
  box.append(el("b", "vip-perks-head", t("vip.perks")));
  const list = el("ul");
  const art = (src: string) => {
    const img = el("img");
    Object.assign(img, { src: `${import.meta.env.BASE_URL}art/${src}`, alt: "", draggable: false, decoding: "async" });
    return img;
  };
  const daily = el("span", "ico-wrap");
  daily.innerHTML = ICONS.daily;
  const rows: Array<[Node, string]> = [
    [helperPic("hint"), t("vip.perk.daily", { count: VIP_DAILY_SIZE })],
    [helperPic("shuffle", 3), t("vip.perk.welcome", { count: VIP_WELCOME_SIZE })],
    [daily, t("vip.perk.archive")],
    [art("suitcase-closed-small.webp"), t("vip.perk.events")],
    ...(VIP_WEARS_ALL ? ([[art("cosmetics-tile.webp"), t("vip.perk.cosmetics")]] as Array<[Node, string]>) : []),
  ];
  for (const [pic, words] of rows) {
    const li = el("li");
    const p = el("span", "vip-perk-pic");
    p.setAttribute("aria-hidden", "true");
    p.append(pic);
    li.append(p, el("span", "", words));
    list.append(li);
  }
  box.append(list);
  return box;
}

export function createVipDoor(nav: Nav) {
  const pill = el("div", "top-pill glass");
  const back = el("button", "btn round top-back");
  back.type = "button";
  back.dataset.press = "vip.back";
  back.innerHTML = ICONS.back;
  liveAttr(back, "aria-label", "vip.back");
  back.addEventListener("click", () => nav.home());
  const body = el("div", "vip-body");
  const scroll = el("div", "scroll");
  scroll.append(body);
  const screen = el("section", "screen menu-screen vip-screen");
  screen.hidden = true;
  screen.append(pill, back, scroll);
  let door: VipDoor | null = null;

  /** The archive's picture: the last week of days, as the calendar draws them, locked. */
  function archivePicture(today: string): HTMLElement {
    const strip = el("div", "vip-days");
    const wd = new Intl.DateTimeFormat(locale(), { weekday: "short", timeZone: "UTC" });
    for (let n = 6; n >= 1; n--) {
      const date = daysBefore(today, n);
      const [y, m, d] = date.split("-").map(Number);
      const at = new Date(Date.UTC(y!, m! - 1, d!));
      const day = el("span", "vip-day glass");
      day.append(el("small", "", wd.format(at)), el("b", "", String(d)));
      strip.append(day);
    }
    return strip;
  }

  function draw(): void {
    if (!door) return;
    const d = door;
    pill.textContent = d.kind === "archive" ? t("archive.title") : d.title;
    const pic = el("div", `vip-pic ${d.kind}`);
    if (d.kind === "archive") pic.append(archivePicture(d.today));
    else {
      const img = el("img", "vip-art");
      Object.assign(img, { src: d.art, alt: "", draggable: false, decoding: "async" });
      pic.append(img);
    }
    pic.append(vipTag("big"));
    const note = el("div", "vip-note glass");
    // the event's door says it with the strip's energy: "Event!" and "Now playing: Haunted Holiday!"
    if (d.kind === "event") note.append(el("span", "case-hero-tag", t("case.eventTag")));
    note.append(
      el("span", "vip-kicker", t("vip.kicker")),
      el("b", "vip-big", d.kind === "archive" ? t("archive.title") : (d.headline ?? d.title)),
      el("p", "", d.kind === "archive" ? t("vip.archiveLine") : t("vip.eventLine", { count: d.levels, items: d.items })),
    );
    if (d.kind === "event" && d.table) {
      const prize = el("div", "vip-prize");
      const thumb = el("img");
      Object.assign(thumb, { src: d.table.thumb, alt: "", draggable: false, decoding: "async" });
      prize.append(thumb, el("span", "", t("vip.prize", { table: d.table.name })));
      note.append(prize);
    }
    const get = vipButton("next vip-get");
    // Get VIP under what the door holds, in reach without a scroll; what VIP gives here below it
    body.replaceChildren(pic, note, ...(get ? [get] : []), perks());
  }

  // VIP arrived while the door was up: in; Get VIP came, went or became Sign in: the button
  onVip(() => {
    if (screen.hidden || !door) return;
    draw(); // Get VIP goes at once, while the event's record is still on its way (app.ts enterEvent)
    if (vipNow()) nav.enter(door);
  });

  return {
    screen,
    /** Open the door's screen: what it holds. */
    open(what: VipDoor): void {
      door = what;
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
