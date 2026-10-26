// PICTURE PACKS: where a built game finds its picture files (the lead, 2026-10-26: the
// upload takes at most 2,000 files). Art's packer (tools/art/packs.mjs, run after vite
// build) puts every board's board copies in one file, its full pictures in another, and
// each trip's passport copies in a third, and takes the single files out of dist:
//
//   packs/index.json       { boards: { <board id>: { b, f } }, trips: { <trip id>: <pack> } }
//   packs/<name>.pack      a uint32 little-endian JSON length, then {"files":[{path, offset,
//                          length, type}]} (path as the catalogue names it, offset from the
//                          end of the JSON), then the bytes
//
// A board's board copies come in one request before the board shows (the screens ask
// first, and fetch the next board's while the win card is up); a pack several boards share
// (the daily's month, the shared full pictures) is read by HTTP Range, its index first,
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
type Index = { boards: Record<string, { b?: string; f?: string }>; trips: Record<string, string> };

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
/** A pack's index is near its start: the first read asks for this much. */
const HEAD_BYTES = 32 * 1024;

const packUrl = (name: string) => `${base}packs/${name}.pack`;

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

/** Bytes [from, to) of a pack: a Range request, or on a 200 the stream read that far and dropped. */
async function readSpan(url: string, from: number, to: number): Promise<Uint8Array> {
  const stop = new AbortController();
  const r = await fetch(url, { headers: { Range: `bytes=${from}-${to - 1}` }, signal: stop.signal });
  if (r.status === 206) {
    const first = Number(/bytes (\d+)-/.exec(r.headers.get("Content-Range") ?? "")?.[1] ?? from);
    note("range");
    const all = new Uint8Array(await r.arrayBuffer());
    return all.subarray(from - first, from - first + (to - from));
  }
  if (!r.ok || !r.body) throw new Error(`${url}: ${r.status}`);
  note("whole");
  const reader = r.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  while (got < to) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
  }
  stop.abort();
  const all = join(chunks, Math.min(got, to));
  return all.subarray(Math.min(from, all.length), Math.min(to, all.length));
}

/** A whole pack, in one request (one board's own). */
async function readWhole(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
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
function headOf(name: string): Promise<Head> {
  let h = heads.get(name);
  if (!h) {
    h = (async () => {
      const first = await readSpan(packUrl(name), 0, HEAD_BYTES);
      const head = headFrom(first);
      if (head) return head;
      const n = new DataView(first.buffer, first.byteOffset, first.byteLength).getUint32(0, true);
      const more = headFrom(await readSpan(packUrl(name), 0, 4 + n));
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
async function fromPack(name: string, paths: string[], whole: boolean): Promise<string[]> {
  if (whole) {
    const bytes = await readWhole(packUrl(name));
    const head = headFrom(bytes);
    if (!head) throw new Error(`${name}: no index`);
    heads.set(name, Promise.resolve(head));
    // every file of a board's own pack: the board wants them all
    keep([...head.files.values()], head, bytes, 0);
    return paths.filter((p) => !head.files.has(p));
  }
  const head = await headOf(name);
  const here = paths.map((p) => head.files.get(p)).filter((e): e is Entry => !!e);
  if (here.length) {
    const from = head.start + Math.min(...here.map((e) => e.offset));
    const to = head.start + Math.max(...here.map((e) => e.offset + e.length));
    keep(here, head, await readSpan(packUrl(name), from, to), from);
  }
  return paths.filter((p) => !head.files.has(p));
}

/**
 * Fetch pack `name` whole? Only a board's own board-copy pack: the board wants all of it.
 * A pack several boards share (the daily's month), and every full-picture pack (one picture
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

function remember(owner: string, paths: string[]): void {
  const i = recent.indexOf(owner);
  if (i >= 0) recent.splice(i, 1);
  recent.push(owner);
  for (const p of paths) {
    const by = wantedBy.get(p) ?? new Set();
    by.add(owner);
    wantedBy.set(p, by);
  }
  // let go of what only boards long gone wanted (a trip's passport copies are kept)
  while (recent.filter((o) => !o.startsWith("trip:")).length > KEEP) {
    const old = recent.find((o) => !o.startsWith("trip:"))!;
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
 * Load `paths` (catalogue paths: board copies, full pictures, a postcard) from board `board`'s
 * packs (its board copies', then its full pictures'). Resolves once they are resident (at
 * once with no packs); rejects when a pack would not load or does not hold one of them.
 */
export async function ensure(paths: string[], board: string): Promise<void> {
  const idx = await loadIndex();
  if (!idx) return;
  remember(board, paths);
  const want = [...new Set(paths)].filter((p) => !urls.has(p));
  if (!want.length) return;
  const key = `${board}|${want.join("|")}`;
  let job = loading.get(key);
  if (!job) {
    job = (async () => {
      const packs = idx.boards[board];
      if (!packs) throw new Error(`packs: no board ${board}`);
      let left = want;
      for (const name of [packs.b, packs.f]) {
        if (!name || !left.length) continue;
        left = await fromPack(name, left, wholePack(idx, name));
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

/** Are this build's pictures in packs? (false until packs/index.json is read, and in dev) */
export function packed(): boolean {
  return index !== null;
}
