import { state, startClock, pauseClock, elapsedMs } from "./state.js";

const fmt = ms => {
  const s = Math.floor(Math.max(0, ms) / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = n => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
};

// Starts on the first tap in the grid; pauses while Options / How to Play is open or the tab is hidden,
// and picks up again on the next tap in the grid. Stops for good on a win or loss.
export function setupTimer() {
  const el = document.getElementById("timer-text");
  if (!el) return;

  document.getElementById("grid-container")?.addEventListener("pointerdown", startClock, true);

  const modals = ["help-modal", "options-modal", "update-modal"].map(id => document.getElementById(id)).filter(Boolean);
  const obs = new MutationObserver(() => { if (modals.some(m => m.classList.contains("is-open"))) pauseClock(); });
  modals.forEach(m => obs.observe(m, { attributes: true, attributeFilter: ["class"] }));
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseClock(); });

  setInterval(() => {
    if (state.won || state.lost) pauseClock();
    el.textContent = fmt(state.won && state.solvedMs ? state.solvedMs : elapsedMs());
  }, 250);
}
