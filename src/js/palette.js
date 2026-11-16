// Tile color palette (Options > Theme > Color Palette). Applied as data-palette on <html>;
// the CSS swaps the --palette-N variables, so no re-render is needed. "default" removes the attribute.
const KEY = "paw-sweep-palette";
const CHOICES = ["default", "pastel", "vibrant", "warm", "cool", "easter", "valentine", "halloween", "thanksgiving", "christmas", "bleak"];

export function setupPalette() {
  const root = document.documentElement;
  const buttons = document.querySelectorAll("[data-palette-choice]");
  const menu = document.getElementById("palette-menu");
  const btn = document.getElementById("palette-btn");
  const current = document.getElementById("palette-current");

  const apply = () => {
    const saved = localStorage.getItem(KEY);
    const cur = CHOICES.includes(saved) ? saved : "default";
    if (cur === "default") root.removeAttribute("data-palette");
    else root.dataset.palette = cur;
    buttons.forEach(b => {
      const on = b.dataset.paletteChoice === cur;
      b.setAttribute("aria-selected", String(on));
      b.classList.toggle("is-active", on);
      if (on && current) current.textContent = b.textContent;
    });
  };

  // Dropdown: opens upward (it sits at the bottom of the Options modal), closes on pick / outside click / Esc
  const list = document.getElementById("palette-list");
  // Make every option as wide as the longest one: measure each at its natural width, then share the largest
  const equalise = () => {
    if (!list) return;
    list.style.setProperty("--opt-col", "max-content");
    const w = Math.max(...[...list.children].map(b => b.getBoundingClientRect().width));
    list.style.setProperty("--opt-col", `${Math.ceil(w)}px`);
  };
  const set = open => {
    if (!menu || !btn) return;
    if (open) equalise();
    menu.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
  };
  btn?.addEventListener("click", () => set(!menu.classList.contains("is-open")));
  document.addEventListener("click", e => { if (menu && !menu.contains(e.target)) set(false); }, true);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && menu?.classList.contains("is-open")) {
      e.stopPropagation(); // don't also close the Options modal
      set(false);
      btn.focus({ preventScroll: true });
    }
  }, true);

  buttons.forEach(b => b.addEventListener("click", () => {
    localStorage.setItem(KEY, b.dataset.paletteChoice);
    apply();
    set(false);
    btn?.focus({ preventScroll: true });
  }));
  apply();
}
