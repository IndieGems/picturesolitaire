// PICTURE PACKS: where a built game finds its picture files (the lead, 2026-10-26: the
// upload takes at most 2,000 files). Art's packer (tools/art/packs.mjs, run after vite
// build) puts every board's board copies in one file (the daily's, a week's in one), every
// full picture ONCE in ~2 MB chunks (Art, 2026-10-27: they were stored once per board), and
// each trip's passport copies in a third, and takes the single files out of dist:
//
//   packs/index.json       { boards: { <board id>: { b } }, trips: { <trip id>: <pack> },
//                          suitcases: { <YYYY-MM>: <pack> } }, read at boot
//                          (a board's `f`, an older build's per-board full pack, is still read)
//   packs/full-index.json  { full: { <chunk>: [<path>...] } }, read only once a full picture is
//                          wanted (the enlarged view; 2026-10-28, ~60 KB the boot never needs).
//                          An older build's index.json carries `full` itself, and is read as is.
//   packs/<name>.bin       a uint32 little-endian JSON length, then {"files":[{path, offset,
//                          length, type}]} (path as the catalogue names it, offset from the
//                          end of the JSON), then the bytes
//
// A board's board copies come in one request before the board shows (the screens ask
// first, and fetch the next board's while the win card is up); a pack several boards share
// (the daily's week, the full-picture chunks) is read by HTTP Range, its index first,
// then only the span that holds the files wanted. A host that ignores Range answers 200:
// the stream is read only as far as the last byte wanted, then dropped. Which one the host
// did is logged once outside a release build, for QA. Every file becomes a blob URL, kept
// for the last few boards and every trip opened.
//
// In the dev loop (and any build without packs/index.json) nothing is packed: every path
// is the plain file under public/, resident at once, and ensure() does nothing. So the
// play-test tool and the dev server keep plain paths.
//
//   fileUrl(path)          the file's address now: its blob URL once loaded, else the plain path
//   resident(path)         loaded (always, with no packs)
//   ensure(paths, board)   load them from that board's packs; resolves once they are resident,
//                          rejects when a pack would not load (the plain path then 404s)
//   ensureTrip(trip)       a trip's passport copies

const base = import.meta.env.BASE_URL;

type Entry = { path: string; offset: number; length: number; type?: string };
/** A pack's own index: where its data starts, and each file in it. */
type Head = { start: number; files: Map<string, Entry> };
/**
 * boards: each board's board-copy pack (f: an older build's per-board full pack).
 * full: the full-picture chunks, each full picture in one of them (Art, 2026-10-27: stored once).
 */
type Index = { boards: Record<string, { b?: string; f?: string }>; full?: Record<string, string[]>; trips: Record<string, string> };

/** Built games read packs; the dev loop never does (import.meta.env.PROD is false there). */
const BUILT = import.meta.env.PROD;
/** packs/index.json once read (null: this build has no packs: plain files). */
let index: Index | null = null;
let indexRead = !BUILT;
let indexLoad: Promise<Index | null> | null = null;

/** Blob URLs by catalogue path, and the boards (or trips) that wanted each, for letting go. */
const urls = new Map<string, string>();
const heads = new Map<string, Promise<Head>>();
const loading = new Map<string, Promise<void>>();
/** Boards in the order last asked for: the newest KEEP keep their files. */
const recent: string[] = [];
const wantedBy = new Map<string, Set<string>>();
const KEEP = 6;
/**
 * The board on screen (holdBoard): its files are never let go while it is up, however many boards are
 * asked for meanwhile. The board keeps drawing what it decoded, but its win card and the enlarged view
 * read the files again (QA/the creator, 0.79.0: replaying the guided start, the win card's balloon was a
 * broken image: board 1's files were resident, so opening it asked for nothing and it stayed the oldest,
 * and the next board's prefetch as the card opened let its own picture go).
 */
let pinned: string | null = null;
/** A pack's index is near its start: the first read asks for this much. */
const HEAD_BYTES = 32 * 1024;
/** Files in a shared pack this close together are read in one span (a gap costs less than a request). */
const GAP = 64 * 1024;
/**
 * Full-picture chunks read at once, at most (QA, 0.32.0: a daily opened after two boards waited
 * seconds where a cold one did not; the guess, not reproduced here, was earlier streams holding the
 * host's connections). Over HTTP/1.1 a browser opens 6 connections a host, so the enlarged view's
 * chunks can take 2 and a board's own pack (or the daily's week) never queues behind them.
 */
const CHUNK_READS = 2;
let chunkReads = 0;
const chunkQueue: (() => void)[] = [];
async function chunkSlot<T>(run: () => Promise<T>): Promise<T> {
  while (chunkReads >= CHUNK_READS) await new Promise<void>((go) => chunkQueue.push(go));
  chunkReads++;
  try {
    return await run();
  } finally {
    chunkReads--;
    chunkQueue.shift()?.();
  }
}

const packUrl = (name: string) => `${base}packs/${name}.bin`;

function loadIndex(): Promise<Index | null> {
  if (!BUILT) return Promise.resolve(null);
  indexLoad ??= (async () => {
    const r = await fetch(`${base}packs/index.json`);
    if (r.status === 404) return null; // a build without packs: plain files
    if (!r.ok) throw new Error(`packs/index.json: ${r.status}`);
    return (await r.json()) as Index;
  })().then(
    (x) => {
      index = x;
      indexRead = true;
      return x;
    },
    (err) => {
      indexLoad = null; // no answer: asked again next time, never taken for "no packs"
      throw err;
    },
  );
  return indexLoad;
}

/**
 * Ask for packs/index.json now (18 KB), so the next board's pack can start the moment home is drawn
 * (app.ts, at boot) rather than an index's round trip later. A failure is asked again on the next ensure.
 */
export function warmIndex(): void {
  void loadIndex().catch(() => undefined);
}

/** The file's address now: its blob URL once loaded, else the plain path. */
export function fileUrl(path: string): string {
  return urls.get(path) ?? `${base}${path}`;
}

/** Loaded: drawing fileUrl(path) will not miss. Always, in a build without packs. */
export function resident(path: string): boolean {
  if (!BUILT) return true;
  if (indexRead && !index) return true;
  return urls.has(path);
}

let noted = false;
/** Once, outside a release build: did the host answer a Range (206) or the whole file (200)? */
function note(how: "range" | "whole"): void {
  if (noted || import.meta.env.MODE === "release") return;
  noted = true;
  console.info(`[packs] the host ${how === "range" ? "answers Range requests (206)" : "ignores Range (200): packs are read up to what is wanted"}`);
}

/** Bytes read from a pack, starting at its byte `at`; `ranged`: the host answered the Range. */
type Read = { bytes: Uint8Array; at: number; ranged: boolean };

/**
 * Bytes [from, to) of a pack by a Range request. A host that ignores Range answers 200 with
 * the whole pack: its stream is read only as far as `orTo` (all that is wanted of the pack,
 * so one stream serves every span of it), then dropped.
 */
async function readSpan(url: string, from: number, to: number, orTo = to, priority?: RequestPriority): Promise<Read> {
  // a host that ignores Range: what an earlier stream already read of this pack serves again
  const pre = prefixes.get(url);
  if (ignoresRange && pre && pre.length >= orTo) return { bytes: pre, at: 0, ranged: false };
  const stop = new AbortController();
  const r = await fetch(url, { headers: { Range: `bytes=${from}-${to - 1}` }, signal: stop.signal, ...(priority ? { priority } : {}) });
  if (r.status === 206) {
    const first = Number(/bytes (\d+)-/.exec(r.headers.get("Content-Range") ?? "")?.[1] ?? from);
    note("range");
    return { bytes: new Uint8Array(await r.arrayBuffer()), at: first, ranged: true };
  }
  if (!r.ok || !r.body) {
    stop.abort(); // nothing of it is wanted: its connection goes back at once
    throw new Error(`${url}: ${r.status}`);
  }
  note("whole");
  ignoresRange = true;
  return { bytes: await streamPrefix(url, r, stop, () => orTo), at: 0, ranged: false };
}

/** The host answered a Range with the whole pack (200): from then on a pack's stream is shared. */
let ignoresRange = false;
/** What streams have read of each pack from its start (the last few packs), when Range is ignored. */
const prefixes = new Map<string, Uint8Array>();

/**
 * Read a 200 stream of a pack from its start until `need(bytes so far)` bytes are in (need may
 * be Infinity until it can tell, e.g. until the pack's index is in), then drop it; what was read
 * is kept for the next read of the same pack.
 */
async function streamPrefix(url: string, r: Response, stop: AbortController, need: (b: Uint8Array) => number): Promise<Uint8Array> {
  const reader = r.body!.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  let want = Infinity;
  for (;;) {
    if (want === Infinity && got) want = need(join(chunks, got));
    if (got >= want) break;
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
  }
  // the rest of the pack is not wanted: the stream is cancelled and the request aborted, so its
  // connection is released now rather than left draining the rest (what was read is kept below)
  void reader.cancel().catch(() => undefined);
  stop.abort();
  const bytes = join(chunks, got);
  const pre = prefixes.get(url);
  if (!pre || bytes.length > pre.length) {
    prefixes.delete(url);
    prefixes.set(url, bytes);
    while (prefixes.size > 2) prefixes.delete(prefixes.keys().next().value!);
  }
  return bytes;
}

/**
 * The host is known to ignore Range: pack `name`'s index and the files wanted come in ONE stream
 * (or none, if an earlier one already read that far).
 */
async function oneStream(name: string, paths: string[], priority?: RequestPriority): Promise<Uint8Array> {
  const url = packUrl(name);
  const need = (b: Uint8Array) => {
    const head = headFrom(b);
    if (!head) return Infinity;
    const ends = paths.map((p) => head.files.get(p)).filter((e): e is Entry => !!e).map((e) => head.start + e.offset + e.length);
    return ends.length ? Math.max(...ends) : head.start;
  };
  const pre = prefixes.get(url);
  if (pre && need(pre) <= pre.length) return pre;
  const stop = new AbortController();
  const r = await fetch(url, { signal: stop.signal, ...(priority ? { priority } : {}) });
  if (!r.ok || !r.body) {
    stop.abort();
    throw new Error(`${url}: ${r.status}`);
  }
  return streamPrefix(url, r, stop, need);
}

/** A whole pack, in one request (one board's own). */
async function readWhole(url: string, priority?: RequestPriority): Promise<Uint8Array> {
  const r = await fetch(url, priority ? { priority } : {});
  if (!r.ok) {
    void r.body?.cancel().catch(() => undefined);
    throw new Error(`${url}: ${r.status}`);
  }
  return new Uint8Array(await r.arrayBuffer());
}

function join(chunks: Uint8Array[], size: number): Uint8Array {
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    if (at >= size) break;
    const n = Math.min(c.length, size - at);
    out.set(c.subarray(0, n), at);
    at += n;
  }
  return out;
}

/** A pack's index from its first bytes (null: they hold less than the whole index yet). */
function headFrom(bytes: Uint8Array): Head | null {
  if (bytes.length < 4) return null;
  const n = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true);
  if (bytes.length < 4 + n) return null;
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + n))) as { files: Entry[] };
  return { start: 4 + n, files: new Map(json.files.map((f) => [f.path, f])) };
}

/** A pack's index, read once: its first HEAD_BYTES, more if the index is longer. */
function headOf(name: string, priority?: RequestPriority): Promise<Head> {
  let h = heads.get(name);
  if (!h) {
    h = (async () => {
      const first = (await readSpan(packUrl(name), 0, HEAD_BYTES, HEAD_BYTES, priority)).bytes;
      const head = headFrom(first);
      if (head) return head;
      const n = new DataView(first.buffer, first.byteOffset, first.byteLength).getUint32(0, true);
      const more = headFrom((await readSpan(packUrl(name), 0, 4 + n, 4 + n, priority)).bytes);
      if (!more) throw new Error(`${name}: no index`);
      return more;
    })();
    h.catch(() => heads.delete(name));
    heads.set(name, h);
  }
  return h;
}

/** Make blob URLs of `entries`, whose bytes are `bytes` starting at the pack's byte `at`. */
function keep(entries: Entry[], head: Head, bytes: Uint8Array, at: number): void {
  for (const e of entries) {
    if (urls.has(e.path)) continue;
    const from = head.start + e.offset - at;
    const part = bytes.subarray(from, from + e.length);
    if (part.length !== e.length) continue;
    urls.set(e.path, URL.createObjectURL(new Blob([part as Uint8Array<ArrayBuffer>], { type: e.type ?? "image/webp" })));
  }
}

/** Load `paths` that pack `name` holds; the rest are returned. */
async function fromPack(name: string, paths: string[], whole: boolean, priority?: RequestPriority): Promise<string[]> {
  if (whole) {
    const bytes = await readWhole(packUrl(name), priority);
    const head = headFrom(bytes);
    if (!head) throw new Error(`${name}: no index`);
    heads.set(name, Promise.resolve(head));
    // every file of a board's own pack: the board wants them all
    keep([...head.files.values()], head, bytes, 0);
    return paths.filter((p) => !head.files.has(p));
  }
  if (ignoresRange) {
    const bytes = await oneStream(name, paths, priority);
    const head = headFrom(bytes);
    if (!head) throw new Error(`${name}: no index`);
    heads.set(name, Promise.resolve(head));
    keep(paths.map((p) => head.files.get(p)).filter((e): e is Entry => !!e), head, bytes, 0);
    return paths.filter((p) => !head.files.has(p));
  }
  const head = await headOf(name, priority);
  const here = paths
    .map((p) => head.files.get(p))
    .filter((e): e is Entry => !!e)
    .sort((a, b) => a.offset - b.offset);
  if (here.length) {
    // runs of files close together: a gap under GAP is read rather than asked for twice
    const runs: Entry[][] = [];
    for (const e of here) {
      const run = runs[runs.length - 1];
      const end = run ? run[run.length - 1]!.offset + run[run.length - 1]!.length : -Infinity;
      if (run && e.offset - end <= GAP) run.push(e);
      else runs.push([e]);
    }
    const span = (run: Entry[]) => [head.start + run[0]!.offset, head.start + run[run.length - 1]!.offset + run[run.length - 1]!.length] as const;
    const last = span(runs[runs.length - 1]!)[1];
    // the first run says whether the host answers Range; a 200's one stream then serves them all
    const [from, to] = span(runs[0]!);
    const first = await readSpan(packUrl(name), from, to, last, priority);
    if (!first.ranged) keep(here, head, first.bytes, first.at);
    else {
      keep(runs[0]!, head, first.bytes, first.at);
      await Promise.all(
        runs.slice(1).map(async (run) => {
          const [a, b] = span(run);
          const r = await readSpan(packUrl(name), a, b, last, priority);
          keep(r.ranged ? run : here, head, r.bytes, r.at);
        }),
      );
    }
  }
  return paths.filter((p) => !head.files.has(p));
}

/**
 * Fetch pack `name` whole? Only a board's own board-copy pack: the board wants all of it.
 * A pack several boards share (the daily's week), and every full-picture pack (one picture
 * is wanted at a time), is read by Range.
 */
function wholePack(idx: Index, name: string): boolean {
  let b = 0;
  let other = 0;
  for (const packs of Object.values(idx.boards)) {
    if (packs.b === name) b++;
    if (packs.f === name) other++;
  }
  return b === 1 && other === 0;
}

/** Which full chunk holds each full picture: the full index turned round, once it is read. */
let fullOf: Map<string, string> | null = null;
let fullLoad: Promise<Map<string, string>> | null = null;
/** The full index (packs/full-index.json, or an older build's index.full), read on the first ask. */
function loadFull(idx: Index): Promise<Map<string, string>> {
  const turn = (full: Record<string, string[]>) => {
    const m = new Map<string, string>();
    for (const [name, paths] of Object.entries(full)) for (const p of paths) m.set(p, name);
    return (fullOf = m);
  };
  if (fullOf) return Promise.resolve(fullOf);
  if (idx.full) return Promise.resolve(turn(idx.full));
  fullLoad ??= (async () => {
    const r = await fetch(`${base}packs/full-index.json`);
    if (!r.ok) throw new Error(`packs/full-index.json: ${r.status}`);
    return turn(((await r.json()) as { full?: Record<string, string[]> }).full ?? {});
  })().catch((err: unknown) => {
    fullLoad = null; // asked again next time
    throw err;
  });
  return fullLoad;
}
/** The chunk holding full picture `path`, as far as the full index is read yet. */
function chunkOf(path: string): string | undefined {
  return fullOf?.get(path);
}

function remember(owner: string, paths: string[]): void {
  const i = recent.indexOf(owner);
  if (i >= 0) recent.splice(i, 1);
  recent.push(owner);
  for (const p of paths) {
    const by = wantedBy.get(p) ?? new Set();
    by.add(owner);
    wantedBy.set(p, by);
  }
  // let go of what only boards long gone wanted (a trip's passport copies are kept, and the board on screen)
  const going = () => recent.filter((o) => !o.startsWith("trip:") && o !== pinned);
  while (going().length > KEEP) {
    const old = going()[0]!;
    recent.splice(recent.indexOf(old), 1);
    for (const [p, by] of wantedBy) {
      by.delete(old);
      if (by.size) continue;
      wantedBy.delete(p);
      const u = urls.get(p);
      if (u) URL.revokeObjectURL(u);
      urls.delete(p);
    }
  }
}

/**
 * Board `board` is opening, its files `paths`: it is the newest asked for, and its files stay while it is
 * up (until the next board opens), loaded already or not. Call it as every board opens.
 */
export function holdBoard(board: string, paths: string[]): void {
  pinned = board;
  remember(board, paths);
}

/**
 * Load `paths` (catalogue paths: board copies, full pictures, a postcard) from board `board`'s
 * packs (its board copies', then its full pictures'). Resolves once they are resident (at
 * once with no packs); rejects when a pack would not load or does not hold one of them.
 * `priority: "low"`: the board's own pack is asked for behind what the page needs now (home's
 * pictures: the next board's, started with home); a later ask for the same files joins it.
 */
export async function ensure(paths: string[], board: string, opts: { full?: boolean; priority?: RequestPriority } = {}): Promise<void> {
  const idx = await loadIndex();
  if (!idx) return;
  remember(board, paths);
  const want = [...new Set(paths)].filter((p) => !urls.has(p));
  if (!want.length) return;
  const key = `${board}|${want.join("|")}`;
  let job = loading.get(key);
  if (!job) {
    job = (async () => {
      // full pictures go straight to their chunk (the full index): a board's own pack never holds
      // one, so the enlarged view (opts.full) of a board not opened this session does not fetch that
      // board's pack. Not told, and the full index not read yet, the board's pack is tried first
      // and what it lacks is looked for in the full index after (a board drawing full pictures).
      if (opts.full || idx.full) await loadFull(idx);
      let chunked = want.filter((p) => chunkOf(p));
      let left = want.filter((p) => !chunkOf(p));
      const packs = idx.boards[board];
      if (left.length && !packs) throw new Error(`packs: no board ${board}`);
      for (const name of [packs?.b, packs?.f]) {
        if (!name || !left.length) continue;
        // a pack whose index is known to hold none of them is not fetched again
        const known = heads.has(name) ? await heads.get(name)!.catch(() => null) : null;
        if (known && !left.some((p) => known.files.has(p))) continue;
        left = await fromPack(name, left, wholePack(idx, name), opts.priority);
      }
      if (left.length && !fullOf) {
        await loadFull(idx);
        chunked = [...chunked, ...left.filter((p) => chunkOf(p))];
        left = left.filter((p) => !chunkOf(p));
      }
      // full pictures: each in one shared chunk, read by Range like any shared pack (a host that
      // ignores Range: one stream per chunk, read only as far as the pictures wanted)
      if (chunked.length) {
        const by = new Map<string, string[]>();
        for (const p of chunked) by.set(chunkOf(p)!, [...(by.get(chunkOf(p)!) ?? []), p]);
        const rest = await Promise.all([...by].map(([name, ps]) => chunkSlot(() => fromPack(name, ps, false))));
        left = [...left, ...rest.flat()];
      }
      if (left.length) throw new Error(`packs: board ${board} has no ${left.join(", ")}`);
    })();
    loading.set(key, job);
    void job.catch(() => undefined).finally(() => loading.delete(key));
  }
  return job;
}

/** Trips whose passport copies are resident. */
const tripsIn = new Set<string>();

/** A trip's passport copies (its own pack, whole), read once. */
export async function ensureTrip(trip: string): Promise<void> {
  if (tripsIn.has(trip)) return;
  const idx = await loadIndex();
  if (!idx) return;
  const name = idx.trips[trip];
  if (!name) return;
  const owner = `trip:${trip}`;
  let job = loading.get(owner);
  if (!job) {
    job = (async () => {
      const bytes = await readWhole(packUrl(name));
      const head = headFrom(bytes);
      if (!head) throw new Error(`${name}: no index`);
      keep([...head.files.values()], head, bytes, 0);
      remember(owner, [...head.files.keys()]);
      tripsIn.add(trip);
    })();
    loading.set(owner, job);
    void job.catch(() => undefined).finally(() => loading.delete(owner));
  }
  return job;
}

const suitcasesIn = new Set<string>();

/** A month's suitcase items (their cut-outs, or board copies while Art's are stand-ins: its own pack, whole), read once. */
export async function ensureSuitcase(month: string): Promise<void> {
  if (suitcasesIn.has(month)) return;
  const idx = await loadIndex();
  const name = (idx as (Index & { suitcases?: Record<string, string> }) | null)?.suitcases?.[month];
  if (!name) return;
  const owner = `suitcase:${month}`;
  let job = loading.get(owner);
  if (!job) {
    job = (async () => {
      const bytes = await readWhole(packUrl(name));
      const head = headFrom(bytes);
      if (!head) throw new Error(`${name}: no index`);
      keep([...head.files.values()], head, bytes, 0);
      remember(owner, [...head.files.keys()]);
      suitcasesIn.add(month);
    })();
    loading.set(owner, job);
    void job.catch(() => undefined).finally(() => loading.delete(owner));
  }
  return job;
}

/** Are this build's pictures in packs? (false until packs/index.json is read, and in dev) */
export function packed(): boolean {
  return index !== null;
}
