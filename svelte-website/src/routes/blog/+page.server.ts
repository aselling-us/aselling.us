import matter from "gray-matter";
import type { PageServerLoad } from "./$types";
// src/routes/writing/+page.server.ts (or whichever route folder this is in)
import { writeFile } from "node:fs/promises";
import { fail, error } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions: Actions = {
  createPost: async ({ request }) => {
    // Safeguard: ensure this never runs outside of dev mode
    if (!import.meta.env.DEV) {
      throw error(403, "Forbidden");
    }

    const formData = await request.formData();

    const title = String(formData.get("title") || "");
    const date = String(formData.get("date") || "");
    const description = String(formData.get("description") || "");
    const tags = String(formData.get("tags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const coverFile = formData.get("cover") as File | null;
    const coverCaption = String(formData.get("covercaption") || "");
    const body = String(formData.get("body") || "");
    const draft = formData.get("draft") === "on";

    // Note: coverFile is a File object, so use coverFile.name if present
    const coverName = coverFile && coverFile.size > 0 ? coverFile.name : "";

    const markdownContent = `---
title: ${title}
draft: ${draft}
date: ${date}
coverCaption: ${coverCaption}
cover: ${coverName}
description: ${description}
tags: [${tags.join(", ")}]
---

${body}
`;

    if (draft) {
      try {
        await writeFile(
          `src/content/blog/drafts/${title}.md`,
          markdownContent,
          "utf8",
        );
        return { success: true, message: `Saved ${title}.md successfully.` };
      } catch (err) {
        console.error("Error writing file:", err);
        return fail(500, { message: `Failed to write ${title}.md` });
      }
    } else {
      // non draft posts get s tored in content / blog
      // FIXME add a precommit notif that this will notify blog ppl
      try {
        await writeFile(
          `src/content/blog/${title}.md`,
          markdownContent,
          "utf8",
        );
        return { success: true, message: `Saved ${title}.md successfully.` };
      } catch (err) {
        console.error("Error writing file:", err);
        return fail(500, { message: `Failed to write ${title}.md` });
      }
    }
  },
};

export interface PostFrontmatter {
  title: string;
  date: string;
  description: string;
  tags?: string[];
  draft?: boolean;
  cover?: string;
  coverCaption?: string;
}

export interface Post extends Omit<PostFrontmatter, "date"> {
  slug: string;
  date: Date;
  tags: string[];
  draft: boolean;
  cover?: string;
  body: string;
}

const files = import.meta.glob<string>("/src/content/blog/**/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});

const images = import.meta.glob<string>(
  "/src/content/blog/**/*.{jpg,jpeg,png,webp,avif}",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
);

export const load: PageServerLoad = async () => {
  const posts: Post[] = Object.entries(files)
    .map(([path, raw]) => {
      const parsed = matter(raw);
      const data = parsed.data as PostFrontmatter;
      const { content } = parsed;

      const coverPath = data.cover
        ? path.replace(/[^/]+\.md$/, data.cover)
        : undefined;

      return {
        slug: path.split("/").pop()!.replace(".md", ""),
        title: data.title,
        date: new Date(data.date),
        description: data.description,
        tags: data.tags ?? [],
        draft: data.draft ?? false,
        cover: coverPath ? images[coverPath] : undefined,
        coverCaption: data.coverCaption,
        body: content,
      };
    })
    .filter((post) => import.meta.env.DEV || !post.draft)
    .sort((a, b) => b.date.valueOf() - a.date.valueOf());

  return {
    posts,
  };
};
