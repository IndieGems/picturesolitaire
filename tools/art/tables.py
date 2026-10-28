"""The tables a player can play on: the sunny day (everyone's, creator 2026-10-28) and the ones won or bought later.

    python tools/art/tables.py ingest <raw-dir>    raw generations -> tools/art/masters/tables/
    python tools/art/tables.py build               masters -> public/art/tables/ + tables.json
    python tools/art/tables.py icon <name> <picture-id>   the platform item's icon (512 px PNG)
    python tools/art/tables.py scene <name> <scene.png>   a table finished outward (16:9) -> its masters

A table can come from a wider SCENE (creator, 2026-10-28, Sunny Day without its suitcase rims): the
table's scene finished outward to 16:9 by the generator, so the PC side art beside the game is the
same picture. `scene` keeps it as masters/tables/<name>-scene.webp and cuts its middle 9:16 as the
table's master; the side art (tools/art/store.py, BORDERS) is that scene with the props near the
game cleared, so it fits every window shape (the Arcade scales side art to cover the window, so a
prop running past the game's edge lines up only on a 16:9 screen).

Every table follows game-l.png's layout (detail at the edges and top corners, a calm
darker middle where the cards sit) and keeps the same chrome: frosted frames and pale
buttons are drawn by the game and do not change per table. What changes per table:

  <name>-table.webp       the background, 1080x1920 (cover, centre top), like public/art/table.webp
  <name>-stack-back.webp  the card back of the stacks, 384x512 (portrait 3:4) with alpha
  <name>-particles.webp   a strip of square frames drifting at the edges (snow, leaves...), lossless
  <name>-thumb.webp       a 320x400 preview for the table picker (the top of the table)
Every file name carries the table's name: the platform refuses a build in which two
files share a name, whatever their folders (tools/unique-names.mjs checks it).

The winter dusk (the game's first table, December 2026's suitcase prize since the default turned
sunny) keeps its original files (public/art/table.webp, stack-back.webp, snow.webp) and its own home
backdrop ("desk": art/home-desk.webp; a table without one shows on home too); only its thumb lives
under public/art/tables/winter-dusk/ (winter-dusk-thumb.webp). The manifest
public/art/tables/tables.json lists every SHIPPED table with its paths, the built-in one first.

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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from images import squeeze  # noqa: E402  (the lossless last step: tools/art/images.py)

ROOT = Path(__file__).resolve().parents[2]
MASTERS = ROOT / "tools/art/masters/tables"
PUBLIC = ROOT / "public"
OUT = PUBLIC / "art/tables"
FRAME = 64  # particle frame, px

TABLES = {
    # The sunny day: the store's sky-blue suitcase carried in (creator, 2026-10-28, picked from three).
    # Its petals drift as "petals" (UI's kind: sparser, slower and swaying wider than "leaves").
    "sunny-day": {"title": "Sunny Day", "particles": "petals"},
    "winter-dusk": {"title": "Winter Dusk", "particles": "snow",
                    "files": {"table": "art/table.webp", "stackBack": "art/stack-back.webp",
                              "particles": "art/snow.webp", "desk": "art/home-desk.webp"}, "frame": 32, "base": "#2c3746",
                    "showLocked": True,  # December's prize: the picker shows it locked until owned
                    "master": ROOT / "tools/art/masters/chrome/table.webp"},
    "autumn-study": {"title": "Autumn Study", "particles": "leaves"},
    "summer-terrace": {"title": "Summer Terrace", "particles": "petals"},
    "spring-greenhouse": {"title": "Spring Greenhouse", "particles": "petals"},
    # The Daily Suitcase's prizes, one a month (docs/daily-suitcase.md); "snow" shares the winter
    # dusk's snow strip instead of a particles file of its own.
    "ski-lodge": {"title": "Ski Lodge", "particles": "snow", "share": "winter-dusk"},
    "winter-market": {"title": "Winter Market", "particles": "snow", "share": "winter-dusk"},
}
SHIPPED = ["sunny-day", "winter-dusk", "autumn-study", "ski-lodge", "winter-market"]  # the picker's order
DEFAULT = "sunny-day"  # everyone's table (UI's code switched to it in 78c3623)
# Made-up marks the generator left on a table's props, softened at ingest: (x, y, radius) on the raw.
CLEAN = {}  # raw stem -> marks to soften at ingest (the first sunny table had a glyph on its camera)
# Each trip's Souvenir board has a table of its own (docs/souvenirs.md; tools/art/souvenirs.py makes it):
# named in tools/art/souvenirs-plan.json, no particles, and marked "souvenir" in the manifest, so a picker
# or a shop can tell it apart from a table a player owns. It ships once its table and back masters exist.
_SV = ROOT / "tools/art/souvenirs-plan.json"
for _s in (json.loads(_SV.read_text(encoding="utf-8"))["souvenirs"] if _SV.exists() else []):
    TABLES[_s["table"]] = {"title": _s["tableTitle"], "souvenir": _s["trip"]}
    if (MASTERS / f"{_s['table']}.webp").exists() and (MASTERS / f"{_s['table']}-back.webp").exists():
        SHIPPED.append(_s["table"])


def ingest(raw):
    MASTERS.mkdir(parents=True, exist_ok=True)
    for f in sorted(Path(raw).glob("*.png")):
        stem = f.stem
        base = stem.removesuffix("-back").removesuffix("-particles")
        if base not in TABLES:
            continue
        im = Image.open(f)
        if stem in CLEAN:
            sys.dont_write_bytecode = True
            sys.path.insert(0, str(Path(__file__).resolve().parent))
            from store import dab  # noqa: E402
            im = im.convert("RGB")
            for mark in CLEAN[stem]:
                im = dab(im, *mark)
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
    # Lossless WebP, not PNG (2026-10-28): the same pixels, a quarter lighter.
    strip.save(out, "WEBP", lossless=True, quality=100, method=6, exact=True)
    squeeze(out)
    return len(spans)


def stack_back(master, out):
    sys.dont_write_bytecode = True
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from chrome import cut_back  # noqa: E402  (one cut for every table's back)
    cut_back(Image.open(master).convert("RGBA")).save(out, "WEBP", quality=72, alpha_quality=75, method=6)


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    sys.dont_write_bytecode = True
    from store import BORDERS as borders  # noqa: E402  (only a border the store page has)
    manifest = {"default": f"table-{DEFAULT}", "tables": []}
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
                     (("table", "table.webp"), ("stackBack", "stack-back.webp"), ("particles", "particles.webp"))}
            if "share" in t:  # another table's particles, as they are
                other = TABLES[t["share"]]
                files["particles"], frames, frame = other["files"]["particles"], 4, other["frame"]
            elif t.get("particles"):
                frames, frame = particles(MASTERS / f"{tid}-particles.webp", d / f"{tid}-particles.webp"), FRAME
            else:  # no weather (a Souvenir's table): particles.ts draws none without a strip
                files.pop("particles")
                frames = frame = None
        if t.get("showLocked"):  # a prize table every player sees in the picker, locked until owned
            files["showLocked"] = True
        thumb(table, d / f"{tid}-thumb.webp")
        files["thumb"] = f"art/tables/{tid}/{tid}-thumb.webp"
        rec = {"id": f"table-{tid}", "title": t["title"], **files}
        if "particles" in files:
            rec |= {"particleKind": t["particles"], "particleFrame": frame, "particleFrames": frames}
        rec["base"] = t.get("base") or base_colour(table)
        if t.get("souvenir"):
            rec["souvenir"] = t["souvenir"]
        if tid in borders:  # its PC/TV side art on the store page, by name (UI passes it to gem.showPortraitBorders)
            rec["border"] = tid
        manifest["tables"].append(rec)
        sizes = ", ".join(f"{k} {(PUBLIC / v).stat().st_size // 1024} KB" for k, v in files.items() if isinstance(v, str))
        print(tid, sizes)
    (OUT / "tables.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("public/art/tables/tables.json")


def scene(name, src):
    """A table's 16:9 scene -> masters/tables/<name>-scene.webp, and its middle 9:16 (what the game
    shows) -> masters/tables/<name>.webp at 1152 x 2048, for build."""
    im = Image.open(src).convert("RGB")
    im.save(MASTERS / f"{name}-scene.webp", "WEBP", quality=90, method=6)
    w = round(im.height * 9 / 16)
    x0 = (im.width - w) // 2
    im.crop((x0, 0, x0 + w, im.height)).resize((1152, 2048), Image.LANCZOS).save(MASTERS / f"{name}.webp", "WEBP", quality=92, method=6)
    print(f"tools/art/masters/tables/{name}-scene.webp", im.size, f"-> {name}.webp (its middle, x {x0}..{x0 + w})")


def icon(name, pid):
    """The platform item's icon: the top of the table, a little pile of its card backs and one
    real picture card in a frame leaning on it. 512x512, opaque."""
    sys.dont_write_bytecode = True
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from mockup import card  # noqa: E402  (the frame drawn to chrome-spec.md)
    files = TABLES[name].get("files")  # the winter dusk keeps its original files
    table = Image.open(PUBLIC / files["table"] if files else OUT / name / f"{name}-table.webp").convert("RGB")
    w = table.width
    im = table.crop((0, 0, w, w)).resize((1024, 1024), Image.LANCZOS).convert("RGBA")
    back = Image.open(PUBLIC / files["stackBack"] if files else OUT / name / f"{name}-stack-back.webp")
    back = back.convert("RGBA").resize((315, 420), Image.LANCZOS)
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
    elif sys.argv[1] == "scene":
        scene(sys.argv[2], sys.argv[3])
    else:
        sys.exit(__doc__)
