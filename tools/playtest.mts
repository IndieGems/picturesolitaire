// Play the game in a hidden Chrome, for agents' automated checks. Any number of
// runs can go side by side, from any number of agents, without touching each
// other or the creator's desktop:
//
//   - each run starts its OWN game server, inside the calling process, on a port
//     the OS picks, with its own dependency cache. File watching is off, so
//     another agent's edits never reload a test halfway; a run sees the code as
//     it was when its page loaded. It serves the project this file sits in
//     (or --root) the way `npm run dev` there would: that project's own vite,
//     its vite config, and the root that config names. So a copy in a git
//     worktree tests that worktree.
//   - each run starts its OWN Chrome on a fresh profile folder (an ABSOLUTE path:
//     a relative one makes Chrome pop a "cannot read and write to its data
//     directory" box over the creator's work, then fall back to their real
//     profile). It is driven over a pipe, not a port, so it can never meet
//     another run's browser, and it exits by itself if the calling process
//     dies, even when killed outright.
//   - Chrome is muted and must render on the GPU (the creator's rulings); a run
//     on software rendering stops with an error rather than load the CPU. The
//     GPU flags are tools/chromium-gpu.mjs's, per OS; CHROMIUM_ANGLE picks
//     another ANGLE backend.
//   - close() ends exactly what this run started and deletes its folder.
//     Ctrl-C (SIGINT, SIGTERM, Ctrl-Break) does the same for every run of the
//     process, then exits 130. Folders left by runs that were killed are swept
//     by the next run.
//     Never stop test processes by name, port or command-line pattern: that
//     kills other agents' runs, and the Editor's own servers.
//
// From a script (Node 22.18+, or 23.6+ on Node 23, runs this TypeScript
// directly; on Windows import it by a file:/// URL, a bare C:/ path is read as a
// URL scheme). Keep the script and its screenshots in a scratch folder under the
// OS temp folder, never in the project, and delete that folder when done:
//
//   import { playtest } from "file:///C:/games/my-game/tools/playtest.mts";
//   const t = await playtest({ page: "?level=3" });
//   try {
//     await t.waitFor("document.querySelector('canvas')");   // not fixed waits: boots slow under load
//     await t.shot(`${scratch}/a.png`);
//     console.log(await t.eval("document.title"));   // runs in the game's frame
//   } finally {
//     await t.close();
//   }
//
// From the shell, steps run in the order given:
//
//   node tools/playtest.mts "?level=3" --wait-for "document.querySelector('canvas')" \
//     --shot <scratch>/a.png --eval "document.title" --wait 1000 --shot <scratch>/b.png
//   (name pages without a leading slash, "gallery.html#hero": Git Bash turns
//   "/gallery.html" into a Windows file path; MSYS_NO_PATHCONV=1 in front of the
//   command stops it rewriting "/src/..." inside --eval code too)
//   options: --size 390x844 (default, a portrait phone)  --scale 2  --desktop (no touch)
//            --root <project> (default: the one this file is in)
//            --config <vite config, from the project> (default: the one vite finds there)
//   steps:   --wait <ms>  --wait-for <js>  --eval <js>  --eval-file <file>  --shot <png>  --goto <page>
//            --shot-full <png> (the whole page, however long)  --shot-of <selector> <png>
//   for the Gem tools: --jsonl (one JSON event per line on stdout)  --lifeline (stop when stdin closes)
//
// The game runs inside a same-origin frame (id "g"): the Gem SDK refuses to run
// unframed. Nothing answers its handshake, so the game has no player and no saves;
// for those, play it through the Gem host (npm run dev). Its console comes back
// here (t.console, and "page errors" at the end of a shell run), never to
// gemctl serve log. This project's URL switches and dev hooks are in its AGENTS.md.
//
// gem-playtest-tool: 2. `gemctl project doctor` compares this with the version
// it ships, and offers to bring an older copy up to date, keeping the project's
// own changes.

// @ts-nocheck: Node runs this file; it is not part of the game's TypeScript build.

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Plugin, ViteDevServer } from "vite";

export interface PlaytestOptions {
  /** Page of the game server, with query and hash: "?scene=run&bot", "gallery.html#hero". */
  page?: string;
  /**
   * The project to serve: where its vite and its vite config are found, and
   * what a `root` in that config is relative to. Defaults to the one this file
   * sits in.
   */
  root?: string;
  /** The vite config to serve with, relative to the project. Default: the one vite finds there. */
  config?: string;
  width?: number;
  height?: number;
  /** Device pixel ratio of screenshots. */
  scale?: number;
  /** Phone emulation: touch input and a mobile viewport. Default true. */
  mobile?: boolean;
  /** Called with each console line as it arrives ("error: ..."). */
  onConsole?: (line: string) => void;
  /** JavaScript run in the game's frame before its own scripts, on every load. */
  preload?: string;
}

export interface ShotOptions {
  /** Only this element of the game's frame (scrolled into view first). */
  selector?: string;
  /** The frame's whole document, however long, not just the viewport. */
  full?: boolean;
}

export interface Playtest {
  /** The private server's address, e.g. http://127.0.0.1:61234 */
  url: string;
  /** The WebGL renderer Chrome got. */
  gpu: string;
  /** Every console line and page error so far, as "type: text". */
  console: string[];
  /** The errors among them. */
  errors: string[];
  wait(ms: number): Promise<void>;
  /** Evaluate JavaScript in the game's frame; awaits promises, returns the value. */
  eval<T = unknown>(expression: string): Promise<T>;
  /**
   * Evaluate until the value is truthy (errors count as not yet), and return a
   * copy of it (`true` for one that cannot be copied, like a live game object).
   * Prefer it to fixed waits: with several runs going, the game takes seconds
   * longer to boot. waitFor("document.querySelector('canvas')")
   */
  waitFor<T = unknown>(expression: string, timeoutMs?: number): Promise<T>;
  /** A PNG of the page, written to `file` if given. */
  shot(file?: string, options?: ShotOptions): Promise<Buffer>;
  /** Load another page of the same server in the frame. */
  goto(page: string): Promise<void>;
  /** Any DevTools protocol call on the page (input, audio, tracing...). */
  cdp<T = any>(method: string, params?: object): Promise<T>;
  /** Hear a DevTools protocol event of the page, e.g. "Page.screencastFrame". */
  on(method: string, handler: (params: any) => void): void;
  close(): Promise<void>;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const PREFIX = "playtest-";

// The Gem host's settings, should a shell carry them: its port would pin this
// server's, and its origin would send test runs' console into the creator's game log.
delete process.env.GEM_VITE_PORT;
delete process.env.GEM_HOST_ORIGIN;

/** What stopped a run. An error thrown by playtest() carries one as `.reason`. */
type Reason = "usage" | "vite" | "chrome" | "gpu" | "load" | "stopped" | "other";

/** An error that says what stopped the run. */
function fail(reason: Reason, message: string): Error & { reason: Reason } {
  return Object.assign(new Error(message), { reason });
}

/** One phase of starting a run: an error out of it that names no reason of its own is the phase's. */
async function phase<T>(reason: Reason, work: () => T | Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (e) {
    if (!(e instanceof Error)) throw fail(reason, String(e));
    if ((e as { reason?: unknown }).reason === undefined) Object.assign(e, { reason });
    throw e;
  }
}

/** Told each run's folder as soon as it exists. The command line's alone (its "start" event). */
let onRunDir: ((dir: string) => void) | undefined;

function findChrome(): string {
  // A named Chrome is the only one: a wrong name is reported, never answered with another browser.
  const named = process.env.CHROME_PATH;
  if (named) {
    if (!existsSync(named)) throw fail("chrome", `playtest: CHROME_PATH is ${named}, which does not exist`);
    return named;
  }
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  ];
  const found = candidates.find((p) => p && existsSync(p));
  if (!found) throw fail("chrome", "playtest: Chrome not found; set CHROME_PATH");
  return found;
}

// The launch flags that put Chrome on this machine's GPU: tools/chromium-gpu.mjs's
// GPU_ARGS, copied rather than imported, because the Gem tools run their own
// copy of this file with no helper beside it (gem-scaffold's tests hold the two
// to the same flags). The ANGLE backend is per OS unless CHROMIUM_ANGLE says.
const ANGLE_BACKEND =
  process.env.CHROMIUM_ANGLE ||
  ({ win32: "d3d11", darwin: "metal" } as Record<string, string>)[process.platform] ||
  "vulkan";
const GPU_ARGS = [
  "--enable-gpu",
  "--use-gl=angle",
  `--use-angle=${ANGLE_BACKEND}`,
  "--ignore-gpu-blocklist",
  "--enable-gpu-rasterization",
  ...(ANGLE_BACKEND === "vulkan" ? ["--enable-features=Vulkan"] : []),
];

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Delete folders of runs whose process is gone (killed before close()). */
function sweep(): void {
  for (const name of readdirSync(tmpdir())) {
    const m = /^playtest-(\d+)-/.exec(name);
    if (!m || alive(Number(m[1]))) continue;
    try {
      rmSync(join(tmpdir(), name), { recursive: true, force: true });
    } catch {}
  }
}

/** Ends a process and everything it started. */
function killTree(pid: number): void {
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  else {
    try {
      process.kill(pid, "SIGKILL");
    } catch {}
  }
}

/** The same, without blocking: taskkill can take seconds on a loaded machine. */
function killTreeAsync(pid: number): Promise<void> {
  if (process.platform !== "win32") return Promise.resolve(killTree(pid));
  return new Promise((r) => {
    const kill = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    kill.once("close", () => r());
    kill.once("error", () => r());
  });
}

/** Delete a run's folder, retrying while Chrome's last helpers let go of their files. */
async function removeDir(dir: string, ms = 15000): Promise<boolean> {
  const until = Date.now() + ms;
  for (;;) {
    try {
      rmSync(dir, { recursive: true, force: true });
      return true;
    } catch {
      if (Date.now() > until) return false;
      await sleep(250);
    }
  }
}

/**
 * A run not yet closed, and the two ways to end it. `stop` goes in order and
 * waits: Chrome, then the servers, then the folder, because vite's dependency
 * scan writes into the folder until its server is closed and would make it
 * again. `hardStop` is at once and synchronous: for a process already exiting,
 * or a stop that ran out of time.
 */
interface Run {
  stop: () => Promise<void>;
  hardStop: () => void;
}
const runs = new Set<Run>();
const leftover = new Set<string>();
process.once("exit", () => {
  for (const run of runs) run.hardStop();
  for (const dir of leftover) {
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {}
  }
});

/**
 * How long stopping every run may take before what is left is ended at once.
 * Under the Gem tools' 30 s grace with room for the hard stop after it (a
 * taskkill and a bounded folder removal), so a stopped run still gets to report.
 */
const STOP_LIMIT = 15000;

/** Stop every run of this process in order, for at most STOP_LIMIT; then end what is left at once. */
async function stopAll(): Promise<void> {
  // Nothing that dies with the runs may end the process before their clean-up
  // does: a Ctrl-C reaches vite's esbuild too, and when esbuild goes, vite
  // leaves the promise that rejects for it unhandled.
  for (const event of ["unhandledRejection", "uncaughtException"] as const) process.on(event, () => {});
  // Held, unlike a deadline: a run stuck on a promise nothing will settle must
  // still be ended, and reported, rather than the process just running out of work.
  let limit: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Promise.all([...runs].map((run) => run.stop().catch(() => {}))),
    new Promise((r) => (limit = setTimeout(r, STOP_LIMIT))),
  ]);
  clearTimeout(limit);
  for (const run of runs) {
    run.hardStop();
    runs.delete(run);
  }
}

/** What a signal does on the command line: its own report. Unset, every run is stopped and the process exits 130. */
let onSignal: ((signal: string) => void) | undefined;
let signalled = false;
const SIGNALS: NodeJS.Signals[] = ["SIGINT", "SIGTERM", ...(process.platform === "win32" ? ["SIGBREAK" as const] : [])];
for (const signal of SIGNALS)
  process.on(signal, () => {
    // A second one ends the process at once; the exit handler ends what is left.
    if (signalled) process.exit(130);
    signalled = true;
    if (onSignal) onSignal(signal);
    else void stopAll().then(() => process.exit(130));
  });

/** The page Chrome opens: the game in a same-origin frame, src from ?src=. */
function framePage(): Plugin {
  const html = `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{border:0;width:100%;height:100%;display:block}</style>
<iframe id="g" allow="autoplay"></iframe>
<script>document.getElementById("g").src = new URLSearchParams(location.search).get("src") || "/";</script>`;
  return {
    name: "playtest-frame",
    configureServer(server) {
      server.middlewares.use("/__playtest", (_req, res) => {
        res.setHeader("content-type", "text/html");
        res.end(html);
      });
    },
  };
}

/**
 * File watching off, whatever the project's vite config says. Never as inline
 * config: vite's mergeConfig skips a null, so `server: { watch: null }` is lost
 * whenever the project's config has a server block, as every scaffolded one
 * does. The resolved config is what createServer reads, and it starts no
 * watcher only for exactly null (vite 6 and 7).
 */
function noWatching(): Plugin {
  return {
    name: "playtest-no-watching",
    configResolved(config) {
      config.server.watch = null;
    },
  };
}

/** Chrome's DevTools protocol over --remote-debugging-pipe: JSON messages ended by NUL. */
function pipeClient(proc: ChildProcess) {
  const write = proc.stdio[3] as NodeJS.WritableStream;
  const read = proc.stdio[4] as NodeJS.ReadableStream;
  let id = 0;
  let buf = "";
  const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void; method: string }>();
  const listeners = new Set<(msg: any) => void>();
  read.on("data", (chunk: Buffer) => {
    buf += chunk;
    for (let i = buf.indexOf("\0"); i >= 0; i = buf.indexOf("\0")) {
      const msg = JSON.parse(buf.slice(0, i));
      buf = buf.slice(i + 1);
      const p = msg.id !== undefined && pending.get(msg.id);
      if (p) {
        pending.delete(msg.id);
        if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`));
        else p.resolve(msg.result);
      } else for (const l of listeners) l(msg);
    }
  });
  let dead: string | undefined;
  const gone = (why: string) => {
    dead ??= why;
    for (const p of pending.values()) p.reject(new Error(`${p.method}: ${why}`));
    pending.clear();
  };
  proc.once("exit", () => gone("Chrome exited"));
  // A Chrome that could not start: report it to the calls waiting on it, never crash the run's clean-up.
  proc.on("error", (e) => gone(`Chrome did not start (${e.message})`));
  write.on("error", () => {});
  read.on("error", () => {});
  return {
    send<T = any>(method: string, params: object = {}, sessionId?: string): Promise<T> {
      const msg = { id: ++id, method, params, ...(sessionId ? { sessionId } : {}) };
      return new Promise<T>((resolve, reject) => {
        if (dead) return reject(new Error(`${method}: ${dead}`));
        pending.set(msg.id, { resolve, reject, method });
        write.write(JSON.stringify(msg) + "\0");
      });
    },
    on(listener: (msg: any) => void) {
      listeners.add(listener);
    },
  };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** A deadline to race against: it never holds the script open once the race is won. */
const deadline = (ms: number) => new Promise<null>((r) => setTimeout(() => r(null), ms).unref());

/** Whether the project's node_modules, the nearest at or above it, is a link (a git worktree's, to the main checkout). */
function linkedModules(root: string): boolean {
  for (let dir = root; ; dir = dirname(dir)) {
    const modules = join(dir, "node_modules");
    try {
      return lstatSync(modules).isSymbolicLink() || realpathSync(modules).toLowerCase() !== modules.toLowerCase();
    } catch {
      if (dirname(dir) === dir) return false;
    }
  }
}

/** "gallery.html#x", "?scene=run" and "/gallery.html" all name a page of the server. */
function pagePath(page: string): string {
  // Git Bash rewrites an argument like "/gallery.html" into "C:/Program Files/Git/gallery.html".
  if (/^[A-Za-z]:[\\/]/.test(page))
    throw fail("usage", `playtest: "${page}" is a file path; name the page without its leading slash (gallery.html, ?scene=run)`);
  return page.startsWith("/") ? page : `/${page}`;
}

/** The ESM entry of a package's root export: "./dist/node/index.js" from any of vite's shapes. */
function esmEntry(exported: unknown): string | undefined {
  if (typeof exported === "string") return exported;
  if (!exported || typeof exported !== "object") return undefined;
  for (const key of ["import", "module-sync", "default"]) {
    const entry = esmEntry((exported as Record<string, unknown>)[key]);
    if (entry) return entry;
  }
  return undefined;
}

/**
 * The served project's own vite, resolved from the project rather than from
 * this file: a copy of this tool outside the project (the Gem tools run one
 * from a state folder) serves the project with the vite it builds with. Node
 * looks for it from the project's folder up, as if from a package.json there,
 * which need not exist: a game in a folder of a repository whose dependencies
 * sit a level up gets the repository's vite.
 */
async function projectVite(root: string): Promise<typeof import("vite")> {
  let found: string;
  try {
    found = createRequire(join(root, "package.json")).resolve("vite/package.json");
  } catch {
    throw new Error(`playtest: no vite installed for ${root}; run npm install in the project, or name the project's own folder`);
  }
  const pkg = JSON.parse(readFileSync(found, "utf8"));
  const entry = esmEntry(pkg.exports?.["."]) ?? pkg.module ?? pkg.main;
  return import(pathToFileURL(join(dirname(found), entry)).href);
}

/**
 * Start a run: its own server, its own Chrome, the first page loaded. An error
 * says what stopped it in `.reason`: "usage", "vite", "chrome", "gpu", "load",
 * or none for anything else.
 */
export async function playtest(options: PlaytestOptions = {}): Promise<Playtest> {
  const root = resolve(options.root ?? join(HERE, ".."));
  const width = options.width ?? 390;
  const height = options.height ?? 844;
  const mobile = options.mobile ?? true;
  const first = pagePath(options.page ?? "/");
  sweep();
  const dir = mkdtempSync(join(tmpdir(), `${PREFIX}${process.pid}-`));
  onRunDir?.(dir);

  let server: ViteDevServer | undefined;
  let http: HttpServer | undefined;
  let chrome: ChildProcess | undefined;
  let closing = false;
  const stopServers = async () => {
    closing = true;
    await server?.close().catch(() => {});
    http?.closeAllConnections();
    await new Promise((r) => (http?.listening ? http.close(r) : r(null)));
  };
  const hardStop = () => {
    if (chrome?.pid && chrome.exitCode === null) killTree(chrome.pid);
    try {
      // Bounded (about 1.5 s): this runs after STOP_LIMIT too, and a folder
      // still locked here is the next run's to sweep.
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch {}
  };
  // Stopped while it starts (the lifeline, a signal), a run stops where it is:
  // its Chrome goes at once, which fails any call waiting on it, each phase
  // checks in, and the catch below ends the rest in order. Quietly: a Ctrl-C
  // also reaches vite's esbuild, and what vite says about that is noise.
  let stopped = false;
  const ifStopped = () => {
    if (stopped) throw fail("stopped", "playtest: stopped before the game was ready");
  };
  let started = () => {};
  const starting = new Promise<void>((r) => (started = r));
  const run: Run = {
    stop: async () => {
      stopped = true;
      closing = true;
      if (chrome?.pid && chrome.exitCode === null) await killTreeAsync(chrome.pid);
      await starting;
    },
    hardStop,
  };
  runs.add(run);

  try {
    // The project's own vite, resolved from the project, behind a server of
    // ours on a port the OS assigns (vite reads port 0 as "its default, 5173").
    const { createServer, createLogger, loadConfigFromFile } = await phase("vite", () => projectVite(root));
    ifStopped();
    // Errors only, and none once closing: a run that closes while vite is still
    // scanning the project's pages gets a page of "server closed" complaints.
    const logger = createLogger("error", { allowClearScreen: false });
    const logError = logger.error.bind(logger);
    logger.error = (msg, opts) => {
      if (!closing) logError(msg, opts);
    };
    // The project's vite config, found in the project as `npm run dev` there
    // finds it (or the one --config names), read here for the root it names: a
    // root given inline would override the config's own. A relative one is from
    // the project, the folder `npm run dev` runs in. vite is then handed the
    // config by path and loads it again, as its own.
    const loaded = await phase("vite", () => loadConfigFromFile(
      { command: "serve", mode: "development", isSsrBuild: false, isPreview: false },
      options.config ? resolve(root, options.config) : undefined,
      root,
      "error",
      logger,
    ));
    ifStopped();
    const named = loaded?.config.root;
    http = createHttpServer();
    server = await phase("vite", () => createServer({
      configFile: loaded?.path ?? false,
      root: typeof named === "string" ? resolve(root, named) : root,
      cacheDir: join(dir, "vite"),
      clearScreen: false,
      logLevel: "error",
      customLogger: logger,
      server: { middlewareMode: true, hmr: { server: http } },
      // In a git worktree whose node_modules links to the main checkout, keep the
      // link's paths: resolved away, files there lie outside the served folder.
      ...(linkedModules(root) ? { resolve: { preserveSymlinks: true } } : {}),
      plugins: [framePage(), noWatching()],
    }));
    ifStopped();
    http.on("request", server.middlewares);
    await phase("vite", () => new Promise<void>((r, reject) => {
      http!.once("error", reject);
      http!.listen(0, "127.0.0.1", () => {
        http!.off("error", reject);
        r();
      });
    }));
    ifStopped();
    const url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;

    chrome = await phase("chrome", () => spawn(findChrome(), [
      "--headless=new",
      "--remote-debugging-pipe",
      `--user-data-dir=${join(dir, "chrome")}`,
      "--mute-audio",
      ...GPU_ARGS,
      "--no-first-run",
      "--no-default-browser-check",
      "--noerrdialogs",
      // None of Chrome's own background work: each would be another process,
      // downloads into the throwaway profile, or a page throttled behind others.
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-extensions",
      "--disable-component-extensions-with-background-pages",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-breakpad",
      "--disable-client-side-phishing-detection",
      "--disable-features=Translate,OptimizationHints,MediaRouter,AutofillServerCommunication",
      "--metrics-recording-only",
      "--password-store=basic",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--autoplay-policy=no-user-gesture-required",
      "--hide-scrollbars",
      `--window-size=${width},${height}`,
      "about:blank",
    ], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"], windowsHide: true }));
    const browser = chrome;
    const cdp = await phase("chrome", () => pipeClient(browser));

    // Bounded: a Chrome that starts but never answers would otherwise hold the run forever.
    const { sessionId } = await phase("chrome", async () => {
      const attach = (async () => {
        const { targetInfos } = await cdp.send("Target.getTargets");
        const target = targetInfos.find((t: any) => t.type === "page");
        if (!target) throw new Error("playtest: Chrome opened no page");
        return cdp.send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
      })();
      const attached = await Promise.race([attach, deadline(30000)]);
      if (!attached) throw new Error("playtest: Chrome did not answer within 30 s");
      return attached;
    });
    const call = <T = any,>(method: string, params: object = {}) => cdp.send<T>(method, params, sessionId);

    const lines: string[] = [];
    const errors: string[] = [];
    const handlers = new Map<string, Set<(params: any) => void>>();
    const note = (type: string, text: string) => {
      const line = `${type}: ${text}`;
      lines.push(line);
      if (type === "error" || type === "exception") errors.push(line);
      options.onConsole?.(line);
    };
    cdp.on((msg) => {
      if (msg.sessionId !== sessionId) return;
      for (const h of handlers.get(msg.method) ?? []) h(msg.params);
      if (msg.method === "Runtime.consoleAPICalled")
        note(msg.params.type, msg.params.args.map((a: any) => a.value ?? a.description ?? a.type).join(" "));
      else if (msg.method === "Runtime.exceptionThrown") {
        const d = msg.params.exceptionDetails;
        note("exception", d.exception?.description ?? d.text);
      } else if (msg.method === "Log.entryAdded") note(msg.params.entry.level, `${msg.params.entry.text} ${msg.params.entry.url ?? ""}`.trim());
    });
    await phase("chrome", async () => {
      await call("Runtime.enable");
      await call("Log.enable");
      await call("Page.enable");
      await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: options.scale ?? 2, mobile });
      if (mobile) await call("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
      if (options.preload)
        await call("Page.addScriptToEvaluateOnNewDocument", {
          source: `if (window !== window.top && location.href !== "about:blank") {\n${options.preload}\n}`,
        });
    });

    const evaluate = async <T,>(expression: string): Promise<T> => {
      const r = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value as T;
    };

    const gpu = await phase("gpu", async () => {
      const renderer = await evaluate<string>(`(() => {
      const gl = document.createElement("canvas").getContext("webgl");
      if (!gl) return "no WebGL";
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      return String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    })()`);
      if (/SwiftShader|Basic Render|llvmpipe|softpipe|no WebGL/i.test(renderer))
        throw new Error(`playtest: Chrome is rendering on the CPU (${renderer}); tests must run on the GPU`);
      return renderer;
    });

    const goto = async (page: string) => {
      await call("Page.navigate", { url: `${url}/__playtest?src=${encodeURIComponent(pagePath(page))}` });
      for (let i = 0; i < 300; i++) {
        ifStopped();
        const ready = await evaluate<boolean>(
          `(() => { const f = document.getElementById("g"); return !!f && f.contentDocument?.readyState === "complete" && f.contentWindow.location.href !== "about:blank"; })()`,
        ).catch(() => false);
        if (ready) return;
        await sleep(100);
      }
      throw new Error(`playtest: ${page} did not finish loading in 30 s`);
    };
    await phase("load", () => goto(first));

    const FRAME = `document.getElementById("g")`;
    const inFrame = <T,>(expression: string) =>
      evaluate<T>(`(async () => await ${FRAME}.contentWindow.eval(${JSON.stringify(expression)}))()`);

    // Truthiness is judged in the page, and only a value that copies cleanly is
    // sent back: copying a live game object never finishes.
    const check = (expression: string) =>
      evaluate<{ ok: boolean; json?: string }>(`(async () => {
        const v = await ${FRAME}.contentWindow.eval(${JSON.stringify(expression)});
        if (!v) return { ok: false };
        try { const json = JSON.stringify(typeof v === "function" ? true : v); if (json && json.length < 64e6) return { ok: true, json }; } catch {}
        return { ok: true, json: "true" };
      })()`);

    // One clean-up, however many callers: each gets the same promise, settled when it is done.
    let closed: Promise<void> | undefined;
    const t: Playtest = {
      url,
      gpu,
      console: lines,
      errors,
      wait: sleep,
      eval: inFrame,
      async waitFor<T,>(expression: string, timeoutMs = 60000) {
        const until = Date.now() + timeoutMs;
        for (;;) {
          const left = until - Date.now();
          const r = await Promise.race([check(expression).catch(() => ({ ok: false })), deadline(Math.max(0, left))]);
          if (r?.ok) return JSON.parse((r as { json: string }).json) as T;
          if (!r || Date.now() > until) throw new Error(`playtest: waited ${timeoutMs / 1000} s for ${expression}`);
          await sleep(100);
        }
      },
      async shot(file?: string, shotOptions: ShotOptions = {}) {
        let clip: object | undefined;
        let tall = 0;
        if (shotOptions.selector) {
          const box = await evaluate<{ x: number; y: number; width: number; height: number } | null>(`(() => {
            const el = ${FRAME}.contentDocument.querySelector(${JSON.stringify(shotOptions.selector)});
            if (!el) return null;
            el.scrollIntoView({ block: "start", inline: "start" });
            const r = el.getBoundingClientRect();
            return { x: r.left, y: r.top, width: r.width, height: r.height };
          })()`);
          if (!box) throw new Error(`playtest: no ${shotOptions.selector} to shoot`);
          clip = { ...box, scale: 1 };
        } else if (shotOptions.full) {
          tall = await evaluate<number>(`Math.ceil(${FRAME}.contentDocument.documentElement.scrollHeight)`);
          if (tall > height)
            await call("Emulation.setDeviceMetricsOverride", { width, height: tall, deviceScaleFactor: options.scale ?? 2, mobile });
          await sleep(100);
        }
        try {
          const { data } = await call("Page.captureScreenshot", { format: "png", ...(clip ? { clip } : {}) });
          const png = Buffer.from(data, "base64");
          if (file) {
            mkdirSync(dirname(resolve(file)), { recursive: true });
            writeFileSync(file, png);
          }
          return png;
        } finally {
          if (tall > height) await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: options.scale ?? 2, mobile });
        }
      },
      goto,
      cdp: call,
      on(method: string, handler: (params: any) => void) {
        if (!handlers.has(method)) handlers.set(method, new Set());
        handlers.get(method)!.add(handler);
      },
      close() {
        return (closed ??= (async () => {
          closing = true;
          // The browser and every helper it started, at once: asked to close
          // politely, Chrome can take many seconds on a loaded machine, and helpers
          // that outlive it keep the folder locked.
          const proc = chrome!;
          if (proc.exitCode === null && proc.signalCode === null && proc.pid) {
            const exited = new Promise((r) => proc.once("exit", r));
            await killTreeAsync(proc.pid);
            await Promise.race([exited, deadline(5000)]);
          }
          await stopServers();
          if (!(await removeDir(dir))) leftover.add(dir);
          runs.delete(run);
        })());
      },
    };
    ifStopped();
    run.stop = () => t.close();
    started();
    return t;
  } catch (e) {
    // Chrome, then the servers, then the folder (see Run).
    if (chrome?.pid && chrome.exitCode === null) killTree(chrome.pid);
    await stopServers();
    hardStop();
    runs.delete(run);
    started();
    throw stopped ? fail("stopped", "playtest: stopped before the game was ready") : e;
  }
}

// ---- the command line ----

/** Whether node was started on this file. Node runs a module from its real path, so compare
 *  real paths: a temp folder under a symlink (/var on macOS) would never match. */
function isMain(): boolean {
  try {
    return !!process.argv[1] && realpathSync(resolve(process.argv[1])) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

/** Every flag: how many values follow it, and whether it is a step (run in the order given) or an option. */
const FLAGS = new Map<string, { values: number; step: boolean }>([
  ["--size", { values: 1, step: false }],
  ["--scale", { values: 1, step: false }],
  ["--desktop", { values: 0, step: false }],
  ["--root", { values: 1, step: false }],
  ["--config", { values: 1, step: false }],
  ["--jsonl", { values: 0, step: false }],
  ["--lifeline", { values: 0, step: false }],
  ["--wait", { values: 1, step: true }],
  ["--wait-for", { values: 1, step: true }],
  ["--eval", { values: 1, step: true }],
  ["--eval-file", { values: 1, step: true }],
  ["--shot", { values: 1, step: true }],
  ["--shot-full", { values: 1, step: true }],
  ["--shot-of", { values: 2, step: true }],
  ["--goto", { values: 1, step: true }],
]);

interface CommandLine {
  options: PlaytestOptions;
  jsonl: boolean;
  lifeline: boolean;
  /** Each step's flag without its "--" ("wait", "shot-of"), and the values after it. */
  steps: { step: string; values: string[] }[];
}

/**
 * The whole command line, checked before anything starts. A mistyped flag is
 * refused rather than skipped, so a run never passes having done less than it
 * was asked to.
 */
function parseArgs(argv: string[]): CommandLine {
  const args = [...argv];
  const page = args.length && !args[0].startsWith("--") ? args.shift()! : "/";
  pagePath(page);
  const options = new Map<string, string[]>();
  const steps: CommandLine["steps"] = [];
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const spec = FLAGS.get(flag);
    if (!spec) {
      const named = flag.includes("=") ? flag.slice(0, flag.indexOf("=")) : "";
      if (FLAGS.get(named)?.values) throw fail("usage", `unknown flag ${flag}; write ${named} ${flag.slice(named.length + 1)}`);
      if (flag.startsWith("--")) throw fail("usage", `unknown flag ${flag}`);
      throw fail("usage", `"${flag}" follows no flag that takes it; only the page goes before the flags`);
    }
    const values = args.slice(i + 1, i + 1 + spec.values);
    if (values.length < spec.values || values.some((v) => FLAGS.has(v)))
      throw fail("usage", `${flag} needs ${spec.values > 1 ? `${spec.values} values` : "a value"}`);
    i += spec.values;
    if (spec.step) steps.push({ step: flag.slice(2), values });
    else if (options.has(flag)) throw fail("usage", `${flag} is given twice`);
    else options.set(flag, values);
  }

  const size = options.get("--size")?.[0] ?? "390x844";
  const wh = /^(\d+)x(\d+)$/.exec(size);
  if (!wh || Number(wh[1]) < 1 || Number(wh[2]) < 1) throw fail("usage", `--size takes WIDTHxHEIGHT, like 390x844, not "${size}"`);
  const scale = options.get("--scale")?.[0] ?? "2";
  if (!/^(\d+\.?\d*|\.\d+)$/.test(scale) || !(Number(scale) > 0)) throw fail("usage", `--scale takes a number above 0, like 2, not "${scale}"`);
  for (const { step, values } of steps) {
    // setTimeout cannot count past 2^31-1 ms: a longer wait would end at once.
    if (step === "wait" && !(/^\d+$/.test(values[0]) && Number(values[0]) <= 2147483647))
      throw fail("usage", `--wait takes whole milliseconds, like 1000, not "${values[0]}"`);
    if (step === "goto") pagePath(values[0]);
  }
  return {
    options: {
      page,
      width: Number(wh[1]),
      height: Number(wh[2]),
      scale: Number(scale),
      mobile: !options.has("--desktop"),
      config: options.get("--config")?.[0],
      root: options.get("--root")?.[0],
    },
    jsonl: options.has("--jsonl"),
    lifeline: options.has("--lifeline"),
    steps,
  };
}

/** At most 64 KiB of UTF-8, cut where a character starts. */
function capped(text: string): { text: string; cut: boolean } {
  const bytes = Buffer.from(text, "utf8");
  if (bytes.length <= 65536) return { text, cut: false };
  let end = 65536;
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
  return { text: bytes.subarray(0, end).toString("utf8"), cut: true };
}

/** At most `chars` characters, never half of one. */
const clip = (text: string, chars: number) => (text.length <= chars ? text : Array.from(text).slice(0, chars).join(""));

/** An error's message, without the "playtest: " this file's own messages start with. */
const said = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^playtest: /, "");

const REASONS = new Set<string>(["usage", "vite", "chrome", "gpu", "load", "stopped", "other"]);
const reasonOf = (e: unknown): Reason => {
  const reason = (e as { reason?: unknown } | undefined)?.reason;
  return typeof reason === "string" && REASONS.has(reason) ? (reason as Reason) : "other";
};

/**
 * One event as one line. Well-formed text only: a lone surrogate from a page's
 * console would make the whole line unreadable to a strict JSON parser.
 */
const eventLine = (event: Record<string, unknown>) =>
  JSON.stringify(event, (_key, v) => (typeof v === "string" ? v.toWellFormed() : v)) + "\n";

/**
 * The command line. With --jsonl, stdout carries only events, one JSON object
 * per line, {"playtest": kind, ...}: "start" {pid, dir} once the run's folder
 * exists; "ready" {gpu, url}; "step" {n, step, ok, file?, value? (JSON text, at
 * most 64 KiB, truncated: true when cut), message?, ms} once per step; "failed"
 * {reason, message} when the run could not start, or was stopped, before
 * "ready" or after it (reason "stopped": stdin ended under --lifeline, or a
 * signal); and last, once, after the clean-up, "done" {ok, errors, error_count,
 * skipped, removed}. A stop's clean-up gets 15 s, then what is left is ended
 * at once, so even then "done" follows. Only a kill, a second signal while the
 * first is still stopping the run, or a fault of this file's own, ends the
 * process without "done".
 * A throw in an --eval is a failed step and the run goes on; any other failed
 * step skips the rest. Exit 0 when no step failed (page errors alone do not
 * fail a run), 1 when one did or the run could not start, 2 for a usage error,
 * 130 when stopped.
 */
async function main(argv: string[]): Promise<void> {
  // A reader that went away must never interrupt the clean-up.
  process.stdout.on("error", () => {});
  // Known before the parse, so that a usage error is told the way it was asked for.
  const jsonl = argv.includes("--jsonl");
  const emit = (event: Record<string, unknown>) => {
    if (jsonl) process.stdout.write(eventLine(event));
  };
  const say = (...line: unknown[]) => {
    if (!jsonl) console.log(...line);
  };
  const errors: string[] = [];
  const sayPageErrors = () => {
    if (errors.length) say(`page errors (${errors.length}):\n  ${errors.slice(0, 20).join("\n  ")}`);
  };
  let dir: string | undefined;
  let t: Playtest | undefined;
  let steps: CommandLine["steps"] = [];
  let reported = 0;
  let stopping = false;
  let ended = false;

  /** The run's last word, written after its clean-up and waited onto the pipe, then exit. */
  const end = (code: number, ok: boolean, skipped: number) => {
    if (ended) return;
    ended = true;
    if (!jsonl) process.exit(code);
    process.exitCode = code;
    const done = {
      playtest: "done",
      ok,
      errors: errors.slice(0, 20).map((e) => clip(e, 1000)),
      error_count: errors.length,
      skipped,
      removed: dir === undefined || !existsSync(dir),
    };
    setTimeout(() => process.exit(code), 5000);
    process.stdout.write(eventLine(done), () => process.exit(code));
  };

  /**
   * The lifeline ended, or a signal came: whoever started this run is gone or
   * wants it over. Ready or still starting, the run ends in order, and is reported.
   */
  const stop = async (message: string) => {
    if (stopping || ended) return;
    stopping = true;
    await stopAll();
    emit({ playtest: "failed", reason: "stopped", message });
    if (!jsonl) console.error(`playtest: stopped: ${message}`);
    end(130, false, steps.length - reported);
  };
  onSignal = (signal) => void stop(`${signal}: the run was interrupted`);

  let cli: CommandLine;
  try {
    cli = parseArgs(argv);
  } catch (e) {
    emit({ playtest: "failed", reason: "usage", message: said(e) });
    if (!jsonl) console.error(`playtest: ${said(e)} (the flags are in the header of ${relative(process.cwd(), process.argv[1]) || process.argv[1]})`);
    return end(2, false, 0);
  }
  steps = cli.steps;
  if (cli.lifeline) {
    // Read, and what arrives ignored: only its end means anything.
    process.stdin.on("data", () => {});
    for (const event of ["end", "close", "error"])
      process.stdin.on(event, () => void stop("stdin closed: the caller stopped the run"));
  }

  onRunDir = (made) => {
    dir = made;
    emit({ playtest: "start", pid: process.pid, dir: made });
  };
  try {
    t = await playtest({
      ...cli.options,
      onConsole: (line) => {
        if (/^(error|exception): /.test(line)) errors.push(line);
      },
    });
  } catch (e) {
    // Stopped: the stop reports the run.
    if (stopping) return;
    const reason = reasonOf(e);
    emit({ playtest: "failed", reason, message: capped(said(e)).text });
    // Anything untyped is this file's own fault: its stack, for whoever reads stderr.
    if (reason === "other") console.error(e);
    else if (!jsonl) console.error(`playtest: ${said(e)}`);
    sayPageErrors();
    return end(1, false, steps.length);
  }

  emit({ playtest: "ready", gpu: t.gpu, url: t.url });
  say(`serving ${t.url}  gpu ${t.gpu}`);
  let failed = false;
  let skipped = 0;
  try {
    for (const [i, { step, values }] of steps.entries()) {
      const began = performance.now();
      let ok = true;
      let halt = false;
      let file: string | undefined;
      let value: string | undefined;
      let message: string | undefined;
      try {
        if (step === "wait") await t.wait(Number(values[0]));
        else if (step === "wait-for") value = JSON.stringify(await t.waitFor(values[0]));
        else if (step === "shot" || step === "shot-full") {
          await t.shot(values[0], { full: step === "shot-full" });
          file = resolve(values[0]);
        } else if (step === "shot-of") {
          await t.shot(values[1], { selector: values[0] });
          file = resolve(values[1]);
        } else if (step === "goto") await t.goto(values[0]);
        else {
          const code = step === "eval" ? values[0] : readFileSync(values[0], "utf8");
          try {
            value = JSON.stringify(await t.eval(code));
            say("eval:", value);
          } catch (e) {
            // The game's code threw: a finding, not a broken run, so the steps go on.
            ok = false;
            message = e instanceof Error ? e.message : String(e);
            say("eval threw:", message);
          }
        }
        if (file) say(`shot ${file}`);
      } catch (e) {
        ok = false;
        halt = true;
        message = said(e);
      }
      // Stopped: the lifeline reports the run, and nothing may follow its "done".
      if (stopping) return;
      reported++;
      if (!ok) failed = true;
      const shown = value === undefined ? undefined : capped(value);
      emit({
        playtest: "step",
        n: i + 1,
        step,
        ok,
        ...(file ? { file } : {}),
        ...(shown ? { value: shown.text, ...(shown.cut ? { truncated: true } : {}) } : {}),
        ...(message === undefined ? {} : { message: capped(message).text }),
        ms: Math.round(performance.now() - began),
      });
      if (halt) {
        skipped = steps.length - reported;
        say(`${step} failed: ${message}`);
        if (skipped) say(`skipped ${skipped} step(s)`);
        break;
      }
    }
    if (!stopping) sayPageErrors();
  } finally {
    await t.close();
  }
  if (stopping) return;
  end(failed ? 1 : 0, !failed, skipped);
}

if (isMain()) await main(process.argv.slice(2));
