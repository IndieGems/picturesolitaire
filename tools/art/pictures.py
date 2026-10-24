"""Picture library pipeline: plan -> generated image -> master -> shipped WebP -> catalogue.

    python tools/art/pictures.py prompt <id>              print the full prompt and size
    python tools/art/pictures.py gen <raw-dir> <id>...    submit generations (gemforge, BILLS per id)
    python tools/art/pictures.py process <raw-dir> <id>... raw PNG -> tools/art/masters + public/pictures (+ thumb)
    python tools/art/pictures.py thumbs [<id>...]         Albums-screen thumbs from the masters (default: all)
    python tools/art/pictures.py catalogue                write src/content/pictures.json
    python tools/art/pictures.py sheet <out.png> <id>...  contact sheet with the card cuts drawn on
    python tools/art/pictures.py grid <out.png> <id>...   compact sheet: look-alike families in rows, the rest six a row

The plan (tools/art/pictures-plan.json) is the source of truth; docs/picture-direction.md
says how a picture is made. Masters keep the generated pixels (WebP q90, at the
picture's aspect) so a picture can be re-exported without paying to generate it again.

Cards are PORTRAIT cells, 3:4 (creator, 2026-10-24), so a picture of cols x rows cards
is (cols*3):(rows*4) and ships at exactly cols*384 x rows*512 px, WebP q80. The first
60 pictures were made for square cells (cols*384 x rows*384) and the game centre-crops
them; `process` from their masters would re-export them at the new aspect.
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
}
SHAPE_WORDS = {
    (2, 2): "Composition: a portrait picture, 3:4.",
    (3, 3): "Composition: a portrait picture, 3:4.",
    (2, 3): "Composition: a tall portrait picture, 1:2.",
    (3, 2): "Composition: an almost square picture, 9:8.",
    (1, 2): "Composition: a very tall narrow vertical picture, 3:8.",
    (2, 1): "Composition: a landscape picture, 3:2.",
}


def plan():
    return json.loads(PLAN.read_text(encoding="utf-8"))


def entry(p, pid):
    for e in p["pictures"]:
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


def crop_to(im, w, h):
    """Centre crop to the aspect w:h."""
    W, H = im.size
    if W * h > H * w:
        nw = round(H * w / h)
        return im.crop(((W - nw) // 2, 0, (W - nw) // 2 + nw, H))
    if W * h < H * w:
        nh = round(W * h / w)
        return im.crop((0, (H - nh) // 2, W, (H - nh) // 2 + nh))
    return im


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
        out = PUBLIC / "pictures" / e["album"] / f"{pid}.webp"
        out.parent.mkdir(parents=True, exist_ok=True)
        im.resize(size_of(e), Image.LANCZOS).save(out, "WEBP", quality=80, method=6)
        print(pid, im.size, "->", out.relative_to(ROOT), f"{out.stat().st_size // 1024} KB")
        make_thumb(e)


THUMB_LONG = 320  # the Albums screen's picture size, long side
THUMB_BUDGET = 24 * 1024


def thumb_rel(pid):
    # "-thumb" because the platform refuses a build with two files of the same name,
    # in any folders: pictures/<album>/<id>.webp is the full picture.
    return f"pictures/thumbs/{pid}-thumb.webp"


def make_thumb(e):
    """A light copy for the Albums screen: the master at the picture's card aspect (as the
    game shows it), THUMB_LONG px on the long side."""
    im = crop_to(Image.open(master_path(e["id"])).convert("RGB"), *size_of(e))
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


def cmd_thumbs(ids):
    p = plan()
    for e in p["pictures"]:
        if (not ids or e["id"] in ids) and master_path(e["id"]).exists():
            size, b = make_thumb(e)
            print(e["id"], size, f"{b // 1024} KB")


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
        fam = e.get("family") or e["id"]
        pictures.append({
            "id": e["id"], "album": e["album"], "title": e["title"], "medium": e["medium"],
            "file": rel, "thumb": thumb_rel(e["id"]),
            "cols": e["cols"], "rows": e["rows"], "px": px,
            "palette": e.get("palette") or p["families"][fam]["palette"], "subjects": e["subjects"],
            "family": fam, "busy": e["busy"],
        })
    used = {x["album"] for x in pictures}
    out = {"albums": [a for a in p["albums"] if a["id"] in used], "pictures": pictures}
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
    width = max(sum(c.width for _, c in r) + pad * (len(r) + 1) for _, r in built)
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
            x += c.width + pad
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
    elif c == "thumbs":
        cmd_thumbs(rest)
    elif c == "catalogue":
        cmd_catalogue()
    elif c == "grid":
        cmd_grid(rest[0], rest[1:])
    elif c == "sheet":
        cmd_sheet(rest[0], rest[1:])
    else:
        sys.exit(__doc__)
