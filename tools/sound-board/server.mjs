// The Sound board: a tool in the Gem Editor's rail where the creator plays
// every sound the game ships, at its in-game level, and marks each one Keep or
// Remake (with a note). Choices are written to tools/sound-board/choices.json,
// which the audio member reads.
//
// Declared in gem-game.json (process "soundboard", editor "sound-board"). The
// port is assigned by the host: read from SOUNDBOARD_PORT, bound on the literal
// 127.0.0.1, and printed behind "SOUNDBOARD_PORT " so the host knows it is up.
// No dependencies and no file watching.

import { createServer } from "node:http";
import { readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const project = resolve(here, "../..");
const audioDir = join(project, "public/audio");
const choicesFile = join(here, "choices.json");

// Every sound, in the order a board meets them, with the moment it belongs to.
// `file` is its name in public/audio/; `kind` "music" loops with play/stop.
const SOUNDS = [
  // Music first: start it, then play the effects over it to hear the real mix.
  { name: "bed", label: "Music", moment: "The background music, looping under the whole game.", kind: "music" },
  { name: "lift", label: "Pick up", moment: "Picking up a card or a joined piece." },
  { name: "land", label: "Put down", moment: "A move lands. Also plays softer when a piece is put back where it was." },
  { name: "slide", label: "Slide back", moment: "Cards the move pushed aside slide back to where it came from." },
  { name: "merge", label: "Join", moment: "Two correct neighbours touch and join. A little brighter the bigger the joined piece." },
  { name: "split", label: "Come apart", moment: "A joined piece is split by a move or by cards falling." },
  { name: "complete", label: "Picture whole", moment: "A picture is complete: the flourish, the best sound in the game." },
  { name: "fall", label: "Cards fall", moment: "Cards drop into a gap after a picture clears." },
  { name: "deal", label: "Stack deals", moment: "A stack deals a card into its column. Plays here as a refill rippling across five stacks, left to right." },
  { name: "undo", label: "Undo", moment: "The Undo helper." },
  { name: "hint", label: "Hint", moment: "The Hint helper." },
  { name: "shuffle", label: "Shuffle", moment: "The Shuffle helper." },
  { name: "restart", label: "Restart", moment: "The board is started over." },
  { name: "ui", label: "Button", moment: "Any button in the menus and screens." },
  { name: "stuck", label: "Stuck", moment: "The player is stuck: a dead end, or Hint finds no way. Also a Shuffle that can't help. The hint chime, lower and softer." },
  { name: "won", label: "Board won", moment: "Every picture restored: the board is won. It is the win sting too." },
  { name: "milestone", label: "Milestone", moment: "A milestone card with fireworks: today, finishing the guided start. Bigger than a board win, and plays instead of it." },
];

// The in-game mix, from the game's own table when Node can read it.
async function levels() {
  try {
    const { EFFECTS, MUSIC } = await import(pathToFileURL(join(project, "src/audio/sounds.ts")).href);
    const effects = Object.fromEntries(Object.entries(EFFECTS).map(([k, v]) => [k, { gain: v.gain, rate: v.rate ?? 1, file: v.file ?? k }]));
    return { effects, music: MUSIC.gain, crossfade: MUSIC.crossfade };
  } catch {
    return { effects: {}, music: 0.3, crossfade: 4 };
  }
}
const fileOf = (name, lv) => lv.effects[name]?.file ?? name;

async function readChoices() {
  try {
    return JSON.parse(await readFile(choicesFile, "utf8"));
  } catch {
    return { sounds: {} };
  }
}

let writing = Promise.resolve();
function saveChoice(name, choice, note) {
  writing = writing.then(async () => {
    const data = await readChoices();
    data.sounds ??= {};
    if (choice === null && !note) delete data.sounds[name];
    else data.sounds[name] = { choice, note: note || undefined, at: new Date().toISOString() };
    data.updated = new Date().toISOString();
    const tmp = `${choicesFile}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2) + "\n");
    await rename(tmp, choicesFile);
    return data;
  });
  return writing;
}

function send(res, status, type, body) {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

const TYPES = { ogg: "audio/ogg", mp3: "audio/mpeg" };
const names = new Set(SOUNDS.map((s) => s.name));

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return send(res, 200, "text/html; charset=utf-8", await readFile(join(here, "index.html")));
    }
    if (req.method === "GET" && url.pathname === "/api/sounds") {
      const lv = await levels();
      const sounds = SOUNDS.map((s) => ({ ...s, kind: s.kind ?? "effect", present: existsSync(join(audioDir, `${fileOf(s.name, lv)}.ogg`)) }));
      return send(res, 200, "application/json", JSON.stringify({ sounds, levels: lv, choices: (await readChoices()).sounds ?? {} }));
    }
    const audio = /^\/audio\/([a-z0-9-]+)\.(ogg|mp3)$/.exec(url.pathname);
    if (req.method === "GET" && audio) {
      const file = join(audioDir, `${audio[1]}.${audio[2]}`);
      if (!existsSync(file)) return send(res, 404, "text/plain", "no such sound");
      return send(res, 200, TYPES[audio[2]], await readFile(file));
    }
    if (req.method === "POST" && url.pathname === "/api/choice") {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 8192) return send(res, 413, "text/plain", "too long");
      }
      const { name, choice, note } = JSON.parse(body);
      if (!names.has(name) || ![null, "keep", "remake"].includes(choice)) return send(res, 400, "text/plain", "bad choice");
      const data = await saveChoice(name, choice, typeof note === "string" ? note.slice(0, 1000).trim() : "");
      return send(res, 200, "application/json", JSON.stringify(data.sounds[name] ?? null));
    }
    send(res, 404, "text/plain", "not found");
  } catch (err) {
    send(res, 500, "text/plain", String(err));
  }
});

const port = Number(process.env.SOUNDBOARD_PORT);
if (!port) {
  console.error("SOUNDBOARD_PORT is not set: start this through gem-game.json (the Editor or gemctl serve).");
  process.exit(1);
}
server.listen(port, "127.0.0.1", () => console.log(`SOUNDBOARD_PORT ${port}`));
