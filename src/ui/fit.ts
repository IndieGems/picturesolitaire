// Text that must never be cut off (the game standard: 12 px at least, never an
// ellipsis): a label keeps one line at its own size when it fits, else wraps
// to two lines, else steps its size down, never under 12 px. A long picture
// title in the top row beside a wide Gem, or a long stuck line on a small
// phone, wraps instead of losing its ends.

const MIN = 12;

function fits(el: HTMLElement): boolean {
  return el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1;
}

/** Fit `el`'s text in its box now. */
export function fitText(el: HTMLElement): void {
  if (!el.isConnected || el.hidden || !el.clientWidth) return;
  el.style.removeProperty("font-size");
  el.classList.remove("wrapped");
  if (fits(el)) return;
  el.classList.add("wrapped");
  let size = parseFloat(getComputedStyle(el).fontSize);
  while (!fits(el) && size > MIN) {
    size = Math.max(MIN, size - 1);
    el.style.fontSize = `${size}px`;
  }
}

/** Keep `el` fitted whenever its box or its words change. */
export function keepFitted(el: HTMLElement): void {
  let queued = false;
  const again = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fitText(el);
    });
  };
  new ResizeObserver(again).observe(el);
  new MutationObserver(again).observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  again();
}
