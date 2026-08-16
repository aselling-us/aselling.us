// Dev-only endpoints behind the "+ new note" / "edit" buttons on /projects's
// "doing" notes section (mounted at /__edit-doing by scripts/dev-add-place.mjs
// — never part of the built site).
// POST /__edit-doing/save { slug?, title, date, body }
//   with slug: rewrites the managed frontmatter fields (title, date) of an
//   existing note, leaving `images` untouched, and replaces the body
//   without slug: creates src/content/doing/<slug-from-title>.md
// POST /__edit-doing/image?slug=<slug>&name=<filename>  (raw image body)
//   saves a photo as <slug>-<n>.<ext> next to the .md file and appends its
//   path to the `images:` frontmatter list, in upload order
// POST /__edit-doing/image/remove { slug, index }
//   removes the photo at `index` from `images:` and deletes its file
// POST /__edit-doing/delete { slug }
//   deletes a note's <slug>.md plus all of its photos — there's no undo,
//   the UI is expected to confirm() first
// NOTE: loaded once at dev-server startup — restart `npm run dev` after edits.
import fs from 'node:fs';
import path from 'node:path';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'note';

// replace/insert/remove a `key: value` frontmatter line in place; a key's
// value may continue on indented lines (block-style lists) — the whole span
// is replaced, and value === undefined removes the field entirely
function setLine(lines, key, value) {
  const idx = lines.findIndex((l) => l.startsWith(`${key}:`));
  if (idx === -1) {
    if (value !== undefined) lines.push(`${key}: ${value}`);
    return;
  }
  let span = 1;
  while (idx + span < lines.length && /^\s/.test(lines[idx + span])) span++;
  lines.splice(idx, span, ...(value === undefined ? [] : [`${key}: ${value}`]));
}

// `images:` is always written as a single-line, unquoted YAML flow list of
// relative paths (same convention as blog's single `cover: ./slug-cover.jpg`)
// — Astro's image() schema resolves each path relative to this file.
function getImages(lines) {
  const idx = lines.findIndex((l) => l.startsWith('images:'));
  if (idx === -1) return [];
  const m = lines[idx].match(/images:\s*\[(.*)\]\s*$/);
  return m && m[1].trim() ? m[1].split(',').map((s) => s.trim()) : [];
}

export function doingEditHandler({ dir = path.resolve('src/content/doing') } = {}) {
  return (req, res) => {
    const reply = (code, payload) => {
      res.statusCode = code;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    };
    if (req.method !== 'POST') return reply(405, { error: 'POST only' });
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/image') {
      const slug = slugify(String(url.searchParams.get('slug') ?? ''));
      const original = path.basename(String(url.searchParams.get('name') ?? 'photo'));
      const ext = path.extname(original).toLowerCase();
      if (!IMAGE_EXTS.has(ext))
        return reply(400, { error: `unsupported image type "${ext || 'none'}" (HEIC? convert to jpg first)` });
      const mdFile = path.join(dir, `${slug}.md`);
      if (!fs.existsSync(mdFile)) return reply(400, { error: `no note file for slug "${slug}"` });

      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        let n = 1;
        let file = path.join(dir, `${slug}-${n}${ext}`);
        while (fs.existsSync(file)) file = path.join(dir, `${slug}-${++n}${ext}`);
        fs.writeFileSync(file, Buffer.concat(chunks));

        const m = fs.readFileSync(mdFile, 'utf8').match(FM_RE);
        if (!m) return reply(400, { error: `${slug}.md has no frontmatter` });
        const lines = m[1].split(/\r?\n/);
        const images = getImages(lines);
        images.push(`./${slug}-${n}${ext}`);
        setLine(lines, 'images', `[${images.join(', ')}]`);
        fs.writeFileSync(mdFile, `---\n${lines.join('\n')}\n---\n${m[2]}`);
        reply(200, { file: path.relative(process.cwd(), file), images });
      });
      return;
    }

    if (url.pathname === '/image/remove') {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        let p;
        try {
          p = JSON.parse(raw);
        } catch {
          return reply(400, { error: 'invalid JSON' });
        }
        const slug = slugify(String(p.slug ?? ''));
        const index = Number(p.index);
        const mdFile = path.join(dir, `${slug}.md`);
        if (!fs.existsSync(mdFile)) return reply(400, { error: `no note file for slug "${slug}"` });

        const m = fs.readFileSync(mdFile, 'utf8').match(FM_RE);
        if (!m) return reply(400, { error: `${slug}.md has no frontmatter` });
        const lines = m[1].split(/\r?\n/);
        const images = getImages(lines);
        if (!Number.isInteger(index) || index < 0 || index >= images.length)
          return reply(400, { error: 'no photo at that index' });
        const [removed] = images.splice(index, 1);
        setLine(lines, 'images', images.length ? `[${images.join(', ')}]` : undefined);
        fs.writeFileSync(mdFile, `---\n${lines.join('\n')}\n---\n${m[2]}`);

        const onDisk = path.join(dir, path.basename(removed));
        if (fs.existsSync(onDisk)) fs.unlinkSync(onDisk);

        reply(200, { images });
      });
      return;
    }

    if (url.pathname === '/delete') {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        let p;
        try {
          p = JSON.parse(raw);
        } catch {
          return reply(400, { error: 'invalid JSON' });
        }
        const slug = slugify(String(p.slug ?? ''));
        const file = path.join(dir, `${slug}.md`);
        if (!fs.existsSync(file)) return reply(400, { error: `no note file for slug "${slug}"` });

        const m = fs.readFileSync(file, 'utf8').match(FM_RE);
        const images = m ? getImages(m[1].split(/\r?\n/)) : [];

        fs.unlinkSync(file);
        for (const img of images) {
          const onDisk = path.join(dir, path.basename(img));
          if (fs.existsSync(onDisk)) fs.unlinkSync(onDisk);
        }

        reply(200, { ok: true });
      });
      return;
    }

    if (url.pathname !== '/save') return reply(404, { error: 'unknown endpoint' });

    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      let p;
      try {
        p = JSON.parse(body);
      } catch {
        return reply(400, { error: 'invalid JSON' });
      }

      const title = String(p.title ?? '').trim();
      const date = String(p.date ?? '').trim();
      if (!title) return reply(400, { error: 'title is required' });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return reply(400, { error: 'date must be YYYY-MM-DD' });
      const text = String(p.body ?? '').trim();

      // managed fields; undefined value = remove the line entirely
      // `images` is intentionally not managed here — /image and /image/remove own that line
      const fields = [
        ['title', JSON.stringify(title)],
        ['date', date], // unquoted so YAML parses it as a date
      ];

      let slug, file;
      if (p.slug) {
        slug = slugify(String(p.slug));
        file = path.join(dir, `${slug}.md`);
        if (!fs.existsSync(file)) return reply(400, { error: `no note file for slug "${slug}"` });

        const m = fs.readFileSync(file, 'utf8').match(FM_RE);
        if (!m) return reply(400, { error: `${slug}.md has no frontmatter` });
        const lines = m[1].split(/\r?\n/);
        for (const [key, value] of fields) setLine(lines, key, value);
        fs.writeFileSync(file, `---\n${lines.join('\n')}\n---\n${text ? `\n${text}\n` : ''}`);
      } else {
        const base = slugify(title);
        slug = base;
        for (let i = 2; fs.existsSync(path.join(dir, `${slug}.md`)); i++) slug = `${base}-${i}`;
        file = path.join(dir, `${slug}.md`);
        const fm = fields.map(([k, v]) => `${k}: ${v}`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, `---\n${fm.join('\n')}\n---\n${text ? `\n${text}\n` : ''}`);
      }
      reply(200, { file: path.relative(process.cwd(), file), slug });
    });
  };
}
