// Writes the TEST VECTORS that prove the win checker's Rust rules agree with
// src/game/rules.ts: the TypeScript rules play every game here and record the
// state after every action; functions/checker/tests/vectors.rs replays the
// same actions on the Rust port and must reach the same states, and must give
// the same verdict on every claim.
//
//   node tools/server/vectors.mts <out.json> [--games N] [--seed S]
//
// Normally run by tools/server/check.mts, which then runs the Rust side.
//   - every shipped board's stored line (src/content/levels/{campaign,challenge,daily,souvenirs}.json), as a game and as a claim;
//   - N random games (default 2000) on random deals: random board sizes and
//     picture shapes, some boards dealt part-full, mostly legal moves, some
//     moves the rules refuse, and shuffles both legal and not;
//   - forged claims: a line cut short, a board that does not exist, a deal
//     version the function does not know, one shuffle past the limit, a bad action;
//   - when the Shuffle helper returns the action it picked (src/game/shuffle.ts),
//     real rescue shuffles inside winning lines.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as R from "../../src/game/rules.ts";
import { dealHash } from "../../src/net/deal-hash.ts";
import { arrangeRef } from "./arrange-ref.mts";
import { LANES, fileOf, levelsHash } from "./levels-hash.mts";

const { EMPTY, allMoves, isWon, move, pieces, random, start } = R;
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith("--"));
if (!out) {
  console.error("usage: node tools/server/vectors.mts <out.json> [--games N] [--seed S]");
  process.exit(2);
}
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : dflt;
};
const GAMES = opt("games", 2000);
const rnd = random(opt("seed", 20261024));
const int = (n) => Math.floor(rnd() * n);

/** The rules' own arrange once Gameplay exports it; the agreed stand-in until then. */
const arrange = typeof R.arrange === "function" ? R.arrange : arrangeRef;
const arrangeFrom = typeof R.arrange === "function" ? "src/game/rules.ts" : "tools/server/arrange-ref.mts (rules.ts has no arrange yet)";

/** What the Rust side prints for a state (rules.rs, digest). */
const digest = (s) => `${s.board.join(",")}|${s.stacks.map((st) => st.join(",")).join("/")}|${s.cleared.join(",")}|${s.moves}|${s.shuffles}`;

/** Apply one action with the TypeScript rules: the new state, or null when it does nothing. */
function apply(s, a) {
  if ("shuffle" in a) return arrange(s, a)?.state ?? null;
  return move(s, a)?.state ?? null;
}

/** Play `actions` from `deal`, recording what the Rust side must reproduce. */
function game(name, deal, actions) {
  let s = start(deal).state;
  const states = [];
  for (const a of actions) {
    const next = apply(s, a);
    states.push(next ? digest(next) : null);
    if (next) s = next;
  }
  return { name, deal, start: digest(start(deal).state), actions, states, won: isWon(s) };
}

// ---------------------------------------------------------------- shipped boards

// Only the lanes the checker pays: other files there (experiments.json, the dev menu's practice boards) are no claim.
const present = new Set(readdirSync(join(root, "src/content/levels")));
const lanes = LANES.filter((lane) => present.has(`${fileOf(lane)}.json`)).sort((x, y) => (fileOf(x) < fileOf(y) ? -1 : 1));
const boards = [];
for (const lane of lanes) {
  for (const l of JSON.parse(readFileSync(join(root, "src/content/levels", `${fileOf(lane)}.json`), "utf8")).levels) {
    const deal = { cols: l.cols, rows: l.rows, pictures: l.pictures, stacks: l.stacks, seed: l.seed, ...(l.board ? { board: l.board } : {}) };
    boards.push({ lane, id: l.id, deal, line: l.line.map(([from, to]) => ({ from, to })) });
  }
}

const games = [];
for (const b of boards) {
  const g = game(`${b.lane} ${b.id} stored line`, b.deal, b.line);
  if (!g.won) throw new Error(`${b.lane} ${b.id}: its stored line does not win on rules.ts`);
  games.push(g);
}

// ---------------------------------------------------------------- random games

function randomDeal() {
  const cols = 1 + int(6);
  const rows = 1 + int(7);
  const pictures = [];
  let cards = 0;
  const want = Math.max(1, Math.round(cols * rows * (0.6 + rnd() * 1.6)));
  while (cards < want && pictures.length < 12) {
    const pc = 1 + int(Math.min(4, cols));
    const pr = 1 + int(Math.min(4, rows));
    if (pc * pr === 1 && rnd() < 0.8) continue; // a one-card picture clears at once: keep them rare
    pictures.push({ id: `p${pictures.length}`, cols: pc, rows: pr });
    cards += pc * pr;
  }
  const deck = [];
  pictures.forEach((p, i) => {
    for (let k = 0; k < p.cols * p.rows; k++) deck.push(i * 32 + k);
  });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = int(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const deal = { cols, rows, pictures, seed: int(2 ** 31), stacks: Array.from({ length: cols }, () => []) };
  if (rnd() < 0.3) {
    // some cards already on the board, with holes the opening fall closes
    deal.board = new Array(cols * rows).fill(EMPTY);
    for (let c = 0; c < cols * rows && deck.length; c++) if (rnd() < 0.6) deal.board[c] = deck.pop();
  }
  for (const card of deck) deal.stacks[int(cols)].push(card);
  return deal;
}

/** A shuffle the rules allow: loose cards mixed, up to 4 traded with stack places. */
function legalMix(s) {
  const loose = pieces(s).list.filter((p) => p.length === 1).map((p) => p[0]);
  if (!loose.length) return null;
  const board = [...s.board];
  const stacks = s.stacks.map((st) => [...st]);
  const places = [];
  stacks.forEach((st, col) => st.forEach((_c, at) => places.push([col, at])));
  const m = Math.min(int(5), loose.length, places.length);
  const cells = [...loose];
  for (let i = 0; i < m; i++) {
    const ci = i + int(cells.length - i);
    [cells[i], cells[ci]] = [cells[ci], cells[i]];
    const pi = i + int(places.length - i);
    [places[i], places[pi]] = [places[pi], places[i]];
    const [col, at] = places[i];
    const c = cells[i];
    [board[c], stacks[col][at]] = [stacks[col][at], board[c]];
  }
  const mixed = loose.map((c) => board[c]);
  for (let i = mixed.length - 1; i > 0; i--) {
    const j = int(i + 1);
    [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
  }
  loose.forEach((c, i) => (board[c] = mixed[i]));
  return { shuffle: true, board, stacks };
}

/** A shuffle the rules must refuse (most of the time), each a different way. */
function badMix(s) {
  const a = legalMix(s) ?? { shuffle: true, board: [...s.board], stacks: s.stacks.map((st) => [...st]) };
  const joinedCells = pieces(s).list.filter((p) => p.length > 1).flat();
  switch (int(8)) {
    case 0: // a joined card moved
      if (joinedCells.length) {
        const c = joinedCells[int(joinedCells.length)];
        const o = int(a.board.length);
        [a.board[c], a.board[o]] = [a.board[o], a.board[c]];
      }
      break;
    case 1: // a stack reordered
      for (const st of a.stacks) if (st.length > 1) [st[0], st[st.length - 1]] = [st[st.length - 1], st[0]];
      break;
    case 2: // a card doubled
      if (a.board.length > 1) a.board[0] = a.board[a.board.length - 1];
      break;
    case 3: // a loose cell emptied
      a.board[int(a.board.length)] = EMPTY;
      break;
    case 4: // a stack grew
      a.stacks[int(a.stacks.length)].push(0);
      break;
    case 5: // the board is the wrong size
      a.board.push(EMPTY);
      break;
    case 6: // nothing changed
      return { shuffle: true, board: [...s.board], stacks: s.stacks.map((st) => [...st]) };
    default: // every stack place swapped (more than 4, where there are)
      for (const st of a.stacks) for (let i = 0; i < st.length; i++) if (a.board.length) [st[i], a.board[int(a.board.length)]] = [a.board[int(a.board.length)], st[i]];
  }
  return a;
}

for (let g = 0; g < GAMES; g++) {
  const deal = randomDeal();
  let s = start(deal).state;
  const actions = [];
  const n = deal.cols * deal.rows;
  for (let k = 0; k < 60 && !isWon(s); k++) {
    const r = rnd();
    let a;
    if (r < 0.78) {
      const ms = allMoves(s);
      a = ms.length ? ms[int(ms.length)] : { from: int(n), to: int(n) };
    } else if (r < 0.88) {
      a = { from: int(n + 4) - 2, to: int(n + 4) - 2 }; // often refused: off the board, empty, the same cell
    } else if (r < 0.95) {
      a = legalMix(s) ?? { from: 0, to: 0 };
    } else {
      a = badMix(s);
    }
    actions.push(a);
    s = apply(s, a) ?? s;
  }
  games.push(game(`random ${g}`, deal, actions));
}

// ---------------------------------------------------------------- claims

const claims = [];
const claim = (name, body, expect) => claims.push({ name, input: JSON.stringify(body), expect });
const MIN_MS_PER_MOVE = 300;
for (const b of boards) {
  const base = { v: 1, lane: b.lane, board: b.id, deal: dealHash(b.deal), line: b.line, ms: 90_000 };
  if (b.lane === "daily") base.date = b.id.slice(1);
  const moves = b.line.length;
  claim(`${b.lane} ${b.id}: the stored line`, base, { ok: true, moves, shuffles: 0, ms: Math.max(90_000, moves * MIN_MS_PER_MOVE) });
  claim(`${b.lane} ${b.id}: a claimed time too fast`, { ...base, ms: 5 }, { ok: true, moves, shuffles: 0, ms: moves * MIN_MS_PER_MOVE });
  claim(`${b.lane} ${b.id}: one move short`, { ...base, line: b.line.slice(0, -1) }, { reason: "not_won" });
  claim(`${b.lane} ${b.id}: another version`, { ...base, deal: "00000000" }, { reason: "unknown_deal" });
}
// every OLDER version of a board the checker still keeps (functions/checker/data/archive.json),
// claimed with its own line: a player on an older build must still verify
let older = 0;
{
  const current = new Set(boards.map((b) => `${b.lane}/${b.id}/${dealHash(b.deal)}`));
  const archive = JSON.parse(readFileSync(join(root, "functions/checker/data/archive.json"), "utf8")).deals;
  for (const d of archive) {
    const deal = { cols: d.cols, rows: d.rows, pictures: d.pictures, stacks: d.stacks, seed: d.seed, ...(d.board ? { board: d.board } : {}) };
    if (!d.line || current.has(`${d.lane}/${d.id}/${dealHash(deal)}`)) continue;
    const line = d.line.map(([from, to]) => ({ from, to }));
    const g = game(`${d.lane} ${d.id}: an older version's line`, deal, line);
    if (!g.won) throw new Error(`${d.lane} ${d.id}: an archived version's line does not win on rules.ts`);
    games.push(g);
    const body = { v: 1, lane: d.lane, board: d.id, deal: dealHash(deal), line, ms: 90_000 };
    if (d.lane === "daily") body.date = d.id.slice(1);
    claim(`${d.lane} ${d.id}: an older version, its own line`, body, { ok: true, moves: line.length, shuffles: 0, ms: Math.max(90_000, line.length * MIN_MS_PER_MOVE) });
    older++;
  }
}

// campaign positions: board i plays at i + 1, and again each round after the last
{
  const camp = boards.filter((b) => b.lane === "campaign");
  camp.forEach((b, i) => {
    const base = { v: 1, lane: "campaign", board: b.id, deal: dealHash(b.deal), line: b.line, ms: 90_000, id: `claim-${b.id}` };
    const ok = { ok: true, moves: b.line.length, shuffles: 0, ms: Math.max(90_000, b.line.length * MIN_MS_PER_MOVE) };
    claim(`campaign ${b.id}: at its position, round 2`, { ...base, n: i + 1 + camp.length }, ok);
    if (camp.length > 1) claim(`campaign ${b.id}: at another board's position`, { ...base, n: ((i + 1) % camp.length) + 1 }, { reason: "bad_claim" });
  });
  claim("a claim id that is not a short token", { v: 1, lane: "campaign", board: camp[0].id, deal: dealHash(camp[0].deal), line: camp[0].line, ms: 1, id: "has spaces!" }, { reason: "bad_claim" });
}

const b0 = boards[0];
const base0 = { v: 1, lane: b0.lane, board: b0.id, deal: dealHash(b0.deal), line: b0.line, ms: 60_000 };
if (b0.lane === "daily") base0.date = b0.id.slice(1);
claim("a board that does not exist", { ...base0, board: "zz99" }, { reason: "unknown_board" });
claim("a lane that does not exist", { ...base0, lane: "bonus" }, { reason: "bad_claim" });
claim("an unknown claim version", { ...base0, v: 2 }, { reason: "bad_claim" });
claim("a daily whose board is not its date", { ...base0, lane: "daily", board: "d2026-01-01", date: "2026-01-02" }, { reason: "bad_claim" });
claim("a move off the board", { ...base0, line: [{ from: 0, to: 9999 }, ...b0.line] }, { reason: "bad_action" });
claims.push({ name: "not JSON", input: "{nope", expect: { reason: "bad_claim" } });

// one shuffle past the checker's limit (claim.rs SHUFFLES): a legal mix each time (when the
// board has loose cards), then the line cannot win
{
  const LIMIT = Number(/pub const SHUFFLES: u32 = (\d+);/.exec(readFileSync(join(root, "functions/checker/src/claim.rs"), "utf8"))[1]);
  let s = start(b0.deal).state;
  const line = [];
  for (let tries = 0; line.length < LIMIT + 1 && tries < 20 * (LIMIT + 1); tries++) {
    const m = legalMix(s);
    if (!m) break;
    const next = apply(s, m);
    if (!next) continue;
    line.push(m);
    s = next;
  }
  if (line.length !== LIMIT + 1) throw new Error(`vectors: only ${line.length} legal shuffles for the over-limit claim`);
  claim("one shuffle past the limit", { ...base0, line }, { reason: "too_many_shuffles" });
}

// real rescue shuffles, once the Shuffle helper hands back the action it picked
let rescues = 0;
try {
  const { rescue } = await import("../../src/game/shuffle.ts");
  for (const b of boards.slice(0, 12)) {
    let s = start(b.deal).state;
    const cut = Math.floor(b.line.length / 2);
    for (const m of b.line.slice(0, cut)) s = move(s, m).state;
    const r = rescue(s);
    if (!r || !r.action || !("board" in r.action)) continue;
    const line = [...b.line.slice(0, cut), r.action, ...r.line];
    games.push(game(`${b.lane} ${b.id}: half its line, a rescue shuffle, the rescue's line`, b.deal, line));
    const moves = line.filter((a) => !("shuffle" in a)).length;
    const body = { v: 1, lane: b.lane, board: b.id, deal: dealHash(b.deal), line, ms: 120_000 };
    if (b.lane === "daily") body.date = b.id.slice(1);
    claim(`${b.lane} ${b.id}: won with a rescue shuffle`, body, { ok: true, moves, shuffles: 1, ms: Math.max(120_000, moves * MIN_MS_PER_MOVE) });
    rescues++;
  }
} catch (err) {
  console.warn(`vectors: no rescue shuffles (${err.message})`);
}

// the deal hash, on every game's deal (some random ones place cards on the board)
const hashes = games.map((g) => ({ deal: g.deal, hash: dealHash(g.deal) }));

writeFileSync(out, JSON.stringify({ arrangeFrom, games, claims, hashes, levels: levelsHash() }));
const actions = games.reduce((n, g) => n + g.actions.length, 0);
console.log(`vectors: ${games.length} games (${boards.length} shipped boards, ${older} older versions, ${GAMES} random, ${rescues} with a rescue shuffle), ${actions} actions, ${claims.length} claims; shuffles checked by ${arrangeFrom}`);
