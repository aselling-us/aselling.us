import letterboxd from "../../data/letterboxd.json";
import {
  getMonthLabel,
  type DiaryFilm,
  type LetterboxdData,
} from "#lib/server/letterboxd";
import type { PageServerLoad } from "./$types";
// /**
//  * transforms the month number to Month short
//  */
// const formatter = new Intl.DateTimeFormat("en-US", {
//   month: "short",
//   timeZone: "UTC",
// });

// /**
//  * concerts the month short back to number
//  */
// function monthNameToNumber(month: string): number {
//   return new Date(`${month} 1, 2000`).getMonth() + 1;
// }

export const load: PageServerLoad = async () => {
  const data = letterboxd as LetterboxdData;
  const filmsByMonth: Record<string, DiaryFilm[]> = {};

  for (const film of data.films) {
    const month = getMonthLabel(film.watchedDate);
    if (!month) continue;
    (filmsByMonth[month] ??= []).push(film);
  }

  return {
    letterboxd: data,
    uniqueMonths: Object.keys(filmsByMonth),
    filmsByMonth,
  };
};
