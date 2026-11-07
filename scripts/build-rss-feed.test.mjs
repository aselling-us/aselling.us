import { describe, it, expect } from 'vitest';
import { SyntaxValidator } from 'fast-xml-validator';
import {
  buildFeed,
  filmEntries,
  bookEntries,
  placeEntries,
  recentPlaces,
} from './build-rss-feed.mjs';

const films = [
  {
    title: 'Heat',
    year: 1995,
    link: 'https://letterboxd.com/aselling/film/heat/',
    rating: 4.5,
    liked: true,
    rewatch: false,
    watchedDate: '2026-11-01',
    review: 'cops & robbers <3',
  },
  {
    title: 'The Godfather',
    year: 1972,
    link: 'https://letterboxd.com/aselling/film/the-godfather/',
    rating: null,
    liked: false,
    rewatch: false,
    watchedDate: '2026-11-06',
    review: '',
  },
  // logged without a diary date — shouldn't be published
  { title: 'Undated', link: 'https://letterboxd.com/aselling/film/undated/', watchedDate: null },
];

const current = [
  {
    title: 'The Shards',
    author: 'Bret Easton Ellis',
    link: 'https://hardcover.app/books/the-shards',
    addedAt: '2026-08-13',
    startedAt: '2026-08-31',
    currentPage: 245,
    totalPages: 609,
  },
];

const read = [
  {
    title: 'The Invisible Man',
    author: 'H. G. Wells',
    link: 'https://hardcover.app/books/the-invisible-man',
    rating: 3.5,
    readAt: '2026-11-03',
  },
  {
    title: 'Imported Without A Finish Date',
    author: 'Someone',
    link: 'https://hardcover.app/books/imported',
    rating: 0,
    readAt: null,
  },
];

const DAY = 86400000;
const now = Date.UTC(2026, 10, 7);
const place = (over) => ({
  id: 'duluth',
  name: 'Duluth',
  kind: 'travel',
  date: '3 July 2026',
  sortDate: Date.UTC(2026, 6, 3),
  detail: undefined,
  body: '\nonly in the summer, never in the freezing cold\n',
  ...over,
});

describe('filmEntries', () => {
  it('skips films with no diary date and lists the newest first', () => {
    const entries = filmEntries(films);
    expect(entries.map((e) => e.title)).toEqual(['Watched The Godfather (1972)', 'Watched Heat (1995)']);
  });

  it('puts rating, like and review in the summary', () => {
    const [, heat] = filmEntries(films);
    expect(heat.summary).toBe('Rated 4.5/5\n\nLiked\n\ncops & robbers <3');
  });

  it('respects the limit', () => {
    expect(filmEntries(films, { limit: 1 })).toHaveLength(1);
  });
});

describe('bookEntries', () => {
  it('includes currently-reading books with progress and skips reads with no finish date', () => {
    const entries = bookEntries({ current, read });
    expect(entries.map((e) => [e.category, e.title])).toEqual([
      ['reading', 'Reading The Shards — Bret Easton Ellis'],
      ['read', 'Read The Invisible Man — H. G. Wells'],
    ]);
    expect(entries[0].summary).toBe('Page 245 of 609');
    expect(entries[1].summary).toBe('Rated 3.5/5');
  });

  it('gives a book that is both current and read distinct ids', () => {
    const both = bookEntries({
      current: [{ ...current[0], link: read[0].link }],
      read: [read[0]],
    });
    expect(new Set(both.map((e) => e.id)).size).toBe(2);
  });
});

describe('recentPlaces', () => {
  it('keeps past visits only, newest first', () => {
    const places = [
      place({ id: 'old', sortDate: now - 400 * DAY }),
      place({ id: 'recent', sortDate: now - 3 * DAY }),
      place({ id: 'future-show', kind: 'event', sortDate: now + 30 * DAY }),
      place({ id: 'dream', kind: 'want-to-go', sortDate: now - DAY }),
      place({ id: 'home', kind: 'lived', sortDate: now - DAY }),
      place({ id: 'undated', sortDate: null }),
    ];
    expect(recentPlaces(places, { now }).map((p) => p.id)).toEqual(['recent', 'old']);
  });
});

describe('placeEntries', () => {
  it('words events and trips differently and falls back to the first body line', () => {
    const entries = placeEntries(
      [place({ id: 'a', kind: 'event', name: 'Duran Duran', sortDate: now - DAY }), place({ id: 'b' })],
      { site: 'https://aselling.us/', now },
    );
    expect(entries.map((e) => e.title)).toEqual(['Attended Duran Duran', 'Visited Duluth']);
    expect(entries[1].summary).toBe('3 July 2026 — only in the summer, never in the freezing cold');
    expect(entries[1].id).toBe('https://aselling.us/travels#b');
  });
});

describe('buildFeed', () => {
  const entries = [
    ...filmEntries(films),
    ...bookEntries({ current, read }),
    ...placeEntries([place({ id: 'a' })], { site: 'https://aselling.us', now }),
  ];
  const render = (over = {}) => buildFeed({ site: 'https://aselling.us', email: 'test@example.com', entries, ...over });

  it('produces valid XML', () => {
    expect(SyntaxValidator.validate(render(), { allowBooleanAttributes: true })).toBe(true);
  });

  it('writes one <entry> per input', () => {
    expect(render().match(/<entry>/g)).toHaveLength(entries.length);
  });

  it('escapes markup in titles and reviews', () => {
    const xml = render();
    expect(xml).toContain('cops &amp; robbers &lt;3');
    expect(xml).not.toContain('cops & robbers');
  });

  it('lists entries newest first and stamps the feed with the newest', () => {
    const xml = render();
    expect(xml.indexOf('Watched The Godfather')).toBeLessThan(xml.indexOf('Watched Heat'));
    expect(xml).toContain('<updated>2026-11-06T00:00:00Z</updated>');
  });

  it('omits <email> when none is configured', () => {
    expect(render({ email: undefined })).not.toContain('<email>');
    expect(render()).toContain('<email>test@example.com</email>');
  });
});
