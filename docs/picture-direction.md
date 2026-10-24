# Picture direction

How a puzzle picture is made, from 2026-10-24. The creator compared our level 3
(`design/references/ours-level-3-too-busy.png`) with Jigsaw Drop's levels 13 and 14
(`jigsaw-drop-level-13a.png`, `-13b.png`, `-14.png`) and the App Store shots of
"Jigsaw Drop: Solitaire Puzzle" (Chengdu Runyou). Our pictures were too noisy and too
far from their subjects. Theirs read at a glance, because every card shows a big part
of one clear thing. The ruling is in AGENTS.md ("Pictures are clear, close and varied").
The pipeline is `tools/art/pictures.py`, the plan is `tools/art/pictures-plan.json`, and
the plan's `suffix.close` is the prompt ending for these rules.

## Rules for one picture

- **Portrait cards.** A card is a 3:4 cell, 384x512 px. A picture of c x r cards is
  (3c):(4r): a 2x2 is 3:4 (768x1024). Compose for that frame.
- **One subject, framed close.** It fills most of the frame and reaches every quarter,
  so each card shows a recognisable part of it: a face, a wheel, a petal or a sail.
  No wide views with the subject small in the middle.
- **Calm background.** Plain, soft or out of focus, in strong contrast with the
  subject. Detail goes on the subject, not around it.
- **Strong shapes and clear colour.** Big colour blocks and a palette of its own.
  The picture is never tinted to make it easy to sort (no colour-coding).
- **Busy pictures are rare.** Every picture has `busy`: 0 calm, 1 medium, 2 busy.
  Boards 1-3 take no 2s, and other boards take at most one.
- **One style word** in `medium`. A board mixes styles, and no style fills more than
  half of a board.
- **Specific subjects** in `subjects` ("teacup", not "food"). Two pictures that share a
  subject word never share a board, so subjects on a board vary.
- **Family** only for real look-alikes. A board takes at most one picture per family.
  A picture with no family is its own family.
- **Nothing written** in the picture (no text, numbers, logos or signatures) and no
  border. Everything is suitable for all ages.

## Style menu (`medium`)

| word | what it looks like |
| --- | --- |
| photo | studio product shot on a plain backdrop, close portrait, macro of a flower or food |
| render | glossy 3D, like an animated film: toy-like objects and soft clay materials |
| low-poly | flat-shaded triangle facets |
| flat | flat vector illustration with bold shapes, no outlines and light grain |
| retro | mid-century travel poster or advert art (no text), flat colour and print texture |
| pop | 1960s comic pop art with black outlines and halftone dots |
| painting | oil, classical or impressionist, on a calm dark or plain ground |
| watercolour | loose washes with crisp edges and white paper showing |
| print | woodblock print (ukiyo-e) or linocut: flat colour and key lines |
| papercut | layered paper craft with soft shadows between the layers |

Others to try: pastel or chalk drawing, stained glass (busy, so rare), isometric
diorama render, art deco poster, pixel art.

## Subject menu

Mix the subjects on a board; never theme a whole board.

- **Things:** a vintage camera, a scooter, a bicycle, a teapot, a typewriter (no
  letters), a gramophone, a jukebox (no brand), a lantern, an armchair or sofa,
  ceramic vases, a globe, a hot air balloon, a sailboat, a classic car, a lighthouse,
  a windmill.
- **Food:** an ice-cream cone, a slice of cake, macarons, a watermelon slice, lemons,
  a cup of coffee, a bowl of cherries, a pretzel.
- **Flowers and plants:** one bloom or one bunch, close: lotus, sunflower, lilies on a
  dark ground, a cactus in flower, a tulip, a rose.
- **People:** shoulders-up portraits and simple figures, such as a fisherman, a dancer,
  a chef, a child with a kite, a cowboy, or a woman in a hat or headscarf.
- **Places, made close:** one landmark, a door, a facade, a mountain peak, a cottage,
  a bridge.
- **Animals:** at most an occasional single cat or puppy in the base library. Whole
  sets of animals belong to paid packs.

**Kept for paid packs, never as a set here:** animals, fantasy, sci-fi and space,
underwater, seasonal holidays, dinosaurs, steampunk.
