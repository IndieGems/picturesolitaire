// Makes boards outside the campaign from rows (make-experiments.mts: the dev
// menu's trial boards; make-cases.mts: the Traveling Detective's case boards).
// A row is a campaign plan row (campaign-plan.mts has the columns), plus:
//   name         the board's label
//   apart        take no picture that is on campaign boards 1-DISTINCT
//   destination  a postcard's id (lib.mts destinationOf): added to the `count`
//                library pictures as its window, with `crop` its window where
//                the catalogue entry has none; with drop: "mid" it is not
//                added but takes the place of the picture finished mid-board
//                on the proved line, after the deal (so the deal and its
//                measures are the library pictures')
//   case         {id, name, n}: a murder-mystery case's board N, its
//                destination the case's clue picture (docs/mystery-pilot.md).
//                A case puts no picture on two of its boards, and no landmark
//                on any; fewest campaign appearances first.
// It KEEPS every board in `old` with the row's id, re-dealing only one that
// uses a flagged picture (picture-flags.json) or is in `remake`. Every board
// starts safe. Deterministic: the same old boards, rows, catalogue and flags
// give the same boards.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { join } from "node:path";
import { random } from "../../src/game/rules.ts";
import { hashId } from "../../src/game/levels/generate.ts";
import { pick } from "../../src/game/levels/pick.ts";
import { clearOrder, dealBoard, destinationOf, destPicture, familyOf, flaggedOn, readBoards, root, specOf, tallyText, usable, withDestination } from "./lib.mts";
import { DISTINCT } from "./campaign-plan.mts";

export function makeExtras(rows, old, remake = new Set()) {
  const campaign = readBoards(join(root, "src/content/levels/campaign.json"));
  const onCampaign = new Set(campaign.slice(0, DISTINCT).flatMap((l) => l.pictures.map((p) => p.id)));
  const campaignUses = new Map();
  for (const l of campaign) for (const p of l.pictures) campaignUses.set(p.id, (campaignUses.get(p.id) ?? 0) + 1);
  /** Pictures on a case's boards so far: a case puts none on two. */
  const caseUsed = new Map();
  const usedBy = (row) => (row.case ? (caseUsed.get(row.case.id) ?? caseUsed.set(row.case.id, new Set()).get(row.case.id)) : new Set());
  /** A case board's own fields after the board's (its name and case, for grouping). */
  const tagged = (board, row) => (row.case ? { ...board, name: row.name, case: row.case } : board);

  return rows.map((row) => {
    const kept = old.find((l) => l.id === row.id);
    const bad = kept ? flaggedOn(kept.pictures) : [];
    const dest = row.destination ? destinationOf(row.destination, row.crop) : undefined;
    // peek is no part of the deal, and nor is a destination's crop (the window only says which part
    // of the postcard the cards show), so a kept board takes its row's peek and crop with its deal unchanged
    if (kept && !bad.length && !remake.has(row.id) && kept.destination?.id === dest?.id) {
      const peeked = kept.peek === row.peek ? kept : { ...kept, peek: row.peek, axes: { ...kept.axes, peek: row.peek } };
      for (const p of kept.pictures) usedBy(row).add(p.id);
      return tagged(dest ? withDestination(peeked, dest) : peeked, row);
    }
    if (bad.length) console.log(`${row.id}: uses flagged ${bad.join(", ")}; re-dealing it`);
    const used = usedBy(row);
    const pool = row.apart ? usable.filter((p) => !onCampaign.has(p.id)) : row.case ? usable.filter((p) => !p.landmark && !used.has(p.id)) : usable;
    // calm first, then fewest boards it is on in the campaign (a case: on all of it, so the player meets the freshest)
    const cost = new Map(pool.map((p) => [p.id, (p.busy ?? 0) * 2 + (row.case ? (campaignUses.get(p.id) ?? 0) : onCampaign.has(p.id) ? 1 : 0)]));
    const mid = row.drop === "mid";
    for (let attempt = 0; attempt < 12; attempt++) {
      const picked = pick(pool, specOf(row), cost, new Set(), random((hashId(row.id) + attempt * 104729) >>> 0));
      const pictures = picked && dest && !mid ? [...picked, destPicture(dest.id)] : picked;
      if (!pictures) throw new Error(`${row.id}: no pictures fit its row (${pool.filter((p) => row.sizes.includes(p.cols * p.rows)).length} of its sizes${row.apart ? " not on campaign boards 1-" + DISTINCT : ""}); the library needs more`);
      const { board, tally } = dealBoard(row, pictures, { id: row.id, cols: row.board[0], rows: row.board[1], tries: 3000, safeFirstMove: true });
      if (board && mid) {
        // the clue takes the place of the picture finished mid-board on the proved line: the deal stays
        const order = clearOrder(board);
        const k = order[Math.ceil(order.length / 2) - 1];
        const w = destPicture(dest.id);
        if (w.cols !== board.pictures[k].cols || w.rows !== board.pictures[k].rows) throw new Error(`${row.id}: ${dest.id}'s window is ${w.cols}x${w.rows}, the board's pictures are not`);
        const pics = board.pictures.map((p, j) => (j === k ? w : p));
        console.log(`${row.id}: ${dest.id} in place of ${board.pictures[k].id}, finished ${Math.ceil(order.length / 2)} of ${order.length}`);
        for (const p of pics) used.add(p.id);
        return tagged(withDestination({ ...board, pictures: pics, axes: { ...board.axes, families: pics.map((p) => familyOf(p.id)) }, name: row.name }, dest), row);
      }
      if (board) return withDestination({ ...board, name: row.name }, dest);
      for (const p of pictures) cost.set(p.id, cost.get(p.id) + 2);
      console.log(`${row.id}: pictures set ${attempt} found no deal (${tallyText(tally)})`);
    }
    throw new Error(`${row.id}: no deal meets its row; loosen it`);
  });
}
