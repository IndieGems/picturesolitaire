// Re-proves every shipped board. Run: node tools/levels/check.mts [file ...]
// (default: every .json in src/content/levels). Exit code 0 = every board passes.
// A NEW level file (a lane) also goes in tools/art/packs.mjs LANES, or its
// pictures are never packed for the board (Art, cf9973b: lessons.json).
// trips.json is no boards file: it must be campaign-plan.mts TRIPS, one trip
// after another from board 1, covering every campaign board (trips may run
// past the boards made so far: a trip is planned before its boards are dealt).
//
// For each board:
//   - its pictures are in the catalogue at the same size, and the stacks hold
//     every card of every picture exactly once;
//   - DETERMINISM: the generator deals exactly these stacks from the board's
//     id and seed (src/game/levels/generate.ts, dealFor), so the same id and
//     seed give the same deal on every device;
//   - the opening has nothing joined or finished and is not a dead end;
//   - PROOF: the stored line, moves only (no undo, hint or shuffle), replays on
//     the real rules (src/game/rules.ts) to a won board;
//   - the solver agrees the deal is winnable (exact, not a timed guess), and the
//     axes stored with the board are what the deal measures;
//   - a board with a par: the par is the stored line's length (so the par is
//     always reachable, by that line);
//   - a daily board: its id is "d" + its date, and dates run one a day;
//   - no board uses a picture the creator flagged "don't use"
//     (src/content/picture-flags.json; node tools/levels/redeal.mts re-deals them);
//   - the campaign: no picture on two of its first boards (campaign-plan.mts
//     DISTINCT; AGENTS.md "Pictures rarely repeat");
//   - every stack shows card backs: peek 0 (creator, 2026-10-25);
//   - a destination (lead, 2026-10-25; lib.mts destinationOf): the board's
//     "destination" names a postcard of the board's size, its crop window fits
//     on it (and is the catalogue's crop when the entry has one), and the id is
//     in the pictures exactly once, at the window's shape (Art's `window`: 2x2
//     among squares, 2x1 or 1x2 on an all-long board); no other picture on the
//     board is of its lookalike family; no board deals a postcard as an
//     ordinary picture;
//   - the campaign: no landmark picture (Art's "landmark": true; a future
//     trip's destination);
//   - the mark players see: a campaign board's `mark` is its role's
//     (campaign-plan.mts MARKS), and no other board has one;
//   - the campaign's boards but its hard ones (campaign-plan.mts MAY_TRAP) and the
//     dev menu's experiment boards (experiments.json): a safe start
//     (AGENTS.md): every picture finishable from the opening can be finished
//     first without dooming the board, and no single move from the opening
//     leaves it stuck.
//   - READABLE (creator, 2026-10-27): an unmarked campaign board is won 85%
//     or more by a player who draws by the face-up cards (metrics.ts READER);
//     hard and super hard boards may still hide the way, but that player wins
//     a marked board 25% or more (CAREFUL): none walls a thinking player;
//   - a lesson board (lessons.json; make-lessons.mts), which opens stuck on
//     purpose: its own proof instead of "not a dead end" and "the solver can
//     win the deal" (checkLesson), and its line replays after its shuffle.
//   - THE DAILY SUITCASE (creator, 2026-10-27; docs/daily-suitcase.md): a daily
//     from daily-plan.mts SUITCASE_FROM carries its day's item (suitcases.json
//     `days`), an item picture of that month (Art's `items`) in its pictures
//     exactly once, 2x2 on a board of squares, with nothing beside it of its
//     family or sharing a word with it (lib.mts itemClash), and
//     its stored line finishes the item neither first nor last; that day is
//     also readable, starts safe, and holds no landmark and no picture from
//     before the clear ones. An item plays only as its day's item. And
//     suitcases.json is exactly what make-suitcases.mts writes (each month's
//     schedule seeded by the month alone; suitcase.mts scheduleProblem holds:
//     each item 2-4 times, none with all its days in one week, none back
//     within GAP days), month after month from FIRST_MONTH to the daily
//     pool's last month.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { arrange, cardsOf, isDeadEnd, isWon, joinCount, replay, start } from "../../src/game/rules.ts";
import { Game } from "../../src/game/solver/index.ts";
import { along, CAREFUL, careless, chain, orderTraps, READABLE, reader, traps, unavoidable, wait } from "../../src/game/solver/metrics.ts";
import { BIG, dealFor, deadFirstMoves, doomingFirstClears } from "../../src/game/levels/generate.ts";
import { byId, clearOrder, destById, flags, itemById, itemClash, LESSON_MOVES, souvenirById, souvenirPictures } from "./lib.mts";
import { CURRENT, DISTINCT, LAST_BEFORE_T9, MARKS, MAY_TRAP, SPACING, SPARES, TRIPS } from "./campaign-plan.mts";
import { FIRST as ATMOS_FIRST, isAtmospheric, MOST_BOARDS, shareOf, takesAtmospheric } from "./atmospheric.mts";
import { RULES_FROM, SUITCASE_FROM } from "./daily-plan.mts";
import { monthOf, monthsTo } from "./make-suitcases.mts";
import { scheduleProblem } from "./suitcase.mts";
import { SOUVENIR_BOARD, SOUVENIR_COUNT, souvenirId, souvenirOf } from "./make-souvenirs.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
// the library pictures and the destination postcards (lib.mts; PICTURES=<file> checks a trial catalogue)
const catalogue = byId;
/** Each library picture's place in the catalogue (the pictures after LAST_BEFORE_T9 are trips 9 and 10's new ones). */
const pictureOrder = new Map([...byId.keys()].map((id, k) => [id, k]));
const files = process.argv.slice(2);
const dir = join(root, "src/content/levels");
// trips.json and suitcases.json are no boards files (each is checked on its own below)
if (!files.length) for (const f of readdirSync(dir).sort()) if (f.endsWith(".json") && f !== "trips.json" && f !== "suitcases.json") files.push(join(dir, f));
// the Daily Suitcase's months (make-suitcases.mts): the day's item of each date
const suitcasesFile = join(dir, "suitcases.json");
const SUITCASES = existsSync(suitcasesFile) ? JSON.parse(readFileSync(suitcasesFile, "utf8")).months : [];
const itemOfDay = new Map(SUITCASES.flatMap((m) => Object.entries(m.days)));

// the campaign's first trip, for the lessons (a lesson's pictures are none of its boards')
const campaignFile = join(dir, "campaign.json");
const FIRST_TRIP = existsSync(campaignFile) ? JSON.parse(readFileSync(campaignFile, "utf8")).levels.slice(0, 15) : [];
/**
 * A lesson board's own proof (lead, 2026-10-27; make-lessons.mts). The Shuffle
 * lesson: the opening is a dead end (nothing can ever be finished) that the
 * solver calls lost, exactly; the stored shuffle is one the rules play on the
 * opening (arrange: only loose cards, at most MAX_SWAPS stack places); the
 * board after it is winnable, and the stored line (moves after the shuffle) is
 * a handful of moves; no picture of the first trip's boards, and no landmark.
 */
function checkLesson(l, deal, s, fail) {
  if (l.lesson !== "shuffle") return fail(`no proof for lesson ${l.lesson}`);
  if (!isDeadEnd(s)) fail("the Shuffle lesson must open stuck: a dead end");
  const g = new Game(s);
  if (g.wins(g.root)) fail("the solver can win the opening: the Shuffle lesson must open stuck");
  const after = l.shuffle && arrange(s, l.shuffle);
  if (!after) fail("its shuffle is no Shuffle the rules play on the opening (rules.ts arrange)");
  else {
    const g2 = new Game(after.state);
    if (!g2.wins(g2.root)) fail("the solver cannot win the board after its shuffle");
  }
  if (!(l.line.length >= 1 && l.line.length <= LESSON_MOVES)) fail(`${l.line.length} moves after the shuffle, the lesson takes 1-${LESSON_MOVES}`);
  for (const p of l.pictures) {
    const k = FIRST_TRIP.findIndex((b) => b.pictures.some((q) => q.id === p.id));
    if (k >= 0) fail(`${p.id} is on campaign board ${k + 1} (a lesson takes none from boards 1-15)`);
    if (catalogue.get(p.id)?.landmark) fail(`${p.id} is a landmark`);
  }
}

let boards = 0;
let failed = 0;
const flaggedUses = [];
for (const id of flags.keys()) if (!catalogue.has(id)) console.warn(`picture-flags.json flags ${id}, which is not in the catalogue`);
for (const file of files) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  const ids = new Set();
  let lastDate = null;
  for (const l of data.levels) {
    boards++;
    const problems = [];
    const fail = (msg) => problems.push(msg);
    try {
      if (ids.has(l.id)) fail("id used twice");
      ids.add(l.id);
      if (l.peek !== 0) fail(`peek ${l.peek}: every stack shows card backs, peek 0 (AGENTS.md)`);
      const markWant = file.endsWith("campaign.json") ? MARKS[l.axes?.role] : undefined;
      if (l.mark !== markWant) fail(`mark ${l.mark ?? "none"}, but a ${file.endsWith("campaign.json") ? `${l.axes?.role} board` : "board outside the campaign"} takes ${markWant ?? "none"}`);
      if (l.par !== undefined && l.par !== l.line.length) fail(`par ${l.par} but the line has ${l.line.length} moves`);
      if (l.date !== undefined) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(l.date) || l.id !== `d${l.date}`) fail(`date ${l.date} and id ${l.id} do not match`);
        const next = lastDate && new Date(Date.parse(lastDate + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);
        if (lastDate && l.date !== next) fail(`date ${l.date} does not follow ${lastDate}`);
        lastDate = l.date;
      }
      if (l.destination !== undefined) {
        const { id, crop } = l.destination;
        const d = destById.get(id);
        const on = l.pictures.filter((p) => p.id === id);
        if (!d) fail(`destination ${id} is no postcard in the catalogue`);
        else if (d.cols !== l.cols || d.rows !== l.rows) fail(`destination ${id} is a ${d.cols}x${d.rows} postcard on a ${l.cols}x${l.rows} board`);
        const [ww, wh] = d?.window ?? [2, 2];
        const others = l.pictures.filter((p) => p.id !== id);
        if (on.length !== 1) fail(`destination ${id} is in the pictures ${on.length} times, not once`);
        else if (on[0].cols !== ww || on[0].rows !== wh) fail(`destination ${id} plays as ${on[0].cols}x${on[0].rows}, its window is ${ww}x${wh}`);
        // a board is all squares or all long (AGENTS.md), its destination's window too
        else if (others.some((p) => p.cols * p.rows !== ww * wh)) fail(`destination ${id}'s ${ww}x${wh} window is not the shape of the board's other pictures`);
        else if (d && !(Array.isArray(crop) && crop.length === 2 && crop.every(Number.isInteger) && crop[0] >= 0 && crop[1] >= 0 && crop[0] + on[0].cols <= d.cols && crop[1] + on[0].rows <= d.rows)) fail(`destination ${id}: crop ${JSON.stringify(crop)} does not fit the postcard`);
        // lookalikes never share a board: Art gives a postcard its lookalike's family (Delicate Arch, Sandstone Arch's)
        const fam = d?.family ?? id;
        const twin = others.find((p) => (catalogue.get(p.id)?.family ?? p.id) === fam);
        if (twin) fail(`destination ${id} looks like ${twin.id} (family ${fam}), on the same board`);
        if (d?.crop && JSON.stringify(d.crop) !== JSON.stringify(crop)) fail(`destination ${id}: crop ${JSON.stringify(crop)}, the catalogue's is ${JSON.stringify(d.crop)} (re-run the maker)`);
      }
      // a SOUVENIR (creator, 2026-10-28; docs/souvenirs.md; make-souvenirs.mts): trip tN's bonus board sN,
      // dealt from exactly its own pictures (Art's souvenirPictures; so stand-ins never ship), all long, on
      // its board size, no two of the same background colour; readable with a safe start (below). The
      // look-alike rule is waived: one style and one theme on purpose
      const souvenirBoard = file.endsWith("souvenirs.json");
      if (souvenirBoard) {
        const trip = TRIPS.find((t) => t.id === l.trip);
        if (!trip) fail(`trip ${l.trip ?? "none"} is no trip of trips.json`);
        else if (l.id !== souvenirId(trip.id)) fail(`a Souvenir of ${trip.id} is ${souvenirId(trip.id)}, not ${l.id}`);
        if (l.axes?.role !== "souvenir") fail(`role ${l.axes?.role}, a Souvenir's is "souvenir"`);
        if (l.destination || l.mark || l.item) fail("a Souvenir has no destination, mark or item");
        if (l.cols !== SOUVENIR_BOARD.cols || l.rows !== SOUVENIR_BOARD.rows) fail(`a ${l.cols}x${l.rows} board; a Souvenir is ${SOUVENIR_BOARD.cols}x${SOUVENIR_BOARD.rows}`);
        if (l.pictures.length < SOUVENIR_COUNT[0] || l.pictures.length > SOUVENIR_COUNT[1]) fail(`${l.pictures.length} pictures; a Souvenir takes ${SOUVENIR_COUNT.join(" to ")}`);
        if (l.pictures.some((p) => p.cols * p.rows !== 2)) fail("a Souvenir is all long pictures (tall 1x2 and wide 2x1)");
        const own = trip ? souvenirOf(trip.id).map((p) => p.id).sort() : [];
        if (JSON.stringify(l.pictures.map((p) => p.id).sort()) !== JSON.stringify(own)) fail(`its pictures are not exactly ${l.trip}'s Souvenir pictures (pictures.json souvenirPictures${own.length ? "" : ": none yet"}; a stand-in never ships): re-run make-souvenirs.mts`);
        const bgs = l.pictures.map((p) => souvenirById.get(p.id)?.bg).filter(Boolean);
        const twice = bgs.find((b, k) => bgs.indexOf(b) !== k);
        if (twice) fail(`two pictures on the background colour ${twice} (Art: never two alike on a board)`);
      }
      // the Daily Suitcase: a daily from SUITCASE_FROM hides its day's item (daily-plan.mts, make-daily.mts)
      const suitcaseDay = l.date !== undefined && l.date >= SUITCASE_FROM;
      // and a daily from RULES_FROM (28-31 October with no item) is made under the same rules
      const rulesDay = l.date !== undefined && l.date >= RULES_FROM;
      if (l.item !== undefined && !suitcaseDay) fail(`an item on a board that is no daily from ${SUITCASE_FROM}`);
      if (rulesDay) {
        if (l.pictures.some((p) => p.cols !== 2 || p.rows !== 2)) fail("a daily from RULES_FROM is a board of squares only (AGENTS.md: all 2x2 or all long; an item is a 2x2)");
        for (const p of l.pictures) {
          if (catalogue.get(p.id)?.landmark) fail(`${p.id} is a landmark`);
          if (CURRENT.has(p.id)) fail(`${p.id} is from before the clear pictures (campaign-plan.mts CURRENT)`);
          if (SPARES.has(p.id) || (catalogue.has(p.id) && pictureOrder.get(p.id) > pictureOrder.get(LAST_BEFORE_T9))) fail(`${p.id} is one of trips 9 and 10's new pictures or spares, kept new to the campaign`);
        }
      }
      if (suitcaseDay) {
        const want = itemOfDay.get(l.date);
        const id = l.item?.id;
        if (!want) fail(`no item for ${l.date} in suitcases.json (node tools/levels/make-suitcases.mts)`);
        else if (id !== want) fail(`item ${id ?? "none"}, the day's item is ${want} (suitcases.json)`);
        const it = id && itemById.get(id);
        if (id && !it) fail(`item ${id} is not in the catalogue's items`);
        if (it && it.month !== l.date.slice(0, 7)) fail(`item ${id} is ${it.month}'s, the day is ${l.date}`);
        const times = l.pictures.filter((p) => p.id === id).length;
        if (times !== 1) fail(`item ${id} is in the pictures ${times} times, not once`);
        // nothing beside the item looks like it or shares a word with it (lib.mts itemClash; make-daily.mts swaps one out in place)
        if (it) for (const p of l.pictures) if (p.id !== id && itemClash(it, catalogue.get(p.id) ?? p)) fail(`${p.id} clashes with item ${id} (${itemClash(it, catalogue.get(p.id) ?? p)}): run make-daily.mts, which swaps it out in place`);
        if (times === 1) {
          const order = clearOrder(l);
          const at = order.indexOf(l.pictures.findIndex((p) => p.id === id));
          if (!(at > 0 && at < order.length - 1)) fail(`the stored line finishes item ${id} ${at === 0 ? "first" : at < 0 ? "never" : "last"}; it opens mid-board`);
        }
      }
      for (const p of l.pictures) {
        if (flags.has(p.id)) {
          const note = flags.get(p.id).note;
          fail(`uses flagged picture ${p.id}`);
          flaggedUses.push({ board: l.id, line: `board ${l.id} uses flagged picture ${p.id}${note ? ` ("${note}")` : ""}` });
        }
        // a Souvenir's picture plays only on its own Souvenir (checked below)
        if (souvenirById.has(p.id)) {
          const sv = souvenirById.get(p.id);
          if (!file.endsWith("souvenirs.json") || l.trip !== sv.souvenir) fail(`${p.id} is ${sv.souvenir}'s Souvenir picture, dealt here on ${l.id}`);
          if (sv.cols !== p.cols || sv.rows !== p.rows) fail(`${p.id} is ${sv.cols}x${sv.rows} in the catalogue, ${p.cols}x${p.rows} here`);
          continue;
        }
        // a suitcase item plays only as its daily's item (checked above)
        if (itemById.has(p.id)) {
          if (l.item?.id !== p.id) fail(`item ${p.id} is dealt as an ordinary picture, not as the day's item`);
          if (p.cols !== 2 || p.rows !== 2) fail(`item ${p.id} plays as ${p.cols}x${p.rows}, an item is 2x2`);
          continue;
        }
        // a postcard plays only as its board's destination (its size is checked above)
        if (destById.has(p.id)) {
          if (l.destination?.id !== p.id) fail(`postcard ${p.id} is dealt as an ordinary picture, not as the board's destination`);
          continue;
        }
        const c = catalogue.get(p.id);
        if (!c) fail(`no picture ${p.id} in the catalogue`);
        else if (c.cols !== p.cols || c.rows !== p.rows) fail(`${p.id} is ${c.cols}x${c.rows} in the catalogue, ${p.cols}x${p.rows} here`);
      }
      const want = l.pictures.flatMap((_, i) => cardsOf(l.pictures, i)).sort((a, b) => a - b);
      const have = l.stacks.flat().sort((a, b) => a - b);
      if (want.join() !== have.join()) fail("the stacks do not hold every card exactly once");
      const deal = { cols: l.cols, rows: l.rows, pictures: l.pictures, stacks: l.stacks, seed: l.seed };
      const again = dealFor({ id: l.id, cols: l.cols, rows: l.rows, pictures: l.pictures, targets: {} }, l.seed);
      if (JSON.stringify(again.stacks) !== JSON.stringify(l.stacks)) fail("the generator does not deal these stacks from this id and seed");
      const s = start(deal).state;
      if (s.cleared.length || joinCount(s) > 0) fail("something is joined or finished at the opening");
      // a lesson board (lessons.json) opens stuck on purpose and has a lesson's own proof (checkLesson)
      if (file.endsWith("lessons.json") !== (l.lesson !== undefined)) fail(l.lesson === undefined ? "a board in lessons.json with no lesson" : `a lesson board (${l.lesson}) outside lessons.json`);
      if (l.lesson !== undefined) checkLesson(l, deal, s, fail);
      else if (isDeadEnd(s)) fail("the opening is a dead end");
      // a landmark (Art's "landmark": true) waits for its trip's destination: none on a campaign board (lead, 2026-10-25)
      if (file.endsWith("campaign.json")) for (const p of l.pictures) if (catalogue.get(p.id)?.landmark) fail(`${p.id} is a landmark, saved for a future trip's destination (make-campaign.mts swaps it out in place)`);
      // pictures rarely repeat: none on two of campaign boards 1-DISTINCT
      if (file.endsWith("campaign.json") && data.levels.indexOf(l) < DISTINCT) {
        for (const p of l.pictures) {
          const k = data.levels.slice(0, data.levels.indexOf(l)).findIndex((e) => e.pictures.some((q) => q.id === p.id));
          if (k >= 0) fail(`${p.id} is on board ${data.levels[k].id} too (no picture is on two of boards 1-${DISTINCT})`);
        }
      }
      // atmospheric pictures (creator, 2026-10-28; atmospheric.mts): from board ATMOS_FIRST + 1, a board with
      // squares holds 1 in 8 to 1 in 6 of its pictures atmospheric (rounded, at least one), none back within
      // SPACING boards; boards before take none or a few, an all-long board none (it has no squares)
      if (file.endsWith("campaign.json")) {
        const i = data.levels.indexOf(l);
        const atmos = l.pictures.filter((p) => isAtmospheric(catalogue.get(p.id)));
        const { lo, hi } = shareOf(l.pictures.length);
        if (takesAtmospheric(l, i) && (atmos.length < lo || atmos.length > hi)) fail(`${atmos.length} atmospheric of ${l.pictures.length} pictures; its share is ${lo === hi ? lo : `${lo} to ${hi}`} (make-campaign.mts swaps them in: Art's look "atmospheric")`);
        if (!takesAtmospheric(l, i) && atmos.length > (i < ATMOS_FIRST ? hi : 0)) fail(`${atmos.length} atmospheric pictures on a board that takes ${i < ATMOS_FIRST ? `at most ${hi}` : "none"}`);
        for (const p of atmos) {
          if (p.cols !== 2 || p.rows !== 2) fail(`atmospheric ${p.id} plays as ${p.cols}x${p.rows}: they are squares`);
          const back = data.levels.slice(Math.max(0, i - SPACING + 1), i).findIndex((e) => e.pictures.some((q) => q.id === p.id));
          if (back >= 0) fail(`atmospheric ${p.id} is back within ${SPACING} boards (on ${data.levels[Math.max(0, i - SPACING + 1) + back].id} too)`);
          const on = data.levels.filter((e) => e.pictures.some((q) => q.id === p.id)).length;
          if (on > MOST_BOARDS && data.levels.findIndex((e) => e.pictures.some((q) => q.id === p.id)) === i) fail(`atmospheric ${p.id} is on ${on} boards, at most ${MOST_BOARDS}`);
        }
      }
      if ((file.endsWith("campaign.json") && !MAY_TRAP.has(l.axes?.role)) || file.endsWith("experiments.json") || rulesDay || souvenirBoard) {
        const dead = deadFirstMoves(deal);
        if (dead.length) fail(`${dead.length} first move(s) leave the board stuck, e.g. ${dead[0].from} to ${dead[0].to}`);
        const g0 = new Game(s);
        const doom = doomingFirstClears(g0);
        if (doom.length) fail(`finishing ${doom.map((st) => `${l.pictures[st.pic].id} at column ${st.col}`).join(", ")} first dooms the board`);
      }
      const line = l.line.map(([from, to]) => ({ from, to }));
      let won = false;
      try {
        // a Shuffle lesson's line is the moves after its stored shuffle
        won = isWon(replay(deal, l.lesson === "shuffle" && l.shuffle ? [l.shuffle, ...line] : line));
      } catch (err) {
        fail(`the line breaks: ${err.message}`);
      }
      if (!won) fail("the line does not win");
      const game = new Game(s);
      if (l.lesson === undefined && !game.wins(game.root)) fail("the solver says the deal cannot be won");
      // readable (creator, 2026-10-27): an unmarked campaign board is one a player who draws by the
      // face-up cards wins READABLE or more of the time (metrics.ts READER; it assumes the next card
      // face up). The challenge route and the daily are not held to it (docs/difficulty-curve.md)
      if ((file.endsWith("campaign.json") && !MAY_TRAP.has(l.axes?.role)) || rulesDay || souvenirBoard) {
        const rd = reader(game);
        if (rd < READABLE) fail(`not readable: a player who draws by the face-up cards wins ${Math.round(rd * 100)}%, under ${READABLE * 100}% (make-campaign.mts --reseat ${data.levels.indexOf(l) + 1})`);
      }
      // and a marked campaign board does not wall a thinking player: that reader wins CAREFUL (1 in 4) or more
      if (file.endsWith("campaign.json") && MAY_TRAP.has(l.axes?.role)) {
        const rd = reader(game);
        if (rd < CAREFUL) fail(`walls a careful player: a player who draws by the face-up cards wins ${Math.round(rd * 1000) / 10}%, under ${CAREFUL * 100}% (make-campaign.mts --reseat ${data.levels.indexOf(l) + 1})`);
      }
      if (l.axes && won) {
        const a = l.axes;
        const ch = chain(game);
        const cl = Math.round(careless(game) * 1000) / 1000;
        const tr = traps(game, along(game, deal, line));
        if (a.chain !== ch) fail(`chain is ${ch}, the data says ${a.chain}`);
        if (Math.abs(a.careless - cl) > 0.001) fail(`careless win is ${cl}, the data says ${a.careless}`);
        if (a.traps !== tr) fail(`traps are ${tr}, the data says ${a.traps}`);
        if (a.peek !== l.peek) fail("axes.peek differs from peek");
        if (a.lineMoves !== l.line.length) fail("axes.lineMoves differs from the line");
        if (a.bigWait !== undefined) {
          const w = wait(game);
          const bw = Math.max(0, ...l.pictures.map((p, i) => (p.cols * p.rows >= BIG ? w[i] : 0)));
          if (a.bigWait !== bw) fail(`big wait is ${bw}, the data says ${a.bigWait}`);
        }
        if (a.orderTraps !== undefined && a.orderTraps !== unavoidable(game, "clear")) fail(`order traps are ${unavoidable(game, "clear")}, the data says ${a.orderTraps}`);
        if (a.lineOrderTraps !== undefined && a.lineOrderTraps !== orderTraps(game, along(game, deal, line))) fail("line order traps differ");
      }
    } catch (err) {
      fail(`check crashed: ${err.stack}`);
    }
    if (problems.length) {
      failed++;
      console.error(`FAIL ${l.id}: ${problems.join("; ")}`);
    }
  }
}
if (flaggedUses.length)
  console.error(
    `\nPictures flagged "don't use" are on ${new Set(flaggedUses.map((u) => u.board)).size} board(s):\n  ${flaggedUses.map((u) => u.line).join("\n  ")}\n` +
      `Re-deal them, keeping every other board as it is: node tools/levels/redeal.mts\n`,
  );
// the Daily Suitcase's months: exactly what make-suitcases.mts writes, from FIRST_MONTH to the pool's last month
const dailyFile = join(dir, "daily.json");
if (!process.argv.slice(2).length && existsSync(dailyFile)) {
  const pool = JSON.parse(readFileSync(dailyFile, "utf8")).levels;
  const bad = [];
  const last = pool.at(-1)?.date.slice(0, 7);
  const want = last && last >= SUITCASE_FROM.slice(0, 7) ? monthsTo(last) : [];
  if (JSON.stringify(SUITCASES.map((m) => m.month)) !== JSON.stringify(want)) bad.push(`its months are ${SUITCASES.map((m) => m.month).join(", ") || "none"}, the daily pool needs ${want.join(", ") || "none"}`);
  for (const m of SUITCASES) {
    const problem = scheduleProblem(m.month, Object.values(m.days));
    if (problem) bad.push(`${m.month}: ${problem}`);
    if (JSON.stringify(m) !== JSON.stringify(monthOf(m.month))) bad.push(`${m.month} is not what make-suitcases.mts writes (re-run it: Art's themes, titles or the schedule changed)`);
  }
  if (bad.length) {
    failed++;
    console.error(`FAIL suitcases.json: ${bad.join("; ")}`);
  } else if (SUITCASES.length) console.log(`suitcases: ${SUITCASES.length} months, ${SUITCASES[0].month} to ${SUITCASES.at(-1).month}${SUITCASES.some((m) => m.standIn) ? ` (stand-ins: ${SUITCASES.filter((m) => m.standIn).map((m) => m.month).join(", ")})` : ""}`);
}
// the Souvenirs: every trip whose Souvenir pictures Art has made has its board (make-souvenirs.mts)
if (!process.argv.slice(2).length && souvenirPictures.length) {
  const file = join(dir, "souvenirs.json");
  const made = existsSync(file) ? new Set(JSON.parse(readFileSync(file, "utf8")).levels.map((l) => l.trip)) : new Set();
  const trips = [...new Set(souvenirPictures.map((p) => p.souvenir))];
  const missing = trips.filter((t) => !made.has(t));
  const stray = trips.filter((t) => !TRIPS.some((x) => x.id === t));
  if (missing.length || stray.length) {
    failed++;
    console.error(`FAIL souvenirs.json: ${[missing.length ? `no Souvenir board for ${missing.join(", ")} (node tools/levels/make-souvenirs.mts)` : "", stray.length ? `Souvenir pictures of ${stray.join(", ")}, no trip of trips.json` : ""].filter(Boolean).join("; ")}`);
  } else console.log(`souvenirs: ${made.size} boards (${[...made].join(", ")})`);
}
// the trips: the plan's list, back to back from board 1, every campaign board in one
const tripsFile = join(dir, "trips.json");
if (!process.argv.slice(2).length && existsSync(tripsFile)) {
  const trips = JSON.parse(readFileSync(tripsFile, "utf8")).trips;
  const made = JSON.parse(readFileSync(join(dir, "campaign.json"), "utf8")).levels.length;
  const bad = [];
  if (JSON.stringify(trips) !== JSON.stringify(TRIPS)) bad.push("it is not campaign-plan.mts TRIPS (node tools/levels/make-trips.mts)");
  trips.forEach((t, k) => {
    if (t.from !== (k ? trips[k - 1].to + 1 : 1) || !(t.to >= t.from)) bad.push(`trip ${t.id} runs ${t.from}-${t.to}, not on from the trip before`);
  });
  if (new Set(trips.map((t) => t.id)).size !== trips.length) bad.push("two trips share an id");
  if (trips.length && trips.at(-1).to < made) bad.push(`the trips end at board ${trips.at(-1).to}, the campaign has ${made}`);
  if (bad.length) {
    failed++;
    console.error(`FAIL trips.json: ${bad.join("; ")}`);
  } else console.log(`trips: ${trips.map((t) => `${t.name} ${t.from}-${t.to}`).join(", ")}`);
}
console.log(failed ? `${failed} of ${boards} boards FAILED` : `all ${boards} boards proved: each line wins on the real rules with no helpers`);
process.exitCode = failed ? 1 : 0;
