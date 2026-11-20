import { paletteColor } from "./rng.js";
import { SHAPES } from "./shapes.js";
import { prepareShare, shareResult } from "./share.js";
import { playSfx } from "./music.js";
import { state, DIFFICULTIES, startLives, clearedCount, levelCount, newLevel, newDaily, advanceLevel, setDifficulty, useHint, useShield, endShatter, useLife, canLife, atMax, dailyDone, allDailiesDone, dailyPicked, dailyUnlocked, pickPower, exitDaily, nextDaily, savePowers, ackBonus } from "./state.js";

export const $ = id => document.getElementById(id);

// What the grid currently shows, so render() can update just the tiles that changed
let drawn = { puzzle: null, cells: [], vals: [] };

// Color Blind shapes: true = the pressed-in (debossed) look, false = the plain flat shapes.
// If the deboss ever feels laggy on a device, set this to false (no other change needed).
export const DEBOSS = false;
document.documentElement.classList.toggle("deboss", DEBOSS);

// Power-up buttons: round bubbles with the number left in a badge.
// To use your own artwork, set `src` to the PNG. Until then (or if the file is missing) the emoji is shown.
const POWERUPS = [
  { id: "b2", stat: "shields", label: "Shield", src: "src/imgs/icons/shield.webp", emoji: "\uD83D\uDEE1\uFE0F" },
  { id: "b3", stat: "extra",  label: "+Life", src: "src/imgs/icons/life-up.webp", emoji: "\u2764\uFE0F" },
  { id: "b1", stat: "hints",  label: "Hint",  src: "src/imgs/icons/hint.webp", emoji: "\uD83D\uDC3E" },
];
const brokenIcons = new Set(); // icons whose file failed to load, so they aren't requested again on every render
// Icons for the rewards named in state.earned (labels come from REWARDS in state.js)
const REWARD_ICONS = { "hint": "src/imgs/icons/hint.webp", "shield": "src/imgs/icons/shield.webp", "extra life": "src/imgs/icons/life-up.webp" };
// An empty power-up shows a lock instead of its icon
const puIcon = (p, left) => !left
  ? `<img class="pu__icon pu__icon--lock" src="src/imgs/icons/lock.webp" alt="">`
  : p.src && !brokenIcons.has(p.id)
  ? `<img class="pu__icon" src="${p.src}" alt="">`
  : `<span class="pu__emoji">${p.emoji}</span>`;

// Shown when the player runs out of lives; one is picked at random each time
const LOSS_MESSAGES = [
  { title: "Don't give up!",        text: "That one got the better of you. Give it another go." },
  { title: "So close!",             text: "You were closer than you think. One more try and you've got it." },
  { title: "Shake it off!",         text: "Every cat takes a tumble now and then. Dust off those paws and try again." },
  { title: "Not this time...",      text: "Take a breath, look at the board fresh, and have another go." },
  { title: "Curiosity got the cat", text: "A few wrong paws never stopped a great puzzler. Ready for round two?" },
  { title: "Paws and reset",        text: "Out of hearts, but not out of ideas. Give it another shot!" },
  { title: "Almost purr-fect!",     text: "Mistakes are just part of the puzzle. You'll sweep it next time." },
];

// dailyKey is "YYYY-MM-DD" from the player's own clock (no location needed).
// The tag shows the date in the player's own format (11/7/2026 in the US, 7/11/2026 in the UK).
function dailyTitleHTML(key, done = false) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d).toLocaleDateString(undefined, { year: "numeric", month: "numeric", day: "numeric" });
  // A finished daily swaps the date stamp for the complete badge
  const tag = done
    ? `<img class="level-head__badge" src="src/imgs/complete-badge.webp" alt="Complete">`
    : `<time class="level-head__tag" datetime="${key}">${date}</time>`;
  return `<img class="level-head__icon" src="src/imgs/icons/calendar.webp" alt=""><span>Daily Puzzle</span>${tag}`;
}

// Undo button: always shown, disabled while there is no ✕ to take back
export function renderUndo() {
  $("undo") && ($("undo").disabled = undoOff());
}
const undoOff = () => !state.undo?.length || state.won || state.lost;

export function render() {
  savePowers(); // every change to the power-up counts ends in a render, so this keeps them saved
  const { n, regions: reg } = state.puzzle;
  const title = $("level-title");
  if (state.mode === "daily") title.innerHTML = dailyTitleHTML(state.dailyKey, dailyDone(state.difficulty));
  else title.textContent = "Level " + state.level;
  title.classList.toggle("is-daily", state.mode === "daily");
  $("leave-daily").hidden = state.mode !== "daily";
  renderUndo();
  $("level-note").textContent = "";
  document.querySelectorAll("#difficulty [data-diff]").forEach(b => {
    const on = b.dataset.diff === state.difficulty;
    b.setAttribute("aria-selected", on);
    b.classList.toggle("is-active", on);
    // In the daily: finished difficulties get a checkmark, ones not yet unlocked get a lock and can't be picked
    const k = b.dataset.diff, isDaily = state.mode === "daily";
    const lockedDiff = isDaily && !dailyUnlocked(k);
    const icon = !isDaily ? "" : dailyDone(k) ? "checkmark" : lockedDiff ? "lock" : "";
    b.querySelector(".diff-state")?.remove();
    b.querySelector(".diff-count")?.remove();
    // Regular play: levels cleared out of the total, tucked on the right (like "3/100" in the level select)
    if (!isDaily) b.insertAdjacentHTML("beforeend", `<span class="diff-count">${clearedCount(k)}/${levelCount(k)}</span>`);
    if (icon) b.insertAdjacentHTML("beforeend", `<img class="diff-state" src="src/imgs/icons/${icon}.webp" alt="${icon === "lock" ? "locked" : "completed"}">`);
    b.disabled = lockedDiff;
    b.classList.toggle("is-locked", lockedDiff);
  });
  $("diff-current").textContent = DIFFICULTIES[state.difficulty].label;
  // Daily button in the menu: a "complete" badge at the end once every daily is done today
  const dailyLink = $("daily"), allDone = allDailiesDone(), badge = dailyLink?.querySelector(".site-nav__daily-done");
  if (dailyLink && allDone && !badge) dailyLink.insertAdjacentHTML("beforeend", `<img class="site-nav__daily-done" src="src/imgs/complete-badge.webp" alt="All dailies complete">`);
  else if (dailyLink && !allDone && badge) badge.remove();
  const heart = (cls = "", img = "heart") => `<img class="heart${cls}" src="src/imgs/icons/${img}.webp" alt="">`;
  const lostHeart = () => heart(" heart--lost", "broken-heart");
  // The shield sits over the first full heart: whole -> broken (heart visible through it) -> shattered, then fades away
  const shieldImg = state.shield === 2 ? "shield" : state.shield === 1 ? "shield-broken" : state.shatter ? "shield-shattered" : "";
  const firstHeart = shieldImg
    ? `<span class="heart-wrap"><img class="heart" src="src/imgs/icons/heart.webp" alt=""><img class="shield${state.shatter ? " shield--fade" : ""}" src="src/imgs/icons/${shieldImg}.webp" alt=""></span>`
    : heart();
  const livesHtml = state.lives > 0
    ? heart().repeat(state.lives - 1) + firstHeart + lostHeart().repeat(Math.max(0, startLives() - state.lives))
    : lostHeart().repeat(startLives());
  // Only rewrite the hearts when something changed, so the shield's fade-out isn't restarted by other renders
  if ($("lives").dataset.html !== livesHtml) { $("lives").innerHTML = livesHtml; $("lives").dataset.html = livesHtml; }
  if (state.shatter && !shatterTimer) shatterTimer = setTimeout(() => { shatterTimer = 0; endShatter(); render(); }, 1400);
  $("lives").setAttribute("aria-label", state.lives + " lives remaining" + (state.shield > 0 ? ", shield active" : ""));
  const g = $("grid");
  $("grid-container").dataset.diff = state.difficulty;
  g.style.gridTemplate = `repeat(${n},1fr) / repeat(${n},1fr)`;
  const tileInner = (v, r, c) => {
    const mark = v === 2 ? `<img class="mark" src="src/imgs/icons/paw-print.webp" alt="cat">` : v === 1 ? `<img class="mark" src="src/imgs/icons/cross-mark.webp" alt="marked">` : v === 3 ? `<img class="mark" src="src/imgs/icons/question.webp" alt="maybe">` : "";
    const sh = SHAPES[reg[r][c] % SHAPES.length];
    // The shape is left out while the tile holds a ✕ or a paw, and returns when the mark is cleared
    const shape = v === 0
      ? `<svg class="shape" viewBox="${sh.vb}" aria-hidden="true"><path d="${sh.d}"/></svg>`
      : "";
    return mark + shape;
  };
  if (drawn.puzzle !== state.puzzle || drawn.cells.length !== n * n) {
    // New puzzle: build every tile once
    let html = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const v = state.board[r][c];
      html += `<div class="cell${v === 2 ? " cat" : ""}${v === 1 || v === 2 ? " is-marked" : ""}" data-r="${r}" data-c="${c}" style="background-color:${paletteColor(reg[r][c])};--tile:${paletteColor(reg[r][c])}">${tileInner(v, r, c)}</div>`;
    }
    g.innerHTML = html;
    drawn = { puzzle: state.puzzle, cells: [...g.children], vals: Array(n * n).fill(0).map((_, i) => state.board[Math.floor(i / n)][i % n]) };
  } else {
    // Same puzzle: only touch the tiles whose contents changed. The rest (and their shapes) are left alone,
    // which keeps dragging across the board smooth.
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const i = r * n + c, v = state.board[r][c];
      if (drawn.vals[i] === v) continue;
      drawn.vals[i] = v;
      const el = drawn.cells[i];
      el.classList.toggle("cat", v === 2);
      el.classList.toggle("is-marked", v === 1 || v === 2); // ✕ and paw tiles keep the pressed-in look (? does not)
      el.innerHTML = tileInner(v, r, c);
    }
  }

  // Hint: glow on the tile the player should place a paw on
  const hi = state.hint ? state.hint[0] * n + state.hint[1] : -1;
  drawn.cells.forEach((el, i) => el.classList.toggle("is-hint", i === hi));

  const bar = $("bar"), msg = $("msg"), overlay = $("overlay");
  const ended = state.won || state.lost;
  // "Great!" on the last daily closes the result card but keeps the player in the daily
  const showResult = ended && !state.resultDismissed;
  // Win intro: "Nice work!" slides down over the blurred board before the Solved card appears (stops accidental taps on it)
  if (showResult && state.won && state.solvedMs > 0 && !state.winIntroDone) {
    state.winIntroDone = true;
    winIntroUntil = performance.now() + WIN_BANNER_MS;
    startWinBanner();
  }
  const intro = performance.now() < winIntroUntil;
  const resultVisible = showResult && !intro;
  // A daily that's already been completed today is locked: blurred, dimmed and covered by a banner
  const locked = state.mode === "daily" && (!ended || state.resultDismissed) && dailyDone(state.difficulty);
  state.locked = locked;
  $("leave-daily").hidden = state.mode !== "daily" || locked; // on a completed daily the button lives in the Complete modal instead
  g.classList.toggle("is-blurred", showResult || locked);
  msg.textContent = "";
  if (resultVisible && overlay.hidden) resultShownAt = performance.now(); // popup is just appearing
  overlay.hidden = !(resultVisible || locked);
  overlay.classList.toggle("overlay--locked", locked);

  if (locked) {
    const got = dailyPicked(state.difficulty).map(s => POWERUPS.find(p => p.stat === s)).filter(Boolean);
    const earned = got.length
      ? `<div class="earned" role="group" aria-label="Power ups earned">` +
          `<p class="earned__head"><img src="src/imgs/icons/powerup.webp" alt=""><span>Power${got.length > 1 ? "ups" : "up"} Earned</span></p>` +
          `<div class="earned__icons">${got.map(p => `<img src="${p.src}" alt="${p.label}" title="${p.label}">`).join("")}</div>` +
        `</div>`
      : "";
    overlay.innerHTML =
      `<img class="overlay__lock" src="src/imgs/icons/complete.webp" alt="">` +
      `<div class="result result--locked" role="status">` +
        `<p class="result__eyebrow">Daily complete</p>` +
        `<p class="result__text">You have already completed this daily puzzle!</p>` +
        earned +
        `<p class="result__text">Come back tomorrow for another round!</p>` +
        `<div class="result__actions"><button type="button" class="primary" id="leave-daily-modal"><img class="inline-icon" src="src/imgs/icons/exit.webp" alt=""> Back To Main Puzzles</button></div>` +
      `</div>`;
    $("leave-daily-modal").onclick = () => { exitDaily(); render(); };
  } else if (resultVisible) {
    renderResult(overlay);
  } else {
    overlay.innerHTML = "";
  }

  // Power-ups stay visible at all times. Hint is disabled when it can't be used; Sweep and +Life that aren't needed
  // right now look grayed out but can still be tapped, which explains why with a tooltip.
  bar.innerHTML = POWERUPS.map(p => {
    const left = state[p.stat];
    const empty = !left && !ended && !locked; // out of this power-up: grayed out but tappable, so it can say so
    const unneeded = empty || (!ended && !locked && left > 0 && (p.id === "b2" ? state.shield > 0 : p.id === "b3" ? !canLife() : !!state.hint));
    const off = ended || locked ? "disabled" : "";
    return `<button type="button" id="${p.id}" class="pu${unneeded ? " is-unneeded" : ""}" ${off}${unneeded ? ' aria-disabled="true"' : ""} aria-label="${p.label}, ${left} left" title="${p.label}">` +
      puIcon(p, left) + `<span class="pu__count" aria-hidden="true">${left}</span>${atMax(p.stat) ? `<span class="pu__max" aria-hidden="true">MAX</span>` : ""}</button>`;
  }).join("") +
    // Undo: always last in the bar, no count. Dimmed and inert until there is an ✕ to take back.
    `<button type="button" id="undo" class="pu pu--undo" aria-label="Undo last ✕" title="Undo"${undoOff() ? " disabled" : ""}>` +
      `<img class="pu__icon" src="src/imgs/icons/undo.webp" alt=""></button>`;
  bar.querySelectorAll("img.pu__icon:not(.pu__icon--lock)").forEach(img => img.addEventListener("error", () => {
    const p = POWERUPS.find(x => x.id === img.closest(".pu").id);
    if (!p) return;
    brokenIcons.add(p.id);
    img.replaceWith(Object.assign(document.createElement("span"), { className: "pu__emoji", textContent: p.emoji }));
  }));
  const none = id => { const p = POWERUPS.find(x => x.id === id); return !state[p.stat] && (showTip(`No more <img class="inline-icon tip-icon" src="${p.src}" alt="${p.label}"> available!`, true), true); };
  $("b1").onclick = () => { if (none("b1")) return; if (state.hint) return showTip("There is already an active hint."); useHint(); render(); };
  $("b2").onclick = () => { if (none("b2")) return; if (state.shield > 0) return showTip("A shield is already protecting you!"); const had = state.shield; useShield(); if (state.shield > had) playSfx("src/sfx/shield-equip.mp3"); render(); };
  $("b3").onclick = () => { if (none("b3")) return; if (!canLife()) return showTip("Your hearts are already full!"); useLife(); playSfx("src/sfx/undo.mp3"); render(); };
}

// Small message inside the power-ups box (same look as the Share toast, no close button). Fades on its own.
let tipTimer = 0, shatterTimer = 0;
function showTip(message, html = false) {
  const box = document.querySelector(".powerups-box");
  let tip = box.querySelector(".powerups-box__tip");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "powerups-box__tip";
    tip.setAttribute("role", "status");
    box.appendChild(tip);
  }
  if (html) tip.innerHTML = message; else tip.textContent = message; // html is only ever our own markup
  tip.classList.remove("is-open");
  void tip.offsetWidth; // restart the fade if it was already showing
  tip.classList.add("is-open");
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => tip.classList.remove("is-open"), 2200);
}

const formatTime = ms => {
  const s = Math.max(1, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m ${s % 60}s` : m ? `${m}m ${s % 60}s` : `${s}s`;
};

// ---- "Nice work!" intro before the Solved card (edit the numbers here) ----
const WIN_BANNER_MS = 1250;      // how long the banner stays before the Solved card shows
const WIN_BANNER_SLIDE_MS = 500; // how long it takes to slide down
const WIN_BANNER_FADE_MS = 400;  // how long the banner fade-out and the Solved card fade-in take
let winIntroUntil = 0;

function startWinBanner() {
  const b = $("win-banner");
  b.style.setProperty("--win-slide", WIN_BANNER_SLIDE_MS + "ms");
  b.style.setProperty("--win-fade", WIN_BANNER_FADE_MS + "ms");
  b.classList.remove("is-in", "is-out");
  void b.offsetWidth; // restart the slide
  b.classList.add("is-in");
  setTimeout(() => {
    b.classList.add("is-out");
    render(); // shows the Solved card (its fade-in matches the banner fade-out)
    setTimeout(() => b.classList.remove("is-in", "is-out"), WIN_BANNER_FADE_MS);
  }, WIN_BANNER_MS);
}

// Result card shown over the blurred grid when a puzzle is won or lost
// The winning double-tap's release / follow-up click lands on the card as it appears,
// so its buttons ignore input for a moment after it shows.
let resultShownAt = 0;
let cheeredFor = null; // the puzzle whose bonus card already played the cheer
const RESULT_GRACE_MS = 700;
const resultReady = () => performance.now() - resultShownAt > RESULT_GRACE_MS;

function renderResult(overlay) {
  const daily = state.mode === "daily";
  const keys = Object.keys(DIFFICULTIES);
  const harder = keys[keys.indexOf(state.difficulty) + 1];

  // Daily rewards come first: pick power ups, then (if all dailies are done) the bonus card
  if (state.won && daily && (state.dailyPicks > 0 || (state.dailyBonus && !state.bonusSeen))) {
    const card = (eyebrow, title, text, body) => overlay.innerHTML =
      `<div class="result result--won" role="dialog" aria-live="polite" aria-labelledby="result-title">` +
        `<p class="result__eyebrow">${eyebrow}</p><h3 class="result__title" id="result-title">${title}</h3>` +
        `<p class="result__text">${text}</p>${body}</div>`;
    if (state.dailyPicks > 0) {
      const n = state.dailyPicks;
      card("Daily complete", "Pick a power up", `Choose ${n} bonus power up${n > 1 ? "s" : ""}.`,
        `<div class="picks">` + POWERUPS.map(p =>
          `<button type="button" class="pick" data-stat="${p.stat}"${atMax(p.stat) && !POWERUPS.every(q => atMax(q.stat)) ? " disabled" : ""}><img src="${p.src}" alt=""><span>${atMax(p.stat) ? "MAX" : p.label}</span></button>`).join("") + `</div>`);
      overlay.querySelectorAll(".pick").forEach(b => b.onclick = () => {
        if (!resultReady()) return;
        pickPower(b.dataset.stat); render();
      });
    } else {
      if (cheeredFor !== state.puzzle) { cheeredFor = state.puzzle; playSfx("src/sfx/cheer.mp3"); } // once per bonus card
      card("All dailies complete", "Bonus reward!", "You finished every daily today. Here's 1 of each power up!",
        `<div class="picks">` + POWERUPS.map(p => `<div class="pick-static" role="img" aria-label="+1 ${p.label}"><img src="${p.src}" alt=""></div>`).join("") + `</div>` +
        `<div class="result__actions"><button type="button" class="primary" id="bonus-ok"><img class="inline-icon" src="src/imgs/icons/checkmark.webp" alt="checkmark"> Awesome</button></div>`);
      $("bonus-ok").onclick = () => { if (!resultReady()) return; ackBonus(); render(); };
    }
    return;
  }

  let eyebrow, title, text, pill = "", primary, secondary = "", share = "", great = "", link = "";
  if (state.won) {
    eyebrow = daily ? "Daily complete" : `${DIFFICULTIES[state.difficulty].label} Level Complete`;
    title = daily ? "Daily solved." : `You Solved Level ${state.level}`;
    text = `Nice! You correctly placed every <img class="inline-icon" src="src/imgs/icons/paw-print.webp" alt="paw">`;
    if (state.earned?.length) {
      // Group repeats (two sweeps -> one icon, "2 sweeps"); one icon per kind of reward leads the line
      const counts = {};
      state.earned.forEach(l => counts[l] = (counts[l] || 0) + 1);
      const plural = l => l === "extra life" ? "extra lives" : l + "s";
      const parts = Object.entries(counts).map(([l, c]) => `${c} ${c > 1 ? plural(l) : l}`);
      const list = parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts.at(-1) : parts[0];
      const icons = Object.keys(counts).map(l => `<img class="inline-icon" src="${REWARD_ICONS[l]}" alt="">`).join("");
      text += `<br><strong>${icons} You've earned ${list}!</strong>`;
    }
    // A restored card (after a reload) has no solve time, so the pill is left out
    pill = state.solvedMs > 0 ? `<span class="result__pill">Solved in ${formatTime(state.solvedMs)}</span>` : "";
    primary = daily ? "Take Me Back" : "Next Level";
    if (!daily && harder) link = `<button type="button" class="result__link" id="harder">Puzzles too easy? Try ${DIFFICULTIES[harder].label}.</button>`;
    // After a daily, Continue moves on to the next difficulty's daily
    if (daily && harder) secondary = `<button type="button" class="result__alt" id="continue">Continue</button>`;
    // Share (needs a solve time, so not on a card restored after a reload): full width under two buttons on phones, in the row on desktop
    if (state.solvedMs > 0) {
      share = `<button type="button" class="result__alt" id="share"><img class="inline-icon" src="src/imgs/icons/share.webp" alt=""> Share</button>`;
      prepareShare();
    }
    // A solved daily has no "Take Me Back" (Leave Daily / Play does that): just Share, then Continue.
    // Fallback: if neither is available, keep Take Me Back so the card is never a dead end.
    if (daily && (share || secondary)) primary = "";
    // Last daily: nothing to continue to, so add Great! to close the card and stay in the daily to look around
    if (daily && share && !secondary) great = `<button type="button" class="result__alt" id="great"><img class="inline-icon" src="src/imgs/icons/checkmark.webp" alt=""> Great!</button>`;
  } else {
    eyebrow = "Out of lives";
    // Pick one message per loss (render() can run again while the card is open, so remember it)
    state.lossMsg ??= LOSS_MESSAGES[Math.floor(Math.random() * LOSS_MESSAGES.length)];
    title = state.lossMsg.title;
    text = state.lossMsg.text;
    primary = `<img class="inline-icon" src="src/imgs/icons/retry.webp" alt="retry"> Retry`;
  }

  overlay.innerHTML =
    `<div class="result result--${state.won ? "won" : "lost"}" role="dialog" aria-live="polite" aria-labelledby="result-title">` +
      `<p class="result__eyebrow">${eyebrow}</p>` +
      `<h3 class="result__title" id="result-title">${title}</h3>` +
      `<p class="result__text">${text}</p>${pill}` +
      `<div class="result__actions">${primary ? `${share}${secondary}<button type="button" class="primary" id="next">${primary}</button>` : `${share}${secondary}${great}`}</div>${link}` +
    `</div>`;

  if ($("next")) $("next").onclick = () => {
    if (!resultReady()) return;
    if (daily) { state.lost ? newDaily() : exitDaily(); }
    else { if (state.won) advanceLevel(); newLevel(); }
    render();
  };
  if ($("share")) $("share").onclick = () => shareResult();
  if ($("great")) $("great").onclick = () => { if (!resultReady()) return; state.resultDismissed = true; render(); };
  if ($("continue")) $("continue").onclick = () => { if (!resultReady()) return; nextDaily(); render(); };
  if ($("harder")) $("harder").onclick = () => { if (!resultReady()) return; setDifficulty(harder); newLevel(); render(); };
  // No auto-focus on the card's buttons: it showed a focus ring on Next Level and invited accidental Enter/Space presses
}
