import { writeFile, readFile, unlink, rename, readdir } from "node:fs/promises";
import { marked } from "marked";
import path from "node:path";
import { fail, error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getPosts, COVER_EXTENSIONS } from "#lib/server/posts";
import { dev } from "$app/env";
import { slugify } from "#lib/slugify.ts";
import type { Post } from "#lib/types.ts";

export const prerender = !dev;

export const load: PageServerLoad = async (): Promise<{ posts: Post[] }> => {
  const posts: Post[] = await getPosts(); // remove `await` if getPosts() is synchronous

  return {
    posts: dev ? posts : posts.filter((post) => !post.draft),
  };
};

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
async function prepareBodyImageMove(
  body: string,
  oldDir: string,
  targetDir: string,
  formData: FormData,
): Promise<string[]> {
  if (oldDir === targetDir) return [];

  const filenames = new Set<string>();
  const copiedPaths: string[] = [];

  marked.walkTokens(marked.lexer(body), (token) => {
    if (token.type !== "image" || !token.href.startsWith("./")) return;

    const filename = decodeURIComponent(token.href.slice(2));

    // Only allow images directly inside the post directory.
    if (
      !filename ||
      filename === "." ||
      filename === ".." ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      throw new Error(`Invalid image path: ${token.href}`);
    }

    filenames.add(filename);
  });

  // Newly selected images are already saved to targetDir.
  const uploadedNames = new Set(
    formData
      .getAll("bodyImage")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0)
      .map((file) => path.basename(file.name)),
  );

  for (const filename of filenames) {
    const oldPath = path.join(oldDir, filename);
    const newPath = path.join(targetDir, filename);

    let image: Buffer;

    try {
      image = await readFile(oldPath);
    } catch (err) {
      if (
        (err as NodeJS.ErrnoException).code === "ENOENT" &&
        uploadedNames.has(filename)
      ) {
        continue;
      }

      throw err;
    }

    try {
      await writeFile(newPath, image, { flag: "wx" });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;

      const existing = await readFile(newPath);

      if (!existing.equals(image)) {
        throw new Error(
          `A different image named "${filename}" already exists in ${targetDir}`,
        );
      }
    }

    copiedPaths.push(oldPath);
  }

  return copiedPaths;
}
async function saveBodyImage(formData: FormData, targetDir: string) {
  const image = formData.get("bodyImage");

  if (!(image instanceof File) || image.size === 0) return;

  const filename = path.basename(image.name);
  const extension = path.extname(filename).slice(1).toLowerCase();

  if (
    !COVER_EXTENSIONS.includes(extension as (typeof COVER_EXTENSIONS)[number])
  ) {
    throw new Error(`Unsupported image extension: .${extension}`);
  }

  await writeFile(
    path.join(targetDir, filename),
    Buffer.from(await image.arrayBuffer()),
    { flag: "wx" },
  );
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
function getBodyImageNames(markdown: string): Set<string> {
  const filenames = new Set<string>();

  marked.walkTokens(marked.lexer(markdown), (token) => {
    if (token.type !== "image") return;

    // Handle both ./photo.png and photo.png.
    const href = token.href.startsWith("./") ? token.href.slice(2) : token.href;

    let filename: string;

    try {
      filename = decodeURIComponent(href);
    } catch {
      return;
    }

    // Only consider files directly inside this post's directory.
    if (
      !filename ||
      filename === "." ||
      filename === ".." ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return;
    }

    filenames.add(filename);
  });

  return filenames;
}
export const actions: Actions | undefined = dev
  ? {
      createPost: async ({ request }) => {
        if (!dev) throw error(403, "Forbidden");

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
          await saveBodyImage(formData, targetDir);
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
          await saveBodyImage(formData, targetDir);
          const oldImagePaths = await prepareBodyImageMove(
            body,
            oldDir,
            targetDir,
            formData,
          );

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
            // transition all images in the blog as well
            for (const imagePath of oldImagePaths) {
              try {
                await unlink(imagePath);
              } catch (err) {
                console.error(`Could not delete old image: ${imagePath}`, err);
              }
            }
          }

          return { success: true, message: `Updated ${slug}.md successfully.` };
        } catch (err) {
          console.error("Error updating post:", err);
          return fail(500, { message: `Failed to update ${slug}.md` });
        }
      },

      deletePost: async ({ request }) => {
        if (!dev) throw error(403, "Forbidden");

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
        const targetFile = path.join(dir, `${slug}.md`);

        try {
          // Read the saved post, not unsaved changes in the editor.
          const markdown = await readFile(targetFile, "utf8");
          const imageNames = getBodyImageNames(markdown);

          // Find images still referenced by other posts in this folder.
          const entries = await readdir(dir);
          const sharedImages = new Set<string>();

          for (const entry of entries) {
            if (!entry.endsWith(".md") || entry === `${slug}.md`) continue;

            const otherPost = await readFile(path.join(dir, entry), "utf8");

            for (const name of getBodyImageNames(otherPost)) {
              sharedImages.add(name);
            }
          }

          const coverPath = await findCoverFile(dir, slug);
          if (coverPath) imageNames.add(path.basename(coverPath));

          await unlink(targetFile);

          for (const filename of imageNames) {
            if (sharedImages.has(filename)) continue;

            try {
              await unlink(path.join(dir, filename));
            } catch (err) {
              if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
                console.error(`Could not delete image: ${filename}`, err);
              }
            }
          }

          return { success: true, message: `Deleted ${targetFile}` };
        } catch (err) {
          console.error("Error deleting post:", err);
          return fail(500, { message: `Failed to delete ${targetFile}` });
        }
      },
    }
  : undefined;
