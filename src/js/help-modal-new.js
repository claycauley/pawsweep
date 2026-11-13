// "How to Play" modal: opens from the nav link, closes via button, backdrop click or Esc
export function setupHelp() {
  const link = document.getElementById("how-to-play");
  const modal = document.getElementById("help-modal");
  const close = document.getElementById("help-close");
  if (!link || !modal || !close) return;

  // Swap Tap/Double-tap wording for Click/Double-click on devices with a mouse.
  // Touch wording is the default in the markup.
  const mouse = window.matchMedia("(hover: hover) and (pointer: fine)");
  const wording = () => {
    modal.querySelectorAll("[data-touch][data-mouse]").forEach(el => {
      el.textContent = mouse.matches ? el.dataset.mouse : el.dataset.touch;
    });
  };
  wording();
  mouse.addEventListener("change", wording);

  const isOpen = () => modal.classList.contains("is-open");
  const set = open => {
    modal.classList.toggle("is-open", open);
    if (open) close.focus({ preventScroll: true });
    else link.focus({ preventScroll: true });
  };

  link.addEventListener("click", e => { e.preventDefault(); set(true); });
  close.addEventListener("click", () => set(false));
  modal.addEventListener("click", e => { if (e.target === modal) set(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && isOpen()) set(false); });
}
