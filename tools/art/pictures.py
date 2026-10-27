"""Picture library pipeline: plan -> generated image -> master -> shipped WebP -> catalogue.

    python tools/art/pictures.py prompt <id>              print the full prompt and size
    python tools/art/pictures.py gen <raw-dir> <id>...    submit generations (gemforge, BILLS per id)
    python tools/art/pictures.py process <raw-dir> <id>... raw PNG -> tools/art/masters + public/pictures (+ thumb)
    python tools/art/pictures.py export [<id>...]         masters -> public/pictures + thumbs, at the card aspect
    python tools/art/pictures.py thumbs [<id>...]         Albums-screen thumbs from the masters (default: all)
    python tools/art/pictures.py boards [<id>...]         the board's light copies from the masters (default: all)
    python tools/art/pictures.py catalogue                write src/content/pictures.json
    python tools/art/pictures.py sheet <out.png> <id>...  contact sheet with the card cuts drawn on
    python tools/art/pictures.py grid <out.png> <id>...   compact sheet: look-alike families in rows, the rest six a row

The plan (tools/art/pictures-plan.json) is the source of truth; docs/picture-direction.md
says how a picture is made. Masters keep the generated pixels (WebP q90, at the
picture's aspect) so a picture can be re-exported without paying to generate it again.

Cards are PORTRAIT cells, 3:4 (creator, 2026-10-24), so a picture of cols x rows cards
is (cols*3):(rows*4) and ships at exactly cols*384 x rows*512 px, WebP q80: that full picture
is only for the enlarged view. The board and the win card draw <id>-board.webp, 240 x 320 px a
card (a phone draws a card about 90 CSS px wide); library pictures ship no thumb any more (the
Albums screen is gone; 2026-10-26), only destinations have one, for the passport
(creator, 2026-10-25: "a picture ships at the size it is drawn"; tools/art/check-copies.mjs
fails the build when one is missing or over its budget). The first
60 pictures were made for square cells; their masters keep the square-cell generation and
`export` cuts them to the new aspect (an entry's cropX, 0 left .. 1 right, frames the subject).

A destination (the plan's and the catalogue's `destinations`, a trip's postcard of a real place)
is a picture the size of a whole board, 4 x 4 or 4 x 5 cards, with a full picture, a board
copy and a 300 px wide thumb for the passport; docs/destinations-america.md is the first trip's list.
"""
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
PLAN = ROOT / "tools/art/pictures-plan.json"
MASTERS = ROOT / "tools/art/masters"
PUBLIC = ROOT / "public"
CATALOGUE = ROOT / "src/content/pictures.json"

CELL = (384, 512)  # one card, w x h px

# Generation size per shape: the picture's aspect, edges multiples of 16, long edge 1536+.
GEN_SIZE = {
    (2, 2): (1152, 1536), (3, 3): (1152, 1536),
    (2, 3): (768, 1536), (3, 2): (1728, 1536),
    (1, 2): (576, 1536), (2, 1): (1536, 1024),
    (4, 4): (1536, 2048), (4, 5): (1536, 2560),  # destination postcards, a whole board
    (5, 5): (1536, 2048),  # a 5x5 hard or finale board's postcard (creator, 2026-10-27), 3:4 like 4x4
    (6, 6): (1536, 2048),  # a 6x6 finale's postcard (30, 60, 90; creator, 2026-10-27), 3:4 too
}
SHAPE_WORDS = {
    (2, 2): "Composition: a portrait picture, 3:4.",
    (3, 3): "Composition: a portrait picture, 3:4.",
    (2, 3): "Composition: a tall portrait picture, 1:2.",
    (3, 2): "Composition: an almost square picture, 9:8.",
    (1, 2): "Composition: a very tall narrow vertical picture, 3:8.",
    (2, 1): "Composition: a landscape picture, 3:2.",
    (4, 4): "Composition: a portrait picture, 3:4.",
    (4, 5): "Composition: a tall portrait picture, 3:5.",
    (5, 5): "Composition: a portrait picture, 3:4.",
    (6, 6): "Composition: a portrait picture, 3:4.",
}


def plan():
    return json.loads(PLAN.read_text(encoding="utf-8"))


def entry(p, pid):
    for e in p["pictures"] + p.get("destinations", []):
        if e["id"] == pid:
            return e
    sys.exit(f"no picture {pid!r} in the plan")


def size_of(e):
    """The shipped picture, w x h px."""
    return e["cols"] * CELL[0], e["rows"] * CELL[1]


def full_prompt(p, e):
    fam = p["families"].get(e.get("family") or "")
    parts = [e["prompt"], fam["prompt"] if fam else "", SHAPE_WORDS[(e["cols"], e["rows"])],
             p["suffix"][e.get("suffix", e["medium"])]]
    return " ".join(x for x in parts if x)


def cmd_prompt(pid):
    p = plan()
    e = entry(p, pid)
    w, h = GEN_SIZE[(e["cols"], e["rows"])]
    print(f"{w}x{h}\n{full_prompt(p, e)}")


def cmd_gen(raw, ids):
    p = plan()
    Path(raw).mkdir(parents=True, exist_ok=True)
    for pid in ids:
        e = entry(p, pid)
        w, h = GEN_SIZE[(e["cols"], e["rows"])]
        args = ["gemforge", "generate", "image", "--prompt", full_prompt(p, e), "--size", f"{w}x{h}",
                "--quality", "high", "--out", str(raw), "--name", pid, "--flat", "--no-wait", "--json"]
        r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8")
        print(pid, r.returncode, (r.stdout or r.stderr).strip().replace("\n", " ")[:300])


def master_path(pid):
    return MASTERS / f"{pid}.webp"


def crop_to(im, w, h, x=0.5, y=0.5):
    """Crop to the aspect w:h; x and y place the window (0 left/top .. 1 right/bottom)."""
    W, H = im.size
    if W * h > H * w:
        nw = round(H * w / h)
        x0 = round((W - nw) * x)
        return im.crop((x0, 0, x0 + nw, H))
    if W * h < H * w:
        nh = round(W * h / w)
        y0 = round((H - nh) * y)
        return im.crop((0, y0, W, y0 + nh))
    return im


def framed(e):
    """The master cut to the picture's card aspect, framed on its subject."""
    return crop_to(Image.open(master_path(e["id"])).convert("RGB"), *size_of(e), e.get("cropX", 0.5), e.get("cropY", 0.5))


def export(e):
    out = PUBLIC / "pictures" / e["album"] / f"{e['id']}.webp"
    out.parent.mkdir(parents=True, exist_ok=True)
    im, size = framed(e), size_of(e)
    # Never enlarge: a 4x5 postcard recut for a 5x5 board (2026-10-27) has 1536 px across, not
    # 5 x 384, and enlarging adds bytes, not detail. The catalogue's px is read from the file.
    if im.width < size[0]:
        size = im.size
    im.resize(size, Image.LANCZOS).save(out, "WEBP", quality=80, method=6)
    if "window" in e:  # a destination: the passport's copy
        make_dest_thumb(e)
    # Library pictures ship no thumb (2026-10-26): the Albums screen that drew them is gone, the win
    # card draws the board copy the player already has, and the build's 2,000-file cap needs the room.
    make_board(e)
    return out


def cmd_process(raw, ids):
    p = plan()
    MASTERS.mkdir(parents=True, exist_ok=True)
    for pid in ids:
        e = entry(p, pid)
        src = next((f for f in Path(raw).glob(f"{pid}.*") if f.suffix.lower() in (".png", ".webp", ".jpg", ".jpeg")), None)
        if src is None:
            print(pid, "no raw file in", raw)
            continue
        im = crop_to(Image.open(src).convert("RGB"), *size_of(e))
        im.save(master_path(pid), "WEBP", quality=90, method=6)
        out = export(e)
        print(pid, im.size, "->", out.relative_to(ROOT), f"{out.stat().st_size // 1024} KB")


def cmd_export(ids):
    p = plan()
    for e in p["pictures"] + p.get("destinations", []):
        if (not ids or e["id"] in ids) and master_path(e["id"]).exists():
            out = export(e)
            print(e["id"], size_of(e), f"{out.stat().st_size // 1024} KB")


THUMB_LONG = 320  # the Albums screen's picture size, long side
THUMB_BUDGET = 24 * 1024


def thumb_rel(pid):
    # "-thumb" because the platform refuses a build with two files of the same name,
    # in any folders: pictures/<album>/<id>.webp is the full picture.
    return f"pictures/thumbs/{pid}-thumb.webp"


def make_thumb(e):
    """A light copy for the Albums screen: the master at the picture's card aspect (as the
    game shows it), THUMB_LONG px on the long side."""
    im = framed(e)
    k = THUMB_LONG / max(im.size)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    out = PUBLIC / thumb_rel(e["id"])
    out.parent.mkdir(parents=True, exist_ok=True)
    # Best quality that fits the budget; busy pictures step down, never below q40.
    for q in range(80, 39, -4):
        im.save(out, "WEBP", quality=q, method=6)
        if out.stat().st_size <= THUMB_BUDGET:
            break
    return im.size, out.stat().st_size


BOARD_CELL = (240, 320)  # the board's copy, per card: ~2.7x a phone's ~90 CSS px card
# Smooth flat colour rings at low quality, and is small anyway: it keeps q84. Photos and
# painted texture look the same at q74 and are a third lighter (Untangled's docs/mobile.md).
SMOOTH_MEDIA = {"flat", "low-poly", "deco", "stained-glass", "papercut", "render"}
BOARD_BUDGET = 28 * 1024  # per card; tools/art/check-copies.mjs holds the build to it
# A destination postcard's copy is a whole board of cards in one file: lighter per card, down to
# q50 (lead, 2026-10-25: lighten it if the difference cannot be seen; at a big phone's 1.25x,
# q74 and q50 look the same). About 133 KB for a 4x4 postcard instead of 168.
DEST_BOARD_BUDGET = 8 * 1024


def board_rel(e):
    # beside the full picture, "-board" so every name in the build stays unique
    return f"pictures/{e['album']}/{e['id']}-board.webp"


def make_board(e):
    """The copy the board draws: the picture at BOARD_CELL a card, stepped down in quality
    (never below q56) until it fits BOARD_BUDGET a card."""
    w, h = e["cols"] * BOARD_CELL[0], e["rows"] * BOARD_CELL[1]
    im = framed(e).resize((w, h), Image.LANCZOS)
    out = PUBLIC / board_rel(e)
    out.parent.mkdir(parents=True, exist_ok=True)
    dest = "window" in e
    budget = (DEST_BOARD_BUDGET if dest else BOARD_BUDGET) * e["cols"] * e["rows"]
    for q in range(84 if e["medium"] in SMOOTH_MEDIA else 74, 49 if dest else 55, -4):
        im.save(out, "WEBP", quality=q, method=6)
        if out.stat().st_size <= budget:
            break
    return im.size, out.stat().st_size


def cmd_boards(ids):
    p = plan()
    for e in p["pictures"] + p.get("destinations", []):
        if (not ids or e["id"] in ids) and master_path(e["id"]).exists():
            size, b = make_board(e)
            print(e["id"], size, f"{b // 1024} KB")


def cmd_thumbs(ids):
    p = plan()
    for e in p["pictures"]:
        if (not ids or e["id"] in ids) and master_path(e["id"]).exists():
            size, b = make_thumb(e)
            print(e["id"], size, f"{b // 1024} KB")


DEST_THUMB_W = 300  # the passport's postcard tile: ~78 CSS px wide on a phone at 3x, ~140 on desktop (UI)
DEST_THUMB_BUDGET = 32 * 1024  # for 300 x 400 (1.6x a library thumb's pixels), pro rata for a taller postcard


def dest_thumb_rel(e):
    return f"pictures/{e['album']}/{e['id']}-thumb.webp"


def make_dest_thumb(e):
    """A destination's small copy for the passport's postcard grid, DEST_THUMB_W px wide."""
    im = framed(e)
    im = im.resize((DEST_THUMB_W, round(im.height * DEST_THUMB_W / im.width)), Image.LANCZOS)
    out = PUBLIC / dest_thumb_rel(e)
    for q in range(76, 39, -4):
        im.save(out, "WEBP", quality=q, method=6)
        if out.stat().st_size <= DEST_THUMB_BUDGET * im.height // 400:
            break
    return im.size, out.stat().st_size


def destinations(p):
    """A trip's postcards (lead, 2026-10-25): a real place, a picture the size of a whole board
    (4 x 4 or 4 x 5 cards). One shows when its board's crop is matched: `crop` is the col,row
    of the top-left card of the 2x2 that plays on the board as an ordinary square picture, and
    Levels' maker copies it into the board's level data (check.mts holds them equal). Kept
    out of `pictures`, so nothing deals one as a library picture or lists it in an album."""
    out = []
    for e in p.get("destinations", []):
        rel = f"pictures/{e['album']}/{e['id']}.webp"
        if not (PUBLIC / rel).exists():
            continue
        with Image.open(PUBLIC / rel) as im:
            px = list(im.size)
        with Image.open(PUBLIC / board_rel(e)) as im:
            board_px = list(im.size)
        with Image.open(PUBLIC / dest_thumb_rel(e)) as im:
            thumb_px = list(im.size)
        out.append({k: e[k] for k in ("id", "name", "place", "trip", "tag") if k in e} | {
            "cols": e["cols"], "rows": e["rows"], "crop": e["crop"], "window": e["window"],
            "file": rel, "board": board_rel(e), "thumb": dest_thumb_rel(e), "px": px, "boardPx": board_px, "thumbPx": thumb_px,
            "medium": e["medium"], "family": e["family"], "subjects": e["subjects"], "palette": e["palette"], "busy": e["busy"],
        })
    return out


def cmd_catalogue():
    """Every planned picture that has a shipped file. `family` groups look-alikes (a board
    takes at most one per family); a picture with none is its own family. `busy` is 0 calm,
    1 medium, 2 busy; `medium` is the art style, one word."""
    p = plan()
    pictures = []
    for e in p["pictures"]:
        rel = f"pictures/{e['album']}/{e['id']}.webp"
        if not (PUBLIC / rel).exists():
            continue
        with Image.open(PUBLIC / rel) as im:
            px = list(im.size)
        with Image.open(PUBLIC / board_rel(e)) as im:
            board_px = list(im.size)
        fam = e.get("family") or e["id"]
        pictures.append({
            "id": e["id"], "album": e["album"], "title": e["title"], "medium": e["medium"],
            "file": rel, "board": board_rel(e),
            "cols": e["cols"], "rows": e["rows"], "px": px, "boardPx": board_px,
            "palette": e.get("palette") or p["families"][fam]["palette"], "subjects": e["subjects"],
            "family": fam, "busy": e["busy"],
        })
        if e.get("landmark"):
            # A real, named place (lead, 2026-10-25): it belongs to a future trip as a destination,
            # so Levels keeps it off campaign boards (a build check holds it).
            pictures[-1]["landmark"] = True
    used = {x["album"] for x in pictures}
    out = {"albums": [a for a in p["albums"] if a["id"] in used], "pictures": pictures,
           "destinations": destinations(p)}
    CATALOGUE.parent.mkdir(parents=True, exist_ok=True)
    CATALOGUE.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    total = sum((PUBLIC / x["file"]).stat().st_size for x in pictures)
    print(f"{len(pictures)} pictures, {total // 1024} KB, -> {CATALOGUE.relative_to(ROOT)}")


def font(size):
    for name in ("segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def cut_into_cards(e, card_h, gap, bg):
    """The shipped picture with its card cuts drawn as gaps, card_h px a card."""
    im = Image.open(PUBLIC / "pictures" / e["album"] / f"{e['id']}.webp").convert("RGB")
    cw, ch = e["cols"], e["rows"]
    card_w = round(card_h * im.width / cw / (im.height / ch))
    im = im.resize((cw * card_w, ch * card_h), Image.LANCZOS)
    c = Image.new("RGB", (cw * card_w + (cw - 1) * gap, ch * card_h + (ch - 1) * gap), bg)
    for x in range(cw):
        for y in range(ch):
            c.paste(im.crop((x * card_w, y * card_h, (x + 1) * card_w, (y + 1) * card_h)), (x * (card_w + gap), y * (card_h + gap)))
    return im, c


def cmd_sheet(out, ids):
    """Each picture whole and cut into its cards, captioned."""
    p = plan()
    gap, pad = 6, 28
    tiles = []
    for pid in ids:
        e = entry(p, pid)
        im, cut = cut_into_cards(e, 160, gap, (44, 54, 66))
        tiles.append((e, im, cut))
    f1, f2 = font(20), font(15)
    rows_h = [max(im.height, cut.height) + 54 for _, im, cut in tiles]
    width = max(im.width + cut.width + 3 * pad for _, im, cut in tiles)
    sheet = Image.new("RGB", (width, sum(rows_h) + pad), (30, 37, 46))
    d = ImageDraw.Draw(sheet)
    y = pad
    for (e, im, cut), h in zip(tiles, rows_h):
        d.text((pad, y), f"{e['title']}", font=f1, fill=(240, 236, 228))
        d.text((pad, y + 24), f"{e['album']} · {e['medium']} · {e['cols']}x{e['rows']} cards · busy {e['busy']}", font=f2, fill=(170, 182, 196))
        sheet.paste(im, (pad, y + 50))
        sheet.paste(cut, (2 * pad + im.width, y + 50))
        y += h
    sheet.save(out)
    print(out, sheet.size)


def cmd_grid(out, ids):
    """A compact sheet for the creator: each look-alike family in a row, pictures of no
    family six to a row, each cut into its cards and captioned (title, style, album)."""
    p = plan()
    gap, pad = 4, 24
    f1, f2, f3 = font(22), font(15), font(13)
    es = [entry(p, pid) for pid in ids]
    rows, singles = {}, []
    for e in es:
        if e.get("family") in p["families"]:
            rows.setdefault(e["family"], []).append(e)
        else:
            singles.append(e)
    groups = [(p["families"][f]["title"], r) for f, r in rows.items()]
    groups += [("", singles[i:i + 6]) for i in range(0, len(singles), 6)]
    built = [(t, [(e, cut_into_cards(e, 120, gap, (30, 37, 46))[1]) for e in r]) for t, r in groups]
    m = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    # a slot is as wide as its picture or its caption, so a tall picture's caption has room
    slot = lambda e, c: max(c.width, round(m.textlength(e["title"], font=f2)), round(m.textlength(f"{e['medium']} · {e['album']}", font=f3)))
    width = max(sum(slot(e, c) for e, c in r) + pad * (len(r) + 1) for _, r in built)
    heights = [(34 if t else 0) + max(c.height for _, c in r) + 52 for t, r in built]
    sheet = Image.new("RGB", (width, sum(heights) + pad), (30, 37, 46))
    d = ImageDraw.Draw(sheet)
    y = pad
    for (t, r), h in zip(built, heights):
        top = y
        if t:
            d.text((pad, y), t, font=f1, fill=(240, 236, 228))
            top += 34
        x = pad
        for e, c in r:
            sheet.paste(c, (x, top))
            d.text((x, top + 4 + c.height), e["title"], font=f2, fill=(232, 228, 220))
            d.text((x, top + 23 + c.height), f"{e['medium']} · {e['album']}", font=f3, fill=(160, 172, 188))
            x += slot(e, c) + pad
        y += h
    sheet.save(out)
    print(out, sheet.size)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    c, rest = sys.argv[1], sys.argv[2:]
    if c == "prompt":
        cmd_prompt(rest[0])
    elif c == "gen":
        cmd_gen(rest[0], rest[1:])
    elif c == "process":
        cmd_process(rest[0], rest[1:])
    elif c == "export":
        cmd_export(rest)
    elif c == "thumbs":
        cmd_thumbs(rest)
    elif c == "boards":
        cmd_boards(rest)
    elif c == "catalogue":
        cmd_catalogue()
    elif c == "grid":
        cmd_grid(rest[0], rest[1:])
    elif c == "sheet":
        cmd_sheet(rest[0], rest[1:])
    else:
        sys.exit(__doc__)
