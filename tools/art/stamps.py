"""Passport stamps, one per trip: a generated rubber-stamp impression, squared and sized.

    python tools/art/stamps.py <raw.png> <trip-number>     e.g. stamps.py raw/stamp-t1.png 1

The raw image is a transparent PNG from the generator (prompts in tools/art/prompts.txt).
It is cropped to the stamp, centred on a square with a little air, kept as a master in
tools/art/masters/chrome/stamp-t<n>.webp, and shipped as public/art/stamps/stamp-t<n>.webp
at SIZE px: UI draws it about 92 CSS px across, tilted, so 300 px is sharp at 3x. Each
trip's stamp has its own ink colour and a pictogram of the trip, and no text (it is never
translated).
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MASTERS = ROOT / "tools/art/masters/chrome"
OUT = ROOT / "public/art/stamps"
SIZE = 300
PAD = 0.02


def main(raw, n):
    im = Image.open(raw).convert("RGBA")
    box = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop(box)
    side = round(max(im.size) * (1 + 2 * PAD))
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.alpha_composite(im, ((side - im.width) // 2, (side - im.height) // 2))
    # Clear the colour under fully transparent pixels so it cannot bleed when scaled.
    sq = Image.composite(sq, Image.new("RGBA", sq.size, (0, 0, 0, 0)), sq.getchannel("A").point(lambda v: 255 if v else 0))
    MASTERS.mkdir(parents=True, exist_ok=True)
    sq.save(MASTERS / f"stamp-t{n}.webp", "WEBP", quality=92, method=6)
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f"stamp-t{n}.webp"
    sq.resize((SIZE, SIZE), Image.LANCZOS).save(out, "WEBP", quality=70, alpha_quality=70, method=6)  # flat ink: q70 halves it, unseen at 92 px
    print(out.relative_to(ROOT), f"{SIZE}x{SIZE}", f"{out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
