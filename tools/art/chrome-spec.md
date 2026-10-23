# Table and chrome: what ships and how to draw it

The look is `design/concepts/game-l.png` (AGENTS.md rulings). This sheet turns it into
numbers for the parts drawn in code, and lists the art files. A reference render built
from exactly these numbers: `python tools/art/mockup.py <out.png>`.

## Files (public/art/)

| file | what | size |
| --- | --- | --- |
| `table.webp` | the empty winter-dusk table, portrait 1080x1920 (9:16): lanterns in the top corners, snowy pine and holly on the edges, a calm dark middle. Nothing else painted in. | ~92 KB |
| `stack-back.webp` | one stack card back, straight on, 256x256 with alpha: frosted deep blue-grey, one amber dot. | ~14 KB |
| `snow.png` | four 32x32 white flakes in a 128x32 strip: soft small, soft large/faint, crisp, six-armed crystal. | ~2 KB |
| `ui/icon-*.svg` | slate glyphs, 48x48 viewBox: `gear`, `back`, `undo`, `hint`, `shuffle`, `restart`, `play`. | <1 KB each |

**Table:** draw it `background-size: cover; background-position: center top` with
`background-color: #2c3746` behind it. On a phone taller than 9:16 the sides crop a
little (the lanterns stay, partly cut, as in the concept); in the Arcade's 9:16 box on
PC it fits exactly. The middle is darker than the edges on purpose: cards and text go
there.

**Snow:** drift a few dozen flakes over the table's edges only (not over the board),
mostly frame 0 at 50-90% opacity, a handful of frame 1 large and slow, rare frame 3
turning slowly. Slow and sparse; it stops at rest like everything else (battery rule).

**Icons:** one colour, `#34435a` (the concept's slate type), on transparent. For any
other colour use the SVG as a CSS `mask-image` over a coloured box. Strokes are round
and thick so they hold at 20-24 px on a phone.

## Card frames (drawn in code)

All sizes are fractions of the cell size `s` (one square card, without its gutter).

| part | value |
| --- | --- |
| gutter between cells | `0.08 s` (thin and even) |
| outer corner radius | `0.14 s` |
| frosted rim width | `0.05 s` (never under 3 CSS px) |
| picture window corner radius | `0.09 s` |
| rim fill | vertical gradient `#e9eef5` (top) to `#b0bac8` (bottom), plus a 1 px `#f4f7fb` highlight along the top edge |
| hairline where rim meets picture | 1 px `#8b97a8` |
| lip (the card's thickness, showing below its face) | same rounded shape shifted down `0.035 s`, gradient `#5d6979` to `#343d4a` |
| drop shadow on the table | `rgba(8,14,22,0.6)`, offset down `0.04 s`, blur `0.06 s` |

The picture fills the window edge to edge, untouched: no tint, filter, overlay or
colour on the frame that depends on the picture (AGENTS.md: never colour-code).

**A merged piece** is one frame around the outline of all its cells, gutters included,
with the picture continuous across where the gutters were (scale the picture's region
to the piece's window). Same rim, radius and lip as a single card; nothing drawn over
the picture. For an L-shaped piece, the inner corner is rounded with the same radius,
inverted.

**A lifted card** grows ~6% and its shadow doubles in offset and blur; nothing else
changes colour.

## Stacks

A pile is the `stack-back.webp` sprite drawn `0.92 s` wide, centred over its column,
with the cards under it drawn as the same sprite shifted down ~3.5% of its size each and
darkened (multiply by `rgba(20,26,36,0.45)`), 3 to 5 layers deep depending on how many
cards are left. Use the frame's drop shadow under the bottom layer. An upcoming card a
level shows face up sits on top of the pile in a normal card frame.

## Colours to share with the interface

| use | colour |
| --- | --- |
| table behind everything | `#2c3746` |
| slate type and glyphs | `#34435a` |
| frosted pale (frames, buttons) | `#e9eef5` to `#b0bac8` |
| amber accent (dot, badges, candlelight) | `#e99645`, light `#f6c27a` |
| card back face | `#3a4759` |
