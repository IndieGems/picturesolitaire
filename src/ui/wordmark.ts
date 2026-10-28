// Art's drawn title (the travel-poster logo, wide: creator, 2026-10-28), in two
// sizes: the 840 px file for phones, the 1400 px one where the small one would
// be stretched. That is a tablet's big column, where home grows (style.css --k),
// and a tall phone with a 3x screen: home draws the title up to 300 CSS px wide
// on a phone ((100dvh - 560px) * 2, so past 280 px from 700 px tall), 900 device
// px there, more than the 840 the small file has. Every other phone (2x, or
// shorter) keeps the light file. The boot (src/main.ts) asks for the same one.

const base = import.meta.env.BASE_URL;

export const WORDMARK = {
  /** 840 x 420: sharp to about 420 CSS px on a 2x screen. */
  small: `${base}art/wordmark.webp`,
  /** 1400 x 700: sharp to about 700 CSS px on a 2x screen. */
  big: `${base}art/wordmark-1400.webp`,
  /** Where the title draws wider than the small file stays sharp: home's --k past about 1.25, or a 3x screen 700 px tall. */
  bigWhere: "(min-width: 500px) and (min-height: 1040px), (min-resolution: 2.9dppx) and (min-height: 700px)",
} as const;
