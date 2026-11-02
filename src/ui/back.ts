// EVERY SCREEN'S BACK, IN WORDS (the creator's pick of four, 2026-11-02: "A: Labelled pill", after "the back
// button is still not very noticeable ... needs to be immediately findable"): the red pill at the top row's right
// end says "← Back" in the player's language, the arrow and the word, in the same place every screen has it
// (style.css .btn.top-back). Each screen still makes its own Back (its press and what it does are its own);
// this puts the word on all of them once they are built (app.ts), and tells the title pills how wide Back has
// grown in this language ("Zurück", "Indietro"), so a title gives way (it shrinks, then wraps: fit.ts) and never
// runs under Back: --back-w on :root, which style.css's .top-pill and the top row's probe (top-row.ts) read.

import { liveText } from "./i18n";

/** Put the word on every screen's Back under `root`, and keep --back-w the width the widest one is drawn at. */
export function wearBackWords(root: ParentNode): void {
  const backs = [...root.querySelectorAll<HTMLElement>(".btn.top-back")];
  const measure = (): void => {
    const w = Math.max(0, ...backs.map((b) => b.offsetWidth));
    // a hidden screen's Back measures nothing: keep what a shown one said
    if (w > 0) document.documentElement.style.setProperty("--back-w", `${Math.ceil(w)}px`);
  };
  const seen = new ResizeObserver(measure);
  for (const b of backs) {
    if (!b.querySelector(":scope > .back-word")) {
      const word = document.createElement("span");
      word.className = "back-word";
      word.setAttribute("aria-hidden", "true"); // the button's own aria-label says where it goes
      b.append(liveText(word, "back.word"));
    }
    seen.observe(b);
  }
}
