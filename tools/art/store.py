"""Store page art, written into the store-page bundle (.gemarcade/), from the shipped art only.

    python tools/art/store.py <wide-table.png>       build everything (needs the wide table, see below)
    python tools/art/store.py <wide-table.png> <out.png>   also a contact sheet of it all

What it is made of, and nothing else: the winter table (the portrait table master and a
wide 16:9 table generated from game-l.png, prompt in tools/art/prompts.txt), REAL puzzle
pictures in frames drawn to tools/art/chrome-spec.md (the same numbers the board uses),
and the wordmark. No fake interface: no buttons, counters or bars.

The scene everywhere is one picture being mended: the harbour at sunset, five of its six
cards already joined into one piece, the last card lifted over its empty cell.

Writes (paths are the bundle's; storepage.yaml names them under media):
  hero/key_art.jpg            2560x1440, no text      media.hero.key_art_clean
  hero/capsule_landscape.jpg  1920x1080, with title   media.capsules.landscape
  hero/capsule_square.jpg     1024x1024, with title   media.capsules.square
  hero/logo.png               the wordmark, alpha     media.hero.logo
  hero/share_card.jpg         1200x630, with title    media.share_card
Opaque art is JPEG q92: the Arcade re-encodes every image anyway, and this keeps the
bundle (which is committed) small.
  borders/winter-table.jpg    2560x1440, opaque       media.portrait_borders[0]
"""
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

sys.dont_write_bytecode = True  # importing mockup must not leave a __pycache__ in the repo
sys.path.insert(0, str(Path(__file__).resolve().parent))
from mockup import (LIP, LIP_BOTTOM, LIP_TOP, R_IN, R_OUT, RIM, RIM_BOTTOM, RIM_LINE, RIM_TOP,  # noqa: E402
                    SHADOW_BLUR, SHADOW_Y, vgrad)

ROOT = Path(__file__).resolve().parents[2]
BUNDLE = ROOT / ".gemarcade"
MASTERS = ROOT / "tools/art/masters/chrome"
SS = 3  # supersampling for smooth rounded edges
GUTTER = 0.08  # between cells, fraction of the cell (chrome-spec.md)
HERO = "dusk-harbour"  # 3x2, warm sunset against the cold table


def picture(pid):
    cat = json.loads((ROOT / "src/content/pictures.json").read_text(encoding="utf-8"))
    p = next(x for x in cat["pictures"] if x["id"] == pid)
    # The master is the generated pixels at full size: sharper than the shipped copy.
    return Image.open(MASTERS.parent / f"{pid}.webp").convert("RGB"), p


def shape(size, rects, concave, inset, r, rc):
    """Mask of a piece's outline: rounded rects (each inset), plus an inverted round at each
    concave corner. concave: (x, y, dx, dy), the corner and the direction into the empty cell."""
    m = Image.new("L", (size[0] * SS, size[1] * SS), 0)
    d = ImageDraw.Draw(m)
    for x0, y0, x1, y1 in rects:
        d.rounded_rectangle([(x0 + inset) * SS, (y0 + inset) * SS, (x1 - inset) * SS, (y1 - inset) * SS],
                            radius=r * SS, fill=255)
    for cx, cy, dx, dy in concave:
        px, py, rr = cx - dx * inset, cy - dy * inset, rc + inset
        xs, ys = sorted((px, px + dx * rr)), sorted((py, py + dy * rr))
        d.rectangle([xs[0] * SS, ys[0] * SS, xs[1] * SS, ys[1] * SS], fill=255)
        ex, ey = px + dx * rr, py + dy * rr
        d.ellipse([(ex - rr) * SS, (ey - rr) * SS, (ex + rr) * SS, (ey + rr) * SS], fill=0)
    return m.resize(size, Image.LANCZOS)


def piece(s, w, h, rects, concave, pic, lifted=False):
    """One framed piece (a card or merged cards) on its own transparent layer.
    w, h: the piece's outer size; rects/concave in piece coordinates; pic covers w x h.
    Returns (layer, (ox, oy)): where the piece's top-left sits inside the layer."""
    pad = round(s * 0.35)
    W, H = round(w + 2 * pad), round(h + 2 * pad + s * LIP)
    k = 2 if lifted else 1  # a lifted card's shadow doubles (chrome-spec.md)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    def at(dx, dy):
        return [(x0 + pad + dx, y0 + pad + dy, x1 + pad + dx, y1 + pad + dy) for x0, y0, x1, y1 in rects], \
               [(cx + pad + dx, cy + pad + dy, ddx, ddy) for cx, cy, ddx, ddy in concave]

    # The drop shadow on the table: the face and its lip, pushed down, blurred.
    r_, c_ = at(0, s * SHADOW_Y * k)
    sh = shape((W, H), r_ + [(x0, y0 + s * LIP, x1, y1 + s * LIP) for x0, y0, x1, y1 in r_],
               [(cx, cy + s * LIP, dx, dy) for cx, cy, dx, dy in c_] + c_, 0, s * R_OUT, s * R_OUT)
    sh = sh.filter(ImageFilter.GaussianBlur(s * SHADOW_BLUR * k))
    layer.paste(Image.new("RGBA", (W, H), (8, 14, 22, 160)), (0, 0), sh)
    # The plump lip below the face.
    r_, c_ = at(0, s * LIP)
    layer.paste(vgrad((W, H), LIP_TOP, LIP_BOTTOM).convert("RGBA"), (0, 0), shape((W, H), r_, c_, 0, s * R_OUT, s * R_OUT))
    # The frosted rim, with its bright top edge.
    r_, c_ = at(0, 0)
    rim = Image.new("RGBA", (W, H))
    rim.paste(vgrad((round(w), round(h)), RIM_TOP, RIM_BOTTOM), (pad, pad))
    layer.paste(rim, (0, 0), shape((W, H), r_, c_, 0, s * R_OUT, s * R_OUT))
    top = shape((W, H), r_, c_, 0, s * R_OUT, s * R_OUT)
    below = shape((W, H), *at(0, 1.6), 0, s * R_OUT, s * R_OUT)
    hi = Image.composite(top, Image.new("L", (W, H), 0), Image.eval(below, lambda v: 255 - v))
    layer.paste(Image.new("RGBA", (W, H), (244, 247, 251, 255)), (0, 0), hi)
    # The hairline where rim meets picture, then the picture, untouched.
    i = s * RIM
    layer.paste(Image.new("RGBA", (W, H), RIM_LINE + (255,)), (0, 0), shape((W, H), r_, c_, i - 1.5, s * R_IN + 1.5, s * R_OUT))
    full = Image.new("RGBA", (W, H))
    full.paste(pic.resize((round(w - 2 * i), round(h - 2 * i)), Image.LANCZOS), (round(pad + i), round(pad + i)))
    layer.paste(full, (0, 0), shape((W, H), r_, c_, i, s * R_IN, s * R_OUT))
    return layer, (pad, pad)


def faint_cell(canvas, x, y, s):
    """An empty cell as the board draws it: a faint frosted square on the table."""
    m = shape(canvas.size, [(x, y, x + s, y + s)], [], 0, s * R_OUT, 0)
    edge = m.filter(ImageFilter.FIND_EDGES)
    canvas.alpha_composite(Image.composite(Image.new("RGBA", canvas.size, (214, 226, 240, 20)),
                                           Image.new("RGBA", canvas.size, (0, 0, 0, 0)), m))
    canvas.alpha_composite(Image.composite(Image.new("RGBA", canvas.size, (214, 226, 240, 40)),
                                           Image.new("RGBA", canvas.size, (0, 0, 0, 0)), edge))


def mending(canvas, cx, cy, s, angle=-7, lift=(0.30, -0.42)):
    """The hero picture, five cards joined and the last one lifted over its cell.
    (cx, cy) is the centre of the whole 3x2 picture; s the cell size in px."""
    pic, _ = picture(HERO)
    g = s * GUTTER
    W, H = 3 * s + 2 * g, 2 * s + g
    x0, y0 = cx - W / 2, cy - H / 2
    faint_cell(canvas, x0 + 2 * (s + g), y0 + s + g, s)
    # The joined five: the top row plus the two bottom-left cards, one frame, one picture.
    rects = [(0, 0, W, s), (0, 0, 2 * s + g, H)]
    concave = [(2 * s + g, s, 1, 1)]
    layer, (ox, oy) = piece(s, W, H, rects, concave, pic)
    canvas.alpha_composite(layer, (round(x0 - ox), round(y0 - oy)))
    # The last card, its own part of the picture, lifted: 6% bigger, tilted, shadow doubled.
    pw, ph = pic.size
    cut = pic.crop((round(pw * 2 / 3), round(ph / 2), pw, ph))
    S = s * 1.06
    card, (ox, oy) = piece(S, S, S, [(0, 0, S, S)], [], cut, lifted=True)
    card = card.rotate(angle, resample=Image.BICUBIC, expand=True)
    tx = x0 + 2 * (s + g) + s / 2 + lift[0] * s
    ty = y0 + s + g + s / 2 + lift[1] * s
    canvas.alpha_composite(card, (round(tx - card.width / 2), round(ty - card.height / 2 + S * LIP / 2)))


def wordmark(width):
    im = Image.open(MASTERS / "wordmark.webp").convert("RGBA")
    return im.resize((round(width), round(im.height * width / im.width)), Image.LANCZOS)


def glow(canvas, box, strength=110):
    """A soft dark pool behind the title so it reads on any part of the table."""
    m = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(m).ellipse(box, fill=strength)
    m = m.filter(ImageFilter.GaussianBlur((box[2] - box[0]) * 0.12))
    canvas.alpha_composite(Image.composite(Image.new("RGBA", canvas.size, (16, 22, 32, 255)),
                                           Image.new("RGBA", canvas.size, (0, 0, 0, 0)), m))


def save(im, rel, out):
    im.convert("RGB").save(BUNDLE / rel, "JPEG", quality=92, optimize=True, progressive=True, subsampling=0)
    out[rel] = im


def build(wide_path):
    out = {}
    wide = Image.open(wide_path).convert("RGB").resize((2560, 1440), Image.LANCZOS)
    wide.save(MASTERS / "wide-table.webp", "WEBP", quality=92, method=6)
    (BUNDLE / "hero").mkdir(parents=True, exist_ok=True)
    (BUNDLE / "borders").mkdir(parents=True, exist_ok=True)

    # PC/TV side art: the wide table as it is; the game covers its calm middle.
    wide.save(BUNDLE / "borders/winter-table.jpg", "JPEG", quality=90, optimize=True, progressive=True)
    out["borders/winter-table.jpg"] = wide

    # Key art, no text: the picture being mended in the calm middle of the wide table.
    key = wide.convert("RGBA")
    mending(key, 1280, 730, 330)
    save(key, "hero/key_art.jpg", out)

    # Desktop tile, 16:9: picture left, title right. The tile's name bar covers the foot on
    # hover and badges sit top-left, so the title stays in the upper middle of the right half.
    cap = wide.convert("RGBA").resize((1920, 1080), Image.LANCZOS)
    mending(cap, 610, 560, 224)
    wm = wordmark(780)
    tx, ty = 1450 - wm.width // 2, 470 - wm.height // 2
    glow(cap, (tx - 60, ty - 40, tx + wm.width + 60, ty + wm.height + 40), 120)
    cap.alpha_composite(wm, (tx, ty))
    save(cap, "hero/capsule_landscape.jpg", out)

    # Share card 1.91:1, from the desktop tile: nothing essential in the top 20%.
    share = cap.resize((1200, 675), Image.LANCZOS).crop((0, 30, 1200, 660))
    save(share, "hero/share_card.jpg", out)

    # Phone tile, square: the top of the portrait table (lanterns in both corners),
    # the title under the lanterns, the picture below it.
    t = Image.open(MASTERS / "table.webp").convert("RGB")
    sq = t.crop((0, 0, t.width, t.width)).resize((1024, 1024), Image.LANCZOS).convert("RGBA")
    mending(sq, 512, 716, 196, lift=(0.26, -0.40))
    wm = wordmark(820)
    tx, ty = 512 - wm.width // 2, 322 - wm.height // 2
    glow(sq, (tx - 40, ty - 30, tx + wm.width + 40, ty + wm.height + 30), 90)
    sq.alpha_composite(wm, (tx, ty))
    save(sq, "hero/capsule_square.jpg", out)

    # The logo on its own, transparent.
    logo = Image.open(MASTERS / "wordmark.webp").convert("RGBA")
    logo.save(BUNDLE / "hero/logo.png", optimize=True)
    out["hero/logo.png"] = logo

    for rel in out:
        f = BUNDLE / rel
        print(f".gemarcade/{rel}", Image.open(f).size, f"{f.stat().st_size // 1024} KB")
    return out


def sheet(out, path):
    """Everything at the sizes players meet it: tiles small, borders around a game box."""
    bg = (30, 37, 46)
    W = 1900
    canvas = Image.new("RGB", (W, 1500), bg)
    y = 30
    key = out["hero/key_art.jpg"].convert("RGB").resize((900, 506), Image.LANCZOS)
    cap = out["hero/capsule_landscape.jpg"].convert("RGB").resize((768, 432), Image.LANCZOS)
    canvas.paste(key, (30, y))
    canvas.paste(cap, (960, y))
    small = out["hero/capsule_landscape.jpg"].convert("RGB").resize((300, 169), Image.LANCZOS)
    canvas.paste(small, (960, y + 450))
    y2 = y + 540
    sq = out["hero/capsule_square.jpg"].convert("RGB")
    canvas.paste(sq.resize((512, 512), Image.LANCZOS), (30, y2))
    canvas.paste(sq.resize((200, 200), Image.LANCZOS), (560, y2))
    canvas.paste(sq.resize((96, 96), Image.LANCZOS), (560, y2 + 220))
    canvas.paste(out["hero/share_card.jpg"].convert("RGB").resize((600, 315), Image.LANCZOS), (1280, y + 450))
    # The border as a 16:9 PC screen: the game's 9:16 box drawn in the middle.
    b = out["borders/winter-table.jpg"].resize((1040, 585), Image.LANCZOS)
    gw = round(585 * 9 / 16)
    game = Image.open(ROOT / "public/art/table.webp").convert("RGB").resize((gw, 585), Image.LANCZOS)
    b.paste(game, ((1040 - gw) // 2, 0))
    canvas.paste(b, (800, y2 + 250))
    canvas.save(path)
    print(path)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    built = build(sys.argv[1])
    if len(sys.argv) > 2:
        sheet(built, sys.argv[2])
