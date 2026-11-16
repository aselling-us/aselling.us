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
  title: string;
  author: string;
  year: number | null;
  elapsedPages: number;
  totalPages: number | null;
}

export function dataReading(): ReadingBookItem[] {
  const data: ReadingBookItem[] = [];

  for (const item of reading.items) {
    const book = item.book;
    const edition = item.edition;

    const image = edition?.cachedImage.url;

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
      title,
      author,
      year,
      elapsedPages,
      totalPages,
    });
  }
  return data;
}

dataReading();

