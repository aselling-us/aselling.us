import { writeFile, unlink } from "node:fs/promises";
import { fail, error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getPosts } from "#lib/server/posts";

export const load: PageServerLoad = async () => {
  return {
    posts: getPosts(),
  };
};

function slugify(input: string) {
  return (
    input
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "") // strip diacritics
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

// Shared helper to format the markdown string consistently
function buildMarkdown(data: {
  title: string;
  draft: boolean;
  date: string;
  coverCaption: string;
  coverName: string;
  description: string;
  tags: string[];
  body: string;
}) {
  return `---
title: ${data.title}
draft: ${data.draft}
date: ${data.date}
coverCaption: ${data.coverCaption}
cover: ${data.coverName}
description: ${data.description}
tags: [${data.tags.join(", ")}]
---

${data.body}
`;
}

export const actions: Actions = {
  createPost: async ({ request }) => {
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
    const slug = slugify(title);

    const coverName = coverFile && coverFile.size > 0 ? coverFile.name : "";

    const markdownContent = buildMarkdown({
      title,
      draft,
      date,
      coverCaption,
      coverName,
      description,
      tags,
      body,
    });

    const targetDir = draft ? "src/content/blog/drafts" : "src/content/blog";

    try {
      await writeFile(`${targetDir}/${slug}.md`, markdownContent, "utf8");
      return { success: true, message: `Saved ${slug}.md successfully.` };
    } catch (err) {
      console.error("Error writing file:", err);
      return fail(500, { message: `Failed to write ${slug}.md` });
    }
  },

  updatePost: async ({ request }) => {
    if (!import.meta.env.DEV) {
      throw error(403, "Forbidden");
    }

    const formData = await request.formData();

    // Hidden inputs from your edit form to track the original file location
    const originalTitle = String(formData.get("originalTitle") || "");
    const originalSlug = slugify(originalTitle);
    const originalDraft = formData.get("originalDraft") === "true";
    const existingCover = String(formData.get("existingCover") || "");

    const title = String(formData.get("title") || "");
    const slug = slugify(title)
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

    // Use the new cover filename if uploaded, otherwise keep the existing one
    const coverName =
      coverFile && coverFile.size > 0 ? coverFile.name : existingCover;

    const markdownContent = buildMarkdown({
      title,
      draft,
      date,
      coverCaption,
      coverName,
      description,
      tags,
      body,
    });

    // check if moved from drafts to blog
    const targetDir = draft ? "src/content/blog/drafts" : "src/content/blog";
    const newPath = `${targetDir}/${slug}.md`;

    const oldDir = originalDraft
      ? "src/content/blog/drafts"
      : "src/content/blog";
    const oldPath = `${oldDir}/${originalSlug}.md`;

    try {
      await writeFile(newPath, markdownContent, "utf8");

      // Remove the old file if the title or draft folder changed
      if (originalTitle && oldPath !== newPath) {
        await unlink(oldPath).catch(() => {});
      }

      return { success: true, message: `Updated ${title}.md successfully.` };
    } catch (err) {
      console.error("Error updating file:", err);
      return fail(500, { message: `Failed to update ${title}.md` });
    }
  },
};
