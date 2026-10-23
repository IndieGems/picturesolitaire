// The interface's glyphs, drawn in the button's ink (currentColor) so one
// stylesheet colours them all.
//
// The art member's glyphs (public/art/ui/icon-*.svg, one slate colour) are
// used as a CSS mask over the ink colour (.ico in style.css), so a glyph on an
// amber button can be white. The few the art set has no glyph for are line
// glyphs adapted from Lucide (ISC licence, lucide.dev), drawn heavy and round
// to sit beside them.

/** One of the art member's glyphs, as a box the stylesheet fills with the ink colour. */
const art = (name: string) => `<span class="ico" aria-hidden="true" style="--src:url('${import.meta.env.BASE_URL}art/ui/icon-${name}.svg')"></span>`;

const line = (body: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICONS = {
  gear: art("gear"),
  back: art("back"),
  undo: art("undo"),
  hint: art("hint"),
  shuffle: art("shuffle"),
  restart: art("restart"),
  play: art("play"),
  next: line(`<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>`),
  home: line(`<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>`),
  chevron: line(`<path d="m9 5 7 7-7 7"/>`),
  albums: line(`<rect x="3" y="5" width="14" height="14" rx="2.5"/><path d="M7 2.5h11.5A2.5 2.5 0 0 1 21 5v11.5"/><path d="m3.5 16 4-4 3 3 2-2 4 4"/><circle cx="12.5" cy="9.5" r="1.2"/>`),
} as const;

export type IconName = keyof typeof ICONS;
