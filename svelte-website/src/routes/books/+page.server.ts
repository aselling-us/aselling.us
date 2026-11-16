import { dataReading } from "#lib/server/hardcover";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const reading = await dataReading();
  console.log(JSON.stringify(reading[0], null, 2));
  return {
    books: reading.map((book: any) => ({
      id: book.slug,
      title: book.title,
      author: book.author.name,
      cover: book.cover_url,
      started: book.started_at,
      link: `https://hardcover.app/books/${book.slug}`,
      currentPage: book.current_page,
      totalPages: book.pages,
    })),
  };
};
