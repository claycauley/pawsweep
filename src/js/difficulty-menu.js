// Difficulty dropdown (opens under the button, closes on pick / outside click / Esc).
// The choice itself is handled in main.js through the [data-diff] buttons.
export function setupDifficultyMenu() {
  const menu = document.getElementById("difficulty");
  const btn = document.getElementById("diff-btn");
  const list = document.getElementById("diff-list");
  if (!menu || !btn || !list) return;

  const set = open => {
    menu.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
  };

  btn.addEventListener("click", () => set(!menu.classList.contains("is-open")));
  list.addEventListener("click", e => { if (e.target.closest("[data-diff]")) { set(false); btn.focus({ preventScroll: true }); } });
  // Capture phase, so it still runs when another menu stops the click from bubbling
  document.addEventListener("click", e => { if (!menu.contains(e.target)) set(false); }, true);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) { set(false); btn.focus({ preventScroll: true }); }
  });
}
