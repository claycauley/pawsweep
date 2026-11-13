// Generates sw.js from scripts/sw.template.js.
//  - Lists every game file to precache (so the app works fully offline)
//  - Stamps a cache name containing a hash of all those files' contents, so the version
//    changes automatically whenever anything changes. No manual version bumping.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const FILES = ["index.html", "manifest.webmanifest", "src/sfx/background-music-alt.mp3", "src/sfx/tap.mp3", "src/sfx/tap-alt.mp3", "src/sfx/lost-heart.mp3"];
const DIRS = ["src/css", "src/js", "src/imgs", "src/fonts", "src/icons"];
const SKIP_DIRS = new Set(["raw", "png"]); // source artwork, not used by the game

function walk(dir) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : walk(join(dir, entry.name));
    return entry.name.endsWith(".map") ? [] : [join(dir, entry.name)];
  });
}

const toUrl = p => p.split(sep).join("/");
const assets = [...FILES, ...DIRS.flatMap(walk)].map(toUrl).sort();

const template = readFileSync(join(root, "scripts", "sw.template.js"), "utf8");
const hash = createHash("sha256");
hash.update(template);
for (const a of assets) { hash.update(a); hash.update(readFileSync(join(root, a))); }
const version = hash.digest("hex").slice(0, 8);
const cache = `paw-sweep-${pkg.version}-${version}`;

const list = ["./", ...assets];
const out = template
  .replace("__CACHE__", cache)
  .replace("__ASSETS__", JSON.stringify(list, null, 2));

writeFileSync(join(root, "sw.js"), out);
console.log(`sw.js written: ${cache} (${list.length} files precached)`);
