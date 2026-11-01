"""The Gem bundles' pictures (lead, 2026-11-01): the Starter Kit and the Small, Medium and Large bundles of helpers.

    python tools/art/bundles.py stacks               helper masters -> Small and Medium
    python tools/art/bundles.py drawn <name> <raw>   a generated raw (starter or large) -> its master, then its copies

Each bundle gets the copies the helpers get (tools/art/helpers.py): the config item's icon,
tools/art/items/bundle-<name>.webp (512 px, not shipped in the build), and the game's own,
public/art/bundle-<name>.webp (192 px, under ~15 KB, drawn at the helpers' 56-64 CSS px in the shop
rows). All transparent, none with a number on it: the shop row says the contents.

- Small (2 hints, an undo and a shuffle) and Medium (three of each) are composed here, for free,
  from the very Hint, Undo and Shuffle masters (tools/art/masters/chrome/helper-*.webp), as the
  same three stacks growing: shuffles back left, undos back right, hints in front.
- Large (eight of each) is a generated heap of the same three, drawn with the three helper masters
  and Medium's picture as its references (a composed heap of that many read as loose stickers, and
  a draw without Medium lost the U-turn and the card pair). Redraw it if Medium changes.
- The Starter Kit, the once-per-player deal, is generated too: a cream travel case with a red bow,
  holding one of each helper.

The generated ones' prompts are in tools/art/prompts.txt; their masters are
tools/art/masters/chrome/bundle-<name>.webp.
"""
import ctypes
import sys
from pathlib import Path

from PIL import Image, ImageFilter

if sys.platform == "win32":  # AGENTS.md: the machine is shared, encode at below-normal priority
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)

ROOT = Path(__file__).resolve().parents[2]
MASTERS = ROOT / "tools/art/masters/chrome"
ITEMS = ROOT / "tools/art/items"
PUBLIC = ROOT / "public/art"
ITEM_SIZE = 512  # the platform's offer picture: square, 256-1024 px, under 2 MB
GAME_SIZE = 192  # the shop rows' picture, as the helpers'
GAME_BUDGET = 15 * 1024
WORK = 1536  # composed at 3x, then scaled down
PAD = 0.04

# Per stack: (helper, how many, centre x, centre y, size of the front copy, tilt), in units of the
# canvas side, and per bundle how far each copy behind steps up-left (in units of the front copy's
# size); each copy behind is also SHRINK smaller and turned TURN degrees further.
STACKS = {
    "small": ([("shuffle", 1, 0.33, 0.37, 0.50, -6), ("undo", 1, 0.69, 0.36, 0.44, 4), ("hint", 2, 0.56, 0.70, 0.42, -8)], 0.20),
    "medium": ([("shuffle", 3, 0.38, 0.42, 0.40, -6), ("undo", 3, 0.76, 0.40, 0.34, 4), ("hint", 3, 0.60, 0.74, 0.36, -8)], 0.17),
}
SHRINK = 0.03
TURN = 4
DRAWN = ("starter", "large")


def clean(im):
    """Clear the colour under fully transparent pixels so it cannot bleed when scaled."""
    a = im.getchannel("A").point(lambda v: 255 if v else 0)
    return Image.composite(im, Image.new("RGBA", im.size, (0, 0, 0, 0)), a)


def trimmed(im):
    return im.crop(im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())


def squared(im):
    im = trimmed(im)
    side = round(max(im.size) * (1 + 2 * PAD))
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.alpha_composite(im, ((side - im.width) // 2, (side - im.height) // 2))
    return sq


def contact(obj, side):
    """A soft dark rim under an object, so the one in front parts from the one behind it."""
    a = obj.getchannel("A").filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(side * 0.006))
    sh = Image.new("RGBA", obj.size, (40, 48, 64, 0))
    sh.putalpha(a.point(lambda v: round(v * 0.42)))
    return sh


def composed(name):
    masters = {n: trimmed(Image.open(MASTERS / f"helper-{n}.webp").convert("RGBA")) for n in ("hint", "undo", "shuffle")}
    canvas = Image.new("RGBA", (WORK, WORK), (0, 0, 0, 0))
    stacks, step = STACKS[name]
    for helper, count, cx, cy, size, tilt in stacks:
        m = masters[helper]
        for k in reversed(range(count)):  # the back copy first
            s = size * (1 - SHRINK * k) * WORK / max(m.size)
            obj = m.resize((round(m.width * s), round(m.height * s)), Image.LANCZOS)
            obj = obj.rotate(tilt + TURN * k, resample=Image.BICUBIC, expand=True)
            x = (cx - step * k * size) * WORK - obj.width / 2
            y = (cy - 0.9 * step * k * size) * WORK - obj.height / 2
            at = (round(x), round(y))
            canvas.alpha_composite(contact(obj, WORK), (at[0] + round(WORK * 0.004), at[1] + round(WORK * 0.008)))
            canvas.alpha_composite(obj, at)
    return squared(canvas)


def copies(im, name):
    ITEMS.mkdir(parents=True, exist_ok=True)
    out = ITEMS / f"bundle-{name}.webp"
    clean(im.resize((ITEM_SIZE, ITEM_SIZE), Image.LANCZOS)).save(out, "WEBP", quality=88, alpha_quality=95, method=6)
    print(out.relative_to(ROOT), f"{ITEM_SIZE}x{ITEM_SIZE}", f"{out.stat().st_size // 1024} KB")
    out = PUBLIC / f"bundle-{name}.webp"
    small = clean(im.resize((GAME_SIZE, GAME_SIZE), Image.LANCZOS))
    for q in (86, 80, 74, 68, 62):
        small.save(out, "WEBP", quality=q, alpha_quality=90, method=6)
        if out.stat().st_size <= GAME_BUDGET:
            break
    print(out.relative_to(ROOT), f"{GAME_SIZE}x{GAME_SIZE}", f"q{q}", f"{out.stat().st_size // 1024} KB")


def stacks():
    for name in STACKS:
        copies(composed(name), name)


def drawn(name, raw):
    assert name in DRAWN, name
    im = squared(Image.open(raw).convert("RGBA"))
    # The generator leaves solid areas at alpha ~250: make them solid, keep the soft edge.
    im.putalpha(im.getchannel("A").point(lambda v: min(255, round(v * 255 / 250))))
    im = clean(im)
    MASTERS.mkdir(parents=True, exist_ok=True)
    im.save(MASTERS / f"bundle-{name}.webp", "WEBP", quality=92, alpha_quality=95, method=6)
    copies(im, name)


if __name__ == "__main__":
    stacks() if sys.argv[1] == "stacks" else drawn(sys.argv[2], sys.argv[3])
