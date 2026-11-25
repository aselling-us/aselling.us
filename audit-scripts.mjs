// audit-scripts.mjs
// Run from the project root: node audit-scripts.mjs
// Read-only: does not modify or delete files.

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scriptsDir = path.join(root, 'scripts');

const skippedDirs = new Set([
  'node_modules',
  '.git',
  '.svelte-kit',
  '.astro',
  'build',
  'dist',
]);

const textFile = /\.(?:[cm]?[jt]s|json|ya?ml|svelte|sh|toml|html)$/i;
const testFile = /\.(?:test|spec)\.[cm]?[jt]s$/i;
const extensions = ['', '.mjs', '.js', '.cjs', '.ts', '/index.mjs', '/index.js'];

const relative = (file) => path.relative(root, file).split(path.sep).join('/');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (skippedDirs.has(entry.name)) return [];

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) return walk(full);
    return entry.isFile() ? [full] : [];
  });
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

if (!fs.existsSync(scriptsDir)) {
  console.error('No scripts/ folder found. Run this from the project root.');
  process.exit(1);
}

const files = walk(scriptsDir).map(relative).sort();
const fileSet = new Set(files);
const sources = files.filter((file) => !testFile.test(file));
const tests = files.filter((file) => testFile.test(file));

const used = new Map();
const queue = [];

function markUsed(file, reason) {
  if (testFile.test(file) || used.has(file)) return;

  used.set(file, reason);
  queue.push(file);
}

// Find literal references such as scripts/example.mjs or
// ../scripts/example.mjs. Relative imports are handled separately.
function findScriptPaths(text) {
  return sources.filter((file) => text.includes(file));
}

function resolveRelative(from, specifier) {
  if (!specifier.startsWith('.')) return null;

  const base = path.resolve(root, path.dirname(from), specifier);

  for (const extension of extensions) {
    const candidate = relative(base + extension);
    if (fileSet.has(candidate)) return candidate;
  }

  return null;
}

function findRelativeImports(file, text) {
  const dependencies = new Set();
  const pattern =
    /(?:\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?|\bimport\s*\(\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;

  for (const match of text.matchAll(pattern)) {
    const dependency = resolveRelative(file, match[1]);
    if (dependency) dependencies.add(dependency);
  }

  return dependencies;
}

function scanFile(file) {
  const text = read(file);

  for (const script of findScriptPaths(text)) {
    markUsed(script, `referenced by ${file}`);
  }

  for (const script of findRelativeImports(file, text)) {
    markUsed(script, `imported by ${file}`);
  }
}

// Source and workflow files are roots. src-astro/ is never scanned.
const roots = [
  ...walk(path.join(root, 'src')),
  ...walk(path.join(root, '.github', 'workflows')),
]
  .filter((file) => textFile.test(file))
  .map(relative);

for (const file of roots) scanFile(file);

// Treat every root package.json command as an entry point.
const packagePath = path.join(root, 'package.json');
const packageJson = fs.existsSync(packagePath)
  ? JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  : {};

for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
  for (const script of findScriptPaths(command)) {
    markUsed(script, `npm run ${name}`);
  }
}

// Follow references and imports from each used script.
while (queue.length > 0) {
  const file = queue.shift();

  if (!textFile.test(file)) continue;

  const text = read(file);

  for (const dependency of findScriptPaths(text)) {
    markUsed(dependency, `referenced by ${file}`);
  }

  for (const dependency of findRelativeImports(file, text)) {
    markUsed(dependency, `imported by ${file}`);
  }
}

const usedFiles = sources.filter((file) => used.has(file));
const unreferenced = sources.filter((file) => !used.has(file));

console.log(`Scanned ${sources.length} scripts and ${tests.length} tests.`);
console.log(`Checked ${roots.length} files in src/ and .github/workflows/.\n`);

console.log(`USED (${usedFiles.length})`);
for (const file of usedFiles) {
  console.log(`  ✓ ${file}\n    ${used.get(file)}`);
}

console.log(`\nNO REFERENCE FOUND (${unreferenced.length})`);
for (const file of unreferenced) {
  console.log(`  ? ${file}`);
}

console.log(`\nTESTS (${tests.length})`);
for (const test of tests) {
  const subject = test.replace(/\.(?:test|spec)(\.[cm]?[jt]s)$/, '$1');

  if (!fileSet.has(subject)) {
    console.log(`  ? ${test} — matching script not found`);
  } else {
    const status = used.has(subject) ? 'used' : 'no reference found';
    console.log(`  ${test} → ${subject} (${status})`);
  }
}

// Find scripts reachable from src/, separately from workflow/npm references.
const srcUsed = new Map();
const srcQueue = [];

function markSrcUsed(file, reason) {
  if (testFile.test(file) || srcUsed.has(file)) return;

  srcUsed.set(file, reason);
  srcQueue.push(file);
}

for (const fullPath of walk(path.join(root, 'src'))) {
  if (!textFile.test(fullPath)) continue;

  const file = relative(fullPath);
  const text = read(file);

  for (const script of findScriptPaths(text)) {
    markSrcUsed(script, `referenced by ${file}`);
  }

  for (const script of findRelativeImports(file, text)) {
    markSrcUsed(script, `imported by ${file}`);
  }
}

while (srcQueue.length > 0) {
  const file = srcQueue.shift();
  if (!textFile.test(file)) continue;

  const text = read(file);

  for (const dependency of findScriptPaths(text)) {
    markSrcUsed(dependency, `referenced by ${file}`);
  }

  for (const dependency of findRelativeImports(file, text)) {
    markSrcUsed(dependency, `imported by ${file}`);
  }
}

const astroScripts = sources.filter(
  (file) => textFile.test(file) && /\bastro\b/i.test(read(file))
);

console.log(`\nASTRO-RELATED SCRIPTS USED BY src/`);
for (const file of astroScripts.filter((file) => srcUsed.has(file))) {
  console.log(`  ✓ ${file}\n    ${srcUsed.get(file)}`);
}

console.log(`\nASTRO-RELATED SCRIPTS NOT FOUND IN src/`);
for (const file of astroScripts.filter((file) => !srcUsed.has(file))) {
  console.log(`  ? ${file}`);
}
console.log('\nRead-only report. Check unreferenced scripts before deleting them.');