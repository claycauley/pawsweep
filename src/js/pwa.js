import { state } from "./state.js";

// Registers the service worker so the game can be installed and played offline.
// Skipped on localhost so the dev server always serves fresh files; add ?sw to the URL to test it.
//
// Updates are pushed hard, because iPad Safari / home-screen apps are slow to look for a new version:
//  - sw.js is fetched without the HTTP cache (updateViaCache: "none")
//  - it checks for a new version on load, every time the app comes back to the foreground, and hourly
//  - when a new version takes over, the page reloads itself (waiting for a quiet moment if a puzzle is in progress)
export function setupPwa() {
  if (!("serviceWorker" in navigator)) return;
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  if (local && !new URLSearchParams(location.search).has("sw")) return;

  const hadController = !!navigator.serviceWorker.controller; // false on the very first install: nothing to refresh
  let reloading = false;
  const reload = () => { if (!reloading) { reloading = true; location.reload(); } };
  const inProgress = () => !!state.board && !state.won && !state.lost && state.board.some(row => row.some(v => v));

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) return;
    if (!inProgress()) return reload();
    // Mid-puzzle: don't wipe the board, refresh as soon as the app is backgrounded
    document.addEventListener("visibilitychange", () => { if (document.hidden) reload(); });
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(reg => {
      const check = () => reg.update().catch(() => {});
      check();
      document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
      window.addEventListener("focus", check);
      window.addEventListener("online", check);
      setInterval(check, 60 * 60 * 1000);
    }).catch(err => console.warn("Service worker failed:", err));
  });
}
