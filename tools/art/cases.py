"""A mystery case's own art beside its clue pictures (the clues are destinations entries in the
picture plan, "case": <id>, made by pictures.py; their clock hands are painted on there).

    python tools/art/cases.py cover <raw.png> <case id>

The cover is the case's card art: generated at 3:4 (prompt in tools/art/prompts.txt), kept as a
master in tools/art/masters/chrome/<case>-cover.webp and shipped as public/art/cases/<case>-cover.webp
at COVER px (sharp at 3x on a card up to 300 CSS px wide). The case-closed stamp is stamps.py's.
"""
import sys
from pathlib import Path

from PIL import Image

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from pictures import crop_to  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
MASTERS = ROOT / "tools/art/masters/chrome"
OUT = ROOT / "public/art/cases"
COVER = (900, 1200)
BUDGET = 140 * 1024


def cover(raw, case):
    im = crop_to(Image.open(raw).convert("RGB"), 3, 4)
    MASTERS.mkdir(parents=True, exist_ok=True)
    im.save(MASTERS / f"{case}-cover.webp", "WEBP", quality=90, method=6)
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f"{case}-cover.webp"
    small = im.resize(COVER, Image.LANCZOS)
    for q in range(80, 55, -4):
        small.save(out, "WEBP", quality=q, method=6)
        if out.stat().st_size <= BUDGET:
            break
    print(out.relative_to(ROOT), COVER, f"{out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    if len(sys.argv) < 4 or sys.argv[1] != "cover":
        sys.exit(__doc__)
    cover(sys.argv[2], sys.argv[3])
