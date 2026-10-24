// A burst over a milestone card (the guide's finish, guide.ts): warm amber
// sparks and frost-white flakes, the table's two lights, thrown up from below
// the card and drifting down like snow. The game standard ("Achievements and
// event milestones get a BIG celebration"): one canvas that removes itself when
// the last piece is out or the card leaves the page; nothing under less
// motion; paced by the board's one loop (src/board/pace.ts), so it draws on
// the same refreshes, at most 60 a second, and stands still while paused.

import { run } from "../board/pace";

const COLOURS = ["#f6c27a", "#e99645", "#ffe2a8", "#ffffff", "#dfe9f5", "#ffb45c"];
const TAU = Math.PI * 2;

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  colour: string;
  /** A flake turns and sways as it falls; a spark streaks. */
  flake: boolean;
  turn: number;
}

/** Throw `bursts` over `ms` into `host` (which must be positioned). Does nothing under less motion. */
export function fireworks(host: HTMLElement, bursts = 5, ms = 2600): void {
  const less = document.documentElement.classList.contains("less-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (less) return;
  const cv = document.createElement("canvas");
  cv.className = "fireworks";
  cv.setAttribute("aria-hidden", "true");
  host.prepend(cv);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = host.clientWidth;
  const h = host.clientHeight;
  const c = cv.getContext("2d");
  if (!c || !w || !h) return cv.remove();
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  const scale = Math.sqrt(Math.min(w, h) / 360);
  const pick = () => COLOURS[Math.floor(Math.random() * COLOURS.length)]!;

  const due = Array.from({ length: bursts }, (_, i) => ({
    at: i < 2 ? i * 160 : 300 + ((ms - 1300) * (i - 1)) / Math.max(1, bursts - 2) + Math.random() * 160,
    x: w * (0.18 + Math.random() * 0.64),
    y: h * (0.14 + Math.random() * 0.3),
  }));
  const bits: Bit[] = [];
  const burst = (x: number, y: number) => {
    const n = 26;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + Math.random() * 0.25;
      const v = (0.16 + Math.random() * 0.14) * scale;
      const flake = k % 3 === 0;
      bits.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.04, age: 0, life: 1500 + Math.random() * 700,
        size: (flake ? 4.5 + Math.random() * 2.5 : 2.2 + Math.random() * 1.4) * scale, colour: flake ? "#ffffff" : pick(), flake, turn: Math.random() * TAU,
      });
    }
  };

  let age = 0;
  run((dt) => {
    if (!cv.isConnected || !host.isConnected) {
      cv.remove();
      return false;
    }
    age += dt;
    while (due.length && due[0]!.at <= age) {
      const d = due.shift()!;
      burst(d.x, d.y);
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i]!;
      b.age += dt;
      if (b.age > b.life) {
        bits.splice(i, 1);
        continue;
      }
      // a light pull down, more air on a flake
      b.vy += (b.flake ? 0.00012 : 0.00022) * dt;
      b.vx *= b.flake ? 0.995 : 0.998;
      b.x += b.vx * dt + (b.flake ? Math.sin(b.age / 260 + b.turn) * 0.12 : 0);
      b.y += b.vy * dt;
      const left = 1 - b.age / b.life;
      c.globalAlpha = Math.min(1, left * 1.6);
      if (b.flake) {
        // a six-armed flake, turning
        c.strokeStyle = b.colour;
        c.lineWidth = Math.max(1, b.size * 0.28);
        c.lineCap = "round";
        const turn = b.turn + b.age / 900;
        c.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = turn + (k * Math.PI) / 3;
          c.moveTo(b.x - Math.cos(a) * b.size, b.y - Math.sin(a) * b.size);
          c.lineTo(b.x + Math.cos(a) * b.size, b.y + Math.sin(a) * b.size);
        }
        c.stroke();
      } else {
        // a spark: a short bright streak along its way
        c.strokeStyle = b.colour;
        c.lineWidth = b.size;
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(b.x, b.y);
        c.lineTo(b.x - b.vx * 46, b.y - b.vy * 46);
        c.stroke();
      }
    }
    c.globalAlpha = 1;
    if (!due.length && !bits.length) {
      cv.remove();
      return false;
    }
    return true;
  });
}
