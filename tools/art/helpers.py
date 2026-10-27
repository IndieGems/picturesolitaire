"""The home shop's helper pictures (UI, 2026-10-27): Hint, Undo and Shuffle, single and as a pack of 3.

    python tools/art/helpers.py <raw-dir>     raw <name>-raw.png -> masters + public/art/helper-<name>.webp

The raws are transparent PNGs from the generator in game-l.png's look (prompts in
tools/art/prompts.txt). Each is cropped to its object, centred on a square, kept as a master in
tools/art/masters/chrome/helper-<name>.webp, and shipped at SIZE px (drawn at 56-64 CSS px, so
sharp at 3x) under ~15 KB. The pack picture, helper-<name>-3.webp, is three copies of the master
fanned behind one another, made here so it costs nothing to generate.
"""
import ctypes
import sys
from pathlib import Path

from PIL import Image

if sys.platform == "win32":  # AGENTS.md: the machine is shared, encode at below-normal priority
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)

ROOT = Path(__file__).resolve().parents[2]
MASTERS = ROOT / "tools/art/masters/chrome"
OUT = ROOT / "public/art"
NAMES = ("hint", "undo", "shuffle")
SIZE = 192
BUDGET = 15 * 1024
PAD = 0.04


def clean(im):
    """Clear the colour under fully transparent pixels so it cannot bleed when scaled."""
    a = im.getchannel("A").point(lambda v: 255 if v else 0)
    return Image.composite(im, Image.new("RGBA", im.size, (0, 0, 0, 0)), a)


def squared(im):
    im = im.crop(im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
    side = round(max(im.size) * (1 + 2 * PAD))
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.alpha_composite(im, ((side - im.width) // 2, (side - im.height) // 2))
    return sq


def ship(im, out):
    small = clean(im.resize((SIZE, SIZE), Image.LANCZOS))
    for q in (86, 80, 74, 68, 62):
        small.save(out, "WEBP", quality=q, alpha_quality=90, method=6)
        if out.stat().st_size <= BUDGET:
            break
    print(out.relative_to(ROOT), f"{SIZE}x{SIZE}", f"q{q}", f"{out.stat().st_size // 1024} KB")


def pack_of_three(master):
    """Three copies fanned behind one another: the back two smaller, tilted and offset up-left."""
    side = master.width
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    for scale, angle, dx, dy in ((0.70, 14, -0.17, -0.17), (0.74, 7, -0.06, -0.08), (0.80, 0, 0.09, 0.08)):
        m = master.resize((round(side * scale),) * 2, Image.LANCZOS).rotate(angle, resample=Image.BICUBIC, expand=True)
        canvas.alpha_composite(m, (round((side - m.width) / 2 + dx * side), round((side - m.height) / 2 + dy * side)))
    return squared(canvas)


def main(raw_dir):
    MASTERS.mkdir(parents=True, exist_ok=True)
    for name in NAMES:
        raw = Path(raw_dir) / f"helper-{name}-raw.png"
        im = squared(Image.open(raw).convert("RGBA"))
        im.putalpha(im.getchannel("A").point(lambda v: min(255, round(v * 255 / 250))))
        clean(im).save(MASTERS / f"helper-{name}.webp", "WEBP", quality=92, method=6)
        ship(im, OUT / f"helper-{name}.webp")
        ship(pack_of_three(im), OUT / f"helper-{name}-3.webp")


if __name__ == "__main__":
    main(sys.argv[1])
