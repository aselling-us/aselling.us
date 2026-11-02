// Hardcover reading-shelf snapshot. fetch-media.mjs calls fetchHardcoverShelves()
// for the real fetch; the mapping and pagination logic is split out as plain
// functions so hardcover.test.mjs can exercise it against a fake client.
import { allPages, HardcoverClient, UserBookStatus } from '@hardcover/sdk';

// Plain comparison, not localeCompare: the snapshot is written from both a Mac
// (launchd) and an Actions runner, and a locale-dependent tie-break would flip
// the order between them and commit a no-op diff every refresh.
const cmp = (x, y) => (x < y ? -1 : x > y ? 1 : 0);

// Newest first by `field`; undated entries (e.g. books imported without a read
// record) sink to the bottom, then ties fall back to a stable total order.
const newestFirst = (field) => (a, b) =>
  cmp(b[field] ?? '', a[field] ?? '') || cmp(b.addedAt, a.addedAt) || cmp(a.title ?? '', b.title ?? '');

// Fields shared by every shelf.
export function toBook(item) {
  return {
    title: item.book.title,
    // cachedContributors also lists translators, editors, illustrators, etc.;
    // only "Author" credits belong under the title
    author: (item.book.cachedContributors ?? [])
      .filter((contributor) => contributor.contribution === 'Author')
      .flatMap((contributor) => (contributor.author ? [contributor.author.name] : []))
      .join(', '),
    link: item.book.slug ? `https://hardcover.app/books/${item.book.slug}` : null,
    cover: item.book.cachedImage?.url ?? null,
    releaseYear: item.book.releaseYear,
    rating: item.rating ?? 0,
    addedAt: item.dateAdded.slice(0, 10),
  };
}

const activeRead = (item) => item.userBookReads.find((r) => !r.finishedAt);

// Most recent finish across all reads (re-reads included), falling back to the
// entry's own lastReadDate when no read row carries a finish date.
export function finishedAt(item) {
  return (
    item.userBookReads
      .flatMap((r) => (r.finishedAt ? [r.finishedAt] : []))
      .sort()
      .at(-1) ??
    item.lastReadDate ??
    null
  );
}

// Page progress of the in-flight read. The total comes from the edition that
// read is actually on, not the entry's or the book's default edition — they
// can disagree by dozens of pages (and the book-level count can even be
// smaller than the pages already read). Returns {} when there's no usable
// progress, so the page just omits the bar rather than drawing a bogus one.
export function readProgress(item) {
  const read = activeRead(item);
  const currentPage = read?.progressPages ?? null;
  const totalPages = read?.edition?.pages ?? item.edition?.pages ?? item.book.pages ?? null;
  if (!currentPage || !totalPages || currentPage > totalPages) return {};
  return { currentPage, totalPages };
}

export const toCurrent = (item) => ({
  ...toBook(item),
  startedAt: activeRead(item)?.startedAt ?? item.firstStartedReadingDate ?? null,
  ...readProgress(item),
});

export const toRead = (item) => ({ ...toBook(item), readAt: finishedAt(item) });

// library.list returns one page (25 items by default), so a bare call silently
// truncates the Read and Want to Read shelves. allPages walks them all.
const shelf = (hc, status) => Array.fromAsync(allPages((page) => hc.library.list({ status, ...page })));

export async function collectShelves(hc) {
  const [me, current, wantToRead, read] = await Promise.all([
    hc.me.get(),
    shelf(hc, UserBookStatus.CurrentlyReading),
    shelf(hc, UserBookStatus.WantToRead),
    shelf(hc, UserBookStatus.Read),
  ]);
  return {
    userId: me.id,
    username: me.username,
    current: current.map(toCurrent).sort(newestFirst('startedAt')),
    wantToRead: wantToRead.map(toBook).sort(newestFirst('addedAt')),
    read: read.map(toRead).sort(newestFirst('readAt')),
  };
}

export function fetchHardcoverShelves(token) {
  return collectShelves(
    new HardcoverClient({ token, userAgent: 'aselling.us media snapshot (arjan.ellingson@gmail.com)' })
  );
}
