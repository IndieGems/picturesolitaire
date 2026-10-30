"""The Daily Suitcase's art (creator, 2026-10-27; docs/daily-suitcase.md): each month's 10 items
(and each two-week VIP event's 7, docs/vip.md), and the suitcase itself.

    python tools/art/suitcase.py prompt <item id>          print an item's full prompt
    python tools/art/suitcase.py gen <raw-dir> <id>...     submit items (gemforge, BILLS per id)
    python tools/art/suitcase.py items <raw-dir> [<id>...] raw cut-outs -> masters + public/pictures/items
    python tools/art/suitcase.py cases <raw-dir>           raw suitcases -> public/art/suitcase-*.webp

An item is generated as one object on TRANSPARENCY, in its own style (the style mix of
docs/picture-direction.md), so one drawing gives both:
- the board's picture, a 2x2 square: the object placed on a calm, soft background of its own
  colour with a soft shadow under it (AGENTS.md: one clear subject, framed close, calm);
- the suitcase's cut-out (<id>-cutout.webp, about CUTOUT px on its long side), which UI shows in
  its slot and darkens in CSS for a missing item's silhouette.
Masters: tools/art/masters/items/<id>-cutout.webp (the generated object) and
tools/art/masters/<id>.webp (the composed picture, which pictures.py exports like any other).
Ids and titles are tools/art/items-plan.json's. The prompts are below, and also in prompts.txt.
"""
import ctypes
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

if sys.platform == "win32":  # AGENTS.md: the machine is shared, encode at below-normal priority
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import pictures as P  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
ITEM_MASTERS = ROOT / "tools/art/masters/items"
CUTOUT = 512

S = {
    "photo": "A professional studio product photograph, crisp and true to life:",
    "macro": "A close macro photograph, crisp, with true colours:",
    "toy": "Toy photography, a small handmade toy photographed close:",
    "render": "A glossy 3D render, like a still from a polished animated film:",
    "clay": "A soft clay 3D render, like a handmade stop-motion model:",
    "low-poly": "A low-poly 3D illustration built from flat-shaded triangular facets:",
    "flat": "A flat vector illustration with bold shapes, no outlines and a light grain:",
    "pop": "A 1960s pop-art comic illustration with bold black outlines and halftone dots on the object:",
    "watercolour": "A loose, fresh watercolour painting with crisp edges:",
    "pastel": "A soft pastel and chalk drawing:",
    "papercut": "A layered paper-cut craft object with soft shadows between the paper layers:",
    "pixel": "Clean pixel art with big square pixels and a small palette, no dithering:",
    "retro": "A mid-century travel-poster illustration with flat colour shapes and a gentle print texture:",
    # Haunted Holiday's one style (the creator's pick, 2026-10-30): a souvenir-model miniature, so each place keeps its own outline
    "miniature": ("A little painted miniature diorama, like a handmade souvenir model standing on its own small rounded island of "
                  "earth and moss, at dusk: a soft painted 3D finish, chunky simple shapes, smooth shading, crisp clean edges, "
                  "warm glowing lights, spooky but friendly and cheerful. A big round pumpkin-orange full moon stands just behind "
                  "it as part of the model, and one small round friendly white ghost with two dot eyes floats beside it. The "
                  "miniature:"),
}
END = (" One object only, centred, filling most of the frame, seen from the front at a slight angle from above."
       " No text, letters, numbers, logos or brands anywhere. No background, no floor, no shadow: isolated on a"
       " transparent background.")

# id: (style, the object in words, background top and bottom colours, medium for the catalogue)
ITEMS = {
    # Haunted Holiday, the first two-week VIP event (docs/vip.md; event "halloween-2026", 15-28 Oct 2026): famous haunted
    # places (creator, 2026-10-30), each a little painted miniature at dusk, one style for the set. Vetted: no sacred
    # sites, burial grounds, real tragedies or licensed buildings; looks described in words from facts, never a photo.
    "item-halloween-2026-01": ("miniature", "Bran Castle in Romania, 'Dracula's Castle': a white-walled castle with steep red-tiled roofs and towers of different heights, perched on a steep rocky crag above a few dark pines, its small windows glowing warm, two little bats", ("#43386b", "#2a2347"), "render"),
    "item-halloween-2026-02": ("miniature", "the little wooden bridge over a misty brook in Sleepy Hollow, from the legend of the Headless Horseman: a simple plank footbridge with a wooden rail among autumn trees in orange and gold, a glowing carved jack-o'-lantern and a black tricorn hat left on the bridge", ("#2f4a3f", "#1c2f28"), "render"),
    "item-halloween-2026-03": ("miniature", "a steep, narrow close in Edinburgh's Old Town: tall old grey stone tenement houses leaning close, worn stone steps climbing through a dark arched passage, one old iron street lamp glowing warm, cobbles", ("#3b4a66", "#232e45"), "render"),
    "item-halloween-2026-04": ("miniature", "the Chateau de Brissac in the Loire Valley, France's tallest chateau: two stout round medieval stone towers with machicolations flanking a tall cream-stone Renaissance central block with many tall windows and steep grey slate roofs; in one upper window a soft glowing green lady in a long gown, the Green Lady", ("#4d3a5e", "#30233d"), "render"),
    "item-halloween-2026-05": ("miniature", "the Flying Dutchman, the legendary ghost ship of the Cape of Good Hope: an old seventeenth-century Dutch sailing ship with tall masts and glowing, tattered pale green sails, riding a curling dark wave, a small rocky headland with a tiny white lighthouse beside it", ("#245a66", "#163a43"), "render"),
    "item-halloween-2026-06": ("miniature", "Kappabuchi pool in Tono, Japan, where kappa water imps are said to live: a small clear stream winding between mossy stones under green leaves, a bamboo fishing rod leaning over it with a fresh cucumber dangling on its line, and a small friendly green kappa with a little water dish on its head and a turtle shell peeking curiously out of the water; no shrine, no gate, no statue", ("#5b3a4f", "#3b2533"), "render"),
    "item-halloween-2026-07": ("miniature", "Frankenstein Castle in Germany's Odenwald hills, home of an alchemist's legend and a famous Halloween party: a ruined medieval stone castle on a wooded hilltop with two square battlemented towers, a string of little glowing lanterns across its walls and a small zigzag of lightning above", ("#6a3b2a", "#43251a"), "render"),
    # November 2026: Ski Trip
    "item-2026-11-01": ("photo", "a pair of ski goggles with a mirrored orange-to-blue lens and a striped elastic strap", ("#cfe3f2", "#9fc0dc"), "photo"),
    "item-2026-11-02": ("watercolour", "a knitted red and white bobble hat with a big fluffy white bobble on top", ("#f6efe2", "#e6d8c0"), "watercolour"),
    "item-2026-11-03": ("clay", "a pair of knitted mittens in mustard yellow and teal with a little snowflake pattern, joined by a string", ("#e9d3d6", "#cfaeb4"), "render"),
    "item-2026-11-04": ("low-poly", "a pair of bright red ski boots with silver buckles, standing side by side", ("#d9e1ea", "#aebccc"), "low-poly"),
    "item-2026-11-05": ("flat", "a cosy Nordic knitted jumper laid flat, navy blue with a white snowflake pattern around the neck", ("#f2dc9e", "#e2bf6a"), "flat"),
    "item-2026-11-06": ("photo", "a long woolly scarf with wide stripes in red, cream and forest green, loosely coiled", ("#dfeee6", "#b9d6c6"), "photo"),
    "item-2026-11-07": ("pop", "a pair of fluffy pink earmuffs on a curved white headband", ("#fbe48a", "#f2c84b"), "pop"),
    "item-2026-11-08": ("photo", "a pair of white figure skates with silver blades, tied together by their laces", ("#3f6f78", "#2a4f57"), "photo"),
    "item-2026-11-09": ("render", "a red enamel cheese fondue pot on a little stand with a flame, two long forks dipping cubes of bread into the melted cheese", ("#f0c9a8", "#d9a07a"), "render"),
    "item-2026-11-10": ("pixel", "a red rubber hot-water bottle in a cosy knitted grey cover", ("#ddd3ec", "#b9aad6"), "pixel"),
    # December 2026: Winter Market
    "item-2026-12-01": ("macro", "a shiny deep red glass bauble with a gold cap and a loop of gold ribbon, warm lights reflected in it", ("#2f5a46", "#1d3d2f"), "photo"),
    "item-2026-12-02": ("toy", "a traditional painted wooden nutcracker soldier figure in red and blue with a tall black hat and a white beard", ("#f3ead9", "#ddcfb4"), "toy"),
    "item-2026-12-03": ("photo", "a paper cone full of roasted chestnuts, some split open, a little steam rising", ("#ead8c0", "#cdb391"), "photo"),
    "item-2026-12-04": ("watercolour", "a glass mug of hot spiced apple cider with a cinnamon stick, an orange slice and a star anise", ("#dfeaf3", "#bcd2e4"), "watercolour"),
    "item-2026-12-05": ("papercut", "a glowing red paper star lantern with cut-out patterns, hanging from a short string", ("#27324f", "#171f36"), "papercut"),
    "item-2026-12-06": ("clay", "a small carved wooden reindeer figure with branching antlers", ("#dbe5d3", "#b9cbaa"), "render"),
    "item-2026-12-07": ("flat", "a gift box wrapped in green paper with a big red ribbon bow on top", ("#f6d9de", "#ebb6c0"), "flat"),
    "item-2026-12-08": ("photo", "a wooden candle arch with seven small lit candles on top and, inside the arch, a cut-out of little snowy cottages and fir trees, with no church, no tower and no steeple", ("#24304a", "#151d30"), "photo"),
    "item-2026-12-09": ("pastel", "a knitted red and white holiday stocking with a snowflake pattern and a little loop to hang it", ("#f1e8d8", "#ddcfb6"), "pastel"),
    "item-2026-12-10": ("retro", "a round pine wreath with pine cones, red berries and a red bow at the bottom", ("#f4e6c9", "#e4cc9c"), "retro"),
}


# the colour words Levels' makers read (the catalogue's `palette`)
PAL = {
    "item-halloween-2026-01": ["white", "red", "indigo"], "item-halloween-2026-02": ["orange", "brown", "green"],
    "item-halloween-2026-03": ["grey", "amber", "blue"], "item-halloween-2026-04": ["cream", "grey", "green"],
    "item-halloween-2026-05": ["green", "teal", "white"], "item-halloween-2026-06": ["green", "grey"],
    "item-halloween-2026-07": ["grey", "amber", "rust"],
    "item-2026-11-01": ["orange", "blue", "black"], "item-2026-11-02": ["red", "white"], "item-2026-11-03": ["mustard", "teal", "cream"],
    "item-2026-11-04": ["red", "silver"], "item-2026-11-05": ["navy", "white"], "item-2026-11-06": ["red", "cream", "green"],
    "item-2026-11-07": ["pink", "white"], "item-2026-11-08": ["white", "silver"], "item-2026-11-09": ["red", "yellow", "black"],
    "item-2026-11-10": ["grey", "red"],
    "item-2026-12-01": ["red", "gold"], "item-2026-12-02": ["red", "blue", "black"], "item-2026-12-03": ["brown", "cream"],
    "item-2026-12-04": ["amber", "orange", "brown"], "item-2026-12-05": ["red", "gold"], "item-2026-12-06": ["tan", "brown"],
    "item-2026-12-07": ["green", "red"], "item-2026-12-08": ["brown", "gold", "white"], "item-2026-12-09": ["red", "white"],
    "item-2026-12-10": ["green", "red", "brown"],
}


def prompt(pid):
    style, what, *_ = ITEMS[pid]
    return f"{S[style]} {what}.{END}"


def plan_item(pid):
    it = next(x for x in json.loads(P.ITEMS_PLAN.read_text(encoding="utf-8"))["items"] if x["id"] == pid)
    return it


def gen(raw, ids):
    raw = Path(raw)
    raw.mkdir(parents=True, exist_ok=True)
    for pid in ids:
        args = ["gemforge", "generate", "image", "--prompt", prompt(pid), "--size", "1024x1024", "--quality", "high",
                "--background", "transparent", "--out", str(raw), "--name", pid, "--no-wait", "--json", "--force"]
        r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8")
        print(pid, (r.stdout or r.stderr).strip().splitlines()[1:2])


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def cut(raw_png):
    """The object alone: cropped to what it covers, the generator's near-solid alpha made solid,
    and the colour under fully transparent pixels cleared so it cannot bleed when scaled."""
    im = Image.open(raw_png).convert("RGBA")
    im = im.crop(im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
    im.putalpha(im.getchannel("A").point(lambda v: min(255, round(v * 255 / 250))))
    clear = im.getchannel("A").point(lambda v: 255 if v else 0)
    return Image.composite(im, Image.new("RGBA", im.size, (0, 0, 0, 0)), clear)


def compose(obj, top, bottom, size=(1152, 1536)):
    """The board's picture: the object large on a calm vertical gradient of its own colour,
    a soft glow behind it and a soft shadow under it."""
    W, H = size
    bg = Image.new("RGB", (1, H))
    a, b = hexrgb(top), hexrgb(bottom)
    for y in range(H):
        t = y / (H - 1)
        bg.putpixel((0, y), tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3)))
    bg = bg.resize((W, H)).convert("RGBA")
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse((W * 0.12, H * 0.16, W * 0.88, H * 0.80), fill=70)
    glow = glow.filter(ImageFilter.GaussianBlur(W * 0.12))
    bg.alpha_composite(Image.composite(Image.new("RGBA", (W, H), (255, 255, 255, 255)), Image.new("RGBA", (W, H), (0, 0, 0, 0)), glow))
    k = min(W * 0.80 / obj.width, H * 0.66 / obj.height)
    o = obj.resize((round(obj.width * k), round(obj.height * k)), Image.LANCZOS)
    x, y = (W - o.width) // 2, round(H * 0.50 - o.height / 2)
    sh = Image.new("L", (W, H), 0)
    ImageDraw.Draw(sh).ellipse((x + o.width * 0.12, y + o.height * 0.93, x + o.width * 0.88, y + o.height * 1.04), fill=90)
    sh = sh.filter(ImageFilter.GaussianBlur(W * 0.025))
    bg.alpha_composite(Image.composite(Image.new("RGBA", (W, H), (20, 24, 32, 255)), Image.new("RGBA", (W, H), (0, 0, 0, 0)), sh))
    bg.alpha_composite(o, (x, y))
    return bg.convert("RGB")


def items(raw, ids):
    ITEM_MASTERS.mkdir(parents=True, exist_ok=True)
    out_dir = P.PUBLIC / "pictures/items"
    out_dir.mkdir(parents=True, exist_ok=True)
    for pid in ids or ITEMS:
        src = Path(raw) / f"{pid}.png"
        if not src.exists():
            continue
        style, what, (top, bottom), medium = ITEMS[pid]
        obj = cut(src)
        obj.save(ITEM_MASTERS / f"{pid}-cutout.webp", "WEBP", quality=92, alpha_quality=95, method=6)
        compose(obj, top, bottom).save(P.master_path(pid), "WEBP", quality=90, method=6)
        e = {"id": pid, "album": "items", "cols": 2, "rows": 2, "medium": medium}
        P.export(e)
        k = CUTOUT / max(obj.size)
        small = obj.resize((round(obj.width * k), round(obj.height * k)), Image.LANCZOS)
        small = Image.composite(small, Image.new("RGBA", small.size, (0, 0, 0, 0)), small.getchannel("A").point(lambda v: 255 if v else 0))
        co = out_dir / f"{pid}-cutout.webp"
        for q in (84, 78, 72, 66):
            small.save(co, "WEBP", quality=q, alpha_quality=85, method=6)
            if co.stat().st_size <= 40 * 1024:
                break
        sizes = [f"{(out_dir / f).stat().st_size // 1024} KB" for f in (f"{pid}.webp", f"{pid}-board.webp", f"{pid}-cutout.webp")]
        print(pid, plan_item(pid)["title"], medium, *sizes)
    # Each item drawn now lists its own picture: no stand-in, and its medium and subjects.
    ip = json.loads(P.ITEMS_PLAN.read_text(encoding="utf-8"))
    for it in ip["items"]:
        if it["id"] in ITEMS and (out_dir / f"{it['id']}.webp").exists():
            style, what, (top, bottom), medium = ITEMS[it["id"]]
            it.pop("standin", None)
            it.update({"medium": medium, "subjects": it["subjects"] if len(it.get("subjects") or []) > 1 else [it["title"].lower()], "busy": 0,
                       "palette": PAL[it["id"]], "prompt": prompt(it["id"])})
    P.ITEMS_PLAN.write_text(json.dumps(ip, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


CASES = {  # raw name -> (out, size): the open suitcase for its screen, the closed one for the shelf and the win card
    "suitcase-open": [("suitcase-open.webp", (1080, 760))],
    "suitcase-closed": [("suitcase-closed.webp", (300, 220)), ("suitcase-closed-small.webp", (150, 110))],
}


def cases(raw):
    for name, outs in CASES.items():
        src = Path(raw) / f"{name}.png"
        if not src.exists():
            continue
        obj = cut(src)
        obj.save(P.MASTERS / "chrome" / f"{name}.webp", "WEBP", quality=92, alpha_quality=95, method=6)
        for fname, (W, H) in outs:
            k = min(W / obj.width, H / obj.height)
            o = obj.resize((round(obj.width * k), round(obj.height * k)), Image.LANCZOS)
            canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            canvas.alpha_composite(o, ((W - o.width) // 2, (H - o.height) // 2))
            canvas = Image.composite(canvas, Image.new("RGBA", (W, H), (0, 0, 0, 0)), canvas.getchannel("A").point(lambda v: 255 if v else 0))
            out = P.PUBLIC / "art" / fname
            canvas.save(out, "WEBP", quality=84, alpha_quality=90, method=6)
            print(out.relative_to(ROOT), f"{W}x{H}", f"{out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    cmd, rest = sys.argv[1], sys.argv[2:]
    if cmd == "prompt":
        print(prompt(rest[0]))
    elif cmd == "gen":
        gen(rest[0], rest[1:])
    elif cmd == "items":
        items(rest[0], rest[1:])
    elif cmd == "cases":
        cases(rest[0])
    else:
        sys.exit(__doc__)
