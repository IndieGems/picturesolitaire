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
    "pop": "A 1960s pop-art comic illustration with bold black outlines, flat bright colour blocks and smooth shading, no halftone dots:",
    "watercolour": "A loose, fresh watercolour painting with crisp edges:",
    "pastel": "A soft pastel and chalk drawing:",
    "papercut": "A layered paper-cut craft object with soft shadows between the paper layers:",
    "pixel": "Clean pixel art with big square pixels and a small palette, no dithering:",
    "retro": "A mid-century travel-poster illustration with flat colour shapes and a gentle print texture:",
    # Clean styles for the events from Grand Train Journey on (creator, 2026-10-30: flat colour and smooth shading only)
    "vector": "A clean flat vector illustration with bold simple shapes, flat colours and crisp clean edges, no outlines, no grain, no texture:",
    "cel": "A clean modern illustration like a still from an animated film, crisp edges and smooth soft gradient shading, no texture:",
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
    # The last three (creator, 2026-10-30, of four offered, when events became 30-level packs with 10 items): Kronborg,
    # Hamlet's Elsinore (a play's ghost, no real tragedy); New Orleans's French Quarter (a street, no one building, no
    # cemetery, church or voodoo); Hound Tor on Dartmoor (natural granite, the ghostly-hound legend; no prehistoric stones).
    "item-halloween-2026-08": ("miniature", "Kronborg Castle at Elsinore in Denmark, Hamlet's castle: a grand Renaissance castle of pale sandstone with tall slender green copper spires and steep green copper roofs, square corner towers around a courtyard, thick grassy ramparts with a few small old black cannons on the battlements above a little strip of sea, and a small glowing pale-blue ghostly king with a crown and a long cloak walking the battlements, the ghost of Hamlet's father", ("#2a4d6e", "#18304a"), "render"),
    "item-halloween-2026-09": ("miniature", "a corner of the French Quarter in New Orleans, America's most haunted city: a two-storey old townhouse painted soft coral with teal shutters on its tall windows and lacy black wrought-iron balconies hung with ferns in baskets, two glowing gas lanterns beside the door, a little brass trumpet resting on a chair on the balcony, a cobbled pavement; the friendly ghost leans on the balcony railing; no church, no cemetery, no signs", ("#6b2f45", "#44192b"), "render"),
    "item-halloween-2026-10": ("miniature", "Hound Tor on Dartmoor in England, the misty moor of the legend of the ghostly hound: a craggy hilltop of big stacked rounded grey granite boulders rising out of purple heather and golden gorse, wisps of low mist, and a big glowing pale-green ghostly hound with a friendly face and a wagging tail, four legs and one tail, standing proudly on top of the rocks; no standing stones, no graves", ("#4a5a3a", "#2e3a24"), "render"),
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
    # The VIP events from 15 Nov 2026 (lead, 2026-10-30; docs/vip.md 1fd60bc), themes from docs/daily-suitcase.md approved
    # 2026-10-27: Grand Train Journey, Northern Lights (its Cinnamon bun drawn as Snowshoes: the library has Cinnamon
    # Rolls), Carnival. Clean styles only; each item on its own deep, calm ground.
    "item-train-journey-2026-01": ("photo", "an antique gold pocket watch with its hinged lid open, a plain white enamel dial with slim black hands and small dot markers instead of numbers, on a short gold chain", ("#2d4f45", "#1b332c"), "photo"),
    "item-train-journey-2026-02": ("render", "a small 1920s folding travel clock in a red leather case with brass corners, its round cream dial with slim hands and plain tick marks instead of numbers", ("#2b3f63", "#1a2840"), "render"),
    "item-train-journey-2026-03": ("clay", "a round vintage hat box in pale pink and cream stripes, its lid tied with a black satin ribbon in a bow", ("#2a5d63", "#183c40"), "render"),
    "item-train-journey-2026-04": ("macro", "a fine white bone-china teacup on its saucer with a gold rim and a delicate painted band of small blue flowers, hot tea steaming inside, a silver teaspoon on the saucer", ("#6a2a3a", "#451a26"), "photo"),
    "item-train-journey-2026-05": ("cel", "a black lacquered fountain pen with a gold nib, a gold clip and gold bands, lying diagonally, a single drop of blue ink beside its nib; no writing", ("#b8892f", "#8a6420"), "cel"),
    "item-train-journey-2026-06": ("render", "a pair of mother-of-pearl and polished brass opera glasses with a slim folding gold handle", ("#4e2f5c", "#301c3a"), "render"),
    "item-train-journey-2026-07": ("vector", "a brown leather luggage tag on a buckled leather strap with a brass buckle, its little window holding a blank cream card with no writing", ("#245a7a", "#163a52"), "flat"),
    "item-train-journey-2026-08": ("photo", "a shiny chrome conductor's ticket punch, shaped like a pair of pliers with a small round punch in its jaws, beside a small plain cream railway ticket with a few round holes punched in it and no writing", ("#7a2e2a", "#521c19"), "photo"),
    "item-train-journey-2026-09": ("low-poly", "a polished silver dome cloche on a round silver platter, its lid lifted a little at one side with a wisp of steam escaping", ("#3a4a5a", "#232f3b"), "low-poly"),
    "item-train-journey-2026-10": ("toy", "a classic black felt bowler hat with a black ribbon band and a curled brim, a small folded red silk handkerchief beside it", ("#9a6a3a", "#6e4a26"), "toy"),
    "item-2027-01-01": ("render", "a headlamp on a wide elastic strap, its round lamp switched on and glowing with a warm white beam", ("#1f3a5a", "#12243b"), "render"),
    "item-2027-01-02": ("render", "a trapper hat in red-and-black buffalo-check wool with thick fluffy cream fur-lined ear flaps tied up on top", ("#8a6a2a", "#5e4818"), "render"),
    "item-2027-01-03": ("photo", "a pair of thick hand-knitted wool socks in cream, grey and red with a Nordic star pattern, laid crossed", ("#34506e", "#203449"), "photo"),
    "item-2027-01-04": ("cel", "a vintage camera on a three-legged wooden tripod with brass fittings, its legs spread wide", ("#40474f", "#272c32"), "cel"),
    "item-2027-01-05": ("photo", "a traditional Finnish kuksa, a hand-carved wooden cup from a birch burl with a loop handle, steaming hot berry drink inside", ("#6a2a3e", "#441a28"), "photo"),
    "item-2027-01-06": ("vector", "a pair of traditional wooden-framed snowshoes with criss-cross rawhide lacing and leather bindings, crossed", ("#2f6a8a", "#1d4a63"), "flat"),
    "item-2027-01-07": ("low-poly", "a Scandinavian kick-sled seen from the side: a small red wooden seat with a low back at the front and a tall red handlebar rising behind it, both mounted on two long, thin, straight steel runners that stretch far out behind the seat, flat on the snow, much longer than the seat; not a rocking chair, no curved rockers", ("#5e2a5a", "#3c1a3a"), "low-poly"),
    "item-2027-01-08": ("clay", "a pair of cosy grey felted wool slippers with a small red heart stitched on each toe", ("#3b4f6a", "#243246"), "render"),
    "item-2027-01-09": ("macro", "a brass pocket telescope, fully extended, with a worn brown leather grip and a glinting lens", ("#235a45", "#133a2c"), "photo"),
    "item-2027-01-10": ("macro", "an ice lantern: a hollow block of clear ice with a candle flame glowing warm inside it, frost along its rim", ("#2a2f5e", "#181b3d"), "photo"),
    "item-2027-02-01": ("render", "a Venetian carnival mask covering the eyes, white and gold with red diamond patterns, a spray of red and gold feathers on one side", ("#1f5a5e", "#13393c"), "render"),
    "item-2027-02-02": ("photo", "an elegant fan of fluffy pink ostrich feathers spread wide on a slim gold handle", ("#4a2350", "#2e1532"), "photo"),
    "item-2027-02-03": ("pop", "a wooden tambourine with pairs of shiny brass jingles round its rim and colourful ribbons tied to it", ("#a8481e", "#7a3214"), "pop"),
    "item-2027-02-04": ("clay", "a pair of maracas painted in bright stripes of yellow, green and red, crossed", ("#2a3f8a", "#1a2860"), "render"),
    "item-2027-02-05": ("render", "a jester's hat with three floppy points in purple, green and gold, a little gold bell at the tip of each", ("#7a1f2e", "#52141e"), "render"),
    "item-2027-02-06": ("vector", "a party popper cone in bright stripes bursting with curly streamers and confetti", ("#1f2f55", "#121d38"), "flat"),
    "item-2027-02-07": ("macro", "a pair of sparkling gold sequinned high-heeled dance shoes with ankle straps", ("#1f5a3a", "#123a25"), "photo"),
    "item-2027-02-08": ("photo", "a tangle of shiny Mardi Gras bead necklaces in purple, green and gold", ("#6a1f55", "#451338"), "photo"),
    "item-2027-02-09": ("render", "a party horn noisemaker lying on its side: a long slim paper tube in bright red and yellow spiral stripes with a small white mouthpiece at the left end, flaring at the right end into a wide trumpet bell edged with a fringe of shiny gold foil; clearly a horn to blow, not a hat", ("#1f4f6e", "#13334a"), "render"),
    "item-2027-02-10": ("macro", "a sparkling carnival tiara of gold and rhinestones topped with tall white and pink feathers", ("#3a2466", "#241544"), "photo"),
}


# the colour words Levels' makers read (the catalogue's `palette`)
PAL = {
    "item-halloween-2026-01": ["white", "red", "indigo"], "item-halloween-2026-02": ["orange", "brown", "green"],
    "item-halloween-2026-03": ["grey", "amber", "blue"], "item-halloween-2026-04": ["cream", "grey", "green"],
    "item-halloween-2026-05": ["green", "teal", "white"], "item-halloween-2026-06": ["green", "grey"],
    "item-halloween-2026-07": ["grey", "amber", "rust"],
    "item-halloween-2026-08": ["cream", "green", "blue"], "item-halloween-2026-09": ["coral", "teal", "black"],
    "item-halloween-2026-10": ["grey", "purple", "green"],
    "item-2026-11-01": ["orange", "blue", "black"], "item-2026-11-02": ["red", "white"], "item-2026-11-03": ["mustard", "teal", "cream"],
    "item-2026-11-04": ["red", "silver"], "item-2026-11-05": ["navy", "white"], "item-2026-11-06": ["red", "cream", "green"],
    "item-2026-11-07": ["pink", "white"], "item-2026-11-08": ["white", "silver"], "item-2026-11-09": ["red", "yellow", "black"],
    "item-2026-11-10": ["grey", "red"],
    "item-2026-12-01": ["red", "gold"], "item-2026-12-02": ["red", "blue", "black"], "item-2026-12-03": ["brown", "cream"],
    "item-2026-12-04": ["amber", "orange", "brown"], "item-2026-12-05": ["red", "gold"], "item-2026-12-06": ["tan", "brown"],
    "item-2026-12-07": ["green", "red"], "item-2026-12-08": ["brown", "gold", "white"], "item-2026-12-09": ["red", "white"],
    "item-2026-12-10": ["green", "red", "brown"],
    "item-train-journey-2026-01": ["gold", "white", "green"],
    "item-train-journey-2026-02": ["red", "brass", "cream"],
    "item-train-journey-2026-03": ["pink", "cream", "black"],
    "item-train-journey-2026-04": ["white", "gold", "blue"],
    "item-train-journey-2026-05": ["black", "gold", "blue"],
    "item-train-journey-2026-06": ["pearl", "brass", "purple"],
    "item-train-journey-2026-07": ["brown", "brass", "cream"],
    "item-train-journey-2026-08": ["silver", "cream", "red"],
    "item-train-journey-2026-09": ["silver", "slate"],
    "item-train-journey-2026-10": ["black", "red", "caramel"],
    "item-2027-01-01": ["blue", "white", "yellow"],
    "item-2027-01-02": ["red", "black", "cream"],
    "item-2027-01-03": ["cream", "red", "grey"],
    "item-2027-01-04": ["brown", "brass", "black"],
    "item-2027-01-05": ["brown", "red"],
    "item-2027-01-06": ["brown", "tan", "blue"],
    "item-2027-01-07": ["red", "silver"],
    "item-2027-01-08": ["grey", "red"],
    "item-2027-01-09": ["brass", "brown"],
    "item-2027-01-10": ["white", "amber", "blue"],
    "item-2027-02-01": ["white", "gold", "red"],
    "item-2027-02-02": ["pink", "gold"],
    "item-2027-02-03": ["tan", "brass", "rainbow"],
    "item-2027-02-04": ["yellow", "green", "red"],
    "item-2027-02-05": ["purple", "green", "gold"],
    "item-2027-02-06": ["pink", "yellow", "blue"],
    "item-2027-02-07": ["gold", "green"],
    "item-2027-02-08": ["purple", "green", "gold"],
    "item-2027-02-09": ["red", "yellow", "gold"],
    "item-2027-02-10": ["gold", "white", "pink"],
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
        # 40 KB a cut-out: busy ones (lattice, beads, feathers) step on down, then soften their alpha's quality too
        for q, aq in ((84, 85), (78, 85), (72, 85), (66, 85), (60, 80), (54, 75), (50, 70)):
            small.save(co, "WEBP", quality=q, alpha_quality=aq, method=6)
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
