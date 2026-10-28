// Text that must never be cut off (the game standard: 12 px at least, never an
// ellipsis): a label keeps one line at its own size when it fits, else wraps
// to two lines, else steps its size down, never under 12 px. A long picture
// title in the top row beside a wide Gem, or a long stuck line on a small
// phone, wraps instead of losing its ends.
//
// ONE LINE FIRST (`oneLine`): a line of the two-line top row (a friend's board,
// a daily, a Souvenir) has no room for a wrap at its own size, so it steps its
// size down on one line, and wraps only at 12 px, where two lines still fit
// under its heading (QA, 0.41.0: "To beat: 20 · You: 15" wrapped to a third line
// beside the Gem at 360x640 and was cut).

const MIN = 12;

function fits(el: HTMLElement): boolean {
  return el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1;
}

/** Fit `el`'s text in its box now: wrap, then shrink; or, `oneLine`, shrink, then wrap at the least size. */
export function fitText(el: HTMLElement, oneLine = false): void {
  if (!el.isConnected || el.hidden || !el.clientWidth) return;
  el.style.removeProperty("font-size");
  el.classList.remove("wrapped");
  if (fits(el)) return;
  if (!oneLine) el.classList.add("wrapped");
  let size = parseFloat(getComputedStyle(el).fontSize);
  while (!fits(el) && size > MIN) {
    size = Math.max(MIN, size - 1);
    el.style.fontSize = `${size}px`;
  }
  if (oneLine && !fits(el)) el.classList.add("wrapped");
}

/** Keep `el` fitted whenever its box or its words change (`oneLine`: see fitText). */
export function keepFitted(el: HTMLElement, oneLine = false): void {
  let queued = false;
  const again = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fitText(el, oneLine);
    });
  };
  new ResizeObserver(again).observe(el);
  new MutationObserver(again).observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  again();
}
