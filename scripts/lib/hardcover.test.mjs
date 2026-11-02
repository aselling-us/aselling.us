import { describe, expect, it } from 'vitest';
import { UserBookStatus } from '@hardcover/sdk';
import { collectShelves, finishedAt, readProgress, toBook, toCurrent, toRead } from './hardcover.mjs';

const author = (name, contribution = 'Author') => ({ author: { name }, contribution });

// A library entry as library.list returns it, trimmed to what the mapper reads.
const entry = (overrides = {}) => ({
  rating: null,
  dateAdded: '2026-01-02T03:04:05Z',
  firstStartedReadingDate: null,
  lastReadDate: null,
  book: {
    title: 'A Book',
    slug: 'a-book',
    pages: 100,
    releaseYear: 2001,
    cachedImage: { url: 'https://assets.hardcover.app/a.jpeg' },
    cachedContributors: [author('Ann Author')],
  },
  edition: null,
  userBookReads: [],
  ...overrides,
});

describe('toBook', () => {
  it('maps the shared fields', () => {
    expect(toBook(entry({ rating: 4 }))).toEqual({
      title: 'A Book',
      author: 'Ann Author',
      link: 'https://hardcover.app/books/a-book',
      cover: 'https://assets.hardcover.app/a.jpeg',
      releaseYear: 2001,
      rating: 4,
      addedAt: '2026-01-02',
    });
  });

  it('credits only "Author" contributors, not translators or editors', () => {
    const item = entry();
    item.book.cachedContributors = [
      author('Albert Camus'),
      author("Justin O'Brien", 'Translator'),
      author('Co Author'),
      author('An Editor', 'Editor'),
    ];
    expect(toBook(item).author).toBe('Albert Camus, Co Author');
  });

  it('degrades to empty/null rather than throwing on sparse entries', () => {
    const item = entry();
    item.book.slug = null;
    item.book.cachedImage = null;
    item.book.cachedContributors = null;
    expect(toBook(item)).toMatchObject({ author: '', link: null, cover: null, rating: 0 });
  });
});

describe('finishedAt', () => {
  it('picks the latest finish across re-reads', () => {
    const item = entry({
      userBookReads: [{ finishedAt: '2024-05-01' }, { finishedAt: '2025-09-30' }, { finishedAt: '2023-01-01' }],
    });
    expect(finishedAt(item)).toBe('2025-09-30');
  });

  it('falls back to lastReadDate, then null', () => {
    expect(finishedAt(entry({ lastReadDate: '2022-02-02' }))).toBe('2022-02-02');
    expect(finishedAt(entry())).toBeNull();
  });
});

describe('readProgress', () => {
  const reading = (read, rest = {}) => entry({ userBookReads: [{ finishedAt: null, ...read }], ...rest });

  it('reads pages from the in-flight read and the total from that read\'s own edition', () => {
    const item = reading(
      { progressPages: 156, edition: { pages: 208 } },
      { edition: { pages: 176 } } // the entry's default edition disagrees
    );
    item.book.pages = 114; // ...and so does the book
    expect(readProgress(item)).toEqual({ currentPage: 156, totalPages: 208 });
  });

  it('falls back through entry edition, then book page count', () => {
    expect(readProgress(reading({ progressPages: 10 }, { edition: { pages: 300 } }))).toEqual({
      currentPage: 10,
      totalPages: 300,
    });
    expect(readProgress(reading({ progressPages: 10 }))).toEqual({ currentPage: 10, totalPages: 100 });
  });

  it('ignores finished reads, so a re-read does not inherit the old read\'s progress', () => {
    const item = entry({ userBookReads: [{ finishedAt: '2024-01-01', progressPages: 100 }] });
    expect(readProgress(item)).toEqual({});
  });

  it.each([
    ['no pages logged yet', { progressPages: null }],
    ['zero pages logged', { progressPages: 0 }],
    ['more pages read than the edition has', { progressPages: 500 }],
  ])('returns no progress for %s', (_label, read) => {
    expect(readProgress(reading(read))).toEqual({});
  });

  it('returns no progress when the total page count is unknown', () => {
    const item = reading({ progressPages: 10 });
    item.book.pages = null;
    expect(readProgress(item)).toEqual({});
  });
});

describe('toCurrent / toRead', () => {
  it('toCurrent adds startedAt (active read, else first-started) and progress', () => {
    const item = entry({
      firstStartedReadingDate: '2020-01-01',
      userBookReads: [
        { finishedAt: '2021-01-01', startedAt: '2020-12-01' },
        { finishedAt: null, startedAt: '2026-08-11', progressPages: 26 },
      ],
    });
    expect(toCurrent(item)).toMatchObject({ startedAt: '2026-08-11', currentPage: 26, totalPages: 100 });
    expect(toCurrent(entry({ firstStartedReadingDate: '2020-01-01' })).startedAt).toBe('2020-01-01');
  });

  it('toRead adds readAt', () => {
    expect(toRead(entry({ lastReadDate: '2022-02-02' })).readAt).toBe('2022-02-02');
  });
});

describe('collectShelves', () => {
  // Fake client with real paging semantics: honors offset, and caps pages at
  // 25 like the live API does (a bare library.list() call truncated the Read /
  // Want to Read shelves at exactly that). Like the real Page, `limit` is the
  // size actually used — allPages advances its offset by it.
  const makeClient = (byStatus) => ({
    me: { get: async () => ({ id: 7, username: 'reader' }) },
    library: {
      list: async ({ status, limit = 25, offset = 0 }) => {
        const size = Math.min(limit, 25);
        const items = (byStatus[status] ?? []).slice(offset, offset + size);
        return { items, limit: size, offset, hasMore: items.length === size };
      },
    },
  });

  const many = (n, make) => Array.from({ length: n }, (_, i) => make(i));

  it('walks every page of every shelf instead of stopping at the first 25', async () => {
    const hc = makeClient({
      [UserBookStatus.WantToRead]: many(60, (i) => entry({ book: { ...entry().book, title: `want ${i}` } })),
      [UserBookStatus.Read]: many(26, (i) => entry({ book: { ...entry().book, title: `read ${i}` } })),
    });
    const shelves = await collectShelves(hc);
    expect(shelves.wantToRead).toHaveLength(60);
    expect(shelves.read).toHaveLength(26);
    expect(shelves.current).toHaveLength(0);
    expect(shelves).toMatchObject({ userId: 7, username: 'reader' });
  });

  it('orders shelves newest-first, with undated entries last and a stable tie-break', async () => {
    const dated = (title, finished, added) =>
      entry({
        dateAdded: added,
        userBookReads: finished ? [{ finishedAt: finished }] : [],
        book: { ...entry().book, title },
      });
    const hc = makeClient({
      [UserBookStatus.Read]: [
        dated('undated b', null, '2025-01-01'),
        dated('old', '2020-01-01', '2019-01-01'),
        dated('undated a', null, '2025-01-01'),
        dated('new', '2026-06-01', '2019-01-01'),
        dated('undated newer-added', null, '2026-01-01'),
      ],
    });
    const { read } = await collectShelves(hc);
    expect(read.map((b) => b.title)).toEqual(['new', 'old', 'undated newer-added', 'undated a', 'undated b']);
  });

  it('puts the most recently started current book first', async () => {
    const started = (title, startedAt) =>
      entry({ userBookReads: [{ finishedAt: null, startedAt }], book: { ...entry().book, title } });
    const hc = makeClient({
      [UserBookStatus.CurrentlyReading]: [started('mid', '2026-05-18'), started('latest', '2026-10-20'), started('first', '2026-01-01')],
    });
    const { current } = await collectShelves(hc);
    expect(current.map((b) => b.title)).toEqual(['latest', 'mid', 'first']);
  });
});
