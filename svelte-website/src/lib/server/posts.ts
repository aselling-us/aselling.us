import matter from "gray-matter";

export const COVER_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "avif"] as const;

export interface PostFrontmatter {
  title: string;
  date: string | Date;
  description: string;
  tags?: string[];
  draft?: boolean;
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
  "/src/content/blog/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getPosts(): Post[] {
  // all possible image entries the cover could match
  const imagePaths = Object.keys(images);

  return Object.entries(files)
    .map(([path, raw]) => {
      const parsed = matter(raw);
      const data = parsed.data as PostFrontmatter;
      const slug = path.split("/").pop()!.replace(/\.md$/, "");
      const baseCoverPath = path.replace(/[^/]+\.md$/, `${slug}-cover`);

      // Matches "{slug}-cover.{png|jpg|jpeg|webp|avif}", case-insensitive
      const coverRegex = new RegExp(
        `^${escapeRegExp(baseCoverPath)}\\.(${COVER_EXTENSIONS.join("|")})$`,
        "i",
      );
      const matchedKey = imagePaths.find((imgPath) => coverRegex.test(imgPath));

      return {
        slug,
        title: data.title,
        date: new Date(data.date),
        description: data.description,
        tags: data.tags ?? [],
        draft: data.draft ?? false,
        cover: matchedKey ? images[matchedKey] : undefined,
        coverCaption: data.coverCaption,
        body: parsed.content,
      };
    })
    .filter((post) => import.meta.env.DEV || !post.draft)
    .sort((a, b) => b.date.valueOf() - a.date.valueOf());
}