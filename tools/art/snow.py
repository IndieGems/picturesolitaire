"""Drifting-snow sprites for the table, drawn procedurally (no generation needed).

    python tools/art/snow.py   -> public/art/snow.png

One strip of four 32x32 white flakes on transparent, left to right:
  0 soft dot, small and dense        (most of the flakes: the concept's out-of-focus snow)
  1 soft dot, large and faint        (near the camera; draw few, bigger, slower)
  2 crisp round flake                (mid distance)
  3 six-armed crystal                (rare accent; rotate it slowly as it falls)
Tint is pure white: the table's cold light comes from drawing them at 50-90% opacity.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/art/snow.png"
CELL, SS = 32, 8  # cell size, supersampling


def soft(radius, peak):
    im = Image.new("RGBA", (CELL, CELL), (255, 255, 255, 0))
    px = im.load()
    c = (CELL - 1) / 2
    for y in range(CELL):
        for x in range(CELL):
            d = math.hypot(x - c, y - c) / radius
            if d < 1:
                px[x, y] = (255, 255, 255, int(255 * peak * (1 - d * d) ** 2))
    return im


def crisp(radius):
    big = Image.new("L", (CELL * SS, CELL * SS), 0)
    ImageDraw.Draw(big).ellipse([(CELL / 2 - radius) * SS, (CELL / 2 - radius) * SS,
                                 (CELL / 2 + radius) * SS, (CELL / 2 + radius) * SS], fill=235)
    a = big.resize((CELL, CELL), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))
    im = Image.new("RGBA", (CELL, CELL), (255, 255, 255, 0))
    im.putalpha(a)
    return im


def crystal():
    big = Image.new("L", (CELL * SS, CELL * SS), 0)
    d = ImageDraw.Draw(big)
    c = CELL * SS / 2
    arm = 12.5 * SS
    w = int(1.6 * SS)
    for k in range(6):
        a = math.radians(k * 60 - 90)
        ex, ey = c + arm * math.cos(a), c + arm * math.sin(a)
        d.line([(c, c), (ex, ey)], fill=230, width=w)
        d.ellipse([ex - w * 0.6, ey - w * 0.6, ex + w * 0.6, ey + w * 0.6], fill=230)
        for t, blen in ((0.55, 4.2), (0.78, 2.8)):
            bx, by = c + arm * t * math.cos(a), c + arm * t * math.sin(a)
            for s in (-1, 1):
                b = a + s * math.radians(50)
                d.line([(bx, by), (bx + blen * SS * math.cos(b), by + blen * SS * math.sin(b))], fill=230, width=int(w * 0.8))
    d.ellipse([c - 2.2 * SS, c - 2.2 * SS, c + 2.2 * SS, c + 2.2 * SS], fill=240)
    a = big.resize((CELL, CELL), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.35))
    im = Image.new("RGBA", (CELL, CELL), (255, 255, 255, 0))
    im.putalpha(a)
    return im


def main():
    strip = Image.new("RGBA", (CELL * 4, CELL), (255, 255, 255, 0))
    for i, im in enumerate((soft(6.5, 0.95), soft(15, 0.55), crisp(4.2), crystal())):
        strip.paste(im, (i * CELL, 0))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    strip.save(OUT, optimize=True)
    print(OUT.relative_to(ROOT), strip.size, OUT.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
