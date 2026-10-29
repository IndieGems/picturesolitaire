"""The soundtracks' covers (UI's Music list, 2026-10-29) and their shop icons (Server's items).

    python tools/art/tracks.py ingest <raw-dir>    <track-id>-cover.png raws -> masters, covers and icons

Each cover is a square painted record sleeve in its place's colours, drawn from game-l.png's finish and
its paired table's colours (prompts in tools/art/prompts.txt). It is kept as a master in
tools/art/masters/tracks/, shipped at 256 px as public/art/tracks/<track-id>-cover.webp (the track id
carries its owner, so every file name stays unique), and the tracks sold in the shop also get their
platform item's icon, tools/art/items/<track-id>.png (512 px, opaque, like the tables' icons).
"""
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from images import squeeze  # noqa: E402  (the lossless last step: tools/art/images.py)

ROOT = Path(__file__).resolve().parents[2]
MASTERS = ROOT / "tools/art/masters/tracks"
OUT = ROOT / "public/art/tracks"
ITEMS = ROOT / "tools/art/items"
TRACKS = ["track-sunny-day", "track-winter-dusk", "track-paris-cafe", "track-japanese-garden",
          "track-buenos-aires-tango", "track-celtic-folk"]
SOLD = {"track-paris-cafe", "track-japanese-garden", "track-buenos-aires-tango", "track-celtic-folk"}  # Server's shop items
COVER = 256


def ingest(raw):
    MASTERS.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    for t in TRACKS:
        src = Path(raw) / f"{t}-cover.png"
        if not src.exists():
            continue
        im = Image.open(src).convert("RGB")
        side = min(im.size)
        im = im.crop(((im.width - side) // 2, (im.height - side) // 2, (im.width + side) // 2, (im.height + side) // 2))
        im.save(MASTERS / f"{t}-cover.webp", "WEBP", quality=90, method=6)
        out = OUT / f"{t}-cover.webp"
        im.resize((COVER, COVER), Image.LANCZOS).save(out, "WEBP", quality=80, method=6)
        squeeze(out)
        line = f"{out.relative_to(ROOT)} {out.stat().st_size // 1024} KB"
        if t in SOLD:
            icon = ITEMS / f"{t}.png"
            im.resize((512, 512), Image.LANCZOS).save(icon, optimize=True)
            squeeze(icon)
            line += f", {icon.relative_to(ROOT)} {icon.stat().st_size // 1024} KB"
        print(line)


if __name__ == "__main__":
    {"ingest": ingest}[sys.argv[1]](sys.argv[2])
