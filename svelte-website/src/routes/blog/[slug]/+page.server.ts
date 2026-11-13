// import type { PageLoad } from "./$types";

// export const load: PageLoad = async () => ({ posts: getPosts() });

import { error } from "@sveltejs/kit";
import { marked } from "marked";
import markedFootnote from "marked-footnote";

import { getPosts } from "#lib/server/posts";
import type { PageServerLoad } from "./$types";
import { readingTimeLabel } from "#lib/reading-time.mjs";
marked.use(markedFootnote());

export const load: PageServerLoad = ({ params }) => {
  const post = getPosts().find((p) => p.slug === params.slug);
  if (!post) error(404, "Post not found");

  const { body, ...rest } = post;
  return {
    post: {
      ...rest,
      html: marked.parse(body, { async: false }),
      minutes: readingTimeLabel(post.body),
    },
  };
};
