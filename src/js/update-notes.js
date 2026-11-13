// ✏️  EDIT THIS FILE to tell testers what changed. It's shown once per version in an "Update Notes" window
// after the splash screen (or right away on the website, where there's no splash).
//
// To publish new notes: change `version` (that's what makes it show again), update `date`, and rewrite `changes`.
// Players who already closed this version won't see it twice. Add ?notes to the page URL to force it open while testing.
//
// Notes can contain HTML. For an icon, use SINGLE quotes inside the text (double quotes would end the string):
//   "Added the Shield <img class='inline-icon' src='src/imgs/icons/shield.webp' alt=''> power-up."

export const UPDATE_NOTES = {
  version: "0.1.1",
  date: "November 13, 2026",
  changes: [
    "Meet your new power up, <strong>Shield</strong> <img class='inline-icon' src='src/imgs/icons/shield.webp' alt=''>. It blocks your next 2 wrong paw placements.",
    "The <strong>Hint</strong> <img class='inline-icon' src='src/imgs/icons/hint.webp' alt=''> no longer places the correct paw for you. Don't worry, it's not that bad. I think it's cooler.",
    "Placing a correct <strong>Paw</strong> <img class='inline-icon' src='src/imgs/icons/paw-print.webp' alt=''> will now automatically <img class='inline-icon' src='src/imgs/icons/cross-mark.webp' alt=''> all ruled out tiles. No more manually trying to tap tiny tiles.",
    "Updated icons.",
    "Reworked win screen so you don't accidentally tap a random button after placing the last paw."
  ],
};

// Set to true to show the notes on every launch (handy while editing them), false to show once per version.
export const ALWAYS_SHOW = false;
