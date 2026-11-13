// Theme: Light / Dark. With no saved choice the page follows the system theme,
// and that theme is pre-selected in the dropdown (desktop) / buttons (mobile).
const KEY = "paw-sweep-theme";
const root = document.documentElement;
const media = window.matchMedia("(prefers-color-scheme: dark)");
const LABELS = { light: "Light", dark: "Dark" };
const ICONS = { light: "src/imgs/icons/sun.webp", dark: "src/imgs/icons/moon.webp" };

const saved = () => {
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : null;
};
const effective = () => saved() || (media.matches ? "dark" : "light");

export function setupTheme() {
  const menu = document.getElementById("theme-menu");
  const btn = document.getElementById("theme-menu-btn");
  const list = document.getElementById("theme-menu-list");
  const label = document.getElementById("theme-menu-label");
  const split = document.querySelectorAll(".theme-split button");
  const options = [...list.querySelectorAll("[data-theme-choice]")];

  const backdrop = document.getElementById("levels-backdrop"); // shared page blur, same one the level select uses
  const setOpen = open => {
    menu.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
    backdrop?.classList.toggle("is-open", open);
  };
  backdrop?.addEventListener("click", () => { if (menu.classList.contains("is-open")) setOpen(false); });

  const render = () => {
    const theme = effective();
    if (saved()) root.dataset.theme = theme;
    else delete root.dataset.theme; // follow the system via CSS media query
    label.textContent = LABELS[theme];
    document.getElementById("theme-menu-icon").src = ICONS[theme];
    options.forEach(o => o.setAttribute("aria-selected", String(o.dataset.themeChoice === theme)));
    split.forEach(b => b.setAttribute("aria-checked", String(b.dataset.themeChoice === theme)));
    syncBars(theme);
  };

  // Tint the installed app's status bar / title bar to match the header for the active theme
  const syncBars = theme => {
    const color = getComputedStyle(root).getPropertyValue("--header-bg").trim() || (theme === "dark" ? "#111a2e" : "#fffaf0");
    // Replace the tag rather than editing it: some browsers only re-read theme-color when a new element appears
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.remove());
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = color;
    document.head.appendChild(meta);
    // iOS: "black-translucent" has no light variant, so only the default (light) style is used
    const ios = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (ios) ios.setAttribute("content", theme === "dark" ? "black" : "default");
  };

  const choose = theme => {
    localStorage.setItem(KEY, theme);
    render();
  };

  btn.addEventListener("click", e => { e.stopPropagation(); setOpen(!menu.classList.contains("is-open")); });
  list.addEventListener("click", e => {
    const o = e.target.closest("[data-theme-choice]");
    if (!o) return;
    choose(o.dataset.themeChoice);
    setOpen(false);
    btn.focus();
  });
  split.forEach(b => b.addEventListener("click", () => choose(b.dataset.themeChoice)));

  // Capture phase, so it still runs when another menu's button stops the click from bubbling
  document.addEventListener("click", e => { if (menu.classList.contains("is-open") && !menu.contains(e.target)) setOpen(false); }, true);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) { setOpen(false); btn.focus(); }
  });

  // Keyboard: arrows move through options, Enter/Space selects
  options.forEach(o => (o.tabIndex = 0));
  list.addEventListener("keydown", e => {
    const i = options.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); options[Math.min(i + 1, options.length - 1)].focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); options[Math.max(i - 1, 0)].focus(); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); document.activeElement.click(); }
  });
  btn.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      (options.find(o => o.getAttribute("aria-selected") === "true") || options[0]).focus();
    }
  });

  media.addEventListener("change", render);
  render();
}
