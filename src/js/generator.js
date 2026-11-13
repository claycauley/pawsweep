import { rnd, shuffle } from "./rng.js";

// ---- Generator -------------------------------------------------------------
export function randomPlacement(n) {
  const sol = Array(n).fill(-1), used = Array(n).fill(false);
  (function go(r) {
    if (r === n) return true;
    for (const c of shuffle([...Array(n).keys()])) {
      if (used[c] || (r > 0 && Math.abs(sol[r - 1] - c) <= 1)) continue;
      sol[r] = c; used[c] = true;
      if (go(r + 1)) return true;
      used[c] = false;
    }
    return false;
  })(0);
  return sol;
}

export function grow(n, sol) {
  const g = Array.from({ length: n }, () => Array(n).fill(-1));
  sol.forEach((c, r) => g[r][c] = r);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let left = n * n - n; left > 0; left--) {
    const cands = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (g[r][c] !== -1) continue;
      for (const [d0, d1] of dirs) {
        const nr = r + d0, nc = c + d1;
        if (nr >= 0 && nr < n && nc >= 0 && nc < n && g[nr][nc] !== -1) cands.push([r, c, g[nr][nc]]);
      }
    }
    const p = cands[rnd(cands.length)];
    g[p[0]][p[1]] = p[2];
  }
  return g;
}

export function countSolutions(n, reg, cap = 2) {
  const cols = Array(n).fill(false), regs = Array(n).fill(false); let count = 0;
  (function go(r, prev) {
    if (count >= cap) return;
    if (r === n) { count++; return; }
    for (let c = 0; c < n; c++) {
      const id = reg[r][c];
      if (cols[c] || regs[id] || Math.abs(c - prev) <= 1) continue;
      cols[c] = regs[id] = true; go(r + 1, c); cols[c] = regs[id] = false;
    }
  })(0, -10);
  return count;
}

// Would removing cell (r,c) from its region leave that region connected?
function staysConnected(n, reg, r, c) {
  const id = reg[r][c];
  let total = 0, start = null;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
    if (reg[i][j] === id && !(i === r && j === c)) { total++; if (!start) start = [i, j]; }
  if (total === 0) return false; // never empty a region
  const seen = new Set([start[0] * n + start[1]]), stack = [start];
  while (stack.length) {
    const [i, j] = stack.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= n || b >= n || (a === r && b === c)) continue;
      if (reg[a][b] !== id || seen.has(a * n + b)) continue;
      seen.add(a * n + b); stack.push([a, b]);
    }
  }
  return seen.size === total;
}

// Large random boards almost never have a single solution, so repair them:
// move one non-solution cell at a time into a neighboring region, keeping the move
// whenever it doesn't increase the number of solutions, until exactly one is left.
export function makeUnique(n, sol, reg, maxSteps = 4000) {
  const CAP = 40;
  let cur = countSolutions(n, reg, CAP);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let step = 0; cur > 1 && step < maxSteps; step++) {
    const r = rnd(n), c = rnd(n);
    if (sol[r] === c) continue; // solution cells stay put
    const [dr, dc] = dirs[rnd(4)], nr = r + dr, nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= n || nc >= n || reg[nr][nc] === reg[r][c]) continue;
    if (!staysConnected(n, reg, r, c)) continue;
    const old = reg[r][c];
    reg[r][c] = reg[nr][nc];
    const next = countSolutions(n, reg, CAP);
    if (next <= cur) cur = next; else reg[r][c] = old;
  }
  return cur === 1;
}
