"""Home's title, "Picture Passport": the travel-poster logo in its wide 2:1 shape (creator,
2026-10-28, who picked the travel-poster logo for the store and wanted it on home too).

    python tools/art/wordmark.py <raw.png>

The raw image is a transparent PNG from the generator: an edit of the store's stacked logo
(tools/art/masters/chrome/logo-poster.webp) into 2:1, its sun smaller (prompt in
tools/art/prompts.txt). It is cleared of the generator's faint haze, cropped to the logo with a
little air, padded to exactly 2:1 (home gives the title a 2:1 box: src/ui/wordmark.ts), kept as a
master in tools/art/masters/chrome/, and shipped as public/art/wordmark.webp (840x420, sharp to
420 CSS px on a 2x phone) and wordmark-1400.webp (1400x700, for big tablets). The master is
about 1500 px wide: nothing larger without generating again.
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
RATIO = 2.0  # width:height of home's title box
HAZE = 40  # the generator leaves a faint, blotchy glow below this alpha around the outline


def crop(path):
    im = Image.open(path).convert("RGBA")
    im.putalpha(im.getchannel("A").point(lambda v: 0 if v < HAZE else v))
    box = im.getchannel("A").point(lambda v: 255 if v > 3 else 0).getbbox()
    pad = round((box[2] - box[0]) * PAD)
    box = (max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad))
    im = im.crop(box)
    # Clear the colour under fully transparent pixels so it cannot bleed when scaled.
    clear = Image.new("RGBA", im.size, (0, 0, 0, 0))
    return Image.composite(im, clear, im.getchannel("A").point(lambda v: 255 if v else 0))


def to_ratio(im, ratio):
    """Centre the logo on a transparent canvas of exactly width:height = ratio."""
    w, h = im.size
    W, H = (w, round(w / ratio)) if w / h > ratio else (round(h * ratio), h)
    W, H = max(W, w), max(H, h)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.paste(im, ((W - w) // 2, (H - h) // 2))
    return out


def main(raw):
    MASTERS.mkdir(parents=True, exist_ok=True)
    im = to_ratio(crop(raw), RATIO)
    im.save(MASTERS / "wordmark.webp", "WEBP", lossless=True, method=6)
    print("master", im.size)
    for width, out, q in ((WIDTH, OUT, 82), (LARGE, OUT.with_name(f"wordmark-{LARGE}.webp"), 78)):
        small = im.resize((width, round(width / RATIO)), Image.LANCZOS)
        small.save(out, "WEBP", quality=q, alpha_quality=85, method=6)
        print(out.relative_to(ROOT), small.size, f"{out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])
