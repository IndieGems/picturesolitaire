// THE TOP ROW AROUND THE ARCADE'S CONTROLS (the game standard, "The top of the screen has one layout"):
// the Gem (the Arcade's menu button), and the player's Coins beside it once the game asks for them (src/settings-screen.ts,
// setWalletVisible), are the Arcade's; Back (and the gear, outside the Arcade) sit at the row's right end,
// level with the Gem, and the title between.
//
// BACK IS PLACED FROM THE RESERVED RECTANGLES THEMSELVES (gem.viewport.reserved), never from the per-corner
// widths (QA, 2026-11-05, on a 360 px phone with 10,000 Gems): the Arcade grows each control's keep-out
// area to the side edge nearest the control's own middle, so a Coins chip drawn at x 150 to 219, its
// middle just past the frame's, is kept clear from x 150 to the RIGHT edge, and the SDK files it as the
// top-right corner (--gem-reserved-tr-width 210 px). Back, placed left of "the top-right corner", landed
// at x 38 to 142, under the Gem and the Gems chip, and a tap on it opened the Arcade's wallet panel. So:
//   - Back's slot (Back, and the gear where it shows) is the rightmost place on the Gem's row clear of
//     every reserved area by 8 px, between the column's side margins;
//   - with no such place (the row is the Arcade's end to end), Back steps down onto a line of its own
//     under the Arcade's areas, at its right end, and the title comes down beside it (html.back-down),
//     the screen below moving down with them (style.css); the title gives way, never Back (AGENTS.md);
//   - the title's left end is clear of every area left of Back's slot.
// It writes --row-left, --row-right (over style.css's per-corner fallbacks), --back-mid and --line2-top on
// :root, and lays out again whenever the SDK writes its properties there (each viewport push), Back's
// width changes (back.ts, --back-w), the gear comes or goes (html.arcade-menu), or the window resizes.
// With no viewport (a plain tab, the play-test tool, an embedder that sends none), style.css's own
// formulas stand, as before.
//
// THE TITLE STEPS DOWN when the row leaves it too little room (about 120 px with nothing in the wallet,
// less as the balances grow): onto a line of its own under the Gem, the full width of the column, the
// screen below moving down with it (html.row-tight). Measured, never guessed: a probe laid out exactly
// as a title would be.

import type { GemViewport } from "@indiegems/gem-web-sdk/sdk";
import { gem } from "../gem";

/** A title narrower than this steps down (a short word at 20 px, or two short ones at 12, fit in more). */
const MIN_TITLE_PX = 100;
/** Back's clearance from any area the Arcade reserves. */
const CLEAR_PX = 8;
/** Lines tried below the Gem's row before Back is put at the right end anyway (never needed: one is). */
const MAX_LINES = 4;

/** Dev server only: a viewport for a check in the play-test tool, which has no Arcade; null: the SDK's. */
let devViewport: GemViewport | null = null;
let relayout: (() => void) | null = null;
export function pretendViewport(v: GemViewport | null): void {
  if (!import.meta.env.DEV) return;
  devViewport = v;
  relayout?.();
}

type Box = { l: number; t: number; r: number; b: number };

export function watchTopRow(app: HTMLElement): void {
  const root = document.documentElement;
  // where a title would sit on the Gem's row (its width says whether one fits)
  const probe = document.createElement("div");
  probe.className = "top-row-probe";
  probe.setAttribute("aria-hidden", "true");
  // Back's band on the Gem's row between the column's side margins; its child is as wide as Back and the gear
  const slotProbe = document.createElement("div");
  slotProbe.className = "top-back-probe";
  slotProbe.setAttribute("aria-hidden", "true");
  const need = document.createElement("i");
  slotProbe.append(need);
  app.append(probe, slotProbe);

  const setVar = (name: string, px: number | null): void => {
    const now = root.style.getPropertyValue(name);
    if (px === null) {
      if (now) root.style.removeProperty(name);
      return;
    }
    const value = `${Math.round(px)}px`;
    if (now !== value) root.style.setProperty(name, value);
  };

  /** Back's place from the reserved areas; false when there is no viewport to place it by. */
  const placeBack = (): boolean => {
    const v = import.meta.env.DEV && devViewport ? devViewport : gem.viewport;
    if (!v) {
      for (const name of ["--row-left", "--row-right", "--back-mid", "--line2-top"]) setVar(name, null);
      // only when it is there: classList.remove() sets the class attribute again even when nothing goes,
      // which the observer below hears, and the page spun forever (found in the check, 2026-11-05)
      if (root.classList.contains("back-down")) root.classList.remove("back-down");
      return false;
    }
    const a = app.getBoundingClientRect();
    const p = slotProbe.getBoundingClientRect();
    const want = need.getBoundingClientRect().width;
    const h = p.height;
    const areas: Box[] = (v.reserved ?? [])
      .map((r) => ({ l: r.x, t: r.y, r: r.x + r.width, b: r.y + r.height }))
      .filter((r) => r.r > r.l && r.b > r.t);
    const across = (top: number) => areas.filter((r) => r.t < top + h && r.b > top);
    // the rightmost run of `want` px on a band, clear of its areas, inside the margins (null: none)
    const slotOn = (inBand: Box[]): number | null => {
      const clear = (x0: number, x1: number) => inBand.every((r) => x1 <= r.l - CLEAR_PX || x0 >= r.r + CLEAR_PX);
      const ends = [p.right, ...inBand.map((r) => r.l - CLEAR_PX)].filter((x) => x <= p.right).sort((x, y) => y - x);
      return ends.find((x1) => x1 - want >= p.left && clear(x1 - want, x1)) ?? null;
    };
    let top = p.top;
    let line = 0;
    let slot = slotOn(across(top));
    while (slot === null && line < MAX_LINES) {
      // nowhere on this line: the next one, under whatever is in the way
      top = Math.max(top + h, ...across(top).map((r) => r.b)) + CLEAR_PX;
      line++;
      slot = slotOn(across(top));
    }
    if (slot === null) slot = p.right;
    // the title's left end on the Gem's row: clear of every area left of Back's slot
    const onRow = across(p.top);
    const left = line === 0 ? Math.max(p.left, ...onRow.filter((r) => r.r <= slot - want).map((r) => r.r + CLEAR_PX)) : p.left;
    // a title stepping down alone (Back on the row) goes under the row and its areas
    const line2 = Math.max(p.bottom, ...onRow.map((r) => r.b)) + CLEAR_PX;
    setVar("--row-right", a.right - slot);
    setVar("--row-left", left - a.left);
    setVar("--back-mid", top + h / 2 - a.top);
    setVar("--line2-top", line2 - a.top);
    if (root.classList.contains("back-down") !== line > 0) root.classList.toggle("back-down", line > 0);
    return true;
  };

  let tight: boolean | null = null;
  // our own writes on :root come back through the observer once: they find nothing to change, and stop
  const measure = (): void => {
    placeBack();
    // Back stepped down: the title comes down beside it; else it steps down only when it would not fit
    const next = root.classList.contains("back-down") || probe.getBoundingClientRect().width < MIN_TITLE_PX;
    if (next !== tight) {
      tight = next;
      root.classList.toggle("row-tight", next);
    }
  };
  relayout = measure;
  addEventListener("resize", measure);
  new MutationObserver(measure).observe(root, { attributes: true, attributeFilter: ["style", "class"] });
  new ResizeObserver(measure).observe(app);
  measure();
}
