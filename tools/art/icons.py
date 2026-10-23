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


ICONS = {"gear": gear, "back": back, "undo": undo, "hint": hint, "shuffle": shuffle, "restart": restart, "play": play}


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
