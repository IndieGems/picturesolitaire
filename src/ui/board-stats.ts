// THE BOARDS' PLAYER NUMBERS (the creator, 2026-10-27, from Match3Mahjong; the events are
// Server's, declared in the game config: gem-backend-game-config.yaml, analytics_events). Sent
// for campaign boards only, never for practice, a lesson, the dev menu, the daily or a
// challenge (tries.ts decides which try counts, and when it ends):
//
//   board_started  board                attempt
//   board_won      board, mercy         attempt, hints, undos, shuffles
//   board_lost     board, mercy         attempt, pictures_left, helpers
//   board_quit     board                attempt, pictures_left, helpers
//
// The SDK files every string as a dimension and every number as a measure (its track() splits
// them by type, whatever the config says), so a dimension always goes as a string: `board` is
// the campaign number written out ("7", 1-1000), never the number 7, which would go as a
// measure and the event be refused for a missing dimension (QA, 2026-10-27). Every dimension
// must be sent. `mercy` says whether the try started with free Hints; the helpers counted are
// only those taken from the player's stock (a mercy Hint or a lesson's use is not). Levels
// reads tries per win as started over won, and quits by board.
//
// The shops and the daily (release review GSR-005, 2026-10-28; declared by Server the same day,
// with the funnels buying, first_session and daily_try):
//
//   shop_opened    where                       as home's Shop or the run-out panel opens
//   helper_bought  where, helper, pack ("1"/"3")  price (the Coins charged for the whole pack)
//                                              only once the platform has taken the purchase
//                                              (stock.ts buy), never on the press
//   daily_started  (none)                      each try at the day's board, Restarts included
//   daily_ended    result (won, lost, quit)    one per try, ended as a campaign try is
//                                              (tries.ts); a practice daily sends nothing
//
// The Cosmetics screen (cosmetics.ts; the creator, 2026-10-29; declared by Server, with the funnel
// cosmetics: opened, previewed, bought):
//
//   cosmetics_opened    where ("home")            as the screen opens
//   cosmetic_previewed  kind (table, track), id   a table tried on or a track listened to, for an
//                                                 item the player does not own; once per item per visit
//   cosmetic_bought     kind, id                  price (the Coins it cost), only once the platform
//                                                 has taken the purchase (cosmetics-shop.ts buy)
//
// track() only queues: the SDK sends on a timer and on the way out of the page, and the game
// when the page hides or the Arcade pauses it (gem.ts). Unframed (the play-test tool) nothing
// is sent; the dev server keeps the last events for checks (__ps.stats).

import { gem, sendAnalyticsNow } from "../gem";
import type { HelperKind, Pack } from "./stock";

export type Spent = Record<HelperKind, number>;
/** Which shop: home's Shop, or the run-out panel over a board. */
export type ShopWhere = "home" | "run_out";

/** The last events, for the dev server's checks (never in a build). */
export const recentStats: { name: string; props: Record<string, string | number> }[] = [];

/** One event, never awaited. */
function track(name: string, props: Record<string, string | number> = {}): void {
  gem.analytics.track(name, props);
  if (import.meta.env.DEV) {
    recentStats.push({ name, props });
    if (recentStats.length > 40) recentStats.shift();
  }
}

function send(name: string, n: number, props: Record<string, string | number>): void {
  const board = Math.round(n);
  if (!(board >= 1 && board <= 1000)) return; // outside the declared range: refused anyway
  // a dimension, so a string (see above)
  track(name, { board: String(board), ...props });
}

export const shopStats = {
  opened(where: ShopWhere): void {
    track("shop_opened", { where });
  },
  /** Bought, as the platform answered: `price` is what the whole purchase cost. */
  bought(where: ShopWhere, helper: HelperKind, pack: Pack, price: number | null): void {
    // pack is a dimension, so a string; the price a measure, sent when it was known
    track("helper_bought", { where, helper, pack: String(pack), ...(price !== null ? { price: Math.round(price) } : {}) });
  },
};

export const cosmeticStats = {
  opened(where: "home"): void {
    track("cosmetics_opened", { where });
  },
  previewed(kind: "table" | "track", id: string): void {
    track("cosmetic_previewed", { kind, id });
  },
  /** Bought, as the platform answered: `price` is what it cost. */
  bought(kind: "table" | "track", id: string, price: number | null): void {
    track("cosmetic_bought", { kind, id, ...(price !== null ? { price: Math.round(price) } : {}) });
  },
};

export const dailyStats = {
  started(): void {
    track("daily_started");
  },
  ended(result: "won" | "lost" | "quit"): void {
    track("daily_ended", { result });
  },
};

const all = (s: Spent): number => s.hint + s.undo + s.shuffle;
const yesNo = (b: boolean): string => (b ? "yes" : "no");

export const boardStats = {
  started(board: number, attempt: number): void {
    send("board_started", board, { attempt });
  },
  won(board: number, mercy: boolean, attempt: number, spent: Spent): void {
    send("board_won", board, { mercy: yesNo(mercy), attempt, hints: spent.hint, undos: spent.undo, shuffles: spent.shuffle });
  },
  lost(board: number, mercy: boolean, attempt: number, picturesLeft: number, spent: Spent): void {
    send("board_lost", board, { mercy: yesNo(mercy), attempt, pictures_left: picturesLeft, helpers: all(spent) });
  },
  quit(board: number, attempt: number, picturesLeft: number, spent: Spent): void {
    send("board_quit", board, { attempt, pictures_left: picturesLeft, helpers: all(spent) });
  },
  /**
   * The page is going: send what is queued now, with keepalive (gem.ts). A plain flush here was
   * cancelled with the page, and skipped outright while the SDK's own exit send was in flight.
   */
  flush(): void {
    sendAnalyticsNow();
  },
};
