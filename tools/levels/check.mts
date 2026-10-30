// Re-proves every shipped board. Run: node tools/levels/check.mts [--full] [file ...]
// (default: every .json in src/content/levels). Exit code 0 = every board passes.
//
// REMEMBERED PROOFS (lead, 2026-10-28: the solver's proofs were 30 s of a 43 s build). The checks
// that run the solver (the deal can be won, the safe start, readable or careful, the axes it
// measures, a lesson's own) are remembered by content hash in node_modules/.cache/levels-check/,
// outside git and the build. The hash covers the board's own data (all of it: deal, stacks, line,
// pictures, axes), which of those checks it takes, and the source of the code they run: this file,
// src/game/rules.ts, src/game/solver/, src/game/levels/generate.ts and every file those import (by
// relative path; PROOF_CODE). A changed board re-proves only itself; a change to any of that code
// re-proves every board. Every other check (the pictures, spacing, flags, items, shares, the line
// replayed on the rules, the deal re-dealt from its seed) runs on every build. A missing or broken
// cache only means every board is proved again. --full proves every board afresh and remembers
// nothing from before: `npm run build:release` passes it, so a release build (and the release
// checklist, which builds one) never leans on a remembered proof. A check that runs the solver
// reads only the board and that code (prove(), below): keep it so, or add what it reads to the key.
// A long proving run drops to below-normal priority (AGENTS.md: the machine is shared).
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
//     (src/content/picture-flags.json; node tools/levels/redeal.mts re-deals them):
//     a FAILURE in a release build (--full), only a loud WARNING in an everyday
//     one (lead, 2026-10-30: the creator flags in the library while playing, and
//     each flag on a used picture stopped their Play build), so a flagged picture
//     never ships but never blocks a build in between;
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
//   - THE EVENTS (creator, 2026-10-30; docs/vip.md, docs/daily-suitcase.md):
//     a daily on one of an event's days carries that day's item (events.json
//     `days`) in its pictures exactly once, 2x2 on a board of squares, with
//     nothing beside it of its family or sharing a word with it (lib.mts
//     itemClash), and its stored line finishes the item neither first nor
//     last; a daily on no event's day carries no item. A daily from
//     daily-plan.mts RULES_FROM is readable, starts safe, and holds no
//     landmark and no picture from before the clear ones. An item plays only
//     as its day's item. And events.json is exactly what make-events.mts
//     writes from events-plan.json (in start order, never overlapping, an
//     item in one event only; each event's schedule seeded by its id alone,
//     events.mts eventProblem holding: 14 days, each item at least twice and
//     in both weeks, its days at least APART apart), every day of it a daily
//     of the pool from RULES_FROM. (suitcases.json, the monthly schedule it
//     replaced, stays for Server's readers until Server drops it, unchecked.)
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { constants as osConstants, setPriority } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { arrange, cardsOf, isDeadEnd, isWon, joinCount, replay, start } from "../../src/game/rules.ts";
import { Game } from "../../src/game/solver/index.ts";
import { along, CAREFUL, careless, chain, orderTraps, READABLE, reader, traps, unavoidable, wait } from "../../src/game/solver/metrics.ts";
import { BIG, dealFor, deadFirstMoves, doomingFirstClears } from "../../src/game/levels/generate.ts";
import { byId, clearOrder, destById, flags, itemById, itemClash, LESSON_MOVES, souvenirById, souvenirPictures } from "./lib.mts";
import { CURRENT, DISTINCT, LAST_BEFORE_T9, MARKS, MAY_TRAP, SPACING, SPARES, TRIPS } from "./campaign-plan.mts";
import { FIRST as ATMOS_FIRST, isAtmospheric, MOST as ATMOS_MOST, MOST_BOARDS, shareOf, takesAtmospheric } from "./atmospheric.mts";
import { RULES_FROM } from "./daily-plan.mts";
import { eventOf, eventProblem, PLAN as EVENT_PLAN, planProblem } from "./events.mts";
import { SOUVENIR_BOARD, SOUVENIR_COUNT, souvenirId, souvenirOf } from "./make-souvenirs.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
// the library pictures and the destination postcards (lib.mts; PICTURES=<file> checks a trial catalogue)
const catalogue = byId;
/** Each library picture's place in the catalogue (the pictures after LAST_BEFORE_T9 are trips 9 and 10's new ones). */
const pictureOrder = new Map([...byId.keys()].map((id, k) => [id, k]));
const args = process.argv.slice(2);
/** --full: prove every board afresh, remembering nothing (npm run build:release) */
const FULL = args.includes("--full");
const unknown = args.filter((a) => a.startsWith("--") && a !== "--full");
if (unknown.length) {
  console.error(`unknown option ${unknown.join(" ")} (check.mts [--full] [file ...])`);
  process.exit(2);
}
const files = args.filter((a) => !a.startsWith("--"));
/** No files named: every boards file, and the checks across files (events, souvenirs, trips) */
const ALL = !files.length;
const dir = join(root, "src/content/levels");
// trips.json, events.json and suitcases.json are no boards files (trips and events are checked on their own below)
const NOT_BOARDS = new Set(["trips.json", "events.json", "suitcases.json"]);
if (ALL) for (const f of readdirSync(dir).sort()) if (f.endsWith(".json") && !NOT_BOARDS.has(f)) files.push(join(dir, f));
// the VIP events (make-events.mts): the day's item of each date in an event
const eventsFile = join(dir, "events.json");
const EVENTS = existsSync(eventsFile) ? JSON.parse(readFileSync(eventsFile, "utf8")).events : [];
const itemOfDay = new Map(EVENTS.flatMap((e) => Object.entries(e.days)));

// the campaign's first trip, for the lessons (a lesson's pictures are none of its boards')
const campaignFile = join(dir, "campaign.json");
const FIRST_TRIP = existsSync(campaignFile) ? JSON.parse(readFileSync(campaignFile, "utf8")).levels.slice(0, 15) : [];
/**
 * A lesson board's own proof (lead, 2026-10-27; make-lessons.mts). The Shuffle
 * lesson: the opening is a dead end (nothing can ever be finished) that the
 * solver calls lost, exactly (proveLesson); the stored shuffle is one the rules
 * play on the opening (arrange: only loose cards, at most MAX_SWAPS stack
 * places); the board after it is winnable (proveLesson), and the stored line
 * (moves after the shuffle) is a handful of moves; no picture of the first
 * trip's boards, and no landmark.
 */
function checkLesson(l, s, fail) {
  if (l.lesson !== "shuffle") return fail(`no proof for lesson ${l.lesson}`);
  if (!isDeadEnd(s)) fail("the Shuffle lesson must open stuck: a dead end");
  if (!(l.shuffle && arrange(s, l.shuffle))) fail("its shuffle is no Shuffle the rules play on the opening (rules.ts arrange)");
  if (!(l.line.length >= 1 && l.line.length <= LESSON_MOVES)) fail(`${l.line.length} moves after the shuffle, the lesson takes 1-${LESSON_MOVES}`);
  for (const p of l.pictures) {
    const k = FIRST_TRIP.findIndex((b) => b.pictures.some((q) => q.id === p.id));
    if (k >= 0) fail(`${p.id} is on campaign board ${k + 1} (a lesson takes none from boards 1-15)`);
    if (catalogue.get(p.id)?.landmark) fail(`${p.id} is a landmark`);
  }
}
/** The solver's half of a lesson's proof (remembered: prove). */
function proveLesson(l, s, fail) {
  if (l.lesson !== "shuffle") return;
  const g = new Game(s);
  if (g.wins(g.root)) fail("the solver can win the opening: the Shuffle lesson must open stuck");
  const after = l.shuffle && arrange(s, l.shuffle);
  if (after) {
    const g2 = new Game(after.state);
    if (!g2.wins(g2.root)) fail("the solver cannot win the board after its shuffle");
  }
}

/**
 * The checks that run the solver, the ones remembered (the header's REMEMBERED PROOFS). They read
 * only the board `l` (`deal`, `s`, `line` and `won` are made from it; `n` is its number, for the
 * message) and `takes` (which of them the board takes), through the code PROOF_CODE names, so the
 * proof key covers everything they depend on. Keep it so.
 */
function prove(l, takes, deal, s, line, won, n, fail) {
  if (l.lesson !== undefined) proveLesson(l, s, fail);
  if (takes.safe) {
    const dead = deadFirstMoves(deal);
    if (dead.length) fail(`${dead.length} first move(s) leave the board stuck, e.g. ${dead[0].from} to ${dead[0].to}`);
    const g0 = new Game(s);
    const doom = doomingFirstClears(g0);
    if (doom.length) fail(`finishing ${doom.map((st) => `${l.pictures[st.pic].id} at column ${st.col}`).join(", ")} first dooms the board`);
  }
  const game = new Game(s);
  if (l.lesson === undefined && !game.wins(game.root)) fail("the solver says the deal cannot be won");
  // readable (creator, 2026-10-27): an unmarked campaign board is one a player who draws by the
  // face-up cards wins READABLE or more of the time (metrics.ts READER; it assumes the next card
  // face up). The challenge route and the daily are not held to it (docs/difficulty-curve.md)
  if (takes.readable) {
    const rd = reader(game);
    if (rd < READABLE) fail(`not readable: a player who draws by the face-up cards wins ${Math.round(rd * 100)}%, under ${READABLE * 100}% (make-campaign.mts --reseat ${n})`);
  }
  // and a marked campaign board does not wall a thinking player: that reader wins CAREFUL (1 in 4) or more
  if (takes.careful) {
    const rd = reader(game);
    if (rd < CAREFUL) fail(`walls a careful player: a player who draws by the face-up cards wins ${Math.round(rd * 1000) / 10}%, under ${CAREFUL * 100}% (make-campaign.mts --reseat ${n})`);
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
}

// the remembered proofs (the header's REMEMBERED PROOFS)
const CACHE = join(root, "node_modules/.cache/levels-check/proofs.json");
/** At most this many kept: this run's, then the newest from before (another branch's boards, say). */
const CACHE_KEEP = 4000;
/** The code prove() runs: these, with this file and every file they import by a relative path. */
const PROOF_CODE = ["src/game/rules.ts", "src/game/levels/generate.ts", ...readdirSync(join(root, "src/game/solver")).filter((f) => /\.[cm]?[jt]s$/.test(f)).map((f) => `src/game/solver/${f}`)];
const IMPORTS = /\bfrom\s*["'](\.\.?\/[^"']+)["']|\bimport\s*\(?\s*["'](\.\.?\/[^"']+)["']/g;
/** One hash of the source of the code prove() runs (this file's own imports are the other checks': not followed). */
function codeHash() {
  const self = resolve(fileURLToPath(import.meta.url));
  const seen = new Set([self]);
  const todo = PROOF_CODE.map((f) => resolve(root, f));
  while (todo.length) {
    const f = todo.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    if (!existsSync(f)) continue;
    for (const m of readFileSync(f, "utf8").matchAll(IMPORTS)) todo.push(resolve(dirname(f), m[1] ?? m[2]));
  }
  const h = createHash("sha256");
  for (const f of [...seen].sort()) h.update(`${relative(root, f).replaceAll("\\", "/")}\n`).update(existsSync(f) ? readFileSync(f) : "(missing)").update("\n");
  return h.digest("hex");
}
const CODE = codeHash();
/** The key of a board's proofs: the code, which proofs it takes and the board's own data. */
const proofKey = (takes, l) => createHash("sha256").update(`${CODE}\n${JSON.stringify({ takes, board: l })}`).digest("hex").slice(0, 40);
/** The proofs remembered from before; anything unreadable is nothing remembered. */
function readCache() {
  try {
    const c = JSON.parse(readFileSync(CACHE, "utf8"));
    if (c?.v === 1 && Array.isArray(c.proofs)) return new Set(c.proofs.filter((k) => typeof k === "string"));
  } catch {
    // missing or broken: prove everything
  }
  return new Set();
}
function writeCache(kept, earlier) {
  const proofs = [...kept, ...[...earlier].filter((k) => !kept.has(k))].slice(0, CACHE_KEEP);
  const tmp = `${CACHE}.${process.pid}.tmp`;
  try {
    mkdirSync(dirname(CACHE), { recursive: true });
    writeFileSync(tmp, JSON.stringify({ v: 1, note: "boards proved by tools/levels/check.mts, by content hash; delete it to prove every board again", proofs }));
    renameSync(tmp, CACHE);
  } catch (err) {
    rmSync(tmp, { force: true });
    console.warn(`could not remember the proofs (${err.message}); the next run proves every board again`);
  }
}
const earlier = readCache();
const remembered = FULL ? new Set() : earlier;
/** This run's passing proofs, remembered for the next. */
const kept = new Set();
let proved = 0;
let recalled = 0;

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
      // the events: a daily on an event's day hides its day's item (events.json; make-daily.mts)
      const eventDay = l.date !== undefined && itemOfDay.has(l.date);
      // and every daily from RULES_FROM is made under today's rules, with an item or without
      const rulesDay = l.date !== undefined && l.date >= RULES_FROM;
      if (l.item !== undefined && !eventDay) fail(`an item on a board that is on no event's day (events.json)`);
      if (rulesDay) {
        if (l.pictures.some((p) => p.cols !== 2 || p.rows !== 2)) fail("a daily from RULES_FROM is a board of squares only (AGENTS.md: all 2x2 or all long; an item is a 2x2)");
        for (const p of l.pictures) {
          if (catalogue.get(p.id)?.landmark) fail(`${p.id} is a landmark`);
          if (CURRENT.has(p.id)) fail(`${p.id} is from before the clear pictures (campaign-plan.mts CURRENT)`);
          if (SPARES.has(p.id) || (catalogue.has(p.id) && pictureOrder.get(p.id) > pictureOrder.get(LAST_BEFORE_T9))) fail(`${p.id} is one of trips 9 and 10's new pictures or spares, kept new to the campaign`);
        }
      }
      if (eventDay) {
        const want = itemOfDay.get(l.date);
        const id = l.item?.id;
        if (id !== want) fail(`item ${id ?? "none"}, the day's item is ${want} (events.json; node tools/levels/make-daily.mts places it)`);
        if (!rulesDay) fail(`an event day before ${RULES_FROM}, today's rules' first day`);
        const it = id && itemById.get(id);
        if (id && !it) fail(`item ${id} is not in the catalogue's items`);
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
          // a release build fails on it; an everyday build warns (below) and carries on
          if (FULL) fail(`uses flagged picture ${p.id}`);
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
      if (l.lesson !== undefined) checkLesson(l, s, fail);
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
      // squares holds one atmospheric picture (shareOf; creator, 2026-10-29: at most one a level), none back
      // within SPACING boards; boards before take at most that, an all-long board none (it has no squares)
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
      // and at most one a level in every other lane but the Souvenirs (creator, 2026-10-29; atmospheric.mts
      // fewerAtmospheric): the challenge route, the dev menu's, the lesson and the dailies, the played days too
      else if (!souvenirBoard) {
        const atmos = l.pictures.filter((p) => isAtmospheric(catalogue.get(p.id))).length;
        if (atmos > ATMOS_MOST) fail(`${atmos} atmospheric pictures; a level takes at most ${ATMOS_MOST} (its maker swaps the rest in place: atmospheric.mts fewerAtmospheric)`);
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
      // the solver's checks (prove), remembered by content hash; which of them this board takes
      const campaign = file.endsWith("campaign.json");
      const mayTrap = campaign && MAY_TRAP.has(l.axes?.role);
      const takes = {
        // a safe start: the campaign's boards but its hard ones, the experiments, the dailies from RULES_FROM, the Souvenirs
        safe: (campaign && !mayTrap) || file.endsWith("experiments.json") || rulesDay || souvenirBoard,
        readable: (campaign && !mayTrap) || rulesDay || souvenirBoard,
        careful: mayTrap,
      };
      const key = proofKey(takes, l);
      if (remembered.has(key)) {
        kept.add(key);
        recalled++;
      } else {
        // a long run of proofs is a long search: below-normal priority from the 20th (AGENTS.md: a shared machine)
        if (++proved === 20)
          try {
            setPriority(osConstants.priority.PRIORITY_BELOW_NORMAL);
          } catch {
            // not allowed here: carry on at the priority it has
          }
        const before = problems.length;
        prove(l, takes, deal, s, line, won, data.levels.indexOf(l) + 1, fail);
        if (problems.length === before) kept.add(key);
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
const flaggedBoards = new Set(flaggedUses.map((u) => u.board)).size;
if (flaggedUses.length)
  console.error(
    `\n${FULL ? "FAIL" : "WARNING"}: pictures flagged "don't use" are on ${flaggedBoards} board(s)${FULL ? "; a release never ships one" : "; this build carries on, a release build (--full) fails on them"}:\n  ${flaggedUses.map((u) => u.line).join("\n  ")}\n` +
      `Re-deal them, keeping every other board as it is: node tools/levels/redeal.mts\n`,
  );
// the events: exactly what make-events.mts writes from events-plan.json, every day a daily of the pool from RULES_FROM
const dailyFile = join(dir, "daily.json");
if (ALL && existsSync(dailyFile)) {
  const dates = new Set(JSON.parse(readFileSync(dailyFile, "utf8")).levels.map((l) => l.date));
  const bad = [];
  const plan = planProblem();
  if (plan) bad.push(`events-plan.json: ${plan}`);
  else {
    if (JSON.stringify(EVENTS.map((e) => e.id)) !== JSON.stringify(EVENT_PLAN.map((p) => p.id))) bad.push(`its events are ${EVENTS.map((e) => e.id).join(", ") || "none"}, the plan's ${EVENT_PLAN.map((p) => p.id).join(", ") || "none"} (node tools/levels/make-events.mts)`);
    for (const e of EVENTS) {
      const p = EVENT_PLAN.find((q) => q.id === e.id);
      const problem = eventProblem(e.items.map((it) => it.id), Object.values(e.days));
      if (problem) bad.push(`${e.id}: ${problem}`);
      if (p && JSON.stringify(e) !== JSON.stringify(eventOf(p))) bad.push(`${e.id} is not what make-events.mts writes (re-run it: the plan, Art's themes or titles changed)`);
      const off = Object.keys(e.days).filter((d) => !dates.has(d) || d < RULES_FROM);
      if (off.length) bad.push(`${e.id}: ${off.join(", ")} ${off.length === 1 ? "is" : "are"} no daily of the pool from ${RULES_FROM} (make-daily.mts --to)`);
    }
  }
  if (bad.length) {
    failed++;
    console.error(`FAIL events.json: ${bad.join("; ")}`);
  } else console.log(`events: ${EVENTS.length ? EVENTS.map((e) => `${e.id} ${e.start} to ${e.end}${e.standIn ? " (stand-in)" : ""}`).join(", ") : "none"}`);
}
// the Souvenirs: every trip whose Souvenir pictures Art has made has its board (make-souvenirs.mts)
if (ALL && souvenirPictures.length) {
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
if (ALL && existsSync(tripsFile)) {
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
writeCache(kept, earlier);
const memo = FULL ? `all ${proved} proved afresh (--full)` : `${proved} proved now, ${recalled} remembered from an earlier run of the same board and code; --full proves all afresh`;
console.log(failed ? `${failed} of ${boards} boards FAILED (${memo})` : `all ${boards} boards proved: each line wins on the real rules with no helpers (${memo})`);
if (!FULL && flaggedBoards) console.warn(`WARNING: ${flaggedBoards} board(s) use a flagged picture (listed above); a release build fails until node tools/levels/redeal.mts mends them`);
process.exitCode = failed ? 1 : 0;
