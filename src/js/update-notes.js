// ✏️  EDIT THIS FILE to tell testers what changed. It's shown once per version in an "Update Notes" window
// after the splash screen (or right away on the website, where there's no splash).
//
// To publish new notes: change `version` (that's what makes it show again), update `date`, and rewrite `changes`.
// Players who already closed this version won't see it twice. Add ?notes to the page URL to force it open while testing.
//
// Notes can contain HTML. For an icon, use SINGLE quotes inside the text (double quotes would end the string):
//   "Added the Shield <img class='inline-icon' src='src/imgs/icons/shield.webp' alt=''> power-up."

export const UPDATE_NOTES = {
  version: "0.1.3",
  date: "November 16, 2026",
  changes: [
    "Levels you've completed are shown in the difficulty select menu.",
    "Increase difficulty by reducing the number of hearts on Easy and Normal modes.",
    "Added option to disable auto elimination of empty tiles.",
    "Renamed Wicked difficulty back to Crazy.",
    "New badge on Daily button when fully complete.",
    "After a correct paw placement, the tile retains the pressed state for better clarity.",
    "When tapping a hinted tile, the paw is placed immediately instead of requiring a second tap.",
    "Added a more difficult theme called 'Bleak' - it is a challenge for those who want more",
  ],
};

// Set to true to show the notes on every launch (handy while editing them), false to show once per version.
export const ALWAYS_SHOW = true;
