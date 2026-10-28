// The app script's files, named to the boot entry so it can fetch them WHILE the Arcade's handshake
// is under way (lead, 2026-10-28: the 1 MB app script only started downloading after the bridge
// settled, ~2 s later unthrottled). src/main.ts reads them as __PS_APP_FILES__ after the frame's
// `load` event, which is when the Arcade offers the handshake: asked for before it, they would hold
// `load`, and with it the offer (the game standard, "Boot through a tiny entry"). It only fetches
// them (modulepreload, into the page's module map, never evaluated) and evaluates the game after the
// bridge as before, so nothing parses the game while the offer is waiting to be delivered.
//
// The list: the chunk src/ui/app.ts builds into, its static imports not already loaded with the
// entry, and their CSS, as paths relative to the entry's own folder. The entry already names the app
// chunk in its import(), so its hash still follows every change of these files.
// In the dev loop nothing is replaced: __PS_APP_FILES__ is undefined there and main.ts skips it.

import { dirname, posix } from "node:path";

const NAME = "__PS_APP_FILES__";

export function bootPrefetch() {
  return {
    name: "ps-boot-prefetch",
    apply: "build",
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((c) => c.type === "chunk");
      // the chunk holding src/ui/app.ts (not by facadeModuleId: rollup leaves that null on a dynamic
      // entry whose chunk other chunks import from)
      const holds = (c, end) => (c.moduleIds ?? Object.keys(c.modules)).some((m) => m.replace(/\\/g, "/").endsWith(end));
      const app = chunks.find((c) => holds(c, "/src/ui/app.ts"));
      const entries = chunks.filter((c) => c.code.includes(NAME));
      if (!app || !entries.length) {
        this.error(`boot-prefetch: ${app ? `no chunk names ${NAME} (src/main.ts)` : "no chunk holds src/ui/app.ts"}`);
        return;
      }
      /** A chunk and everything it imports statically. */
      const closure = (start) => {
        const out = new Set();
        const walk = (f) => {
          if (out.has(f)) return;
          out.add(f);
          for (const i of bundle[f]?.imports ?? []) walk(i);
        };
        walk(start);
        return out;
      };
      for (const entry of entries) {
        const loaded = closure(entry.fileName);
        const js = [...closure(app.fileName)].filter((f) => !loaded.has(f));
        const css = new Set();
        for (const f of js) for (const c of bundle[f]?.viteMetadata?.importedCss ?? []) css.add(c);
        const dir = dirname(entry.fileName).replace(/\\/g, "/");
        const rel = (f) => {
          const r = posix.relative(dir === "." ? "" : dir, f);
          return r.startsWith(".") ? r : `./${r}`;
        };
        const list = [...js, ...css].map(rel);
        entry.code = entry.code.split(NAME).join(JSON.stringify(list));
      }
    },
  };
}
