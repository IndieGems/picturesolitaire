"""UI glyphs for the helper and top-bar buttons, written as small SVGs.

    python tools/art/icons.py                 write public/art/ui/icon-*.svg
    python tools/art/icons.py preview <png>   also render a preview sheet (needs resvg_py on PYTHONPATH)

The look (design/concepts/game-l.png): plump and round, no sharp corner anywhere.
Every glyph is one slate colour on transparent, thick strokes with round caps and
joins, on a 48x48 grid with ~6 px of air around it. The UI member puts them on the
pale round buttons; for another colour use the SVG as a CSS mask.
"""
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/art/ui"
SLATE = "#34435a"  # the type and glyph colour of the concept's top bar and buttons
W = 5  # stroke width on the 48 grid


def svg(body, stroke=True):
    attrs = (f'fill="none" stroke="{SLATE}" stroke-width="{W}" stroke-linecap="round" stroke-linejoin="round"'
             if stroke else f'fill="{SLATE}"')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">'
            f'<g {attrs}>{body}</g></svg>\n')


def pt(cx, cy, r, deg):
    a = math.radians(deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def f(v):
    return f"{v:.2f}".rstrip("0").rstrip(".")


def arrowhead(tip, direction, length=7.5, half=6.5):
    """A filled, round-cornered arrowhead (drawn with the stroke so its corners round off)."""
    dx, dy = direction
    n = math.hypot(dx, dy)
    dx, dy = dx / n, dy / n
    bx, by = tip[0] - dx * length, tip[1] - dy * length
    px, py = -dy, dx
    a = (bx + px * half, by + py * half)
    b = (bx - px * half, by - py * half)
    return (f'<path d="M{f(tip[0])} {f(tip[1])} L{f(a[0])} {f(a[1])} L{f(b[0])} {f(b[1])} Z" '
            f'fill="{SLATE}" stroke-width="3.5"/>')


def gear():
    # A chubby 8-tooth gear: body disc + rounded teeth, with a round hole (mask).
    teeth = "".join(
        f'<rect x="20.25" y="3.5" width="7.5" height="12" rx="3.2" transform="rotate({k * 45} 24 24)"/>'
        for k in range(8))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">'
            f'<defs><mask id="g"><g fill="#fff"><circle cx="24" cy="24" r="14.5"/>{teeth}</g>'
            f'<circle cx="24" cy="24" r="5.6" fill="#000"/></mask></defs>'
            f'<rect width="48" height="48" fill="{SLATE}" mask="url(#g)"/></svg>\n')


def back():
    return svg('<path d="M37 24 H13"/><path d="M22.5 13.5 L12 24 L22.5 34.5"/>')


def undo():
    # Like the concept: a hook that leaves to the left and curls back round on the right.
    return svg('<path d="M14 18.5 H29 A9.5 9.5 0 0 1 29 37.5 H21"/>'
               + arrowhead((8.5, 18.5), (-1, 0)).replace(f'stroke-width="3.5"', 'stroke-width="3.5"'))


def hint():
    # A round bulb with its screw base, and a small filament spark.
    head = "M18.6 31 C15 28.4 12.8 24.7 12.8 20.6 A11.2 11.2 0 0 1 35.2 20.6 C35.2 24.7 33 28.4 29.4 31 Z"
    return svg(f'<path d="{head}"/><path d="M19.5 36.5 H28.5"/><path d="M21.5 42 H26.5"/>'
               '<path d="M21 21.5 L24 25 L27 21.5" stroke-width="3.2"/>')


def shuffle():
    return svg('<path d="M8 15 H13.5 C23.5 15 24.5 33 34.5 33 H37"/>'
               '<path d="M8 33 H13.5 C23.5 33 24.5 15 34.5 15 H37"/>'
               + arrowhead((42.5, 15), (1, 0), 7, 6) + arrowhead((42.5, 33), (1, 0), 7, 6))


def restart():
    # Clockwise circular arrow, gap at the top right, head pointing on round the circle.
    cx = cy = 24
    r = 13.5
    a0, a1 = -20, 260  # clockwise from just right of 'three o'clock - up' round to the top
    s = pt(cx, cy, r, a0)
    e = pt(cx, cy, r, a1)
    path = f'<path d="M{f(s[0])} {f(s[1])} A{r} {r} 0 1 1 {f(e[0])} {f(e[1])}"/>'
    # Tangent of a clockwise (increasing-angle) arc at a1, and the tip just past the end.
    t = (-math.sin(math.radians(a1)), math.cos(math.radians(a1)))
    tip = pt(cx, cy, r, a1 + 22)
    return svg(path + arrowhead(tip, t, 8, 6.5))


def play():
    return svg('<path d="M18 13 L36 24 L18 35 Z" fill="' + SLATE + '" stroke-width="6"/>')


def next_():
    # The back arrow, mirrored.
    return svg('<path d="M11 24 H35"/><path d="M25.5 13.5 L36 24 L25.5 34.5"/>')


def home():
    # A plump house: round-cornered roof and body, a rounded door.
    return svg('<path d="M8.5 23 L24 10 L39.5 23"/>'
               '<path d="M13 21 V36.5 A2.5 2.5 0 0 0 15.5 39 H32.5 A2.5 2.5 0 0 0 35 36.5 V21"/>'
               '<path d="M20.5 39 V31 A3.5 3.5 0 0 1 27.5 31 V39" stroke-width="4.5"/>')


def chevron():
    # A single › for list rows; drawn narrow so it sits at the end of a row.
    return svg('<path d="M19 12 L31 24 L19 36"/>')


def photos():
    # Two stacked photographs: the back one peeking out, the front one with hills and a sun.
    return svg('<path d="M15 11.5 H36 A4 4 0 0 1 40 15.5 V31" stroke-width="4"/>'
               '<rect x="7.5" y="17" width="27" height="22" rx="4.5"/>'
               '<path d="M11.5 35 L18.5 27 L23.5 32 L26.5 29 L31 34" stroke-width="3.5"/>'
               '<circle cx="27.5" cy="23" r="1.6" fill="' + SLATE + '" stroke-width="2.5"/>')


def route():
    # The challenge route: three round stops climbing to a flag (the route's markers are round too).
    dot = '<circle cx="{}" cy="{}" r="3.7" fill="' + SLATE + '" stroke="none"/>'
    return svg(dot.format(8.5, 40) + dot.format(17.5, 37) + dot.format(23.5, 30)
               + '<path d="M30.5 33 V7.5"/>'
               '<path d="M32 8.5 L42.5 13.5 L32 18.5 Z" fill="' + SLATE + '" stroke-width="3.5"/>')


def lock():
    # A plump padlock: round shackle, a solid body with a keyhole cut through it (mask).
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">'
            f'<defs><mask id="k"><rect x="10.5" y="20.5" width="27" height="20.5" rx="5.5" fill="#fff"/>'
            f'<circle cx="24" cy="29" r="3.2" fill="#000"/><rect x="22.4" y="29" width="3.2" height="6.5" rx="1.6" fill="#000"/></mask></defs>'
            f'<path d="M16.5 21 V16.5 A7.5 7.5 0 0 1 31.5 16.5 V21" fill="none" stroke="{SLATE}" stroke-width="{W}" stroke-linecap="round"/>'
            f'<rect width="48" height="48" fill="{SLATE}" mask="url(#k)"/></svg>\n')


def check():
    # A cleared board: one fat tick.
    return svg('<path d="M10.5 25 L19.5 34 L37.5 14.5" stroke-width="5.5"/>')


def daily():
    # The daily puzzle: a calendar page (filled header, two rings) with a star on it.
    pts = []
    for k in range(10):
        r = 7.6 if k % 2 == 0 else 3.4
        x, y = pt(24, 31.2, r, -90 + k * 36)
        pts.append(f"{f(x)} {f(y)}")
    star = "M" + " L".join(pts) + " Z"
    return svg('<rect x="8.5" y="11.5" width="31" height="29" rx="6"/>'
               '<path d="M8.5 18 A6 6 0 0 1 14.5 12 H33.5 A6 6 0 0 1 39.5 18 V19.5 H8.5 Z" fill="' + SLATE + '" stroke-width="3"/>'
               '<path d="M17 7 V12"/><path d="M31 7 V12"/>'
               f'<path d="{star}" fill="{SLATE}" stroke-width="2.4"/>')


def passport():
    # The passport the trips stamp (UI, 2026-10-25: it replaces the albums): a book with its
    # spine, a globe on the cover and a title bar. Drawn as a mask at about 28 px on home.
    return svg('<rect x="10.5" y="7" width="27" height="34" rx="5"/>'
               '<path d="M16.5 9 V39" stroke-width="3"/>'
               '<circle cx="27" cy="21" r="6.5" stroke-width="3"/>'
               '<ellipse cx="27" cy="21" rx="2.6" ry="6.5" stroke-width="2.4"/>'
               '<path d="M20.5 21 H33.5" stroke-width="2.4"/>'
               '<path d="M22.5 33 H31.5" stroke-width="3.5"/>')


def plane():
    # The trip's ticket and the Next stop button (UI, 2026-10-26): a plump airliner seen from
    # above, flying up and to the right. One filled shape; the stroke rounds its corners.
    body = ("M24 4.5 C26.4 4.5 27.4 7.2 27.4 10.2 V18.6 L41.5 27 V31.4 L27.4 26.8 V35.2 L32 38.8 V42 "
            "L24 39.8 L16 42 V38.8 L20.6 35.2 V26.8 L6.5 31.4 V27 L20.6 18.6 V10.2 C20.6 7.2 21.6 4.5 24 4.5 Z")
    return svg(f'<path d="{body}" fill="{SLATE}" stroke-width="2.5" transform="translate(24 25) rotate(45) scale(0.92) translate(-24 -23.5)"/>')


def rotate():
    # "Turn your phone upright" (UI, 2026-10-26): an upright phone, and an arrow curling up
    # its left side towards it.
    cx, cy, r = 26.5, 24, 18
    a0, a1 = 130, 220
    s = pt(cx, cy, r, a0)
    e = pt(cx, cy, r, a1)
    t = (-math.sin(math.radians(a1)), math.cos(math.radians(a1)))
    tip = pt(cx, cy, r, a1 + 17)
    return svg('<rect x="23.5" y="7.5" width="16" height="33" rx="4.5" stroke-width="4.5"/>'
               '<path d="M29 35 H34" stroke-width="3"/>'
               f'<path d="M{f(s[0])} {f(s[1])} A{r} {r} 0 0 1 {f(e[0])} {f(e[1])}" stroke-width="4.5"/>'
               + arrowhead(tip, t, 7, 6))


ICONS = {"gear": gear, "back": back, "undo": undo, "hint": hint, "shuffle": shuffle, "restart": restart, "play": play,
         "next": next_, "home": home, "chevron": chevron, "photos": photos,
         "route": route, "lock": lock, "check": check, "daily": daily, "passport": passport,
         "plane": plane, "rotate": rotate}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in ICONS.items():
        (OUT / f"icon-{name}.svg").write_text(fn(), encoding="utf-8")
        print(f"public/art/ui/icon-{name}.svg", len(fn()), "bytes")
    if len(sys.argv) > 2 and sys.argv[1] == "preview":
        import io
        import resvg_py
        from PIL import Image, ImageDraw
        size, pad = 128, 24
        sheet = Image.new("RGB", (len(ICONS) * (size + pad) + pad, 2 * (size + pad) + pad), (50, 62, 76))
        d = ImageDraw.Draw(sheet)
        for i, name in enumerate(ICONS):
            png = bytes(resvg_py.svg_to_bytes(svg_string=ICONS[name](), width=size, height=size))
            g = Image.open(io.BytesIO(png)).convert("RGBA")
            x = pad + i * (size + pad)
            # On the concept's pale round button, and small at phone size.
            d.ellipse((x - 8, pad - 8, x + size + 8, pad + size + 8), fill=(214, 222, 232))
            sheet.paste(g, (x, pad), g)
            small = g.resize((40, 40), Image.LANCZOS)
            d.ellipse((x + 34, pad * 2 + size + 34, x + 94, pad * 2 + size + 94), fill=(214, 222, 232))
            sheet.paste(small, (x + 44, pad * 2 + size + 44), small)
        sheet.save(sys.argv[2])
        print(sys.argv[2])


if __name__ == "__main__":
    main()
