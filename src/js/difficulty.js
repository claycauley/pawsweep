import { randomPlacement, grow, countSolutions, makeUnique } from "./generator.js";
import { setSeed, resetToMathRandom } from "./rng.js";

// ---- Difficulty rating: simulate a human solver, tier = hardest technique needed
// 1 singles only, 2 one region confined to one line (or reverse), 3 two-for-two groups, 4 bigger groups / stuck
export function rate(n, reg) {
  const bits = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
  const id = (t, r, c) => t === 0 ? reg[r][c] : t === 1 ? r : c;
  const cand = Array.from({ length: n }, () => Array(n).fill(true));
  const full = (1 << n) - 1, act = [full, full, full];
  let placed = 0, tier = 1;
  const place = (r, c) => {
    const rg = reg[r][c];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
      if (i === r || j === c || (Math.abs(i - r) <= 1 && Math.abs(j - c) <= 1) || reg[i][j] === rg) cand[i][j] = false;
    act[0] &= ~(1 << rg); act[1] &= ~(1 << r); act[2] &= ~(1 << c); placed++;
  };
  const single = () => {
    for (let t = 0; t < 3; t++) for (let x = 0; x < n; x++) {
      if (!(act[t] >> x & 1)) continue;
      let cnt = 0, pr = 0, pcc = 0;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (cand[r][c] && id(t, r, c) === x) { cnt++; pr = r; pcc = c; }
      if (cnt === 1) { place(pr, pcc); return true; }
    }
    return false;
  };
  const elim = k => {
    for (let A = 0; A < 3; A++) for (let B = 0; B < 3; B++) {
      if (A === B) continue;
      for (let mask = 1; mask <= full; mask++) {
        if (bits(mask) !== k || (mask & ~act[A])) continue;
        let U = 0;
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (cand[r][c] && (mask >> id(A, r, c) & 1)) U |= 1 << id(B, r, c);
        if (bits(U) !== k) continue;
        let changed = false;
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
          if (cand[r][c] && (U >> id(B, r, c) & 1) && !(mask >> id(A, r, c) & 1)) { cand[r][c] = false; changed = true; }
        if (changed) return true;
      }
    }
    return false;
  };
  while (placed < n) {
    if (single()) continue;
    let ok = false;
    for (let k = 1; k < n && !ok; k++) if (elim(k)) { ok = true; tier = Math.max(tier, Math.min(4, k + 1)); }
    if (!ok) return 4;
  }
  return tier;
}

// Level number -> target puzzle tier (shared by the game and the level builder script)
export function tierFor(L) {
  let tier = [1, 1, 2, 2, 3][(L - 1) % 5];
  if (L > 30) tier = Math.min(4, tier + 1 + Math.floor((L - 30) / 25));
  return tier;
}

// Same seed always gives the same puzzle. Searches for a unique puzzle near the target tier.
export function generate(n, seed, target) {
  setSeed(seed);
  // Rating a candidate gets expensive on big grids, so search fewer candidates there.
  // Iteration-based (not time-based) so the same seed always yields the same puzzle.
  const maxTries = n >= 10 ? 12 : n >= 8 ? 100 : 400;
  let best = null, bd = 9;
  for (let i = 0; ; i++) {
    const sol = randomPlacement(n), regions = grow(n, sol);
    if (countSolutions(n, regions) === 1 || makeUnique(n, sol, regions)) {
      const tier = rate(n, regions), d = Math.abs(tier - target);
      if (d < bd) { bd = d; best = { n, regions, sol, tier }; }
    }
    if (best && (bd === 0 || i >= maxTries)) break;
  }
  resetToMathRandom();
  return best;
}
