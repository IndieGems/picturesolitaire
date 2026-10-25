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
- **Tall and wide pictures** (1x2 is 3:8, 2x1 is 3:2) are composed for their shape: a tall
  subject for a tall picture (a giraffe, a skyscraper, a dancer), a long one seen from the
  side for a wide one (a tractor, a piano, a canoe), so each half shows a different,
  recognisable end of it. Mirror-symmetric subjects (a butterfly, a bridge with two towers)
  make two halves alike, so avoid them. The plan's `suffix.close2` is their prompt ending.
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
- **A new subject for every picture.** Pictures rarely repeat across boards (AGENTS.md),
  so the library needs many pictures, each a thing of its own: never two teapots or two
  lone trees, even in different styles.
- **People never look AI-made** (creator, 2026-10-25: "they often have the same tilted
  head and smile (the chef, the cowboy, the painter)"). See "People" below.
- **Family** only for real look-alikes. A board takes at most one picture per family.
  A picture with no family is its own family.
- **Nothing written** in the picture (no text, numbers, logos or signatures) and no
  border. Everything is suitable for all ages.

## People

Jigsaw Drop's people read as real because nobody poses: level 16's painted Madonna looks
down, level 17's farmer is bent over his pumpkins
(`design/references/jigsaw-drop-level-16-all-square.png`, `-17-all-long.png`).

- **Candid, at work, absorbed:** in profile, from behind, from the side, looking down at
  their hands or away, or small in a scene. Hands doing something are a good subject.
- **Never** the posed camera smile, eyes to the viewer, a tilted head, or a face dead
  centre and symmetric. Nothing glossy, airbrushed, plastic or doll-like: ordinary
  features and real skin. A cartoon person is held to the same rules.
- **Same tests for a painting:** a Renaissance-style figure looks down at a book or a
  child; an impressionist crowd is busy with its day.
- The plan's `suffix.candid` (the `close` ending plus these rules) is the prompt ending for
  a picture with a person in it.
- Flagged for the look and replaced (2026-10-25): chef, cowboy, painter, apple-orchard,
  yellow-raincoat, bubbles, greenhouse, canal-bicycle, and blue-headscarf (too close to
  Vermeer's *Girl with a Pearl Earring*: never copy a real artwork).

## Destinations

A trip's postcards (2026-10-25) are real places, a whole board in size, in the plan's and
the catalogue's `destinations` (crop and fields in `tools/art/pictures.py`). They are
generated, and the facts are checked against real photos of the place (creator): the land,
the landmark, the colours and the season. Describe the place in words and never feed
someone's photo to the generator. Record what was checked in the entry's `checked`.
Mostly photographic, with some painted or travel-poster postcards, and never the AI look.
The plan's `suffix.postcard` is the prompt ending. `docs/destinations-america.md` has the
first trip's candidates and the rights rules.

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
| pastel | soft pastel and chalk on toned paper |
| deco | art deco poster: geometric shapes, gold lines, symmetry (no text) |
| stained-glass | glowing glass in lead lines; keep the pieces big, and use it rarely |
| toy | toy photography: a toy or figurine photographed close, with a shallow focus |
| ceramic | hand-painted tin-glazed majolica, the painted thing on a jug, plate or tile |
| embroidery | thread stitched on linen, close enough to see the stitches |
| mosaic | big glass or stone tesserae with grout lines; keep the pieces big |
| pixel | clean pixel art with big pixels and a small palette, no dithering noise |
| isometric | a small isometric diorama, rendered like a toy model, on a plain ground |

Keep the styles wide: also a Renaissance-style painting, an impressionist street, a
Dutch still life, an extreme close-up photo (Jigsaw Drop's cow nose). A board takes at
most half its pictures in one `medium`, so more words spread the boards better.

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
- **People, candid:** a beekeeper lifting a frame, a glassblower turning a gather, a cook
  over a flaming wok, a hiker from behind, a cellist with eyes closed, hands knitting.
- **Places, made close:** one landmark, a door, a facade, a mountain peak, a cottage,
  a bridge.
- **Animals:** single animals in varied styles, about a tenth of the library (a fox, a
  hedgehog, an extreme close-up of a cow's nose). Themed sets of animals belong to paid
  packs.

**Kept for paid packs, never as a set here:** animals, fantasy, sci-fi and space,
underwater, seasonal holidays, dinosaurs, steampunk.
