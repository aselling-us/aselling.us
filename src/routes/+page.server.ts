import { load as loadBlog, type Post } from "./blog/+page.server";
import type { PageServerLoad } from "./$types";

import { dataReading } from "#lib/server/hardcover";
import { getCareerCollection } from "#lib/server/career";

import artists from "../data/spotify-artists.json";
import films from "../data/letterboxd.json";

// Inside load:
const currentlyWorking = getCareerCollection().filter(
  (role) => !role.endDate
);

export const load: PageServerLoad = async (event) => {
  const result = await loadBlog(event as any);
  const { posts } = result as { posts: Post[] };
  return {
    posts: posts.slice(0, 3).map(({ body, ...rest }) => rest),
    reading: await dataReading(),
    recentArtists: artists.topArtists.slice(0,5),
    recentFilms: films.films.slice(0,3),
    roles: currentlyWorking
  };
};
