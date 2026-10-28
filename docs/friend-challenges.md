# Friend challenges

The creator's design (2026-10-28), after WordSnakes' (`../wordsnakes/src/friends.ts`). After
any board, the player can dare a friend to beat it. Unlike WordSnakes, whose challenge only
invites the friend to the game, here the friend plays the same board.

## For the player

- **On the win card**, after any trip board or daily (not boards 1–2's guided starts, not a
  replay of a challenge, not the dev menu's practice), there are two buttons:
  - **Challenge a friend** lists the player's Arcade friends. A tap asks the Arcade, which shows
    its own Send sheet, and the friend gets a card in their Arcade inbox. It shows only when the
    player's friend list has at least one friend, which hides it outside the Arcade, for guests
    (the SDK has no guest flag, and a test guest even holds Coins) and for a player with no
    friends yet. They get Share alone.
  - **Share** gives a link for anyone: the Arcade's share where it offers one, else the phone's
    share sheet, else a copy. The link names the board and the moves, never a player. On the
    Arcade's website it opens only once the game is released.
- **The words** come from templates in the game config. A challenge never expires, so a daily's
  names its date:
  - "I finished board {board} of Picture Passport in {moves} moves. Can you beat it?"
  - "I solved the daily puzzle of {date} in {moves} moves. Can you beat it?"
- **The friend**:
  - The game opens on a challenge card ("Kate's challenge: board 62, 35 moves to beat") with
    Play. Kate's name is the platform's (`challenge.from`), never a param. From a shared link it
    reads "A friend's challenge".
  - The board is a one-off, called a **sneak peek** when they haven't reached it (creator,
    2026-10-28). It unlocks nothing, moves no trip, stamps nothing and fills no suitcase. When
    they reach the board for real, it plays fresh and counts.
  - The destination's postcard still unfolds, with "You'll visit here on your France trip" for
    a place they haven't been.
  - Helpers work and spend from the player's own stock as usual. The card notes how many were used.
- **The result**: the win card compares the two ("You: 31 moves. Kate: 35. You win!"). There's a
  line for a tie or a loss too, and **Challenge back** sends the same board with the friend's own
  count. The platform never tells the sender the result.
- **No reward** (creator, 2026-10-28: just bragging). No Coins, no progress, and no claim to the
  server. Nothing to farm, and no server check.
- **A brand-new player** plays the guided first board first, then the challenge card.
- **A relaunch** brings the same challenge back (the platform reuses the launch). Once played,
  it's marked answered, and a replay of it says so.

## Who builds what

- **Server**: the two `friend_challenge_templates` (`beat_board`: board, moves, helpers;
  `beat_daily`: date, moves, helpers) and the `friend_action` analytics event with its
  dimensions (shared, challenge_sent, challenge_not_sent, opened_challenge, opened_share,
  challenge_won, challenge_lost). Config goes to dev before any client uses it. The checker is
  unchanged.
- **Gameplay**: a **one-off** play kind that opens any campaign board or dated daily by id
  outside progress. It is like the dev menu's practice, but it ships. Practice is stripped from
  a release build (`isPractice`), so this is its own kind, and `tools/no-dev-menu.mjs` must not
  flag it. It sends no claim, writes no save or progress, packs no suitcase item, and spends
  helpers normally.
- **UI**:
  - `src/net/friends.ts`, after WordSnakes': the friends list, `gem.friends.challenge` only
    from a press and never retried, `gem.share.request` synchronously from the press, the link
    fallback, `launchedChallenge()` at start, and `markAnswered`;
  - the win card's two buttons and the friends sheet;
  - the challenge card, the compare card and Challenge back;
  - the analytics calls and the English strings.
- **QA**: the real flow, on Dev inside the Arcade, with two of the organisation's test accounts
  who are friends (`parentSupports('friendChallenges')` is false anywhere else, the local host
  included). It sends both kinds, opens them, plays a sneak peek past the friend's progress, and
  checks that nothing is paid or saved.

Translations of the templates come at the release pass, with everything else.
