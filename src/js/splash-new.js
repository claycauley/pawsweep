// Launch splash (installed app only, html.is-app; or in a browser with ?splash, see index.html).
// It shows the logo and a Play button over the splash image. The button appears once the game has rendered AND the
// service worker has finished caching (capped so a slow network can't trap anyone), plus a short extra beat.
// Pressing Play swaps to the pressed image, fades the music in (if Background Music is on) and fades the splash away.
// The press is also the user gesture browsers require before audio can play.
import { holdMusic, fadeInMusic } from "./music.js";

const MIN_MS = 1500;          // never flash by faster than this
const CACHE_WAIT_MS = 8000;   // longest we wait for the first-run cache to finish
const READY_DELAY_MS = 500;   // extra pause after loading before the button appears
const PRESS_MS = 200;         // how long the pressed button shows before the splash fades
const MUSIC_FADE_MS = 1500;   // music fade-in length

const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

// Resolves once the service worker is active (= precache finished). Immediate on later launches.
function cachingDone() {
  const sw = navigator.serviceWorker;
  if (!sw || (local && !new URLSearchParams(location.search).has("sw"))) return Promise.resolve();
  const timeout = new Promise(res => setTimeout(res, CACHE_WAIT_MS));
  return Promise.race([sw.ready, timeout]);
}

// Returns a promise that resolves once the splash is gone (right away when there is none)
export function hideSplash() {
  const el = document.getElementById("splash");
  if (!el) return Promise.resolve();

  // Normal website visitors never see the splash
  if (!document.documentElement.classList.contains("is-app")) { el.remove(); return Promise.resolve(); }
  return new Promise(done => {
  const minWait = new Promise(res => setTimeout(res, Math.max(0, MIN_MS - performance.now())));
  const btn = el.querySelector(".splash__play"), img = btn.querySelector("img");
  const upSrc = img.getAttribute("src"), downSrc = upSrc.replace("play-now.webp", "play-now-pressed.webp");
  new Image().src = downSrc; // preload the pressed state so the swap is instant

  holdMusic(true); // no music until the Play button is pressed
  // The button is always fully visible. If it's pressed before loading has finished, the splash simply
  // waits for loading and then continues.
  const ready = Promise.all([minWait, cachingDone()]).then(() => new Promise(res => setTimeout(res, READY_DELAY_MS)));
  let busy = false;
  const go = e => {
    if (busy) return;
    busy = true;
    // Mouse / touch already popped the button back up on release. For a keyboard press (no pointer events),
    // show a quick press and release so it still behaves like a real button.
    if (e && e.detail === 0) { img.src = downSrc; setTimeout(() => { img.src = upSrc; }, 120); }
    ready.then(() => new Promise(res => setTimeout(res, PRESS_MS))).then(() => {
      holdMusic(false);
      fadeInMusic(MUSIC_FADE_MS); // only plays if Background Music is on
      el.classList.add("is-hidden");
      setTimeout(() => { el.remove(); done(); }, 700);
    });
  };

  // Pressed while the finger / mouse is down, pops back up on release (or if the finger slides off)
  btn.addEventListener("pointerdown", () => { img.src = downSrc; });
  ["pointerup", "pointerleave", "pointercancel"].forEach(t => btn.addEventListener(t, () => { img.src = upSrc; }));
  btn.addEventListener("click", go);
  });
}