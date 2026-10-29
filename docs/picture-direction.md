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

## Atmospheric pictures

**At most one picture per level is atmospheric** (creator, 2026-10-29: a cap, not a
target), in every lane but the Souvenirs, which are one style and one theme by design
(`docs/souvenirs.md`). This replaced the 2026-10-28 aim of about 1 in 6 to 1 in 8,
roughly one per board. Atmospheric means a landscape, a scene from a distance, an
impressionist or loose painterly picture, or a busier one. The creator found the early
pictures were not wrong in kind. They failed because all of them were distant and busy,
and a single one on a level gives variety without the noise. Levels holds the cap in
the makers (0cf569e).

**No more are made unless the lead asks** (2026-10-29). The library has 171, the 21
early squares and three batches of 50, all tagged. Levels places them within the cap,
and the clear pictures they displaced stock trip 11 and on. The rules below describe
those 171 and any new one the lead asks for.

- **Tagged.** The plan and the catalogue mark them `"look": "atmospheric"`, and Levels
  counts that tag. A clear picture has no `look`.
- **Square (2×2) only**, made at the size they ship.
- **Busier, never mush.** Every one of the four cards must hold something a player can
  place: a horizon, a tree line, a building, a boat, a figure or a patch of distinct
  colour. No quarter is only sky, water, mist, foliage or one even texture, and no two
  quarters look alike. A prompt names what sits where ("a boathouse on the left, a heron
  on the lower right, peaks at the top").
- **`busy` 1 or 2** for most, 0 for a calm one. Levels still keeps busy 2s apart.
- **Media:** photo, oil painting (impressionist, plein-air, romantic, tonalist,
  pointillist, fauvist, Dutch genre), watercolour, gouache, pastel and woodblock print.
  Vary the subjects, places, seasons and palettes, with no look-alike families.
- **Still new subjects.** Each is a scene of its own, checked against the library's ids,
  titles and subjects before it is drawn: a library picture of the same thing (a
  watermill, a boathouse, the northern lights) rules it out. Subjects and ids avoid the
  suitcase items' words (Levels' `itemClash`).
- **The usual rules hold:** people small in the scene and never posed; no real
  landmark; no writing; all ages.
- The plan's `suffix.atmos` (and `atmos-photo` for photographs) is the prompt ending.

## Pen and ink

The creator loved Jigsaw Drop's opening level, and few of our pictures matched it
(2026-10-29, `design/references/jigsaw-drop-opening-pen-and-ink.png`: the woman at the
mirror, the running dog, the Edwardian picnic). So about 60 pictures (`"medium": "ink"`)
are clear pictures, square and made at high quality. The creator found medium noisier.

- **Three looks, varied within:** a vintage storybook (ink with hatching and a soft
  watercolour wash), a mid-century magazine (ink with flat colour and halftone shading)
  and a mid-century comic panel (bold outlines, cross-hatching, halftone dots).
- **Calm, everyday or charming subjects:** people at work or at leisure, animals,
  objects, food, vehicles and small scenes, each with one readable subject on a calm
  background.
- **Each quarter differs.** The first Pram's two bottom cards were both wheels, so a
  prompt places a distinct part in each quarter, and the plan's `ink` endings say so.
- **The style is described in words only.** Never give Jigsaw Drop's pictures to the
  generator, and never reuse their compositions or characters.
- The endings are `suffix.ink`, `suffix.ink-people` and `suffix.ink-candid` (People, below).

## People

**Most people pictures show the face** (creator, 2026-10-29): front-on or three-quarter,
toward the viewer, and eye contact is allowed. A profile or a back view is the exception,
about 1 in 5 people pictures at most. This replaced the 2026-10-25 rule (candid, in
profile, from behind), which overcorrected: the library's people lean away from the
camera (the shepherd, the window cleaner, the rower, the milliner, the dressmaker), so
new ones face out.

- **What still has to go is the AI look:** the same tilted head and posed camera smile
  on everyone (the 2026-10-25 complaint about the chef, the cowboy and the painter). Vary
  the expression (concentration, a laugh, a neutral look, glancing up mid-task), the age,
  the face and the framing. Hands doing something are still a good subject.
- **Nothing glossy, airbrushed, plastic or doll-like:** ordinary features of the person's
  own age. A cartoon or ink person is held to the same rules, and so is a painted one.
- The plan's `suffix.ink-people` is the ending for a pen-and-ink person facing out.
  `suffix.candid` and `suffix.ink-candid` carry the old profile and back-view wording, so
  use them only for the exceptions (and they are what every person before 2026-10-29 was
  made with).
- Flagged for the look and replaced (2026-10-25): chef, cowboy, painter, apple-orchard,
  yellow-raincoat, bubbles, greenhouse, canal-bicycle, and blue-headscarf (too close to
  Vermeer's *Girl with a Pearl Earring*: never copy a real artwork).

## Destinations

A trip's postcards (2026-10-25) are real places, a whole board in size, in the plan's and
the catalogue's `destinations` (crop and fields in `tools/art/pictures.py`). They are
generated, and the facts are checked against real photos of the place (creator): the land,
the landmark, the colours and the season. Describe the place in words and never feed
someone's photo to the generator. Record what was checked in the entry's `checked`.
**Always an obviously painted style, never photoreal** (creator, 2026-10-28: a generated "photo" of a
real place passes itself off as one, and someone who knows the place notices the small differences; a
painting leaves leeway). The style suits the place and varies within a trip: Japan woodblock or ink-wash,
France Impressionist oil or watercolour, the American West a 1930s park poster or gouache, Italy plein-air
oil, Canada bold oil, the UK and Ireland watercolour, Australia, Argentina and South Africa gouache or
acrylic. The 108 photographic ones were redrawn from our own postcards (`pictures.py repaint`: a flat-colour
study of the postcard plus one of our pictures already painted that way; the entry's `paint` names the
style, PAINT in pictures.py its words). A new postcard is painted from the start: never the plan's photo
suffix `suffix.postcard`, which made the old ones. The same goes for a library picture of a real landmark. `docs/destinations-america.md` has the
first trip's candidates and the rights rules.

## Shipped files

Each picture ships at the size it is drawn, in three files, all WebP made from the picture's master
(`tools/art/masters/`, WebP q90). Never re-compress a shipped file: always re-export from the master.
- **Full picture** (only the enlarged view; 384 x 512 px a card): q74. **Board copy** (240 x 320 px a
  card): it starts at q70 and steps down 4 at a time to fit 28 KB a card (q84 for flat, smooth media,
  which ring). A postcard's board copy uses 8 KB a card, down to q50. **Passport thumb** (postcards
  only): 300 px wide, from q76.
- Why q74 and q70 (the creator, 2026-10-28, from 100% crops of q80, q74, q70 and AVIF): they look
  the same as q80 and q74 and are about 21% and 11% lighter (`FULL_Q` and `BOARD_Q` in `pictures.py`).
  AVIF was no smaller at equal quality: by a structure measure (SSIM) over 60 pictures it came out
  6% bigger. Where it was smaller (q55), it visibly softened fur and bronze. It also decodes more
  slowly on phones and needs iOS 16+.
- No metadata and no filters. Every script ends each file with `tools/art/images.py`'s squeeze
  (lossless only), and the build fails on an image that carries EXIF, XMP or a colour profile.
  `python tools/art/images.py audit` lists every group's size.

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
| gouache | flat, matte, opaque paint with soft hand-painted edges, like a mid-century picture book |
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
- **People, faces shown:** a beekeeper lifting a frame, a glassblower turning a gather, a
  cook over a flaming wok, a cellist with eyes closed, a grocer glancing up from the scales.
- **Places, made close:** one landmark, a door, a facade, a mountain peak, a cottage,
  a bridge.
- **Animals:** single animals in varied styles, about a tenth of the library (a fox, a
  hedgehog, an extreme close-up of a cow's nose). Themed sets of animals belong to paid
  packs.

**Kept for paid packs, never as a set here:** animals, fantasy, sci-fi and space,
underwater, seasonal holidays, dinosaurs, steampunk.
