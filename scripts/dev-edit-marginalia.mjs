// Dev-only endpoints behind the "+ add photo" / "edit" buttons on /books's
// "marginalia" section (mounted at /__edit-marginalia by
// scripts/dev-add-place.mjs — never part of the built site).
// POST /__edit-marginalia/save { slug?, date, caption? }
//   with slug: rewrites the managed frontmatter fields (date, caption) of
//   an existing entry, leaving `image` untouched
//   without slug: creates src/content/marginalia/<slug-from-date-caption>.md
// POST /__edit-marginalia/image?slug=<slug>&name=<filename>  (raw image body)
//   saves the photo as <slug>.<ext> next to the .md file and sets its
//   `image:` frontmatter line — one photo per entry: replaces any previous
//   one, whatever its extension
// POST /__edit-marginalia/delete { slug }
//   deletes an entry's <slug>.md plus its photo — there's no undo, the UI
//   is expected to confirm() first
// POST /__edit-marginalia/reorder { order: string[] }
//   the full set of entry slugs in their new display order (from dragging a
//   thumbnail in the dev UI) — every slug must match an existing entry and
//   none may be missing, since this rewrites every entry's `order` field to
//   its 1-based position in the array
// NOTE: loaded once at dev-server startup — restart `npm run dev` after edits.
import fs from 'node:fs';
import path from 'node:path';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'photo';

// { slug, order } for every entry in the directory, sorted by order
// ascending — shared by /save (to compute a new entry's order) and
// /reorder (to find an entry's neighbors)
function readOrdered(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const slug = f.slice(0, -3);
      const m = fs.readFileSync(path.join(dir, f), 'utf8').match(FM_RE);
      const orderLine = m?.[1].split(/\r?\n/).find((l) => l.startsWith('order:'));
      const order = orderLine ? Number(orderLine.slice('order:'.length).trim()) : 0;
      return { slug, order };
    })
    .sort((a, b) => a.order - b.order);
}

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

export function marginaliaEditHandler({ dir = path.resolve('src/content/marginalia') } = {}) {
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
      if (!fs.existsSync(mdFile)) return reply(400, { error: `no entry file for slug "${slug}"` });

      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        // one photo per entry: replace any previous one, whatever its extension
        for (const e of IMAGE_EXTS) {
          const old = path.join(dir, `${slug}${e}`);
          if (e !== ext && fs.existsSync(old)) fs.unlinkSync(old);
        }
        const file = path.join(dir, `${slug}${ext}`);
        fs.writeFileSync(file, Buffer.concat(chunks));

        const m = fs.readFileSync(mdFile, 'utf8').match(FM_RE);
        if (!m) return reply(400, { error: `${slug}.md has no frontmatter` });
        const lines = m[1].split(/\r?\n/);
        setLine(lines, 'image', `./${slug}${ext}`);
        fs.writeFileSync(mdFile, `---\n${lines.join('\n')}\n---\n${m[2]}`);
        reply(200, { file: path.relative(process.cwd(), file) });
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
        if (!fs.existsSync(file)) return reply(400, { error: `no entry file for slug "${slug}"` });

        fs.unlinkSync(file);
        for (const e of IMAGE_EXTS) {
          const img = path.join(dir, `${slug}${e}`);
          if (fs.existsSync(img)) fs.unlinkSync(img);
        }

        reply(200, { ok: true });
      });
      return;
    }

    if (url.pathname === '/reorder') {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        let p;
        try {
          p = JSON.parse(raw);
        } catch {
          return reply(400, { error: 'invalid JSON' });
        }
        const order = Array.isArray(p.order) ? p.order.map((s) => slugify(String(s))) : [];

        const ordered = readOrdered(dir);
        const actualSlugs = new Set(ordered.map((e) => e.slug));
        if (order.length !== ordered.length || !order.every((s) => actualSlugs.has(s)))
          return reply(400, { error: 'entry list does not match what is on disk — reload and try again' });

        order.forEach((slug, i) => {
          const newOrder = i + 1;
          const file = path.join(dir, `${slug}.md`);
          const m = fs.readFileSync(file, 'utf8').match(FM_RE);
          if (!m) return;
          const lines = m[1].split(/\r?\n/);
          setLine(lines, 'order', newOrder);
          fs.writeFileSync(file, `---\n${lines.join('\n')}\n---\n${m[2]}`);
        });

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

      const date = String(p.date ?? '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return reply(400, { error: 'date must be YYYY-MM-DD' });
      const caption = String(p.caption ?? '').trim();

      // managed fields; undefined value = remove the line entirely
      // `image` is intentionally not managed here — /image owns that line
      const fields = [
        ['date', date], // unquoted so YAML parses it as a date
        ['caption', caption ? JSON.stringify(caption) : undefined],
      ];

      let slug, file;
      if (p.slug) {
        slug = slugify(String(p.slug));
        file = path.join(dir, `${slug}.md`);
        if (!fs.existsSync(file)) return reply(400, { error: `no entry file for slug "${slug}"` });

        const m = fs.readFileSync(file, 'utf8').match(FM_RE);
        if (!m) return reply(400, { error: `${slug}.md has no frontmatter` });
        const lines = m[1].split(/\r?\n/);
        for (const [key, value] of fields) setLine(lines, key, value);
        fs.writeFileSync(file, `---\n${lines.join('\n')}\n---\n${m[2]}`);
      } else {
        const base = slugify(caption || date);
        slug = base;
        for (let i = 2; fs.existsSync(path.join(dir, `${slug}.md`)); i++) slug = `${base}-${i}`;
        file = path.join(dir, `${slug}.md`);
        const ordered = readOrdered(dir);
        const order = ordered.length ? ordered[ordered.length - 1].order + 1 : 1;
        const fm = [...fields, ['order', order]].filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${v}`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, `---\n${fm.join('\n')}\n---\n`);
      }
      reply(200, { file: path.relative(process.cwd(), file), slug });
    });
  };
}
