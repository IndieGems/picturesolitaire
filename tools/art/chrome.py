"""Table and chrome exports: generated sources -> shipped files in public/art/.

    python tools/art/chrome.py <source-dir>

Sources are gemforge generations made from design/concepts/game-l.png (prompts in
tools/art/prompts.txt); full-size copies are kept in tools/art/masters/chrome/.
  table.png       -> public/art/table.webp        1080x1920, the empty winter-dusk table
  stack-back.png  -> public/art/stack-back.webp   256x256, one stack card back (alpha)
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

    back = Image.open(src / "stack-back.png").convert("RGBA")
    back.save(MASTERS / "stack-back.webp", "WEBP", quality=90, method=6, exact=False)
    box = back.getchannel("A").point(lambda v: 255 if v > 200 else 0).getbbox()
    back = back.crop(box).resize((256, 256), Image.LANCZOS)
    out = ART / "stack-back.webp"
    back.save(out, "WEBP", quality=85, method=6)
    print(out.relative_to(ROOT), out.stat().st_size // 1024, "KB", "cropped from", box)


if __name__ == "__main__":
    main(sys.argv[1])
