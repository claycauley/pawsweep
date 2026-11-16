import { LEVELS, LEVEL_COUNT } from "./levels-data.js";
import { rnd } from "./rng.js";

export const TIERS = ["", "Easy", "Medium", "Hard", "Expert"];

export const REWARDS = [
  { every: 15, stat: "hints",  label: "hint" },
  { every: 5,  stat: "shields", label: "shield" },
  { every: 10, stat: "extra",  label: "extra life" },
];
// Power-up counts and which levels already paid out their reward are kept on this device
const POWERS_KEY = "paw-sweep-powerups";
const REWARDED_KEY = "paw-sweep-rewarded";
const readJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const rewarded = new Set(readJSON(REWARDED_KEY, []));
const savedPowers = readJSON(POWERS_KEY, {});
savedPowers.shields ??= savedPowers.sweeps; // Shield replaced Sweep: saved Sweeps carry over as Shields
const powerCount = (stat) => Number.isInteger(savedPowers[stat]) && savedPowers[stat] >= 0 ? savedPowers[stat] : 5; // new players start with 5
export function savePowers() {
  localStorage.setItem(POWERS_KEY, JSON.stringify({ hints: state.hints, shields: state.shields, extra: state.extra }));
  localStorage.setItem(REWARDED_KEY, JSON.stringify([...rewarded]));
}

// ---- Daily puzzle completion (one per difficulty per day, stored on this device) ----
const DAILY_KEY = "paw-sweep-daily";
const todayKey = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};
const loadDaily = () => {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(DAILY_KEY)); } catch { /* ignore */ }
  return s && s.date === todayKey() ? s : { date: todayKey(), done: {}, bonus: false };
};
export const dailyDone = diff => !!loadDaily().done[diff];
// Dailies unlock in order: Easy is always open, each other one opens once the one before it is done
const dailyKeys = () => Object.keys(DIFFICULTIES);
export const dailyUnlocked = diff => {
  const i = dailyKeys().indexOf(diff);
  return i <= 0 || dailyDone(dailyKeys()[i - 1]);
};
export const anyDailyDone = () => dailyKeys().some(dailyDone);
export const allDailiesDone = () => dailyKeys().every(dailyDone);
export const nextDailyDiff = () => dailyKeys()[dailyKeys().indexOf(state.difficulty) + 1];
// Power-ups picked for a completed daily: easy / normal give 1, hard / crazy give 2
export const DAILY_PICKS = { easy: 1, normal: 1, hard: 2, crazy: 2 };

// Difficulty setting -> grid size
export const DIFFICULTIES = {
  easy: { label: "Easy", n: 5, lives: 3 },
  normal: { label: "Normal", n: 6, lives: 3 },
  hard: { label: "Hard", n: 8, lives: 3 },
  crazy: { label: "Crazy", n: 10, lives: 3 },
};
// Starting hearts depend on the difficulty
export const startLives = () => DIFFICULTIES[state.difficulty].lives;
const DIFF_KEY = "paw-sweep-difficulty";
const PROGRESS_KEY = "paw-sweep-progress";
const saved = localStorage.getItem(DIFF_KEY);
const startDiff = DIFFICULTIES[saved] ? saved : "normal";

// Each difficulty keeps its own level progress, since players can't pick a level.
const progress = (() => {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch { return {}; }
})();
const saveProgress = () => {
  progress[state.difficulty] = state.level;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
};

export const state = {
  difficulty: startDiff,
  level: progress[startDiff] || 1,
  lives: DIFFICULTIES[startDiff].lives,
  hints: powerCount("hints"),
  shields: powerCount("shields"),
  shield: 0,        // wrong paws the active shield can still absorb (2 -> 1 -> 0)
  shatter: false,   // the shield just broke: show the shattered icon while it fades out
  extra: powerCount("extra"),
  won: false,
  lost: false,
  puzzle: null,
  board: null,
  mode: "level",
  dailyKey: "",
};

export function setDifficulty(key, persist = true) {
  if (!DIFFICULTIES[key]) return;
  state.difficulty = key;
  state.level = progress[key] || 1;
  if (persist) localStorage.setItem(DIFF_KEY, key);
}

export function advanceLevel() {
  state.level++;
  if (state.level > levelCount(state.difficulty)) state.level = 1; // out of pre-built levels: start over
  saveProgress();
}

// Level select: how many levels of a difficulty have been beaten (in order, so 1..cleared are beaten).
// Levels 1..cleared+1 can be opened. Older saves fall back to "everything before the current level".
const CLEARED_KEY = "paw-sweep-cleared";
const cleared = (() => {
  try { return JSON.parse(localStorage.getItem(CLEARED_KEY)) || {}; } catch { return {}; }
})();
// Levels per difficulty (most have LEVEL_COUNT, the test difficulty has fewer)
export const levelCount = diff => LEVELS[diff]?.length ?? 0;
export { LEVEL_COUNT };
// One-time migration: saves from before level select have no count, so seed it from the saved level
// and store it. After this, moving to an older level can never lower it.
for (const d of Object.keys(DIFFICULTIES)) {
  if (cleared[d] == null && progress[d]) cleared[d] = Math.max(0, progress[d] - 1);
}
localStorage.setItem(CLEARED_KEY, JSON.stringify(cleared));
export const clearedCount = diff => Math.min(levelCount(diff), cleared[diff] ?? 0);
export const unlockedCount = diff => Math.min(levelCount(diff), clearedCount(diff) + 1);
const markCleared = () => {
  cleared[state.difficulty] = Math.max(clearedCount(state.difficulty), state.level);
  localStorage.setItem(CLEARED_KEY, JSON.stringify(cleared));
};

// Jump to an unlocked level of the current difficulty
export function goToLevel(n) {
  if (n < 1 || n > unlockedCount(state.difficulty)) return false;
  state.level = n;
  saveProgress();
  newLevel();
  return true;
}

// Levels are pre-generated by scripts/build-levels.mjs and stored as "rows|solution|tier".
function decode(str) {
  const [rows, sol, tier] = str.split("|");
  const regions = rows.split(",").map(r => [...r].map(Number));
  return { n: regions.length, regions, sol: [...sol].map(Number), tier: +tier };
}

export function startPuzzle(puzzle) {
  const n = puzzle.n;
  state.puzzle = puzzle;
  state.board = Array.from({ length: n }, () => Array(n).fill(0)); // 0 empty, 1 mark, 2 cat
  state.lives = startLives(); state.won = state.lost = false;
  state.startedAt = Date.now(); state.solvedMs = 0; state.earned = [];
  state.playedMs = 0; state.runningSince = 0; // the clock starts on the first tap in the grid
  state.dailyPicks = 0; state.dailyBonus = false; state.bonusSeen = false; state.locked = false; state.lossMsg = null;
  state.undo = []; state.undoShown = false; state.resultDismissed = false; state.winIntroDone = false; state.hint = null; state.shatter = false; // the shield (state.shield) is kept between puzzles
}

// ---- Undo for ✕ marks ----
// Each entry is one tap or one whole drag: a list of { r, c, prev } (what the tile held before the ✕).
// Placing a paw (or using a hint / sweep) wipes the history, so undo can never go back past a paw.
export function pushUndo(group) {
  if (!group.length) return;
  state.undo.push(group);
  state.undoShown = true; // the button fades in after the first ✕ and then stays
}
export function undo() {
  if (state.won || state.lost) return false;
  const group = state.undo.pop();
  if (!group) return false;
  for (const { r, c, prev } of group) if (state.board[r][c] === 1) state.board[r][c] = prev; // skip tiles the player already changed
  return true;
}

// Choose a power up as a daily reward
export function pickPower(stat) {
  if (state.dailyPicks <= 0) return;
  const r = REWARDS.find(x => x.stat === stat);
  state[stat]++; state.dailyPicks--; state.earned.push(r.label);
  // Remember which power ups this daily gave, so the locked daily can show them later
  const d = loadDaily();
  d.picked ??= {};
  (d.picked[state.difficulty] ??= []).push(stat);
  localStorage.setItem(DAILY_KEY, JSON.stringify(d));
  savePowers();
  savePending();
}
// The power ups (stat names, e.g. "hints") picked for a finished daily today. Empty if unknown (older saves).
export const dailyPicked = diff => loadDaily().picked?.[diff] ?? [];

// Keep the unclaimed daily rewards up to date (cleared once everything has been claimed)
function savePending() {
  const d = loadDaily();
  if (state.dailyPicks > 0 || (state.dailyBonus && !state.bonusSeen)) {
    d.pending = { diff: state.difficulty, picks: state.dailyPicks, bonus: state.dailyBonus && !state.bonusSeen };
  } else {
    delete d.pending;
  }
  localStorage.setItem(DAILY_KEY, JSON.stringify(d));
}
// The player has seen the all-dailies bonus card
export function ackBonus() { state.bonusSeen = true; savePending(); }

// On startup: if a daily was beaten but its rewards weren't claimed, bring the reward card back
export function restoreDailyPending() {
  const p = loadDaily().pending;
  if (!p || !DIFFICULTIES[p.diff] || (!(p.picks > 0) && !p.bonus)) return false;
  state.returnTo = state.difficulty;
  setDifficulty(p.diff, false);
  newDaily();
  state.puzzle.sol.forEach((c, r) => { state.board[r][c] = 2; });
  state.won = true;
  state.dailyPicks = p.picks > 0 ? p.picks : 0;
  state.dailyBonus = !!p.bonus;
  return true;
}

// Puzzle clock: only counts while running (started by a tap in the grid, paused by modals / hidden tab)
export const startClock = () => { if (!state.runningSince && !state.won && !state.lost && !state.locked) state.runningSince = Date.now(); };
export const pauseClock = () => {
  if (state.runningSince) { state.playedMs += Date.now() - state.runningSince; state.runningSince = 0; }
};
export const elapsedMs = () => state.playedMs + (state.runningSince ? Date.now() - state.runningSince : 0);

export function newLevel() {
  state.mode = "level";
  if (state.level > levelCount(state.difficulty) || state.level < 1) state.level = 1;
  startPuzzle(decode(LEVELS[state.difficulty][state.level - 1]));
}

export function newDaily() {
  state.mode = "daily";
  const d = new Date();
  state.dailyKey = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  // The date picks one of the pre-built puzzles, so everyone gets the same one each day
  const h = [...state.dailyKey].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7);
  startPuzzle(decode(LEVELS[state.difficulty][Math.abs(h) % levelCount(state.difficulty)]));
}

// Enter the daily from a level: remember where the player was, then open the first daily not yet beaten
// (Easy on a fresh day). Daily difficulty changes aren't saved, so levels keep their own difficulty.
export function startDaily() {
  if (state.mode !== "daily") state.returnTo = state.difficulty;
  setDifficulty(dailyKeys().find(k => !dailyDone(k)) || "easy", false);
  newDaily();
}
// Leave the daily and go back to the level the player was on before clicking Daily
export function exitDaily() {
  if (state.returnTo) setDifficulty(state.returnTo);
  newLevel();
}
// Move on to the next difficulty's daily
export function nextDaily() {
  const next = nextDailyDiff();
  if (!next) return;
  setDifficulty(next, false);
  newDaily();
}

export function checkWin() {
  if (!state.puzzle.sol.every((c, r) => state.board[r][c] === 2)) return;
  state.won = true;
  state.solvedMs = elapsedMs();
  pauseClock();
  if (state.mode === "level") markCleared();

  // Daily: record it, then the player picks bonus power ups. Finishing all four gives 1 of each.
  if (state.mode === "daily") {
    const d = loadDaily();
    if (!d.done[state.difficulty]) {
      d.done[state.difficulty] = true;
      state.dailyPicks = DAILY_PICKS[state.difficulty];
      if (!d.bonus && Object.keys(DIFFICULTIES).every(k => d.done[k])) {
        d.bonus = true; state.dailyBonus = true;
        for (const r of REWARDS) state[r.stat]++;
      }
      // Remember what's still to be claimed, so the reward card comes back after a reload
      d.pending = { diff: state.difficulty, picks: state.dailyPicks, bonus: state.dailyBonus };
      localStorage.setItem(DAILY_KEY, JSON.stringify(d));
      savePowers();
    }
  }

  // Milestone rewards for completed levels (not the daily puzzle): every 5th gives a hint, every 10th a sweep,
  // every 20th a +Life. Tracked per difficulty + level so replaying the same level can't award them twice.
  const key = `${state.difficulty}:${state.level}`;
  if (state.mode === "level" && !rewarded.has(key)) {
    rewarded.add(key);
    for (const r of REWARDS) {
      if (state.level % r.every === 0) { state[r.stat]++; state.earned.push(r.label); }
    }
  }
}

export function placeCat(r, c) {
  clearHintAt(r, c);
  if (state.puzzle.sol[r] === c) {
    state.board[r][c] = 2; state.undo = [];
    // Auto-cross every tile this paw rules out (Options > Accessibility > Auto Eliminate Empty Tiles, on by default)
    if (localStorage.getItem("paw-sweep-auto-x") !== "off") for (const [i, j] of sweepTargets()) state.board[i][j] = 1;
    checkWin();
  }
  else if (state.shield > 0) {
    // The shield soaks up the mistake: the tile is still crossed out, but no heart is lost
    state.board[r][c] = 1;
    if (--state.shield === 0) state.shatter = true;
  }
  else { state.board[r][c] = 1; if (--state.lives <= 0) state.lost = true; }
}

// The hint glows until the player interacts with that tile (cross, ? mark or paw)
function clearHintAt(r, c) {
  if (state.hint && state.hint[0] === r && state.hint[1] === c) state.hint = null;
}

// Set a note mark (1) or clear it (0). Never touches placed cats and never costs a life.
export function paint(r, c, val) {
  if (state.won || state.lost || state.board[r][c] === 2) return;
  clearHintAt(r, c);
  state.board[r][c] = val;
}

// Place a cat for real (double tap / double click). A wrong cat costs a life.
export function place(r, c) {
  if (state.won || state.lost || state.board[r][c] === 2) return;
  placeCat(r, c);
}

export function useHint() {
  if (!state.hints || state.won || state.lost || state.hint) return; // a hint is already showing
  const rows = state.puzzle.sol.map((c, r) => r).filter(r => state.board[r][state.puzzle.sol[r]] !== 2);
  if (!rows.length) return;
  state.hints--; const r = rows[rnd(rows.length)];
  state.hint = [r, state.puzzle.sol[r]]; // highlighted by render(); the player places the paw themselves
}

// Auto-cross uses this: every empty tile a placed paw rules out
function sweepTargets() {
  const out = [], n = state.puzzle.n, reg = state.puzzle.regions;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (state.board[r][c] !== 2) continue;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const blocked = i === r || j === c || (Math.abs(i - r) <= 1 && Math.abs(j - c) <= 1) || reg[i][j] === reg[r][c];
      if (blocked && state.board[i][j] === 0) out.push([i, j]);
    }
  }
  return out;
}
// +Life is only useful when a heart is missing
export const canLife = () => state.lives < startLives();

// Shield absorbs the next 2 wrong paws. Only one can be active at a time.
export function useShield() {
  if (!state.shields || state.won || state.lost || state.shield > 0) return;
  state.shields--; state.shield = 2; state.shatter = false;
}
// Clears the shattered icon once its fade-out is done
export function endShatter() { state.shatter = false; }

// +Life only restores a broken heart: at full hearts it does nothing and isn't used up
export function useLife() {
  if (!state.extra || state.won || state.lost || !canLife()) return;
  state.extra--; state.lives++;
}
