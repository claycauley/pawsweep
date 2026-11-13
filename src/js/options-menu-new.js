// Options: one modal, opened by the nav gear (desktop) or the Options button under the power-ups (mobile).
export function setupOptions() {
  const openers = ["opt-menu-btn", "opt-head-btn", "opt-fab"].map(id => document.getElementById(id)).filter(Boolean);
  const modal = document.getElementById("options-modal");
  const close = document.getElementById("options-close");
  if (!modal || !close || !openers.length) return;

  let opener = null;
  const isOpen = () => modal.classList.contains("is-open");
  const set = open => {
    modal.classList.toggle("is-open", open);
    if (open) close.focus({ preventScroll: true });
    else if (opener) opener.focus({ preventScroll: true });
  };

  openers.forEach(b => b.addEventListener("click", () => { opener = b; set(true); }));
  close.addEventListener("click", () => set(false));
  modal.addEventListener("click", e => { if (e.target === modal) set(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && isOpen()) set(false); });
}