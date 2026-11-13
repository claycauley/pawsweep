// Accessibility options. Each is a switch in the Options modal ([data-a11y-toggle]), OFF by default,
// remembered in localStorage, and applied as a class on <html> that the CSS reacts to.
const OPTIONS = {
  colorblind: { key: "paw-sweep-colorblind", cls: "cb-mode" },
  contrast: { key: "paw-sweep-contrast", cls: "hc-mode" },
};

export function setupAccessibility() {
  const root = document.documentElement;
  const toggles = document.querySelectorAll("[data-a11y-toggle]");

  const apply = name => {
    const o = OPTIONS[name];
    const on = localStorage.getItem(o.key) === "on";
    root.classList.toggle(o.cls, on);
    toggles.forEach(t => { if (t.dataset.a11yToggle === name) t.setAttribute("aria-checked", String(on)); });
  };

  Object.keys(OPTIONS).forEach(apply);
  toggles.forEach(t => t.addEventListener("click", () => {
    const name = t.dataset.a11yToggle, o = OPTIONS[name];
    if (!o) return;
    localStorage.setItem(o.key, localStorage.getItem(o.key) === "on" ? "off" : "on");
    apply(name);
  }));
}
