import { writeFile, unlink, rename, readdir } from "node:fs/promises";
import path from "node:path";
import { fail, error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getPosts, COVER_EXTENSIONS } from "#lib/server/posts";

export const load: PageServerLoad = async () => {
  const posts = getPosts();

  return {
    posts: import.meta.env.DEV ? posts : posts.filter((post) => !post.draft),
  };
};
function slugify(input: string) {
  return (
    input
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

// Finds an existing "{slug}-cover.{ext}" file in a directory, if one exists
async function findCoverFile(
  dir: string,
  slug: string,
): Promise<string | null> {
  try {
    const entries = await readdir(dir);
    const pattern = new RegExp(
      `^${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-cover\\.(${COVER_EXTENSIONS.join("|")})$`,
      "i",
    );
    const match = entries.find((f) => pattern.test(f));
    return match ? path.join(dir, match) : null;
  } catch {
    return null;
  }
}

// Saves a newly uploaded cover as "{slug}-cover.{ext}", or moves/renames the existing one
async function syncCoverImage(options: {
  coverFile: File | null;
  oldDir?: string;
  oldSlug?: string;
  targetDir: string;
  newSlug: string;
}) {
  const { coverFile, oldDir, oldSlug, targetDir, newSlug } = options;

  // 1. If a new image was uploaded, remove any old cover and write "{newSlug}-cover.{ext}"
  if (coverFile && coverFile.size > 0) {
    const ext = path.extname(coverFile.name).slice(1).toLowerCase();
    if (!COVER_EXTENSIONS.includes(ext as (typeof COVER_EXTENSIONS)[number])) {
      throw new Error(`Unsupported cover extension: .${ext}`);
    }

    if (oldDir && oldSlug) {
      const prevCover = await findCoverFile(oldDir, oldSlug);
      if (prevCover) await unlink(prevCover).catch(() => {});
    }
    const existingTargetCover = await findCoverFile(targetDir, newSlug);
    if (existingTargetCover) await unlink(existingTargetCover).catch(() => {});

    const buffer = Buffer.from(await coverFile.arrayBuffer());
    await writeFile(path.join(targetDir, `${newSlug}-cover.${ext}`), buffer);
    return;
  }

  // 2. If no new image was uploaded, rename/move the existing cover if slug or draft folder changed
  if (oldDir && oldSlug && (oldDir !== targetDir || oldSlug !== newSlug)) {
    const prevCover = await findCoverFile(oldDir, oldSlug);
    if (prevCover) {
      const ext = path.extname(prevCover);
      await rename(prevCover, path.join(targetDir, `${newSlug}-cover${ext}`));
    }
  }
}

function buildMarkdown(data: {
  title: string;
  draft: boolean;
  date: string;
  coverCaption: string;
  description: string;
  tags: string[];
  body: string;
}) {
  return `---
title: ${JSON.stringify(data.title)}
draft: ${data.draft}
date: ${data.date}
coverCaption: ${JSON.stringify(data.coverCaption)}
description: ${JSON.stringify(data.description)}
tags: [${data.tags.map((t) => JSON.stringify(t)).join(", ")}]
---

${data.body}
`;
}
export const actions: Actions | undefined = import.meta.env.DEV
  ? {
      createPost: async ({ request }) => {
        if (!import.meta.env.DEV) throw error(403, "Forbidden");

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

        const targetDir = draft
          ? "src/content/blog/drafts"
          : "src/content/blog";

        try {
          await syncCoverImage({ coverFile, targetDir, newSlug: slug });
          await writeFile(
            `${targetDir}/${slug}.md`,
            buildMarkdown({
              title,
              draft,
              date,
              coverCaption,
              description,
              tags,
              body,
            }),
            "utf8",
          );
          return { success: true, message: `Saved ${slug}.md successfully.` };
        } catch (err) {
          console.error("Error writing post:", err);
          return fail(500, { message: `Failed to write ${slug}.md` });
        }
      },

      updatePost: async ({ request }) => {
        if (!import.meta.env.DEV) throw error(403, "Forbidden");

        const formData = await request.formData();
        const originalTitle = String(formData.get("originalTitle") || "");
        if (!originalTitle) {
          return fail(400, { message: "Original post title is missing." });
        }

        const originalSlug = slugify(originalTitle);
        const originalDraft = formData.get("originalDraft") === "true";

        const title = String(formData.get("title") || "");
        const slug = slugify(title);
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

        const targetDir = draft
          ? "src/content/blog/drafts"
          : "src/content/blog";
        const oldDir = originalDraft
          ? "src/content/blog/drafts"
          : "src/content/blog";
        const newPath = `${targetDir}/${slug}.md`;
        const oldPath = `${oldDir}/${originalSlug}.md`;

        try {
          await syncCoverImage({
            coverFile,
            oldDir,
            oldSlug: originalSlug,
            targetDir,
            newSlug: slug,
          });

          await writeFile(
            newPath,
            buildMarkdown({
              title,
              draft,
              date,
              coverCaption,
              description,
              tags,
              body,
            }),
            "utf8",
          );

          if (oldPath !== newPath) {
            await unlink(oldPath);
          }

          return { success: true, message: `Updated ${slug}.md successfully.` };
        } catch (err) {
          console.error("Error updating post:", err);
          return fail(500, { message: `Failed to update ${slug}.md` });
        }
      },

      deletePost: async ({ request }) => {
        if (!import.meta.env.DEV) throw error(403, "Forbidden");

        const data = await request.formData();
        const originalTitle = String(data.get("originalTitle") || "");
        const originalDraft = data.get("originalDraft") === "true";

        if (!originalTitle) {
          return fail(400, { message: "Original post title is missing." });
        }

        const slug = slugify(originalTitle);
        const dir = originalDraft
          ? "src/content/blog/drafts"
          : "src/content/blog";
        const targetFile = `${dir}/${slug}.md`;

        try {
          // remove the markdown file
          await unlink(targetFile);
          // remove cover if there is one
          const coverPath = await findCoverFile(dir, slug);
          if (coverPath) await unlink(coverPath);

          return { success: true, message: `Deleted ${targetFile}` };
        } catch (err) {
          console.error("Error deleting post:", err);
          return fail(500, { message: `Failed to delete ${targetFile}` });
        }
      },
    }
  : undefined;
