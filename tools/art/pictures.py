"""Picture library pipeline: plan -> generated image -> master -> shipped WebP -> catalogue.

    python tools/art/pictures.py prompt <id>              print the full prompt and size
    python tools/art/pictures.py gen <raw-dir> <id>...    submit generations (gemforge, BILLS per id)
    python tools/art/pictures.py process <raw-dir> <id>... raw PNG -> tools/art/masters + public/pictures (+ thumb)
    python tools/art/pictures.py thumbs [<id>...]         Albums-screen thumbs from the masters (default: all)
    python tools/art/pictures.py catalogue                write src/content/pictures.json
    python tools/art/pictures.py sheet <out.png> <id>...  contact sheet with the card cuts drawn on

The plan (tools/art/pictures-plan.json) is the source of truth. Masters keep the
generated pixels (WebP q90, full size) so a picture can be re-exported at another
size without paying to generate it again. Shipped pictures are exactly
cols*cellPx x rows*cellPx, WebP q80.
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

# Generation size per cell shape: same aspect as cols:rows, edges multiples of 16.
GEN_SIZE = {
    (1, 1): (1024, 1024), (2, 2): (1024, 1024), (3, 3): (1536, 1536),
    (2, 3): (1024, 1536), (3, 2): (1536, 1024),
    (1, 2): (768, 1536), (2, 1): (1536, 768),
}
SHAPE_WORDS = {
    (2, 2): "Composition: a square picture.",
    (3, 3): "Composition: a square picture.",
    (2, 3): "Composition: a portrait picture, 2:3.",
    (3, 2): "Composition: a landscape picture, 3:2.",
    (1, 2): "Composition: a tall narrow vertical picture, 1:2.",
    (2, 1): "Composition: a wide panoramic picture, 2:1.",
}


def plan():
    return json.loads(PLAN.read_text(encoding="utf-8"))


def entry(p, pid):
    for e in p["pictures"]:
        if e["id"] == pid:
            return e
    sys.exit(f"no picture {pid!r} in the plan")


def full_prompt(p, e):
    fam = p["families"][e["family"]]
    return " ".join([e["prompt"], fam["prompt"], SHAPE_WORDS[(e["cols"], e["rows"])], p["suffix"][e["medium"]]])


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


def cmd_process(raw, ids):
    p = plan()
    cell = p["cellPx"]
    MASTERS.mkdir(parents=True, exist_ok=True)
    for pid in ids:
        e = entry(p, pid)
        src = next((f for f in Path(raw).glob(f"{pid}.*") if f.suffix.lower() in (".png", ".webp", ".jpg", ".jpeg")), None)
        if src is None:
            print(pid, "no raw file in", raw)
            continue
        im = Image.open(src).convert("RGB")
        # Crop to the exact cell aspect (generation sizes already match; this guards 'auto').
        cw, ch = e["cols"], e["rows"]
        W, H = im.size
        if W * ch > H * cw:
            nw = H * cw // ch
            im = im.crop(((W - nw) // 2, 0, (W - nw) // 2 + nw, H))
        elif W * ch < H * cw:
            nh = W * ch // cw
            im = im.crop((0, (H - nh) // 2, W, (H - nh) // 2 + nh))
        im.save(master_path(pid), "WEBP", quality=90, method=6)
        out = PUBLIC / "pictures" / e["album"] / f"{pid}.webp"
        out.parent.mkdir(parents=True, exist_ok=True)
        im.resize((cw * cell, ch * cell), Image.LANCZOS).save(out, "WEBP", quality=80, method=6)
        print(pid, im.size, "->", out.relative_to(ROOT), f"{out.stat().st_size // 1024} KB")
        make_thumb(pid)


THUMB_LONG = 320  # the Albums screen's picture size, long side


def thumb_rel(pid):
    # "-thumb" because the platform refuses a build with two files of the same name,
    # in any folders: pictures/<album>/<id>.webp is the full picture.
    return f"pictures/thumbs/{pid}-thumb.webp"


def make_thumb(pid):
    """A light copy for the Albums screen: THUMB_LONG px on the long side, from the master."""
    im = Image.open(master_path(pid)).convert("RGB")
    k = THUMB_LONG / max(im.size)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    out = PUBLIC / thumb_rel(pid)
    out.parent.mkdir(parents=True, exist_ok=True)
    # Best quality that fits the budget; busy squares step down, never below q40.
    for q in range(80, 39, -4):
        im.save(out, "WEBP", quality=q, method=6)
        if out.stat().st_size <= THUMB_BUDGET:
            break
    return im.size, out.stat().st_size


THUMB_BUDGET = 24 * 1024


def cmd_thumbs(ids):
    p = plan()
    for pid in ids or [e["id"] for e in p["pictures"]]:
        if master_path(pid).exists():
            size, b = make_thumb(pid)
            print(pid, size, f"{b // 1024} KB")


def cmd_catalogue():
    p = plan()
    cell = p["cellPx"]
    pictures = []
    for e in p["pictures"]:
        rel = f"pictures/{e['album']}/{e['id']}.webp"
        if not (PUBLIC / rel).exists():
            continue
        pictures.append({
            "id": e["id"], "album": e["album"], "title": e["title"], "medium": e["medium"],
            "file": rel, "thumb": thumb_rel(e["id"]),
            "cols": e["cols"], "rows": e["rows"], "px": [e["cols"] * cell, e["rows"] * cell],
            "palette": p["families"][e["family"]]["palette"], "subjects": e["subjects"], "family": e["family"],
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


def cmd_sheet(out, ids):
    """Each picture at 120 px a cell, its card cuts drawn as gaps, captioned."""
    p = plan()
    unit, gap, pad = 120, 6, 28
    tiles = []
    for pid in ids:
        e = entry(p, pid)
        src = PUBLIC / "pictures" / e["album"] / f"{pid}.webp"
        im = Image.open(src).convert("RGB")
        cw, ch = e["cols"], e["rows"]
        im = im.resize((cw * unit, ch * unit), Image.LANCZOS)
        cut = Image.new("RGB", (cw * unit + (cw - 1) * gap, ch * unit + (ch - 1) * gap), (44, 54, 66))
        for c in range(cw):
            for r in range(ch):
                cut.paste(im.crop((c * unit, r * unit, (c + 1) * unit, (r + 1) * unit)), (c * (unit + gap), r * (unit + gap)))
        tiles.append((e, im, cut))
    # Two columns per row: whole picture, then the same picture cut into cards.
    f1, f2 = font(20), font(15)
    rows_h, width = [], 0
    for e, im, cut in tiles:
        rows_h.append(max(im.height, cut.height) + 54)
        width = max(width, im.width + cut.width + 3 * pad)
    sheet = Image.new("RGB", (width, sum(rows_h) + pad), (30, 37, 46))
    d = ImageDraw.Draw(sheet)
    y = pad
    for (e, im, cut), h in zip(tiles, rows_h):
        d.text((pad, y), f"{e['title']}", font=f1, fill=(240, 236, 228))
        fam = p["families"][e["family"]]["title"]
        d.text((pad, y + 24), f"{e['album']} · {e['medium']} · {e['cols']}x{e['rows']} cards · family: {fam}", font=f2, fill=(170, 182, 196))
        sheet.paste(im, (pad, y + 50))
        sheet.paste(cut, (2 * pad + im.width, y + 50))
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
    elif c == "sheet":
        cmd_sheet(rest[0], rest[1:])
    else:
        sys.exit(__doc__)
