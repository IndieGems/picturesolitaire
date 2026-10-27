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
// "SOUNDTUNING_PORT ". No dependencies, no file watching.

import { createServer } from "node:http";
import { promises as fs, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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
const { cleanMix, pickedTakes, takeOwner } = await import(pathToFileURL(join(ROOT, "src/audio/mix.ts")).href);

// Every sound, in the order a board meets them, with the moment it belongs to.
const SOUNDS = [
  { name: "music", label: "Music", moment: "The background music, looping under the whole game.", kind: "music" },
  { name: "hardmark", label: "Hard board", moment: "A hard board opens, under its \"Hard board\" banner: a playful uh-oh." },
  { name: "supermark", label: "Super hard board", moment: "A super hard board opens, under its \"Super hard board\" banner: the uh-oh, deeper and weightier." },
  { name: "lift", label: "Pick up", moment: "Picking up a card or a joined piece." },
  { name: "land", label: "Put down", moment: "A move lands. Also plays softer when a piece is put back where it was." },
  { name: "slide", label: "Slide back", moment: "Cards the move pushed aside slide back to where it came from." },
  { name: "merge", label: "Join", moment: "Two correct neighbours touch and join. A little brighter the bigger the joined piece." },
  { name: "split", label: "Come apart", moment: "A joined piece is split by a move or by cards falling." },
  { name: "complete", label: "Picture whole", moment: "A picture is complete: the flourish, the best sound in the game." },
  { name: "fanfare", label: "Destination fanfare", moment: "A board's destination picture is finished and unfolds into its postcard: plays under the place's name. Nothing on a repeat after Undo or a restart." },
  { name: "fall", label: "Cards fall", moment: "Cards drop into a gap after a picture clears." },
  { name: "deal", label: "Stack deals", moment: "A stack deals a card into its column. Plays here as a refill rippling across five stacks, left to right." },
  { name: "nope", label: "Stack says no", moment: "A press on a stack, which can't be picked up: the stack gives a little sideways shake. Players repeat it, so it stays quiet." },
  { name: "undo", label: "Undo", moment: "The Undo helper." },
  { name: "hint", label: "Hint", moment: "The Hint helper." },
  { name: "shuffle", label: "Shuffle", moment: "The Shuffle helper." },
  { name: "restart", label: "Restart", moment: "The board is started over." },
  { name: "ui", label: "Button", moment: "Any button in the menus and screens." },
  { name: "stuck", label: "Stuck", moment: "The player is stuck: a dead end, or Hint finds no way. Also a Shuffle that can't help. The hint chime, lower and softer." },
  { name: "won", label: "Board won", moment: "Every picture restored: the board is won. It is the win sting too." },
  { name: "stamp", label: "Passport stamp", moment: "A trip's last board is won and the player stamps the passport: the stamp lands on the trip's page." },
  { name: "milestone", label: "Milestone", moment: "A milestone card with fireworks: today, finishing the guided start. Bigger than a board win, and plays instead of it." },
];
const NAMES = new Set(SOUNDS.map((s) => s.name));

/** The in-game levels, from the game's table (re-read when it changes). */
async function levels() {
  const file = join(ROOT, "src/audio/sounds.ts");
  const { EFFECTS, MUSIC } = await import(`${pathToFileURL(file).href}?v=${(await fs.stat(file)).mtimeMs}`);
  const effects = Object.fromEntries(Object.entries(EFFECTS).map(([k, v]) => [k, { gain: v.gain, rate: v.rate ?? 1, file: v.file ?? k }]));
  return { effects, music: { gain: MUSIC.gain, file: MUSIC.file, crossfade: MUSIC.crossfade } };
}

const exists = (p) => fs.access(p).then(() => true, () => false);

/** The takes on disk, by stem ("merge-a"), each with both its files. */
async function takes() {
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
      const lv = await levels();
      const have = await takes();
      const sounds = await Promise.all(
        SOUNDS.map(async (s) => {
          const file = s.kind === "music" ? lv.music.file : lv.effects[s.name]?.file ?? s.name;
          return { ...s, kind: s.kind ?? "effect", file, present: await exists(join(AUDIO, `${file}.ogg`)), takes: have.filter((t) => takeOwner(t) === s.name) };
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
