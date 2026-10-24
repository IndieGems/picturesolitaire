// The outline of a card or a merged piece of any shape, as SVG paths: one
// continuous plump frame around all its cells, with the gutters between its
// cells filled in so the picture runs on across them (tools/art/chrome-spec.md).
//
// The cells are laid on a doubled grid, where odd lines are the gutters: a
// gutter between two cells of the piece is filled, and the little square where
// four gutters meet is filled only under a full 2x2 block. The boundary of
// that region is traced clockwise (material on the right), so holes come out
// the other way round, and every corner is rounded: convex corners with the
// frame's radius, concave ones with the same radius turned inside out.

export interface Loop {
  /** Corner points in px, clockwise around the material. */
  points: [number, number][];
}

/** The boundary loops of the cells (col, row), in px for cells `s` wide and `sh` tall, with gutters `g`. */
export function loops(cells: readonly [number, number][], s: number, g: number, sh = s): Loop[] {
  const has = new Set(cells.map(([c, r]) => c * 64 + r));
  const H = (c: number, r: number) => c >= 0 && r >= 0 && has.has(c * 64 + r);
  const filled = new Set<number>();
  const fill = (a: number, b: number) => filled.add(a * 256 + b);
  for (const [c, r] of cells) {
    fill(2 * c, 2 * r);
    if (H(c + 1, r)) fill(2 * c + 1, 2 * r);
    if (H(c, r + 1)) fill(2 * c, 2 * r + 1);
    if (H(c + 1, r) && H(c, r + 1) && H(c + 1, r + 1)) fill(2 * c + 1, 2 * r + 1);
  }
  const F = (a: number, b: number) => a >= 0 && b >= 0 && filled.has(a * 256 + b);
  const P = (a: number, b: number) => a * 256 + b;
  const next = new Map<number, number>();
  for (const k of filled) {
    const a = k >> 8;
    const b = k & 255;
    if (!F(a, b - 1)) next.set(P(a, b), P(a + 1, b));
    if (!F(a + 1, b)) next.set(P(a + 1, b), P(a + 1, b + 1));
    if (!F(a, b + 1)) next.set(P(a + 1, b + 1), P(a, b + 1));
    if (!F(a - 1, b)) next.set(P(a, b + 1), P(a, b));
  }
  const X = (line: number) => (line >> 1) * (s + g) + (line & 1 ? s : 0);
  const Y = (line: number) => (line >> 1) * (sh + g) + (line & 1 ? sh : 0);
  const out: Loop[] = [];
  while (next.size) {
    const first = next.keys().next().value as number;
    const raw: number[] = [];
    let at = first;
    do {
      raw.push(at);
      const to = next.get(at)!;
      next.delete(at);
      at = to;
    } while (at !== first && next.has(at));
    // keep only the points where the direction turns
    const pts: [number, number][] = [];
    for (let i = 0; i < raw.length; i++) {
      const p = raw[(i + raw.length - 1) % raw.length]!;
      const q = raw[i]!;
      const r = raw[(i + 1) % raw.length]!;
      const d1 = [(q >> 8) - (p >> 8), (q & 255) - (p & 255)];
      const d2 = [(r >> 8) - (q >> 8), (r & 255) - (q & 255)];
      if (d1[0] !== d2[0] || d1[1] !== d2[1]) pts.push([X(q >> 8), Y(q & 255)]);
    }
    out.push({ points: pts });
  }
  return out;
}

/** Each loop moved inward by `t` px (the window inside the frame's rim). */
export function inset(ls: Loop[], t: number): Loop[] {
  return ls.map(({ points }) => {
    const n = points.length;
    return {
      points: points.map((v, i) => {
        const a = points[(i + n - 1) % n]!;
        const b = points[(i + 1) % n]!;
        const din = unit(v[0] - a[0], v[1] - a[1]);
        const dout = unit(b[0] - v[0], b[1] - v[1]);
        // the material is on the right of travel: inward normal (-dy, dx)
        return [v[0] + t * (-din[1] - dout[1]), v[1] + t * (din[0] + dout[0])] as [number, number];
      }),
    };
  });
}

function unit(x: number, y: number): [number, number] {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}

const f = (n: number) => Math.round(n * 100) / 100;

/** An SVG path of the loops with rounded corners: `convex` and `concave` radii in px. */
export function path(ls: Loop[], convex: number, concave: number): string {
  let d = "";
  for (const { points } of ls) {
    const n = points.length;
    if (n < 3) continue;
    const corners = points.map((v, i) => {
      const a = points[(i + n - 1) % n]!;
      const b = points[(i + 1) % n]!;
      const lin = Math.hypot(v[0] - a[0], v[1] - a[1]);
      const lout = Math.hypot(b[0] - v[0], b[1] - v[1]);
      const din = unit(v[0] - a[0], v[1] - a[1]);
      const dout = unit(b[0] - v[0], b[1] - v[1]);
      const turn = din[0] * dout[1] - din[1] * dout[0];
      const r = Math.min(turn > 0 ? convex : concave, lin / 2, lout / 2);
      return {
        from: [v[0] - din[0] * r, v[1] - din[1] * r],
        to: [v[0] + dout[0] * r, v[1] + dout[1] * r],
        r,
        sweep: turn > 0 ? 1 : 0,
      };
    });
    const c0 = corners[0]!;
    d += `M${f(c0.to[0]!)} ${f(c0.to[1]!)}`;
    for (let i = 1; i <= n; i++) {
      const c = corners[i % n]!;
      d += `L${f(c.from[0]!)} ${f(c.from[1]!)}A${f(c.r)} ${f(c.r)} 0 0 ${c.sweep} ${f(c.to[0]!)} ${f(c.to[1]!)}`;
    }
    d += "Z";
  }
  return d;
}

/** The bounding box of the cells, in px (cells `s` wide and `sh` tall). */
export function box(cells: readonly [number, number][], s: number, g: number, sh = s): { x: number; y: number; w: number; h: number } {
  let c0 = Infinity, c1 = -Infinity, r0 = Infinity, r1 = -Infinity;
  for (const [c, r] of cells) {
    c0 = Math.min(c0, c);
    c1 = Math.max(c1, c);
    r0 = Math.min(r0, r);
    r1 = Math.max(r1, r);
  }
  return { x: c0 * (s + g), y: r0 * (sh + g), w: (c1 - c0 + 1) * (s + g) - g, h: (r1 - r0 + 1) * (sh + g) - g };
}
