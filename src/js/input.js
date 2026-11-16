import { state, paint, place, pushUndo } from "./state.js";
import { $, render, renderUndo } from "./render.js";
import { sfxEnabled, sfxVolume, playSfx } from "./music.js";

const DOUBLE_TAP_MS = 500;
const HOLD_MS = 420; // press and hold this long to place a ?
let holdTimer = 0;

// One short tap sound per press (not per cell while dragging)
const tapSounds = ["src/sfx/tap.mp3", "src/sfx/tap-alt.mp3"].map(src => {
  const a = new Audio(src);
  a.preload = "auto";
  return a;
});
let lastTapSound = -1, tapRun = 0;
const lostHeartSound = new Audio("src/sfx/lost-heart.mp3");
lostHeartSound.preload = "auto";
const playClone = a => {
  const c = a.cloneNode();
  c.volume = sfxVolume();
  c.play().catch(() => {});
};
const playLostHeart = () => {
  if (sfxEnabled()) playClone(lostHeartSound);
};
const playTap = () => {
  if (!sfxEnabled()) return;
  // Truly random, except it won't play the same one more than 3 times in a row
  let i = Math.floor(Math.random() * tapSounds.length);
  if (i === lastTapSound && tapRun >= 3) i = (i + 1) % tapSounds.length;
  tapRun = i === lastTapSound ? tapRun + 1 : 1;
  lastTapSound = i;
  playClone(tapSounds[i]);
};

// Pointer input on the grid:
//  - tap / click ........ toggle an ✕ note
//  - drag across cells .. paint ✕ notes (or clear them, depending on the first cell)
//  - double tap / click . place a paw
export function setupInput() {
  const gridEl = $("grid");
  let dragging = false, mode = 1, lastCell = null, lastTap = null;
  let group = []; // the ✕ marks placed by the current tap / drag, so Undo can remove them in one go

  const coords = el => [+el.dataset.r, +el.dataset.c];
  const cellAt = (x, y) => document.elementFromPoint(x, y)?.closest("#grid .cell") ?? null;

  const apply = el => {
    const [r, c] = coords(el);
    if (state.board[r][c] !== mode && state.board[r][c] !== 2) {
      if (mode === 1 && !state.won && !state.lost) group.push({ r, c, prev: state.board[r][c] });
      paint(r, c, mode);
      render();
    }
    press(r, c);
  };

  // The grid is rebuilt on every change, so the pressed look is re-applied to the new tile element
  let releaseTimer = 0;
  const press = (r, c) => {
    clearTimeout(releaseTimer);
    gridEl.querySelectorAll(".is-pressed").forEach(n => n.classList.remove("is-pressed"));
    gridEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`)?.classList.add("is-pressed");
  };
  // Keep the pressed look for a moment so quick taps still show the press
  const release = () => {
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => gridEl.querySelectorAll(".is-pressed").forEach(n => n.classList.remove("is-pressed")), 90);
  };

  gridEl.addEventListener("pointerdown", e => {
    const el = e.target.closest(".cell"); if (!el || e.button > 0) return;
    // Touch pointers are captured by the element that was pressed, and render() replaces
    // those elements, so release the capture and let move events follow the finger.
    if (gridEl.hasPointerCapture?.(e.pointerId)) gridEl.releasePointerCapture(e.pointerId);
    e.target.releasePointerCapture?.(e.pointerId);

    const [r, c] = coords(el), now = performance.now();
    if (state.board[r][c] === 2) return; // a correctly placed paw is disabled

    // Second press on the same cell soon after the first = double tap: place a paw.
    // A single tap on the hinted tile counts as a double tap too.
    const hinted = state.hint && state.hint[0] === r && state.hint[1] === c;
    if (hinted || (lastTap && lastTap.r === r && lastTap.c === c && now - lastTap.t < DOUBLE_TAP_MS)) {
      lastTap = null; dragging = false;
      const livesBefore = state.lives, shieldBefore = state.shield, alreadyPaw = state.board[r][c] === 2;
      place(r, c); render(); press(r, c);
      // A lost heart (or a shield hit) gets its own sound, a correct paw gets the paw sound, anything else the tap
      if (state.lives < livesBefore) playLostHeart();
      else if (state.shield < shieldBefore) playSfx(state.shield === 1 ? "src/sfx/shield-hit.mp3" : "src/sfx/shield-break.mp3");
      else if (state.board[r][c] === 2 && !alreadyPaw) playSfx("src/sfx/paw.mp3");
      else playTap();
      return;
    }
    playTap();
    lastTap = { r, c, t: now };

    // First cell decides the drag: empty -> paint ✕, already ✕ -> clear.
    mode = state.board[r][c] === 1 ? 0 : 1;
    const wasQuestion = state.board[r][c] === 3; // read before the tap turns it into an ✕
    dragging = true; lastCell = `${r},${c}`;
    group = [];
    apply(el);

    // Press and hold (without moving) puts a ? on the tile, or clears it if it already had one
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      if (!dragging || lastCell !== `${r},${c}` || state.won || state.lost || state.board[r][c] === 2) return;
      paint(r, c, wasQuestion ? 0 : 3);
      group = group.filter(g => !(g.r === r && g.c === c)); // that tile is a ? now, not an ✕
      lastTap = null; // a hold is not the first half of a double tap
      render(); press(r, c);
      playTap();
    }, HOLD_MS);
  });

  window.addEventListener("pointermove", e => {
    if (!dragging) return;
    const el = cellAt(e.clientX, e.clientY);
    if (!el) return;
    const key = `${el.dataset.r},${el.dataset.c}`;
    if (key === lastCell) return;
    lastCell = key;
    clearTimeout(holdTimer); // moving off the tile means it's a drag, not a hold
    lastTap = null; // moved to another cell, so this was a drag and not a tap
    apply(el);
  });

  const stop = () => {
    dragging = false; lastCell = null; clearTimeout(holdTimer); release();
    if (group.length) { pushUndo(group); group = []; renderUndo(); }
  };
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);

  // No context menu (also suppresses the mobile long-press menu on the grid)
  gridEl.addEventListener("contextmenu", e => e.preventDefault());
}
