// TEXT A PLAYER CAN READ, IN THEIR LANGUAGE (the game standard: 44 px targets and 12 px text, at
// 360x640, in every language the game ships, never cut off). Opens the tightest screens through the
// play-test tool (tools/playtest.mts) with ?lang=<lang> and reports, per language and screen:
//
//   - text drawn under 12 px;
//   - text cut off: an ellipsis drawn, a word wider than its box, or a box whose text runs out of it;
//   - a button under 44 px, counting an invisible ::after hit layer (Untangled's tools/text-fit.mjs,
//     whose probe this is, with its self-test).
//
//   node tools/i18n/text-fit.mjs de ru ja [--shots <folder>]
//
// Exit 0 clean, 1 something found, 2 the self-test failed. The screens: home, a level's top row and
// helpers, a daily's two-line top row, the win card, the Challenge a friend card, the run-out panel,
// home's Shop, settings, the Daily Suitcase.

import { playtest } from "../playtest.mts";

const args = process.argv.slice(2);
const shotsAt = args.indexOf("--shots");
const shots = shotsAt >= 0 ? args[shotsAt + 1] : null;
const LANGS = args.filter((a, i) => !a.startsWith("--") && i !== shotsAt + 1);
if (!LANGS.length) LANGS.push("de", "ru", "ja");

const sleep = (ms) => `await new Promise((r) => setTimeout(r, ${ms}));`;
const click = (sel) => `document.querySelector(${JSON.stringify(sel)})?.click();`;
// board 1 won for this page (home shows its Shop), a stock with no Hints (the stand-in suitcase months only
// for the suitcase's own screen: the event is on hold, so home shows no Event tile, src/ui/event-switch.ts)
const SETUP = `
  const p = await import("/src/net/progress.ts");
  p.hold("dev-c1", { lane: "campaign", board: "c01", n: 1, moves: 9, ms: 1, pictures: [] });
  for (let i = 2; i <= 26; i++) p.hold("dev-c" + i, { lane: "campaign", board: "c" + i, n: i, moves: 9, ms: 1, pictures: [] });
  window.__ps.stock({ coins: 300, counts: { hint: 0, undo: 10, shuffle: 3 } });
  window.__ps.marks({ c27: "super" });
  ${sleep(800)}`;
const SCREENS = [
  { name: "home", act: "" },
  { name: "shop", act: `${click('[data-press="home.shop"]')} ${sleep(500)}` },
  { name: "settings", act: `${click("#settings-button")} ${sleep(500)}` },
  { name: "suitcase", act: `window.__ps.suitcase(); window.__ps.openSuitcase(); ${sleep(800)}` },
  { name: "level", act: `window.__ps.openLevel(27); ${sleep(2500)}` },
  { name: "run-out", act: `window.__ps.openLevel(27); ${sleep(2500)} ${click('[data-press="board.hint"]')} ${sleep(500)}` },
  { name: "daily", act: `${click('[data-press="home.daily"]')} ${sleep(2500)}` },
  { name: "win card", act: `window.__ps.openLevel(27); ${sleep(2500)} await window.__ps.board().dev.winNow(0); ${sleep(4000)}` },
  {
    name: "challenge",
    // the picker as the Arcade offers it (its list does not load here: the card says so, and offers the link)
    act: `const { gem } = await import("/src/gem.ts"); if (gem.frame) gem.frame.parentSupports = () => true; window.__ps.openLevel(27); ${sleep(2500)} await window.__ps.board().dev.winNow(0); ${sleep(4000)} ${click('[data-press="friends.challenge"]')} ${sleep(1500)}`,
  },
  {
    name: "friend's dare",
    act: `window.__ps.launch({ kind: "challenge", id: "x", dare: { board: 27, moves: 31, helpers: 2 }, from: "Alexandra", fromId: "p1", answered: false }); ${sleep(1500)}`,
  },
];

const PROBE = `(() => {
  const meter = document.createElement("canvas").getContext("2d");
  const scaleOf = (e) => {
    let s = 1;
    for (let n = e; n && n.nodeType === 1; n = n.parentElement) {
      const t = getComputedStyle(n).transform;
      if (t && t !== "none") { const m = new DOMMatrix(t); s *= Math.hypot(m.a, m.b); }
    }
    return s;
  };
  const shown = (e) => {
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return false;
    for (let n = e; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) return false;
    }
    return !e.closest("#dev-menu, .dev-menu, .dev-bar");
  };
  const label = (e) => (e.textContent || e.getAttribute("aria-label") || e.className || e.tagName).toString().trim().replace(/\\s+/g, " ").slice(0, 40);
  const found = [];
  for (const e of document.querySelectorAll("body *")) {
    if (!shown(e)) continue;
    const cs = getComputedStyle(e);
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
    if (own) {
      const px = parseFloat(cs.fontSize) * scaleOf(e);
      if (px < 11.95) found.push("text " + px.toFixed(1) + "px: '" + label(e) + "'");
      const room = e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const clips = cs.overflowX !== "visible" || cs.textOverflow === "ellipsis";
      // spilled: a box that shows its overflow, whose words run out of it (into its neighbours)
      if (!clips && room > 0 && cs.display !== "inline" && e.scrollWidth > e.clientWidth + 1) found.push("spills: '" + label(e) + "'");
      if (clips && room > 0) {
        meter.font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
        const ls = parseFloat(cs.letterSpacing) || 0;
        const cjk = /[\\u3040-\\u30ff\\u3400-\\u9fff\\uac00-\\ud7af]/.test(own);
        const parts = /^(nowrap|pre)$/.test(cs.whiteSpace) ? [own] : cjk ? [] : own.split(/[\\s\\u00ad]+/);
        const widest = parts.length ? Math.max(...parts.map((w) => meter.measureText(w).width + ls * [...w].length)) : 0;
        if (widest > room + 0.5 || e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2 && cs.overflowY !== "visible" && cs.overflowY !== "auto" && cs.overflowY !== "scroll")
          found.push("cut off: '" + label(e) + "'");
      }
    }
    if (e.matches("button, a[href], [role=button], [role=tab], [role=switch], input:not([type=hidden])") && !e.disabled) {
      // a control inside its label is hit by the whole label (settings' rows)
      const hit = (e.matches("input") && e.closest("label")) || e;
      const r = hit.getBoundingClientRect(), s = scaleOf(e);
      let w = r.width, h = r.height;
      const a = getComputedStyle(e, "::after");
      if (a.content !== "none" && a.position === "absolute") { w = Math.max(w, parseFloat(a.width) * s || 0); h = Math.max(h, parseFloat(a.height) * s || 0); }
      const b = getComputedStyle(e, "::before");
      if (b.content !== "none" && b.position === "absolute") { w = Math.max(w, parseFloat(b.width) * s || 0); h = Math.max(h, parseFloat(b.height) * s || 0); }
      if (w < 43.5 || h < 43.5) found.push("target " + Math.round(w) + "x" + Math.round(h) + ": '" + label(e) + "'");
    }
  }
  return [...new Set(found)];
})()`;

const FIXTURE = `(async () => {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:0;top:0;width:360px;z-index:99999;background:#fff;font-family:sans-serif";
  host.innerHTML =
    '<p style="font-size:10px;margin:0">bad-tiny</p>' +
    '<button style="width:120px;height:30px;font-size:14px">bad-short</button>' +
    '<span style="display:inline-block;width:40px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:14px">Extremely</span>' +
    '<p style="font-size:13px;margin:0">good-text</p>' +
    '<button class="tf-ok" style="position:relative;width:120px;height:32px;font-size:14px">good-layer</button>' +
    '<style>.tf-ok::after{content:"";position:absolute;left:0;right:0;top:50%;height:44px;transform:translateY(-50%)}</style>';
  document.body.appendChild(host);
  await new Promise((r) => setTimeout(r, 50));
  const all = ${PROBE};
  host.remove();
  return all;
})()`;

const t = await playtest({ width: 360, height: 640, scale: 2 });
let bad = 0;
try {
  await t.waitFor("window.__ps", 60000);
  const fx = await t.eval(FIXTURE);
  const caught = (s) => fx.some((f) => f.includes(s));
  const missed = ["bad-tiny", "bad-short", "Extremely"].filter((s) => !caught(s));
  const wrong = ["good-text", "good-layer"].filter(caught);
  if (missed.length || wrong.length) {
    console.log(`self-test failed: missed ${JSON.stringify(missed)}, flagged ${JSON.stringify(wrong)}`);
    process.exitCode = 2;
  } else {
    for (const lang of LANGS) {
      for (const s of SCREENS) {
        await t.goto(`?lang=${lang}`);
        await t.waitFor("window.__ps && document.querySelector('[data-press=\"home.daily\"]:not(.holding)')", 60000);
        await t.eval(`(async () => { ${SETUP} })()`);
        if (s.act) await t.eval(`(async () => { ${s.act} })()`).catch((e) => console.log(`  ${lang} ${s.name}: ${e.message}`));
        await t.wait(400);
        const found = await t.eval(PROBE);
        for (const f of found) console.log(`${lang.padEnd(7)} ${s.name.padEnd(14)} ${f}`);
        bad += found.length;
        if (shots) await t.shot(`${shots}/${lang}-${s.name.replace(/\W+/g, "-")}.png`);
      }
    }
    const errors = t.errors.filter((e) => !/favicon|net::ERR|Failed to load resource/.test(e));
    if (errors.length) console.log(`page errors:\n  ${errors.slice(0, 8).join("\n  ")}`);
    console.log(bad ? `\n${bad} found` : `\nok: 12 px or more, nothing cut off, 44 px targets, in ${LANGS.join(" ")}`);
    process.exitCode = bad ? 1 : 0;
  }
} finally {
  await t.close();
}
