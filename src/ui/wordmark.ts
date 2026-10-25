// Art's drawn title, in two sizes: the 840 px file for phones, the 1400 px one
// only where home draws the title large (a tablet's big column, where home
// grows: style.css --k), so a phone never downloads the big one. The boot
// (src/main.ts) asks for the same one the screen will draw.

const base = import.meta.env.BASE_URL;

export const WORDMARK = {
  /** 840 x 420: sharp to about 420 CSS px on a 2x screen. */
  small: `${base}art/wordmark.webp`,
  /** 1400 x 700: sharp to about 700 CSS px on a 2x screen. */
  big: `${base}art/wordmark-1400.webp`,
  /** Where the title draws wider than the small file stays sharp (home's --k past about 1.25). */
  bigWhere: "(min-width: 500px) and (min-height: 1040px)",
} as const;
