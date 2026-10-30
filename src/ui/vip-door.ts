// THE LOCKED VIP DOOR'S SCREEN (the creator, 2026-10-30, after Untangled's showVip): a player who is not
// a VIP finds the daily archive's badge and the event's strip on home wearing a padlock and a gold "VIP"
// tag; a tap opens this screen, what the door holds, big:
//
//   the archive   a strip of the last few days, as the calendar draws them, under the tag
//   the event     its suitcase and its prize table, its name, and its levels and hidden items
//
// then the line "VIP is coming soon." where Get VIP will go: no game can open the Arcade's VIP card, or
// read who holds VIP, yet (gem-development#2119), and a buyer must never stay locked out (vip-view.ts:
// canGetVip, getVip, one switch for both doors and Cosmetics). Back goes home. A VIP never sees it: VIP
// arriving while it is up goes home, where the door now opens.
//
// Information is glass and paper; the only buttons are Back, the gear and (once it can be) Get VIP.

import { ICONS } from "./icons";
import { liveAttr, locale, t } from "./i18n";
import { canGetVip, getVip, onVip, vipNow } from "./vip-view";

type Nav = {
  home(): void;
  /** Show the screen (app.ts's show("vip")). */
  show(): void;
};

/** What a door holds. */
export type VipDoor =
  | { kind: "archive"; today: string }
  | { kind: "event"; title: string; art: string; table?: { name: string; thumb: string }; levels: number; items: number };

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
    note.append(
      el("span", "vip-kicker", t("vip.kicker")),
      el("b", "vip-big", d.kind === "archive" ? t("archive.title") : d.title),
      el("p", "", d.kind === "archive" ? t("vip.archiveLine") : t("vip.eventLine", { count: d.levels, items: d.items })),
    );
    if (d.kind === "event" && d.table) {
      const prize = el("div", "vip-prize");
      const thumb = el("img");
      Object.assign(thumb, { src: d.table.thumb, alt: "", draggable: false, decoding: "async" });
      prize.append(thumb, el("span", "", t("vip.prize", { table: d.table.name })));
      note.append(prize);
    }
    const foot: HTMLElement[] = [];
    if (canGetVip()) {
      const get = el("button", "btn amber next vip-get", t("vip.get"));
      get.type = "button";
      get.dataset.press = "vip.get";
      get.addEventListener("click", getVip);
      foot.push(get);
    } else foot.push(el("p", "vip-soon glass", t("vip.soon")));
    body.replaceChildren(pic, note, ...foot);
  }

  // VIP arrived while the door was up: home, where it opens now; VIP came on sale: its button
  onVip(() => {
    if (screen.hidden) return;
    if (vipNow()) nav.home();
    else draw();
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
