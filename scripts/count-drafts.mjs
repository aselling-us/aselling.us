// Blog drafts live in src/content/blog/drafts/, which is gitignored so they
// never reach the public repo. A GitHub Pages build only sees committed files,
// so it can't count them itself — this writes the count (and nothing else:
// no titles, no slugs) to src/data/drafts.json, which IS committed and is what
// /blog reads to show "N drafts in progress".
//
// Runs from the husky pre-commit hook (so the committed number is always
// current) and from the dev blog editor after it saves/moves/deletes a post.
// `npm run drafts:count` does the same by hand.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function countDrafts(draftsDir = path.join(root, 'src/content/blog/drafts')) {
  if (!fs.existsSync(draftsDir)) return 0;
  return fs.readdirSync(draftsDir).filter((f) => f.endsWith('.md')).length;
}

// only rewrites the file when the number changed, so it never dirties git for nothing
export function writeDraftCount({
  draftsDir,
  outFile = path.join(root, 'src/data/drafts.json'),
} = {}) {
  const next = `${JSON.stringify({ count: countDrafts(draftsDir) }, null, 2)}\n`;
  const prev = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
  if (prev === next) return false;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, next);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const changed = writeDraftCount();
  console.log(`drafts: ${countDrafts()}${changed ? ' (src/data/drafts.json updated)' : ''}`);
}
