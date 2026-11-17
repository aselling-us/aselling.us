import { dataReading, pastReads } from "#lib/server/hardcover";
import { pastReadsByYear } from "#lib/server/hardcover.ts";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const reading = await dataReading();
  const past = await pastReads();
  const pastBuckets = await pastReadsByYear();
    const books = dataReading().map((book) => ({
      ...book,
      id: book.hardcoverId,
      cover: book.image,
      link: `https://hardcover.app${book.slug}`,
    }));

    const pastBooksByYear = pastReadsByYear().map((bucket) => ({
      year: bucket.year,
      books: bucket.books.map((book) => ({
        ...book,
        id: book.hardcoverId,
        cover: book.image,
        link: `https://hardcover.app${book.slug}`,
      })),
    }));

    return {
      books,
      pastBooksByYear,
    };
  };
