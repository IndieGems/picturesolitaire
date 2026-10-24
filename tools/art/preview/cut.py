"""The store tile's hover loop, step 2: cut a take (record.mjs) into 1280x720 frames at 30 fps.

    python tools/art/preview/cut.py <take-dir> <frames-out> <move a> <move b> [lead-in s]

Moves a and b are two moves of the line that make the same drag (board 4: 10 and 12, both
4->17): the loop runs from just after move a to just after move b, so the end flows into
the start, and its last half second dissolves into the frames before the start. The board's
rows 1 to 4 sit in the middle over the wide winter table (the PC/TV side art), with the
game's own snow drifting at the edges and a slow push-in and back out (the tile's checks
want motion in every frame; the finished picture's glow holds still for a second).

Then encode (ffmpeg with libx264: a system ffmpeg, or `npm i ffmpeg-static` in a scratch
folder, never in the game):
    ffmpeg -framerate 30 -i <frames-out>/%04d.png -c:v libx264 -profile:v high -preset slow
           -crf 18 -pix_fmt yuv420p -movflags +faststart -an .gemarcade/video/preview.mp4
and check it as the gemctl store-page skill says (freezedetect, mpdecimate, frames).
"""
import json, sys, bisect
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[3]
take, out_dir, m_start, m_again = sys.argv[1], Path(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
d = json.loads(Path(take, "take.json").read_text())
frames = d["frames"]; ts = [f["t"] for f in frames]
at = {e["what"].split()[1]: e["at"] for e in d["events"] if e["what"].startswith("move ")}
S = at[str(m_start)] + float(sys.argv[5] if len(sys.argv) > 5 else 0.15)
L = at[str(m_again)] - at[str(m_start)]
FPS, XF = 30, 0.5
n_body = round(L * FPS)
W, H = 1280, 720
bg = Image.open(ROOT / ".gemarcade/borders/winter-table.jpg").convert("RGB").resize((W, H), Image.LANCZOS)
FW, FH = d["size"]
cells = d["cells"]; ys = sorted({round(c["y"]) for c in cells}); pitch = ys[1] - ys[0]
y0, y1 = round(ys[1] - 0.62 * pitch), round(ys[4] + 0.62 * pitch)   # the board's rows 1 to 4
cw = round(FW * H / (y1 - y0)); x = (W - cw) // 2
feather = Image.new("L", (cw, H), 255)
fw = 70
for i in range(fw):
    v = round(255 * (i / fw) ** 1.5)
    for xx in (i, cw - 1 - i):
        feather.paste(v, (xx, 0, xx + 1, H))
# The game's own snow (public/art/snow.png), drifting at the edges as the real screen does;
# every flake's path repeats once per loop, so the loop has no seam.
import math, random
random.seed(7)
strip = Image.open(ROOT / "public/art/snow.png").convert("RGBA")
FL = [strip.crop((i * 32, 0, i * 32 + 32, 32)) for i in range(4)]
flakes = []
for i in range(46):
    side = i % 2
    fx = random.uniform(8, x - 24) if side == 0 else random.uniform(x + cw + 4, W - 20)
    kind = random.choices([0, 1, 2, 3], [6, 2, 3, 1])[0]
    size = {0: random.uniform(9, 15), 1: random.uniform(22, 30), 2: random.uniform(10, 16), 3: random.uniform(14, 20)}[kind]
    flakes.append(dict(x=fx, y=random.uniform(-40, H), fall=random.uniform(70, 140), sway=random.uniform(4, 10),
                       ph=random.random(), sw=random.random(), a=random.uniform(0.45, 0.9) * (0.5 if kind == 1 else 1),
                       img=FL[kind].resize((round(size), round(size)), Image.LANCZOS), rot=random.uniform(-40, 40) if kind == 3 else 0))
def snow(o, k):
    for f in flakes:
        u = (k / n_body + f["ph"]) % 1.0
        env = math.sin(math.pi * u)            # fades in and out over its life
        fy = f["y"] + f["fall"] * u
        fx = f["x"] + f["sway"] * math.sin(2 * math.pi * (k / n_body + f["sw"]))
        im = f["img"].rotate(f["rot"] * u, resample=Image.BICUBIC) if f["rot"] else f["img"]
        a = im.getchannel("A").point(lambda v, m=f["a"] * env: round(v * m))
        o.paste(im.convert("RGB"), (round(fx), round(fy)), a)
    return o
ZOOM = 0.02  # a slow push-in and back out over the loop (periodic, so no seam)
def frame_at(t, k=0):
    i = max(0, bisect.bisect_right(ts, t) - 1)
    z = 1 + ZOOM * (1 - math.cos(2 * math.pi * (k % n_body) / n_body)) / 2
    bw, bh = FW / z, (y1 - y0) / z
    cx, cy = FW / 2, (y0 + y1) / 2
    im = Image.open(Path(take, frames[i]["f"])).convert("RGB").resize(
        (cw, H), Image.LANCZOS, box=(cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2))
    o = bg.copy(); o.paste(im, (x, 0), feather); return o, i
out_dir.mkdir(parents=True, exist_ok=True)
for p in out_dir.glob("*.png"): p.unlink()
src_used = []
nx = round(XF * FPS)
for k in range(n_body):
    t = S + k / FPS
    o, i = frame_at(t, k)
    if k >= n_body - nx:   # dissolve into the opening frames, so the end flows into the start
        a = (k - (n_body - nx) + 1) / (nx + 1)
        h, _ = frame_at(S + (k - n_body) / FPS, k)   # the frames just before the start: same motion
        o = Image.blend(o, h, a)
    snow(o, k)
    o.save(out_dir / f"{k:04d}.png"); src_used.append(i)
print(f"start {S - ts[0]:.2f}s, loop {L:.2f}s, {n_body} frames, {len(set(src_used))} distinct source frames")
