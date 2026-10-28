// THE TABLE'S OWN WEATHER: soft snow drifting past the edges of the Winter
// Dusk table, a few leaves tumbling at the edges of the Autumn Study, blossom
// petals on a breeze at the edges of the Sunny Day (the art member's sprites,
// named in public/art/tables/tables.json, `particleKind`).
//
// The design's "soft snow drifting past its edges", within the game standard's
// rules for battery and heat:
//   - CSS only, animating transform and opacity, which the browser runs off
//     the main thread: no frame loop, no timer, nothing to wake;
//   - a handful (8 to 12), kept to the left and right edges and the two top
//     corners, never across the middle; the layer sits under every screen, so
//     a flake or a leaf passes behind the cards and buttons, never over them;
//   - stopped while the game is paused or hidden (html.paused, style.css), and
//     not drawn at all under less motion or the Arcade's Battery saver.
// Where each one falls is fixed from a seed, so the screen looks the same each
// time it is opened.
//
// HOME AND THE MENUS ONLY (the creator, 2026-10-28: "a nice touch for the home
// screen but we can't have them happening during a level, too distracting"):
// app.ts calls setWeather(false) as a board opens (its win card and a trip's
// stamp moment count as the board), and the weather fades out quickly, then
// leaves the page (display: none, so nothing runs); setWeather(true) on home or
// a menu brings it back, each flake starting its fall afresh.

import { onPlayerPrefs } from "../gem";
import { shownTable, onTableChange, tableArt, type TableArt } from "./tables";

type Sprite = TableArt;

interface Kind {
  count: number;
  /** CSS px across, smallest to largest. */
  size: [number, number];
  /** Seconds for a fall from the top to the bottom edge. */
  fall: [number, number];
  /** Side to side, px each way, and its seconds per swing. */
  sway: [number, number];
  swing: [number, number];
  /** Degrees each way of a tumble. */
  turn: [number, number];
  opacity: number;
}

const SNOW: Kind = { count: 12, size: [9, 17], fall: [15, 24], sway: [8, 16], swing: [2.6, 4.2], turn: [20, 60], opacity: 0.85 };
const LEAVES: Kind = { count: 9, size: [22, 30], fall: [17, 27], sway: [14, 24], swing: [3.2, 5], turn: [30, 60], opacity: 0.95 };
/** "A breeze, not a fall" (Art, 2026-10-28): half the leaves, two-thirds their speed, a wider, slower sway and a slow tumble. */
const PETALS: Kind = { count: 5, size: [18, 26], fall: [26, 40], sway: [22, 34], swing: [4.6, 7], turn: [40, 80], opacity: 0.95 };
const KINDS: Record<string, Kind> = { snow: SNOW, leaves: LEAVES, petals: PETALS };

const url = (path: string) => new URL(`${import.meta.env.BASE_URL}${path}`, location.href).href;

function flakes(a: Sprite): HTMLElement[] {
  if (!a.particles) return [];
  const kind = KINDS[a.particleKind ?? "snow"] ?? SNOW;
  const frames = Math.max(1, a.particleFrames ?? 1);
  const sprite = url(a.particles);
  let seed = 20261024;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const between = ([lo, hi]: [number, number]) => lo + rnd() * (hi - lo);
  const out: HTMLElement[] = [];
  for (let i = 0; i < kind.count; i++) {
    // lanes: the left edge, the right edge, the top-left corner, the top-right corner
    const lane = i % 4;
    const corner = lane >= 2;
    const x = lane === 0 ? 1 + rnd() * 6 : lane === 1 ? 93 + rnd() * 6 : lane === 2 ? 3 + rnd() * 20 : 77 + rnd() * 20;
    const fall = corner ? 24 + rnd() * 10 : 106;
    const dur = between(kind.fall) * (corner ? 0.4 : 1);
    const size = between(kind.size);
    const frame = i % frames;
    const pt = document.createElement("i");
    pt.className = "pt";
    pt.style.cssText = `left:${x.toFixed(1)}%;--fall:${fall.toFixed(0)};--dur:${dur.toFixed(1)}s;--delay:${(-rnd() * dur).toFixed(1)}s;--peak:${kind.opacity}`;
    const b = document.createElement("b");
    b.style.cssText =
      `width:${size.toFixed(0)}px;height:${size.toFixed(0)}px;` +
      `--sway:${between(kind.sway).toFixed(0)}px;--turn:${between(kind.turn).toFixed(0)}deg;--swing:${between(kind.swing).toFixed(1)}s;` +
      `background-image:url("${sprite}");background-size:${frames * 100}% 100%;` +
      `background-position:${frames > 1 ? ((frame / (frames - 1)) * 100).toFixed(2) : 0}% 0`;
    pt.append(b);
    out.push(pt);
  }
  return out;
}

/** The layer, once mounted. */
let layer: HTMLElement | null = null;
/** Counts each change of setWeather, so a fade-out finishing late never hides weather asked back meanwhile. */
let turning = 0;
/** How long the fade out takes (style.css, .particles transition). */
const FADE_MS = 320;

/** Weather on (home, the menus) or off (a board, its win card, a stamp moment): a quick fade either way. */
export function setWeather(on: boolean): void {
  const l = layer;
  if (!l || on === !l.classList.contains("calm")) return;
  const at = ++turning;
  if (on) {
    l.hidden = false;
    void l.offsetWidth; // laid out first, so the fade in runs
    l.classList.remove("calm");
  } else {
    l.classList.add("calm");
    setTimeout(() => at === turning && (l.hidden = true), FADE_MS);
  }
}

/** Lay the weather under the screens of `app` (its first child), following the chosen table. Call once. */
export function mountParticles(app: HTMLElement): void {
  const weather = (layer = document.createElement("div"));
  weather.className = "particles";
  weather.setAttribute("aria-hidden", "true");
  app.prepend(weather);
  let drawing = 0;
  const draw = async () => {
    const token = ++drawing;
    const a = (await tableArt(shownTable())) as Sprite | undefined;
    if (token === drawing) weather.replaceChildren(...(a ? flakes(a) : []));
  };
  onTableChange(() => void draw());
  void draw();
  // the Arcade's Battery saver: no weather at all (the game's settings have no switch of their own)
  onPlayerPrefs((prefs) => document.documentElement.classList.toggle("battery-saver", prefs.recommended?.batterySaver === true));
}
