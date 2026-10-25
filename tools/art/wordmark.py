"""The home screen's title, "Picture Passport" (creator, 2026-10-25; it was "Picture Mend"): a
generated wordmark, cropped and sized for phones.

    python tools/art/wordmark.py <raw.png> [<alt-raw.png>]

The raw image is a transparent PNG from the generator (prompt in tools/art/prompts.txt); "Picture Passport" was an edit of the
"Picture Mend" master, so the letters, frost and lip stay the same.
It is cropped to its letters with a little air, kept as a master in
tools/art/masters/chrome/, and shipped as public/art/wordmark.webp at WIDTH px wide (the
title shows about 300-340 CSS px wide on a phone, so this is sharp at 2.5x) and as
wordmark-1400.webp for big tablets. The master is 1529 px wide: nothing larger without
generating again. An optional
second raw is kept as the alternative master only (not shipped).
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MASTERS = ROOT / "tools/art/masters/chrome"
OUT = ROOT / "public/art/wordmark.webp"
WIDTH = 840
LARGE = 1400  # public/art/wordmark-1400.webp, for big tablets (srcset); phones keep the 840
PAD = 0.012  # air around the letters, as a fraction of the cropped width


def crop(path):
    im = Image.open(path).convert("RGBA")
    box = im.getchannel("A").point(lambda v: 255 if v > 3 else 0).getbbox()
    pad = round((box[2] - box[0]) * PAD)
    box = (max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad))
    im = im.crop(box)
    # Clear the colour under fully transparent pixels so it cannot bleed when scaled.
    clear = Image.new("RGBA", im.size, (0, 0, 0, 0))
    return Image.composite(im, clear, im.getchannel("A").point(lambda v: 255 if v else 0))


def main(raw, alt=None):
    MASTERS.mkdir(parents=True, exist_ok=True)
    im = crop(raw)
    im.save(MASTERS / "wordmark.webp", "WEBP", quality=92, method=6)
    small = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
    small.save(OUT, "WEBP", quality=80, alpha_quality=80, method=6)
    print(OUT.relative_to(ROOT), small.size, f"{OUT.stat().st_size // 1024} KB")
    big = im.resize((LARGE, round(im.height * LARGE / im.width)), Image.LANCZOS)
    big_out = OUT.with_name(f"wordmark-{LARGE}.webp")
    big.save(big_out, "WEBP", quality=74, alpha_quality=70, method=6)
    print(big_out.relative_to(ROOT), big.size, f"{big_out.stat().st_size // 1024} KB")
    if alt:
        crop(alt).save(MASTERS / "wordmark-alt.webp", "WEBP", quality=90, method=6)
        print("alternative master:", (MASTERS / "wordmark-alt.webp").relative_to(ROOT))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(*sys.argv[1:3])
