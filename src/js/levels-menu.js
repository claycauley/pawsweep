import { state, DIFFICULTIES, levelCount, clearedCount, unlockedCount, goToLevel, pauseClock } from "./state.js";
import { render } from "./render.js";

// Level select (nav): shows the levels of the chosen difficulty, a page at a time.
// Desktop: dropdown with 50 levels per page. Mobile: slides down inside the nav with 25 per page.
// Pages are a scroll-snap strip, so swiping works natively; dots and arrows do the same for mouse users.
// Only beaten levels (plus the next one to play) can be opened.
const CHECK = '<img class="lvl__badge" src="src/imgs/icons/checkmark.webp" alt="">';
const LOCK = '<img class="lvl__badge" src="src/imgs/icons/lock.webp" alt="">';

export function setupLevels() {
  const menu = document.getElementById("levels-menu");
  if (!menu) return;
  const btn = document.getElementById("levels-menu-btn");
  const title = document.getElementById("levels-title");
  const count = document.getElementById("levels-count");
  const viewport = document.getElementById("levels-viewport");
  const track = document.getElementById("levels-track");
  const dots = document.getElementById("levels-dots");
  const prev = document.getElementById("levels-prev");
  const next = document.getElementById("levels-next");
  const mq = window.matchMedia("(max-width: 760px)");
  const backdrop = document.getElementById("levels-backdrop");
  backdrop?.addEventListener("click", () => setOpen(false));

  const perPage = () => (mq.matches ? 25 : 50);
  const pageCount = () => Math.ceil(levelCount(state.difficulty) / perPage());
  const isOpen = () => menu.classList.contains("is-open");
  const currentPage = () => Math.round(viewport.scrollLeft / Math.max(1, viewport.clientWidth));

  const setOpen = open => {
    if (open) { build(); pauseClock(); }
    menu.classList.toggle("is-open", open);
    backdrop?.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
    if (open) goToPage(Math.floor(((state.mode === "level" ? state.level : unlockedCount(state.difficulty)) - 1) / perPage()), false);
  };

  function build() {
    const diff = state.difficulty, per = perPage(), pages = pageCount(), LEVEL_COUNT = levelCount(diff);
    const cleared = clearedCount(diff), unlocked = unlockedCount(diff);
    const playing = state.mode === "level" ? state.level : 0;
    title.textContent = `${DIFFICULTIES[diff].label} Levels`;
    count.textContent = `${unlocked}/${LEVEL_COUNT} unlocked`;
    menu.style.setProperty("--lvl-cols", mq.matches ? 5 : 10);

    let html = "";
    for (let p = 0; p < pages; p++) {
      html += `<div class="levels-menu__page" role="group" aria-label="Levels ${p * per + 1} to ${Math.min(LEVEL_COUNT, (p + 1) * per)}">`;
      for (let i = p * per + 1; i <= Math.min(LEVEL_COUNT, (p + 1) * per); i++) {
        const locked = i > unlocked, beaten = i <= cleared;
        const cls = "lvl" + (locked ? " is-locked" : "") + (beaten ? " is-beaten" : "") + (i === playing ? " is-current" : "");
        const label = `Level ${i}` + (locked ? ", locked" : beaten ? ", beaten" : "");
        html += `<button type="button" class="${cls}" data-level="${i}" aria-label="${label}"${i === playing ? ' aria-current="true"' : ""}${locked ? " disabled" : ""}>${i}${locked ? LOCK : beaten ? CHECK : ""}</button>`;
      }
      html += "</div>";
    }
    track.innerHTML = html;
    dots.innerHTML = Array.from({ length: pages }, (_, p) =>
      `<button type="button" class="levels-menu__dot" data-page="${p}" aria-label="Page ${p + 1} of ${pages}"></button>`).join("");
    showPage();
  }

  function showPage() {
    const p = currentPage(), last = pageCount() - 1;
    dots.querySelectorAll(".levels-menu__dot").forEach((d, i) => {
      d.classList.toggle("is-active", i === p);
      if (i === p) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
    });
    prev.disabled = p <= 0;
    next.disabled = p >= last;
  }

  function goToPage(p, smooth = true) {
    p = Math.max(0, Math.min(pageCount() - 1, p));
    viewport.scrollTo({ left: p * viewport.clientWidth, behavior: smooth ? "smooth" : "instant" });
    showPage();
  }

  let raf = 0;
  viewport.addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(showPage); }, { passive: true });
  prev.addEventListener("click", () => goToPage(currentPage() - 1));
  next.addEventListener("click", () => goToPage(currentPage() + 1));
  dots.addEventListener("click", e => {
    const d = e.target.closest("[data-page]");
    if (d) goToPage(+d.dataset.page);
  });

  track.addEventListener("click", e => {
    const b = e.target.closest(".lvl");
    if (!b || b.disabled) return;
    if (goToLevel(+b.dataset.level)) {
      render();
      setOpen(false);
      // Mobile: also fold the slide-down nav away
      document.getElementById("site-nav")?.classList.remove("is-open");
      document.getElementById("nav-toggle")?.setAttribute("aria-expanded", "false");
    }
  });

  btn.addEventListener("click", e => { e.stopPropagation(); setOpen(!isOpen()); });
  document.addEventListener("click", e => { if (isOpen() && !mq.matches && !menu.contains(e.target)) setOpen(false); }, true);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && isOpen()) { setOpen(false); btn.focus(); }
  });
  // Mobile: closing the hamburger menu (toggle, outside tap, Esc, etc.) also folds the level panel away
  const nav = document.getElementById("site-nav");
  if (nav) new MutationObserver(() => { if (!nav.classList.contains("is-open") && isOpen()) setOpen(false); })
    .observe(nav, { attributes: true, attributeFilter: ["class"] });

  // Page size changes between phone and desktop widths
  mq.addEventListener("change", () => { if (isOpen()) setOpen(false); });
}
