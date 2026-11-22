// audit-scripts.mjs
// Read-only report: which files in scripts/ are still used, and which look
// like leftovers. Run from the project root:  node audit-scripts.mjs
//
// "Used" means one of:
//   1. referenced by path from a file OUTSIDE scripts/ (package.json,
//      .github/workflows, src/, config files, git hooks, ...), or
//   2. imported (transitively) by a file that is used.
// Test files are reported alongside the file they test.
//
// Limits: it only sees literal paths. A script launched through a
// string-built path, or by a tool that globs a folder, will look unused.
// Check before deleting anything (git can bring it back).

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCRIPTS = 'scripts';
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.claude', '.svelte-kit', '.astro',
  'build', 'dist', '.cache', '.wrangler',
]);
const SKIP_FILES = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']);
const TEXT = /\.(mjs|cjs|js|ts|json|ya?ml|svelte|astro|sh|toml|html)$/i;
const CODE = /\.(mjs|cjs|js|ts)$/i;
const EXTS = ['', '.mjs', '.js', '.cjs', '.ts', '/index.mjs', '/index.js'];

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (!SKIP_FILES.has(entry.name)) out.push(full);
  }
  return out;
}

if (!fs.existsSync(path.join(ROOT, SCRIPTS))) {
  console.error(`No ${SCRIPTS}/ folder in ${ROOT}. Run this from the project root.`);
  process.exit(1);
}

const scriptFiles = walk(path.join(ROOT, SCRIPTS)).map(rel);
const scriptSet = new Set(scriptFiles);

// everything outside scripts/ that could reference a script
const outsideFiles = walk(ROOT)
  .map(rel)
  .filter((f) => !f.startsWith(`${SCRIPTS}/`) && TEXT.test(f));
const outsideText = new Map(outsideFiles.map((f) => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));

// ---- 1. files referenced from outside scripts/ ------------------------------
const referencedBy = new Map(); // script -> [referrers]
for (const s of scriptFiles) {
  for (const [file, text] of outsideText) {
    if (text.includes(s)) {
      if (!referencedBy.has(s)) referencedBy.set(s, []);
      referencedBy.get(s).push(file);
    }
  }
}

// ---- 2. import graph --------------------------------------------------------
const IMPORT_RE =
  /(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return { external: spec };
  const base = path.join(path.dirname(fromFile), spec);
  for (const ext of EXTS) {
    const candidate = rel(path.join(ROOT, base + ext));
    if (fs.existsSync(path.join(ROOT, candidate)) && fs.statSync(path.join(ROOT, candidate)).isFile()) {
      return { file: candidate };
    }
  }
  return { missing: rel(path.join(ROOT, base)) };
}

const importsOf = new Map(); // file -> {files:Set, missing:[], packages:Set}
function readImports(file) {
  if (importsOf.has(file)) return importsOf.get(file);
  const info = { files: new Set(), missing: [], packages: new Set() };
  importsOf.set(file, info);
  if (!CODE.test(file) || !fs.existsSync(path.join(ROOT, file))) return info;
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  for (const m of text.matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2] ?? m[3] ?? m[4];
    if (!spec || spec.startsWith('node:')) continue;
    const r = resolveImport(file, spec);
    if (r.file) info.files.add(r.file);
    else if (r.missing) info.missing.push({ spec, path: r.missing });
    else if (r.external) info.packages.add(r.external.split('/')[0].startsWith('@')
      ? r.external.split('/').slice(0, 2).join('/')
      : r.external.split('/')[0]);
  }
  return info;
}

// ---- 3. reachability from referenced files (tests excluded as roots) --------
const isTest = (f) => /\.test\.[cm]?[jt]s$/.test(f);
const used = new Map(); // file -> reason
const queue = [];
for (const s of scriptFiles) {
  if (referencedBy.has(s) && !isTest(s)) {
    used.set(s, `referenced by ${referencedBy.get(s).slice(0, 3).join(', ')}`);
    queue.push(s);
  }
}
// outside files that import scripts (e.g. a SvelteKit route importing
// scripts/lib/mail-theme.mjs) are already covered by the path check above
while (queue.length) {
  const f = queue.shift();
  for (const dep of readImports(f).files) {
    if (scriptSet.has(dep) && !used.has(dep) && !isTest(dep)) {
      used.set(dep, `imported by ${f}`);
      queue.push(dep);
    }
  }
}

// ---- 4. classify ------------------------------------------------------------
const sourceFiles = scriptFiles.filter((f) => !isTest(f));
const testFiles = scriptFiles.filter(isTest);

const usedList = sourceFiles.filter((f) => used.has(f));
const unusedList = sourceFiles.filter((f) => !used.has(f));

function subjectOf(testFile) {
  const base = testFile.replace(/\.test(\.[cm]?[jt]s)$/, '$1');
  return scriptSet.has(base) ? base : null;
}

const mentionsAstro = (f) =>
  CODE.test(f) && /astro/i.test(fs.readFileSync(path.join(ROOT, f), 'utf8'));

// ---- 5. report --------------------------------------------------------------
const line = (s = '') => console.log(s);

line(`Scanned ${scriptFiles.length} files in ${SCRIPTS}/ (${sourceFiles.length} scripts, ${testFiles.length} tests)`);
line(`Checked ${outsideFiles.length} files outside ${SCRIPTS}/ for references`);
line();

line(`USED (${usedList.length})`);
for (const f of usedList) line(`  ✓ ${f}\n      ${used.get(f)}`);
line();

line(`NO REFERENCE FOUND (${unusedList.length})  <- candidates to delete`);
for (const f of unusedList) {
  const note = mentionsAstro(f) ? '   [mentions "astro"]' : '';
  line(`  ✗ ${f}${note}`);
}
line();

line(`TESTS (${testFiles.length})`);
for (const t of testFiles) {
  const subject = subjectOf(t);
  if (!subject) line(`  ? ${t}  (could not find the file it tests)`);
  else line(`  ${used.has(subject) ? '✓' : '✗'} ${t}  -> tests ${subject} (${used.has(subject) ? 'used' : 'unused'})`);
}
line();

// broken imports and external packages, for used files only
const broken = [];
const packages = new Map();
for (const f of [...used.keys()]) {
  const info = readImports(f);
  for (const m of info.missing) broken.push({ from: f, ...m });
  for (const p of info.packages) {
    if (!packages.has(p)) packages.set(p, []);
    packages.get(p).push(f);
  }
}

line(`BROKEN IMPORTS in used files (${broken.length})`);
if (broken.length === 0) line('  none');
for (const b of broken) line(`  ! ${b.from} imports "${b.spec}" -> ${b.path} (file not found)`);
line();

const pkgJson = fs.existsSync('package.json') ? JSON.parse(fs.readFileSync('package.json', 'utf8')) : {};
const declared = new Set([
  ...Object.keys(pkgJson.dependencies ?? {}),
  ...Object.keys(pkgJson.devDependencies ?? {}),
]);
line(`NPM PACKAGES the used scripts need (${packages.size})`);
for (const [pkg, files] of packages) {
  const flag = declared.has(pkg) ? 'ok' : 'NOT IN package.json';
  line(`  ${declared.has(pkg) ? '✓' : '!'} ${pkg}  [${flag}]  (${files[0]}${files.length > 1 ? ` +${files.length - 1}` : ''})`);
}
line();
line('Nothing was changed. "No reference found" only means no literal path match; check before deleting.');