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

// only rewrites the file when the number changed, so it never dirties git for nothing.
//
// No drafts/ folder at all means this isn't the checkout that owns the drafts
// (a fresh clone, a second checkout, or CI) — leave the committed count alone rather
// than "correcting" it to 0. That mattered for real: refresh-media.yml's
// `npm ci` installs the husky hook, so the bot's own `git commit` ran this
// script in CI (no drafts/ there, it's gitignored) and committed count 0 over
// the real number. Deleting a draft leaves the (empty) folder behind, so a
// genuine drop to 0 still gets written.
export function writeDraftCount({
  draftsDir = path.join(root, 'src/content/blog/drafts'),
  outFile = path.join(root, 'src/data/drafts.json'),
} = {}) {
  if (!fs.existsSync(draftsDir)) return false;
  const next = `${JSON.stringify({ count: countDrafts(draftsDir) }, null, 2)}\n`;
  const prev = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
  if (prev === next) return false;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, next);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!fs.existsSync(path.join(root, 'src/content/blog/drafts'))) {
    console.log('drafts: no drafts/ folder here, committed count left as is');
  } else {
    const changed = writeDraftCount();
    console.log(`drafts: ${countDrafts()}${changed ? ' (src/data/drafts.json updated)' : ''}`);
  }
}
