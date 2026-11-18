import { HardcoverClient, UserBookStatus } from "@hardcover/sdk";
import { env } from "$env/dynamic/private";

let client: HardcoverClient | null = null;

export function getHardcoverClient() {
  if (!client) {
    // Works in both SvelteKit ($env) and standalone tsx CLI (process.env)
    const token = env.HARDCOVER_TOKEN ?? process.env.HARDCOVER_TOKEN;
    client = new HardcoverClient({ token });
  }
  return client;
}

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

// Now async so API calls only run when requested, not during build analysis
export async function dataReading(): Promise<ReadingBookItem[]> {
  const hc = getHardcoverClient();
  const reading = await hc.library.list({
    status: UserBookStatus.CurrentlyReading,
  });

  const data: ReadingBookItem[] = [];

  for (const item of reading.items) {
    const hardcoverId = item.bookId;
    const book = item.book;
    const edition = item.edition;

    const image = edition?.cachedImage?.url ?? null;
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

export async function pastReads(): Promise<BasicBookItem[]> {
  const hc = getHardcoverClient();
  const past = await hc.library.list({ status: UserBookStatus.Read });

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

    const reads = item.userBookReads ?? item.reads ?? [];
    const readLog = reads
      .map((read) => read.finishedAt)
      .filter((date): date is string => Boolean(date))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

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

  return data.sort((a, b) => {
    const latestA = a.readLog[0] ? new Date(a.readLog[0]).getTime() : 0;
    const latestB = b.readLog[0] ? new Date(b.readLog[0]).getTime() : 0;
    return latestB - latestA;
  });
}

export async function pastReadsByYear(): Promise<YearBucket[]> {
  const sortedBooks = await pastReads();
  const buckets = new Map<string, BasicBookItem[]>();

  for (const book of sortedBooks) {
    const latestDate = book.readLog[0];
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
