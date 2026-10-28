// Sound Tuning: a tool in the Gem Editor's rail where the creator hears every
// sound the game plays, sets its level, mute and pitch, picks between its
// takes, sets the effects and music levels, and marks each sound Keep or
// Remake (with a note) for the audio member. Modelled on Gearwright's.
//
//   GET  /                the editor (index.html)
//   GET  /api/sounds      every sound with its game moment, its takes and its
//                         built-in level; the saved mix; the Keep/Remake choices
//   GET  /audio/<f>       the shipped sounds, public/audio/
//   GET  /takes/<f>       the alternate takes, audio/takes/ (not shipped until picked)
//   PUT  /api/mix         save the mix: public/sound-mix.json, and the built
//                         game too (dist/) so Play has it at once; picked takes
//                         are copied to audio/takes/ beside the sounds there, the
//                         rest cleared
//   PUT  /api/live        an unsaved mix, into the built game only, so Play
//                         follows the sliders before Save (Discard puts the
//                         saved mix back)
//   POST /api/choice      Keep / Remake / a note -> choices.json, for the audio member
//
// The game reads the mix (src/audio/mix.ts) when its sound starts and when the
// player comes back to the page. Declared in gem-game.json (process
// "soundtuning", editor "sound-tuning"): the port is assigned by the host,
// read from SOUNDTUNING_PORT, bound on the literal 127.0.0.1 (it writes into
// the project, and nothing off this machine may ask it to), and printed behind
// "SOUNDTUNING_PORT ". No dependencies, no file watching: its rows (rows.mjs)
// and the game's sound table and mix rules are re-read when they change.

import { createServer } from "node:http";
import { promises as fs, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { stripTypeScriptTypes } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "../..");
const AUDIO = join(ROOT, "public/audio");
const TAKES = join(ROOT, "audio/takes");
const SAVED = join(ROOT, "public/sound-mix.json");
const CHOICES = join(here, "choices.json");
// Where the build lands is declared in package.json (gem.out), never guessed.
const DIST = join(ROOT, JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).gem?.out ?? "dist");

// The game's own mix rules (types stripped by Node), so the file holds only what the game reads.
// What changes as the game does is loaded afresh whenever its file changes, so
// the process the Editor started never serves a stale list (only a change to
// this file needs a restart): the rows (rows.mjs), the game's sound table
// (src/audio/sounds.ts) and its mix rules (src/audio/mix.ts), which are bound
// to that same table, not to the copy Node loaded first.
const ROWS = join(here, "rows.mjs");
const SOUNDS_TS = join(ROOT, "src/audio/sounds.ts");
const MIX_TS = join(ROOT, "src/audio/mix.ts");
let loaded = null;
async function game() {
  const v = (await Promise.all([ROWS, SOUNDS_TS, MIX_TS].map((f) => fs.stat(f)))).map((st) => Math.floor(st.mtimeMs)).join("-");
  if (loaded?.v === v) return loaded;
  const soundsUrl = `${pathToFileURL(SOUNDS_TS).href}?v=${v}`;
  const { EFFECTS, MUSIC } = await import(soundsUrl);
  const mixSource = (await fs.readFile(MIX_TS, "utf8")).replace(/from "\.\/sounds\.ts"/g, `from ${JSON.stringify(soundsUrl)}`);
  const { cleanMix, pickedTakes, takeOwner } = await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(mixSource))}`);
  const { SOUNDS } = await import(`${pathToFileURL(ROWS).href}?v=${v}`);
  const effects = Object.fromEntries(Object.entries(EFFECTS).map(([k, e]) => [k, { gain: e.gain, rate: e.rate ?? 1, file: e.file ?? k }]));
  const levels = { effects, music: { gain: MUSIC.gain, file: MUSIC.file, tracks: MUSIC.tracks, crossfade: MUSIC.crossfade } };
  loaded = { v, SOUNDS, NAMES: new Set(SOUNDS.map((s) => s.name)), levels, cleanMix, pickedTakes, takeOwner };
  return loaded;
}


const exists = (p) => fs.access(p).then(() => true, () => false);

/** The takes on disk, by stem ("merge-a"), each with both its files. */
async function takes() {
  const { takeOwner } = await game();
  try {
    const files = await fs.readdir(TAKES);
    return files.filter((f) => f.endsWith(".ogg") && takeOwner(f.slice(0, -4)) && files.includes(f.replace(/ogg$/, "mp3"))).map((f) => f.slice(0, -4)).sort();
  } catch {
    return [];
  }
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

/** Write through a temporary file, so a reader never sees half a file. */
async function writeJson(file, data) {
  await fs.mkdir(dirname(file), { recursive: true });
  await fs.writeFile(`${file}.tmp`, JSON.stringify(data, null, 2) + "\n");
  await fs.rename(`${file}.tmp`, file);
}

/** Copy the picked takes into `<dir>/audio/takes/`; with `prune`, clear the ones no longer picked. */
async function placeTakes(dir, stems, prune) {
  const out = join(dir, "audio/takes");
  if (stems.length) await fs.mkdir(out, { recursive: true });
  for (const stem of stems) for (const ext of ["ogg", "mp3"]) await fs.copyFile(join(TAKES, `${stem}.${ext}`), join(out, `${stem}.${ext}`));
  if (prune && (await exists(out))) {
    for (const f of await fs.readdir(out)) if (!stems.includes(f.replace(/\.(ogg|mp3)$/, ""))) await fs.rm(join(out, f));
    if ((await fs.readdir(out)).length === 0) await fs.rmdir(out);
  }
}

let writing = Promise.resolve();
/** One write at a time, in order. */
const queued = (job) => (writing = writing.then(job, job));

function saveChoice(name, choice, note) {
  return queued(async () => {
    const data = await readJson(CHOICES, { sounds: {} });
    data.sounds ??= {};
    if (choice === null && !note) delete data.sounds[name];
    else data.sounds[name] = { choice, note: note || undefined, at: new Date().toISOString() };
    data.updated = new Date().toISOString();
    await writeJson(CHOICES, data);
    return data.sounds[name] ?? null;
  });
}

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readBody(req, limit) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > limit) throw Object.assign(new Error("too large"), { status: 413 });
  }
  return JSON.parse(body);
}

const TYPES = { ogg: "audio/ogg", mp3: "audio/mpeg" };

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = url.pathname;
    if (req.method === "GET" && (path === "/" || path === "/index.html")) {
      return send(res, 200, await fs.readFile(join(here, "index.html")), "text/html; charset=utf-8");
    }
    if (req.method === "GET" && path === "/api/sounds") {
      const { SOUNDS, levels: lv, cleanMix, takeOwner } = await game();
      const have = await takes();
      const sounds = await Promise.all(
        SOUNDS.map(async (s) => {
          const file = s.file ?? (s.kind === "music" ? (lv.music.tracks[s.name] ?? lv.music.file) : lv.effects[s.name]?.file ?? s.name);
          const present = await exists(join(s.dir === "takes" ? TAKES : AUDIO, `${file}.ogg`));
          return { ...s, kind: s.kind ?? "effect", file, present, takes: s.preview ? [] : have.filter((t) => takeOwner(t) === s.name) };
        }),
      );
      return send(res, 200, {
        sounds,
        levels: lv,
        mix: cleanMix(await readJson(SAVED, {}), have),
        choices: (await readJson(CHOICES, {})).sounds ?? {},
        built: await exists(DIST),
      });
    }
    const file = /^\/(audio|takes)\/([a-z0-9-]+)\.(ogg|mp3)$/.exec(path);
    if (req.method === "GET" && file) {
      const full = join(file[1] === "audio" ? AUDIO : TAKES, `${file[2]}.${file[3]}`);
      if (!(await exists(full))) return send(res, 404, { error: "no such sound" });
      return send(res, 200, await fs.readFile(full), TYPES[file[3]]);
    }
    if (req.method === "PUT" && (path === "/api/mix" || path === "/api/live")) {
      const { cleanMix, pickedTakes } = await game();
      const have = await takes();
      const mix = cleanMix(await readBody(req, 64 * 1024), have);
      const picked = pickedTakes(mix);
      const built = await exists(DIST);
      await queued(async () => {
        if (path === "/api/mix") {
          await writeJson(SAVED, mix);
          await placeTakes(join(ROOT, "public"), picked, true);
        }
        // The built game, when there is one: what Play on this PC serves.
        if (built) {
          await writeJson(join(DIST, "sound-mix.json"), mix);
          await placeTakes(DIST, picked, path === "/api/mix");
        }
      });
      return send(res, 200, { mix, built });
    }
    if (req.method === "POST" && path === "/api/choice") {
      const { name, choice, note } = await readBody(req, 8192);
      const { NAMES } = await game();
      if (!NAMES.has(name) || ![null, "keep", "remake"].includes(choice)) return send(res, 400, { error: "bad choice" });
      return send(res, 200, await saveChoice(name, choice, typeof note === "string" ? note.slice(0, 1000).trim() : ""));
    }
    send(res, 404, { error: "not found" });
  } catch (err) {
    send(res, err.status ?? 500, { error: String(err.message ?? err) });
  }
});

const port = Number(process.env.SOUNDTUNING_PORT);
if (!Number.isInteger(port) || port <= 0) {
  console.error("SOUNDTUNING_PORT is not set: start this through gem-game.json (the Editor or gemctl serve).");
  process.exit(1);
}
server.listen(port, "127.0.0.1", () => console.log(`SOUNDTUNING_PORT ${port}`));
