// ✏️  EDIT THIS FILE to tell testers what changed. It's shown once per version in an "Update Notes" window
// after the splash screen (or right away on the website, where there's no splash).
//
// To publish new notes: change `version` (that's what makes it show again), update `date`, and rewrite `changes`.
// Players who already closed this version won't see it twice. Add ?notes to the page URL to force it open while testing.
//
// Notes can contain HTML. For an icon, use SINGLE quotes inside the text (double quotes would end the string):
//   "Added the Shield <img class='inline-icon' src='src/imgs/icons/shield.webp' alt=''> power-up."

export const UPDATE_NOTES = {
  version: "0.1.2b",
  date: "November 16, 2026",
  changes: [
    "Updated the rainbow glow effect on hinted tiles so they hopefully stand out more.",
    "Updated the <strong>Share</strong> text link to reflect the new website.",
    "Polished older icons to fit in with the newer style.",
    "Updated the Undo icon.",
    "Increased space between hearts.",
  ],
};

// Set to true to show the notes on every launch (handy while editing them), false to show once per version.
export const ALWAYS_SHOW = false;
