"""Store page art, written into the store-page bundle (.gemarcade/), from the game's own art only.

    python tools/art/store.py masters <raw-dir>    the generated scenes and logo -> masters
    python tools/art/store.py build [<sheet.png>]  masters -> the bundle (and a contact sheet)

The suitcase set (creator, 2026-10-28: the old dark slate desk read "a little dark and depressing"
beside the bright tiles of the catalogue; picked from three directions and three logos). An open
vintage suitcase on a sunny sky-blue ground, with REAL destination postcards spilling out of it:
- the scene (wide, square and the PC/TV side border) is generated with game-l.png as the
  rendering reference and holds props only: no postcards, no text (prompts in
  tools/art/prompts.txt). The generator writes made-up lettering on camera lenses, so `masters`
  wipes each lens ring (LENS below; found by eye on these raws);
- Burano is being pieced together inside the suitcase, in the board's own card frames
  (tools/art/chrome-spec.md), its last card lifted; other trips' postcards lie loose in white
  borders, and the passport lies open with its stamps (src/ui/style.css .pp-*);
- the PC/TV side art is not the suitcase scene any more (creator, 2026-10-28: it was "too busy
  and distracting" beside the game): each table's own scene finished outward, with nothing near
  the game (tools/art/tables.py `scene`; the props by the game cleared by a masked edit, prompt in
  tools/art/prompts.txt), so the colours flow on from the table the player is on;
- the logo is the travel-poster title: the stacked one (sun above) on the store, the wide 2:1 one
  (tools/art/wordmark.py, home's title) on the square tile, where it must read small.
There is no fake interface: no buttons, counters or text other than the title.

Writes (paths are the bundle's; storepage.yaml names them under media):
  hero/key_art.jpg            2560x1440, no text      media.hero.key_art_clean
  hero/capsule_landscape.jpg  1920x1080, with title   media.capsules.landscape
  hero/capsule_square.jpg     1024x1024, with title   media.capsules.square
  hero/logo.png               the logo, alpha         media.hero.logo
  hero/share_card.jpg         1200x630, with title    media.share_card
  borders/<name>.jpg          2560x1440, opaque       media.portrait_borders (BORDERS below, the first is the default)
Opaque art is JPEG q92: the Arcade re-encodes every image anyway, and this keeps the
bundle (which is committed) small.
"""
import ctypes
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

if sys.platform == "win32":  # AGENTS.md: the machine is shared, so this runs at below-normal priority
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)

sys.dont_write_bytecode = True  # importing mockup must not leave a __pycache__ in the repo
sys.path.insert(0, str(Path(__file__).resolve().parent))
from mockup import (LIP, LIP_BOTTOM, LIP_TOP, R_OUT, RIM, RIM_BOTTOM, RIM_LINE, RIM_TOP,  # noqa: E402
                    SHADOW_BLUR, SHADOW_Y, vgrad)

ROOT = Path(__file__).resolve().parents[2]
BUNDLE = ROOT / ".gemarcade"
MASTERS = ROOT / "tools/art/masters/chrome"
SS = 3  # supersampling for smooth rounded edges
GUTTER = 0.08  # between cells, fraction of the cell width (chrome-spec.md)
ASPECT = 4 / 3  # a card is a 3:4 portrait cell (AGENTS.md)
HERO = "dest-burano"
LOOSE = ["dest-fuji-chureito", "dest-eiffel", "dest-positano", "dest-harbour-bridge"]
PAGE_STAMP, PAGE = "stamp-t8", ["dest-harbour-bridge", "dest-twelve-apostles", "dest-heart-reef", None]


def dest(pid):
    cat = json.loads((ROOT / "src/content/pictures.json").read_text(encoding="utf-8"))
    d = next(x for x in cat["destinations"] if x["id"] == pid)
    # The master is the generated pixels at full size: sharper than the shipped copy.
    return Image.open(MASTERS.parent / f"{pid}.webp").convert("RGB"), d


def phi(x):
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def offset(im, dx, dy):
    out = Image.new(im.mode, im.size, 0)
    out.paste(im, (round(dx), round(dy)))
    return out


def piece(cw, w, h, rects, pic, lifted=False):
    """One framed piece (a card, or cards joined) on its own transparent layer.
    cw: the card's width, which scales the frame; w, h: the piece's bounding box; rects: the
    cells and the gutters between joined cells, sharp, in piece coordinates; pic covers w x h.
    The outline is rounded by blurring the sharp shape and cutting it at a level: concave and
    convex corners both round, and the inner edges (rim, picture) are the same cut at a higher
    level, so every edge is concentric. Returns (layer, (ox, oy)), the piece's top-left in it."""
    s = cw
    pad = round(s * 0.35)
    W, H = round(w + 2 * pad), round(h + 2 * pad + s * LIP * 2)
    k = 2 if lifted else 1  # a lifted card's shadow doubles (chrome-spec.md)
    sharp = Image.new("L", (W * SS, H * SS), 0)
    d = ImageDraw.Draw(sharp)
    for x0, y0, x1, y1 in rects:
        d.rectangle([(x0 + pad) * SS, (y0 + pad) * SS, (x1 + pad) * SS - 1, (y1 + pad) * SS - 1], fill=255)
    sigma = s * R_OUT * SS / 1.86  # a blurred right angle cut at 50% rounds with radius ~1.86 sigma
    blur = sharp.filter(ImageFilter.GaussianBlur(sigma))

    def cut(inset):
        thr = max(1, min(254, round(255 * phi(inset * SS / sigma))))
        return blur.point(lambda v: 255 if v >= thr else 0).resize((W, H), Image.LANCZOS)

    outer = cut(0)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # The drop shadow on the table: the face and its lip, pushed down, blurred.
    sh = ImageChops.lighter(offset(outer, 0, s * SHADOW_Y * k), offset(outer, 0, s * (SHADOW_Y * k + LIP)))
    sh = sh.filter(ImageFilter.GaussianBlur(s * SHADOW_BLUR * k))
    layer.paste(Image.new("RGBA", (W, H), (8, 14, 22, 160)), (0, 0), sh)
    # The plump lip below the face.
    layer.paste(vgrad((W, H), LIP_TOP, LIP_BOTTOM).convert("RGBA"), (0, 0), offset(outer, 0, s * LIP))
    # The frosted rim, with its bright top edge.
    rim = Image.new("RGBA", (W, H))
    rim.paste(vgrad((round(w), round(h)), RIM_TOP, RIM_BOTTOM), (pad, pad))
    layer.paste(rim, (0, 0), outer)
    hi = ImageChops.subtract(outer, offset(outer, 0, 1.6))
    layer.paste(Image.new("RGBA", (W, H), (244, 247, 251, 255)), (0, 0), hi)
    # The hairline where rim meets picture, then the picture, untouched.
    i = s * RIM
    layer.paste(Image.new("RGBA", (W, H), RIM_LINE + (255,)), (0, 0), cut(i - 1.5))
    full = Image.new("RGBA", (W, H))
    full.paste(pic.resize((round(w - 2 * i), round(h - 2 * i)), Image.LANCZOS), (round(pad + i), round(pad + i)))
    layer.paste(full, (0, 0), cut(i))
    return layer, (pad, pad)


def faint_cell(canvas, x, y, cw, ch):
    """An empty cell as the board draws it: a faint frosted card on the table."""
    m = Image.new("L", (canvas.width * 1, canvas.height * 1), 0)
    ImageDraw.Draw(m).rounded_rectangle([x, y, x + cw, y + ch], radius=cw * R_OUT, fill=255)
    edge = m.filter(ImageFilter.FIND_EDGES)
    clear = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    canvas.alpha_composite(Image.composite(Image.new("RGBA", canvas.size, (214, 226, 240, 22)), clear, m))
    canvas.alpha_composite(Image.composite(Image.new("RGBA", canvas.size, (214, 226, 240, 46)), clear, edge))


def pieced(pid, cw, lift=None, loose=(), angle=0.0):
    """A postcard on the table, its cards joined but for one lifted over its empty cell and a
    few lying loose. lift: (col, row, dx, dy, tilt) with dx, dy in card widths from the cell;
    loose: a list of the same. Returns a transparent layer and the postcard's centre in it."""
    pic, d = dest(pid)
    cols, rows = d["cols"], d["rows"]
    ch, g = cw * ASPECT, cw * GUTTER
    W, H = cols * cw + (cols - 1) * g, rows * ch + (rows - 1) * g
    specs = list(loose) + ([lift] if lift else [])
    gone = {(sp[0], sp[1]) for sp in specs}
    margin = round(cw * 2.2)
    canvas = Image.new("RGBA", (round(W + 2 * margin), round(H + 2 * margin)), (0, 0, 0, 0))
    x0, y0 = margin, margin

    def box(c, r):
        return c * (cw + g), r * (ch + g), c * (cw + g) + cw, r * (ch + g) + ch

    for c, r in gone:
        bx = box(c, r)
        faint_cell(canvas, x0 + bx[0], y0 + bx[1], cw, ch)
    # The joined cards: each cell, and the gutter to each joined neighbour, one frame, one picture.
    rects = []
    for r in range(rows):
        for c in range(cols):
            if (c, r) in gone:
                continue
            a = box(c, r)
            rects.append(a)
            if c + 1 < cols and (c + 1, r) not in gone:
                rects.append((a[2], a[1], a[2] + g, a[3]))
            if r + 1 < rows and (c, r + 1) not in gone:
                rects.append((a[0], a[3], a[2], a[3] + g))
            if c + 1 < cols and r + 1 < rows and not {(c + 1, r), (c, r + 1), (c + 1, r + 1)} & gone:
                rects.append((a[2], a[3], a[2] + g, a[3] + g))
    layer, (ox, oy) = piece(cw, W, H, rects, pic)
    canvas.alpha_composite(layer, (round(x0 - ox), round(y0 - oy)))
    # The loose cards, then the lifted one: each its own part of the picture; the lifted one
    # 6% bigger, tilted, its shadow doubled.
    pw, ph = pic.size
    for sp in specs:
        c, r, dx, dy, tilt = sp
        lifted = sp is lift
        a = box(c, r)
        cut = pic.crop((round(a[0] / W * pw), round(a[1] / H * ph), round(a[2] / W * pw), round(a[3] / H * ph)))
        k = 1.06 if lifted else 1.0
        card, _ = piece(cw * k, cw * k, ch * k, [(0, 0, cw * k, ch * k)], cut, lifted=lifted)
        card = card.rotate(tilt, resample=Image.BICUBIC, expand=True)
        tx, ty = x0 + (a[0] + a[2]) / 2 + dx * cw, y0 + (a[1] + a[3]) / 2 + dy * cw
        canvas.alpha_composite(card, (round(tx - card.width / 2), round(ty - card.height / 2 + cw * LIP)))
    centre = (x0 + W / 2, y0 + H / 2)
    if angle:
        before = canvas.size
        canvas = canvas.rotate(angle, resample=Image.BICUBIC, expand=True)
        centre = (centre[0] + (canvas.width - before[0]) / 2, centre[1] + (canvas.height - before[1]) / 2)
    return canvas, centre


def place(canvas, layer, centre, at):
    canvas.alpha_composite(layer, (round(at[0] - centre[0]), round(at[1] - centre[1])))


def rounded(size, radius):
    m = Image.new("L", (size[0] * SS, size[1] * SS), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] * SS - 1, size[1] * SS - 1], radius=radius * SS, fill=255)
    return m.resize(size, Image.LANCZOS)


def white_card(pid, width):
    """A postcard as the passport shows it: the picture in a white border, in its board's shape."""
    pic, d = dest(pid)
    h = round(width * d["rows"] / d["cols"] * ASPECT)
    pad = max(2, round(width * 0.045))
    card = Image.new("RGBA", (width, h), (0, 0, 0, 0))
    card.paste(Image.new("RGBA", (width, h), (255, 255, 255, 255)), (0, 0), rounded((width, h), width * 0.09))
    inner = (width - 2 * pad, h - 2 * pad)
    card.paste(pic.resize(inner, Image.LANCZOS), (pad, pad), rounded(inner, width * 0.05))
    return card


def shadowed(layer, blur, dy, alpha=150, colour=(8, 14, 22)):
    """A layer over its own soft shadow, with room for it."""
    m = round(blur * 3 + abs(dy))
    out = Image.new("RGBA", (layer.width + 2 * m, layer.height + 2 * m), (0, 0, 0, 0))
    a = Image.new("L", out.size, 0)
    a.paste(layer.getchannel("A"), (m, m + round(dy)))
    a = a.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: v * alpha // 255)
    out.paste(Image.new("RGBA", out.size, colour + (255,)), (0, 0), a)
    out.alpha_composite(layer, (m, m))
    return out


def dashed(w, h, u):
    """A place not visited yet: a dashed blank in its postcard's shape (style.css .pc.soon)."""
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dd = ImageDraw.Draw(im)
    step, per, t = 7 * u, 2 * (w + h), 0.0

    def at(v):
        if v < w:
            return v, 0
        if v < w + h:
            return w - 1, v - w
        if v < 2 * w + h:
            return w - 1 - (v - w - h), h - 1
        return 0, h - 1 - (v - 2 * w - h)

    while t < per:
        dd.line([at(t), at(min(per - 0.01, t + step * 0.55))], fill=(85, 101, 124, 90), width=max(1, round(2 * u)))
        t += step
    return im


def press(page, stamp_id, side, at, tilt):
    """A trip's stamp pressed into the paper: its ink multiplied in, a little faded."""
    st = Image.open(MASTERS / f"{stamp_id}.webp").convert("RGBA")
    st = st.resize((side, side), Image.LANCZOS).rotate(tilt, resample=Image.BICUBIC, expand=True)
    sx, sy = round(at[0] - st.width / 2), round(at[1] - st.height / 2)
    region = page.crop((sx, sy, sx + st.width, sy + st.height)).convert("RGB")
    page.paste(ImageChops.multiply(region, st.convert("RGB")), (sx, sy), st.getchannel("A").point(lambda v: v * 0.88))


def passport(width, angle=0.0):
    """The passport lying open, in the game's colours (src/ui/style.css .pp-*): a navy book,
    warm paper with a faint engraved pattern, trips' stamps on the left page and postcards in
    white borders on the right, a place still to visit as a dashed blank. No text."""
    W, H = width, round(width * 0.68)
    u = W / 560
    book = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    book.paste(vgrad((W, H), (52, 72, 106), (31, 44, 66)).convert("RGBA"), (0, 0), rounded((W, H), 18 * u))
    m, gap = round(11 * u), round(5 * u)
    pw, ph = (W - 2 * m - gap) // 2, H - 2 * m
    for side in (0, 1):
        page = vgrad((pw, ph), (251, 248, 241), (238, 230, 214)).convert("RGBA")
        rings = Image.new("L", (pw, ph), 0)
        rd = ImageDraw.Draw(rings)
        ox, oy = pw / 2, -0.3 * ph
        for rr in range(round(9 * u), round(2 * ph), max(3, round(9 * u))):
            rd.ellipse([ox - rr, oy - rr, ox + rr, oy + rr], outline=18, width=max(1, round(u)))
        page.paste(Image.new("RGBA", (pw, ph), (70, 110, 160, 255)), (0, 0), rings)
        if side == 0:
            press(page, "stamp-t5", round(118 * u), (pw * 0.31, ph * 0.27), 12)
            press(page, "stamp-t7", round(112 * u), (pw * 0.70, ph * 0.47), -9)
            press(page, PAGE_STAMP, round(120 * u), (pw * 0.36, ph * 0.74), 6)
        else:
            gx, gy, cg = round(17 * u), round(16 * u), round(13 * u)
            cwid = (pw - 2 * gx - cg) // 2
            ys = [gy, gy]
            for n in range(4):
                x = gx + (n % 2) * (cwid + cg)
                if n < len(PAGE) - 1:
                    card = shadowed(white_card(PAGE[n], cwid), 2.5 * u, 2 * u, alpha=90, colour=(60, 45, 25))
                    mm = round(2.5 * u * 3 + 2 * u)
                    page.alpha_composite(card, (x - mm, ys[n % 2] - mm))
                    ys[n % 2] += card.height - 2 * mm + cg
                else:
                    blank = dashed(cwid, round(cwid * ASPECT), u)
                    page.alpha_composite(blank, (x, ys[n % 2]))
                    ys[n % 2] += blank.height + cg
        # The fold: the paper dips into shade towards the spine.
        fold = Image.new("L", (pw, 1), 0)
        for x in range(pw):
            t = (x / pw) if side == 0 else 1 - x / pw
            fold.putpixel((x, 0), round(70 * max(0.0, (t - 0.82) / 0.18) ** 2))
        page.paste(Image.new("RGBA", (pw, ph), (90, 70, 40, 255)), (0, 0), fold.resize((pw, ph)))
        book.paste(page, (m + side * (pw + gap), m), rounded((pw, ph), 9 * u))
    book = shadowed(book, 12 * u, 9 * u, alpha=170)
    return book.rotate(angle, resample=Image.BICUBIC, expand=True) if angle else book


def card(pid, width, angle):
    """A loose postcard in its white border, tilted, on its soft shadow."""
    c = shadowed(white_card(pid, round(width)), width * 0.035, width * 0.03, alpha=110, colour=(40, 30, 20))
    return c.rotate(angle, resample=Image.BICUBIC, expand=True)


def put(canvas, layer, at):
    canvas.alpha_composite(layer, (round(at[0] - layer.width / 2), round(at[1] - layer.height / 2)))


def logo(name, width, height):
    """A logo master fitted into width x height, on a soft shadow."""
    im = Image.open(MASTERS / f"{name}.webp").convert("RGBA")
    k = min(width / im.width, height / im.height)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    return shadowed(im, im.width * 0.011, im.width * 0.007, alpha=90, colour=(30, 25, 40))


# --- masters -----------------------------------------------------------------------------

WIDE, SQUARE = "store-suitcase-wide", "store-suitcase-square"
RAW = {WIDE: "bg-suitcase.png", SQUARE: "bg-suitcase-square.png"}
# Each camera lens ring with made-up lettering, on these raws: (centre x, y, inner and outer radius).
LENS = {WIDE: [(1227.5, 165, 29, 47)], SQUARE: [(1483, 635, 29, 46)]}
DABS = {}  # stray glyphs to soften: name -> [(x, y, radius)]


def smooth_ring(im, cx, cy, r0, r1, window=24, pct=35):
    """Wipe made-up lettering off a lens ring: unwrap the ring between radii r0 and r1 around
    (cx, cy), take a low percentile along the circle over `window` degrees, and wrap it back
    with soft edges. The rings and their shading stay; the letters go."""
    import numpy as np
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    rs = np.arange(r0 - 2, r1 + 2.01, 0.5)
    ts = np.deg2rad(np.arange(0, 360, 0.5))
    R, T = np.meshgrid(rs, ts, indexing="ij")
    X, Y = cx + R * np.cos(T), cy + R * np.sin(T)
    x0, y0 = np.floor(X).astype(int), np.floor(Y).astype(int)
    fx, fy = (X - x0)[..., None], (Y - y0)[..., None]
    P = (a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x0 + 1] * fx * (1 - fy)
         + a[y0 + 1, x0] * (1 - fx) * fy + a[y0 + 1, x0 + 1] * fx * fy)
    w = int(window / 0.5)
    pad = np.concatenate([P[:, -w // 2:], P, P[:, :w // 2]], axis=1)
    Q = np.percentile(np.lib.stride_tricks.sliding_window_view(pad, w, axis=1)[:, :P.shape[1]], pct, axis=-1)
    m = int(r1) + 3
    ys, xs = np.mgrid[int(cy) - m:int(cy) + m + 1, int(cx) - m:int(cx) + m + 1]
    r = np.hypot(xs - cx, ys - cy)
    t = np.mod(np.rad2deg(np.arctan2(ys - cy, xs - cx)), 360)
    ri = np.clip(np.round((r - (r0 - 2)) / 0.5).astype(int), 0, len(rs) - 1)
    ti = np.round(t / 0.5).astype(int) % len(ts)
    blend = np.clip(np.minimum(r - r0 + 1, r1 + 1 - r) / 2.0, 0, 1)[..., None]
    out = a.copy()
    out[ys, xs] = a[ys, xs] * (1 - blend) + Q[ri, ti] * blend
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def dab(im, x, y, r):
    """Soften a small mark into its surroundings."""
    box = (x - 3 * r, y - 3 * r, x + 3 * r, y + 3 * r)
    patch = im.crop(box).filter(ImageFilter.GaussianBlur(r * 0.8))
    m = Image.new("L", patch.size, 0)
    ImageDraw.Draw(m).ellipse([2 * r, 2 * r, 4 * r, 4 * r], fill=255)
    im.paste(patch, box[:2], m.filter(ImageFilter.GaussianBlur(r * 0.4)))
    return im


def masters(raw_dir):
    raw_dir = Path(raw_dir)
    for name, f in RAW.items():
        im = Image.open(raw_dir / f).convert("RGB")
        for ring in LENS.get(name, []):
            im = smooth_ring(im, *ring)
        for d in DABS.get(name, []):
            im = dab(im, *d)
        im.save(MASTERS / f"{name}.webp", "WEBP", quality=92, method=6)
        print(f"tools/art/masters/chrome/{name}.webp", im.size)
    from wordmark import crop
    lg = crop(raw_dir / "logo-poster.png")
    lg.save(MASTERS / "logo-poster.webp", "WEBP", lossless=True, method=6)
    print("tools/art/masters/chrome/logo-poster.webp", lg.size)


# --- the set -----------------------------------------------------------------------------

# Burano's lifted card and two loose ones (col, row, dx, dy in card widths, tilt).
HERO_CARDS = dict(lift=(1, 1, 0.34, -0.30, -6), loose=[(2, 2, 1.95, -0.55, 9), (0, 4, -1.15, 0.30, -12)])
# Where things sit on the wide scene, in 1920 x 1080 units: Burano inside the suitcase, postcards
# spilling out of it to the right, the passport open beside them. The upper right is the title's.
WIDE_LOOSE = [(LOOSE[0], 170, -14, (1010, 640)), (LOOSE[1], 175, 9, (1160, 800)),
              (LOOSE[2], 165, -6, (1350, 900)), (LOOSE[3], 170, 15, (1010, 905))]
TITLE = (1455, 315, 900, 560)  # centre x, y and the box the stacked logo fits in


def wide_scene(k):
    """The wide scene with its postcards, no title, on a canvas k times 1920 x 1080."""
    c = Image.open(MASTERS / f"{WIDE}.webp").convert("RGB")
    c = c.resize((round(1920 * k), round(1080 * k)), Image.LANCZOS).convert("RGBA")
    hero, ctr = pieced(HERO, 74 * k, **HERO_CARDS)
    place(c, hero, ctr, (720 * k, 545 * k))
    for pid, w, a, (x, y) in WIDE_LOOSE:
        put(c, card(pid, w * k, a), (x * k, y * k))
    put(c, passport(round(380 * k), angle=-8), (1640 * k, 800 * k))
    return c


def titled(c, box):
    put(c, logo("logo-poster", box[2], box[3]), box[:2])
    return c


def square_tile():
    """The phone tile: the suitcase low, Burano inside it, two postcards spilling over its edge,
    the wide title across the clear sky at the top."""
    c = Image.open(MASTERS / f"{SQUARE}.webp").convert("RGB").resize((1024, 1024), Image.LANCZOS).convert("RGBA")
    hero, ctr = pieced(HERO, 64, **HERO_CARDS)
    place(c, hero, ctr, (676, 650))
    put(c, card(LOOSE[3], 128, -9), (762, 925))
    put(c, card(LOOSE[1], 132, 11), (905, 872))
    put(c, logo("wordmark", 830, 415), (512, 205))
    return c


# PC/TV side art per table, the border's name (storepage.yaml's portrait_borders, the game picks
# one by name: the table's slug without "table-") -> its 2560x1440 master. The first is the default.
BORDERS = {"sunny-day": "store-sunny-day-border"}


def save(im, rel, out, q=92):
    im.convert("RGB").save(BUNDLE / rel, "JPEG", quality=q, optimize=True, progressive=True, subsampling=0)
    out[rel] = im


def build():
    out = {}
    (BUNDLE / "hero").mkdir(parents=True, exist_ok=True)
    (BUNDLE / "borders").mkdir(parents=True, exist_ok=True)
    save(wide_scene(4 / 3), "hero/key_art.jpg", out)
    save(titled(wide_scene(1.0), TITLE), "hero/capsule_landscape.jpg", out)
    # Share card, 1.91:1: the tile's scene with the title a little lower, cut to 1920 x 1008.
    share = titled(wide_scene(1.0), (TITLE[0], TITLE[1] + 22, TITLE[2], TITLE[3] - 30)).crop((0, 36, 1920, 1044))
    save(share.resize((1200, 630), Image.LANCZOS), "hero/share_card.jpg", out)
    save(square_tile(), "hero/capsule_square.jpg", out)
    for name, master in BORDERS.items():
        save(Image.open(MASTERS / f"{master}.webp"), f"borders/{name}.jpg", out, q=90)
    lg = Image.open(MASTERS / "logo-poster.webp").convert("RGBA")
    lg.save(BUNDLE / "hero/logo.png", optimize=True)
    out["hero/logo.png"] = lg
    for rel in out:
        f = BUNDLE / rel
        print(f".gemarcade/{rel}", Image.open(f).size, f"{f.stat().st_size // 1024} KB")
    return out


def sheet(out, path):
    """Everything at the sizes players meet it: tiles small, the border around a game box."""
    canvas = Image.new("RGB", (1900, 1500), (0xE6, 0xCC, 0xEC))  # the catalogue's lilac
    y = 30
    canvas.paste(out["hero/key_art.jpg"].convert("RGB").resize((900, 506), Image.LANCZOS), (30, y))
    canvas.paste(out["hero/capsule_landscape.jpg"].convert("RGB").resize((768, 432), Image.LANCZOS), (960, y))
    canvas.paste(out["hero/capsule_landscape.jpg"].convert("RGB").resize((274, 154), Image.LANCZOS), (960, y + 450))
    y2 = y + 540
    sq = out["hero/capsule_square.jpg"].convert("RGB")
    canvas.paste(sq.resize((512, 512), Image.LANCZOS), (30, y2))
    canvas.paste(sq.resize((200, 200), Image.LANCZOS), (560, y2))
    canvas.paste(sq.resize((96, 96), Image.LANCZOS), (560, y2 + 220))
    canvas.paste(out["hero/share_card.jpg"].convert("RGB").resize((600, 315), Image.LANCZOS), (1280, y + 450))
    # The border as a 16:9 PC screen: the game's 9:16 box drawn in the middle.
    first = next(iter(BORDERS))
    b = out[f"borders/{first}.jpg"].convert("RGB").resize((1040, 585), Image.LANCZOS)
    gw = round(585 * 9 / 16)
    game = Image.open(ROOT / f"public/art/tables/{first}/{first}-table.webp").convert("RGB").resize((gw, 585), Image.LANCZOS)
    b.paste(game, ((1040 - gw) // 2, 0))
    canvas.paste(b, (800, y2 + 250))
    canvas.save(path)
    print(path)


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("masters", "build"):
        sys.exit(__doc__)
    if sys.argv[1] == "masters":
        masters(sys.argv[2])
    else:
        built = build()
        if len(sys.argv) > 2:
            sheet(built, sys.argv[2])
