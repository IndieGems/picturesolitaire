# Souvenirs: a special board after every trip

The creator's design (2026-10-28), after Jigsaw Drop's "Special" boards (a themed board every ~25
levels in one art style, all long pictures).

## For the player

- **One Souvenir per trip.** Each trip's stamp opens a bonus board themed on the trip just
  finished, like the gift shop on the way out. It's optional: the next trip opens with the stamp
  as now, and the Souvenir waits on home and on that trip's passport page until it's played.
  Players who stamped a trip before Souvenirs existed find it waiting there too.
- **The theme** is the trip's place, told through one kind of thing. Examples:
  - Japan: woodblock prints;
  - France: Impressionist paintings;
  - UK & Ireland: its transport (double-decker, narrowboat, black cab).
  Other kinds are old statues, street food and wildlife. Art proposes all ten for the creator
  to approve.
- **The board**:
  - all long pictures (tall 1×2 and wide 2×1 mixed);
  - relief difficulty (readable, a safe start);
  - a "Souvenir" heading and a table of its own.
- **The reward**:
  - Coins like a relief board, paid once, server-checked (`docs/coins.md`);
  - a souvenir sticker on that trip's passport page.
- **Replays** pay nothing, as for any board won.

## Pictures: the one exception to the picture rules

- **One style per Souvenir**, and every picture on the theme. Normal boards forbid both (no
  look-alikes, mixed styles). To keep the cards tellable apart, as Jigsaw Drop does:
  - each generated picture sits on its own bold background colour, never two alike on a board
    (the only place pictures are colour-coded);
  - subjects of clearly different shapes (a gondola, a balloon, a train; not five boats).
- **Paintings and prints** are themselves, at full fidelity, so the theme holds them together
  instead of one style. Each is cropped to a tall or wide card shape: portraits tall,
  landscapes wide.
- **Copyright** (the lead's reading, not legal advice; check before release):
  - **Paintings and prints:** only artists dead 70+ years and published before 1931. Use museum
    scans released for any use (CC0): the Met, the Rijksmuseum, the Art Institute of Chicago,
    the US National Gallery of Art. Record each picture's source and licence in `docs/credits.md`.
    - Never Italian state collections (Uffizi, Accademia and the rest): Italy's heritage law
      charges for commercial images of them, and it has won cases over the David, the Birth of
      Venus and a jigsaw maker's Vitruvian Man.
    - No 20th-century artists still in copyright (Picasso, Dalí, Kahlo, Magritte, Warhol).
  - **Statues:** ancient and pre-1900 only, drawn by Art (a photo of a statue is the
    photographer's), or a museum's own CC0 photo. Never a modern statue:
    - the Little Mermaid;
    - Christ the Redeemer;
    - the Charging Bull;
    - the Atomium.
    No sacred or devotional figures, per the postcard rule.
  - **Transport, food and wildlife:** generated and generic, with no brands, logos, company
    colours or signature car shapes (a VW Beetle, a Jeep grille).

## Who builds what

- **Art:**
  - first, the ten themes (one per trip, kind and list of subjects, copyright noted) for the
    creator to approve;
  - then the pictures (about 10–12 long ones each) and each Souvenir's table, in the look of
    the others;
  - the sticker art.
- **Levels:**
  - a Souvenir maker: one all-long relief board per trip, proved like every board, its pictures
    the Souvenir's own and never dealt elsewhere;
  - the board data's shape agreed with Server and UI.
- **Server:**
  - the Souvenir boards in the checker;
  - their Coins, paid once;
  - the sticker as part of the player's record.
- **UI:**
  - the stamp card's way into the Souvenir;
  - its place on home and on the passport page (the sticker);
  - the "Souvenir" heading.
- **Audio:** a short souvenir sting if the stamp's doesn't fit.

## The ten Souvenirs (approved by the creator, 2026-10-28)

Art's proposal (2026-10-28) for the creator to approve. Each Souvenir has 12 long pictures (6 tall
1×2 and 6 wide 2×1, agreed with Levels for its 4×4 board), one style, its own table and a sticker.
Kinds are spread so none runs on more than 2 trips and no two trips in a row share one: street food
(1, 9), paintings and prints (2, 5), ancient statues (3), local things (4, 7), wildlife (6, 8),
transport (10).

| Trip | Kind | Style | Source | Table | Sticker |
| --- | --- | --- | --- | --- | --- |
| 1 America | Street and diner food | Glossy 3D render, like an animated film | Generated | A 1950s diner counter: speckled Formica, chrome edge, a napkin dispenser and a jukebox selector at the corners | A hot dog |
| 2 Japan | Woodblock prints | The prints themselves (Hokusai, Hiroshige) | CC0 scans: the Met, the Art Institute of Chicago, the Rijksmuseum | A printmaker's low table: carved woodblocks, a baren, brushes and stacked washi paper at the edges | A curling wave |
| 3 Italy | Ancient Rome: statues and antiquities | Museum photograph, softly lit, on a bold seamless backdrop | Generated, generic types only (or the Met's CC0 photos, cut out) | A sculptor's bench of pale travertine: marble chips, chisels and a plaster hand at the edges | A laurel-crowned marble bust |
| 4 American West | Ranch and trail things | Linocut: bold carved black lines and one or two flat colours on a bold ground | Generated | A weathered ranch table with a tin cup, a coiled lasso and a cowboy hat at the edges | A cowboy boot |
| 5 France | Impressionist paintings | The paintings themselves | CC0 scans: the Art Institute of Chicago, the Met, the US National Gallery of Art | A painter's table: paint tubes, brushes in a jar, a palette and a rag at the edges | A palette and brush |
| 6 Canada | Wildlife | Layered papercut, soft shadows between the layers | Generated | A lodge table with a red plaid blanket, a tin mug, maple leaves and a paddle tip at the edges | A moose |
| 7 Argentina | Tango, gauchos and mate | Buenos Aires fileteado painting: bright colours, black outlines, curling scrolls, no lettering | Generated | A dark café table with a mate gourd, a fileteado tray and the corner of a bandoneón | A mate gourd |
| 8 Australia | Wildlife | Natural-history plate: a hand-coloured 19th-century zoology print | Generated | A ranger's field desk: notebook, binoculars, gum leaves and gumnuts at the edges | A kangaroo |
| 9 South Africa | Street food | Studio food photography | Generated | A braai-side table: a wooden board, chillies, a tin plate and a woven cloth edge | A boerewors roll |
| 10 UK & Ireland | Transport | Die-cast toy photography, close with shallow focus | Generated | A railway carriage table: a teacup, a tartan rug and a brass lamp at the edges | A red double-decker bus |

Every generated picture sits on its own bold background colour, never two alike in a Souvenir.
Tall (T) and wide (W) subjects, each a clearly different shape:

1. **America:** T: pancake stack with syrup, milkshake, corn dog, soft-serve cone, striped
   popcorn box, candy apple. W: hot dog, rack of BBQ ribs, banana split, folded New York pizza
   slice, apple pie slice with ice cream, corn on the cob.
2. **Japan:** T: Hiroshige, *Sudden Shower over Shin-Ōhashi Bridge and Atake*; *Plum Park in
   Kameido*; *Fukagawa Susaki and Jūmantsubo* (the eagle); *Fireworks at Ryōgoku*; *Asakusa Rice
   Fields and Torinomachi Festival* (the cat at the window; it replaced a tall bird-and-flower print
   whose poem filled half the card). Hokusai, *Kirifuri Waterfall at Kurokami Mountain*.
   W: Hokusai, *Under the Wave off Kanagawa*; *Fine Wind, Clear Morning*; *Mishima Pass in Kai
   Province*; *Kajikazawa in Kai Province*; *The Hanging-cloud Bridge at Mount Gyōdō*. Hiroshige,
   *Evening Snow at Kanbara*.
3. **Italy:** T: a toga-clad orator statue, a Corinthian column, an amphora, a legion's bronze
   eagle standard, a marble emperor's bust on a pedestal, a bronze lamp stand. W: a bronze
   two-horse chariot, a reclining river-god statue, a carved sarcophagus, a mosaic panel of
   dolphins and fish, a galley model, a recumbent marble lion.
4. **American West:** T: cowboy boot with spur, windpump, oil lantern, guitar, campfire coffee
   pot, saguaro. W: saddle, covered wagon, stagecoach, cowboy hat, longhorn steer, harmonica.
5. **France:** T: Van Gogh, *Cypresses* (Met); Monet, *Woman with a Parasol* (NGA); Renoir, *A
   Girl with a Watering Can* (NGA); Caillebotte, *Paris Street; Rainy Day* (AIC, the lamp post and
   umbrellas); Renoir, *By the Seashore* (Met); Cassatt, *The Child's Bath* (AIC). W: Seurat, *A
   Sunday on La Grande Jatte* (AIC); Monet, *Arrival of the Normandy Train, Gare Saint-Lazare*
   (AIC); Monet, *Cliff Walk at Pourville* (AIC; the Met does not release *Garden at Sainte-Adresse* as open access); Monet, *Stacks of Wheat (End of Summer)* (AIC);
   Degas, *The Dance Class* (Met); Pissarro, *Boulevard Montmartre on a Winter Morning* (Met).
6. **Canada:** T: breaching orca, bald eagle on a branch, standing polar bear, snowy owl, lynx
   sitting, puffin. W: moose, beaver with a branch, loon on a lake, caribou, bison, Canada goose
   in flight.
7. **Argentina:** T: tango couple (in profile), a gaucho in a poncho (from the side), mate gourd
   with its straw, a jar of dulce de leche, a stack of alfajores, an Andean condor perched.
   W: bandoneón, asado grill, a fileteado-painted city bus, empanadas on a board, a horse with a
   sheepskin saddle, a pair of tango shoes.
8. **Australia:** T: kangaroo, emu, koala on a branch, kookaburra, sulphur-crested cockatoo,
   lyrebird with its tail raised. W: platypus, wombat, echidna, saltwater crocodile, Tasmanian
   devil, frilled-neck lizard.
9. **South Africa:** T: biltong hanging, a stack of koeksisters, a sosatie skewer, a bunny
   chow, a glass of ginger beer, a jar of rusks. W: Gatsby sandwich, boerewors roll, malva pudding
   with custard, a melktert slice, samoosas, pap and chakalaka.
10. **UK & Ireland:** T: penny-farthing, tea clipper, hot-air balloon, cliff railway car.
    W: double-decker bus, black cab, narrowboat, steam locomotive, currach, jaunting car, milk
    float, hovercraft. (4 tall and 8 wide: tall vehicles are scarce. Levels has proved 4/8 deals.)

The catalogue (agreed with Levels): a top-level `souvenirPictures` array, kept out of the library,
each with `souvenir` (its trip, "t1"…"t10"), an id like `sv-t2-great-wave`, `bg` (its background
colour word, unique within the Souvenir; none on paintings and prints) and `credit` on museum works.
A `souvenirs` list holds each trip's `{ trip, theme, table, tableTitle, sticker }`, with the sticker
as a catalogue path, loaded through the packs like an item's cut-out.

**Copyright notes** (the lead's reading of the rules above, not legal advice):

- **Japan and France:** every artist died more than 70 years ago (Hokusai 1849, Hiroshige 1858,
  Van Gogh 1890, Seurat 1891, Caillebotte 1894, Pissarro 1903, Degas 1917, Renoir 1919, Monet and
  Cassatt 1926), and every work was published before 1931. Scans come only from the museums'
  own open-access pages, released as CC0, and each object page is checked at download. Each
  picture's credit goes in `docs/credits.md` and the catalogue.
  - The prints keep their printed title cartouches and seals as part of the work. They are
    cropped away where the card shape allows.
  - No Italian state collection, and no 20th-century artist still in copyright.
- **Italy:** drawn, generic types only (an orator, a bust, a river god). They are never a copy of
  a named work, and least of all one held in Italy (no David, no Capitoline Wolf, no Augustus of
  Prima Porta). Every figure is clothed or draped, and none is sacred or devotional. The fallback
  is the Met's own CC0 photos of its Roman pieces, cut out onto the colours.
- **Food, wildlife, ranch things, tango and transport:** generated and generic.
  - No brands, logos, packaging text or company colours.
  - No signature vehicle shapes: the bus is not a Routemaster, the cab not a specific model,
    and there is no Mini, Vespa or VW.
  - No weapons: no gaucho knife, no revolver.
  - People are candid, in profile or from behind.

**Cost estimate** (generation only; museum scans are free):

| What | Count | About |
| --- | --- | --- |
| Generated long pictures, 8 Souvenirs × 12, with ~15% redrawn | 96 | $5.00 |
| Tables, each with its card back | 10 | $1.20 |
| Stickers (transparent, die-cut look) | 10 | $0.50 |
| **Total** | | **about $6.70** |

Art is at $52.23 of a $55 cap, so this needs the cap raised to about **$60**.
