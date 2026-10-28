"""The store tile's hover loop, step 2: cut a take (record.mjs) into 1280x720 frames at 30 fps.

    python tools/art/preview/cut.py <take-dir> <frames-out> <dest id> <start move> <length s> <banner in s> <banner out s>

The loop (lead, 2026-10-27, for the travel game): a board played on its own winning line, a
few moves that finish its destination's picture, the postcard unfolding over the whole board
with the place's name on its banner, and the postcard going again. Times are seconds after
<start move>'s drag begins; the last half second dissolves into the frames before the start, so
the end flows into the start. Pick them from a contact sheet of the take.

The whole board sits in the middle over the store's PC/TV side art (the sunny suitcase,
tools/art/store.py), with a slow push-in and back out (the tile's checks want motion in every
frame). The last cut (2026-10-28): record.mjs <scratch> 62 44 810 1440, then
cut.py <scratch>/take-62 <frames> dest-mont-saint-michel 23 6.8 3.0 4.9. The bench (src/board/try.html) has no screens, so the name banner is drawn
here as the game draws it (src/ui/style.css .dest-banner: flat frosted glass, Fredoka, the
name over its place), at the top of the board, for the time the postcard is open.

Then encode at below-normal priority (ffmpeg with libx264: a system ffmpeg, or
`npm i ffmpeg-static` in a scratch folder, never in the game):
    ffmpeg -framerate 30 -i <frames-out>/%04d.png -c:v libx264 -profile:v high -preset slow
           -crf 18 -pix_fmt yuv420p -movflags +faststart -an .gemarcade/video/preview.mp4
and check it as the gemctl store-page skill says (freezedetect, mpdecimate, frames).
"""
import bisect
import ctypes
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

if sys.platform == "win32":  # AGENTS.md: the machine is shared, encode at below-normal priority
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)

ROOT = Path(__file__).resolve().parents[3]
take, out_dir, dest, m_start = sys.argv[1], Path(sys.argv[2]), sys.argv[3], int(sys.argv[4])
L, b_in, b_out = float(sys.argv[5]), float(sys.argv[6]), float(sys.argv[7])
d = json.loads(Path(take, "take.json").read_text())
frames = d["frames"]
ts = [f["t"] for f in frames]
at = {e["what"].split()[1]: e["at"] for e in d["events"] if e["what"].startswith("move ")}
S = at[str(m_start)]
FPS, XF = 30, 0.5
n_body = round(L * FPS)
W, H = 1280, 720
bg = Image.open(ROOT / ".gemarcade/borders/suitcase-sky.jpg").convert("RGB")  # 16:9, drawn at W x H per frame
FW, FH = d["size"]
cells = d["cells"]
ys = sorted({round(c["y"]) for c in cells})
pitch = ys[1] - ys[0]
y0, y1 = round(ys[0] - 0.62 * pitch), round(ys[-1] + 0.62 * pitch)  # the whole board, top row to bottom
cw = round(FW * H / (y1 - y0))
x = (W - cw) // 2
feather = Image.new("L", (cw, H), 255)
fw = 60
for i in range(fw):
    v = round(255 * (i / fw) ** 1.5)
    for xx in (i, cw - 1 - i):
        feather.paste(v, (xx, 0, xx + 1, H))

# The name banner, as the game draws it.
cat = json.loads((ROOT / "src/content/pictures.json").read_text(encoding="utf-8"))
place = next(p for p in cat["destinations"] if p["id"] == dest)
font = ROOT / "public/fonts/fredoka-latin.woff2"
SC = cw / 430  # the game's CSS px at this board width (a phone's board is about 430 px across)
fn, fp = ImageFont.truetype(str(font), round(26 * SC)), ImageFont.truetype(str(font), round(14 * SC))
fn.set_variation_by_axes([600]) if hasattr(fn, "set_variation_by_axes") else None
nb, pb = fn.getbbox(place["name"]), fp.getbbox(place["place"])
bw = max(nb[2] - nb[0], pb[2] - pb[0]) + round(36 * SC)
bh = round((7 + 6 + 2) * SC) + (nb[3] - nb[1]) + (pb[3] - pb[1]) + round(8 * SC)
banner = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
m = Image.new("L", (bw * 3, bh * 3), 0)
ImageDraw.Draw(m).rounded_rectangle([0, 0, bw * 3 - 1, bh * 3 - 1], radius=20 * SC * 3, fill=255)
m = m.resize((bw, bh), Image.LANCZOS)
banner.paste(Image.new("RGBA", (bw, bh), (232, 240, 248, 209)), (0, 0), m)
edge = ImageDraw.Draw(banner)
edge.rounded_rectangle([0, 0, bw - 1, bh - 1], radius=20 * SC, outline=(255, 255, 255, 190), width=max(1, round(1.5 * SC)))
ty = round(7 * SC) - nb[1]
edge.text(((bw - (nb[2] - nb[0])) / 2 - nb[0], ty), place["name"], font=fn, fill=(52, 67, 90, 255))
ty2 = ty + nb[3] + round(4 * SC) - pb[1]
edge.text(((bw - (pb[2] - pb[0])) / 2 - pb[0], ty2), place["place"], font=fp, fill=(85, 101, 124, 255))
BY = round(14 * SC)  # the banner's top, inside the board's top edge


def with_banner(o, t):
    """The banner arrives with a little overshoot (dest-in, 0.5 s) and fades out (0.26 s)."""
    if not (b_in <= t <= b_out):
        return o
    u = min(1.0, (t - b_in) / 0.5)
    s = 0.9 + 0.1 * (1 - (1 - u) ** 3) + 0.04 * math.sin(math.pi * u) * (1 - u)
    a = min(1.0, u * 2.5) * min(1.0, max(0.0, (b_out - t) / 0.26))
    im = banner.resize((round(bw * s), round(bh * s)), Image.LANCZOS)
    im.putalpha(im.getchannel("A").point(lambda v: round(v * a)))
    base = o.convert("RGBA")
    base.alpha_composite(im, (round(W / 2 - im.width / 2), BY + round((bh - im.height) / 2)))
    return base.convert("RGB")


ZOOM = 0.02  # a slow push-in and back out over the loop (periodic, so no seam)
BG_ZOOM = 0.03  # the side art drifts in and out too, so every frame moves (no snow on the sunny set)


def frame_at(t, k=0):
    i = max(0, bisect.bisect_right(ts, t) - 1)
    z = 1 + ZOOM * (1 - math.cos(2 * math.pi * (k % n_body) / n_body)) / 2
    bw_, bh_ = FW / z, (y1 - y0) / z
    cx, cy = FW / 2, (y0 + y1) / 2
    im = Image.open(Path(take, frames[i]["f"])).convert("RGB").resize(
        (cw, H), Image.LANCZOS, box=(cx - bw_ / 2, cy - bh_ / 2, cx + bw_ / 2, cy + bh_ / 2))
    zb = 1 + BG_ZOOM * (1 - math.cos(2 * math.pi * (k % n_body) / n_body)) / 2
    bx, by = bg.width / 2, bg.height / 2
    o = bg.resize((W, H), Image.LANCZOS, box=(bx - bx / zb, by - by / zb, bx + bx / zb, by + by / zb))
    o.paste(im, (x, 0), feather)
    return with_banner(o, t - S), i


out_dir.mkdir(parents=True, exist_ok=True)
for p in out_dir.glob("*.png"):
    p.unlink()
used = []
nx = round(XF * FPS)
for k in range(n_body):
    t = S + k / FPS
    o, i = frame_at(t, k)
    if k >= n_body - nx:  # dissolve into the frames before the start, so the end flows into the start
        a = (k - (n_body - nx) + 1) / (nx + 1)
        h, _ = frame_at(S + (k - n_body) / FPS, k)
        o = Image.blend(o, h, a)
    o.save(out_dir / f"{k:04d}.png")
    used.append(i)
print(f"start {S - ts[0]:.2f}s, loop {L:.2f}s, {n_body} frames, {len(set(used))} distinct source frames")
