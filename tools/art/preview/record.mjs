// The store tile's hover loop, step 1: play a board's own winning line on the board test
// bench (src/board/try.html) with real mouse drags while recording the screen through the
// play-test tool (DevTools screencast, on the GPU). Frames, the times of every move and
// event, and where each cell sits go to <scratch>/take-<level>/. Run from the project:
//
//   node tools/art/preview/record.mjs <scratch> [level=4] [max moves] [width=810] [height=1440]
//
// Then cut.py makes the loop. Keep <scratch> outside the project (the OS temp folder).
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const { playtest } = await import(pathToFileURL(resolve("tools/playtest.mts")).href);
import { mkdirSync, writeFileSync } from "node:fs";
const [out, level = "4", maxMoves = "99", W = "810", H = "1440"] = process.argv.slice(2);
const dir = `${out}/take-${level}`; mkdirSync(dir, { recursive: true });
const t = await playtest({ page: `src/board/try.html?level=${level}`, width: Number(W), height: Number(H), scale: 1, mobile: false });
const frames = []; let n = 0;
t.on("Page.screencastFrame", (p) => {
  const f = `${String(n++).padStart(5, "0")}.jpg`;
  writeFileSync(`${dir}/${f}`, Buffer.from(p.data, "base64"));
  frames.push({ f, t: p.metadata.timestamp });
  t.cdp("Page.screencastFrameAck", { sessionId: p.sessionId }).catch(() => {});
});
const events = [];
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
async function drag(a, b) {
  const m = (type, x, y) => t.cdp("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });
  await m("mousePressed", a.x, a.y);
  const steps = 22;
  for (let i = 1; i <= steps; i++) {
    const k = ease(i / steps);
    // a gentle arc, like a finger
    const lift = Math.sin(Math.PI * (i / steps)) * 18;
    await m("mouseMoved", a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k - lift);
    await t.wait(16);
  }
  await t.wait(60);
  await m("mouseReleased", b.x, b.y);
}
try {
  await t.waitFor(`window.__board && !window.__board.busy()`);
  await t.wait(1500);
  await t.cdp("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: Number(W), maxHeight: Number(H), everyNthFrame: 1 });
  await t.wait(800);
  const line = await t.eval(`__board.line()`);
  const cells = await t.eval(`(() => { const s = __board.state(); return Array.from({ length: s.cols * s.rows }, (_, i) => __board.point(i)); })()`);
  let seen = 0;
  for (const [i, mv] of line.slice(0, Number(maxMoves)).entries()) {
    const a = await t.eval(`__board.point(${mv.from})`), b = await t.eval(`__board.point(${mv.to})`);
    events.push({ at: Date.now() / 1000, what: `move ${i} ${mv.from}->${mv.to}` });
    await drag(a, b);
    await t.waitFor(`!__board.busy()`, 20000);
    const log = await t.eval(`log.slice(${seen})`); seen += log.length;
    const now = Date.now() / 1000;
    for (const l of log) if (/picture:complete|picture:clear|piece:merge|board:won/.test(l)) events.push({ at: now, what: l.slice(0, 160) });
    await t.wait(120);
  }
  await t.wait(1500);
  await t.cdp("Page.stopScreencast");
  await t.wait(300);
  writeFileSync(`${dir}/take.json`, JSON.stringify({ frames, events, cells, size: [Number(W), Number(H)] }, null, 1));
  console.log(frames.length, "frames over", (frames.at(-1).t - frames[0].t).toFixed(1), "s; gpu:", t.gpu);
  console.log(events.filter(e => /complete|won/.test(e.what)).map(e => `${(e.at - frames[0].t).toFixed(2)} ${e.what}`).join("\n"));
} finally { await t.close(); }
