// THE BACK BUTTON'S TRIAL LOOKS (the creator, 2026-11-02: "the back button is still not very noticeable.
// Please give me some mockup options for that, needs to be immediately findable"): four takes on every screen's
// Back, for the creator to pick from. Outside a release build only: app.ts loads this file behind
// import.meta.env.MODE, so a release build carries none of it, its stylesheet included. Once the creator picks,
// the pick moves into style.css (and the screens, where it needs words) and this file goes.
//
//   A  Labelled pill    the same place, "← Back" in words on a wider red pill, a little taller
//   B  Bold ring        the same place, a bigger red disc in a thick white ring with a stronger shadow, so it
//                       stands off any table; one short bounce as a screen opens (none with less motion)
//   C  Joined title     Back at the left end of the title pill, as a phone's own apps do ("← Daily · Nov 2"):
//                       the round red button set into the pill's start, the title the information beside it
//   D  At the bottom    "← Back" at the foot of every menu screen, in the thumb's reach, white (secondary),
//                       always in the same place; the top one goes, the title has the row
//
// Back is never amber (the main action's), never covers the Arcade's corner (the row's ends are --row-left and
// --row-right) nor touches the gear, and stays 44 px or more. Its press is the screen's own Back.

import "./back-looks.css";
import { ICONS } from "./icons";
import { t } from "./i18n";

/** The looks, for the dev menu. */
export const BACK_LOOKS: readonly { id: string; name: string }[] = [
  { id: "a", name: "A: Labelled pill" },
  { id: "b", name: "B: Bold ring" },
  { id: "c", name: "C: Joined title" },
  { id: "d", name: "D: At the bottom" },
];

/** Show every Back in look `look` ("a".."d"), or as shipped (""). */
export function applyBackLook(look: string): void {
  const root = document.documentElement;
  if (look) root.dataset.backLook = look;
  else delete root.dataset.backLook;
  // A: the word on the pill
  for (const b of document.querySelectorAll<HTMLButtonElement>(".btn.top-back")) {
    b.querySelector(":scope > .bk-word")?.remove();
    if (look === "a") {
      const w = document.createElement("span");
      w.className = "bk-word";
      w.textContent = t("back.word");
      b.append(w);
    }
  }
  // D: a Back at the foot of every menu screen, pressing the screen's own
  for (const f of document.querySelectorAll(".bk-foot")) f.remove();
  if (look !== "d") return;
  for (const s of document.querySelectorAll<HTMLElement>(".screen.menu-screen")) {
    const top = s.querySelector<HTMLButtonElement>(":scope > .top-back");
    if (!top) continue;
    const f = document.createElement("button");
    f.type = "button";
    f.className = "btn bk-foot";
    f.dataset.press = "back.foot";
    f.innerHTML = ICONS.back;
    const w = document.createElement("span");
    w.textContent = t("back.word");
    f.append(w);
    f.addEventListener("click", () => top.click());
    s.append(f);
  }
}
