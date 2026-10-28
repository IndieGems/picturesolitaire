"""The starburst behind the daily's "item found" moment, drawn procedurally (no generation needed).

    python tools/art/starburst.py   -> public/art/item-starburst.webp

UI rotates it slowly behind the suitcase item's cut-out (lead and UI, 2026-10-27). Warm amber
rays from the centre, in game-l.png's lantern light: a soft cream-gold glow at the middle (the
item covers it), 12 long rays and 12 short ones between them, every ray fading to fully
transparent well inside the square, so no rim or corner shows at any angle. The rays are evenly
spaced, so a slow spin reads as one continuous turn (one ray period is 30 degrees, if a loop
needs a seam). Soft and blurred on purpose: it is light, not paint, and it stays small as a
WebP (lossy colour, lossless alpha: a lossy alpha bands the fade into rings; ~59 KB). Drawn at 2x and
scaled down.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/art/item-starburst.webp"
SIZE, SS = 768, 2
N = 12  # long rays; as many short ones sit halfway between them

n = SIZE * SS
c = (n - 1) / 2
y, x = np.mgrid[0:n, 0:n].astype(np.float64)
dx, dy = (x - c) / c, (y - c) / c
r = np.hypot(dx, dy)  # 0 at the centre, 1 at the middle of an edge
t = np.arctan2(dy, dx) / (2 * np.pi) * N  # one unit per ray period


def smooth(e0, e1, v):
    u = np.clip((v - e0) / (e1 - e0), 0, 1)
    return u * u * (3 - 2 * u)


def wedge(offset, half, feather):
    """1 inside a ray, 0 between rays; `half` and `feather` are fractions of the ray period."""
    d = np.abs((t - offset + 0.5) % 1.0 - 0.5)
    return 1 - smooth(half - feather, half + feather, d)


def fade(r0, r1, v):
    """Full strength near the centre, easing to nothing from r0 to r1."""
    return 1 - smooth(r0, r1, v)


long_a = wedge(0.0, 0.19, 0.10) * fade(0.18, 0.97, r) ** 1.3
short_a = wedge(0.5, 0.12, 0.08) * fade(0.12, 0.66, r) ** 1.3
glow_a = np.exp(-((r / 0.34) ** 2))
halo_a = np.exp(-((r / 0.55) ** 2))  # warm light between the rays

# Colours: candle cream at the middle, the lanterns' amber further out.
cream = np.array([255, 240, 200], np.float64)
gold = np.array([255, 205, 110], np.float64)
amber = np.array([246, 160, 58], np.float64)


def mix(a, b, u):
    """a to b by u (a colour, or a picture of colours)."""
    return a * (1 - u[..., None]) + b * u[..., None]


ray_rgb = mix(mix(cream, gold, smooth(0.0, 0.3, r)), amber, smooth(0.25, 0.8, r))
short_rgb = mix(gold, amber, smooth(0.1, 0.6, r))

# Layer them (straight alpha "over"): a faint amber halo, the long rays, the short rays, the glow on top.
layers = [(amber, 0.30 * halo_a), (ray_rgb, 0.85 * long_a), (short_rgb, 0.62 * short_a), (mix(cream, gold, smooth(0, 0.4, r)), 0.9 * glow_a)]
rgb = np.zeros((n, n, 3))
a = np.zeros((n, n))
for col, al in layers:
    out_a = al + a * (1 - al)
    rgb = np.where(out_a[..., None] > 0, (col * al[..., None] + rgb * (a * (1 - al))[..., None]) / np.maximum(out_a, 1e-6)[..., None], 0)
    a = out_a
a *= fade(0.9, 1.0, r)  # belt and braces: nothing reaches the square's edge
a = np.clip((a - 3 / 255) / (1 - 3 / 255), 0, 1)  # no near-invisible haze for the WebP to band into rings

im = Image.fromarray(np.dstack([rgb, a * 255]).round().clip(0, 255).astype(np.uint8), "RGBA")
im = im.resize((SIZE, SIZE), Image.LANCZOS)
OUT.parent.mkdir(parents=True, exist_ok=True)
im.save(OUT, "WEBP", quality=72, alpha_quality=100, method=6)
print(f"{OUT.relative_to(ROOT)}: {SIZE}x{SIZE}, {OUT.stat().st_size // 1024} KB")
