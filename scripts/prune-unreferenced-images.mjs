// Astro emits the original of every image that goes through `astro:assets` into
// dist/_astro/ even when pages only ever link to the optimized .webp variants
// — for this site that was ~330 of a ~400 MB Pages artifact, all dead weight
// (full-resolution photos nothing points at). A bloated artifact makes the
// Pages deploy's `syncing_files` step slow enough to stall, so this runs right
// after `astro build` (see the `build` script) and deletes the originals
// nothing references.
//
// "Referenced" means the hashed filename appears anywhere in the built text
// files (html/js/css/json/xml/txt/svg) — e.g. books.astro and the projects
// lightbox deliberately link to an original via `.src`, and those survive.
// Only jpg/jpeg/png are ever considered for deletion: optimized outputs are
// webp, so an unreferenced raster original is the only thing this can touch.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TEXT_EXTS = new Set(['.html', '.js', '.css', '.json', '.xml', '.txt', '.svg']);
const PRUNABLE_EXTS = new Set(['.jpg', '.jpeg', '.png']);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

export function pruneUnreferencedImages(distDir = path.join(root, 'dist')) {
  const assetsDir = path.join(distDir, '_astro');
  if (!fs.existsSync(assetsDir)) return { removed: 0, bytes: 0 };

  const candidates = fs
    .readdirSync(assetsDir)
    .filter((f) => PRUNABLE_EXTS.has(path.extname(f).toLowerCase()));
  if (candidates.length === 0) return { removed: 0, bytes: 0 };

  const unreferenced = new Set(candidates);
  for (const file of walk(distDir)) {
    if (!TEXT_EXTS.has(path.extname(file).toLowerCase())) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const name of unreferenced) {
      if (text.includes(name)) unreferenced.delete(name);
    }
    if (unreferenced.size === 0) break;
  }

  let bytes = 0;
  for (const name of unreferenced) {
    const full = path.join(assetsDir, name);
    bytes += fs.statSync(full).size;
    fs.rmSync(full);
  }
  return { removed: unreferenced.size, bytes };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { removed, bytes } = pruneUnreferencedImages(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
  console.log(`prune: removed ${removed} unreferenced original image${removed === 1 ? '' : 's'} (${(bytes / 1e6).toFixed(1)} MB)`);
}
