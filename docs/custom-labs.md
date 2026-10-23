# Custom labs — registering this project's own tools

The Gem project Editor renders one **rail** of surfaces beside the game. What
goes in it is declared by THIS project, in `gem-game.json`, and the host never
learns what any entry *is* — only that it has an id, a label, and somewhere to
point a webview.

So a lab is whatever this project can serve over http:

- a visualizer for the game's own data — levels, curves, spawn tables, saves
- a tuning panel that writes its changes back into the project
- an inspector or debug overlay for a system while it runs
- an asset browser, a dialogue editor, a map painter
- a web tool you already run at a port


## Two declarations

A tool needs a **process** that serves it, and an **editor entry** pointing at
that process. Both go in `gem-game.json`, which every project here already has:

```json
{
  "schema": 1,
  "dev": {
    "processes": [
      {
        "id": "tools",
        "command": ["node", "tools/serve-tools.mjs"],
        "ports": [{ "name": "port", "env": "TOOLS_PORT" }],
        "ready": [{ "name": "port", "prefix": "TOOLS_PORT " }]
      }
    ]
  },
  "editors": [
    {
      "id": "curves",
      "label": "Curves",
      "kind": "web",
      "url": "http://127.0.0.1:{tools.port}/curves/"
    }
  ]
}
```

`{tools.port}` is `<process id>.<capture name>`, substituted once that process
has started and reported. One process can serve any number of entries — the
rail is a list of URLs, not a list of servers.

## The port is ASSIGNED, never chosen

`ports[]` says "give me a port, and put it in this environment variable". The
host assigns one, so two projects open at once cannot collide. Your server
reads `process.env.TOOLS_PORT`, binds it, and **prints it on stdout behind the
declared prefix**:

```js
const port = Number(process.env.TOOLS_PORT);
server.listen(port, "127.0.0.1", () => console.log(`TOOLS_PORT ${port}`));
```

The matching `ready[]` capture is what confirms the assignment was honoured
and what makes the value available to the URL. The prefix is literal and the
captured value is the rest of that line, trimmed; the process counts as ready
when EVERY capture it declares has been seen.

Pinning a port inside your server and skipping `ports[]` works perfectly right
up until the second project is open, and then it fails as a port already in
use with nothing pointing at this file.

## Watch the tool's own files, never the whole project

A tool server that watches files (vite, anything with live reload, chokidar,
nodemon) and is rooted at the project watches EVERYTHING under it: every
agent's `.claude/worktrees/*` checkout, each a whole copy of the project; every
`node_modules` install; and build output such as `dist/` and Rust `target/`
folders. A task force of agents makes a lot of those at once, and a project's
tool server has spent hours at two whole cores walking them while it looked
idle.

So **root the server at the tool's own folder**, never the project. When it
genuinely has to see the project, exclude what it never reads: `.claude/**`,
`**/target/**`, `dist/**` and `node_modules/**`. With vite:

```js
// tools/serve-tools.mjs
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const port = Number(process.env.TOOLS_PORT);
const server = await createServer({
  // The tool's own folder: its watcher and its dependency scan stay in here.
  root: fileURLToPath(new URL("./lab/", import.meta.url)),
  server: {
    host: "127.0.0.1",
    port,
    strictPort: true, // the assigned port or nothing, never a different one
    watch: {
      // Only needed if `root` has to be the project. vite matches these
      // against absolute paths, so each one starts with `**/`.
      ignored: ["**/.claude/**", "**/target/**", "**/dist/**", "**/node_modules/**"],
    },
  },
});
await server.listen();
console.log(`TOOLS_PORT ${port}`);
```

The same list goes into whatever else watches: chokidar's `ignored`, nodemon's
`ignore`, a `fs.watch` you wrote yourself.

## What is refused, and where it hurts

- **`command` is argv, NEVER a shell string.** It is spawned directly, so
  there is no shell to interpret quoting, globs, `;` or `$()`. If you need
  one, write a script and name its interpreter. Note `npm` is a batch file on
  Windows and argv is not shell-resolved — call `node` directly.
- **`kind` must be `"web"`.** An unrecognised kind fails the WHOLE manifest,
  including for `gemctl serve`, which only wanted the `dev` block.
- **The url needs a scheme** — `http` or `https`, nothing else — a host, and
  no `user:pass@` credentials. At most 512 characters, a label at most 64, and
  at most 32 entries.
- **An unresolved `{...}` is a hard error, not a literal.** That URL becomes
  the origin of a pane running real code, so a stray placeholder would be a
  frame pointed somewhere nobody intended.
- **Ids are unique**, and are what a tab is keyed by.
- Only a project's own manifest may declare processes at all. The same block
  inside a downloaded game bundle is ignored unconditionally, because
  honouring one would be arbitrary code execution driven by a zip.

## Running it without the Editor — `gemctl serve`

The Editor is one host, not the mechanism. `gemctl serve` drives the same two
declarations from a terminal, which is how an agent gets this project's process
and port management with no window open:

```bash
gemctl serve start .            # start everything declared here, detached
gemctl serve start . --loopback # ...for this machine only: nothing published,
                                #    and Windows raises no firewall prompt
gemctl serve status             # what is running, probed rather than assumed
gemctl serve stop               # end it and free the ports
gemctl serve run . -- npm test  # serve, run a test or script against it, stop
```

A test or a script that needs the game only while it runs uses `serve run`,
never `serve start`: it hands the command the URL in `GEM_SERVE_URL` and stops
the host afterwards, pass, fail or Ctrl+C. A host `serve start` began runs until
something stops it.

What declaring a process buys over running it yourself:

- **The port is reserved, not merely picked.** Assignments go in a shared,
  cross-process-locked run-file — the same one the Editor arbitrates through —
  so a second project, or a second agent, cannot land on it.
- **Readiness is waited for, never slept on.** `start` returns once every
  declared capture has been seen, so the next command in your script can rely
  on the tool answering.
- **It outlives the terminal.** The host runs detached; closing the shell does
  not take the tool down, and `serve stop` waits for the ports to actually be
  free before it reports success.
- **Stale tooling is restarted for you.** A process that declares a `freshness`
  endpoint and reports its server-side code has gone stale is bounced within a
  minute — after editing the tool, you do not restart it by hand.
- **One host per machine.** Starting the same project again ATTACHES to the
  running one; a different project is refused rather than quietly doubling up.

⚠️ **One gate the CLI applies that the libraries behind it do not**, and it
bites exactly when the tooling is all you meant to run. There is no tools-only
mode; this is a policy of the command, not of the process management:

- **something to serve** — an `index.html` in `dist/`, `build/` or `public/`,
  or at the project root, or one level into `web/`, `apps/` or `packages/`.
  A vite project has one at its root, so the gate passes from day one — but
  what is then served is unbuilt source, which a static host cannot run. Treat
  `npm run build` as the real answer.

**A game id is not a gate.** A project not linked to a Gem game serves and
plays anonymous, and `serve start` says `identity: none (not linked)`. When the
game needs saves, config or rooms, link it with `gemctl project bind`: run it
bare first to see the account's games and any that look like this project's,
then `--game <uuid>` links one or `--create` registers and links a new one.

⚠️ **A failing gate presents as a 30-second TIMEOUT, not as the reason.**
`serve start` spawns the host detached and only waits for it to report itself,
so a refusal it never sees comes back as "the dev host did not come up". Do
what that message says:

```bash
gemctl serve supervise .   # the same host, in the FOREGROUND, saying why
```

which answers `error: … has no built output to serve` (with where it looked)
instead of thirty seconds of nothing. It is also how a process whose ready-marker never
printed gets diagnosed — the usual cause being a prefix in `gem-game.json` that
does not match the line the process actually writes.

## Finding the port from a script

The host assigns the port precisely so nothing may pin one, and `serve status`
reports the assignments back under the same keys the manifest spells:

```bash
gemctl serve status --json     # "assigned_ports": { "tools.port": 5321 }
```

The key is `"<process>.<name>"` — the exact string inside your `{tools.port}`
placeholder — so a script reads the number under what it already authored,
rather than reconstructing it. `host_port` and `bundle_port` beside it are the
HOST's own, not yours. The map is always present, and empty for a project that
declares no processes.

## Seeing it in the Editor

The rail holds what you have **opened** — a new entry shows up as something you
can open, not as a tab that appears on its own.

