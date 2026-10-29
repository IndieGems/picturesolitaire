"""The travel home screen's art (UI, 2026-10-26): the desk backdrop and the passport booklet.

    python tools/art/home.py desk <raw.png>        public/art/home-desk.webp
    python tools/art/home.py booklet <raw.png>     public/art/passport-booklet.webp
    python tools/art/home.py satchel <raw.png>     public/art/shop-satchel.webp
    python tools/art/home.py cosmetics <raw.png>   public/art/cosmetics-tile.webp

The raws are from the generator (prompts in tools/art/prompts.txt); each is kept as a
master in tools/art/masters/chrome/ and shipped small.

- desk: a traveller's desk on game-l.png's slate, the detail only at the edges and corners
  because home's UI covers nearly the whole column. Shown with "cover", so a tall phone
  loses the sides and a wide column the top and bottom. 1080x1920, under ~120 KB; the
  middle is darkened a little so the frosted ticket and the buttons read over it.
- booklet: a closed navy passport with a gold globe, the Passport button's picture, drawn
  at about 44x58 CSS px, so 150x200 is sharp at 3x. No shadow: the button has its lip.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
MASTERS = ROOT / "tools/art/masters/chrome"
OUT = ROOT / "public/art"


def desk(raw):
    im = Image.open(raw).convert("RGB")
    w, h = 1080, 1920
    im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS) if im.height != h else im
    x = (im.width - w) // 2
    im = im.crop((x, 0, x + w, h))
    # Darken the middle a little (to ~88%), easing out to nothing at the edges, under the UI.
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).ellipse((int(w * 0.12), int(h * 0.1), int(w * 0.88), int(h * 0.92)), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(120))
    dark = im.point(lambda v: int(v * 0.88))
    im = Image.composite(dark, im, mask)
    MASTERS.mkdir(parents=True, exist_ok=True)
    im.save(MASTERS / "home-desk.webp", "WEBP", quality=92, method=6)
    out = OUT / "home-desk.webp"
    for q in (72, 66, 60, 54, 48):
        im.save(out, "WEBP", quality=q, method=6)
        if out.stat().st_size <= 120 * 1024:
            break
    print(out.relative_to(ROOT), f"{w}x{h}", f"q{q}", f"{out.stat().st_size // 1024} KB")


def booklet(raw):
    im = Image.open(raw).convert("RGBA")
    a = im.getchannel("A")
    im = im.crop(a.point(lambda v: 255 if v > 8 else 0).getbbox())
    # The generator leaves the cover at alpha ~253: make it solid, keep the soft edge.
    im.putalpha(im.getchannel("A").point(lambda v: min(255, round(v * 255 / 250))))
    W, H = 150, 200
    s = min((W - 2) / im.width, (H - 2) / im.height)
    small = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.alpha_composite(small, ((W - small.width) // 2, (H - small.height) // 2))
    # Clear the colour under fully transparent pixels so it cannot bleed when scaled.
    canvas = Image.composite(canvas, Image.new("RGBA", canvas.size, (0, 0, 0, 0)),
                             canvas.getchannel("A").point(lambda v: 255 if v else 0))
    MASTERS.mkdir(parents=True, exist_ok=True)
    im.save(MASTERS / "passport-booklet.webp", "WEBP", quality=92, method=6)
    out = OUT / "passport-booklet.webp"
    canvas.save(out, "WEBP", quality=82, alpha_quality=90, method=6)
    print(out.relative_to(ROOT), f"{W}x{H}", f"{out.stat().st_size // 1024} KB")


def satchel(raw):
    """Home's Shop tile (UI, 2026-10-27): a leather satchel with the brass magnifier peeking out,
    beside the booklet in the dock. 108 px tall (a 36 px box at 3x), at most 120 wide, no shadow."""
    dock_tile(raw, "shop-satchel")


def cosmetics(raw):
    """Home's Cosmetics tile (UI, 2026-10-29): a brass gramophone and a rolled travel poster, the
    tables and the music the Cosmetics screen sells, in the satchel's size and treatment."""
    dock_tile(raw, "cosmetics-tile")


def dock_tile(raw, name):
    """A dock tile's picture: trimmed to its alpha, 108 px tall, at most 120 wide, no shadow."""
    im = Image.open(raw).convert("RGBA")
    im = im.crop(im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
    im.putalpha(im.getchannel("A").point(lambda v: min(255, round(v * 255 / 250))))
    s = min(108 / im.height, 120 / im.width)
    small = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    small = Image.composite(small, Image.new("RGBA", small.size, (0, 0, 0, 0)),
                            small.getchannel("A").point(lambda v: 255 if v else 0))
    MASTERS.mkdir(parents=True, exist_ok=True)
    im.save(MASTERS / f"{name}.webp", "WEBP", quality=92, method=6)
    out = OUT / f"{name}.webp"
    small.save(out, "WEBP", quality=84, alpha_quality=90, method=6)
    print(out.relative_to(ROOT), f"{small.width}x{small.height}", f"{out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    {"desk": desk, "booklet": booklet, "satchel": satchel, "cosmetics": cosmetics}[sys.argv[1]](sys.argv[2])
