//! THE RULES, ported from src/game/rules.ts (the gameplay member's) so the win
//! checker can replay a board where the player cannot reach it. This file must
//! agree with the TypeScript EXACTLY: same board after every action, same
//! stacks, same pictures cleared in the same order, same counts.
//! `node tools/server/check.mts` proves it on every shipped level's line and on
//! thousands of random games; run it after any change here or in rules.ts.
//!
//! Only what a replay needs is ported: start (the opening deal), joins and
//! pieces, a move, settling (fall, clear, refill), the Shuffle helper's
//! arrangement check (`arrange`), and the win. The solver is not ported: a
//! shuffle action carries the mix the client's solver picked, and the checker
//! only checks it is a mix the rules allow.
//!
//! Rows count from the top (row 0) down; a cell is row * cols + col. A card is
//! picture index * 32 + (y * picture.cols + x); EMPTY (-1) is no card.

use std::collections::HashSet;

pub const EMPTY: i32 = -1;
/// The most stack cards one shuffle may swap in (src/game/shuffle.ts, RESCUE.maxSwaps).
pub const MAX_SWAPS: usize = 4;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Picture {
    pub id: String,
    pub cols: usize,
    pub rows: usize,
}

/// Everything a board starts from, as the level files store it.
#[derive(Clone, Debug)]
pub struct Deal {
    pub cols: usize,
    pub rows: usize,
    pub pictures: Vec<Picture>,
    pub stacks: Vec<Vec<i32>>,
    /// Cards already on the board, row-major from the top-left (levels have none).
    pub board: Option<Vec<i32>>,
    pub seed: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct State {
    pub cols: usize,
    pub rows: usize,
    pub pictures: Vec<Picture>,
    pub board: Vec<i32>,
    pub stacks: Vec<Vec<i32>>,
    /// Pictures cleared so far, by index, in the order they left.
    pub cleared: Vec<usize>,
    /// Moves made (a shuffle is not a move).
    pub moves: u32,
    pub shuffles: u32,
    pub seed: u32,
}

/// One action of a replay.
#[derive(Clone, Debug)]
pub enum Action {
    /// Pick up the piece under `from` and put that card down on `to`.
    Move { from: i64, to: i64 },
    /// The Shuffle helper: the arrangement straight after the mix, before settling.
    Shuffle { board: Vec<i32>, stacks: Vec<Vec<i32>> },
}

// ---------------------------------------------------------------- cards and cells

#[inline]
pub fn pic_of(card: i32) -> usize {
    (card >> 5) as usize
}

/// Where the card sits in its picture, in cells.
#[inline]
fn xy_of(pictures: &[Picture], card: i32) -> (usize, usize) {
    let cols = pictures[pic_of(card)].cols;
    let i = (card & 31) as usize;
    (i % cols, i / cols)
}

#[inline]
fn size_of(pictures: &[Picture], pic: usize) -> usize {
    pictures[pic].cols * pictures[pic].rows
}

impl State {
    #[inline]
    fn col_of(&self, cell: usize) -> usize {
        cell % self.cols
    }
    #[inline]
    fn row_of(&self, cell: usize) -> usize {
        cell / self.cols
    }
}

// ---------------------------------------------------------------- start

/// The state a deal starts in, after the opening deal has settled.
/// None when the deal is malformed (a picture over 32 cards, a card naming no picture).
pub fn start(deal: &Deal) -> Option<State> {
    if deal.cols == 0 || deal.rows == 0 || deal.stacks.len() != deal.cols {
        return None;
    }
    if deal.pictures.iter().any(|p| p.cols == 0 || p.rows == 0 || p.cols * p.rows > 32) {
        return None;
    }
    let n = deal.cols * deal.rows;
    let board = match &deal.board {
        Some(b) if b.len() == n => b.clone(),
        Some(_) => return None,
        None => vec![EMPTY; n],
    };
    let valid = |c: i32| c >= 0 && pic_of(c) < deal.pictures.len() && ((c & 31) as usize) < size_of(&deal.pictures, pic_of(c));
    if board.iter().any(|&c| c != EMPTY && !valid(c)) || deal.stacks.iter().flatten().any(|&c| !valid(c)) {
        return None;
    }
    let s = State {
        cols: deal.cols,
        rows: deal.rows,
        pictures: deal.pictures.clone(),
        board,
        stacks: deal.stacks.clone(),
        cleared: Vec::new(),
        moves: 0,
        shuffles: 0,
        seed: deal.seed,
    };
    settle(s)
}

// ---------------------------------------------------------------- joins and pieces

/// Are the cards in cells a and b joined (side by side, as in their picture)?
fn joined(s: &State, a: usize, b: usize) -> bool {
    let (a, b) = if a > b { (b, a) } else { (a, b) };
    let ca = s.board[a];
    let cb = s.board[b];
    if ca == EMPTY || cb == EMPTY || pic_of(ca) != pic_of(cb) {
        return false;
    }
    let (ax, ay) = xy_of(&s.pictures, ca);
    let (bx, by) = xy_of(&s.pictures, cb);
    if b == a + 1 && s.col_of(a) < s.cols - 1 {
        return bx == ax + 1 && by == ay;
    }
    if b == a + s.cols {
        return bx == ax && by == ay + 1;
    }
    false
}

/// The pieces on the board: `of` gives each cell's piece (-1 when empty), `list`
/// each piece's cells ascending, pieces in order of their first cell.
fn pieces(s: &State) -> (Vec<i64>, Vec<Vec<usize>>) {
    let n = s.board.len();
    let mut of = vec![-1i64; n];
    let mut list: Vec<Vec<usize>> = Vec::new();
    for first in 0..n {
        if s.board[first] == EMPTY || of[first] != -1 {
            continue;
        }
        let id = list.len() as i64;
        let mut cells = Vec::new();
        let mut todo = vec![first];
        of[first] = id;
        while let Some(c) = todo.pop() {
            cells.push(c);
            let col = s.col_of(c);
            let nbs: [i64; 4] = [
                if col > 0 { c as i64 - 1 } else { -1 },
                if col < s.cols - 1 { c as i64 + 1 } else { -1 },
                c as i64 - s.cols as i64,
                (c + s.cols) as i64,
            ];
            for nb in nbs {
                if nb < 0 || nb >= n as i64 {
                    continue;
                }
                let nb = nb as usize;
                if of[nb] != -1 || !joined(s, c, nb) {
                    continue;
                }
                of[nb] = id;
                todo.push(nb);
            }
        }
        cells.sort_unstable();
        list.push(cells);
    }
    (of, list)
}

/// The cells of the piece under `cell` (empty if the cell is).
fn piece_at(s: &State, cell: usize) -> Vec<usize> {
    if s.board[cell] == EMPTY {
        return Vec::new();
    }
    let (of, mut list) = pieces(s);
    list.swap_remove(of[cell] as usize)
}

// ---------------------------------------------------------------- moves

/// Does the piece in `cells` still lie on the board when moved by (dc, dr)?
fn fits(s: &State, cells: &[usize], dc: i64, dr: i64) -> bool {
    cells.iter().all(|&c| {
        let col = s.col_of(c) as i64 + dc;
        let row = s.row_of(c) as i64 + dr;
        col >= 0 && col < s.cols as i64 && row >= 0 && row < s.rows as i64
    })
}

/// Make a move: the piece under `from` travels so that card lands on `to`.
/// None when nothing would happen or the piece would leave the board.
pub fn do_move(s: &State, from: i64, to: i64) -> Option<State> {
    let n = s.board.len() as i64;
    if from < 0 || from >= n || to < 0 || to >= n || from == to {
        return None;
    }
    let (from, to) = (from as usize, to as usize);
    if s.board[from] == EMPTY {
        return None;
    }
    let src = piece_at(s, from);
    let dc = s.col_of(to) as i64 - s.col_of(from) as i64;
    let dr = s.row_of(to) as i64 - s.row_of(from) as i64;
    if !fits(s, &src, dc, dr) {
        return None;
    }
    let d = dr * s.cols as i64 + dc;
    let in_src: HashSet<usize> = src.iter().copied().collect();
    let dst: Vec<usize> = src.iter().map(|&c| (c as i64 + d) as usize).collect();
    let in_dst: HashSet<usize> = dst.iter().copied().collect();

    let mut board = s.board.clone();
    // The covered cards go back: each to the vacated cell its chain ends on.
    for &c in &dst {
        if in_src.contains(&c) {
            continue;
        }
        let mut v = c as i64 - d;
        while v >= 0 && in_dst.contains(&(v as usize)) {
            v -= d;
        }
        board[v as usize] = s.board[c];
    }
    for &c in &src {
        board[(c as i64 + d) as usize] = s.board[c];
    }
    let mut next = s.clone();
    next.board = board;
    next.moves += 1;
    settle(next)
}

// ---------------------------------------------------------------- settling

/// Fall, clear, refill, until the board is still.
fn settle(mut s: State) -> Option<State> {
    for _ in 0..10_000 {
        fall(&mut s);
        let done = complete(&s);
        if !done.is_empty() {
            for (pic, cells) in &done {
                for &c in cells {
                    s.board[c] = EMPTY;
                }
                s.cleared.push(*pic);
            }
            continue;
        }
        if deal(&mut s) {
            continue;
        }
        return Some(s);
    }
    None
}

/// Every card drops straight down its column onto the card below or the floor.
fn fall(s: &mut State) {
    for col in 0..s.cols {
        let mut land = s.rows as i64 - 1; // the lowest row not yet filled
        for row in (0..s.rows).rev() {
            let cell = row * s.cols + col;
            let card = s.board[cell];
            if card == EMPTY {
                continue;
            }
            if row as i64 != land {
                let to = land as usize * s.cols + col;
                s.board[to] = card;
                s.board[cell] = EMPTY;
            }
            land -= 1;
        }
    }
}

/// The complete pictures on the board, in order of their first cell.
fn complete(s: &State) -> Vec<(usize, Vec<usize>)> {
    let (_, list) = pieces(s);
    let mut out = Vec::new();
    for cells in list {
        let pic = pic_of(s.board[cells[0]]);
        if cells.len() == size_of(&s.pictures, pic) {
            out.push((pic, cells));
        }
    }
    out
}

/// Each stack fills its own column's gaps, column by column from the left.
/// Assumes the board has fallen. True if any card was dealt.
fn deal(s: &mut State) -> bool {
    let mut dealt = false;
    for col in 0..s.cols {
        let mut gap = 0;
        while gap < s.rows && s.board[gap * s.cols + col] == EMPTY {
            gap += 1;
        }
        let mut taken = 0;
        while gap > 0 && taken < s.stacks[col].len() {
            let card = s.stacks[col][taken];
            taken += 1;
            s.board[(gap - 1) * s.cols + col] = card;
            gap -= 1;
            dealt = true;
        }
        if taken > 0 {
            s.stacks[col].drain(..taken);
        }
    }
    dealt
}

// ---------------------------------------------------------------- the end

/// The board and the stacks are empty: every picture is restored.
pub fn is_won(s: &State) -> bool {
    s.board.iter().all(|&c| c == EMPTY) && s.stacks.iter().all(|st| st.is_empty())
}

// ---------------------------------------------------------------- shuffle

/// The Shuffle helper's result, checked: the loose cards (joined to no other)
/// traded places, and up to MAX_SWAPS of them traded with stack cards, each
/// taking the other's place. Settled when legal; None when the arrangement is
/// one the rules do not allow, or changes nothing.
pub fn arrange(s: &State, board: &[i32], stacks: &[Vec<i32>]) -> Option<State> {
    // (a) the same shape: board length, stack count, every stack's length
    if board.len() != s.board.len() || stacks.len() != s.stacks.len() {
        return None;
    }
    if stacks.iter().zip(&s.stacks).any(|(a, b)| a.len() != b.len()) {
        return None;
    }
    let (_, list) = pieces(s);
    let loose: Vec<usize> = list.iter().filter(|p| p.len() == 1).map(|p| p[0]).collect();
    let is_loose: HashSet<usize> = loose.iter().copied().collect();
    // (b) only loose cells change, and each still holds a card
    for c in 0..board.len() {
        if is_loose.contains(&c) {
            if board[c] == EMPTY {
                return None;
            }
        } else if board[c] != s.board[c] {
            return None;
        }
    }
    // (c) a stack place that changed now holds a card that was loose on the board
    let loose_cards: HashSet<i32> = loose.iter().map(|&c| s.board[c]).collect();
    let mut swapped = 0;
    for (col, st) in stacks.iter().enumerate() {
        for (at, &card) in st.iter().enumerate() {
            if card != s.stacks[col][at] {
                if !loose_cards.contains(&card) {
                    return None;
                }
                swapped += 1;
            }
        }
    }
    if swapped > MAX_SWAPS {
        return None;
    }
    // (d) the loose cells and the stacks hold the same cards, each once
    let mut before: Vec<i32> = loose.iter().map(|&c| s.board[c]).chain(s.stacks.iter().flatten().copied()).collect();
    let mut after: Vec<i32> = loose.iter().map(|&c| board[c]).chain(stacks.iter().flatten().copied()).collect();
    before.sort_unstable();
    after.sort_unstable();
    if before != after || after.windows(2).any(|w| w[0] == w[1]) {
        return None;
    }
    // (e) something changed
    if swapped == 0 && loose.iter().all(|&c| board[c] == s.board[c]) {
        return None;
    }
    let mut next = s.clone();
    next.board = board.to_vec();
    next.stacks = stacks.to_vec();
    next.shuffles += 1;
    settle(next)
}

// ---------------------------------------------------------------- replay

/// Apply one action; None if it does nothing (the replay is then wrong).
pub fn act(s: &State, a: &Action) -> Option<State> {
    match a {
        Action::Move { from, to } => do_move(s, *from, *to),
        Action::Shuffle { board, stacks } => arrange(s, board, stacks),
    }
}

/// One line describing a state, the same as tools/server/vectors.mts writes:
/// board | stacks | cleared | moves | shuffles.
pub fn digest(s: &State) -> String {
    let join = |v: &mut dyn Iterator<Item = String>| v.collect::<Vec<_>>().join(",");
    let board = join(&mut s.board.iter().map(|c| c.to_string()));
    let stacks = s
        .stacks
        .iter()
        .map(|st| join(&mut st.iter().map(|c| c.to_string())))
        .collect::<Vec<_>>()
        .join("/");
    let cleared = join(&mut s.cleared.iter().map(|c| c.to_string()));
    format!("{board}|{stacks}|{cleared}|{}|{}", s.moves, s.shuffles)
}
