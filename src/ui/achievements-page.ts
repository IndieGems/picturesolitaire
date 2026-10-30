// THE ACHIEVEMENTS PAGE, in the Passport (the creator, 2026-10-30: in the Passport, over a home tile):
// its "Achievements" tab (passport.ts), on the book's own paper page. All 22 (achievements.ts, from
// Server's list, which the game config is made from), in their groups, each with its icon or medal (a
// stamp's medal holds its trip's stamp), its name, how it is earned and its points; unlocked ones in
// full colour with a tick, locked ones dimmed (never hidden), with how far along the player is:
// "Levels: 37 / 50" and a thin bar, from the counters in the server's progress record (a stamp's,
// from its trip: "Levels: 8 / 15"). At the top, the achievements unlocked of 22 and the points of 450
// (this game's own points, never the player's Arcade-wide Achievement Score: the SDK's §6).
//
// Which are unlocked is the platform's word, read by Server (src/net/achievements.ts, readStanding:
// the six counters' progressions, one round at a time, paced, from the SDK's cache unless an unlock was
// heard since), each time the tab opens, never on a timer; an unlock heard this session (the unlock
// card's) shows at once (onStanding). A counter whose read said nothing (the platform's achievementsUnavailable, a failed read)
// shows no locked state: its rows are drawn plain, with a line saying so.
//
// Everything here is information: glass and paper, no button but the tabs (passport.ts).

import { ACHIEVEMENTS as LIST, lastStanding, onStanding, readStanding, type Standing } from "../net/achievements";
import { onProgress, serverCounts } from "../net/progress";
import { achievementBySlug, achievementDesc, achievementName, type Achievement, type AchievementGroup } from "./achievements";
import { t } from "./i18n";
import { tripById, tripCount } from "./trips";
import { medalOf } from "./unlock";

const GROUPS: readonly AchievementGroup[] = ["journey", "stamps", "souvenirs", "hard", "daily"];
/** The words for a counter's progress line ("Levels: {{n}} / {{count}}"). */
const PROGRESS: Record<string, string> = {
  levels_finished: "ach.progress.levels",
  souvenirs_finished: "ach.progress.souvenirs",
  hard_levels_won: "ach.progress.hard",
  super_hard_levels_won: "ach.progress.superHard",
  dailies_won: "ach.progress.dailies",
};
const ALL_POINTS = LIST.reduce((n, a) => n + a.points, 0);

type State = "unlocked" | "locked" | "unknown";

/** Dev only (the dev menu's switch): a pretend standing and pretend counters, null for the platform's own. */
let pretend: { unlocked: Set<string>; counts: Record<string, number> } | null = null;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

export function createAchievementsPage() {
  const root = el("div", "ach-page");
  /** The last standing (null: no round has landed yet this session). */
  let standing: Standing | null = lastStanding();
  let shown = false;

  // a round landed, or an unlock was heard after one (Server's: it counts as unlocked from then on)
  onStanding((s) => {
    standing = s;
    if (shown) draw();
  });
  onProgress(() => {
    if (shown) draw();
  });

  function stateOf(id: string, counter: string): { state: State; points?: number } {
    if (pretend) return { state: pretend.unlocked.has(id) ? "unlocked" : "locked" };
    if (!standing || standing.unknown.has(counter)) return { state: "unknown" };
    const got = standing.unlocked.get(id);
    return got !== undefined ? { state: "unlocked", points: got } : { state: "locked" };
  }

  /** How far along a locked one is: its line and its share, or null where there is nothing to count. */
  function progressOf(a: Achievement, counter: string, at: number): { line: string; share: number } | null {
    if (a.trip) {
      const tr = tripById(a.trip);
      if (!tr) return null;
      const { done, all } = tripCount(tr);
      return all > 0 ? { line: t("ach.progress.levels", { n: done, count: all }), share: done / all } : null;
    }
    // a one-step achievement has no way along: locked is all there is to say
    if (at <= 1) return null;
    const counts = pretend?.counts ?? serverCounts();
    const n = counts?.[counter];
    const key = PROGRESS[counter];
    if (typeof n !== "number" || !key) return null;
    const have = Math.min(n, at);
    return { line: t(key, { n: have, count: at }), share: have / at };
  }

  function row(listed: (typeof LIST)[number]): { box: HTMLElement; state: State; points: number } | null {
    const a = achievementBySlug(listed.slug);
    if (!a) return null;
    const { state, points = listed.points } = stateOf(listed.id, listed.counter);
    const box = el("div", `ach-row ${state}`);
    const name = achievementName(a);
    box.setAttribute("role", "listitem");
    box.setAttribute("aria-label", `${name}. ${achievementDesc(a)} ${t(state === "unlocked" ? "ach.state.unlocked" : state === "locked" ? "ach.state.locked" : "ach.state.unknown")}.`);
    const pic = el("div", "ach-pic");
    pic.append(medalOf(a));
    if (state === "unlocked") pic.append(el("i", "ach-tick"));
    const words = el("div", "ach-words");
    words.setAttribute("aria-hidden", "true");
    // its name and how it is earned, then its points and, on a locked one, how far along (a bar under it)
    const meta = el("div", "ach-meta");
    meta.append(el("span", "ach-points glass", t("ach.rowPoints", { count: points })));
    words.append(el("b", "ach-name", name), el("span", "ach-desc", achievementDesc(a)), meta);
    const p = state !== "unlocked" ? progressOf(a, listed.counter, listed.at) : null;
    if (p) {
      meta.append(el("span", "ach-progress", p.line));
      const bar = el("span", "ach-bar");
      const fill = el("i");
      fill.style.width = `${Math.round(p.share * 100)}%`;
      bar.append(fill);
      words.append(bar);
    }
    box.append(pic, words);
    return { box, state, points };
  }

  function draw(): void {
    let unlocked = 0;
    let points = 0;
    let unknown = false;
    const groups: HTMLElement[] = [];
    for (const g of GROUPS) {
      const list = el("div", "ach-list");
      list.setAttribute("role", "list");
      for (const listed of LIST) {
        const a = achievementBySlug(listed.slug);
        if (!a || a.group !== g) continue;
        const r = row(listed);
        if (!r) continue;
        if (r.state === "unlocked") {
          unlocked++;
          points += r.points;
        } else if (r.state === "unknown") unknown = true;
        list.append(r.box);
      }
      if (!list.childElementCount) continue;
      const sec = el("section", "ach-group");
      sec.append(el("h3", "ach-group-name", t(`ach.group.${g}`)), list);
      groups.push(sec);
    }
    const totals = el("div", "ach-totals");
    totals.append(
      el("div", "ach-total glass", t("ach.total.unlocked", { n: unlocked, all: LIST.length })),
      el("div", "ach-total glass", t("ach.total.points", { n: points, all: ALL_POINTS })),
    );
    const kids: HTMLElement[] = [el("h2", "ach-title", t("ach.title")), totals];
    // a read that said nothing: no locked state from it, and a word on why
    if (unknown && !pretend) kids.push(el("p", "ach-note", t(standing ? "ach.unchecked" : "ach.checking")));
    root.replaceChildren(...kids, ...groups);
  }

  /** The platform's word on which are unlocked, asked now (a round already under way is shared); onStanding draws it. */
  function read(): void {
    if (pretend) return;
    readStanding().then(
      (s) => {
        standing = s;
        if (shown) draw();
      },
      () => {}, // Server's round never throws by design; a surprise leaves the last standing as it was
    );
  }

  return {
    element: root,
    /** The tab opened: drawn from what is known, and the platform asked again. */
    show(): void {
      shown = true;
      draw();
      read();
    },
    hide(): void {
      shown = false;
    },
    /** The words changed (the player's language). */
    redraw(): void {
      if (shown) draw();
    },
  };
}

/**
 * Dev only (the dev menu's switch): the page with a mix of unlocked and locked, and counters part way
 * (achievements never unlock on dev or test). Null: the platform's own word again. Nothing is saved.
 */
export function pretendAchievements(on: boolean): void {
  if (import.meta.env.MODE === "release") return;
  if (!on) {
    pretend = null;
    return;
  }
  const ids = (slugs: string[]) => new Set(LIST.filter((a) => slugs.includes(a.slug)).map((a) => a.id));
  pretend = {
    unlocked: ids(["first-steps", "finding-your-feet", "stamped-t1", "stamped-t2", "something-to-remember", "up-for-a-challenge", "daily-habit"]),
    counts: { levels_finished: 37, trips_stamped: 2, souvenirs_finished: 3, hard_levels_won: 4, super_hard_levels_won: 0, dailies_won: 5 },
  };
}
export const pretendingAchievements = (): boolean => pretend !== null;
