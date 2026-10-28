"""The shipped images: what they weigh, and the lossless squeeze every art script ends with.

    python tools/art/images.py audit [--files]    every group: count, size, pixels, encoding, metadata
    python tools/art/images.py squeeze [<path>...] the safe wins, in place (default: public/ and .gemarcade/)

`squeeze` changes no pixel. It strips metadata (EXIF, XMP and colour profiles: the generator's
images are sRGB, which is what a browser assumes without one) by rewriting the file's container,
re-encodes LOSSLESS files (lossless WebP, PNG) at the encoder's highest effort and keeps the result
only when it is smaller and decodes to the same pixels, and leaves a lossy file's image data alone
(a lossy file re-encoded loses quality, whatever the setting). The art scripts call `squeeze(path)`
on each file they write (tools/art/pictures.py, so every picture, postcard, Souvenir picture and
suitcase item, and tables.py's particle strips), and tools/art/check-copies.mjs fails the build when
any image under public/art or public/pictures carries metadata, however it was made.

Audit, 2026-10-28: no image carried metadata and every script already encoded at its highest
effort (WebP method 6, PNG optimize), so the squeeze found nothing; the particle strips moved from
PNG to lossless WebP (the same pixels, 46 KB -> 34 KB). The groups are group() below.
"""
import io
import struct
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
STORE = ROOT / ".gemarcade"
IMAGE = {".webp", ".png", ".jpg", ".jpeg", ".avif", ".svg"}
LIBRARY = {"animals", "architecture", "flowers", "food", "landscapes", "people", "travel"}


def group(rel):
    """The audit's group for a path relative to the project."""
    p = rel.parts
    name = rel.stem
    if p[0] == ".gemarcade":
        return "store set"
    if p[:2] == ("public", "pictures"):
        album = p[2]
        if album in LIBRARY:
            return "pictures: board copy" if name.endswith("-board") else "pictures: full"
        if album == "destinations":
            return "postcards: " + ("board copy" if name.endswith("-board") else "passport thumb" if name.endswith("-thumb") else "full")
        if album == "items":
            return "suitcase items: " + ("board copy" if name.endswith("-board") else "cut-out" if name.endswith("-cutout") else "full")
        if album == "souvenirs":
            if name.endswith("-sticker"):
                return "stickers"
            return "Souvenir pictures: " + ("board copy" if name.endswith("-board") else "full")
        return "pictures: other"
    if p[:3] == ("public", "art", "tables") or name in ("table", "stack-back", "home-desk", "snow"):
        return "tables and card backs"
    if p[:3] == ("public", "art", "stamps"):
        return "UI art: stamps"
    if p[:3] == ("public", "art", "ui"):
        return "UI art: icons (SVG)"
    return "UI art"


def chunks(data):
    """A WebP's RIFF chunks, as (fourcc, offset, size)."""
    out, at = [], 12
    while at + 8 <= len(data):
        cc, n = data[at:at + 4].decode("latin-1"), struct.unpack("<I", data[at + 4:at + 8])[0]
        out.append((cc, at, n))
        at += 8 + n + (n & 1)
    return out


def describe(path):
    """(width, height, encoding, metadata names) for one image."""
    data = path.read_bytes()
    ext = path.suffix.lower()
    if ext == ".svg":
        return None, None, "SVG", []
    meta = []
    if ext == ".webp":
        cs = chunks(data)
        kinds = {c for c, _, _ in cs}
        enc = "WebP lossless" if "VP8L" in kinds else "WebP lossy" + (" + alpha" if "ALPH" in kinds else "")
        meta = [c.strip() for c in ("EXIF", "XMP ", "ICCP") if c in kinds]
    elif ext == ".png":
        enc = "PNG"
        at = 8
        while at + 8 <= len(data):
            n, cc = struct.unpack(">I", data[at:at + 4])[0], data[at + 4:at + 8].decode("latin-1")
            if cc in ("tEXt", "iTXt", "zTXt", "eXIf", "iCCP", "tIME"):
                meta.append(cc)
            at += 12 + n
    elif ext in (".jpg", ".jpeg"):
        enc = "JPEG"
        at = 2
        while at + 4 <= len(data) and data[at] == 0xFF:
            m = data[at + 1]
            if m == 0xDA:
                break
            n = struct.unpack(">H", data[at + 2:at + 4])[0]
            if 0xE1 <= m <= 0xEF or m == 0xFE:
                meta.append("APP%d" % (m - 0xE0) if m != 0xFE else "COM")
            at += 2 + n
    else:
        enc = ext[1:].upper()
    with Image.open(path) as im:
        w, h = im.size
        if ext == ".png":
            enc += f" {im.mode}"
    return w, h, enc, sorted(set(meta))


def files(paths=None):
    if paths:
        for p in paths:
            p = Path(p).resolve()
            yield from (sorted(f for f in p.rglob("*") if f.suffix.lower() in IMAGE) if p.is_dir() else [p])
        return
    for top in (PUBLIC, STORE):
        yield from sorted(f for f in top.rglob("*") if f.suffix.lower() in IMAGE)


def cmd_audit(show_files=False):
    rows = {}
    for f in files():
        rel = f.relative_to(ROOT)
        w, h, enc, meta = describe(f)
        g = rows.setdefault(group(rel), {"n": 0, "bytes": 0, "enc": {}, "meta": 0, "px": set(), "mp": 0})
        g["n"] += 1
        g["bytes"] += f.stat().st_size
        g["enc"][enc] = g["enc"].get(enc, 0) + 1
        g["meta"] += bool(meta)
        if w:
            g["px"].add((w, h))
            g["mp"] = max(g["mp"], w * h)
        if show_files:
            print(f"{rel.as_posix():70} {f.stat().st_size // 1024:6} KB  {w}x{h}  {enc}  {' '.join(meta)}")
    print(f"{'group':34} {'files':>6} {'total MB':>9} {'avg KB':>7}  pixels                     encoding; files with metadata")
    total = 0
    for name in sorted(rows):
        g = rows[name]
        total += g["bytes"]
        px = sorted(g["px"], key=lambda s: s[0] * s[1])
        span = "" if not px else f"{px[0][0]}x{px[0][1]}" + ("" if len(px) == 1 else f" .. {px[-1][0]}x{px[-1][1]}")
        enc = ", ".join(f"{k} {v}" for k, v in sorted(g["enc"].items(), key=lambda kv: -kv[1]))
        print(f"{name:34} {g['n']:6} {g['bytes'] / 1048576:9.1f} {g['bytes'] / g['n'] / 1024:7.0f}  {span:26} {enc}; {g['meta']}")
    print(f"{'all':34} {sum(g['n'] for g in rows.values()):6} {total / 1048576:9.1f}")


# --- the squeeze -------------------------------------------------------------------------------

def strip_webp(data):
    """The same WebP without EXIF, XMP or ICCP chunks, its image chunks byte for byte. A file left
    with nothing the extended header is needed for (no alpha, no animation) gets the simple form."""
    cs = chunks(data)
    keep = [(c, o, n) for c, o, n in cs if c not in ("EXIF", "XMP ", "ICCP")]
    if len(keep) == len(cs):
        return data
    body = b""
    for c, o, n in keep:
        piece = bytearray(data[o:o + 8 + n + (n & 1)])
        if c == "VP8X":
            piece[8] &= ~(0x20 | 0x08 | 0x04)  # flags: no ICC, EXIF or XMP
            if not piece[8] & 0x12:  # no alpha or animation: the extended header is not needed
                continue
        body += bytes(piece)
    return b"RIFF" + struct.pack("<I", 4 + len(body)) + b"WEBP" + body


def same_pixels(a, b):
    with Image.open(io.BytesIO(a)) as x, Image.open(io.BytesIO(b)) as y:
        if x.size != y.size:
            return False
        mode = "RGBA" if "A" in x.getbands() or "A" in y.getbands() or x.info.get("transparency") is not None else "RGB"
        return x.convert(mode).tobytes() == y.convert(mode).tobytes()


def squeezed(path):
    """The smallest pixel-identical encoding of one file in its own format, or None."""
    data = path.read_bytes()
    ext = path.suffix.lower()
    best = data
    if ext == ".webp":
        best = strip_webp(data)
        if best is not data and not same_pixels(data, best):
            best = data
        if "VP8L" in {c for c, _, _ in chunks(best)}:
            with Image.open(path) as im:
                im.load()
                out = io.BytesIO()
                # exact: keep the colour under fully transparent pixels, so nothing changes at all
                im.save(out, "WEBP", lossless=True, quality=100, method=6, exact=True)
            if len(out.getvalue()) < len(best) and same_pixels(data, out.getvalue()):
                best = out.getvalue()
    elif ext == ".png":
        with Image.open(path) as im:
            im.load()
            out = io.BytesIO()
            keep = {k: im.info[k] for k in ("transparency",) if k in im.info}
            im.save(out, "PNG", optimize=True, **keep)
        if len(out.getvalue()) < len(best) and same_pixels(data, out.getvalue()):
            best = out.getvalue()
    elif ext in (".jpg", ".jpeg"):
        best = strip_jpeg(data)
    return best if len(best) < len(data) else None


def strip_jpeg(data):
    """The same JPEG without APP1..APP15 (EXIF, XMP, ICC) or comment segments; scan data untouched."""
    out, at = bytearray(data[:2]), 2
    while at + 4 <= len(data) and data[at] == 0xFF:
        m = data[at + 1]
        if m == 0xDA:
            break
        n = struct.unpack(">H", data[at + 2:at + 4])[0]
        if not (0xE1 <= m <= 0xEF or m == 0xFE):
            out += data[at:at + 2 + n]
        at += 2 + n
    return bytes(out + data[at:])


def squeeze(path):
    """The pipeline's last step for one written file: the safe wins, in place. Returns bytes saved."""
    path = Path(path)
    if path.suffix.lower() not in IMAGE - {".svg", ".avif"}:
        return 0
    better = squeezed(path)
    if better is None:
        return 0
    saved = path.stat().st_size - len(better)
    path.write_bytes(better)
    return saved


def cmd_squeeze(paths):
    total = n = 0
    for f in files(paths):
        s = squeeze(f)
        if s:
            n += 1
            total += s
            print(f"{f.relative_to(ROOT).as_posix():70} -{s / 1024:.1f} KB")
    print(f"{n} files, {total / 1048576:.2f} MB saved")


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    if args[0] == "audit":
        cmd_audit("--files" in args)
    elif args[0] == "squeeze":
        cmd_squeeze(args[1:])
    else:
        sys.exit(__doc__)
