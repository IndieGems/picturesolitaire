// The interface's glyphs, drawn in the button's ink (currentColor) so one
// stylesheet colours them all. Stand-ins until the art member's icons land in
// public/art/ui/: swap the string here and every button follows.
//
// Line glyphs adapted from Lucide (ISC licence, lucide.dev), drawn heavier
// and with round ends to match the plump chrome of design/concepts/game-l.png.

const line = (body: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

/** A fat gear with a round hole, as on the concept's top bar. */
function gear(): string {
  let teeth = "";
  for (let i = 0; i < 8; i++) teeth += `<rect x="9.6" y="1.2" width="4.8" height="5.6" rx="1.6" transform="rotate(${i * 45} 12 12)"/>`;
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><mask id="gear-hole"><rect width="24" height="24" fill="#fff"/><circle cx="12" cy="12" r="3.3" fill="#000"/></mask></defs><g fill="currentColor" mask="url(#gear-hole)"><circle cx="12" cy="12" r="7.6"/>${teeth}</g></svg>`;
}

export const ICONS = {
  gear: gear(),
  back: line(`<path d="M15 5 8 12l7 7"/>`),
  undo: line(`<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>`),
  hint: line(`<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>`),
  shuffle: line(`<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h2a4 4 0 0 0 3.3-1.7l5.4-7.6A4 4 0 0 1 16 7h6"/><path d="M2 6h2a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6a4 4 0 0 1-3.3-1.8l-.4-.5"/>`),
  restart: line(`<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>`),
  play: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" d="M8 5.2v13.6a1 1 0 0 0 1.5.86l10.6-6.8a1 1 0 0 0 0-1.72L9.5 4.34A1 1 0 0 0 8 5.2z"/></svg>`,
  next: line(`<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>`),
  home: line(`<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>`),
} as const;

export type IconName = keyof typeof ICONS;
