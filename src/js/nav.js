// Mobile hamburger: toggles the slide-down nav (which overlays the page)
export function setupNav() {
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("site-nav");
  if (!toggle || !nav) return;

  const set = open => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };
  const isOpen = () => nav.classList.contains("is-open");

  toggle.addEventListener("click", e => { e.stopPropagation(); set(!isOpen()); });
  nav.addEventListener("click", e => { if (e.target.closest("a")) set(false); });
  document.addEventListener("click", e => { if (isOpen() && !nav.contains(e.target)) set(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && isOpen()) { set(false); toggle.focus(); } });
  window.matchMedia("(min-width: 641px)").addEventListener("change", e => { if (e.matches) set(false); });
}
