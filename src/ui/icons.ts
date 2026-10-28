// The interface's glyphs, drawn in the button's ink (currentColor) so one
// stylesheet colours them all.
//
// They are the art member's (public/art/ui/icon-*.svg, one slate colour),
// used as a CSS mask over the ink colour (.ico in style.css), so a glyph on an
// amber button can be white. A new glyph is a file there and a line here.

//
// The glyphs come IN the game's script (tools/content-split.mjs, "virtual:ps-icons"; QA, 0.47.0: on
// 4G the gear, plane and calendar were blank ~0.7 s after home while their files came): each is set
// on :root as --ico-<name> as this module loads, before any screen draws. The files stay in public/
// as the fallback a glyph the build did not find still reads.

import GLYPHS from "virtual:ps-icons";

// absolute: a relative base ("./" in a build) in a CSS url() would be read from the stylesheet's folder
const file = (name: string) => new URL(`${import.meta.env.BASE_URL}art/ui/icon-${name}.svg`, location.href).href;
const FILES = new Set<string>();

/**
 * One of the art member's glyphs, as a box the stylesheet fills with the ink colour.
 * It reads the glyph kept in the page (--ico-<name>, keepIcons) once there is one, and
 * the file until then.
 */
const art = (name: string) => {
  FILES.add(name);
  return `<span class="ico" aria-hidden="true" style="--src:var(--ico-${name}, url('${file(name)}'))"></span>`;
};

export const ICONS = {
  gear: art("gear"),
  back: art("back"),
  undo: art("undo"),
  hint: art("hint"),
  shuffle: art("shuffle"),
  restart: art("restart"),
  play: art("play"),
  next: art("next"),
  home: art("home"),
  chevron: art("chevron"),
  albums: art("photos"),
  passport: art("passport"),
  challenges: art("route"),
  check: art("check"),
  lock: art("lock"),
  daily: art("daily"),
  plane: art("plane"),
  rotate: art("rotate"),
  share: art("share"),
  friends: art("friends"),
} as const;

export type IconName = keyof typeof ICONS;

// every glyph the script carries, kept in the page from the start (keepIcons then asks only for any other)
for (const [name, url] of Object.entries(GLYPHS)) document.documentElement.style.setProperty(`--ico-${name}`, `url("${url}")`);

/**
 * Fetch every glyph once, with the first screen, and keep it in the page (a data URL
 * on :root), so a connection dropped later never leaves a button without its glyph:
 * the win card's Next arrow drawn for the first time offline, say. A glyph that does
 * not arrive keeps its file.
 */
export async function keepIcons(): Promise<void> {
  const root = document.documentElement.style;
  await Promise.all(
    [...FILES].filter((name) => !GLYPHS[name]).map(async (name) => {
      try {
        const r = await fetch(file(name));
        if (!r.ok) return;
        const svg = await r.text();
        root.setProperty(`--ico-${name}`, `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
      } catch {
        // offline at boot: the file stays, and the browser asks for it when drawn
      }
    }),
  );
}
