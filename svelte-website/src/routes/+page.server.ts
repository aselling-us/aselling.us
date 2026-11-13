import { load as loadBlog, type Post } from "./blog/+page.server";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const result = await loadBlog(event as any);
  const { posts } = result as { posts: Post[] };
  return {
    posts: posts.slice(0, 3).map(({ body, ...rest }) => rest),
  };
};
