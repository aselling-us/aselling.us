import XMLBuilder from 'fast-xml-builder';

const AUTHOR_NAME = 'Arjan Singh Ellingson';

export const VISIT_KINDS = ['travel', 'event', 'third-place'];

const builder = new XMLBuilder({ format: true, ignoreAttributes: false });

// snapshots store plain `YYYY-MM-DD` days; Atom wants RFC 3339 timestamps
const dayToTimestamp = (day) => `${day}T00:00:00Z`;

const withoutTrailingSlash = (s) => s.replace(/\/$/, '');

const firstLine = (body) =>
  (body ?? '')
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean);

const newestFirst = (a, b) => (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0);

export function filmEntries(films, { limit = 10 } = {}) {
  return films
    .filter((f) => f.watchedDate)
    .map((f) => ({
      id: `${f.link}#${f.watchedDate}`,
      title: `Watched ${f.title}${f.year ? ` (${f.year})` : ''}`,
      link: f.link,
      updated: dayToTimestamp(f.watchedDate),
      category: 'watched',
      summary: [
        f.rating ? `Rated ${f.rating}/5` : null,
        f.liked ? 'Liked' : null,
        f.rewatch ? 'Rewatch' : null,
        f.review || null,
      ]
        .filter(Boolean)
        .join('\n\n'),
    }))
    .sort(newestFirst)
    .slice(0, limit);
}

export function bookEntries({ current, read }, { limit = 10 } = {}) {
  const reading = current.map((b) => ({
    id: `${b.link}#reading`,
    title: `Reading ${b.title}${b.author ? ` — ${b.author}` : ''}`,
    link: b.link,
    updated: dayToTimestamp(b.startedAt ?? b.addedAt),
    category: 'reading',
    summary: b.currentPage && b.totalPages ? `Page ${b.currentPage} of ${b.totalPages}` : '',
  }));
  // books imported without a read record have no finish date to publish
  const finished = read
    .filter((b) => b.readAt)
    .map((b) => ({
      id: `${b.link}#read-${b.readAt}`,
      title: `Read ${b.title}${b.author ? ` — ${b.author}` : ''}`,
      link: b.link,
      updated: dayToTimestamp(b.readAt),
      category: 'read',
      summary: b.rating ? `Rated ${b.rating}/5` : '',
    }))
    .sort(newestFirst)
    .slice(0, limit);
  return [...reading, ...finished];
}

// `places` are `{ id, name, kind, date, sortDate, detail, body }` — `sortDate` is
// the UTC-ms timestamp from parsePlaceDate (src/lib/place-date.ts), or null
export function recentPlaces(places, { now, limit = 10 }) {
  return places
    .filter((p) => VISIT_KINDS.includes(p.kind) && p.sortDate != null && p.sortDate <= now)
    .sort((a, b) => b.sortDate - a.sortDate)
    .slice(0, limit);
}

export function placeEntries(places, { site, now, limit = 10 }) {
  const base = withoutTrailingSlash(site);
  return recentPlaces(places, { now, limit }).map((p) => ({
    id: `${base}/travels#${p.id}`,
    title: `${p.kind === 'event' ? 'Attended' : 'Visited'} ${p.name}`,
    link: `${base}/travels`,
    updated: new Date(p.sortDate).toISOString(),
    category: 'visited',
    summary: [p.date, p.detail ?? firstLine(p.body)].filter(Boolean).join(' — '),
  }));
}

/** @param {{ site: string, email?: string, updated?: string, entries: any[] }} opts */
export function buildFeed({ site, email, updated, entries }) {
  const base = withoutTrailingSlash(site);
  const sorted = [...entries].sort(newestFirst);
  const feed = {
    '@_xmlns': 'http://www.w3.org/2005/Atom',
    title: AUTHOR_NAME,
    subtitle: 'Arjan Ellingson: Portfolio & Archive',
    link: [
      { '@_href': `${base}/rss.xml`, '@_rel': 'self' },
      { '@_href': `${base}/` },
    ],
    // newest entry rather than build time, so the feed doesn't churn every deploy
    updated: updated ?? sorted[0]?.updated ?? new Date().toISOString(),
    id: `${base}/`,
    author: { name: AUTHOR_NAME, ...(email ? { email } : {}) },
    entry: sorted.map((e) => ({
      id: e.id,
      title: e.title,
      link: { '@_href': e.link },
      updated: e.updated,
      category: { '@_term': e.category },
      ...(e.summary ? { summary: { '@_type': 'text', '#text': e.summary } } : {}),
    })),
  };
  return builder.build({ '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' }, feed });
}
