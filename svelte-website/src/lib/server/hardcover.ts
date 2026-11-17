// npm notice run 'tsx' --env-file=../.env.local src/routes/books/hardcover.ts

import { HardcoverClient, UserBookStatus } from "@hardcover/sdk";

import { version } from "#lib/server/fetchVersion.ts";

const hc = new HardcoverClient({
  token: process.env.HARDCOVER_TOKEN,
  userAgent: `${process.env.DOMAIN_ROOT}/${version}`,
});
const me = await hc.me.get();
const reading = await hc.library.list({
  status: UserBookStatus.CurrentlyReading,
});
const past = await hc.library.list({ status: UserBookStatus.Read });
const future = await hc.library.list({ status: UserBookStatus.WantToRead });

// link and percentage read are derived from these items.
export interface ReadingBookItem {
  image: string | null;
  slug: string;
  hardcoverId: number;
  title: string;
  author: string;
  year: number | null;
  elapsedPages: number;
  totalPages: number | null;
}

export interface BasicBookItem {
  image: string | null;
  slug: string;
  hardcoverId: number;
  title: string;
  author: string;
  year: number | null;
  readLog: string[];
}
export interface YearBucket {
  year: string;
  books: BasicBookItem[];
}

export function dataReading(): ReadingBookItem[] {
  const data: ReadingBookItem[] = [];

  for (const item of reading.items) {
    const hardcoverId = item.bookId;
    const book = item.book;
    const edition = item.edition;

    const image = edition?.cachedImage.url ?? null;

    const slug = book?.slug ?? "";
    const title = edition?.title ?? book?.title ?? "Untitled";

    const author =
      book?.contributions?.[0]?.author?.name ??
      book?.cachedContributors?.[0]?.author?.name ??
      "Unknown Author";

    const releaseDate = edition?.releaseDate ?? book?.releaseDate;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : null;

    const reads = item.userBookReads ?? item.reads ?? [];
    const currentRead = reads[reads.length - 1];
    const elapsedPages = currentRead?.progressPages ?? 0;

    const totalPages = edition?.pages ?? book?.pages ?? null;

    data.push({
      image,
      slug,
      hardcoverId,
      title,
      author,
      year,
      elapsedPages,
      totalPages,
    });
  }
  return data;
}

// data reading is passed t o +page.server.ts

export function pastReads(): BasicBookItem[] {
  const data: BasicBookItem[] = [];

  for (const item of past.items) {
    const hardcoverId = item.bookId;
    const book = item.book;
    const edition = item.edition;

    const image = edition?.cachedImage?.url ?? book?.cachedImage?.url ?? null;
    const slug = book?.slug ?? "";
    const title = edition?.title ?? book?.title ?? "Untitled";

    const author =
      book?.contributions?.[0]?.author?.name ??
      book?.cachedContributors?.[0]?.author?.name ??
      "Unknown Author";

    const releaseDate = edition?.releaseDate ?? book?.releaseDate;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : null;

    // Extract all finished dates and sort them newest-first
    const reads = item.userBookReads ?? item.reads ?? [];
    const readLog = reads
      .map((read) => read.finishedAt)
      .filter((date): date is string => Boolean(date))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // Fallback: If no detailed read entries exist, use the summary lastReadDate
    if (readLog.length === 0 && item.lastReadDate) {
      readLog.push(item.lastReadDate);
    }

    data.push({
      image,
      slug,
      hardcoverId,
      title,
      author,
      year,
      readLog,
    });
  }

  // Sort books by their most recent read date (newest first), pushing undated books to the end
  return data.sort((a, b) => {
    const latestA = a.readLog[0] ? new Date(a.readLog[0]).getTime() : 0;
    const latestB = b.readLog[0] ? new Date(b.readLog[0]).getTime() : 0;
    return latestB - latestA;
  });
}

export function pastReadsByYear(): YearBucket[] {
  const sortedBooks = pastReads();
  const buckets = new Map<string, BasicBookItem[]>();

  for (const book of sortedBooks) {
    const latestDate = book.readLog[0];
    // Extract YYYY from ISO date string (avoids UTC-to-local timezone shifts)
    const readYear = latestDate ? latestDate.slice(0, 4) : "Undated";

    if (!buckets.has(readYear)) {
      buckets.set(readYear, []);
    }
    buckets.get(readYear)!.push(book);
  }
  return Array.from(buckets, ([year, books]) => ({
    year,
    books,
  }));
}
