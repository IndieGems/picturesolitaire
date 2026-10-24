// The challenge route: a second lane beside the relaxed campaign, neither
// blocking the other. Its boards open one after another down a winding path,
// each marked with its par (the fewest moves the solver found; a sharp player
// can beat it) and the player's best.
//
//   a board cleared    a raised white marker, tap to play it again; "Par 12 · Best 11"
//   the next to play   the raised amber marker, the screen's main action; "Par 12"
//   a board ahead      a flat glass marker with a lock: information, not a button
//
// There is no fail: any win clears a board, however many moves it took, and
// opens the next. The route comes from challenge-data.ts, the bests from the
// player's save (progress.ts). The top row is the standard's: the title on the
// left, Back then the gear at the right end.

import { ICONS } from "./icons";
import { t } from "./i18n";
import { bestOf } from "./progress";
import { challengesExist, loadChallenges, type Challenge } from "./challenge-data";

type Nav = {
  /** Back: to home. */
  home(): void;
  /** Show the route screen. */
  show(): void;
  /** Play this board. */
  play(c: Challenge): void;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** Where each marker sits across the route, as a share of its width: a gentle zigzag. */
const SWAY = [0.5, 0.76, 0.5, 0.24];

export function createChallenges(nav: Nav) {
  const pill = el("div", "top-pill glass", t("challenges.title"));
  const back = el("button", "btn round top-back");
  back.type = "button";
  back.dataset.press = "challenges.back";
  back.innerHTML = ICONS.back;
  back.setAttribute("aria-label", t("challenges.back"));
  back.addEventListener("click", nav.home);

  const count = el("div", "route-count glass");
  const route = el("ol", "route");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  path.classList.add("route-path");
  path.setAttribute("aria-hidden", "true");
  const wrap = el("div", "route-wrap");
  wrap.append(path, route);
  const scroll = el("div", "scroll");
  scroll.append(count, wrap);
  const screen = el("section", "screen menu-screen challenges-screen");
  screen.hidden = true;
  screen.setAttribute("aria-label", t("challenges.title"));
  screen.append(pill, back, scroll);

  let list: Challenge[] = [];

  /** Is board n open to play: the first, or one after a cleared board. */
  const open = (i: number) => i === 0 || bestOf(list[i - 1]!.id) !== undefined;

  function draw(): void {
    route.replaceChildren();
    const done = list.filter((c) => bestOf(c.id) !== undefined).length;
    count.textContent = t("challenges.count", { done, all: list.length });
    list.forEach((c, i) => {
      const best = bestOf(c.id);
      const stop = el("li", "stop");
      stop.style.setProperty("--x", String(SWAY[i % SWAY.length]));
      let marker: HTMLElement;
      if (best !== undefined || open(i)) {
        const b = el("button", best !== undefined ? "btn round marker cleared" : "btn round marker amber next");
        b.type = "button";
        b.dataset.press = "challenges.play";
        b.append(el("b", "", String(c.n)));
        if (best !== undefined) b.insertAdjacentHTML("beforeend", ICONS.check.replace('class="ico"', 'class="ico tick"'));
        b.setAttribute(
          "aria-label",
          best !== undefined ? t("challenges.clearedLabel", { n: c.n, par: c.par, best }) : t("challenges.nextLabel", { n: c.n, par: c.par }),
        );
        b.addEventListener("click", () => nav.play(c));
        marker = b;
      } else {
        marker = el("div", "marker locked glass");
        marker.setAttribute("role", "img");
        marker.setAttribute("aria-label", t("challenges.lockedLabel", { n: c.n, par: c.par }));
        marker.append(el("b", "", String(c.n)));
        marker.insertAdjacentHTML("beforeend", ICONS.lock.replace('class="ico"', 'class="ico padlock"'));
      }
      const chip = el(
        "span",
        "chip glass",
        best !== undefined ? t("challenges.parBest", { par: c.par, best }) : t("challenges.par", { par: c.par }),
      );
      chip.setAttribute("aria-hidden", "true");
      const at = el("div", "at");
      at.append(marker, chip);
      stop.append(at);
      route.append(stop);
    });
    requestAnimationFrame(trace);
  }

  /** The dotted path from marker to marker, behind them. */
  function trace(): void {
    const box = wrap.getBoundingClientRect();
    if (!box.width) return;
    const pts = [...route.querySelectorAll<HTMLElement>(".marker")].map((m) => {
      const r = m.getBoundingClientRect();
      return `${(r.left + r.width / 2 - box.left).toFixed(1)},${(r.top + r.height / 2 - box.top).toFixed(1)}`;
    });
    path.setAttribute("viewBox", `0 0 ${box.width.toFixed(1)} ${box.height.toFixed(1)}`);
    path.setAttribute("width", box.width.toFixed(1));
    path.setAttribute("height", box.height.toFixed(1));
    path.innerHTML = pts.length > 1 ? `<polyline points="${pts.join(" ")}" />` : "";
  }
  new ResizeObserver(() => {
    if (!screen.hidden) trace();
  }).observe(wrap);

  /** Bring the board to play next into view (the last one once all are cleared). */
  function centre(): void {
    const target = route.querySelector<HTMLElement>(".marker.next") ?? route.querySelector<HTMLElement>(".stop:last-child .marker");
    if (!target) return;
    const s = scroll.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    scroll.scrollTop += r.top + r.height / 2 - (s.top + s.height / 2);
  }

  return {
    screen,
    /** Is there a route to show at all (the boards exist)? */
    exists: challengesExist,
    /** Every challenge, once loaded (empty when there are none). */
    load: async (): Promise<Challenge[]> => (list = await loadChallenges()),
    /** Show the route, freshly drawn, with the next board in view. */
    async openRoute(): Promise<void> {
      list = await loadChallenges();
      draw();
      nav.show();
      centre();
    },
    /** The save changed (a board cleared, the account's copy landed): redraw if it is up. */
    redraw(): void {
      if (!screen.hidden) draw();
    },
    /** The board after this one, if there is one. */
    after(c: Challenge): Challenge | undefined {
      return list[c.n];
    },
  };
}
