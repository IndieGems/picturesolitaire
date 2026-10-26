// Makes boards outside the campaign from rows (make-experiments.mts: the dev
// menu's trial boards).
// A row is a campaign plan row (campaign-plan.mts has the columns), plus:
//   name         the board's label
//   apart        take no picture that is on campaign boards 1-DISTINCT
//   destination  a postcard's id (lib.mts destinationOf): added to the `count`
//                library pictures as its window, with `crop` its window where
//                the catalogue entry has none
// It KEEPS every board in `old` with the row's id, re-dealing only one that
// uses a flagged picture (picture-flags.json) or is in `remake`. Every board
// starts safe. Deterministic: the same old boards, rows, catalogue and flags
// give the same boards.
// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { join } from "node:path";
import { random } from "../../src/game/rules.ts";
import { hashId } from "../../src/game/levels/generate.ts";
import { pick } from "../../src/game/levels/pick.ts";
import { dealBoard, destinationOf, destPicture, flaggedOn, readBoards, root, specOf, tallyText, usable, withDestination } from "./lib.mts";
import { DISTINCT } from "./campaign-plan.mts";

export function makeExtras(rows, old, remake = new Set()) {
  const campaign = readBoards(join(root, "src/content/levels/campaign.json"));
  const onCampaign = new Set(campaign.slice(0, DISTINCT).flatMap((l) => l.pictures.map((p) => p.id)));

  return rows.map((row) => {
    const kept = old.find((l) => l.id === row.id);
    const bad = kept ? flaggedOn(kept.pictures) : [];
    const dest = row.destination ? destinationOf(row.destination, row.crop) : undefined;
    // peek is no part of the deal, and nor is a destination's crop (the window only says which part
    // of the postcard the cards show), so a kept board takes its row's peek and crop with its deal unchanged
    if (kept && !bad.length && !remake.has(row.id) && kept.destination?.id === dest?.id) {
      const peeked = kept.peek === row.peek ? kept : { ...kept, peek: row.peek, axes: { ...kept.axes, peek: row.peek } };
      return dest ? withDestination(peeked, dest) : peeked;
    }
    if (bad.length) console.log(`${row.id}: uses flagged ${bad.join(", ")}; re-dealing it`);
    const pool = row.apart ? usable.filter((p) => !onCampaign.has(p.id)) : usable;
    // calm first, then those not on campaign boards 1-DISTINCT
    const cost = new Map(pool.map((p) => [p.id, (p.busy ?? 0) * 2 + (onCampaign.has(p.id) ? 1 : 0)]));
    for (let attempt = 0; attempt < 12; attempt++) {
      const picked = pick(pool, specOf(row), cost, new Set(), random((hashId(row.id) + attempt * 104729) >>> 0));
      const pictures = picked && dest ? [...picked, destPicture(dest.id)] : picked;
      if (!pictures) throw new Error(`${row.id}: no pictures fit its row (${pool.filter((p) => row.sizes.includes(p.cols * p.rows)).length} of its sizes${row.apart ? " not on campaign boards 1-" + DISTINCT : ""}); the library needs more`);
      const { board, tally } = dealBoard(row, pictures, { id: row.id, cols: row.board[0], rows: row.board[1], tries: 3000, safeFirstMove: true });
      if (board) return withDestination({ ...board, name: row.name }, dest);
      for (const p of pictures) cost.set(p.id, cost.get(p.id) + 2);
      console.log(`${row.id}: pictures set ${attempt} found no deal (${tallyText(tally)})`);
    }
    throw new Error(`${row.id}: no deal meets its row; loosen it`);
  });
}
