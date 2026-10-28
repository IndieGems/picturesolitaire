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
