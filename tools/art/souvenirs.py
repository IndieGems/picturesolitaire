"""Souvenir boards' art (docs/souvenirs.md, approved by the creator 2026-10-28): each trip's 12 long
pictures, its table and card back, and its passport sticker. The plan is tools/art/souvenirs-plan.json.

    python tools/art/souvenirs.py prompt <id>                    the full prompt and size
    python tools/art/souvenirs.py museum <raw-dir> <t2|id>...    museum works: check open access, download, credit
    python tools/art/souvenirs.py gen <raw-dir> <target>...      generate (gemforge, BILLS): t1 (its pictures), an id,
                                                                 table:t1, back:t1 (needs the table's raw), sticker:t1
    python tools/art/souvenirs.py process <raw-dir> <target>...  raw -> masters + public (same targets; museum ids too)
    python tools/art/souvenirs.py sheet <out.png> <trip>         contact sheet, each picture cut into its two cards
    python tools/art/souvenirs.py credits                        docs/credits.md from the plan's museum works

Then `python tools/art/tables.py build` for the tables and `python tools/art/pictures.py catalogue` for the
catalogue's souvenirPictures and souvenirs.

Pictures are long (tall 1x2, wide 2x1), shipped at 384x1024 and 768x512 (generated just over the
backend's minimum, 528x1408 and 1056x704). A generated one
sits on its own bold colour (`bg`, one of `colours`, never two alike in a Souvenir: the one place pictures
are colour-coded, so the cards of one style can be told apart). A museum work (Japan's prints, France's
paintings) is itself: downloaded only from the museum's own open-access service, kept only if the museum
marks it public domain (CC0), cropped to its card shape (cropX/cropY, 0..1), and credited in the plan,
the catalogue (`credit`) and docs/credits.md. Masters keep the pixels (tools/art/masters/<id>.webp,
tables under masters/tables/) so nothing is paid for twice.
"""
import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import pictures as P  # noqa: E402  (the library's export: full picture + board copy)

ROOT = Path(__file__).resolve().parents[2]
PLAN = ROOT / "tools/art/souvenirs-plan.json"
TABLE_MASTERS = ROOT / "tools/art/masters/tables"
STICKERS = ROOT / "public/pictures/souvenirs"
SHIP = {(1, 2): (384, 1024), (2, 1): (768, 512)}
# Generated a little over the ship size: the backend takes 655,360 pixels at least (2026-10-28).
GEN = {(1, 2): (528, 1408), (2, 1): (1056, 704)}
SHAPE = {(1, 2): "Composition: a very tall narrow vertical picture, 3:8.", (2, 1): "Composition: a landscape picture, 3:2."}
STICKER_PX = 320  # the passport page's sticker, ~100 CSS px at 3x
UA = {"User-Agent": "Mozilla/5.0 (picture-passport art pipeline)"}
LICENCE = {"aic": "CC0 Public Domain Designation (Art Institute of Chicago open access)",
           "met": "CC0 (The Metropolitan Museum of Art Open Access)",
           "nga": "CC0 (National Gallery of Art, Washington, Open Access)"}
MUSEUM = {"aic": "Art Institute of Chicago", "met": "The Metropolitan Museum of Art", "nga": "National Gallery of Art, Washington"}


def plan():
    return json.loads(PLAN.read_text(encoding="utf-8"))


def save(p):
    PLAN.write_text(json.dumps(p, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


def souvenir(p, trip):
    return next(s for s in p["souvenirs"] if s["trip"] == trip)


def entry(p, pid):
    e = next((x for x in p["pictures"] if x["id"] == pid), None)
    if e is None:
        sys.exit(f"no Souvenir picture {pid!r}")
    return e | {"album": "souvenirs"}


def picture_prompt(p, e):
    st = p["styles"][e["trip"]]
    on = st["on"].format(word=e["bg"], hex=p["colours"][e["bg"]])
    return f"{st['prefix']} {e['prompt']}, {on}. {SHAPE[(e['cols'], e['rows'])]} {p['suffix']}"


def job(p, target):
    """(name, prompt, size, extra args) for one generation target."""
    if target.startswith("table:"):
        s = souvenir(p, target[6:])
        prompt = f"{p['tableLook']} {s['tablePrompt']} {p['tableEnd']}"
        return s["table"], prompt, "1152x2048", ["--from", "design/concepts/game-l.png", "--from", "public/art/table.webp"]
    if target.startswith("back:"):
        s = souvenir(p, target[5:])
        return f"{s['table']}-back", s["backPrompt"], "768x1024", ["--from", str(TABLE_MASTERS / "autumn-study-back.webp"), "--background", "transparent"]
    if target.startswith("sticker:"):
        s = souvenir(p, target[8:])
        return f"sv-{s['trip']}-sticker", s["stickerPrompt"], "1024x1024", ["--background", "transparent", "--quality", "medium"]
    e = entry(p, target)
    w, h = GEN[(e["cols"], e["rows"])]
    return e["id"], picture_prompt(p, e), f"{w}x{h}", []


def expand(p, targets, museum=False):
    """A trip stands for its pictures: its generated ones (to generate), or all of them (to process)."""
    out = []
    for t in targets:
        if t in {s["trip"] for s in p["souvenirs"]}:
            out += [e["id"] for e in p["pictures"] if e["trip"] == t and (museum or "museum" not in e)]
        else:
            out.append(t)
    return out


def cmd_prompt(pid):
    name, prompt, size, extra = job(plan(), pid)
    print(name, size, " ".join(extra))
    print(prompt)


def gen(raw, targets, in_flight=int(os.environ.get("IN_FLIGHT", "6"))):
    """Submit with at most `in_flight` jobs running; each job's cost goes to <raw>/log.jsonl."""
    p = plan()
    raw = Path(raw)
    raw.mkdir(parents=True, exist_ok=True)
    pending, total = [], 0

    def submit(t):
        name, prompt, size, extra = job(p, t)
        if t.startswith("back:"):  # the back matches its own table: the table's raw is the second reference
            extra = extra[:2] + ["--from", str(raw / f"{souvenir(p, t[5:])['table']}.png")] + extra[2:]
        args = ["gemforge", "generate", "image", "--prompt", prompt, "--size", size, "--out", str(raw), "--name", name,
                "--flat", "--no-wait", "--json", "--force"] + extra
        if "--quality" not in extra:
            args += ["--quality", "high"]
        while True:
            r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8")
            out = (r.stdout or "") + (r.stderr or "")
            if "too_many_generation_jobs" in out:
                time.sleep(20)
                continue
            try:
                j = json.JSONDecoder().raw_decode(r.stdout.strip())[0]
            except Exception:
                print(t, "SUBMIT FAILED", out[:300], flush=True)
                return None
            jid = j.get("submitted") or j.get("id") or j.get("job", {}).get("id") or j.get("job_id")
            if not jid:
                print(t, "REFUSED", json.dumps(j)[:300], flush=True)
            return jid

    def wait(t, jid):
        nonlocal total
        r = subprocess.run(["gemforge", "job", "wait", jid, "--json", "--force"], capture_output=True, text=True, encoding="utf-8")
        try:
            j = json.JSONDecoder().raw_decode(r.stdout.strip())[0]
        except Exception:
            print(t, "WAIT FAILED", (r.stdout + r.stderr)[:300], flush=True)
            return
        cost = (j.get("cost") or {}).get("usd_micros") or 0
        total += cost
        with (raw / "log.jsonl").open("a", encoding="utf-8") as f:
            f.write(json.dumps({"target": t, "job": jid, "file": j.get("file"), "usd_micros": cost}) + "\n")
        print(t, "ok" if j.get("file") else "NO FILE", f"${cost / 1e6:.3f}", f"total ${total / 1e6:.2f}", flush=True)

    for t in expand(p, targets):
        if len(pending) >= in_flight:
            wait(*pending.pop(0))
        jid = submit(t)
        if jid:
            pending.append((t, jid))
    while pending:
        wait(*pending.pop(0))
    print(f"DONE total ${total / 1e6:.2f}")


def get_json(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
        return json.loads(r.read().decode("utf-8"))


def download(url, dst):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        dst.write_bytes(r.read())


def museum(raw, targets):
    """Check each work is public domain at its museum, download its image from the museum's own service,
    and record its credit in the plan."""
    p = plan()
    raw = Path(raw)
    raw.mkdir(parents=True, exist_ok=True)
    trips = {s["trip"] for s in p["souvenirs"]}
    ids = [e["id"] for t in targets for e in p["pictures"] if "museum" in e and (e["trip"] == t or e["id"] == t)]
    for pid in ids:
        e = next(x for x in p["pictures"] if x["id"] == pid)
        m = e["museum"]
        src, oid = m["source"], m["id"]
        if src == "aic":
            d = get_json(f"https://api.artic.edu/api/v1/artworks/{oid}?fields=id,title,artist_title,artist_display,date_display,is_public_domain,image_id")["data"]
            ok, img = d["is_public_domain"], f"https://www.artic.edu/iiif/2/{d['image_id']}/full/!1600,1600/0/default.jpg"
            credit = {"artist": d["artist_title"], "title": d["title"], "date": d["date_display"],
                      "page": f"https://www.artic.edu/artworks/{oid}"}
        elif src == "met":
            d = get_json(f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{oid}")
            ok, img = d["isPublicDomain"], d["primaryImage"]
            credit = {"artist": d["artistDisplayName"], "title": d["title"], "date": d["objectDate"], "page": d["objectURL"]}
            time.sleep(1)  # the Met refuses bursts
        elif src == "nga":
            # The NGA's open data (github.com/NationalGalleryOfArt/opendata, published_images.csv) marks the
            # image openaccess=1; the uuid in the plan is that row's.
            ok, img = True, f"https://api.nga.gov/iiif/{m['image']}/full/!1600,1600/0/default.jpg"
            credit = {"artist": m.get("artist", ""), "title": m.get("title", e["title"]), "date": m.get("date", ""),
                      "page": f"https://www.nga.gov/artworks/{oid}"}
        else:
            sys.exit(f"{pid}: unknown museum {src}")
        if not ok:
            print(pid, "NOT PUBLIC DOMAIN at", src, "- skipped")
            continue
        dst = raw / f"{pid}.jpg"
        download(img, dst)
        with Image.open(dst) as im:
            size = im.size
        m.update({"museum": MUSEUM[src], "licence": LICENCE[src], "imageUrl": img} | {k: v for k, v in credit.items() if v})
        print(pid, src, oid, size, credit.get("artist"), "|", credit.get("title", "")[:50])
    save(p)


def crop_aspect(im, cols, rows, x=0.5, y=0.5):
    return P.crop_to(im, cols * P.CELL[0], rows * P.CELL[1], x, y)


def process(raw, targets):
    p = plan()
    raw = Path(raw)
    for t in expand(p, targets, museum=True):
        if t.startswith("table:") or t.startswith("back:"):
            s = souvenir(p, t.split(":")[1])
            name = s["table"] + ("-back" if t.startswith("back:") else "")
            im = Image.open(raw / f"{name}.png")
            TABLE_MASTERS.mkdir(parents=True, exist_ok=True)
            dst = TABLE_MASTERS / f"{name}.webp"
            if im.mode == "RGBA":
                im.save(dst, "WEBP", quality=92, alpha_quality=95, method=6)
            else:
                im.convert("RGB").save(dst, "WEBP", quality=92, method=6)
            print(t, "->", dst.relative_to(ROOT))
            continue
        if t.startswith("sticker:"):
            trip = t[8:]
            im = Image.open(raw / f"sv-{trip}-sticker.png").convert("RGBA")
            im = im.crop(im.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox())
            k = STICKER_PX / max(im.size)
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
            STICKERS.mkdir(parents=True, exist_ok=True)
            dst = STICKERS / f"sv-{trip}-sticker.webp"
            im.save(dst, "WEBP", quality=82, alpha_quality=90, method=6)
            print(t, im.size, "->", dst.relative_to(ROOT), f"{dst.stat().st_size // 1024} KB")
            continue
        e = entry(p, t)
        src = next((f for f in (raw / f"{t}.png", raw / f"{t}.jpg") if f.exists()), None)
        if src is None:
            print(t, "no raw file in", raw)
            continue
        im = Image.open(src).convert("RGB")
        trim = e.get("trim", 0)  # a scan's paper margin or frame edge, a fraction off each side (or [l, t, r, b])
        l, t_, r, b_ = trim if isinstance(trim, list) else [trim] * 4
        if any((l, t_, r, b_)):
            w, h = im.size
            im = im.crop((round(w * l), round(h * t_), round(w * (1 - r)), round(h * (1 - b_))))
        im = crop_aspect(im, e["cols"], e["rows"], e.get("cropX", 0.5), e.get("cropY", 0.5))
        k = 1536 / max(im.size)  # a museum scan's master keeps more than it ships, for a re-crop later
        if k < 1:
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        im.save(P.master_path(t), "WEBP", quality=90, method=6)
        # The master is already at the card's aspect, so export only resizes it (cropX/cropY are spent).
        out = P.export({k: v for k, v in e.items() if k not in ("cropX", "cropY")})
        print(t, im.size, "->", out.relative_to(ROOT), f"{out.stat().st_size // 1024} KB")


def sheet(out, trip):
    p = plan()
    es = [entry(p, e["id"]) for e in p["pictures"] if e["trip"] == trip and P.master_path(e["id"]).exists()]
    H, G, pad = 300, 6, 16
    tiles = []
    for e in es:
        im = Image.open(ROOT / "public" / P.board_rel(e)).convert("RGB")
        if e["rows"] == 2:  # tall: two cards stacked
            im = im.resize((round(H * 3 / 8), H))
            a, b = im.crop((0, 0, im.width, H // 2)), im.crop((0, H // 2, im.width, H))
            t = Image.new("RGB", (im.width, H + G), (30, 37, 46)); t.paste(a, (0, 0)); t.paste(b, (0, H // 2 + G))
        else:  # wide: two cards side by side
            im = im.resize((225, 150))
            w = im.width // 2
            t = Image.new("RGB", (im.width + G, im.height), (30, 37, 46)); t.paste(im.crop((0, 0, w, im.height)), (0, 0)); t.paste(im.crop((w, 0, im.width, im.height)), (w + G, 0))
        tiles.append(t)
    W = max(1200, sum(t.width + pad for t in tiles[:6]) + pad)
    rows, row, x = [], [], pad
    for t in tiles:
        if x + t.width + pad > W:
            rows.append(row); row, x = [], pad
        row.append(t); x += t.width + pad
    rows.append(row)
    Hs = [max(t.height for t in r) + pad for r in rows if r]
    canvas = Image.new("RGB", (W, sum(Hs) + pad), (30, 37, 46))
    y = pad
    for r, h in zip(rows, Hs):
        x = pad
        for t in r:
            canvas.paste(t, (x, y)); x += t.width + pad
        y += h
    canvas.save(out)
    print(out, canvas.size, len(tiles))


def credits():
    p = plan()
    rows = [e for e in p["pictures"] if "museum" in e and e["museum"].get("licence")]
    lines = ["# Credits", "", "Works of art shown in the game, with their sources and licences.", "",
             "## Souvenir paintings and prints (docs/souvenirs.md)", "",
             "Each is a public-domain work whose image the museum releases for any use (CC0). It was downloaded from the",
             "museum's own open-access service and cropped to its card shape. The catalogue's `credit` field carries the same.", "",
             "| Picture | Work | Artist | Date | Museum | Licence |", "| --- | --- | --- | --- | --- | --- |"]
    for e in rows:
        m = e["museum"]
        lines.append(f"| {e['id']} | [{m.get('title', e['title'])}]({m.get('page', '')}) | {m.get('artist', '')} | {m.get('date', '')} | {m['museum']} | {m['licence']} |")
    (ROOT / "docs/credits.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("docs/credits.md:", len(rows), "works")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    c, rest = sys.argv[1], sys.argv[2:]
    if c == "prompt":
        cmd_prompt(rest[0])
    elif c == "museum":
        museum(rest[0], rest[1:])
    elif c == "gen":
        gen(rest[0], rest[1:])
    elif c == "process":
        process(rest[0], rest[1:])
    elif c == "sheet":
        sheet(rest[0], rest[1])
    elif c == "credits":
        credits()
    else:
        sys.exit(__doc__)
