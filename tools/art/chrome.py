"""Table and chrome exports: generated sources -> shipped files in public/art/.

    python tools/art/chrome.py <source-dir>
    python tools/art/chrome.py back <stack-back.png>    the card back alone

Sources are gemforge generations made from design/concepts/game-l.png (prompts in
tools/art/prompts.txt); full-size copies are kept in tools/art/masters/chrome/.
  table.png       -> public/art/table.webp        1080x1920, the empty winter-dusk table
  stack-back.png  -> public/art/stack-back.webp   384x512, one portrait 3:4 card back (alpha)
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "public/art"
MASTERS = ROOT / "tools/art/masters/chrome"


def main(src):
    src = Path(src)
    ART.mkdir(parents=True, exist_ok=True)
    MASTERS.mkdir(parents=True, exist_ok=True)

    table = Image.open(src / "table.png").convert("RGB")
    table.save(MASTERS / "table.webp", "WEBP", quality=90, method=6)
    out = ART / "table.webp"
    table.resize((1080, 1920), Image.LANCZOS).save(out, "WEBP", quality=72, method=6)
    print(out.relative_to(ROOT), out.stat().st_size // 1024, "KB")

    stack_back(src / "stack-back.png")


BACK = (384, 512)  # a card back, w x h: cards are portrait 3:4 (creator, 2026-10-24)


def cut_back(back):
    """The card itself (alpha > 200), at exactly the card aspect, BACK px."""
    x0, y0, x1, y1 = back.getchannel("A").point(lambda v: 255 if v > 200 else 0).getbbox()
    w, h = x1 - x0, y1 - y0
    if w * BACK[1] > h * BACK[0]:  # trim the long side evenly to 3:4
        d = (w - round(h * BACK[0] / BACK[1])) // 2
        x0, x1 = x0 + d, x1 - d
    else:
        d = (h - round(w * BACK[1] / BACK[0])) // 2
        y0, y1 = y0 + d, y1 - d
    return back.crop((x0, y0, x1, y1)).resize(BACK, Image.LANCZOS)


def stack_back(png):
    back = Image.open(png).convert("RGBA")
    back.save(MASTERS / "stack-back.webp", "WEBP", quality=90, method=6, exact=False)
    out = ART / "stack-back.webp"
    cut_back(back).save(out, "WEBP", quality=72, alpha_quality=75, method=6)
    print(out.relative_to(ROOT), out.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    if sys.argv[1:2] == ["back"]:
        stack_back(sys.argv[2])
    else:
        main(sys.argv[1])
