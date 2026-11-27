import { getPosts } from "#lib/server/posts";
import { slugify } from "#lib/slugify.ts";
import type { Post } from "#lib/types.ts";
import { dev } from "$app/env";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (): Promise<{ posts: Post[] }> => {
  const posts: Post[] = await getPosts(); // remove `await` if getPosts() is synchronous

  return {
    posts: dev ? posts : posts.filter((post) => !post.draft),
  };
};
