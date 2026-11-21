// import type { PageLoad } from "./$types";

// export const load: PageLoad = async () => ({ posts: getPosts() });

import { error } from "@sveltejs/kit";
import { marked } from "marked";
import markedFootnote from "marked-footnote";

import { getPosts } from "#lib/server/posts";
import type { PageServerLoad } from "./$types";
import { readingTimeLabel } from "#lib/reading-time.mjs";
const blogImages = import.meta.glob<string>(
  "/src/content/blog/*.{jpg,jpeg,png,webp,gif,svg}",
  { eager: true, query: "?url", import: "default" },
);

marked.use(markedFootnote());
marked.use({
  renderer: {
    image({ href, title, text }) {
      let src = href;
      const isExternalOrRoot = /^(https?:|data:|\/)/i.test(href);

      if (!isExternalOrRoot) {
        const filename = href.replace(/^\.\//, "");
        const assetUrl = blogImages[`/src/content/blog/${filename}`];
        if (assetUrl) {
          src = assetUrl;
        }
      }
      if (title) {
        return `<figure class="post-figure">
          <img src="${src}" alt="${text}" />
          <figcaption>${marked.parseInline(title)}</figcaption>
        </figure>`;
      }

      return `<img src="${src}" alt="${text}" />`;
    },
  },
});

export const load: PageServerLoad = ({ params }) => {
  const post = getPosts().find((p) => p.slug === params.slug && !p.draft);
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
