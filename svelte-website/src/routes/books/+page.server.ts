import { dataReading, pastReadsByYear } from "#lib/server/hardcover";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  // Run both requests in parallel
  const [reading, pastBuckets] = await Promise.all([
    dataReading(),
    pastReadsByYear(),
  ]);

  const books = reading.map((book) => ({
    ...book,
    id: book.hardcoverId,
    cover: book.image,
    link: `https://hardcover.app{book.slug}`,
  }));

  const pastBooksByYear = pastBuckets.map((bucket) => ({
    year: bucket.year,
    books: bucket.books.map((book) => ({
      ...book,
      id: book.hardcoverId,
      cover: book.image,
      link: `https://hardcover.app{book.slug}`,
    })),
  }));

  return {
    books,
    pastBooksByYear,
  };
};
