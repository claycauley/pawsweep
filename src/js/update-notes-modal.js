// The "Update Notes" window (content comes from update-notes.js).
// It opens by itself once per version after the splash, and can be reopened from the version number in Options.
import { UPDATE_NOTES, ALWAYS_SHOW } from "./update-notes.js";

const SEEN_KEY = "paw-sweep-update-seen";
let modal = null;

function setup() {
  if (modal) return true;
  modal = document.getElementById("update-modal");
  const close = document.getElementById("update-close");
  if (!modal || !close) { modal = null; return false; }

  document.getElementById("update-version").textContent = "Version " + UPDATE_NOTES.version;
  document.getElementById("update-date").textContent = UPDATE_NOTES.date;
  const list = document.getElementById("update-list");
  // Notes are your own text, so HTML (like icons) is allowed in them
  list.replaceChildren(...UPDATE_NOTES.changes.map(html => Object.assign(document.createElement("li"), { innerHTML: html })));

  const shut = () => {
    modal.classList.remove("is-open");
    try { localStorage.setItem(SEEN_KEY, UPDATE_NOTES.version); } catch { /* ignore */ }
  };
  close.addEventListener("click", shut);
  modal.addEventListener("click", e => { if (e.target === modal) shut(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("is-open")) shut(); });
  return true;
}

// Open the notes right now (used by the version number in Options)
export function openUpdateNotes() {
  if (setup()) modal.classList.add("is-open");
}

// After the splash: open the notes if this version hasn't been seen yet
export function showUpdateNotes() {
  const forced = new URLSearchParams(location.search).has("notes");
  let seen = null;
  try { seen = localStorage.getItem(SEEN_KEY); } catch { /* ignore */ }
  if (!forced && !ALWAYS_SHOW && seen === UPDATE_NOTES.version) return;
  openUpdateNotes();
}

// The small version number under Options' Done button: shows the version and secretly reopens the notes
export function setupVersionLink() {
  const link = document.getElementById("version-link");
  if (!link) return;
  link.textContent = "v" + UPDATE_NOTES.version;
  link.addEventListener("click", () => {
    document.getElementById("options-close")?.click(); // close Options first so the notes aren't hidden behind it
    openUpdateNotes();
  });
}
