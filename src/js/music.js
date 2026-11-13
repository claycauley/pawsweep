// Looping background music. Browsers block audio until the player interacts with the page,
// so playback starts on the first tap / click / key press. Players can switch it off from the
// Options menu (every [data-music-toggle] button); the choice is remembered.
// Music styles. To add one, drop the file in src/sfx and add a line here: the Options dropdown builds itself
// from this list (5 per column, new columns appear automatically). Keep each id unique; it is what gets saved.
const MUSIC_STYLES = [
  { id: "1", label: "Cozy", src: "src/sfx/background-music.mp3" },
  { id: "2", label: "Whimsy", src: "src/sfx/background-music-alt.mp3" },
  { id: "3", label: "Café", src: "src/sfx/background-music-alt-2.mp3" },
  { id: "4", label: "Groove", src: "src/sfx/background-music-alt-3.mp3" },
  { id: "5", label: "Daydream", src: "src/sfx/background-music-alt-4.mp3" },
  { id: "6", label: "Drizzle", src: "src/sfx/background-music-alt-5.mp3" },
  { id: "7", label: "Ripple", src: "src/sfx/background-music-alt-6.mp3" },
  { id: "8", label: "Sunny", src: "src/sfx/background-music-alt-7.mp3" },
  { id: "9", label: "Sway", src: "src/sfx/background-music-alt-8.mp3" },
  { id: "10", label: "Meadow", src: "src/sfx/background-music-alt-9.mp3" },
  { id: "11", label: "Breeze", src: "src/sfx/background-music-alt-10.mp3" },
  { id: "12", label: "Misty", src: "src/sfx/background-music-alt-11.mp3" },
  { id: "13", label: "Jazzy", src: "src/sfx/background-music-alt-12.mp3" },
  { id: "14", label: "Plucky", src: "src/sfx/background-music-alt-13.mp3" },
  { id: "15", label: "Bloom", src: "src/sfx/background-music-alt-14.mp3" },
];
const STYLES = Object.fromEntries(MUSIC_STYLES.map(s => [s.id, s.src]));
const STYLE_KEY = "paw-sweep-music-style";
export const SFX_KEY = "paw-sweep-sfx";
export const sfxEnabled = () => localStorage.getItem(SFX_KEY) !== "off";
const SFX_VOL_KEY = "paw-sweep-sfx-volume";
export const sfxVolume = () => {
  const v = parseFloat(localStorage.getItem(SFX_VOL_KEY));
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1; // 0 to 1, full volume by default
};
// One-shot sound effects (undo, cheer): preloaded once, a fresh copy per play so quick repeats overlap.
// Respects the Sound Effects toggle and volume.
const sfxCache = {};
export const playSfx = src => {
  if (!sfxEnabled()) return;
  const base = sfxCache[src] ??= Object.assign(new Audio(src), { preload: "auto" });
  const c = base.cloneNode();
  c.volume = sfxVolume();
  c.play().catch(() => {});
};
const MUSIC_MAX = 0.75;            // music volume when the slider is at 100%
const MUSIC_VOL_KEY = "paw-sweep-music-volume";
const musicLevel = () => {
  const v = parseFloat(localStorage.getItem(MUSIC_VOL_KEY));
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.35; // default ≈ the old fixed 0.1
};
const VOLUME = 0.1; // initial value only; the slider takes over in setupMusic
const KEY = "paw-sweep-music";

// The launch splash holds the music back until its Play button is pressed, then fades it in
let holdStart = false, fadeHook = null;
export const holdMusic = on => { holdStart = on; };
export const fadeInMusic = ms => fadeHook?.(ms);

export function setupMusic() {
  const audio = new Audio(STYLES[localStorage.getItem(STYLE_KEY)] || STYLES["1"]);
  audio.loop = true;
  audio.volume = VOLUME;
  audio.preload = "auto";

  const toggles = document.querySelectorAll("[data-music-toggle]");
  let enabled = localStorage.getItem(KEY) !== "off"; // on by default
  let started = false;

  const show = () => toggles.forEach(t => t.setAttribute("aria-checked", String(enabled)));

  const events = ["pointerdown", "keydown", "touchend"];
  const start = () => {
    if (holdStart || started || !enabled) return;
    audio.play().then(() => {
      started = true;
      events.forEach(t => window.removeEventListener(t, start));
    }).catch(() => { /* still blocked: try again on the next interaction */ });
  };
  events.forEach(t => window.addEventListener(t, start));

  toggles.forEach(t => t.addEventListener("click", () => {
    enabled = !enabled;
    localStorage.setItem(KEY, enabled ? "on" : "off");
    show();
    if (enabled) audio.play().then(() => { started = true; }).catch(() => {});
    else audio.pause();
  }));
  show();

  // Start the music with a fade-in (used by the splash Play button). Does nothing if Background Music is off.
  fadeHook = ms => {
    if (!enabled || started) return;
    const target = () => musicLevel() * MUSIC_MAX;
    audio.volume = 0;
    audio.play().then(() => {
      started = true;
      events.forEach(t => window.removeEventListener(t, start));
      const t0 = performance.now();
      const step = now => {
        const k = Math.min(1, (now - t0) / ms);
        audio.volume = target() * k;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }).catch(() => { audio.volume = target(); });
  };

  // Sound effects toggle (saved now; effects themselves come later)
  const sfx = document.querySelectorAll("[data-sfx-toggle]");
  const showSfx = () => sfx.forEach(t => t.setAttribute("aria-checked", String(sfxEnabled())));
  sfx.forEach(t => t.addEventListener("click", () => {
    localStorage.setItem(SFX_KEY, sfxEnabled() ? "off" : "on");
    showSfx();
  }));
  showSfx();

  // Sound effects volume slider (0-100); releasing it plays a sample tap
  const vol = document.querySelectorAll("[data-sfx-volume]");
  const sfxPreview = new Audio("src/sfx/tap.mp3");
  vol.forEach(s => {
    const sync = () => {
      s.style.setProperty("--fill", `${s.value}%`);
      s.setAttribute("aria-valuetext", `${s.value}%`);
    };
    s.value = Math.round(sfxVolume() * 100);
    sync();
    s.addEventListener("input", () => {
      localStorage.setItem(SFX_VOL_KEY, String(s.value / 100));
      sync();
    });
    s.addEventListener("change", () => {
      if (!sfxEnabled()) return;
      const c = sfxPreview.cloneNode();
      c.volume = sfxVolume();
      c.play().catch(() => {});
    });
  });

  // Music volume slider: 100% on the slider = MUSIC_MAX
  document.querySelectorAll("[data-music-volume]").forEach(s => {
    const sync = () => {
      s.style.setProperty("--fill", `${s.value}%`);
      s.setAttribute("aria-valuetext", `${s.value}%`);
    };
    s.value = Math.round(musicLevel() * 100);
    audio.volume = musicLevel() * MUSIC_MAX;
    sync();
    s.addEventListener("input", () => {
      localStorage.setItem(MUSIC_VOL_KEY, String(s.value / 100));
      audio.volume = (s.value / 100) * MUSIC_MAX;
      sync();
    });
  });

  // Music style dropdown: the options are built from MUSIC_STYLES. The choice is saved, but it only plays
  // while Background Music is on (otherwise it previews).
  const styleMenu = document.getElementById("music-style-menu");
  const styleBtn = document.getElementById("music-style-btn");
  const styleList = document.getElementById("music-style-list");
  const styleCurrent = document.getElementById("music-style-current");
  if (styleList) styleList.innerHTML = MUSIC_STYLES.map(s =>
    `<button type="button" role="option" aria-selected="false" data-music-style="${s.id}">${s.label}</button>`).join("");
  const styleBtns = document.querySelectorAll("[data-music-style]");
  const showStyle = () => {
    const cur = STYLES[localStorage.getItem(STYLE_KEY)] ? localStorage.getItem(STYLE_KEY) : "1";
    styleBtns.forEach(b => {
      const on = b.dataset.musicStyle === cur;
      b.setAttribute("aria-selected", String(on));
      b.classList.toggle("is-active", on);
      if (on && styleCurrent) styleCurrent.textContent = b.textContent;
    });
  };
  // Open / close (same behaviour as the palette dropdown); every option gets the width of the widest one
  const setStyleMenu = open => {
    if (!styleMenu || !styleBtn) return;
    if (open) {
      styleList.style.setProperty("--opt-col", "max-content");
      const w = Math.max(...[...styleList.children].map(b => b.getBoundingClientRect().width));
      styleList.style.setProperty("--opt-col", `${Math.ceil(w)}px`);
    }
    styleMenu.classList.toggle("is-open", open);
    styleBtn.setAttribute("aria-expanded", String(open));
  };
  styleBtn?.addEventListener("click", () => setStyleMenu(!styleMenu.classList.contains("is-open")));
  document.addEventListener("click", e => { if (styleMenu && !styleMenu.contains(e.target)) setStyleMenu(false); }, true);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && styleMenu?.classList.contains("is-open")) {
      e.stopPropagation(); // don't also close the Options modal
      setStyleMenu(false);
      styleBtn.focus({ preventScroll: true });
    }
  }, true);
  // With Background Music off, picking a style plays it on a loop until Options is closed
  let previewAudio = null;
  const stopPreview = () => {
    if (previewAudio) { previewAudio.pause(); previewAudio = null; }
  };
  const preview = src => {
    stopPreview();
    previewAudio = new Audio(src);
    previewAudio.loop = true;
    previewAudio.volume = musicLevel() * MUSIC_MAX;
    previewAudio.play().catch(() => {});
  };
  styleBtns.forEach(b => b.addEventListener("click", () => {
    localStorage.setItem(STYLE_KEY, b.dataset.musicStyle);
    showStyle();
    setStyleMenu(false);
    styleBtn?.focus({ preventScroll: true });
    audio.src = STYLES[b.dataset.musicStyle];
    if (enabled) audio.play().then(() => { started = true; }).catch(() => {});
    else preview(STYLES[b.dataset.musicStyle]);
  }));
  showStyle();

  // Cut the preview when the Options modal closes, or when Background Music is switched on
  const optModal = document.getElementById("options-modal");
  if (optModal) new MutationObserver(() => { if (!optModal.classList.contains("is-open")) stopPreview(); })
    .observe(optModal, { attributes: true, attributeFilter: ["class"] });
  toggles.forEach(t => t.addEventListener("click", stopPreview));
  // Live music-volume changes also apply to a running preview
  document.querySelectorAll("[data-music-volume]").forEach(s => s.addEventListener("input", () => {
    if (previewAudio) previewAudio.volume = (s.value / 100) * MUSIC_MAX;
  }));

  // Pause when the app / tab is in the background, resume when it comes back
  document.addEventListener("visibilitychange", () => {
    if (!started || !enabled) return;
    if (document.hidden) audio.pause();
    else audio.play().catch(() => {});
  });
}
