// Region colors live in SCSS ($palette in _variables.scss), which exposes them as
// --palette-0 ... --palette-N plus --palette-count. Edit the colors there.
export const paletteColor = region => {
  const count = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--palette-count"), 10) || 1;
  return `var(--palette-${region % count})`;
};

let rng = Math.random;

export const mulberry = s => () => {
  s |= 0;
  s = (s + 0x6D2B79F5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export function setSeed(seed) {
  rng = mulberry(seed);
}

export function resetToMathRandom() {
  rng = Math.random;
}

export function rnd(n) {
  return Math.floor(rng() * n);
}

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
