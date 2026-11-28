import type { PageServerLoad } from "./$types";
import { getPosts } from "#lib/server/posts";
import { slugify } from "#lib/slugify";
import type { Post } from "#lib/types.ts";
import { dev } from "$app/env";

export const prerender = !dev;

export const load: PageServerLoad = async ({ params }): Promise<{ slug: string; posts: Post[] }> => {
  const posts = await getPosts();
  const slug = params.slug;

  const posts_ = posts.filter(
    (post) =>
      (dev || !post.draft) &&
      post.tags?.some((t) => slugify(t) === slug),
  );

  return { slug, posts: posts_ };
};