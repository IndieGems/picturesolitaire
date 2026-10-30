# The six achievement icons (docs/achievements.md, the creator's list, 2026-10-30): Arcade avatar icons a player earns
# here and wears anywhere on the Arcade, as a portrait or a badge. The creator's direction (2026-10-30, of three shown:
# animal travellers, landmark badges, living landmarks): LANDMARK BADGES, our own destinations as glossy enamel travel
# pins, with gold lines, sparkle and a bold angle; each a place from one of our trips, on its own plain deep ground,
# composed for the round crop. (A first draft, travel objects on plain grounds, was "lackluster": not used.)
# The style reference is the store's key art (.gemarcade/hero/key_art.jpg); the platform shows icons at 256 px.
#   python -B tools/art/achievements.py gen <raw-dir> [slugs...]    (bills: one high 1024x1024 each)
#   python -B tools/art/achievements.py build <raw-dir> [slugs...]  -> tools/art/masters/achievements/<slug>.webp (1024),
#                                                                      tools/art/items/<slug>.png (512, the upload) and
#                                                                      public/art/achievements/<name>-icon.webp (256, the
#                                                                      game's own copy for the unlock card)
#   python -B tools/art/achievements.py sheet <out.png>
# Upload (approved finals only: every item counts against the game's item limit for good):
#   gemctl item upload tools/art/items/<slug>.png --slug <slug> --name "<name>"
# Landmarks follow the picture rules: no sacred, permit-restricted or licensed sites (Uluru was considered and dropped).
import re, subprocess, sys, time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

REF = ".gemarcade/hero/key_art.jpg"
MASTERS = Path("tools/art/masters/achievements")
ITEMS = Path("tools/art/items")
GAME = Path("public/art/achievements")

PIN = ("A bold, glossy enamel-pin style travel badge: a die-cut shape with thick clean areas of shiny enamel colour, each "
       "outlined by a thin raised polished-gold metal line, dramatic saturated colour, a bright rim light, a few small "
       "four-pointed sparkles, a dynamic slightly tilted angle; painted, never photographic. ")
ROUND = (" Square icon composed for a round crop: the subject is centred and large, everything important well inside the "
         "central circle, the corners only background. Bold and readable at a glance even very small: one clear main "
         "silhouette, strong contrast of light and colour against the background, a few big shapes, no clutter. No text, "
         "no letters, no numbers, no logos, no brand names, no border, no frame, no ring.")

# slug, achievement name, the destination and its trip, subject
ICONS = [
    ("ach-first-steps", "First Steps", "the Statue of Liberty (Travel America, trip 1)",
     "The Statue of Liberty in green copper, seen from slightly below, raising her torch high, its flame a bright golden "
     "burst, with a warm sunrise of coral and gold rays behind her and a few gulls; the badge's shape her figure and torch "
     "rising out of a round sunrise; set on a plain deep sunset-orange background with a soft glow."),
    ("ach-seasoned-traveller", "Seasoned Traveller", "Venice (Italy)",
     "A black Venetian gondola with its curved silver prow gliding along a sparkling canal, a gondolier in a striped "
     "shirt and a straw boater rowing at the back, a small stone arched bridge and colourful old houses with flower boxes "
     "behind; the badge's shape the gondola sweeping out of a round canal scene; set on a plain deep burgundy background "
     "with a soft glow."),
    ("ach-globetrotter", "Globetrotter", "the whole trip map",
     "A bright globe in sea blue and warm sand, with a little red and cream vintage propeller plane looping around it on "
     "a dotted trail, and three tiny landmark silhouettes standing on its rim: the Eiffel Tower by day, the snowy cone of "
     "Mt Fuji and flat-topped Table Mountain; set on a plain deep navy background with a soft glow."),
    ("ach-full-suitcase", "Full Suitcase", "Paris, Mt Fuji and the beach (the Souvenirs)",
     "An open vintage tan suitcase seen from slightly above, bursting with a whole journey rising out of it: the Eiffel "
     "Tower by day in warm bronze, a snowy Mt Fuji, a palm tree and a striped hot-air balloon, all rising out of the open "
     "case together, a few loose postcards flying out; set on a plain deep sky-blue background with a soft glow."),
    ("ach-fearless", "Fearless", "Moraine Lake in the Canadian Rockies (Canada)",
     "A jagged, steep snowy Canadian Rockies peak towering over a vivid turquoise glacial lake with dark pines, a small "
     "bright red pennant flag planted on its very summit and flying hard in the wind, a jagged golden lightning bolt "
     "cracking down from a dark storm cloud behind it, sunlight breaking through; the badge's shape the peak bursting up "
     "out of a round lake scene; set on a plain deep violet background with a soft glow."),
    ("ach-daily-devotee", "Daily Devotee", "Mt Fuji at sunrise (Japan)",
     "The sun rising behind the snowy cone of Mt Fuji over a calm blue lake, its long golden rays bursting outward behind "
     "the mountain, a few small clouds in coral and cream, the badge's shape the mountain and sun bursting out of a round "
     "lake scene; set on a plain deep teal background with a soft glow."),
]
BY = {i[0]: i for i in ICONS}


def gen(raw, slugs):
    raw.mkdir(parents=True, exist_ok=True); jobs = []
    for s in slugs:
        if (raw / f"{s}.png").exists():
            print(s, "already drawn"); continue
        r = subprocess.run(["gemforge", "generate", "image", "--from", REF, "--prompt", PIN + BY[s][3] + ROUND, "--size",
                            "1024x1024", "--quality", "high", "--out", str(raw), "--name", s, "--no-wait", "--json"],
                           capture_output=True, text=True, encoding="utf-8")
        m = re.search(r'"(?:submitted|job)":\s*"([^"]+)"', r.stdout)  # a no-wait reply is two JSON objects
        print(s, m.group(1) if m else (r.stdout + r.stderr)[:400], flush=True)
        if m:
            jobs.append((s, m.group(1)))
        time.sleep(3)
    for s, j in jobs:
        r = subprocess.run(["gemforge", "job", "wait", j, "--json"], capture_output=True, text=True, encoding="utf-8")
        st = re.search(r'"status":\s*"([a-z_]+)"', r.stdout); usd = re.search(r'"estimated_usd":\s*"([0-9.]+)"', r.stdout)
        print(s, st.group(1) if st else (r.stdout + r.stderr)[:400], usd.group(1) if usd else "", flush=True)


def build(raw, slugs):
    for p in (MASTERS, ITEMS, GAME):
        p.mkdir(parents=True, exist_ok=True)
    for s in slugs:
        im = Image.open(raw / f"{s}.png").convert("RGB")
        im.save(MASTERS / f"{s}.webp", "WEBP", quality=90, method=6)
        im.resize((512, 512), Image.LANCZOS).save(ITEMS / f"{s}.png", optimize=True)
        g = GAME / f"{s.removeprefix('ach-')}-icon.webp"  # named without the item slug's "ach-"
        im.resize((256, 256), Image.LANCZOS).save(g, "WEBP", quality=84, method=6)
        print(s, (ITEMS / f"{s}.png").stat().st_size // 1024, "KB upload;", g, g.stat().st_size // 1024, "KB")


def sheet(out):
    F = lambda z: ImageFont.truetype("segoeuib.ttf", z)
    cell = 440; W = 3 * cell + 60
    im = Image.new("RGB", (W, 2 * 440 + 150), (30, 37, 46)); d = ImageDraw.Draw(im)
    d.text((30, 26), "Achievement icons: the six as landmark badges", font=F(34), fill=(240, 236, 228))
    d.text((30, 74), "Each cropped round as a portrait, with 64 px and 32 px beside it (badge size).", font=F(19), fill=(165, 178, 194))
    for k, (s, name, place, _) in enumerate(ICONS):
        x, y = 30 + (k % 3) * cell, 130 + (k // 3) * 440
        ic = Image.open(ITEMS / f"{s}.png").convert("RGB")
        big = ic.resize((330, 330), Image.LANCZOS)
        m = Image.new("L", big.size, 0); ImageDraw.Draw(m).ellipse((0, 0, 329, 329), fill=255); im.paste(big, (x, y), m)
        for z, (dx, dy) in ((64, (342, 180)), (32, (342, 270))):
            sm = ic.resize((z, z), Image.LANCZOS); mm = Image.new("L", (z, z), 0)
            ImageDraw.Draw(mm).ellipse((0, 0, z - 1, z - 1), fill=255); im.paste(sm, (x + dx, y + dy), mm)
        d.text((x, y + 342), name, font=F(26), fill=(240, 236, 228))
        d.text((x, y + 378), place, font=F(16), fill=(165, 178, 194))
    im.save(out, optimize=True); print(out, im.size)


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "sheet":
        sheet(sys.argv[2])
    else:
        raw = Path(sys.argv[2]); slugs = sys.argv[3:] or [i[0] for i in ICONS]
        (gen if cmd == "gen" else build)(raw, slugs)
