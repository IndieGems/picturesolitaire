"""The tables a player can play on: the winter dusk (default) and the ones won or bought later.

    python tools/art/tables.py ingest <raw-dir>    raw generations -> tools/art/masters/tables/
    python tools/art/tables.py build               masters -> public/art/tables/ + tables.json
    python tools/art/tables.py icon <name> <picture-id>   the platform item's icon (512 px PNG)

Every table follows game-l.png's layout (detail at the edges and top corners, a calm
darker middle where the cards sit) and keeps the same chrome: frosted frames and pale
buttons are drawn by the game and do not change per table. What changes per table:

  <name>-table.webp       the background, 1080x1920 (cover, centre top), like public/art/table.webp
  <name>-stack-back.webp  the card back of the stacks, 384x512 (portrait 3:4) with alpha
  <name>-particles.png    a strip of square frames drifting at the edges (snow, leaves...)
  <name>-thumb.webp       a 320x400 preview for the table picker (the top of the table)
Every file name carries the table's name: the platform refuses a build in which two
files share a name, whatever their folders (tools/unique-names.mjs checks it).

The winter dusk keeps its original files (public/art/table.webp, stack-back.webp,
snow.png); only its thumb lives under public/art/tables/winter-dusk/ (winter-dusk-thumb.webp). The manifest
public/art/tables/tables.json lists every SHIPPED table with its paths.

A table's id is "table-" + its folder name ("table-autumn-study"): the same slug is the
platform item the server grants, so the game, the server and the art agree on one name.
Its item icon (tools/art/items/<id>.png) is for the Arcade, not shipped in the game.

Tables not yet shipped keep their masters here for later (a Coin purchase, say):
add them to SHIPPED when they are finished. Raw names in <raw-dir>:
  <id>.png (table), <id>-back.png (card back), <id>-particles.png (four in a row)
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MASTERS = ROOT / "tools/art/masters/tables"
PUBLIC = ROOT / "public"
OUT = PUBLIC / "art/tables"
FRAME = 64  # particle frame, px

TABLES = {
    "winter-dusk": {"title": "Winter Dusk", "particles": "snow",
                    "files": {"table": "art/table.webp", "stackBack": "art/stack-back.webp",
                              "particles": "art/snow.png"}, "frame": 32, "base": "#2c3746",
                    "master": ROOT / "tools/art/masters/chrome/table.webp"},
    "autumn-study": {"title": "Autumn Study", "particles": "leaves"},
    "summer-terrace": {"title": "Summer Terrace", "particles": "petals"},
    "spring-greenhouse": {"title": "Spring Greenhouse", "particles": "petals"},
    # The Daily Suitcase's prizes, one a month (docs/daily-suitcase.md); "snow" shares the winter
    # dusk's snow strip instead of a particles file of its own.
    "ski-lodge": {"title": "Ski Lodge", "particles": "snow", "share": "winter-dusk"},
    "winter-market": {"title": "Winter Market", "particles": "snow", "share": "winter-dusk"},
}
SHIPPED = ["winter-dusk", "autumn-study", "ski-lodge", "winter-market"]  # the first is the default


def ingest(raw):
    MASTERS.mkdir(parents=True, exist_ok=True)
    for f in sorted(Path(raw).glob("*.png")):
        stem = f.stem
        base = stem.removesuffix("-back").removesuffix("-particles")
        if base not in TABLES:
            continue
        im = Image.open(f)
        dst = MASTERS / f"{stem}.webp"
        if im.mode == "RGBA":
            im.save(dst, "WEBP", quality=92, alpha_quality=95, method=6)
        else:
            im.convert("RGB").save(dst, "WEBP", quality=92, method=6)
        print(f.name, "->", dst.relative_to(ROOT))


def base_colour(table):
    """The colour of the calm middle: shown behind the table while it loads, and past its
    edges on a screen taller than 9:16."""
    w, h = table.size
    mid = table.crop((w // 4, h * 2 // 5, w * 3 // 4, h * 3 // 5)).resize((1, 1), Image.LANCZOS)
    return "#%02x%02x%02x" % mid.getpixel((0, 0))[:3]


def thumb(table, out):
    """The top of the table (its lights and its edges), 320x400, for the picker."""
    w = table.width
    im = table.crop((0, 0, w, round(w * 1.25))).resize((320, 400), Image.LANCZOS)
    im.save(out, "WEBP", quality=80, method=6)


def particles(master, out):
    """Four sprites side by side in the master -> a strip of FRAME-px square frames."""
    im = Image.open(master).convert("RGBA")
    a = im.getchannel("A")
    # Split at the empty columns between the sprites.
    cols = [a.crop((x, 0, x + 1, im.height)).getextrema()[1] > 40 for x in range(im.width)]
    spans, start = [], None
    for x, on in enumerate(cols + [False]):
        if on and start is None:
            start = x
        elif not on and start is not None:
            if x - start > 20:
                spans.append((start, x))
            start = None
    strip = Image.new("RGBA", (FRAME * len(spans), FRAME), (0, 0, 0, 0))
    for i, (x0, x1) in enumerate(spans):
        s = im.crop((x0, 0, x1, im.height))
        s = s.crop(s.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox())
        k = (FRAME - 4) / max(s.size)
        s = s.resize((max(1, round(s.width * k)), max(1, round(s.height * k))), Image.LANCZOS)
        strip.alpha_composite(s, (i * FRAME + (FRAME - s.width) // 2, (FRAME - s.height) // 2))
    strip.save(out, optimize=True)
    return len(spans)


def stack_back(master, out):
    sys.dont_write_bytecode = True
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from chrome import cut_back  # noqa: E402  (one cut for every table's back)
    cut_back(Image.open(master).convert("RGBA")).save(out, "WEBP", quality=72, alpha_quality=75, method=6)


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {"default": f"table-{SHIPPED[0]}", "tables": []}
    for tid in SHIPPED:
        t = TABLES[tid]
        d = OUT / tid
        d.mkdir(parents=True, exist_ok=True)
        if "files" in t:  # the original winter files stay where they are
            files = dict(t["files"])
            table = Image.open(t["master"]).convert("RGB")
            frames, frame = 4, t["frame"]
        else:
            table = Image.open(MASTERS / f"{tid}.webp").convert("RGB")
            table.resize((1080, 1920), Image.LANCZOS).save(d / f"{tid}-table.webp", "WEBP", quality=72, method=6)
            stack_back(MASTERS / f"{tid}-back.webp", d / f"{tid}-stack-back.webp")
            files = {k: f"art/tables/{tid}/{tid}-{v}" for k, v in
                     (("table", "table.webp"), ("stackBack", "stack-back.webp"), ("particles", "particles.png"))}
            if "share" in t:  # another table's particles, as they are
                other = TABLES[t["share"]]
                files["particles"], frames, frame = other["files"]["particles"], 4, other["frame"]
            else:
                frames, frame = particles(MASTERS / f"{tid}-particles.webp", d / f"{tid}-particles.png"), FRAME
        thumb(table, d / f"{tid}-thumb.webp")
        files["thumb"] = f"art/tables/{tid}/{tid}-thumb.webp"
        manifest["tables"].append({
            "id": f"table-{tid}", "title": t["title"], **files,
            "particleKind": t["particles"], "particleFrame": frame, "particleFrames": frames,
            "base": t.get("base") or base_colour(table),
        })
        sizes = ", ".join(f"{k} {(PUBLIC / v).stat().st_size // 1024} KB" for k, v in files.items())
        print(tid, sizes)
    (OUT / "tables.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("public/art/tables/tables.json")


def icon(name, pid):
    """The platform item's icon: the top of the table, a little pile of its card backs and one
    real picture card in a frame leaning on it. 512x512, opaque."""
    sys.dont_write_bytecode = True
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from mockup import card  # noqa: E402  (the frame drawn to chrome-spec.md)
    table = Image.open(OUT / name / f"{name}-table.webp").convert("RGB")
    w = table.width
    im = table.crop((0, 0, w, w)).resize((1024, 1024), Image.LANCZOS).convert("RGBA")
    back = Image.open(OUT / name / f"{name}-stack-back.webp").convert("RGBA").resize((315, 420), Image.LANCZOS)
    for k in range(3, -1, -1):
        b = back.copy()
        if k:
            shade = Image.new("RGBA", b.size, (20, 14, 12, 110))
            b.alpha_composite(Image.composite(shade, Image.new("RGBA", b.size, (0, 0, 0, 0)), b.getchannel("A")))
        im.alpha_composite(b, (150, 250 + k * 16))
    cat = json.loads((ROOT / "src/content/pictures.json").read_text(encoding="utf-8"))
    p = next(x for x in cat["pictures"] + cat.get("items", []) if x["id"] == pid)
    pic = Image.open(PUBLIC / p["file"]).convert("RGB")
    u = pic.width // p["cols"]
    if p.get("month"):  # a suitcase item: its object whole, in the middle square
        cell = pic.crop((0, (pic.height - pic.width) // 2, pic.width, (pic.height + pic.width) // 2))
    else:
        cell = pic.crop((0, u, u, 2 * u)) if p["rows"] > 1 else pic.crop((0, 0, u, u))
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    card(layer, 455, 440, 400, 400, 400, cell)
    im.alpha_composite(layer.rotate(-8, resample=Image.BICUBIC, center=(655, 640)))
    out = ROOT / "tools/art/items" / f"table-{name}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    im.convert("RGB").resize((512, 512), Image.LANCZOS).save(out, optimize=True)
    print(out.relative_to(ROOT), f"{out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    if sys.argv[1] == "ingest":
        ingest(sys.argv[2])
    elif sys.argv[1] == "build":
        build()
    elif sys.argv[1] == "icon":
        icon(sys.argv[2], sys.argv[3])
    else:
        sys.exit(__doc__)
