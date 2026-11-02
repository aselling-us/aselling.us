// Dev-only endpoints behind the "edit"/"+ new position" buttons on /working
// (mounted at /__edit-career by scripts/dev-add-place.mjs — never part of
// the built site).
// POST /__edit-career/save { slug?, role, company, companyUrl?, location?, startDate, endDate?, tags?, body }
//   with slug: rewrites the managed frontmatter fields of an existing career
//   entry, leaving anything else (logo) untouched, and replaces the body
//   without slug: creates src/content/career/<slug-from-company>.md
// POST /__edit-career/image?slug=<slug>&name=<filename>  (raw image body)
//   saves the entry's logo as <slug>-logo.<ext> next to the .md file and
//   sets its `logo:` frontmatter line
// NOTE: loaded once at dev-server startup — after editing this file, restart
// `npm run dev` or requests hit the old handler.
import fs from 'node:fs';
import path from 'node:path';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'position';

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

export function careerEditHandler({ dir = path.resolve('src/content/career') } = {}) {
  return (req, res) => {
    const reply = (code, payload) => {
      res.statusCode = code;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    };
    if (req.method !== 'POST') return reply(405, { error: 'POST only' });
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/image') {
      const slug = path.basename(String(url.searchParams.get('slug') ?? ''));
      const original = path.basename(String(url.searchParams.get('name') ?? 'logo'));
      const ext = path.extname(original).toLowerCase();
      if (!IMAGE_EXTS.has(ext))
        return reply(400, { error: `unsupported image type "${ext || 'none'}" (HEIC? convert to jpg first)` });
      const mdFile = path.join(dir, `${slug}.md`);
      if (!fs.existsSync(mdFile)) return reply(400, { error: `no career file for slug "${slug}"` });

      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        // one logo per entry: replace any previous one, whatever its extension
        for (const e of IMAGE_EXTS) {
          const old = path.join(dir, `${slug}-logo${e}`);
          if (e !== ext && fs.existsSync(old)) fs.unlinkSync(old);
        }
        const file = path.join(dir, `${slug}-logo${ext}`);
        fs.writeFileSync(file, Buffer.concat(chunks));

        const m = fs.readFileSync(mdFile, 'utf8').match(FM_RE);
        if (!m) return reply(400, { error: `${slug}.md has no frontmatter` });
        const lines = m[1].split(/\r?\n/);
        setLine(lines, 'logo', `./${slug}-logo${ext}`);
        fs.writeFileSync(mdFile, `---\n${lines.join('\n')}\n---\n${m[2]}`);
        reply(200, { file: path.relative(process.cwd(), file) });
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

      const role = String(p.role ?? '').trim();
      const company = String(p.company ?? '').trim();
      const companyUrl = String(p.companyUrl ?? '').trim();
      const location = String(p.location ?? '').trim();
      const startDate = String(p.startDate ?? '').trim();
      const endDate = String(p.endDate ?? '').trim();
      const tags = String(p.tags ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const text = String(p.body ?? '').trim();

      if (!role) return reply(400, { error: 'role is required' });
      if (!company) return reply(400, { error: 'company is required' });
      if (!MONTH_RE.test(startDate)) return reply(400, { error: 'start date must be YYYY-MM' });
      if (endDate && !MONTH_RE.test(endDate)) return reply(400, { error: 'end date must be YYYY-MM' });

      // managed fields; undefined value = remove the line entirely
      // (JSON.stringify output is a valid YAML double-quoted scalar / flow list)
      // `logo` is intentionally not managed here — /image owns that line
      const fields = [
        ['role', JSON.stringify(role)],
        ['company', JSON.stringify(company)],
        ['companyUrl', companyUrl ? JSON.stringify(companyUrl) : undefined],
        ['location', location ? JSON.stringify(location) : undefined],
        ['startDate', JSON.stringify(startDate)],
        ['endDate', endDate ? JSON.stringify(endDate) : undefined],
        ['tags', tags.length ? JSON.stringify(tags) : undefined],
      ];

      let slug, file;
      if (p.slug) {
        slug = path.basename(String(p.slug));
        file = path.join(dir, `${slug}.md`);
        if (!fs.existsSync(file)) return reply(400, { error: `no career file for slug "${slug}"` });

        const m = fs.readFileSync(file, 'utf8').match(FM_RE);
        if (!m) return reply(400, { error: `${slug}.md has no frontmatter` });
        const lines = m[1].split(/\r?\n/);
        for (const [key, value] of fields) setLine(lines, key, value);
        fs.writeFileSync(file, `---\n${lines.join('\n')}\n---\n${text ? `\n${text}\n` : ''}`);
      } else {
        const base = slugify(company);
        slug = base;
        for (let i = 2; fs.existsSync(path.join(dir, `${slug}.md`)); i++) slug = `${base}-${i}`;
        file = path.join(dir, `${slug}.md`);
        const fm = fields.filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${v}`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, `---\n${fm.join('\n')}\n---\n${text ? `\n${text}\n` : ''}`);
      }
      reply(200, { file: path.relative(process.cwd(), file), slug });
    });
  };
}
