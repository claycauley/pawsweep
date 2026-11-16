// Accessibility options. Each is a switch in the Options modal ([data-a11y-toggle]), OFF by default
// (unless `def: "on"`), remembered in localStorage, and applied as a class on <html> that the CSS reacts to.
const OPTIONS = {
  colorblind: { key: "paw-sweep-colorblind", cls: "cb-mode" },
  contrast: { key: "paw-sweep-contrast", cls: "hc-mode" },
  autox: { key: "paw-sweep-auto-x", def: "on" }, // read by state.js (placeCat); no CSS class needed
};

export function setupAccessibility() {
  const root = document.documentElement;
  const toggles = document.querySelectorAll("[data-a11y-toggle]");
  const isOn = o => (localStorage.getItem(o.key) ?? o.def ?? "off") === "on";

  const apply = name => {
    const o = OPTIONS[name];
    const on = isOn(o);
    if (o.cls) root.classList.toggle(o.cls, on);
    toggles.forEach(t => { if (t.dataset.a11yToggle === name) t.setAttribute("aria-checked", String(on)); });
  };

  Object.keys(OPTIONS).forEach(apply);
  toggles.forEach(t => t.addEventListener("click", () => {
    const name = t.dataset.a11yToggle, o = OPTIONS[name];
    if (!o) return;
    localStorage.setItem(o.key, isOn(o) ? "off" : "on");
    apply(name);
  }));
}
