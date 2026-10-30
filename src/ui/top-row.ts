// THE TOP ROW WHEN THE ARCADE'S CORNER GROWS (the game standard, "The top of the screen has one layout"):
// the Gem's corner, with the player's Gems and Coins beside it once the game asks for them
// (src/settings-screen.ts, setWalletVisible), is the Arcade's, and every top row lays out around it
// (--gem-reserved-*, style.css's --row-left and --row-right). On a phone the wallet can leave a screen's
// title too little room: about 120 px with nothing in the wallet, less as the balances grow. Then the
// title steps down onto a line of its own, under the Gem, the full width of the column, and the screen
// below it moves down with it (html.row-tight: style.css redefines --row-bottom on a screen with a
// title); Back stays at the row's right end. Measured, never guessed: a probe laid out exactly as a
// title would be, at every resize and every change of the reserved corner (the SDK writes it on :root).

/** A title narrower than this steps down (a short word at 20 px, or two short ones at 12, fit in more). */
const MIN_TITLE_PX = 100;

export function watchTopRow(app: HTMLElement): void {
  const probe = document.createElement("div");
  probe.className = "top-row-probe";
  probe.setAttribute("aria-hidden", "true");
  app.append(probe);
  let tight: boolean | null = null;
  const measure = () => {
    const next = probe.getBoundingClientRect().width < MIN_TITLE_PX;
    if (next === tight) return;
    tight = next;
    document.documentElement.classList.toggle("row-tight", next);
  };
  addEventListener("resize", measure);
  new MutationObserver(measure).observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
  new ResizeObserver(measure).observe(app);
  measure();
}
