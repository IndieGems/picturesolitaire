"""A still mock of a board in the chosen look, built from the shipped art and the frame
spec in tools/art/chrome-spec.md. It is a reference render for the gameplay member and
a check that the table stays calmer and darker than the cards; the game does not use it.

    python tools/art/mockup.py <out.png>
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SS = 3  # supersampling for smooth rounded edges

# Frame spec, as fractions of the cell size s (see chrome-spec.md).
RIM, R_OUT, R_IN, LIP, SHADOW_Y, SHADOW_BLUR = 0.05, 0.14, 0.09, 0.035, 0.04, 0.06
RIM_TOP, RIM_BOTTOM, RIM_LINE = (233, 238, 245), (176, 186, 200), (139, 151, 168)
LIP_TOP, LIP_BOTTOM = (93, 105, 121), (52, 61, 74)


def vgrad(size, top, bottom):
    w, h = size
    g = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        g.putpixel((0, y), tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return g.resize((w, h))


def rmask(size, box, r):
    m = Image.new("L", (size[0] * SS, size[1] * SS), 0)
    ImageDraw.Draw(m).rounded_rectangle([v * SS for v in box], radius=r * SS, fill=255)
    return m.resize(size, Image.LANCZOS)


def card(canvas, x, y, w, h, s, picture_region):
    """Draw one framed card (or merged piece) of outer size w x h at x, y."""
    pad = int(s * 0.2)
    W, H = int(w + 2 * pad), int(h + 2 * pad + s * LIP)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ox, oy = pad, pad
    # Soft drop shadow on the table.
    sh = rmask((W, H), (ox, oy + s * SHADOW_Y, ox + w, oy + h + s * LIP + s * SHADOW_Y), s * R_OUT)
    sh = sh.filter(ImageFilter.GaussianBlur(s * SHADOW_BLUR))
    layer.paste(Image.new("RGBA", (W, H), (8, 14, 22, 150)), (0, 0), sh)
    # The plump lip: the card's thickness, showing below its face.
    lip = rmask((W, H), (ox, oy + s * LIP, ox + w, oy + h + s * LIP), s * R_OUT)
    layer.paste(vgrad((W, H), LIP_TOP, LIP_BOTTOM).convert("RGBA"), (0, 0), lip)
    # The frosted rim.
    rim = rmask((W, H), (ox, oy, ox + w, oy + h), s * R_OUT)
    rimfill = Image.new("RGBA", (W, H))
    rimfill.paste(vgrad((int(w), int(h)), RIM_TOP, RIM_BOTTOM), (ox, oy))
    layer.paste(rimfill, (0, 0), rim)
    # A hairline where the rim meets the picture, then the picture.
    i = s * RIM
    line = rmask((W, H), (ox + i - 1.2, oy + i - 1.2, ox + w - i + 1.2, oy + h - i + 1.2), s * R_IN + 1)
    layer.paste(Image.new("RGBA", (W, H), RIM_LINE + (255,)), (0, 0), line)
    win = rmask((W, H), (ox + i, oy + i, ox + w - i, oy + h - i), s * R_IN)
    pic = picture_region.resize((int(round(w - 2 * i)), int(round(h - 2 * i))), Image.LANCZOS).convert("RGBA")
    picfull = Image.new("RGBA", (W, H))
    picfull.paste(pic, (int(round(ox + i)), int(round(oy + i))))
    layer.paste(picfull, (0, 0), win)
    canvas.alpha_composite(layer, (int(x - pad), int(y - pad)))


def main(out):
    cat = json.loads((ROOT / "src/content/pictures.json").read_text(encoding="utf-8"))
    pics = {p["id"]: p for p in cat["pictures"]}
    canvas = Image.open(ROOT / "public/art/table.webp").convert("RGBA")
    s, gap = 196, 16
    cols, rows = 4, 5
    bx = (canvas.width - (cols * s + (cols - 1) * gap)) // 2
    by = 470

    def cell_img(pid, c, r):
        p = pics[pid]
        im = Image.open(ROOT / "public" / p["file"]).convert("RGB")
        u = im.width // p["cols"]
        return im.crop((c * u, r * u, (c + 1) * u, (r + 1) * u))

    # Stacks: four chubby piles of card backs.
    back = Image.open(ROOT / "public/art/stack-back.webp").convert("RGBA")
    for c in range(cols):
        x = bx + c * (s + gap) + s * 0.04
        w = s * 0.92
        for k in range(4, -1, -1):
            b = back.resize((int(w), int(w)), Image.LANCZOS)
            shade = Image.new("RGBA", b.size, (20, 26, 36, 120 if k else 0))
            b2 = b.copy()
            b2.alpha_composite(Image.composite(shade, Image.new("RGBA", b.size, (0, 0, 0, 0)), b.getchannel("A")))
            canvas.alpha_composite(b2, (int(x), int(205 + k * 7)))

    # A deal from two families: (picture, its col, its row) at each board cell.
    deal = [
        [("blossom-lane", 1, 0), ("dusk-harbour", 2, 0), ("berry-cake", 1, 0), ("poppy-sunset", 0, 0)],
        [("rose-hat", 0, 1), ("dusk-harbour", 0, 1), ("berry-cake", 0, 1), ("poppy-sunset", 1, 1)],
        [("peony-jug", 0, 0), ("candle-oranges", 1, 1), None, None],
        [("blossom-lane", 0, 2), ("peony-jug", 1, 1), ("rose-hat", 1, 0), ("dusk-harbour", 1, 0)],
        [("candle-oranges", 0, 0), ("rose-hat", 1, 2), ("blossom-lane", 1, 1), ("dusk-harbour", 2, 1)],
    ]
    for r, row in enumerate(deal):
        for c, item in enumerate(row):
            if item:
                card(canvas, bx + c * (s + gap), by + r * (s + gap), s, s, s, cell_img(*item))
    # A merged piece: candle-oranges' top row joined, one frame over both cells and the gutter.
    p = pics["peony-jug"]
    im = Image.open(ROOT / "public" / p["file"]).convert("RGB")
    card(canvas, bx + 2 * (s + gap), by + 2 * (s + gap), 2 * s + gap, s, s, im.crop((0, im.height // 2, im.width, im.height)))
    canvas.convert("RGB").save(out)
    print(out)


if __name__ == "__main__":
    main(sys.argv[1])
