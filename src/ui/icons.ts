// The interface's glyphs, drawn in the button's ink (currentColor) so one
// stylesheet colours them all.
//
// They are the art member's (public/art/ui/icon-*.svg, one slate colour),
// used as a CSS mask over the ink colour (.ico in style.css), so a glyph on an
// amber button can be white. A new glyph is a file there and a line here.

/** One of the art member's glyphs, as a box the stylesheet fills with the ink colour. */
const art = (name: string) => `<span class="ico" aria-hidden="true" style="--src:url('${import.meta.env.BASE_URL}art/ui/icon-${name}.svg')"></span>`;

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
  challenges: art("route"),
  check: art("check"),
  lock: art("lock"),
  daily: art("daily"),
} as const;

export type IconName = keyof typeof ICONS;
