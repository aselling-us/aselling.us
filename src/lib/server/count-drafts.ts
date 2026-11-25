import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Assuming commands are run from the SvelteKit project root (where package.json lives)
const root = process.cwd();
const DEFAULT_DRAFTS_DIR = path.join(root, 'src/content/blog/drafts');
const DEFAULT_OUT_FILE = path.join(root, 'src/data/drafts.json');

export function countDrafts(draftsDir = DEFAULT_DRAFTS_DIR) {
  if (!fs.existsSync(draftsDir)) return 0;
  return fs.readdirSync(draftsDir).filter((f) => f.endsWith('.md')).length;
}

export function writeDraftCount({
  draftsDir = DEFAULT_DRAFTS_DIR,
  outFile = DEFAULT_OUT_FILE,
} = {}) {
  if (!fs.existsSync(draftsDir)) return { changed: false, count: 0 };

  const count = countDrafts(draftsDir);
  const next = `${JSON.stringify({ count }, null, 2)}\n`;
  const prev = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';

  if (prev === next) return { changed: false, count };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, next);
  return { changed: true, count };
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  if (!fs.existsSync(DEFAULT_DRAFTS_DIR)) {
    console.log('drafts: no drafts/ folder here, committed count left as is');
  } else {
    const { changed, count } = writeDraftCount();
    console.log(`drafts: ${count}${changed ? ' (src/data/drafts.json updated)' : ''}`);
  }
}
