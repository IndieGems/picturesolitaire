// Renders the PC layout mockups (design/pc-mockups/README.md) into this folder's PNGs: the real game in
// the play-test tool's hidden Chrome (on the GPU, tools/chromium-gpu.mjs), laid out by mock.js and mock.css.
//   node design/pc-mockups/render.mts                  every run
//   RUNS=a,a-1366 node design/pc-mockups/render.mts    some of them
// One browser at a time, each run its own page load; English; no Arcade, no player (stand-ins as mock.js says).
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const { playtest } = await import(new URL("../../tools/playtest.mts", import.meta.url).href);

type Screen = "home" | "shop" | "level" | "win";
const RUNS: Record<string, { size: [number, number]; mode: string; screens: Screen[]; file: (s: Screen) => string }> = {
  "today-box": { size: [1920, 1080], mode: "box", screens: ["home", "level"], file: (s) => `0-today-arcade-${s}` },
  "today-wide": { size: [1920, 1080], mode: "today", screens: ["home", "level"], file: (s) => `0-today-wide-window-${s}` },
  a: { size: [1920, 1080], mode: "a", screens: ["home", "shop", "level", "win"], file: (s) => `a-side-columns-${s}` },
  "a-1366": { size: [1366, 768], mode: "a", screens: ["level"], file: (s) => `a-side-columns-${s}-1366` },
  b: { size: [1920, 1080], mode: "b", screens: ["home", "level", "win"], file: (s) => `b-toolbar-${s}` },
  "b-1366": { size: [1366, 768], mode: "b", screens: ["level"], file: (s) => `b-toolbar-${s}-1366` },
  c: { size: [1920, 1080], mode: "c", screens: ["home", "level", "win"], file: (s) => `c-hybrid-${s}` },
  "c-1366": { size: [1366, 768], mode: "c", screens: ["level"], file: (s) => `c-hybrid-${s}-1366` },
  d: { size: [1920, 1080], mode: "d", screens: ["home", "level", "win"], file: (s) => `d-box-polished-${s}` },
  "d-1366": { size: [1366, 768], mode: "d", screens: ["level"], file: (s) => `d-box-polished-${s}-1366` },
};
const pick = (process.env.RUNS ?? Object.keys(RUNS).join(",")).split(",").filter((r: string) => RUNS[r]);
const call = (fn: string, ...args: unknown[]) =>
  `(async () => { const m = await import("/design/pc-mockups/mock.js"); return await m.${fn}(${args.map((a) => JSON.stringify(a)).join(",")}); })()`;

for (const name of pick) {
  const run = RUNS[name];
  const [width, height] = run.size;
  const t = await playtest({ page: "/?lang=en", width, height, mobile: false, scale: 1 });
  try {
    await t.waitFor(`!document.getElementById("boot") && window.__ps && !document.querySelector("section.screen.home").hidden`, 90000);
    console.log(name, "setup", JSON.stringify(await t.eval(call("setup", run.mode))));
    for (const s of run.screens) {
      const out = await t.eval(call(s, run.mode));
      await t.shot(`${here}/${run.file(s)}.png`);
      console.log(name, s, JSON.stringify(out ?? null));
      if (s === "shop") await t.eval(call("closeShop", run.mode));
    }
  } catch (err) {
    console.log(name, "failed", String(err).slice(0, 500));
  } finally {
    const errs = t.console.filter((l: string) => /^(error|exception|pageerror)/i.test(l)).slice(0, 6);
    if (errs.length) console.log(name, "console", JSON.stringify(errs));
    await t.close();
  }
}
