import { state, DIFFICULTIES } from "./state.js";

// Share a finished puzzle: an image of the UNSOLVED board (slightly blurred, logo on top) plus a message and link.
// The image always uses the Default palette, light look and no Color Blind shapes, whatever the player has set.
export const SHARE_URL = "https://pawsweep.app";

// Keep in sync with $palette in _variables.scss (the Default palette)
const DEFAULT_PALETTE = ["#ffb86b", "#b9e769", "#6fdcf0", "#b39cff", "#ff8a80", "#fff176", "#7fb2ff", "#ff9ee0", "#62dfb4", "#d2a679"];
const SIZE = 1080;

export const clockTime = ms => {
  const s = Math.max(1, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
};

export function shareText() {
  const label = DIFFICULTIES[state.difficulty].label;
  const what = state.mode === "daily" ? `${label} Daily Puzzle` : `Level ${state.level} ${label} Puzzle`;
  return `Check this out! I just solved Paw Sweep's ${what} in ${clockTime(state.solvedMs)}! Try and beat that!`;
}

const loadImage = src => new Promise(res => {
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = () => res(null);
  img.src = src;
});

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// The empty board, drawn like the in-game tiles
function drawBoard(ctx, regions) {
  const n = regions.length, pad = 60, gap = 6, inner = SIZE - pad * 2;
  ctx.fillStyle = "#fbf3e4";
  ctx.fillRect(0, 0, SIZE, SIZE);
  const tile = (inner - 24 - gap * (n - 1)) / n, x0 = pad + 12, rad = tile * 0.12;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const x = x0 + c * (tile + gap), y = x0 + r * (tile + gap);
    roundRect(ctx, x, y, tile, tile, rad);
    ctx.fillStyle = DEFAULT_PALETTE[regions[r][c] % DEFAULT_PALETTE.length];
    ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + tile);
    g.addColorStop(0, "rgba(255,255,255,.55)");
    g.addColorStop(0.45, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(0,0,0,.14)");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,.16)";
    ctx.stroke();
  }
}

async function makeImage() {
  const board = document.createElement("canvas");
  board.width = board.height = SIZE;
  drawBoard(board.getContext("2d"), state.puzzle.regions);

  const out = document.createElement("canvas");
  out.width = out.height = SIZE;
  const ctx = out.getContext("2d");
  // Slight blur. Canvas filters aren't in every browser (older Safari), so fall back to a soft shrink and enlarge.
  if ("filter" in ctx) {
    ctx.filter = "blur(7px)";
    ctx.drawImage(board, -20, -20, SIZE + 40, SIZE + 40);
    ctx.filter = "none";
  } else {
    const small = document.createElement("canvas");
    small.width = small.height = 270;
    small.getContext("2d").drawImage(board, 0, 0, 270, 270);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(small, 0, 0, SIZE, SIZE);
  }
  ctx.fillStyle = "rgba(255,255,255,.28)"; // a light veil so the logo stands out
  ctx.fillRect(0, 0, SIZE, SIZE);

  const logo = await loadImage("src/imgs/paw-sweep-logo.webp");
  if (logo) {
    const w = SIZE * 0.78, h = w * logo.naturalHeight / logo.naturalWidth;
    ctx.shadowColor = "rgba(0,0,0,.35)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.drawImage(logo, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
  }
  return new Promise(res => out.toBlob(res, "image/png"));
}

// The image is built as soon as the win card shows, so Share (which needs a fresh tap) can respond instantly
let cache = null;
export function prepareShare() {
  if (!cache || cache.puzzle !== state.puzzle) cache = { puzzle: state.puzzle, blob: makeImage() };
  return cache.blob;
}

// Copy text, with a fallback for browsers / contexts where the async clipboard API is refused
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = Object.assign(document.createElement("textarea"), { value: text });
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { /* ignore */ }
    ta.remove();
    return ok;
  }
}

// Desktop toast: slides down from the top, closes with the ✕ or fades away on its own after 10 seconds
let toastTimer = 0;
function showToast(message) {
  document.getElementById("toast")?.remove();
  clearTimeout(toastTimer);
  const t = document.createElement("div");
  t.id = "toast";
  t.className = "toast";
  t.setAttribute("role", "status");
  t.innerHTML = `<span class="toast__text"></span><button type="button" class="toast__close" aria-label="Dismiss"><img src="src/imgs/icons/cross-mark.webp" alt=""></button>`;
  t.querySelector(".toast__text").textContent = message;
  const close = () => {
    clearTimeout(toastTimer);
    t.classList.remove("is-open");
    setTimeout(() => t.remove(), 400);
  };
  t.querySelector(".toast__close").onclick = close;
  document.body.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("is-open"))); // two frames so the slide-in transition runs
  toastTimer = setTimeout(close, 12000);
}

export async function shareResult() {
  const text = `${shareText()} ${SHARE_URL}`;
  // Phones / tablets use the native share sheet. On desktop, browsers either lack it or show a bare
  // system dialog with no copy option, so desktop always saves the picture and copies the message.
  const desktop = !matchMedia("(pointer: coarse)").matches;

  // The copy starts before any await: browsers only allow it right after the tap
  const copied = desktop ? copyText(text) : null;
  const blob = await prepareShare();

  if (desktop) {
    if (blob) {
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "paw-sweep.png" });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    showToast((await copied) ? "Image downloaded and message copied" : "Image downloaded, but the message couldn't be copied");
    return "";
  }

  const file = blob && new File([blob], "paw-sweep.png", { type: "image/png" });
  try {
    if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ text, files: [file] });
    else if (navigator.share) await navigator.share({ text, url: SHARE_URL });
    else await copyText(text);
  } catch (e) {
    if (e?.name !== "AbortError") console.warn("Share failed", e); // closing the share sheet isn't an error
  }
  return "";
}
