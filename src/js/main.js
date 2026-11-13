import { state, newLevel, newDaily, setDifficulty, startDaily, exitDaily, undo, dailyUnlocked, anyDailyDone, restoreDailyPending } from "./state.js";
import { playSfx } from "./music.js";
import { $, render } from "./render.js";
import { setupInput } from "./input.js";
import { setupTheme } from "./theme-switch-new.js";
import { setupNav } from "./nav.js";
import { setupHelp } from "./help-modal-new.js";
import { setupPwa } from "./pwa.js";
import { hideSplash } from "./splash-new.js";
import { showUpdateNotes, setupVersionLink } from "./update-notes-modal.js";
import { setupMusic } from "./music.js";
import { setupOptions } from "./options-menu-new.js";
import { setupAccessibility } from "./accessibility.js";
import { setupPalette } from "./palette.js";
import { setupDifficultyMenu } from "./difficulty-menu.js";
import { setupTimer } from "./timer.js";
import { setupLevels } from "./levels-menu.js";

setupInput();
setupTheme();
setupNav();
setupHelp();
setupPwa();
setupMusic();
setupOptions();
setupAccessibility();
setupPalette();
setupDifficultyMenu();
setupTimer();
setupLevels();
setupVersionLink();
$("daily").onclick = e => {
  e.preventDefault();
  startDaily();
  render();
  // Nothing beaten yet today: explain how the dailies work
  if (!anyDailyDone()) openDailyIntro();
};
// Play: from the Daily puzzle, go back to the level the player was on; otherwise do nothing (no page reload)
$("play").onclick = e => {
  e.preventDefault();
  if (state.mode !== "daily") return;
  exitDaily();
  render();
};

// Undo the last ✕ tap / drag
$("undo").onclick = () => { if (undo()) playSfx("src/sfx/undo.mp3"); render(); };

// Mobile: button under the power-ups that leaves the daily (same as Play)
$("leave-daily").onclick = () => { if (state.mode === "daily") { exitDaily(); render(); } };

// Daily intro modal
const dailyModal = $("daily-modal");
function openDailyIntro() { dailyModal.classList.add("is-open"); $("daily-go").focus({ preventScroll: true }); }
const closeDailyIntro = () => dailyModal.classList.remove("is-open");
$("daily-go").onclick = closeDailyIntro;
dailyModal.addEventListener("click", e => { if (e.target === dailyModal) closeDailyIntro(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && dailyModal.classList.contains("is-open")) closeDailyIntro(); });

$("difficulty").addEventListener("click", e => {
  const btn = e.target.closest("[data-diff]");
  if (!btn || btn.dataset.diff === state.difficulty) return;
  const daily = state.mode === "daily";
  if (daily && !dailyUnlocked(btn.dataset.diff)) return; // locked daily
  setDifficulty(btn.dataset.diff, !daily);
  daily ? newDaily() : newLevel();
  render();
});

newLevel();
restoreDailyPending(); // a beaten daily with unclaimed rewards reopens its reward card
render();
hideSplash().then(showUpdateNotes); // update notes open once the splash is gone
