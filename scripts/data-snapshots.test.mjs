// Sanity checks on every committed data file under src/data/ (and the place
// entries that depend on the geocode cache). These files are written by scripts
// (fetch-media.mjs, count-drafts.mjs, the geocoder) and read straight into
// pages with no validation, so a bad refresh — a missing link, a rating of 40,
// a half-written list — would otherwise only show up as a broken page.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('../', import.meta.url);
const readJson = (rel) => JSON.parse(fs.readFileSync(new URL(rel, root), 'utf8'));

const ISO_TIMESTAMP = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/;
const ISO_DATE = /^\d{4}-\d\d-\d\d$/;
const isRealDate = (s) => ISO_DATE.test(s) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);
const isHttps = (s) => typeof s === 'string' && /^https:\/\/\S+$/.test(s);
const isNonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

// descending by `get`, with nulls (sorted as '') allowed only at the end
const expectNewestFirst = (list, get) => {
  const keys = list.map((x) => get(x) ?? '');
  expect(keys).toEqual([...keys].sort().reverse());
};

const expectNoDuplicates = (values) => {
  const dupes = values.filter((v, i) => values.indexOf(v) !== i);
  expect(dupes).toEqual([]);
};

describe('hardcover.json', () => {
  const data = readJson('src/data/hardcover.json');
  const shelves = { current: data.current, wantToRead: data.wantToRead, read: data.read };

  it('has snapshot metadata', () => {
    expect(data.fetchedAt).toMatch(ISO_TIMESTAMP);
    expect(Number.isInteger(data.userId)).toBe(true);
    expect(isNonEmpty(data.username)).toBe(true);
  });

  it.each(Object.keys(shelves))('%s is a list', (shelf) => {
    expect(Array.isArray(shelves[shelf])).toBe(true);
  });

  describe.each(Object.entries(shelves))('%s books', (_shelf, books) => {
    it('all carry what the pages render', () => {
      for (const b of books) {
        expect(isNonEmpty(b.title), `title: ${JSON.stringify(b)}`).toBe(true);
        expect(typeof b.author, `author: ${b.title}`).toBe('string');
        expect(b.link, `link: ${b.title}`).toMatch(/^https:\/\/hardcover\.app\/books\/[\w-]+$/);
        expect(b.cover === null || isHttps(b.cover), `cover: ${b.title}`).toBe(true);
        expect(b.releaseYear === null || Number.isInteger(b.releaseYear), `releaseYear: ${b.title}`).toBe(true);
        expect(isRealDate(b.addedAt), `addedAt: ${b.title}`).toBe(true);
        expect(b.addedAt < tomorrow, `addedAt in the future: ${b.title}`).toBe(true);
      }
    });

    it('have ratings in 0–5 half steps (0 = unrated)', () => {
      for (const b of books) {
        expect(b.rating, `rating: ${b.title}`).toBeGreaterThanOrEqual(0);
        expect(b.rating, `rating: ${b.title}`).toBeLessThanOrEqual(5);
        expect((b.rating * 2) % 1, `rating step: ${b.title}`).toBe(0);
      }
    });

    it('have no duplicates', () => {
      expectNoDuplicates(books.map((b) => b.link));
    });
  });

  it('no book is on two shelves', () => {
    expectNoDuplicates([...data.current, ...data.wantToRead, ...data.read].map((b) => b.link));
  });

  it('current: startedAt is a real date (or unknown) and progress is all-or-nothing and in range', () => {
    for (const b of data.current) {
      expect(b.startedAt === null || isRealDate(b.startedAt), `startedAt: ${b.title}`).toBe(true);
      expect('currentPage' in b, `progress pair: ${b.title}`).toBe('totalPages' in b);
      if ('currentPage' in b) {
        expect(Number.isInteger(b.currentPage) && b.currentPage > 0, `currentPage: ${b.title}`).toBe(true);
        expect(b.totalPages, `totalPages: ${b.title}`).toBeGreaterThanOrEqual(b.currentPage);
      }
    }
  });

  it('read: readAt is a real, non-future date (or unknown)', () => {
    for (const b of data.read) {
      expect(b.readAt === null || (isRealDate(b.readAt) && b.readAt < tomorrow), `readAt: ${b.title}`).toBe(true);
    }
  });

  it('is ordered newest-first, as the pages assume', () => {
    expectNewestFirst(data.current, (b) => b.startedAt);
    expectNewestFirst(data.wantToRead, (b) => b.addedAt);
    expectNewestFirst(data.read, (b) => b.readAt);
  });
});

describe('letterboxd.json', () => {
  const data = readJson('src/data/letterboxd.json');
  const grids = { favorites: data.favorites, watchlist: data.watchlist };

  it('has snapshot metadata', () => {
    expect(data.fetchedAt).toMatch(ISO_TIMESTAMP);
    expect(isNonEmpty(data.username)).toBe(true);
  });

  it('diary entries carry what /films renders', () => {
    expect(data.films.length).toBeGreaterThan(0);
    for (const f of data.films) {
      expect(isNonEmpty(f.title), `title: ${JSON.stringify(f)}`).toBe(true);
      expect(f.year === null || Number.isInteger(f.year), `year: ${f.title}`).toBe(true);
      expect(f.link, `link: ${f.title}`).toMatch(/^https:\/\/letterboxd\.com\//);
      expect(f.poster === null || isHttps(f.poster), `poster: ${f.title}`).toBe(true);
      expect(typeof f.liked, `liked: ${f.title}`).toBe('boolean');
      expect(typeof f.rewatch, `rewatch: ${f.title}`).toBe('boolean');
      expect(isRealDate(f.watchedDate), `watchedDate: ${f.title}`).toBe(true);
      // internal-only: fetch-media.mjs strips it before writing the snapshot
      expect('viewingId' in f, `viewingId leaked: ${f.title}`).toBe(false);
    }
  });

  it('diary ratings are 0.5–5 in half steps, or null when unrated', () => {
    for (const f of data.films) {
      if (f.rating === null) continue;
      expect(f.rating, `rating: ${f.title}`).toBeGreaterThanOrEqual(0.5);
      expect(f.rating, `rating: ${f.title}`).toBeLessThanOrEqual(5);
      expect((f.rating * 2) % 1, `rating step: ${f.title}`).toBe(0);
    }
  });

  it('diary is ordered by watchedDate, newest first', () => {
    expectNewestFirst(data.films, (f) => f.watchedDate);
  });

  it.each(Object.keys(grids))('%s entries carry a title, link and poster', (name) => {
    expect(grids[name].length).toBeGreaterThan(0);
    for (const f of grids[name]) {
      expect(isNonEmpty(f.title), `title: ${JSON.stringify(f)}`).toBe(true);
      expect(f.link, `link: ${f.title}`).toMatch(/^https:\/\/letterboxd\.com\/film\//);
      expect(isHttps(f.poster), `poster: ${f.title}`).toBe(true);
    }
    expectNoDuplicates(grids[name].map((f) => f.link));
  });

  it('keeps favorites to Letterboxd\'s 4 slots and the watchlist to its top 20', () => {
    expect(data.favorites.length).toBeLessThanOrEqual(4);
    expect(data.watchlist.length).toBeLessThanOrEqual(20);
  });
});

describe('github.json', () => {
  const data = readJson('src/data/github.json');

  it('has snapshot metadata', () => {
    expect(data.fetchedAt).toMatch(ISO_TIMESTAMP);
    expect(isNonEmpty(data.username)).toBe(true);
  });

  it('repos are public, non-fork project entries sorted by last push', () => {
    expect(data.repos.length).toBeGreaterThan(0);
    for (const r of data.repos) {
      expect(isNonEmpty(r.name)).toBe(true);
      expect(r.link, `link: ${r.name}`).toBe(`https://github.com/${data.username}/${r.name}`);
      expect(Number.isInteger(r.stars) && r.stars >= 0, `stars: ${r.name}`).toBe(true);
      expect(Array.isArray(r.topics), `topics: ${r.name}`).toBe(true);
      expect(isRealDate(r.pushedAt), `pushedAt: ${r.name}`).toBe(true);
    }
    expectNoDuplicates(data.repos.map((r) => r.name));
    expectNewestFirst(data.repos, (r) => r.pushedAt);
  });

  it('contribution calendar is internally consistent', () => {
    expect(data.contributions).not.toBeNull();
    const { total, days } = data.contributions;
    expect(days.length).toBeGreaterThan(300); // ~a year of days
    for (const d of days) {
      expect(isRealDate(d.date), `date: ${d.date}`).toBe(true);
      expect(Number.isInteger(d.count) && d.count >= 0, `count on ${d.date}`).toBe(true);
    }
    expectNoDuplicates(days.map((d) => d.date));
    // GitHub's own total doesn't always equal the sum of the daily counts
    // (observed 1289 vs 1284), so check they agree closely, not exactly
    const sum = days.reduce((acc, d) => acc + d.count, 0);
    expect(Math.abs(sum - total)).toBeLessThanOrEqual(Math.max(5, total * 0.02));
  });

  it('contributed repos are other people\'s public repos, with a private count that is only a count', () => {
    for (const r of data.contributedRepos) {
      expect(r.owner, `owner: ${r.name}`).not.toBe(data.username);
      expect(r.link, `link: ${r.name}`).toBe(`https://github.com/${r.owner}/${r.name}`);
      expect(r.commits === null || (Number.isInteger(r.commits) && r.commits >= 0), `commits: ${r.name}`).toBe(true);
    }
    expect(Number.isInteger(data.contributedPrivateCount) && data.contributedPrivateCount >= 0).toBe(true);
  });
});

describe('geocode-cache.json', () => {
  const cache = readJson('src/data/geocode-cache.json');

  it('maps location strings to null (no match) or an in-range [lat, lng]', () => {
    for (const [location, coords] of Object.entries(cache)) {
      if (coords === null) continue;
      expect(coords, location).toHaveLength(2);
      expect(coords[0], `lat: ${location}`).toBeGreaterThanOrEqual(-90);
      expect(coords[0], `lat: ${location}`).toBeLessThanOrEqual(90);
      expect(coords[1], `lng: ${location}`).toBeGreaterThanOrEqual(-180);
      expect(coords[1], `lng: ${location}`).toBeLessThanOrEqual(180);
    }
  });

  it('has a usable entry for every place that relies on geocoding (CI builds have no network)', () => {
    const dir = new URL('src/content/places/', root);
    const unresolved = [];
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const frontmatter = fs.readFileSync(new URL(file, dir), 'utf8').split(/^---\s*$/m)[1] ?? '';
      if (/^coords:/m.test(frontmatter)) continue;
      // quoted ("..." / '...') or bare, where a bare value ends at a trailing ` # comment`
      const raw = frontmatter.match(/^location:\s*(?:"([^"]*)"|'([^']*)'|(.*?))\s*(?:#.*)?$/m);
      const location = raw?.[1] ?? raw?.[2] ?? raw?.[3];
      if (!location || !Array.isArray(cache[location])) unresolved.push(`${file}: ${location ?? '(no coords or location)'}`);
    }
    expect(unresolved).toEqual([]);
  });
});

describe('drafts.json', () => {
  it('is just a non-negative count', () => {
    const data = readJson('src/data/drafts.json');
    expect(Object.keys(data)).toEqual(['count']);
    expect(Number.isInteger(data.count) && data.count >= 0).toBe(true);
  });
});
