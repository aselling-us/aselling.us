import { HardcoverClient, UserBookStatus } from "@hardcover/sdk";
let client: HardcoverClient | null = null;

async function getToken(): Promise<string> {
  let token: string | undefined;
  try {
    token = (await import("$app/env/private")).HARDCOVER_TOKEN;
  } catch {
    token = process.env.HARDCOVER_TOKEN; // running as a standalone script
  }
  if (!token) throw new Error("HARDCOVER_TOKEN is not set");
  return token;
}

export async function getHardcoverClient() {
  if (!client) {
    client = new HardcoverClient({ token: await getToken() });
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
  year: number | null; // publication year, metadata only
  readLog: string[];
  sortDate: string | null;
}

export interface YearBucket {
  year: string;
  books: BasicBookItem[];
}

async function getAllReadBooks() {
  const hc = await getHardcoverClient();
  const items: Awaited<ReturnType<typeof hc.library.list>>["items"] = [];
  let cursor: string | undefined;

  do {
    const page = await hc.library.list({
      status: UserBookStatus.Read,
      limit: 100,
      cursor,
    });

    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);

  return items;
}

export async function dataReading(): Promise<ReadingBookItem[]> {
  const hc = await getHardcoverClient();
  const reading = await hc.library.list({
    status: UserBookStatus.CurrentlyReading,
  });

  return reading.items.map((item) => {
    const book = item.book;
    const edition = item.edition;
    const reads = item.userBookReads ?? item.reads ?? [];
    const currentRead = reads.at(-1);

    const releaseDate = edition?.releaseDate ?? book?.releaseDate;
    const parsedYear = releaseDate ? new Date(releaseDate).getFullYear() : NaN;

    return {
      image: edition?.cachedImage?.url ?? book?.cachedImage?.url ?? null,
      slug: book?.slug ?? "",
      hardcoverId: item.bookId,
      title: edition?.title ?? book?.title ?? "Untitled",
      author:
        book?.contributions?.[0]?.author?.name ??
        book?.cachedContributors?.[0]?.author?.name ??
        "Unknown Author",
      year: Number.isNaN(parsedYear) ? null : parsedYear,
      elapsedPages: currentRead?.progressPages ?? 0,
      totalPages: edition?.pages ?? book?.pages ?? null,
    };
  });
}

export async function pastReads(): Promise<BasicBookItem[]> {
  const pastItems = await getAllReadBooks();
  const data: BasicBookItem[] = [];

  for (const item of pastItems) {
    const book = item.book;
    const edition = item.edition;
    const reads = item.userBookReads ?? item.reads ?? [];

    const readLog = reads
      .map((read) => read.finishedAt)
      .filter((date): date is string => Boolean(date))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const releaseDate = edition?.releaseDate ?? book?.releaseDate;
    const publicationYear = releaseDate
      ? new Date(releaseDate).getFullYear()
      : null;

    const sortDate = readLog[0] ?? null;

    // Includes print, ebook, and audiobook entries.
    // A completion date takes priority over the release date.
    if (!sortDate) continue;

    const year = new Date(sortDate).getFullYear();
    if (Number.isNaN(year)) continue;

    data.push({
      image: edition?.cachedImage?.url ?? book?.cachedImage?.url ?? null,
      slug: book?.slug ?? "",
      hardcoverId: item.bookId,
      title: edition?.title ?? book?.title ?? "Untitled",
      author:
        book?.contributions?.[0]?.author?.name ??
        book?.cachedContributors?.[0]?.author?.name ??
        "Unknown Author",
      year: Number.isNaN(publicationYear) ? null : publicationYear,
      readLog,
      sortDate,
    });
  }

  return data.sort((a, b) => {
    if (!a.sortDate) return 1;
    if (!b.sortDate) return -1;

    return new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime();
  });
}

export async function pastReadsByYear(): Promise<YearBucket[]> {
  const sortedBooks = await pastReads();
  const buckets = new Map<string, BasicBookItem[]>();

  for (const book of sortedBooks) {
    const year = book.sortDate ? book.sortDate.slice(0, 4) : "Undated";
    if (!buckets.has(year)) {
      buckets.set(year, []);
    }

    buckets.get(year)!.push(book);
  }

  return Array.from(buckets, ([year, books]) => ({ year, books }));
}
