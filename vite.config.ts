import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";

// `npm run dev` runs this server under the Gem host (`gemctl serve start .
// --dev`), which frames it and hands the game a play token, so the game runs
// signed in, the way the arcade runs it. The host assigns the port
// (GEM_VITE_PORT) and waits for the line below to know the server is up.
// Opened on its own, the game here has no identity: no saves, no config.
//
// The host also serves the F2 report panel and takes the console log for
// `gemctl serve log`, at its own address (GEM_HOST_ORIGIN). This server puts
// the panel in the page and passes the panel's and the log's requests on.
const gemHost = process.env.GEM_HOST_ORIGIN;

function gemDevHost(): Plugin {
  return {
    name: "gem-dev-host",
    config: () => (gemHost ? { server: { proxy: { "/__gem": gemHost } } } : {}),
    transformIndexHtml(html) {
      if (!gemHost) return html;
      // The host's copy of the panel, ahead of every game script, in place of
      // any copy the project keeps.
      return {
        html: html.replace(/<script[^>]*gem-report\.js[^>]*><\/script>\s*/g, ""),
        tags: [{ tag: "script", attrs: { src: "/__gem/gem-report.js" }, injectTo: "head-prepend" }],
      };
    },
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        const address = server.httpServer?.address();
        if (address && typeof address === "object") {
          console.log(`GEM_VITE_PORT ${address.port}`);
        }
      });
    },
  };
}

const devPort = Number(process.env.GEM_VITE_PORT) || undefined;

// What the creator's dev menu shows under Build (src/ui/dev-menu.ts): the
// package's version, the commit, whether files had changed since it, and when
// it was built. Only the dev menu reads it, so a release build carries none.
function buildInfo() {
  const git = (...args: string[]) => {
    try {
      return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      return "";
    }
  };
  const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
  return {
    version: String(pkg.version ?? ""),
    sdk: String(pkg.dependencies?.["@indiegems/gem-web-sdk"] ?? ""),
    commit: git("rev-parse", "--short", "HEAD"),
    changed: git("status", "--porcelain", "--untracked-files=no") !== "",
    built: new Date().toISOString(),
  };
}

export default defineConfig({
  // Relative base, so the built bundle serves from any path — which is how
  // the arcade serves versioned bundles.
  base: "./",
  define: { __BUILD_INFO__: JSON.stringify(buildInfo()) },
  build: { outDir: "dist" },
  server: {
    host: "127.0.0.1", port: devPort, strictPort: devPort !== undefined,
    // Agents work in whole copies of the project under .claude/worktrees.
    // Watching them would walk every copy on each start, so leave them out.
    watch: { ignored: ["**/.claude/**"] },
  },
  plugins: [gemDevHost()],
});
